import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
    console.log("Adding default products to all tenants...");
    const tenants = await prisma.tenant.findMany();
    
    for (const tenant of tenants) {
        // Check if tenant already has categories
        const existingCats = await prisma.category.count({ where: { tenantId: tenant.id } });
        if (existingCats > 0) {
            console.log(`Tenant ${tenant.name} already has categories, skipping...`);
            continue;
        }

        const catBebidas = await prisma.category.create({
            data: { tenantId: tenant.id, name: "Bebidas", icon: "coffee" },
        });
        const catSnacks = await prisma.category.create({
            data: { tenantId: tenant.id, name: "Snacks", icon: "cookie" },
        });
        const catDeportivo = await prisma.category.create({
            data: { tenantId: tenant.id, name: "Deportivo", icon: "trophy" },
        });

        await Promise.all([
            prisma.product.create({ data: { tenantId: tenant.id, categoryId: catBebidas.id, name: "Agua 500ml", costPrice: 300, salePrice: 800, stock: 48 } }),
            prisma.product.create({ data: { tenantId: tenant.id, categoryId: catBebidas.id, name: "Gatorade 500ml", costPrice: 600, salePrice: 1500, stock: 24 } }),
            prisma.product.create({ data: { tenantId: tenant.id, categoryId: catBebidas.id, name: "Coca-Cola 500ml", costPrice: 500, salePrice: 1200, stock: 36 } }),
            prisma.product.create({ data: { tenantId: tenant.id, categoryId: catSnacks.id, name: "Papas Fritas", costPrice: 400, salePrice: 1000, stock: 20 } }),
            prisma.product.create({ data: { tenantId: tenant.id, categoryId: catSnacks.id, name: "Hamburguesa", costPrice: 1200, salePrice: 3500, stock: 15 } }),
            prisma.product.create({ data: { tenantId: tenant.id, categoryId: catDeportivo.id, name: "Alquiler Paletas Pádel", costPrice: 0, salePrice: 3000, stock: 6, trackStock: false } }),
            prisma.product.create({ data: { tenantId: tenant.id, categoryId: catDeportivo.id, name: "Pelotas Pádel x3", costPrice: 2000, salePrice: 4500, stock: 10 } }),
        ]);

        console.log(`Added products for tenant ${tenant.name}`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
