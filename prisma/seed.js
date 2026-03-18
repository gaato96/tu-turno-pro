require("dotenv").config();
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("🌱 Seeding database...");

    const hashedPassword = await bcrypt.hash("admin123", 12);
    const superAdmin = await prisma.user.upsert({
        where: { email: "admin@tuturno.pro" },
        update: {},
        create: {
            email: "admin@tuturno.pro",
            name: "Super Admin",
            hashedPassword,
            role: "super_admin",
        },
    });
    console.log("✅ SuperAdmin created:", superAdmin.email);

    const tenant = await prisma.tenant.upsert({
        where: { slug: "demo-complex" },
        update: {},
        create: {
            name: "Complejo Demo",
            slug: "demo-complex",
            modules: ["reservations", "inventory", "reports", "pos"],
            plan: "pro",
        },
    });
    console.log("✅ Tenant created:", tenant.name);

    const adminPassword = await bcrypt.hash("demo123", 12);
    const adminUser = await prisma.user.upsert({
        where: { email: "demo@tuturno.pro" },
        update: {},
        create: {
            email: "demo@tuturno.pro",
            name: "Admin Demo",
            hashedPassword: adminPassword,
            role: "admin",
            tenantId: tenant.id,
        },
    });
    console.log("✅ Admin user created:", adminUser.email);

    const complex = await prisma.complex.create({
        data: {
            tenantId: tenant.id,
            name: "Complejo El Césped",
            address: "Av. Siempre Viva 742",
            phone: "+54 11 1234-5678",
            openingTime: "08:00",
            closingTime: "23:00",
            sportTypes: ["futbol", "padel", "tenis"],
        },
    });
    console.log("✅ Complex created:", complex.name);

    const futbolCompleta = await prisma.court.create({
        data: {
            complexId: complex.id,
            name: "Cancha Fútbol 11",
            sportType: "futbol",
            dayRate: 25000,
            nightRate: 35000,
            nightRateStartTime: "19:00",
            displayOrder: 0,
        },
    });

    const futbol5a = await prisma.court.create({
        data: {
            complexId: complex.id,
            name: "Cancha Fútbol 5 (A)",
            sportType: "futbol",
            dayRate: 15000,
            nightRate: 20000,
            nightRateStartTime: "19:00",
            parentCourtId: futbolCompleta.id,
            displayOrder: 1,
        },
    });

    const futbol5b = await prisma.court.create({
        data: {
            complexId: complex.id,
            name: "Cancha Fútbol 5 (B)",
            sportType: "futbol",
            dayRate: 15000,
            nightRate: 20000,
            nightRateStartTime: "19:00",
            parentCourtId: futbolCompleta.id,
            displayOrder: 2,
        },
    });

    const padel1 = await prisma.court.create({
        data: { complexId: complex.id, name: "Pádel 1", sportType: "padel", dayRate: 12000, nightRate: 18000, nightRateStartTime: "19:00", displayOrder: 3 },
    });
    const padel2 = await prisma.court.create({
        data: { complexId: complex.id, name: "Pádel 2", sportType: "padel", dayRate: 12000, nightRate: 18000, nightRateStartTime: "19:00", displayOrder: 4 },
    });
    const tenis = await prisma.court.create({
        data: { complexId: complex.id, name: "Tenis 1", sportType: "tenis", dayRate: 18000, nightRate: 25000, nightRateStartTime: "19:00", displayOrder: 5 },
    });

    console.log("✅ Courts created");

    const catBebidas = await prisma.category.create({ data: { tenantId: tenant.id, name: "Bebidas", icon: "coffee" } });
    const catSnacks = await prisma.category.create({ data: { tenantId: tenant.id, name: "Snacks", icon: "cookie" } });
    const catDeportivo = await prisma.category.create({ data: { tenantId: tenant.id, name: "Deportivo", icon: "trophy" } });

    await Promise.all([
        prisma.product.create({ data: { tenantId: tenant.id, categoryId: catBebidas.id, name: "Agua 500ml", costPrice: 300, salePrice: 800, stock: 48 } }),
        prisma.product.create({ data: { tenantId: tenant.id, categoryId: catBebidas.id, name: "Gatorade", costPrice: 600, salePrice: 1500, stock: 24 } }),
        prisma.product.create({ data: { tenantId: tenant.id, categoryId: catSnacks.id, name: "Papas", costPrice: 400, salePrice: 1000, stock: 20 } }),
        prisma.product.create({ data: { tenantId: tenant.id, categoryId: catDeportivo.id, name: "Alquiler Paletas", costPrice: 0, salePrice: 3000, stock: 6, trackStock: false } }),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await Promise.all([
        prisma.reservation.create({
            data: {
                tenantId: tenant.id, complexId: complex.id, courtId: padel1.id, customerName: "Juan Pérez", customerPhone: "+54 11 5555-1234",
                date: today, startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0),
                endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 30), status: "confirmed", source: "backoffice", courtAmount: 12000, totalAmount: 12000,
            },
        }),
        prisma.reservation.create({
            data: {
                tenantId: tenant.id, complexId: complex.id, courtId: futbol5a.id, customerName: "Gastón Rodríguez", customerPhone: "+54 11 5555-5678",
                date: today, startTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 0),
                endTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 17, 0), status: "in_game", source: "backoffice", courtAmount: 15000, totalAmount: 15000,
            },
        }),
    ]);

    console.log("🎉 Seed completed!");
}

main()
    .catch((e) => {
        console.error("🔥 SEED ERROR IS:", e.message);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
