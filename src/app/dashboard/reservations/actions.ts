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

export async function getCalendarData(dateStr: string, activeComplexId?: string) {
    const session = await auth();
    const tenantId = getTenantId(session);

    // Get all complexes for the selector
    const allComplexes = await prisma.complex.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, name: true }
    });

    if (allComplexes.length === 0) return { complex: null, complexes: [], courts: [], reservations: [] };

    let complexIdToUse = activeComplexId;
    if (!complexIdToUse || !allComplexes.find(c => c.id === complexIdToUse)) {
        complexIdToUse = allComplexes[0].id;
    }

    const complex = await prisma.complex.findFirst({
        where: { id: complexIdToUse, tenantId, isActive: true },
        include: {
            courts: {
                where: { isActive: true },
                orderBy: { displayOrder: "asc" }
            }
        }
    });

    if (!complex) return { complex: null, complexes: allComplexes, courts: [], reservations: [] };

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
            status: { notIn: ["cancelled"] }
        },
        include: {
            court: { select: { name: true } }
        },
        orderBy: { startTime: "asc" }
    });

    // Serialize Decimal fields for client
    const serializedReservations = reservations.map((r: any) => ({
        ...r,
        courtAmount: Number(r.courtAmount),
        consumptionAmount: Number(r.consumptionAmount),
        discount: Number(r.discount),
        totalAmount: Number(r.totalAmount),
    }));

    const serializedCourts = complex.courts.map((c: any) => ({
        ...c,
        dayRate: Number(c.dayRate),
        nightRate: Number(c.nightRate),
    }));

    return {
        complex: { id: complex.id, name: complex.name, openingTime: complex.openingTime, closingTime: complex.closingTime },
        complexes: allComplexes,
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

    const court = await prisma.court.findFirst({
        where: { id: courtId, complexId },
        include: { childCourts: true, parentCourt: true }
    });
    if (!court) throw new Error("Court not found");

    // Overlap validation logic
    // We need to check if the court itself, its parent, or any of its children are already booked.
    const courtIdsToCheck = [court.id];
    if (court.parentCourtId) courtIdsToCheck.push(court.parentCourtId);
    if (court.childCourts.length > 0) courtIdsToCheck.push(...court.childCourts.map(c => c.id));

    const overlappingReservations = await prisma.reservation.findMany({
        where: {
            courtId: { in: courtIdsToCheck },
            status: { notIn: ["cancelled"] },
            AND: [
                { startTime: { lt: endTime } },
                { endTime: { gt: startTime } }
            ]
        }
    });

    if (overlappingReservations.length > 0) {
        throw new Error("El horario seleccionado o una cancha vinculada ya se encuentra reservada.");
    }

    // Calculate rate accurately splitting by nightStart
    const nightStartHour = parseInt(court.nightRateStartTime.split(":")[0]);
    const nightStartMinute = parseInt(court.nightRateStartTime.split(":")[1] || "0");

    let courtAmount = 0;
    let iter = new Date(startTime);

    // Calculate in 30-min chunks
    while (iter < endTime) {
        const h = iter.getHours();
        const m = iter.getMinutes();

        const isNight = h > nightStartHour || (h === nightStartHour && m >= nightStartMinute);
        const ratePer30Min = (isNight ? Number(court.nightRate) : Number(court.dayRate)) / 2;

        courtAmount += ratePer30Min;

        iter.setMinutes(iter.getMinutes() + 30);
    }

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
