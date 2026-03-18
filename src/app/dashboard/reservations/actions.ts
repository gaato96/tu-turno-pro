"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ── Helpers ──

function getTenantId(session: any): string {
    const tid = session?.user?.tenantId;
    if (!tid) throw new Error("Unauthorized");
    return tid;
}

// ── Calendar Data ──

export async function getCalendarData(dateStr: string) {
    const session = await auth();
    const tenantId = getTenantId(session);

    const complex = await prisma.complex.findFirst({
        where: { tenantId, isActive: true },
        include: {
            courts: {
                where: { isActive: true },
                orderBy: { displayOrder: "asc" }
            }
        }
    });

    if (!complex) return { complex: null, courts: [], reservations: [] };

    const selectedDate = new Date(dateStr + "T00:00:00");
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const reservations = await prisma.reservation.findMany({
        where: {
            tenantId,
            complexId: complex.id,
            date: {
                gte: startOfDay,
                lte: endOfDay
            },
            status: { not: "cancelled" }
        },
        include: {
            court: { select: { name: true } }
        },
        orderBy: { startTime: "asc" }
    });

    // Serialize Decimal fields for client
    const serializedReservations = reservations.map(r => ({
        ...r,
        courtAmount: Number(r.courtAmount),
        consumptionAmount: Number(r.consumptionAmount),
        discount: Number(r.discount),
        totalAmount: Number(r.totalAmount),
    }));

    const serializedCourts = complex.courts.map(c => ({
        ...c,
        dayRate: Number(c.dayRate),
        nightRate: Number(c.nightRate),
    }));

    return {
        complex: { id: complex.id, name: complex.name, openingTime: complex.openingTime, closingTime: complex.closingTime },
        courts: serializedCourts,
        reservations: serializedReservations
    };
}

// ── Create Reservation ──

export async function createReservation(formData: FormData) {
    const session = await auth();
    const tenantId = getTenantId(session);

    const complexId = formData.get("complexId") as string;
    const courtId = formData.get("courtId") as string;
    const customerName = formData.get("customerName") as string;
    const customerPhone = formData.get("customerPhone") as string || null;
    const dateStr = formData.get("date") as string;
    const startTimeStr = formData.get("startTime") as string;
    const endTimeStr = formData.get("endTime") as string;
    const notes = formData.get("notes") as string || null;

    // Build full datetime objects
    const date = new Date(dateStr + "T00:00:00");
    const startTime = new Date(dateStr + "T" + startTimeStr + ":00");
    const endTime = new Date(dateStr + "T" + endTimeStr + ":00");

    // Verify ownership
    const complex = await prisma.complex.findFirst({ where: { id: complexId, tenantId } });
    if (!complex) throw new Error("Complex not found");

    const court = await prisma.court.findFirst({ where: { id: courtId, complexId } });
    if (!court) throw new Error("Court not found");

    // Calculate rate: if startTime >= nightRateStartTime, use nightRate
    const nightStart = parseInt(court.nightRateStartTime.split(":")[0]);
    const slotStartHour = startTime.getHours();
    const rate = slotStartHour >= nightStart ? Number(court.nightRate) : Number(court.dayRate);

    // Duration in hours
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    const courtAmount = rate * durationHours;

    await prisma.reservation.create({
        data: {
            tenantId,
            complexId,
            courtId,
            userId: (session?.user as any)?.id || null,
            customerName,
            customerPhone,
            date,
            startTime,
            endTime,
            status: "confirmed",
            source: "backoffice",
            courtAmount,
            totalAmount: courtAmount,
            notes,
        }
    });

    revalidatePath("/dashboard/reservations");
    return { success: true };
}

// ── Change Status ──

export async function changeReservationStatus(reservationId: string, newStatus: string) {
    const session = await auth();
    const tenantId = getTenantId(session);

    const reservation = await prisma.reservation.findFirst({
        where: { id: reservationId, tenantId }
    });
    if (!reservation) throw new Error("Reservation not found");

    await prisma.reservation.update({
        where: { id: reservationId },
        data: { status: newStatus }
    });

    revalidatePath("/dashboard/reservations");
    return { success: true };
}

// ── Pay Reservation ──

export async function payReservation(reservationId: string, paymentMethod: string, paymentDetails?: any) {
    const session = await auth();
    const tenantId = getTenantId(session);

    const reservation = await prisma.reservation.findFirst({
        where: { id: reservationId, tenantId }
    });
    if (!reservation) throw new Error("Reservation not found");

    await prisma.reservation.update({
        where: { id: reservationId },
        data: {
            status: "paid",
            paymentMethod,
            paymentDetails: paymentDetails || undefined,
        }
    });

    revalidatePath("/dashboard/reservations");
    return { success: true };
}

// ── Cancel Reservation ──

export async function cancelReservation(reservationId: string) {
    const session = await auth();
    const tenantId = getTenantId(session);

    const reservation = await prisma.reservation.findFirst({
        where: { id: reservationId, tenantId }
    });
    if (!reservation) throw new Error("Reservation not found");

    await prisma.reservation.update({
        where: { id: reservationId },
        data: { status: "cancelled" }
    });

    revalidatePath("/dashboard/reservations");
    return { success: true };
}
