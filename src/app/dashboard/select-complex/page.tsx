import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import SelectComplexClient from "./select-complex-client";
import { ThemeProvider } from "@/components/theme-provider";

export const dynamic = "force-dynamic";

export default async function SelectComplexPage() {
    const session = await auth();
    const tenantId = session?.user?.tenantId;
    const userRole = (session?.user as any)?.role;

    if (!tenantId) {
        redirect("/login");
    }

    // Only admins need to see this screen. Staff should have been auto-routed.
    if (userRole === "staff") {
        redirect("/dashboard");
    }

    // Fetch all complexes for this tenant
    const complexes = await prisma.complex.findMany({
        where: { tenantId, isActive: true },
        include: { _count: { select: { courts: true } } },
        orderBy: { name: "asc" }
    });

    if (complexes.length === 0) {
        return (
            <div className="flex h-screen items-center justify-center bg-muted/20">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">No tienes complejos creados.</h2>
                    <p className="text-muted-foreground">Por favor, contacta con soporte técnico para inicializar un complejo.</p>
                </div>
            </div>
        );
    }

    // Pass data to client component
    const formattedComplexes = complexes.map(c => ({
        id: c.id,
        name: c.name,
        address: c.address,
        courtCount: c._count.courts,
    }));

    return (
        <ThemeProvider>
            <SelectComplexClient complexes={formattedComplexes} tenantName={session.user?.tenantName || "Tu Turno Pro"} />
        </ThemeProvider>
    );
}
