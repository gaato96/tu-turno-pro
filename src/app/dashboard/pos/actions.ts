"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getActiveComplexOrRedirect } from "@/lib/active-complex";

function getTenantId(session: any): string {
    const tid = session?.user?.tenantId;
    if (!tid) throw new Error("Unauthorized");
    return tid;
}

export async function getPOSData() {
    const session = await auth();
    const tenantId = getTenantId(session);

    const targetComplexId = await getActiveComplexOrRedirect();
    if (!targetComplexId) return { categories: [], products: [], activeReservations: [] };

    const [categories, products, activeReservations] = await Promise.all([
        prisma.category.findMany({ where: { tenantId, complexId: targetComplexId, isActive: true }, orderBy: { name: "asc" } }),
        prisma.product.findMany({
            where: { tenantId, complexId: targetComplexId, isActive: true },
            include: { category: { select: { name: true } } },
            orderBy: { name: "asc" }
        }),
        // Calculate today boundaries
        (async () => {
            const now = new Date();
            const tzOffset = -180; // Argentina timezone
            const localTime = new Date(now.getTime() + (tzOffset + now.getTimezoneOffset()) * 60000);
            const startOfDay = new Date(localTime);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(localTime);
            endOfDay.setHours(23, 59, 59, 999);

            return prisma.reservation.findMany({
                where: {
                    tenantId,
                    complexId: targetComplexId,
                    date: { gte: startOfDay, lte: endOfDay },
                    status: { in: ["in_game", "finished"] }
                },
                include: { court: { select: { name: true } } },
                orderBy: { startTime: "asc" }
            });
        })()
    ]);

    return {
        categories,
        products: products.map(p => ({ ...p, costPrice: Number(p.costPrice), salePrice: Number(p.salePrice) })),
        activeReservations: activeReservations.map((r: any) => ({
            ...r,
            date: r.date.toISOString().replace("Z", ""),
            startTime: r.startTime.toISOString().replace("Z", ""),
            endTime: r.endTime.toISOString().replace("Z", ""),
            courtAmount: Number(r.courtAmount),
            consumptionAmount: Number(r.consumptionAmount),
            discount: Number(r.discount),
            totalAmount: Number(r.totalAmount),
            depositAmount: Number(r.depositAmount || 0),
            paidAmount: Number(r.paidAmount || 0),
        }))
    };
}

export async function processSale(data: {
    items: { productId: string; quantity: number; unitPrice: number }[];
    paymentMethod: string;
    reservationId?: string;
    isStaffConsumption?: boolean;
}) {
    const session = await auth();
    const tenantId = getTenantId(session);

    const targetComplexId = await getActiveComplexOrRedirect();
    if (!targetComplexId) throw new Error("No active complex");

    const originalSubtotal = data.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const subtotal = data.isStaffConsumption ? 0 : originalSubtotal;
    const total = subtotal;
    const isOnTab = !!data.reservationId;

    // Generate invoice number: V{YYYYMMDD}-{XXXX}
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const todaySalesCount = await prisma.sale.count({
        where: {
            tenantId,
            createdAt: { gte: new Date(now.toISOString().slice(0, 10) + "T00:00:00") }
        }
    });
    const invoiceNumber = `V${dateStr}-${(todaySalesCount + 1).toString().padStart(4, "0")}`;

    // Find active cash session
    const cashSession = await prisma.cashSession.findFirst({
        where: { tenantId, complexId: targetComplexId, status: "open" }
    });

    const sale = await prisma.sale.create({
        data: {
            tenantId,
            reservationId: data.reservationId || null,
            cashSessionId: cashSession?.id || null,
            invoiceNumber,
            subtotal,
            total,
            status: isOnTab ? "on_tab" : "completed",
            paymentMethod: data.isStaffConsumption ? "staff" : (isOnTab ? null : data.paymentMethod),
            isStaffConsumption: data.isStaffConsumption || false,
            items: {
                create: data.items.map(i => ({
                    productId: i.productId,
                    quantity: i.quantity,
                    unitPrice: i.unitPrice,
                    subtotal: i.unitPrice * i.quantity,
                }))
            }
        }
    });

    // Deduct stock
    for (const item of data.items) {
        await prisma.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } }
        });
    }

    // If on_tab, update reservation consumption
    if (isOnTab && data.reservationId) {
        const reservation = await prisma.reservation.findUnique({ where: { id: data.reservationId } });
        if (reservation) {
            const newConsumption = Number(reservation.consumptionAmount) + total;
            await prisma.reservation.update({
                where: { id: data.reservationId },
                data: {
                    consumptionAmount: newConsumption,
                    totalAmount: Number(reservation.courtAmount) + newConsumption - Number(reservation.discount),
                }
            });
        }
    }

    revalidatePath("/dashboard/pos");
    revalidatePath("/dashboard/reservations");
    return { success: true, invoiceNumber };
}
