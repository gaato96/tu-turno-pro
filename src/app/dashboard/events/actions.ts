"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createEvent(data: {
    tenantId: string;
    complexId: string;
    name: string;
    description?: string;
    date: string;
    startTime: string;
    endTime: string;
    totalAmount?: number;
    depositPaid?: number;
    depositMethod?: string;
    depositMixedDetails?: string; // JSON stringify de {cash, card, transfer}
    notes?: string;
}) {
    const { tenantId, complexId, name, description, date, startTime, endTime, totalAmount, depositPaid, depositMethod, depositMixedDetails, notes } = data;

    if (!complexId || complexId === "") {
        throw new Error("Debes seleccionar un complejo válido.");
    }

    // Parse as local time (matching createReservation pattern — no Z suffix)
    const parsedDate = new Date(`${date}T12:00:00`);
    const parsedStartTime = new Date(`${date}T${startTime}:00`);
    const parsedEndTime = new Date(`${date}T${endTime}:00`);

    await prisma.$transaction(async (tx) => {
        const event = await tx.event.create({
            data: {
                tenantId,
                complexId,
                name,
                description,
                date: parsedDate,
                startTime: parsedStartTime,
                endTime: parsedEndTime,
                totalAmount: totalAmount || 0,
                depositPaid: depositPaid || 0,
                paidAmount: depositPaid || 0,
                status: depositPaid ? "confirmed" : "pending",
                notes
            }
        });

        if (depositPaid && depositPaid > 0) {
            // Buscar sesión de caja abierta para este complejo
            const cashSession = await tx.cashSession.findFirst({
                where: { tenantId, complexId, status: "open" }
            });

            const method = depositMethod || "cash";
            const paymentBase = {
                tenantId,
                eventId: event.id,
                cashSessionId: cashSession?.id,
                amount: depositPaid,
                paymentMethod: method,
                concept: "deposit",
                notes: "Seña inicial de evento"
            };

            if (method === "mixed" && depositMixedDetails) {
                const details = JSON.parse(depositMixedDetails);
                if (details.cash > 0) await tx.payment.create({ data: { ...paymentBase, amount: details.cash, paymentMethod: "cash", notes: "Seña mixta: Efectivo" } });
                if (details.card > 0) await tx.payment.create({ data: { ...paymentBase, amount: details.card, paymentMethod: "card", notes: "Seña mixta: Tarjeta" } });
                if (details.transfer > 0) await tx.payment.create({ data: { ...paymentBase, amount: details.transfer, paymentMethod: "transfer", notes: "Seña mixta: Transferencia" } });
            } else {
                await tx.payment.create({ data: paymentBase });
            }

            // Crear registro de Venta (Sale) para impacto en caja
            const now = new Date();
            const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
            const todaySalesCount = await tx.sale.count({
                where: {
                    tenantId,
                    createdAt: { gte: new Date(now.toISOString().slice(0, 10) + "T00:00:00") }
                }
            });
            const invoiceNumber = `E${dateStr}-${(todaySalesCount + 1).toString().padStart(4, "0")}`;

            await tx.sale.create({
                data: {
                    tenantId,
                    eventId: event.id,
                    cashSessionId: cashSession?.id || null,
                    invoiceNumber,
                    subtotal: depositPaid,
                    total: depositPaid,
                    status: "completed",
                    paymentMethod: method,
                    paymentDetails: method === "mixed" && depositMixedDetails ? JSON.parse(depositMixedDetails) : undefined,
                }
            });
        }
    });

    revalidatePath("/dashboard/events");
    return { success: true };
}

export async function updateEventStatus(id: string, status: string) {
    await prisma.event.update({
        where: { id },
        data: { status }
    });
    revalidatePath("/dashboard/events");
    return { success: true };
}

export async function deleteEvent(id: string) {
    await prisma.event.delete({ where: { id } });
    revalidatePath("/dashboard/events");
    return { success: true };
}
