"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getActiveComplexOrRedirect } from "@/lib/active-complex";

function getTenantId(session: any): string {
    const tid = session?.user?.tenantId;
    if (!tid) throw new Error("Unauthorized");
    return tid;
}

// ── Categories ──

export async function getCategories() {
    const session = await auth();
    const tenantId = getTenantId(session);

    const targetComplexId = await getActiveComplexOrRedirect();
    if (!targetComplexId) throw new Error("No active complex");

    const categories = await prisma.category.findMany({
        where: { tenantId, complexId: targetComplexId, isActive: true },
        include: { _count: { select: { products: true } } },
        orderBy: { name: "asc" }
    });
    return categories;
}

export async function createCategory(formData: FormData) {
    const session = await auth();
    const tenantId = getTenantId(session);

    const targetComplexId = await getActiveComplexOrRedirect();
    if (!targetComplexId) throw new Error("No active complex");

    const name = formData.get("name") as string;
    const icon = formData.get("icon") as string || null;

    await prisma.category.create({
        data: { tenantId, complexId: targetComplexId, name, icon }
    });

    revalidatePath("/dashboard/products");
}

export async function updateCategory(id: string, formData: FormData) {
    const session = await auth();
    const tenantId = getTenantId(session);

    const name = formData.get("name") as string;
    const icon = formData.get("icon") as string || null;

    await prisma.category.updateMany({
        where: { id, tenantId },
        data: { name, icon }
    });
    revalidatePath("/dashboard/products");
}

export async function deleteCategory(id: string) {
    const session = await auth();
    const tenantId = getTenantId(session);

    await prisma.category.updateMany({
        where: { id, tenantId },
        data: { isActive: false }
    });
    revalidatePath("/dashboard/products");
}

// ── Suppliers ──

export async function getSuppliers() {
    const session = await auth();
    const tenantId = getTenantId(session);

    const targetComplexId = await getActiveComplexOrRedirect();
    if (!targetComplexId) throw new Error("No active complex");

    return await prisma.supplier.findMany({
        where: { tenantId, complexId: targetComplexId, isActive: true },
        orderBy: { name: "asc" }
    });
}

export async function createSupplier(formData: FormData) {
    const session = await auth();
    const tenantId = getTenantId(session);

    const targetComplexId = await getActiveComplexOrRedirect();
    if (!targetComplexId) throw new Error("No active complex");

    const name = formData.get("name") as string;
    const contact = formData.get("contactName") as string || null;
    const phone = formData.get("phone") as string || null;
    const email = formData.get("email") as string || null;

    await prisma.supplier.create({
        data: { tenantId, complexId: targetComplexId, name, contact, phone, email }
    });
    revalidatePath("/dashboard/products");
}

export async function updateSupplier(id: string, formData: FormData) {
    const session = await auth();
    const tenantId = getTenantId(session);

    const name = formData.get("name") as string;
    const contact = formData.get("contactName") as string || null;
    const phone = formData.get("phone") as string || null;
    const email = formData.get("email") as string || null;

    await prisma.supplier.updateMany({
        where: { id, tenantId },
        data: { name, contact, phone, email }
    });
    revalidatePath("/dashboard/products");
}

export async function deleteSupplier(id: string) {
    const session = await auth();
    const tenantId = getTenantId(session);

    await prisma.supplier.updateMany({
        where: { id, tenantId },
        data: { isActive: false }
    });
    revalidatePath("/dashboard/products");
}

// ── Products ──

export async function getProducts() {
    const session = await auth();
    const tenantId = getTenantId(session);

    const targetComplexId = await getActiveComplexOrRedirect();
    if (!targetComplexId) throw new Error("No active complex");

    const products = await prisma.product.findMany({
        where: { tenantId, complexId: targetComplexId, isActive: true },
        include: {
            category: { select: { name: true } },
            supplier: { select: { name: true } }
        },
        orderBy: { name: "asc" }
    });

    return products.map(p => ({
        ...p,
        costPrice: Number(p.costPrice),
        salePrice: Number(p.salePrice),
    }));
}

export async function createProduct(formData: FormData) {
    const session = await auth();
    const tenantId = getTenantId(session);

    const targetComplexId = await getActiveComplexOrRedirect();
    if (!targetComplexId) throw new Error("No active complex");

    const name = formData.get("name") as string;
    const categoryId = formData.get("categoryId") as string;
    const supplierId = formData.get("supplierId") as string || null;
    const costPrice = parseFloat(formData.get("costPrice") as string) || 0;
    const salePrice = parseFloat(formData.get("salePrice") as string) || 0;
    const stock = parseInt(formData.get("stock") as string) || 0;
    const trackStock = formData.get("trackStock") === "true";
    const minStock = parseInt(formData.get("minStock") as string) || 0;

    await prisma.product.create({
        data: { tenantId, complexId: targetComplexId, categoryId, supplierId, name, costPrice, salePrice, stock, trackStock, minStock }
    });

    revalidatePath("/dashboard/products");
}

export async function updateProduct(id: string, formData: FormData) {
    const session = await auth();
    const tenantId = getTenantId(session);

    const name = formData.get("name") as string;
    const categoryId = formData.get("categoryId") as string;
    const supplierId = formData.get("supplierId") as string || null;
    const costPrice = parseFloat(formData.get("costPrice") as string) || 0;
    const salePrice = parseFloat(formData.get("salePrice") as string) || 0;
    const stock = parseInt(formData.get("stock") as string) || 0;
    const trackStock = formData.get("trackStock") === "true";
    const minStock = parseInt(formData.get("minStock") as string) || 0;

    await prisma.product.updateMany({
        where: { id, tenantId },
        data: { categoryId, supplierId, name, costPrice, salePrice, stock, trackStock, minStock }
    });

    revalidatePath("/dashboard/products");
}

export async function deleteProduct(id: string) {
    const session = await auth();
    const tenantId = getTenantId(session);

    await prisma.product.updateMany({
        where: { id, tenantId },
        data: { isActive: false }
    });
    revalidatePath("/dashboard/products");
}
