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

export async function createCustomer(data: { name: string; phone?: string; email?: string }) {
    const session = await auth();
    const tenantId = getTenantId(session);

    // Check if phone already exists to avoid unique constraint error
    if (data.phone) {
        const existing = await prisma.customer.findFirst({
            where: { tenantId, phone: data.phone }
        });
        if (existing) return existing;
    }

    const customer = await prisma.customer.create({
        data: {
            tenantId,
            ...data,
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

    return {
        ...customer,
        balance: Number(customer.balance)
    };
}

export async function updateCustomer(id: string, data: { name: string; phone?: string; email?: string; notes?: string }) {
    const session = await auth();
    const tenantId = getTenantId(session);

    // Validate phone uniqueness if changed
    if (data.phone) {
        const existing = await prisma.customer.findFirst({
            where: { tenantId, phone: data.phone, id: { not: id } }
        });
        if (existing) throw new Error("Phone number already used by another customer");
    }

    const updated = await prisma.customer.update({
        where: { id, tenantId },
        data
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
