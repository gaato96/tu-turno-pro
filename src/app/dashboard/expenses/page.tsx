import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ExpensesClient from "./expenses-client";
import { getTenantId } from "@/lib/utils";

export default async function ExpensesPage() {
    const session = await auth();
    if (!session || !session.user) {
        redirect("/login");
    }

    const tenantId = getTenantId(session);

    // Get complexes to filter by complex
    const complexes = await prisma.complex.findMany({
        where: { tenantId }
    });

    if (complexes.length === 0) {
        return <div className="p-8 text-center text-muted-foreground">No hay complejos configurados.</div>;
    }

    // Default to the first complex for initial data if user is admin, or use a complex filter
    // but the client will handle date filtering. Let's send initial categories.
    const categories = await prisma.expenseCategory.findMany({
        where: { tenantId, isActive: true },
        orderBy: { name: 'asc' }
    });

    return <ExpensesClient complexes={complexes} categories={categories} tenantId={tenantId} />;
}
