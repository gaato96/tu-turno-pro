"use server";

import { prisma } from "@/lib/prisma";

export async function getSubscriptionsInfo() {
    const tenants = await prisma.tenant.findMany({
        select: {
            id: true,
            name: true,
            plan: true,
            planStatus: true,
            createdAt: true,
        },
        orderBy: { createdAt: "desc" },
    });

    return tenants.map((t) => {
        let amount = 0;
        if (t.plan === "pro") amount = 15000;
        if (t.plan === "starter") amount = 8000;
        if (t.plan === "enterprise") amount = 35000;

        // Mock next billing date to 1st of next month for demo purposes
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        nextMonth.setDate(1);

        return {
            id: t.id,
            tenant: t.name,
            plan: t.plan,
            amount,
            status: t.planStatus,
            nextBilling: nextMonth.toISOString().split("T")[0],
            since: t.createdAt.toISOString().split("T")[0],
        };
    });
}
