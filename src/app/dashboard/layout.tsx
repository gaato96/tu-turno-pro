import { Sidebar } from "@/components/sidebar";
import { getActiveComplexOrRedirect } from "@/lib/active-complex";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();
    const userRole = (session?.user as any)?.role;

    // Fetch active complex and tenant modules
    const activeComplexId = await getActiveComplexOrRedirect();
    let activeComplexName = undefined;
    let tenantModules: string[] = ["reservations"];

    const tenantId = (session?.user as any)?.tenantId;
    if (tenantId) {
        const tenantInfo = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { modules: true }
        });
        if (tenantInfo) {
            tenantModules = tenantInfo.modules;
        }
    }

    if (activeComplexId) {
        const complex = await prisma.complex.findUnique({
            where: { id: activeComplexId },
            select: { name: true }
        });
        if (complex) {
            activeComplexName = complex.name;
        }
    }

    return (
        <div className="flex min-h-screen">
            <Sidebar activeComplexName={activeComplexName} userRoleProp={userRole} activeModules={tenantModules} />
            <main className="flex-1 lg:pl-0">
                <div className="p-4 lg:p-8 pt-16 lg:pt-8 max-w-[1600px] mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
