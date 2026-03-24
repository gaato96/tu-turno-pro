import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL || "";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("🌱 Seeding dummy products into existing complexes...");

    const complexes = await prisma.complex.findMany({
        include: { tenant: true }
    });

    if (complexes.length === 0) {
        console.log("❌ No complexes found in DB.");
        return;
    }

    let productsCreatedCount = 0;

    for (const complex of complexes) {
        console.log(`\n🏢 Processing Complex: ${complex.name} (ID: ${complex.id})`);

        // Check if categories exist for this complex
        let catBebidas = await prisma.category.findFirst({ where: { complexId: complex.id, name: "Bebidas" } });
        if (!catBebidas) {
            catBebidas = await prisma.category.create({
                data: { tenantId: complex.tenantId, complexId: complex.id, name: "Bebidas", icon: "coffee" }
            });
        }

        let catSnacks = await prisma.category.findFirst({ where: { complexId: complex.id, name: "Snacks" } });
        if (!catSnacks) {
            catSnacks = await prisma.category.create({
                data: { tenantId: complex.tenantId, complexId: complex.id, name: "Snacks", icon: "cookie" }
            });
        }

        let catDeportivo = await prisma.category.findFirst({ where: { complexId: complex.id, name: "Deportivo" } });
        if (!catDeportivo) {
            catDeportivo = await prisma.category.create({
                data: { tenantId: complex.tenantId, complexId: complex.id, name: "Deportivo", icon: "trophy" }
            });
        }

        // Supplier
        let supplier = await prisma.supplier.findFirst({ where: { complexId: complex.id, name: "Distribuidora Mayorista" } });
        if (!supplier) {
            supplier = await prisma.supplier.create({
                data: { tenantId: complex.tenantId, complexId: complex.id, name: "Distribuidora Mayorista", contact: "Juan Compras", phone: "11223344" }
            });
        }

        // Dummy Products matching those categories
        const dummyProducts = [
            { name: "Agua Mineral 500ml", catId: catBebidas.id, cost: 300, sale: 800, stock: 48, trackStock: true },
            { name: "Gatorade 500ml", catId: catBebidas.id, cost: 600, sale: 1500, stock: 24, trackStock: true },
            { name: "Coca-Cola 500ml", catId: catBebidas.id, cost: 500, sale: 1200, stock: 36, trackStock: true },
            { name: "Cerveza 473ml", catId: catBebidas.id, cost: 700, sale: 1800, stock: 48, trackStock: true },
            { name: "Papas Fritas Lays", catId: catSnacks.id, cost: 400, sale: 1000, stock: 20, trackStock: true },
            { name: "Hamburguesa Simple", catId: catSnacks.id, cost: 1200, sale: 3500, stock: 15, trackStock: true },
            { name: "Pancho", catId: catSnacks.id, cost: 500, sale: 1500, stock: 20, trackStock: true },
            { name: "Alquiler Paletas Pádel", catId: catDeportivo.id, cost: 0, sale: 3000, stock: 6, trackStock: false },
            { name: "Tubo Pelotas Pádel x3", catId: catDeportivo.id, cost: 2000, sale: 4500, stock: 10, trackStock: true },
        ];

        for (const p of dummyProducts) {
            const exists = await prisma.product.findFirst({
                where: { complexId: complex.id, name: p.name }
            });
            if (!exists) {
                await prisma.product.create({
                    data: {
                        tenantId: complex.tenantId,
                        complexId: complex.id,
                        categoryId: p.catId,
                        supplierId: supplier.id,
                        name: p.name,
                        costPrice: p.cost,
                        salePrice: p.sale,
                        stock: p.stock,
                        trackStock: p.trackStock
                    }
                });
                productsCreatedCount++;
            }
        }
        console.log(`   ✅ Products processed for ${complex.name}`);
    }

    console.log(`\n🎉 Done! Created ${productsCreatedCount} dummy products across all complexes.`);
}

main()
    .catch(e => {
        console.error("Error seeding products:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
