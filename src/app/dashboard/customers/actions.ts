"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

function getTenantId(session: any): string {
    const tid = session?.user?.tenantId;
    if (!tid) throw new Error("Unauthorized");
    return tid;
}

export async function searchCustomers(query: string) {
    const session = await auth();
    const tenantId = getTenantId(session);

    if (!query || query.length < 2) return [];

    return await prisma.customer.findMany({
        where: {
            tenantId,
            OR: [
                { name: { contains: query, mode: "insensitive" } },
                { phone: { contains: query, mode: "insensitive" } },
            ],
        },
        take: 10,
        orderBy: { name: "asc" },
    });
}

export async function createCustomer(data: { name: string; phone?: string; email?: string; defaultDiscount?: number }) {
    const session = await auth();
    const tenantId = getTenantId(session);

    const phone = data.phone?.trim() || null;
    const email = data.email?.trim() || null;

    // Check if phone already exists to avoid unique constraint error
    if (phone) {
        const existing = await prisma.customer.findFirst({
            where: { tenantId, phone }
        });
        if (existing) return existing;
    }

    const customer = await prisma.customer.create({
        data: {
            tenantId,
            name: data.name,
            phone,
            email,
            defaultDiscount: data.defaultDiscount !== undefined ? data.defaultDiscount : null,
        },
    });

    revalidatePath("/dashboard/customers");
    return customer;
}

export async function getCustomers() {
    const session = await auth();
    const tenantId = getTenantId(session);

    const customers = await prisma.customer.findMany({
        where: { tenantId },
        include: {
            _count: {
                select: { reservations: true }
            }
        },
        orderBy: { name: "asc" }
    });

    return customers.map(c => ({
        ...c,
        reservationCount: c._count.reservations,
        balance: c.balance ? Number(c.balance) : 0
    }));
}

export async function getCustomerDetail(id: string) {
    const session = await auth();
    const tenantId = getTenantId(session);

    const customer = await prisma.customer.findFirst({
        where: { id, tenantId },
        include: {
            reservations: {
                orderBy: { date: 'desc' },
                take: 20,
                include: {
                    court: true
                }
            },
            payments: {
                orderBy: { createdAt: 'desc' },
                take: 20
            }
        }
    });

    if (!customer) throw new Error("Customer not found");

    // Fetch future recurring reservations to allow canceling them
    const futureRecurringRaw = await prisma.reservation.findMany({
        where: {
            customerId: id,
            tenantId,
            isRecurring: true,
            status: { notIn: ["cancelled"] },
            date: { gte: new Date() }
        },
        orderBy: { date: 'asc' },
        select: {
            id: true,
            courtId: true,
            court: { select: { name: true } },
            date: true,
            startTime: true,
            endTime: true,
            reservationType: true
        }
    });

    const seenTimes = new Set();
    const futureRecurring = futureRecurringRaw.filter((r: any) => {
        const timeKey = `${r.courtId}-${r.startTime.toISOString().split('T')[1]}`;
        if (seenTimes.has(timeKey)) return false;
        seenTimes.add(timeKey);
        return true;
    });

    return {
        ...customer,
        futureRecurring,
        defaultDiscount: customer.defaultDiscount ? Number(customer.defaultDiscount) : null,
        balance: Number(customer.balance)
    };
}

export async function cancelFutureRecurringReservations(reservationId: string) {
    const session = await auth();
    const tenantId = getTenantId(session);

    // Find the base reservation
    const baseRes = await prisma.reservation.findFirst({
        where: { id: reservationId, tenantId }
    });
    if (!baseRes || !baseRes.isRecurring) throw new Error("Turno fijo no encontrado");

    // Cancel all future recurring reservations for this customer that match the given time and court
    const startTimeTime = new Date(baseRes.startTime);
    const hour = startTimeTime.getHours();
    const minute = startTimeTime.getMinutes();

    // Find all future reservations for this customer/court combination
    const futureRes = await prisma.reservation.findMany({
        where: {
            customerId: baseRes.customerId,
            tenantId,
            isRecurring: true,
            status: { notIn: ["cancelled", "paid", "in_game", "finished"] },
            courtId: baseRes.courtId,
            date: { gte: new Date() }
        }
    });

    // Filter down to the specific time slot
    const toCancelIds = futureRes.filter(r => {
        const d = new Date(r.startTime);
        return d.getHours() === hour && d.getMinutes() === minute;
    }).map(r => r.id);

    if (toCancelIds.length > 0) {
        await prisma.reservation.updateMany({
            where: { id: { in: toCancelIds } },
            data: { status: "cancelled", notes: "Turno fijo cancelado desde módulo clientes" }
        });
    }

    revalidatePath("/dashboard/customers");
    revalidatePath("/dashboard/reservations");
    return { count: toCancelIds.length };
}

export async function updateCustomer(id: string, data: { name: string; phone?: string; email?: string; notes?: string; defaultDiscount?: number }) {
    const session = await auth();
    const tenantId = getTenantId(session);

    const phone = data.phone?.trim() || null;
    const email = data.email?.trim() || null;

    // Validate phone uniqueness if changed
    if (phone) {
        const existing = await prisma.customer.findFirst({
            where: { tenantId, phone, id: { not: id } }
        });
        if (existing) throw new Error("El teléfono ya está registrado por otro cliente");
    }

    const updated = await prisma.customer.update({
        where: { id, tenantId },
        data: {
            name: data.name,
            phone,
            email,
            notes: data.notes,
            defaultDiscount: data.defaultDiscount !== undefined ? data.defaultDiscount : null
        }
    });

    revalidatePath("/dashboard/customers");
    return updated;
}

export async function deleteCustomer(id: string) {
    const session = await auth();
    const tenantId = getTenantId(session);

    await prisma.customer.delete({
        where: { id, tenantId }
    });

    revalidatePath("/dashboard/customers");
}

export async function addCustomerPayment(customerId: string, amount: number, paymentMethod: string, notes?: string) {
    const session = await auth();
    const tenantId = getTenantId(session);

    // In a real app we might also want to link this to a CashSession
    // But for now, just creating a Payment and decreasing the balance

    // We execute this in a transaction
    const result = await prisma.$transaction(async (tx) => {
        const customer = await tx.customer.findUniqueOrThrow({
            where: { id: customerId, tenantId }
        });

        const payment = await tx.payment.create({
            data: {
                tenantId,
                customerId,
                amount,
                paymentMethod,
                concept: "balance", // paying off tab balance
                notes
            }
        });

        // Decrease the balance (positive balance means debt, so we subtract amount)
        const newBalance = Number(customer.balance) - amount;

        const updatedCustomer = await tx.customer.update({
            where: { id: customerId },
            data: { balance: newBalance }
        });

        return { payment, customer: updatedCustomer };
    });

    revalidatePath("/dashboard/customers");
    return result;
}
