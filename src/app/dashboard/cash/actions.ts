"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

function getTenantId(session: any): string {
    const tid = session?.user?.tenantId;
    if (!tid) throw new Error("Unauthorized");
    return tid;
}

export async function getCashData() {
    const session = await auth();
    const tenantId = getTenantId(session);

    const openSession = await prisma.cashSession.findFirst({
        where: { tenantId, status: "open" },
        include: {
            openedBy: { select: { name: true } },
            sales: {
                where: { status: { not: "cancelled" } },
                include: { items: true }
            }
        }
    });

    const history = await prisma.cashSession.findMany({
        where: { tenantId, status: "closed" },
        include: { openedBy: { select: { name: true } }, closedBy: { select: { name: true } } },
        orderBy: { closingDate: "desc" },
        take: 10
    });

    if (openSession) {
        // Calculate X Report data
        const sales = openSession.sales.filter(s => s.status === "completed");
        const cashTotal = sales.filter(s => s.paymentMethod === "cash").reduce((sum, s) => sum + Number(s.total), 0);
        const cardTotal = sales.filter(s => s.paymentMethod === "card").reduce((sum, s) => sum + Number(s.total), 0);
        const transferTotal = sales.filter(s => s.paymentMethod === "transfer").reduce((sum, s) => sum + Number(s.total), 0);
        const salesTotal = cashTotal + cardTotal + transferTotal;
        const expectedBalance = Number(openSession.openingBalance) + cashTotal;

        return {
            openSession: {
                ...openSession,
                openingBalance: Number(openSession.openingBalance),
                salesCount: sales.length,
                cashTotal,
                cardTotal,
                transferTotal,
                salesTotal,
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

    // Check no open session exists
    const existing = await prisma.cashSession.findFirst({ where: { tenantId, status: "open" } });
    if (existing) throw new Error("Ya hay una caja abierta");

    const complex = await prisma.complex.findFirst({ where: { tenantId } });
    if (!complex) throw new Error("No complex found");

    await prisma.cashSession.create({
        data: {
            tenantId,
            complexId: complex.id,
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

    const openSession = await prisma.cashSession.findFirst({
        where: { tenantId, status: "open" },
        include: { sales: { where: { status: "completed" } } }
    });
    if (!openSession) throw new Error("No hay caja abierta");

    const sales = openSession.sales;
    const cashTotal = sales.filter(s => s.paymentMethod === "cash").reduce((sum, s) => sum + Number(s.total), 0);
    const cardTotal = sales.filter(s => s.paymentMethod === "card").reduce((sum, s) => sum + Number(s.total), 0);
    const transferTotal = sales.filter(s => s.paymentMethod === "transfer").reduce((sum, s) => sum + Number(s.total), 0);
    const expectedBalance = Number(openSession.openingBalance) + cashTotal;
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
