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
