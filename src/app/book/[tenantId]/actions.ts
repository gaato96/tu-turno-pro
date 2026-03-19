"use server";

import { prisma } from "@/lib/prisma";

export async function getTenantInfo(tenantId: string) {
    const tenant = await prisma.user.findFirst({
        where: { tenantId, role: "admin" },
        select: { name: true, tenantId: true }
    });

    if (!tenant) return null;

    const complexes = await prisma.complex.findMany({
        where: { tenantId, isActive: true },
        include: {
            courts: {
                where: { isActive: true }
            }
        }
    });

    return {
        tenant: { tenantId: tenant.tenantId, tenantName: tenant.name },
        complexes
    };
}

export async function getAvailableSlots(tenantId: string, courtId: string, date: string) {
    const court = await prisma.court.findFirst({ where: { id: courtId, isActive: true } });
    if (!court) return { court: null, reservations: [] };

    const reservations = await prisma.reservation.findMany({
        where: { tenantId, courtId, date, status: { in: ["confirmed", "in_game"] } }
    });

    return { court, reservations };
}

export async function createPublicReservation(data: any) {
    // Basic validation
    if (!data.tenantId || !data.courtId || !data.date || !data.startTime || !data.duration || !data.customerName || !data.customerPhone) {
        throw new Error("Faltan datos requeridos");
    }

    // Check if slot overlaps
    const startH = parseInt(data.startTime.split(":")[0]);
    const startM = parseInt(data.startTime.split(":")[1] || "0");
    const durationMins = parseInt(data.duration);

    const endMinutes = (startH * 60) + startM + durationMins;
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;
    const endTime = `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;

    const existing = await prisma.reservation.findFirst({
        where: {
            tenantId: data.tenantId,
            courtId: data.courtId,
            date: data.date,
            status: { in: ["confirmed", "in_game"] },
            OR: [
                { startTime: { lt: endTime }, endTime: { gt: data.startTime } }
            ]
        }
    });

    if (existing) {
        throw new Error("Este horario ya no está disponible. Por favor elige otro.");
    }

    // Determine price
    const court = await prisma.court.findFirst({ where: { id: data.courtId } });
    if (!court) throw new Error("Cancha no encontrada");

    let courtAmount = 0;
    const nightStartHour = parseInt(court.nightRateStartTime.split(":")[0]);
    const nightStartMinute = parseInt(court.nightRateStartTime.split(":")[1] || "0");

    let iter = new Date(`1970-01-01T${data.startTime}:00`);
    const endIter = new Date(`1970-01-01T${endTime}:00`);

    while (iter < endIter) {
        const h = iter.getHours();
        const m = iter.getMinutes();
        const isNight = h > nightStartHour || (h === nightStartHour && m >= nightStartMinute);
        const ratePer30Min = (isNight ? Number(court.nightRate) : Number(court.dayRate)) / 2;
        courtAmount += ratePer30Min;
        iter.setMinutes(iter.getMinutes() + 30);
    }

    const reservation = await prisma.reservation.create({
        data: {
            tenantId: data.tenantId,
            complexId: court.complexId,
            courtId: court.id,
            customerName: data.customerName,
            customerPhone: data.customerPhone,
            date: data.date,
            startTime: data.startTime,
            endTime,
            status: "pending", // Empezar en pendiente para que el admin deba confirmarla
            source: "web",
            courtAmount,
            totalAmount: courtAmount,
            notes: "Reserva generada vía Web Público",
        }
    });

    return { success: true, reservation };
}
