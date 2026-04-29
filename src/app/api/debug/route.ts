import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
    const openSession = await prisma.cashSession.findFirst({ where: { status: 'open' } });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const paymentsToday = await prisma.payment.findMany({
        where: { createdAt: { gte: today } }
    });

    const salesToday = await prisma.sale.findMany({
        where: { createdAt: { gte: today }, eventId: { not: null } }
    });

    const recentEvents = await prisma.event.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { payments: true }
    });

    return NextResponse.json({
        openSessionId: openSession?.id,
        allPaymentsToday: paymentsToday,
        eventSalesToday: salesToday,
        recentEvents: recentEvents.map(e => ({ name: e.name, depositPaid: e.depositPaid, paidAmount: e.paidAmount, payments: e.payments }))
    });
}
