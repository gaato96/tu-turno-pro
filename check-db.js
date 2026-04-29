
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const openSession = await prisma.cashSession.findFirst({ where: { status: 'open' } });
    const today = new Date('2026-04-28T00:00:00');

    const events = await prisma.event.findMany({
        where: { createdAt: { gte: today } },
        include: { sales: true, payments: true }
    });

    console.log(JSON.stringify({
        openSession: openSession ? { id: openSession.id, status: openSession.status } : 'none',
        eventsToday: events.map(e => ({
            id: e.id,
            name: e.name,
            createdAt: e.createdAt,
            depositPaid: e.depositPaid,
            paidAmount: e.paidAmount,
            salesCount: e.sales.length,
            paymentsCount: e.payments.length,
            saleCashSessionIds: e.sales.map(s => s.cashSessionId)
        }))
    }, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
