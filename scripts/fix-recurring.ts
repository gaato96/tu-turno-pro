import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const fixedTurns = await prisma.reservation.updateMany({
        where: { isRecurring: true, status: 'pending' },
        data: { status: 'confirmed' }
    });
    console.log(`Updated ${fixedTurns.count} recurring reservations to confirmed.`);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
