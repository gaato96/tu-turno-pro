import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function check() {
    console.log("Checking pending reservations and next turns...");

    const pending = await prisma.reservation.findMany({
        where: { status: "pending" },
        include: { court: true }
    });
    console.log("ALL PENDING IN DB:", pending.length);
    pending.forEach(p => console.log(`  - ${p.customerName} on ${p.date.toISOString()} (source: ${p.source})`));

    const todayDateLocal = "2026-03-24";
    const startOfDay = new Date(todayDateLocal + "T00:00:00-03:00");
    const endOfDay = new Date(todayDateLocal + "T23:59:59.999-03:00");

    console.log("\nStart:", startOfDay.toISOString());
    console.log("End:", endOfDay.toISOString());

    const confirmed = await prisma.reservation.findMany({
        where: { status: "confirmed", date: { gte: startOfDay, lte: endOfDay } }
    });
    console.log("\nALL CONFIRMED FOR TODAY:", confirmed.length);
    confirmed.forEach(c => console.log(`  - ${c.customerName} at ${c.startTime.toISOString()}`));

}

check()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
