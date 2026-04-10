"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getExpenses(complexId: string, dateStr: string) {
    const expenses = await prisma.expense.findMany({
        where: {
            complexId,
            date: new Date(dateStr)
        },
        include: {
            category: true,
            cashSession: true
        },
        orderBy: { createdAt: "desc" }
    });
    return expenses;
}

export async function createExpenseCategory(tenantId: string, name: string) {
    if (!name.trim()) throw new Error("El nombre es requerido");

    await prisma.expenseCategory.create({
        data: {
            tenantId,
            name: name.trim(),
            isActive: true
        }
    });

    revalidatePath("/dashboard/expenses");
    return { success: true };
}

export async function toggleExpenseCategory(categoryId: string, isActive: boolean) {
    await prisma.expenseCategory.update({
        where: { id: categoryId },
        data: { isActive }
    });
    revalidatePath("/dashboard/expenses");
    return { success: true };
}

export async function createExpense(
    tenantId: string,
    complexId: string,
    categoryId: string,
    amount: number,
    description: string,
    dateStr: string,
    linkToCash: boolean
) {
    if (amount <= 0) throw new Error("El monto debe ser mayor a 0");
    if (!categoryId) throw new Error("Debe seleccionar una categoría");

    const parsedDate = new Date(`${dateStr}T12:00:00`);

    await prisma.$transaction(async (tx) => {
        let cashSessionId = null;

        // If linked to cash, verify open cash session
        if (linkToCash) {
            const session = await tx.cashSession.findFirst({
                where: { tenantId, status: "open" }
            });
            if (!session) {
                throw new Error("No hay una caja abierta para imputar el gasto. Abra la caja primero, o destilde la opción 'Imputar en caja'.");
            }
            cashSessionId = session.id;
        }

        await tx.expense.create({
            data: {
                tenantId,
                complexId,
                categoryId,
                amount,
                description,
                date: parsedDate,
                cashSessionId
            }
        });
    });

    revalidatePath("/dashboard/expenses");
    return { success: true };
}

export async function deleteExpense(expenseId: string) {
    await prisma.expense.delete({
        where: { id: expenseId }
    });
    revalidatePath("/dashboard/expenses");
    return { success: true };
}
