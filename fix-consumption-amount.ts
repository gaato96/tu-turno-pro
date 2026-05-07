import { Client } from 'pg';

async function main() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    await client.connect();

    // Find reservations where consumptionAmount doesn't match the sum of on_tab sales
    const result = await client.query(`
        SELECT 
            r.id, 
            r."customerName", 
            r."consumptionAmount",
            r."courtAmount",
            r.discount,
            COALESCE(SUM(s.total), 0) AS actual_consumption
        FROM "Reservation" r
        LEFT JOIN "Sale" s ON s."reservationId" = r.id AND s.status = 'on_tab'
        GROUP BY r.id, r."customerName", r."consumptionAmount", r."courtAmount", r.discount
        HAVING COALESCE(SUM(s.total), 0) != r."consumptionAmount"
          AND r."consumptionAmount" > 0
    `);

    console.log("Found inconsistent reservations:", result.rows);

    let fixedCount = 0;
    for (const row of result.rows) {
        const newConsumption = Number(row.actual_consumption);
        const newTotal = Number(row.courtAmount) + newConsumption - Number(row.discount);

        await client.query(`
            UPDATE "Reservation"
            SET 
                "consumptionAmount" = $1,
                "totalAmount" = $2
            WHERE id = $3
        `, [newConsumption, newTotal, row.id]);

        console.log(`✅ Fixed reservation ${row.customerName} (id: ${row.id})`);
        console.log(`   consumptionAmount: ${row.consumptionAmount} → ${newConsumption}`);
        console.log(`   new totalAmount: ${newTotal}`);
        fixedCount++;
    }

    console.log(`\nTotal fixed: ${fixedCount}`);
    await client.end();
}

main().catch(console.error);
