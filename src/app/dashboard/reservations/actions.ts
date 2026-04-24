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
        return { complex: null, complexes: allComplexes, courts: [], reservations: [] };
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
            ...(userRole === "admin" ? {} : { status: { notIn: ["cancelled"] } })
        },
        include: {
            court: { select: { name: true } },
            user: { select: { name: true } },
            discounts: { orderBy: { createdAt: "asc" } },
            sales: {
                where: { status: { not: "cancelled" } },
                include: { items: { include: { product: { select: { name: true } } } } }
            }
        },
        orderBy: { startTime: "asc" }
    });

    const events = await (prisma as any).event.findMany({
        where: {
            tenantId,
            complexId: complex.id,
            status: { notIn: ["cancelled"] },
            AND: [
                { startTime: { lt: businessEnd } },
                { endTime: { gt: businessStart } }
            ]
        }
    });

    // Serialize Decimal fields and fix Timezone shift for client
    const serializedReservations = reservations.map((r: any) => ({
        ...r,
        date: r.date.toISOString().replace("Z", ""),
        startTime: r.startTime.toISOString().replace("Z", ""),
        endTime: r.endTime.toISOString().replace("Z", ""),
        createdAt: r.createdAt?.toISOString(),
        updatedAt: r.updatedAt?.toISOString(),
        courtAmount: Number(r.courtAmount),
        consumptionAmount: Number(r.consumptionAmount),
        discount: Number(r.discount),
        totalAmount: Number(r.totalAmount),
        depositAmount: Number(r.depositAmount || 0),
        paidAmount: Number(r.paidAmount || 0),
        sales: r.sales?.map((s: any) => ({
            ...s,
            createdAt: s.createdAt?.toISOString(),
            updatedAt: s.updatedAt?.toISOString(),
            subtotal: Number(s.subtotal),
            total: Number(s.total),
            items: s.items?.map((i: any) => ({
                ...i,
                unitPrice: Number(i.unitPrice),
                subtotal: Number(i.subtotal)
            })) || []
        })) || [],
        discounts: r.discounts?.map((d: any) => ({
            id: d.id,
            description: d.description,
            amount: Number(d.amount),
            createdAt: d.createdAt?.toISOString(),
        })) || []
    }));

    const serializedCourts = complex.courts.map((c: any) => ({
        ...c,
        dayRate: Number(c.dayRate),
        nightRate: Number(c.nightRate),
    }));

    const serializedEvents = events.map((ev: any) => ({
        ...ev,
        date: ev.date.toISOString().replace("Z", ""),
        startTime: ev.startTime.toISOString().replace("Z", ""),
        endTime: ev.endTime.toISOString().replace("Z", ""),
        createdAt: ev.createdAt?.toISOString(),
        updatedAt: ev.updatedAt?.toISOString(),
        totalAmount: Number(ev.totalAmount),
        depositPaid: Number(ev.depositPaid),
        paidAmount: Number(ev.paidAmount)
    }));

    return {
        complex: { id: complex.id, name: complex.name, openingTime: complex.openingTime, closingTime: complex.closingTime },
        complexes: allComplexes,
        courts: serializedCourts,
        reservations: serializedReservations,
        events: serializedEvents
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
    const depositAmountStr = formData.get("depositAmount") as string;
    const paymentMethod = formData.get("paymentMethod") as string || "cash";
    const reservationType = formData.get("reservationType") as string || "casual";
    const isRecurring = formData.get("isRecurring") === "true";

    const depositAmount = depositAmountStr ? Number(depositAmountStr) : 0;

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

    // Event overlap validation (Events block all courts in the complex)
    const overlappingEvents = await prisma.event.findMany({
        where: {
            complexId,
            status: { notIn: ["cancelled"] },
            AND: [
                { startTime: { lt: endTime } },
                { endTime: { gt: startTime } }
            ]
        }
    });

    if (overlappingEvents.length > 0) {
        throw new Error("Hay un evento programado que bloquea las canchas en este horario.");
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

    await prisma.$transaction(async (tx) => {
        const newRes = await tx.reservation.create({
            data: {
                tenantId,
                complexId,
                courtId,
                userId: (session?.user as any)?.id || null,
                customerName,
                customerPhone,
                customerId: customerId || null,
                reservationType,
                isRecurring,
                date,
                startTime,
                endTime,
                status: "confirmed",
                source: "backoffice",
                courtAmount,
                totalAmount: courtAmount,
                depositAmount,
                paidAmount: depositAmount,
                notes,
            }
        });

        if (isRecurring) {
            const recurringData = [];
            for (let i = 1; i < 52; i++) {
                const iterDate = new Date(date);
                iterDate.setDate(iterDate.getDate() + i * 7);
                const iterStart = new Date(startTime);
                iterStart.setDate(iterStart.getDate() + i * 7);
                const iterEnd = new Date(endTime);
                iterEnd.setDate(iterEnd.getDate() + i * 7);

                recurringData.push({
                    tenantId,
                    complexId,
                    courtId,
                    userId: (session?.user as any)?.id || null,
                    customerName,
                    customerPhone,
                    customerId: customerId || null,
                    reservationType,
                    isRecurring: true,
                    parentReservationId: newRes.id,
                    date: iterDate,
                    startTime: iterStart,
                    endTime: iterEnd,
                    status: "confirmed", // Fixed reservations are auto-confirmed (no deposit needed)
                    source: "backoffice",
                    courtAmount,
                    totalAmount: courtAmount,
                    depositAmount: 0,
                    paidAmount: 0,
                    notes,
                });
            }
            if (recurringData.length > 0) {
                await tx.reservation.createMany({ data: recurringData });
            }
        }

        if (depositAmount > 0) {
            const cashSession = await tx.cashSession.findFirst({
                where: { tenantId, status: "open" }
            });

            await tx.payment.create({
                data: {
                    tenantId,
                    reservationId: newRes.id,
                    customerId: customerId || null,
                    cashSessionId: cashSession?.id,
                    amount: depositAmount,
                    paymentMethod,
                    concept: "seña",
                }
            });

            const now = new Date();
            const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
            const todaySalesCount = await tx.sale.count({
                where: {
                    tenantId,
                    createdAt: { gte: new Date(now.toISOString().slice(0, 10) + "T00:00:00") }
                }
            });
            const invoiceNumber = `S${dateStr}-${(todaySalesCount + 1).toString().padStart(4, "0")}`;

            await tx.sale.create({
                data: {
                    tenantId,
                    reservationId: newRes.id,
                    cashSessionId: cashSession?.id || null,
                    invoiceNumber,
                    subtotal: depositAmount,
                    total: depositAmount,
                    status: "completed",
                    paymentMethod,
                }
            });
        }
    });

    revalidatePath("/dashboard/reservations");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/cash");
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

export async function payReservation(
    reservationId: string,
    paymentMethod: string,
    amountToPay: number,
    leaveOnAccount: boolean,
    paymentDetails?: any
) {
    const session = await auth();
    const tenantId = getTenantId(session);

    const reservation = await prisma.reservation.findFirst({
        where: { id: reservationId, tenantId },
        include: { sales: { where: { status: "on_tab" } } }
    });
    if (!reservation) throw new Error("Reservation not found");

    if (leaveOnAccount && !reservation.customerId) {
        throw new Error("No se puede dejar saldo a cuenta a un usuario casual. Edite la reserva y asígnela a un Cliente registrado de la base de datos.");
    }

    const cashSession = await prisma.cashSession.findFirst({
        where: { tenantId, status: "open" }
    });

    const totalAmount = Number(reservation.totalAmount);
    const previouslyPaid = Number((reservation as any).paidAmount);
    const pendingBalance = totalAmount - previouslyPaid;

    if (amountToPay > pendingBalance) {
        throw new Error("El monto a pagar no puede ser mayor al saldo pendiente.");
    }

    await prisma.$transaction(async (tx) => {
        let paymentRecord = null;
        if (amountToPay > 0) {
            paymentRecord = await tx.payment.create({
                data: {
                    tenantId,
                    reservationId,
                    customerId: reservation.customerId,
                    cashSessionId: cashSession?.id,
                    amount: amountToPay,
                    paymentMethod,
                    concept: "court_payment",
                    notes: paymentDetails ? JSON.stringify(paymentDetails) : undefined,
                }
            });
        }

        const newPaidAmount = previouslyPaid + amountToPay;
        const remainingAfterThisPayment = totalAmount - newPaidAmount;

        let status = reservation.status;

        if (leaveOnAccount && remainingAfterThisPayment > 0) {
            status = "paid";
            await tx.customer.update({
                where: { id: reservation.customerId! },
                data: { balance: { increment: remainingAfterThisPayment } }
            });
        } else if (newPaidAmount >= totalAmount) {
            status = "paid";
        }

        await tx.reservation.update({
            where: { id: reservationId },
            data: {
                status,
                paidAmount: leaveOnAccount ? totalAmount : newPaidAmount,
                paymentMethod: status === "paid" ? paymentMethod : undefined,
            }
        });

        if (status === "paid" && reservation.sales.length > 0) {
            await tx.sale.updateMany({
                where: { reservationId, status: "on_tab" },
                data: {
                    status: "paid_with_reservation",
                    // We DO NOT set cashSessionId here because the Master Sale created below
                    // fully accounts for this money in the cash register.
                }
            });
        }

        if (amountToPay > 0) {
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
                    subtotal: amountToPay,
                    total: amountToPay,
                    status: "completed",
                    paymentMethod,
                    paymentDetails: paymentDetails ? JSON.parse(JSON.stringify(paymentDetails)) : undefined,
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

// ── Add Discount ──

export async function addDiscount(reservationId: string, description: string, amount: number) {
    const session = await auth();
    const tenantId = getTenantId(session);

    if (!description || amount <= 0) throw new Error("Concepto y monto son requeridos");

    const reservation = await prisma.reservation.findFirst({
        where: { id: reservationId, tenantId },
        include: { discounts: true }
    });
    if (!reservation) throw new Error("Reserva no encontrada");

    const currentDiscountTotal = reservation.discounts.reduce((sum, d) => sum + Number(d.amount), 0);
    const newDiscountTotal = currentDiscountTotal + amount;
    const courtAmount = Number(reservation.courtAmount);
    const consumptionAmount = Number(reservation.consumptionAmount);
    const newTotal = Math.max(0, courtAmount + consumptionAmount - newDiscountTotal);

    await prisma.$transaction(async (tx) => {
        await tx.reservationDiscount.create({
            data: {
                reservationId,
                description,
                amount,
            }
        });

        await tx.reservation.update({
            where: { id: reservationId },
            data: {
                discount: newDiscountTotal,
                totalAmount: newTotal,
            }
        });
    });

    revalidatePath("/dashboard/reservations");
    revalidatePath("/dashboard");
    return { success: true };
}

// ── Remove Discount ──

export async function removeDiscount(discountId: string) {
    const session = await auth();
    const tenantId = getTenantId(session);

    const discount = await prisma.reservationDiscount.findFirst({
        where: { id: discountId },
        include: { reservation: { include: { discounts: true } } }
    });
    if (!discount) throw new Error("Descuento no encontrado");
    if (discount.reservation.tenantId !== tenantId) throw new Error("No autorizado");

    const remainingDiscounts = discount.reservation.discounts
        .filter(d => d.id !== discountId)
        .reduce((sum, d) => sum + Number(d.amount), 0);

    const courtAmount = Number(discount.reservation.courtAmount);
    const consumptionAmount = Number(discount.reservation.consumptionAmount);
    const newTotal = Math.max(0, courtAmount + consumptionAmount - remainingDiscounts);

    await prisma.$transaction(async (tx) => {
        await tx.reservationDiscount.delete({ where: { id: discountId } });
        await tx.reservation.update({
            where: { id: discount.reservationId },
            data: {
                discount: remainingDiscounts,
                totalAmount: newTotal,
            }
        });
    });

    revalidatePath("/dashboard/reservations");
    revalidatePath("/dashboard");
    return { success: true };
}
