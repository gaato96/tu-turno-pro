"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getActiveComplexOrRedirect } from "@/lib/active-complex";

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
    const userRole = (session?.user as any)?.role;
    const userComplexId = (session?.user as any)?.complexId;

    // Get complexes filtered by role
    const allComplexes = await prisma.complex.findMany({
        where: {
            tenantId,
            isActive: true,
            ...(userRole === "staff" && userComplexId ? { id: userComplexId } : {})
        },
        select: { id: true, name: true }
    });

    if (allComplexes.length === 0) return { complex: null, complexes: [], courts: [], reservations: [] };

    const complexIdToUse = await getActiveComplexOrRedirect();

    if (!complexIdToUse) {
        throw new Error("No active complex");
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

    const openingH = parseInt(complex.openingTime?.split(":")[0] || "08");
    const closingH = parseInt(complex.closingTime?.split(":")[0] || "23");

    const businessStart = new Date(dateStr + "T" + (complex.openingTime || "08:00") + ":00");

    // If closing time is before or same hour as opening, it means next day
    let businessEnd = new Date(dateStr + "T" + (complex.closingTime || "23:00") + ":00");
    if (closingH <= openingH) {
        businessEnd.setDate(businessEnd.getDate() + 1);
    }

    const reservations = await prisma.reservation.findMany({
        where: {
            tenantId,
            complexId: complex.id,
            startTime: {
                gte: businessStart,
                lt: businessEnd
            },
            status: { notIn: ["cancelled"] }
        },
        include: {
            court: { select: { name: true } },
            sales: {
                where: { status: { not: "cancelled" } },
                include: { items: { include: { product: { select: { name: true } } } } }
            }
        },
        orderBy: { startTime: "asc" }
    });

    // Serialize Decimal fields and fix Timezone shift for client
    const serializedReservations = reservations.map((r: any) => ({
        ...r,
        date: r.date.toISOString().replace("Z", ""),
        startTime: r.startTime.toISOString().replace("Z", ""),
        endTime: r.endTime.toISOString().replace("Z", ""),
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

// ── Get Available Slots (lightweight) ──

export async function getAvailableSlots(dateStr: string, complexId: string) {
    const session = await auth();
    const tenantId = getTenantId(session);

    const reservations = await prisma.reservation.findMany({
        where: {
            tenantId,
            complexId,
            date: new Date(dateStr + "T00:00:00"),
            status: { notIn: ["cancelled"] }
        },
        select: {
            courtId: true,
            startTime: true,
            endTime: true,
            customerName: true,
            status: true,
        },
        orderBy: { startTime: "asc" }
    });

    return reservations.map(r => ({
        courtId: r.courtId,
        startTime: r.startTime.toISOString().replace("Z", ""),
        endTime: r.endTime.toISOString().replace("Z", ""),
        customerName: r.customerName,
        status: r.status,
    }));
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
    const customerId = formData.get("customerId") as string || null;
    const notes = formData.get("notes") as string || null;


    // Use a fixed reference for "today" in local time to avoid UTC shifts
    // Normalized to 12:00 to keep the date invariant during basic math
    const date = new Date(dateStr + "T12:00:00");
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
            customerId: customerId || null,
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
    revalidatePath("/dashboard");
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
    revalidatePath("/dashboard");
    return { success: true };
}

export async function payReservation(reservationId: string, paymentMethod: string, paymentDetails?: any) {
    const session = await auth();
    const tenantId = getTenantId(session);

    const reservation = await prisma.reservation.findFirst({
        where: { id: reservationId, tenantId }
    });
    if (!reservation) throw new Error("Reservation not found");

    const cashSession = await prisma.cashSession.findFirst({
        where: { tenantId, status: "open" }
    });

    await prisma.$transaction(async (tx) => {
        // 1. Mark reservation as paid
        await tx.reservation.update({
            where: { id: reservationId },
            data: {
                status: "paid",
                paymentMethod,
                paymentDetails: paymentDetails ? JSON.parse(JSON.stringify(paymentDetails)) : undefined,
            }
        });

        // 2. Clear any on_tab sales linked to this reservation and attach to active cash session
        await tx.sale.updateMany({
            where: { reservationId, status: "on_tab" },
            data: {
                status: "completed",
                paymentMethod,
                paymentDetails: paymentDetails ? JSON.parse(JSON.stringify(paymentDetails)) : undefined,
                cashSessionId: cashSession?.id || null, // Link to active session at payment time
            }
        });

        // 3. Create a Sale for the court amount to reflect in cash register
        if (Number(reservation.courtAmount) > 0) {
            // Generate sequential invoice number roughly for this sale
            const now = new Date();
            const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
            const todaySalesCount = await tx.sale.count({
                where: {
                    tenantId,
                    createdAt: { gte: new Date(now.toISOString().slice(0, 10) + "T00:00:00") }
                }
            });
            const invoiceNumber = `R${dateStr}-${(todaySalesCount + 1).toString().padStart(4, "0")}`;

            await tx.sale.create({
                data: {
                    tenantId,
                    reservationId,
                    cashSessionId: cashSession?.id || null,
                    invoiceNumber,
                    subtotal: reservation.courtAmount,
                    total: reservation.courtAmount, // minus discount if global discount applied? simple for now
                    status: "completed",
                    paymentMethod,
                    paymentDetails: paymentDetails ? JSON.parse(JSON.stringify(paymentDetails)) : undefined,
                    // No SaleItems needed for Court rent because it's distinct
                }
            });
        }
    });

    revalidatePath("/dashboard/reservations");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/cash");
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
    revalidatePath("/dashboard");
    return { success: true };
}
