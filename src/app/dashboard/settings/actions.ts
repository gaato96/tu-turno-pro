"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

function getTenantId(session: any): string {
    const tid = session?.user?.tenantId;
    if (!tid) throw new Error("Unauthorized");
    return tid;
}

export async function getSettingsData() {
    const session = await auth();
    const tenantId = getTenantId(session);

    // Get first complex for this tenant (Tu Turno Pro is assuming 1 complex per tenant for now, or we just grab the first one)
    const complex = await prisma.complex.findFirst({
        where: { tenantId },
        include: { schedules: true }
    });

    if (!complex) {
        throw new Error("No complex found for tenant");
    }

    return complex;
}

export async function updateComplexSchedule(complexId: string, schedules: any[]) {
    const session = await auth();
    getTenantId(session); // Just for auth check

    // Use a transaction to update all schedules safely
    await prisma.$transaction(
        schedules.map(schedule =>
            prisma.complexSchedule.upsert({
                where: {
                    complexId_dayOfWeek: {
                        complexId: complexId,
                        dayOfWeek: schedule.dayOfWeek,
                    }
                },
                update: {
                    openingTime: schedule.openingTime,
                    closingTime: schedule.closingTime,
                    isActive: schedule.isActive
                },
                create: {
                    complexId: complexId,
                    dayOfWeek: schedule.dayOfWeek,
                    openingTime: schedule.openingTime,
                    closingTime: schedule.closingTime,
                    isActive: schedule.isActive
                }
            })
        )
    );

    revalidatePath("/dashboard/settings");
}

export async function updateComplexInfo(complexId: string, name: string, phone: string, address: string) {
    const session = await auth();
    getTenantId(session); // Just for auth check

    await prisma.complex.update({
        where: { id: complexId },
        data: { name, phone, address }
    });

    revalidatePath("/dashboard/settings");
}

export async function updateComplexPaymentSettings(
    complexId: string,
    requiresDeposit: boolean,
    depositPercentage: number | null,
    depositAmount: number | null,
    bankAccountInfo: string
) {
    const session = await auth();
    getTenantId(session); // Just for auth check

    await prisma.complex.update({
        where: { id: complexId },
        data: {
            requiresDeposit,
            depositPercentage,
            depositAmount,
            bankAccountInfo
        }
    });

    revalidatePath("/dashboard/settings");
}
