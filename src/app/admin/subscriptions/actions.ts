"use server";

import { prisma } from "@/lib/prisma";

export async function getSubscriptionsInfo() {
    const tenants = await prisma.tenant.findMany({
        include: {
            complexes: {
                include: {
                    _count: { select: { courts: true } }
                }
            }
        },
        orderBy: { createdAt: "desc" },
    });

    return tenants.map((t) => {
        const totalCourts = t.complexes.reduce((sum, c) => sum + c._count.courts, 0);

        let amount = 0;
        if (totalCourts <= 3) amount = 8000;
        else if (totalCourts <= 6) amount = 15000;
        else amount = 35000;

        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        nextMonth.setDate(1);

        return {
            id: t.id,
            tenant: t.name,
            plan: t.plan,
            totalCourts,
            complexes: t.complexes.length,
            amount,
            status: t.planStatus,
            nextBilling: nextMonth.toISOString().split("T")[0],
            since: t.createdAt.toISOString().split("T")[0],
        };
    });
}
