"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getActiveComplexOrRedirect } from "@/lib/active-complex";

function getTenantId(session: any): string {
    const tid = session?.user?.tenantId;
    if (!tid) throw new Error("Unauthorized");
    return tid;
}

export async function getDashboardData() {
    const session = await auth();
    const tenantId = getTenantId(session);

    const targetComplexId = await getActiveComplexOrRedirect();
    if (!targetComplexId) {
        throw new Error("No active complex");
    }

    const now = new Date();
    // UTC-3 offset calculation
    const tzOffset = -180; // Argentina is UTC-3
    const localTime = new Date(now.getTime() + (tzOffset + now.getTimezoneOffset()) * 60000);

    const startOfDay = new Date(localTime);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(localTime);
    endOfDay.setHours(23, 59, 59, 999);

    const [todayReservations, activeReservations, upcomingReservations, pendingReservations, finishedReservations, todaySales, topProducts, complexes] = await Promise.all([
        prisma.reservation.count({
            where: { tenantId, complexId: targetComplexId, date: { gte: startOfDay, lte: endOfDay }, status: { notIn: ["cancelled"] } }
        }),
        prisma.reservation.findMany({
            where: {
                tenantId,
                complexId: targetComplexId,
                status: "in_game",
            },

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
            where: { tenantId, complexId: targetComplexId, status: "confirmed", date: { gte: startOfDay, lte: endOfDay } },
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
            where: { tenantId, complexId: targetComplexId, status: "pending" },
            include: {
                court: { select: { name: true, complex: { select: { name: true } } } }
            },
            orderBy: { createdAt: "desc" }
        }),
        prisma.reservation.findMany({
            where: { tenantId, complexId: targetComplexId, status: "finished", date: { gte: startOfDay, lte: endOfDay } },
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
            where: {
                tenantId,
                createdAt: { gte: startOfDay, lte: endOfDay },
                status: { not: "cancelled" },
                ...(targetComplexId && {
                    OR: [
                        { reservation: { complexId: targetComplexId } },
                        { cashSession: { complexId: targetComplexId } }
                    ]
                })
            }
        }),
        prisma.saleItem.groupBy({
            by: ["productId"],
            where: {
                sale: {
                    tenantId,
                    createdAt: { gte: startOfDay, lte: endOfDay },
                    status: { not: "cancelled" },
                    ...(targetComplexId && {
                        OR: [
                            { reservation: { complexId: targetComplexId } },
                            { cashSession: { complexId: targetComplexId } }
                        ]
                    })
                }
            },
            _sum: { quantity: true, subtotal: true },
            orderBy: { _sum: { quantity: "desc" } },
            take: 5
        }),
        prisma.complex.findMany({
            where: { tenantId, id: targetComplexId },
            select: { id: true, name: true }
        })
    ]);

    const todayRevenue = todaySales.reduce((sum, s) => sum + Number(s.total), 0);

    const productIds = topProducts.map(tp => tp.productId);
    const productNames = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true }
    });
    const nameMap = Object.fromEntries(productNames.map(p => [p.id, p.name]));

    // 108: Find specific complex for capacity calculation
    const selectedComplex = await prisma.complex.findFirst({
        where: { tenantId, id: targetComplexId || undefined },
        include: { courts: { where: { isActive: true } } }
    });

    // totalSlots is sum of all courts' hours if no complex selected, or just the one selected
    let totalSlots = 1;
    if (selectedComplex) {
        totalSlots = selectedComplex.courts.length * (parseInt(selectedComplex.closingTime?.split(":")[0] || "23") - parseInt(selectedComplex.openingTime?.split(":")[0] || "8"));
    } else {
        // Broad estimation across all complexes
        const allComplexes = await prisma.complex.findMany({ where: { tenantId }, include: { courts: { where: { isActive: true } } } });
        totalSlots = allComplexes.reduce((sum, c) => sum + (c.courts.length * (parseInt(c.closingTime?.split(":")[0] || "23") - parseInt(c.openingTime?.split(":")[0] || "8"))), 0);
    }

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
        sales: r.sales?.map((s: any) => ({
            id: s.id,
            total: Number(s.total),
            items: s.items?.map((it: any) => ({
                quantity: it.quantity,
                subtotal: Number(it.subtotal),
                product: { name: it.product?.name }
            })) || []
        })) || []
    });

    return {
        todayReservations,
        todayRevenue,
        occupancy: Math.min(occupancy, 100),
        salesCount: todaySales.length,
        activeReservations: activeReservations.map(mapReservation),
        upcomingReservations: upcomingReservations.map(mapReservation),
        finishedReservations: finishedReservations.map(mapReservation),
        pendingReservations: pendingReservations.map(mapReservation),
        todaySales,
        topProducts: topProducts.map(tp => ({
            name: nameMap[tp.productId] || "Producto desconocido",
            quantity: tp._sum.quantity,
            revenue: tp._sum.subtotal
        })),
        complexes,
    };
}
