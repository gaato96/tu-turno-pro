"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

function getTenantId(session: any): string {
    const tid = session?.user?.tenantId;
    if (!tid) throw new Error("Unauthorized");
    return tid;
}

export async function getDashboardData() {
    const session = await auth();
    const tenantId = getTenantId(session);

    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const [todayReservations, activeReservations, upcomingReservations, finishedReservations, todaySales, topProducts] = await Promise.all([
        prisma.reservation.count({
            where: { tenantId, date: { gte: startOfDay, lte: endOfDay }, status: { notIn: ["cancelled"] } }
        }),
        prisma.reservation.findMany({
            where: { tenantId, status: "in_game" },
            include: {
                court: { select: { name: true } },
                sales: {
                    where: { status: { not: "cancelled" } },
                    include: { items: { include: { product: { select: { name: true } } } } }
                }
            },
            orderBy: { startTime: "asc" }
        }),
        prisma.reservation.findMany({
            where: { tenantId, status: { in: ["confirmed", "pending"] }, date: { gte: startOfDay, lte: endOfDay } },
            include: {
                court: { select: { name: true } },
                sales: {
                    where: { status: { not: "cancelled" } },
                    include: { items: { include: { product: { select: { name: true } } } } }
                }
            },
            orderBy: { startTime: "asc" },
            take: 10
        }),
        prisma.reservation.findMany({
            where: { tenantId, status: "finished", date: { gte: startOfDay, lte: endOfDay } },
            include: {
                court: { select: { name: true } },
                sales: {
                    where: { status: { not: "cancelled" } },
                    include: { items: { include: { product: { select: { name: true } } } } }
                }
            },
            orderBy: { endTime: "desc" },
            take: 10
        }),
        prisma.sale.findMany({
            where: { tenantId, createdAt: { gte: startOfDay, lte: endOfDay }, status: { not: "cancelled" } }
        }),
        prisma.saleItem.groupBy({
            by: ["productId"],
            where: {
                sale: { tenantId, createdAt: { gte: startOfDay, lte: endOfDay }, status: { not: "cancelled" } }
            },
            _sum: { quantity: true, subtotal: true },
            orderBy: { _sum: { quantity: "desc" } },
            take: 5
        })
    ]);

    const todayRevenue = todaySales.reduce((sum, s) => sum + Number(s.total), 0);

    const productIds = topProducts.map(tp => tp.productId);
    const productNames = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true }
    });
    const nameMap = Object.fromEntries(productNames.map(p => [p.id, p.name]));

    const complex = await prisma.complex.findFirst({ where: { tenantId }, include: { courts: { where: { isActive: true } } } });
    const totalSlots = complex ? complex.courts.length * (parseInt(complex.closingTime?.split(":")[0] || "23") - parseInt(complex.openingTime?.split(":")[0] || "8")) : 1;
    const occupancy = totalSlots > 0 ? Math.round((todayReservations / totalSlots) * 100) : 0;

    const mapReservation = (r: any) => ({
        id: r.id,
        customerName: r.customerName,
        customerPhone: r.customerPhone,
        status: r.status,
        courtName: r.court?.name,
        courtId: r.courtId,
        startTime: r.startTime.toISOString().replace("Z", ""),
        endTime: r.endTime.toISOString().replace("Z", ""),
        courtAmount: Number(r.courtAmount),
        consumptionAmount: Number(r.consumptionAmount),
        totalAmount: Number(r.totalAmount),
        sales: r.sales.map((s: any) => ({
            id: s.id,
            total: Number(s.total),
            items: s.items.map((it: any) => ({
                quantity: it.quantity,
                subtotal: Number(it.subtotal),
                product: { name: it.product.name }
            }))
        }))
    });

    return {
        todayReservations,
        todayRevenue,
        occupancy: Math.min(occupancy, 100),
        salesCount: todaySales.length,
        activeReservations: activeReservations.map(mapReservation),
        upcomingReservations: upcomingReservations.map(mapReservation),
        finishedReservations: finishedReservations.map(mapReservation),
        topProducts: topProducts.map(tp => ({
            name: nameMap[tp.productId] || "Producto",
            quantity: tp._sum.quantity || 0,
            revenue: Number(tp._sum.subtotal || 0),
        })),
    };
}
