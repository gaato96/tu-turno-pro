import { Card } from "@/components/ui/card";
import {
    Building2,
    Users,
    DollarSign,
} from "lucide-react";
import { getTenantsInfo } from "./actions";
import { AdminTenantsClient } from "./client-page";
import { CreateTenantDialog } from "./create-tenant-dialog";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminTenantsPage() {
    const tenants = await getTenantsInfo();

    const totalMRR = tenants.reduce((sum, t) => sum + t.mrr, 0);
    const activeCount = tenants.filter((t) => t.isActive).length;
    const totalCourts = tenants.reduce((sum, t) => sum + t.totalCourts, 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gestión de Negocios</h1>
                    <p className="text-muted-foreground mt-1">Panel de Super Administrador</p>
                </div>
                <CreateTenantDialog />
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Card className="p-4 card-elevated flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{tenants.length}</p>
                        <p className="text-xs text-muted-foreground">Negocios ({activeCount} activos)</p>
                    </div>
                </Card>
                <Card className="p-4 card-elevated flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{tenants.reduce((s, t) => s + t.users, 0)}</p>
                        <p className="text-xs text-muted-foreground">Usuarios totales</p>
                    </div>
                </Card>
                <Card className="p-4 card-elevated flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-500/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{totalCourts}</p>
                        <p className="text-xs text-muted-foreground">Canchas totales</p>
                    </div>
                </Card>
                <Card className="p-4 card-elevated flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">${totalMRR.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">MRR (Ingresos mensuales)</p>
                    </div>
                </Card>
            </div>

            <AdminTenantsClient initialTenants={tenants} />
        </div>
    );
}
