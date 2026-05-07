import { Client } from 'pg';

async function main() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    await client.connect();

    const reservationId = 'cmoumgqye003104jp92ae4h3n';

    const result = await client.query(`
        SELECT r.*, c.name as court_name
        FROM "Reservation" r
        LEFT JOIN "Court" c ON c.id = r."courtId"
        WHERE r.id = $1
    `, [reservationId]);

    console.log("Reservation data:", result.rows[0]);

    if (result.rows[0]) {
        const tenantId = result.rows[0].tenantId;
        const complexId = result.rows[0].complexId;

        const openSessions = await client.query(`
            SELECT id, status FROM "CashSession" 
            WHERE "tenantId" = $1 AND "complexId" = $2 AND status = 'open'
        `, [tenantId, complexId]);
        console.log("Open cash sessions for this tenant/complex:", openSessions.rows);
    }

    await client.end();
}

main().catch(console.error);
