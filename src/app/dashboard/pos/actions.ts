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

export async function getPOSData(requestedReservationId?: string) {
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
                    OR: [
                        {
                            date: { gte: startOfDay, lte: endOfDay },
                            status: { in: ["confirmed", "in_game", "finished"] }
                        },
                        {
                            status: "in_game" // Always show reservations currently in game
                        },
                        {
                            id: requestedReservationId || "none" // Specifically requested reservation
                        }
                    ]
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
    paymentDetails?: any;
    reservationId?: string;
    isStaffConsumption?: boolean;
}) {
    console.log("[POS_ACTION] Starting processSale", { reservationId: data.reservationId, itemCount: data.items.length });

    try {
        const session = await auth();
        const tenantId = getTenantId(session);
        console.log("[POS_ACTION] Session validated", { tenantId });

        const targetComplexId = await getActiveComplexOrRedirect();
        if (!targetComplexId) {
            console.error("[POS_ACTION] No active complex found");
            return { success: false, error: "No se ha seleccionado un complejo activo" };
        }
        console.log("[POS_ACTION] Complex validated", { targetComplexId });

        const originalSubtotal = data.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
        const subtotal = data.isStaffConsumption ? 0 : originalSubtotal;
        const total = subtotal;
        const isOnTab = !!data.reservationId;

        // Generate invoice number: V{YYYYMMDDHHMMSS}-{XXXX}
        // Using a more unique timestamp-based prefix to avoid collisions
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, "");
        const invoiceNumber = `V${dateStr}-${timeStr}-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;
        console.log("[POS_ACTION] Generated invoice number", invoiceNumber);

        // Find active cash session
        const cashSession = await prisma.cashSession.findFirst({
            where: { tenantId, complexId: targetComplexId, status: "open" }
        });
        console.log("[POS_ACTION] Cash session found", { cashSessionId: cashSession?.id });

        // Create Sale in a transaction
        const result = await prisma.$transaction(async (tx) => {
            console.log("[POS_ACTION] Starting transaction");

            const sale = await tx.sale.create({
                data: {
                    tenantId,
                    reservationId: data.reservationId || null,
                    cashSessionId: cashSession?.id || null,
                    invoiceNumber,
                    subtotal,
                    total,
                    status: isOnTab ? "on_tab" : "completed",
                    paymentMethod: data.isStaffConsumption ? "staff" : (isOnTab ? null : data.paymentMethod),
                    paymentDetails: data.paymentDetails || null,
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
            console.log("[POS_ACTION] Sale created", { saleId: sale.id });

            // Deduct stock
            for (const item of data.items) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: { stock: { decrement: item.quantity } }
                });
            }
            console.log("[POS_ACTION] Stock deducted");

            // If on_tab, update reservation consumption
            if (isOnTab && data.reservationId) {
                const reservation = await tx.reservation.findUnique({
                    where: { id: data.reservationId },
                    select: { id: true, consumptionAmount: true, courtAmount: true, discount: true }
                });

                if (reservation) {
                    const currentConsumption = Number(reservation.consumptionAmount) || 0;
                    const currentCourt = Number(reservation.courtAmount) || 0;
                    const currentDiscount = Number(reservation.discount) || 0;

                    const newConsumption = currentConsumption + total;
                    const newTotal = currentCourt + newConsumption - currentDiscount;

                    await tx.reservation.update({
                        where: { id: data.reservationId },
                        data: {
                            consumptionAmount: newConsumption,
                            totalAmount: newTotal,
                        }
                    });
                    console.log("[POS_ACTION] Reservation updated", { newConsumption, newTotal });
                } else {
                    console.warn("[POS_ACTION] Reservation not found for tab update", data.reservationId);
                }
            }

            return { sale, invoiceNumber };
        });

        console.log("[POS_ACTION] Transaction completed successfully");

        revalidatePath("/dashboard/pos");
        revalidatePath("/dashboard/reservations");

        return { success: true, invoiceNumber: result.invoiceNumber };
    } catch (error: any) {
        console.error("[POS_ACTION] CRITICAL ERROR:", error);
        return { success: false, error: error.message || "Error desconocido al procesar la venta" };
    }
}
