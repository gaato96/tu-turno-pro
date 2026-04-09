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

    await prisma.$transaction([
        prisma.payment.create({
            data: {
                tenantId,
                eventId,
                amount,
                paymentMethod: method,
                concept: "event",
                notes: notes || `Pago de evento: ${event.name}`,
            },
        }),
        prisma.event.update({
            where: { id: eventId },
            data: {
                paidAmount: newPaid,
                status: isFullyPaid ? "confirmed" : "pending",
            },
        }),
    ]);

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
