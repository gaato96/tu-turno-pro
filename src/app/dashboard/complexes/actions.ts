"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

function getTenantId(session: any): string {
    const tid = session?.user?.tenantId;
    if (!tid) throw new Error("Unauthorized");
    return tid;
}

// ============================================
// COMPLEXES CRUD
// ============================================

export async function getComplexes() {
    const session = await auth();
    const tenantId = getTenantId(session);

    const complexes = await prisma.complex.findMany({
        where: { tenantId },
        include: {
            courts: {
                include: {
                    childCourts: { select: { id: true, name: true } },
                    parentCourt: { select: { id: true, name: true } },
                },
                orderBy: { displayOrder: "asc" },
            },
            _count: { select: { courts: true, reservations: true } },
        },
        orderBy: { createdAt: "asc" },
    });

    return complexes.map((c) => ({
        id: c.id,
        name: c.name,
        address: c.address,
        phone: c.phone,
        openingTime: c.openingTime,
        closingTime: c.closingTime,
        sportTypes: c.sportTypes,
        isActive: c.isActive,
        courtsCount: c._count.courts,
        reservationsCount: c._count.reservations,
        courts: c.courts.map((court) => ({
            id: court.id,
            name: court.name,
            sportType: court.sportType,
            dayRate: Number(court.dayRate),
            nightRate: Number(court.nightRate),
            nightRateStartTime: court.nightRateStartTime,
            isActive: court.isActive,
            displayOrder: court.displayOrder,
            parentCourtId: court.parentCourtId,
            parentCourtName: court.parentCourt?.name || null,
            childCourts: court.childCourts.map((ch) => ({
                id: ch.id,
                name: ch.name,
            })),
        })),
    }));
}

export async function createComplex(data: {
    name: string;
    address?: string;
    phone?: string;
    openingTime: string;
    closingTime: string;
    sportTypes: string[];
}) {
    const session = await auth();
    const tenantId = getTenantId(session);

    await prisma.complex.create({
        data: {
            tenantId,
            name: data.name,
            address: data.address || null,
            phone: data.phone || null,
            openingTime: data.openingTime,
            closingTime: data.closingTime,
            sportTypes: data.sportTypes,
        },
    });

    revalidatePath("/dashboard/complexes");
}

export async function updateComplex(
    complexId: string,
    data: {
        name?: string;
        address?: string;
        phone?: string;
        openingTime?: string;
        closingTime?: string;
        sportTypes?: string[];
        isActive?: boolean;
    }
) {
    const session = await auth();
    const tenantId = getTenantId(session);

    await prisma.complex.update({
        where: { id: complexId },
        data: {
            ...(data.name !== undefined && { name: data.name }),
            ...(data.address !== undefined && { address: data.address || null }),
            ...(data.phone !== undefined && { phone: data.phone || null }),
            ...(data.openingTime !== undefined && { openingTime: data.openingTime }),
            ...(data.closingTime !== undefined && { closingTime: data.closingTime }),
            ...(data.sportTypes !== undefined && { sportTypes: data.sportTypes }),
            ...(data.isActive !== undefined && { isActive: data.isActive }),
        },
    });

    revalidatePath("/dashboard/complexes");
}

export async function deleteComplex(complexId: string) {
    const session = await auth();
    getTenantId(session);

    await prisma.complex.delete({ where: { id: complexId } });
    revalidatePath("/dashboard/complexes");
}

// ============================================
// COURTS CRUD
// ============================================

export async function createCourt(data: {
    complexId: string;
    name: string;
    sportType: string;
    dayRate: number;
    nightRate: number;
    nightRateStartTime: string;
    parentCourtId?: string;
}) {
    const session = await auth();
    getTenantId(session);

    // Get max display order
    const maxOrder = await prisma.court.aggregate({
        where: { complexId: data.complexId },
        _max: { displayOrder: true },
    });

    await prisma.court.create({
        data: {
            complexId: data.complexId,
            name: data.name,
            sportType: data.sportType,
            dayRate: data.dayRate,
            nightRate: data.nightRate,
            nightRateStartTime: data.nightRateStartTime,
            parentCourtId: data.parentCourtId || null,
            displayOrder: (maxOrder._max.displayOrder ?? -1) + 1,
        },
    });

    revalidatePath("/dashboard/complexes");
}

export async function updateCourt(
    courtId: string,
    data: {
        name?: string;
        sportType?: string;
        dayRate?: number;
        nightRate?: number;
        nightRateStartTime?: string;
        parentCourtId?: string | null;
        isActive?: boolean;
    }
) {
    const session = await auth();
    getTenantId(session);

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.sportType !== undefined) updateData.sportType = data.sportType;
    if (data.dayRate !== undefined) updateData.dayRate = data.dayRate;
    if (data.nightRate !== undefined) updateData.nightRate = data.nightRate;
    if (data.nightRateStartTime !== undefined) updateData.nightRateStartTime = data.nightRateStartTime;
    if (data.parentCourtId !== undefined) updateData.parentCourtId = data.parentCourtId || null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    await prisma.court.update({
        where: { id: courtId },
        data: updateData,
    });

    revalidatePath("/dashboard/complexes");
}

export async function deleteCourt(courtId: string) {
    const session = await auth();
    getTenantId(session);

    // Unlink child courts first
    await prisma.court.updateMany({
        where: { parentCourtId: courtId },
        data: { parentCourtId: null },
    });

    await prisma.court.delete({ where: { id: courtId } });
    revalidatePath("/dashboard/complexes");
}
