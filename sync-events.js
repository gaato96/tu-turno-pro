
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function sync() {
    const today = new Date('2026-04-28T00:00:00');

    // 1. Get all events from today with payments but no Sale linked to a session
    console.log("Checking events from today...");
    const events = await prisma.event.findMany({
        where: { createdAt: { gte: today } },
        include: { payments: true }
    });

    for (const event of events) {
        if (event.paidAmount > 0) {
            // Find the open session for this complex
            const session = await prisma.cashSession.findFirst({
                where: { complexId: event.complexId, status: 'open' }
            });

            if (session) {
                console.log(`Found open session ${session.id} for event ${event.name}`);

                // Link all payments of this event to this session if they don't have one
                await prisma.payment.updateMany({
                    where: { eventId: event.id, cashSessionId: null },
                    data: { cashSessionId: session.id }
                });

                // Check if there's a Sale for this event
                const existingSale = await prisma.sale.findFirst({
                    where: { eventId: event.id }
                });

                if (!existingSale) {
                    console.log(`Creating missing Sale for event ${event.name}`);
                    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
                    const count = await prisma.sale.count();
                    await prisma.sale.create({
                        data: {
                            tenantId: event.tenantId,
                            eventId: event.id,
                            cashSessionId: session.id,
                            invoiceNumber: `E${dateStr}-${(count + 1).toString().padStart(4, "0")}`,
                            subtotal: event.paidAmount,
                            total: event.paidAmount,
                            status: "completed",
                            paymentMethod: "cash", // Assuming cash for recovery or first payment method
                        }
                    });
                } else if (existingSale.cashSessionId === null) {
                    console.log(`Updating session for existing Sale ${existingSale.id}`);
                    await prisma.sale.update({
                        where: { id: existingSale.id },
                        data: { cashSessionId: session.id }
                    });
                }
            } else {
                console.log(`No open session found for complex ${event.complexId} (Event: ${event.name})`);
            }
        }
    }
}

sync().catch(console.error).finally(() => prisma.$disconnect());
