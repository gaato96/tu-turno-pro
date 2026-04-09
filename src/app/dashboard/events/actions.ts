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
    notes?: string;
}) {
    const { tenantId, complexId, name, description, date, startTime, endTime, totalAmount, depositPaid, notes } = data;

    const parsedDate = new Date(date + "T12:00:00");
    const parsedStartTime = new Date(date + "T" + startTime + ":00");
    const parsedEndTime = new Date(date + "T" + endTime + ":00");

    await prisma.event.create({
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
            paidAmount: depositPaid || 0, // initially paidAmount is the deposit
            status: depositPaid ? "confirmed" : "pending",
            notes
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
