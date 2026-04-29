
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const openSession = await prisma.cashSession.findFirst({ where: { status: 'open' } });

    // Buscar todos los eventos cuyo createdAt es de las ultimas 48 horas o cuyo inicio es el 28 de abril en adelante
    const recentEvents = await prisma.event.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
            payments: true,
            sales: true
        }
    });

    console.log("=== ESTADO DE LA CAJA ABIERTA ===");
    console.log("Caja abierta ID:", openSession ? openSession.id : "NO HAY CAJA ABIERTA");
    if (openSession) {
        const salesInCaja = await prisma.sale.findMany({ where: { cashSessionId: openSession.id, eventId: { not: null } } });
        console.log("Sales (Tickets) vinculados a eventos en esta caja abierta:", salesInCaja.length);
    }

    console.log("\n=== ÚLTIMOS 10 EVENTOS ===");
    recentEvents.forEach(e => {
        console.log(`- Evento "${e.name}" (ID: ${e.id}) Creado: ${e.createdAt.toISOString()}`);
        console.log(`  Monto Total: ${e.totalAmount}, Pagado: ${e.paidAmount}`);
        console.log(`  -> Payments (Pagos): ${e.payments.length}`);
        e.payments.forEach(p => console.log(`     - [${p.concept}] ${p.amount} via ${p.paymentMethod} (cashSessionId: ${p.cashSessionId}) Creado: ${p.createdAt.toISOString()}`));
        console.log(`  -> Sales (Tickets de venta): ${e.sales.length}`);
        e.sales.forEach(s => console.log(`     - [Sale ${s.id}] ${s.subtotal} (cashSessionId: ${s.cashSessionId})`));
    });
}

check().catch(console.error).finally(() => prisma.$disconnect());
