"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export async function registerEventPayment(eventId: string, amount: number, method: string, notes?: string) {
    const session = await auth();
    const tenantId = getTenantId(session);

    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } });
    if (!event) throw new Error("Evento no encontrado");

    const newPaid = Number(event.paidAmount) + amount;
    const isFullyPaid = newPaid >= Number(event.totalAmount);

    const paymentData: any = {
        tenantId,
        eventId,
        amount,
        paymentMethod: method,
        concept: "event",
        notes: `Pago de evento: ${event.name}`,
    };

    const updateData: any = {
        paidAmount: newPaid,
        status: isFullyPaid ? "confirmed" : "pending",
    };

    // Si es mixto, el detalle viene en method/notes o similar (en este caso lo pasamos como string en notes)
    // Pero mejor: si method es 'mixed', decodificamos el JSON de las notas.
    if (method === "mixed" && notes) {
        try {
            const details = JSON.parse(notes);
            updateData.paymentDetails = details;
        } catch (e) { }
    }

    const cashSession = await prisma.cashSession.findFirst({
        where: { tenantId, complexId: event.complexId, status: "open" }
    });

    await prisma.$transaction(async (tx) => {
        // Crear los registros de pago vinculados a la sesión de caja
        if (method === "mixed" && notes) {
            const details = JSON.parse(notes);
            if (details.cash > 0) {
                await tx.payment.create({ data: { ...paymentData, cashSessionId: cashSession?.id, amount: details.cash, paymentMethod: "cash", notes: "Pago mixto: Efectivo" } });
            }
            if (details.card > 0) {
                await tx.payment.create({ data: { ...paymentData, cashSessionId: cashSession?.id, amount: details.card, paymentMethod: "card", notes: "Pago mixto: Tarjeta" } });
            }
            if (details.transfer > 0) {
                await tx.payment.create({ data: { ...paymentData, cashSessionId: cashSession?.id, amount: details.transfer, paymentMethod: "transfer", notes: "Pago mixto: Transferencia" } });
            }
        } else {
            await tx.payment.create({
                data: {
                    ...paymentData,
                    cashSessionId: cashSession?.id,
                    notes: notes || paymentData.notes
                },
            });
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
                subtotal: amount,
                total: amount,
                status: "completed",
                paymentMethod: method,
                paymentDetails: method === "mixed" && notes ? JSON.parse(notes) : undefined,
            }
        });

        await tx.event.update({
            where: { id: eventId },
            data: updateData,
        });
    });

    revalidatePath(`/dashboard/events/${eventId}`);
    revalidatePath("/dashboard/events");
    return { success: true };
}

export async function updateEventStatus(eventId: string, status: string) {
    const session = await auth();
    const tenantId = getTenantId(session);

    await prisma.event.update({
        where: { id: eventId, tenantId },
        data: { status },
    });

    revalidatePath(`/dashboard/events/${eventId}`);
    revalidatePath("/dashboard/events");
    return { success: true };
}

export async function deleteEventFromDetail(eventId: string) {
    const session = await auth();
    const tenantId = getTenantId(session);

    await prisma.event.delete({ where: { id: eventId, tenantId } });
    revalidatePath("/dashboard/events");
    return { success: true };
}

export async function addEventExtraHour(eventId: string, amount: number) {
    const session = await auth();
    const tenantId = getTenantId(session);

    const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } });
    if (!event) throw new Error("Evento no encontrado");

    // Extender 1 hora el endTime
    const currentEndTime = new Date(event.endTime);
    const newEndTime = new Date(currentEndTime.getTime() + 60 * 60 * 1000);

    await prisma.event.update({
        where: { id: eventId },
        data: {
            totalAmount: { increment: amount },
            endTime: newEndTime
        }
    });

    revalidatePath(`/dashboard/events/${eventId}`);
    revalidatePath("/dashboard/events");
    return { success: true };
}
