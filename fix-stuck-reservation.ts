import { Client } from 'pg';

async function main() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    await client.connect();

    // Find reservations marked as paid or finished but with no valid sales to back up their paidAmount
    const result = await client.query(`
        SELECT r.id, r."customerName", r."paidAmount"
        FROM "Reservation" r
        LEFT JOIN "Sale" s ON s."reservationId" = r.id AND s.status != 'cancelled'
        WHERE r.status IN ('paid', 'finished')
        AND r."paidAmount" > 0
        GROUP BY r.id
        HAVING COALESCE(SUM(s.total), 0) < r."paidAmount"
    `);

    console.log("Found stuck reservations:", result.rows);

    let fixedCount = 0;
    for (const row of result.rows) {
        await client.query(`
            UPDATE "Reservation"
            SET "paidAmount" = 0, status = 'confirmed'
            WHERE id = $1
        `, [row.id]);
        console.log(`✅ Reset stuck reservation for ${row.customerName} (Previous paidAmount: ${row.paidAmount})`);
        fixedCount++;
    }

    console.log(`Total fixed: ${fixedCount}`);
    await client.end();
}

main().catch(console.error);
