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

export async function getCashData() {
    const session = await auth();
    const tenantId = getTenantId(session);

    const targetComplexId = await getActiveComplexOrRedirect();
    if (!targetComplexId) throw new Error("No active complex");

    const openSession = await prisma.cashSession.findFirst({
        where: { tenantId, complexId: targetComplexId, status: "open" },
        include: {
            openedBy: { select: { name: true } },
            sales: {
                where: { status: { not: "cancelled" } },
                include: {
                    items: { include: { product: { select: { name: true } } } },
                    reservation: { select: { customerName: true, date: true, startTime: true, endTime: true, status: true, customerId: true } }
                }
            },
            payments: {
                where: { concept: "seña" }
            },
            expenses: true
        }
    });

    const history = await prisma.cashSession.findMany({
        where: { tenantId, complexId: targetComplexId, status: "closed" },
        include: { openedBy: { select: { name: true } }, closedBy: { select: { name: true } } },
        orderBy: { closingDate: "desc" },
        take: 10
    });

    if (openSession) {
        // Calculate X Report data
        const sales = openSession.sales.filter(s => s.status === "completed");

        // Separation of Reservation vs Kiosk income
        const reservationSales = sales.filter(s => s.reservationId !== null);
        const kioskSales = sales.filter(s => s.reservationId === null);

        const resTotal = reservationSales.reduce((sum, s) => sum + Number(s.total), 0);
        const kioskTotal = kioskSales.reduce((sum, s) => sum + Number(s.total), 0);
        const senasTotal = openSession.payments ? openSession.payments.reduce((sum: number, p: any) => sum + Number(p.amount), 0) : 0;

        const expensesTotal = openSession.expenses.reduce((sum, e) => sum + Number(e.amount), 0);

        const cashTotal = sales.filter(s => s.paymentMethod === "cash").reduce((sum, s) => sum + Number(s.total), 0)
            + sales.filter(s => s.paymentMethod === "mixed").reduce((sum, s) => {
                const details = s.paymentDetails as any;
                return sum + (details?.cash ? Number(details.cash) : 0);
            }, 0);

        const cardTotal = sales.filter(s => s.paymentMethod === "card").reduce((sum, s) => sum + Number(s.total), 0)
            + sales.filter(s => s.paymentMethod === "mixed").reduce((sum, s) => {
                const details = s.paymentDetails as any;
                return sum + (details?.card ? Number(details.card) : 0);
            }, 0);

        const transferTotal = sales.filter(s => s.paymentMethod === "transfer").reduce((sum, s) => sum + Number(s.total), 0)
            + sales.filter(s => s.paymentMethod === "mixed").reduce((sum, s) => {
                const details = s.paymentDetails as any;
                return sum + (details?.transfer ? Number(details.transfer) : 0);
            }, 0);

        const salesTotal = cashTotal + cardTotal + transferTotal;
        const netCashExpected = cashTotal - expensesTotal;
        const expectedBalance = Number(openSession.openingBalance) + netCashExpected;

        return {
            openSession: {
                ...openSession,
                sales: openSession.sales.map((s: any) => ({
                    ...s,
                    total: Number(s.total),
                    subtotal: Number(s.subtotal),
                    createdAt: s.createdAt?.toISOString?.() || s.createdAt,
                    paymentDetails: s.paymentDetails || null,
                    reservation: s.reservation ? {
                        ...s.reservation,
                        date: s.reservation.date?.toISOString?.() || s.reservation.date,
                        startTime: s.reservation.startTime?.toISOString?.() || s.reservation.startTime,
                        endTime: s.reservation.endTime?.toISOString?.() || s.reservation.endTime,
                    } : null,
                    items: (s.items || []).map((i: any) => ({
                        ...i,
                        productName: i.product?.name || i.productName || 'Producto',
                        subtotal: Number(i.subtotal),
                    }))
                })),
                expenses: openSession.expenses.map((e: any) => ({ ...e, amount: Number(e.amount) })),
                openingBalance: Number(openSession.openingBalance),
                salesCount: sales.length,
                resTotal,
                kioskTotal,
                senasTotal,
                expensesTotal,
                cashTotal,
                cardTotal,
                transferTotal,
                salesTotal,
                netCashExpected,
                expectedBalance,
            },

            history: history.map(h => ({
                ...h,
                openingBalance: Number(h.openingBalance),
                closingBalance: h.closingBalance ? Number(h.closingBalance) : null,
                expectedBalance: h.expectedBalance ? Number(h.expectedBalance) : null,
                difference: h.difference ? Number(h.difference) : null,
                cashTotal: h.cashTotal ? Number(h.cashTotal) : null,
                cardTotal: h.cardTotal ? Number(h.cardTotal) : null,
                transferTotal: h.transferTotal ? Number(h.transferTotal) : null,
            }))
        };
    }

    return {
        openSession: null,
        history: history.map(h => ({
            ...h,
            openingBalance: Number(h.openingBalance),
            closingBalance: h.closingBalance ? Number(h.closingBalance) : null,
            expectedBalance: h.expectedBalance ? Number(h.expectedBalance) : null,
            difference: h.difference ? Number(h.difference) : null,
            cashTotal: h.cashTotal ? Number(h.cashTotal) : null,
            cardTotal: h.cardTotal ? Number(h.cardTotal) : null,
            transferTotal: h.transferTotal ? Number(h.transferTotal) : null,
        }))
    };
}

export async function openCashSession(openingBalance: number) {
    const session = await auth();
    const tenantId = getTenantId(session);
    const userId = (session?.user as any)?.id;

    const targetComplexId = await getActiveComplexOrRedirect();
    if (!targetComplexId) throw new Error("No active complex");

    // Check no open session exists for this complex
    const existing = await prisma.cashSession.findFirst({ where: { tenantId, complexId: targetComplexId, status: "open" } });
    if (existing) throw new Error("Ya hay una caja abierta en este complejo");

    const complex = await prisma.complex.findFirst({ where: { id: targetComplexId } });
    if (!complex) throw new Error("No complex found");

    await prisma.cashSession.create({
        data: {
            tenantId,
            complexId: targetComplexId,
            openedById: userId,
            openingBalance,
        }
    });

    revalidatePath("/dashboard/cash");
}

export async function closeCashSession(closingBalance: number, notes?: string) {
    const session = await auth();
    const tenantId = getTenantId(session);
    const userId = (session?.user as any)?.id;

    const targetComplexId = await getActiveComplexOrRedirect();
    if (!targetComplexId) throw new Error("No active complex");

    const openSession = await prisma.cashSession.findFirst({
        where: { tenantId, complexId: targetComplexId, status: "open" },
        include: {
            sales: { where: { status: "completed" } },
            expenses: true
        }
    });
    if (!openSession) throw new Error("No hay caja abierta");

    const sales = openSession.sales;
    const expensesTotal = openSession.expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const cashTotal = sales.filter(s => s.paymentMethod === "cash").reduce((sum, s) => sum + Number(s.total), 0)
        + sales.filter(s => s.paymentMethod === "mixed").reduce((sum, s) => {
            const details = s.paymentDetails as any;
            return sum + (details?.cash ? Number(details.cash) : 0);
        }, 0);

    const cardTotal = sales.filter(s => s.paymentMethod === "card").reduce((sum, s) => sum + Number(s.total), 0)
        + sales.filter(s => s.paymentMethod === "mixed").reduce((sum, s) => {
            const details = s.paymentDetails as any;
            return sum + (details?.card ? Number(details.card) : 0);
        }, 0);

    const transferTotal = sales.filter(s => s.paymentMethod === "transfer").reduce((sum, s) => sum + Number(s.total), 0)
        + sales.filter(s => s.paymentMethod === "mixed").reduce((sum, s) => {
            const details = s.paymentDetails as any;
            return sum + (details?.transfer ? Number(details.transfer) : 0);
        }, 0);
    const expectedBalance = Number(openSession.openingBalance) + cashTotal - expensesTotal;
    const difference = closingBalance - expectedBalance;

    await prisma.cashSession.update({
        where: { id: openSession.id },
        data: {
            status: "closed",
            closedById: userId,
            closingDate: new Date(),
            closingBalance,
            expectedBalance,
            cashTotal,
            cardTotal,
            transferTotal,
            difference,
            notes,
        }
    });

    revalidatePath("/dashboard/cash");
}

// ── Delete Sale ──

export async function deleteSale(saleId: string) {
    const session = await auth();
    const tenantId = getTenantId(session);
    const userRole = (session?.user as any)?.role;

    if (userRole !== "admin" && userRole !== "super_admin") {
        throw new Error("No tienes permisos para eliminar operaciones");
    }

    const sale = await prisma.sale.findFirst({
        where: { id: saleId, tenantId }
    });
    if (!sale) throw new Error("Venta no encontrada");

    await prisma.$transaction(async (tx) => {
        await tx.saleItem.deleteMany({ where: { saleId } });
        await tx.sale.delete({ where: { id: saleId } });
    });

    revalidatePath("/dashboard/cash");
    revalidatePath("/dashboard");
    return { success: true };
}

// ── Delete Expense ──

export async function deleteExpense(expenseId: string) {
    const session = await auth();
    const tenantId = getTenantId(session);
    const userRole = (session?.user as any)?.role;

    if (userRole !== "admin" && userRole !== "super_admin") {
        throw new Error("No tienes permisos para eliminar gastos");
    }

    const expense = await prisma.expense.findFirst({
        where: { id: expenseId, tenantId }
    });
    if (!expense) throw new Error("Gasto no encontrado");

    await prisma.expense.delete({ where: { id: expenseId } });

    revalidatePath("/dashboard/cash");
    revalidatePath("/dashboard");
    return { success: true };
}
