"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { setActiveComplexId } from "@/lib/active-complex";

export async function selectComplex(complexId: string) {
    const session = await auth();
    const tenantId = session?.user?.tenantId;

    if (!tenantId) {
        throw new Error("Unauthorized");
    }

    // Verify the complex belongs to the current tenant
    const complex = await prisma.complex.findFirst({
        where: { id: complexId, tenantId, isActive: true }
    });

    if (!complex) {
        throw new Error("Complex not found or inactive.");
    }

    // Set the cookie
    await setActiveComplexId(complexId);

    // Provide the path to redirect to
    return { success: true, redirectUrl: "/dashboard" };
}
