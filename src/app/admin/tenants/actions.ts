"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

// ============================================
// TENANT CRUD
// ============================================

export async function getTenantsInfo() {
    const tenants = await prisma.tenant.findMany({
        include: {
            _count: {
                select: { complexes: true, users: true }
            },
            complexes: {
                include: {
                    _count: { select: { courts: true } }
                }
            }
        },
        orderBy: { createdAt: "desc" }
    });

    return tenants.map(t => {
        const totalCourts = t.complexes.reduce((sum, c) => sum + c._count.courts, 0);
        const mrr = calculateMRR(totalCourts);
        const calculatedPlan = calculatePlan(totalCourts);
        return {
            id: t.id,
            name: t.name,
            slug: t.slug,
            phone: t.phone,
            plan: t.plan,
            calculatedPlan,
            planStatus: t.planStatus,
            modules: t.modules,
            isActive: t.isActive,
            complexes: t._count.complexes,
            users: t._count.users,
            totalCourts,
            mrr,
            createdAt: t.createdAt.toISOString(),
        };
    });
}

function calculatePlan(totalCourts: number): string {
    if (totalCourts <= 3) return "starter";
    if (totalCourts <= 6) return "pro";
    return "enterprise";
}

function calculateMRR(totalCourts: number): number {
    if (totalCourts <= 3) return 8000;
    if (totalCourts <= 6) return 15000;
    return 35000;
}

export async function createTenant(formData: FormData) {
    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;
    const phone = formData.get("phone") as string;
    const plan = formData.get("plan") as string;
    const adminEmail = formData.get("adminEmail") as string;
    const adminName = formData.get("adminName") as string;
    const adminPassword = formData.get("adminPassword") as string;
    const modulesString = formData.get("modules") as string;

    if (!name || !slug || !adminEmail || !adminPassword) {
        throw new Error("Faltan campos requeridos");
    }

    const modules = modulesString ? JSON.parse(modulesString) : ["reservations"];

    const existingTenant = await prisma.tenant.findUnique({ where: { slug } });
    if (existingTenant) throw new Error("El slug ya está en uso");

    const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (existingUser) throw new Error("El email ya está en uso");

    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    await prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
            data: { name, slug, phone: phone || null, plan, modules, isActive: true }
        });

        await tx.user.create({
            data: {
                email: adminEmail,
                name: adminName,
                hashedPassword,
                role: "admin",
                tenantId: tenant.id
            }
        });
    });

    revalidatePath("/admin/tenants");
}

export async function updateTenant(tenantId: string, data: {
    name?: string;
    slug?: string;
    phone?: string;
    plan?: string;
    modules?: string[];
    isActive?: boolean;
}) {
    if (data.slug) {
        const existing = await prisma.tenant.findFirst({
            where: { slug: data.slug, id: { not: tenantId } }
        });
        if (existing) throw new Error("El slug ya está en uso");
    }

    await prisma.tenant.update({
        where: { id: tenantId },
        data: {
            ...(data.name !== undefined && { name: data.name }),
            ...(data.slug !== undefined && { slug: data.slug }),
            ...(data.phone !== undefined && { phone: data.phone || null }),
            ...(data.plan !== undefined && { plan: data.plan }),
            ...(data.modules !== undefined && { modules: data.modules }),
            ...(data.isActive !== undefined && { isActive: data.isActive }),
        },
    });
    revalidatePath("/admin/tenants");
}

export async function deleteTenant(tenantId: string) {
    // Delete users first (no cascade from tenant to user by default)
    await prisma.user.deleteMany({ where: { tenantId } });
    await prisma.tenant.delete({ where: { id: tenantId } });
    revalidatePath("/admin/tenants");
}

export async function toggleTenantStatus(tenantId: string, isActive: boolean) {
    await prisma.tenant.update({
        where: { id: tenantId },
        data: { isActive },
    });
    revalidatePath("/admin/tenants");
}

// ============================================
// USER MANAGEMENT (per tenant)
// ============================================

export async function getTenantUsers(tenantId: string) {
    const users = await prisma.user.findMany({
        where: { tenantId },
        include: {
            complex: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: "desc" }
    });

    return users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        isActive: u.isActive,
        complexId: u.complexId,
        complexName: u.complex?.name || null,
        modules: u.modules || [],
        createdAt: u.createdAt.toISOString(),
    }));
}

export async function getTenantComplexes(tenantId: string) {
    const complexes = await prisma.complex.findMany({
        where: { tenantId },
        select: { id: true, name: true },
        orderBy: { name: "asc" }
    });
    return complexes;
}

export async function createTenantUser(data: {
    tenantId: string;
    name: string;
    email: string;
    password: string;
    phone?: string;
    role: string;
    complexId?: string;
    modules?: string[];
}) {
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) throw new Error("El email ya está en uso");

    const hashedPassword = await bcrypt.hash(data.password, 12);

    await prisma.user.create({
        data: {
            email: data.email,
            name: data.name,
            hashedPassword,
            phone: data.phone || null,
            role: data.role,
            tenantId: data.tenantId,
            complexId: data.role === "staff" ? (data.complexId || null) : null,
            modules: data.modules || [],
        }
    });

    revalidatePath("/admin/tenants");
}

export async function updateTenantUser(userId: string, data: {
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
    complexId?: string | null;
    isActive?: boolean;
    password?: string;
    modules?: string[];
}) {
    if (data.email) {
        const existing = await prisma.user.findFirst({
            where: { email: data.email, id: { not: userId } }
        });
        if (existing) throw new Error("El email ya está en uso");
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone || null;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.complexId !== undefined) updateData.complexId = data.complexId || null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.modules !== undefined) updateData.modules = data.modules;
    if (data.password) updateData.hashedPassword = await bcrypt.hash(data.password, 12);

    await prisma.user.update({
        where: { id: userId },
        data: updateData,
    });

    revalidatePath("/admin/tenants");
}

export async function deleteTenantUser(userId: string) {
    await prisma.user.delete({ where: { id: userId } });
    revalidatePath("/admin/tenants");
}
