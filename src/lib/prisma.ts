import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

const connectionString = `${process.env.DATABASE_URL}`;
// In production (Vercel serverless), we limit connections to avoid saturating
// Supabase's session-mode pool. Each lambda gets at most 1 connection.
const pool = new Pool({
    connectionString,
    max: process.env.NODE_ENV === "production" ? 1 : 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
});
const adapter = new PrismaPg(pool as any);

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
