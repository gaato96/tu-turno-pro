import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
    console.log("Forcing product creation for all tenants...");
    const tenants = await prisma.tenant.findMany();
    
    for (const tenant of tenants) {
        console.log(`Processing tenant: ${tenant.name} (${tenant.id})`);
        
        let catBebidas = await prisma.category.findFirst({ where: { tenantId: tenant.id, name: "Bebidas" } });
        if (!catBebidas) {
            catBebidas = await prisma.category.create({
                data: { tenantId: tenant.id, name: "Bebidas", icon: "coffee" },
            });
        }
        
        let catSnacks = await prisma.category.findFirst({ where: { tenantId: tenant.id, name: "Snacks" } });
        if (!catSnacks) {
            catSnacks = await prisma.category.create({
                data: { tenantId: tenant.id, name: "Snacks", icon: "cookie" },
            });
        }

        const products = [
            { name: "Agua 500ml", costPrice: 300, salePrice: 800, stock: 50, categoryId: catBebidas.id },
            { name: "Gatorade", costPrice: 700, salePrice: 1800, stock: 20, categoryId: catBebidas.id },
            { name: "Coca-Cola", costPrice: 600, salePrice: 1500, stock: 30, categoryId: catBebidas.id },
            { name: "Papas Fritas", costPrice: 400, salePrice: 1200, stock: 15, categoryId: catSnacks.id },
        ];

        for (const p of products) {
            const existing = await prisma.product.findFirst({
                where: { tenantId: tenant.id, name: p.name }
            });
            
            if (!existing) {
                await prisma.product.create({
                    data: {
                        tenantId: tenant.id,
                        categoryId: p.categoryId,
                        name: p.name,
                        costPrice: p.costPrice,
                        salePrice: p.salePrice,
                        stock: p.stock
                    }
                });
                console.log(`  - Created ${p.name}`);
            } else {
                console.log(`  - Product ${p.name} already exists, skipping.`);
            }
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
