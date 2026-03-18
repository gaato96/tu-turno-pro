"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getTenantsInfo() {
    const tenants = await prisma.tenant.findMany({
        include: {
            _count: {
                select: { complexes: true, users: true }
            }
        },
        orderBy: { createdAt: "desc" }
    });

    return tenants.map(t => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        plan: t.plan,
        planStatus: t.planStatus,
        modules: t.modules,
        isActive: t.isActive,
        complexes: t._count.complexes,
        users: t._count.users,
        mrr: t.plan === "pro" ? 15000 : t.plan === "starter" ? 8000 : t.plan === "enterprise" ? 35000 : 0
    }));
}

export async function toggleTenantStatus(tenantId: string, isActive: boolean) {
    await prisma.tenant.update({
        where: { id: tenantId },
        data: { isActive },
    });
    revalidatePath("/admin/tenants");
}

import bcrypt from "bcryptjs";

export async function createTenant(formData: FormData) {
    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;
    const plan = formData.get("plan") as string;
    const adminEmail = formData.get("adminEmail") as string;
    const adminName = formData.get("adminName") as string;
    const adminPassword = formData.get("adminPassword") as string;
    const modulesString = formData.get("modules") as string;

    if (!name || !slug || !adminEmail || !adminPassword) {
        throw new Error("Missing required fields");
    }

    const modules = modulesString ? JSON.parse(modulesString) : [];

    // Check slug uniqueness
    const existingTenant = await prisma.tenant.findUnique({ where: { slug } });
    if (existingTenant) {
        throw new Error("Slug ya está en uso");
    }

    // Check email uniqueness
    const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (existingUser) {
        throw new Error("El email ya está en uso");
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    await prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
            data: {
                name,
                slug,
                plan,
                modules,
                isActive: true,
            }
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
