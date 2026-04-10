/**
 * Seed script: Creates sample categories and products for testing.
 * 
 * Usage:  npx tsx scripts/seed-products.ts
 * 
 * It will find the first tenant + complex and create products there.
 */

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

const CATEGORIES = [
    { name: "Bebidas", icon: "wine" },
    { name: "Snacks", icon: "cookie" },
    { name: "Indumentaria", icon: "shirt" },
];

const PRODUCTS: { category: string; name: string; cost: number; sale: number; stock: number }[] = [
    // Bebidas
    { category: "Bebidas", name: "Agua Mineral 500ml", cost: 300, sale: 800, stock: 48 },
    { category: "Bebidas", name: "Gatorade 500ml", cost: 600, sale: 1500, stock: 24 },
    { category: "Bebidas", name: "Coca-Cola 500ml", cost: 500, sale: 1200, stock: 36 },
    { category: "Bebidas", name: "Coca-Cola 1.5L", cost: 800, sale: 2000, stock: 12 },
    { category: "Bebidas", name: "Cerveza Quilmes 473ml", cost: 700, sale: 1800, stock: 48 },
    { category: "Bebidas", name: "Cerveza Brahma 473ml", cost: 600, sale: 1500, stock: 24 },
    { category: "Bebidas", name: "Fernet Branca (medida)", cost: 500, sale: 2000, stock: 20 },
    { category: "Bebidas", name: "Powerade 500ml", cost: 550, sale: 1400, stock: 18 },
    // Snacks
    { category: "Snacks", name: "Papas Lays Clásicas", cost: 400, sale: 1000, stock: 30 },
    { category: "Snacks", name: "Alfajor Havanna", cost: 350, sale: 900, stock: 24 },
    { category: "Snacks", name: "Barrita de Cereal", cost: 250, sale: 700, stock: 20 },
    { category: "Snacks", name: "Maní Salado 100g", cost: 300, sale: 800, stock: 15 },
    { category: "Snacks", name: "Sandwich de Miga x4", cost: 800, sale: 2500, stock: 10 },
    // Indumentaria
    { category: "Indumentaria", name: "Pechera Entrenamiento", cost: 1500, sale: 3000, stock: 20 },
    { category: "Indumentaria", name: "Pelota Fútbol 5", cost: 8000, sale: 15000, stock: 5 },
];

async function main() {
    // Find first tenant and complex
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
        console.error("❌ No hay tenants en la base. Ejecutá el seed principal primero.");
        process.exit(1);
    }

    const complex = await prisma.complex.findFirst({ where: { tenantId: tenant.id, isActive: true } });
    if (!complex) {
        console.error("❌ No hay complejos activos para el tenant:", tenant.name);
        process.exit(1);
    }

    console.log(`🏟️  Tenant: ${tenant.name} | Complejo: ${complex.name}`);

    // Create categories
    const catMap: Record<string, string> = {};
    for (const cat of CATEGORIES) {
        const existing = await prisma.category.findFirst({
            where: { tenantId: tenant.id, complexId: complex.id, name: cat.name }
        });
        if (existing) {
            catMap[cat.name] = existing.id;
            console.log(`  ✓ Categoría ya existe: ${cat.name}`);
        } else {
            const created = await prisma.category.create({
                data: { tenantId: tenant.id, complexId: complex.id, name: cat.name, icon: cat.icon }
            });
            catMap[cat.name] = created.id;
            console.log(`  + Categoría creada: ${cat.name}`);
        }
    }

    // Create products
    let created = 0, skipped = 0;
    for (const p of PRODUCTS) {
        const existing = await prisma.product.findFirst({
            where: { tenantId: tenant.id, complexId: complex.id, name: p.name }
        });
        if (existing) {
            skipped++;
            continue;
        }
        await prisma.product.create({
            data: {
                tenantId: tenant.id,
                complexId: complex.id,
                categoryId: catMap[p.category],
                name: p.name,
                costPrice: p.cost,
                salePrice: p.sale,
                stock: p.stock,
                minStock: 5,
                trackStock: true,
            }
        });
        created++;
    }

    console.log(`\n✅ Productos: ${created} creados, ${skipped} ya existían.`);
    console.log("Listo! Podés ver los productos en /dashboard/products");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
