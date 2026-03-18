import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    CreditCard,
    DollarSign,
    TrendingUp,
    CheckCircle,
    AlertCircle,
    XCircle,
} from "lucide-react";
import { getSubscriptionsInfo } from "./actions";

const statusStyles: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    active: { label: "Activa", icon: CheckCircle, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" },
    past_due: { label: "Vencida", icon: AlertCircle, color: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400" },
    cancelled: { label: "Cancelada", icon: XCircle, color: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400" },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminSubscriptionsPage() {
    const subscriptions = await getSubscriptionsInfo();

    const mrr = subscriptions.filter((s) => s.status === "active").reduce((sum, s) => sum + s.amount, 0);
    const activeCount = subscriptions.filter((s) => s.status === "active").length;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Suscripciones</h1>
                <p className="text-muted-foreground mt-1">Gestión de planes y facturación</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="p-4 card-elevated flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">${mrr.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">MRR Activo</p>
                    </div>
                </Card>
                <Card className="p-4 card-elevated flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{activeCount}</p>
                        <p className="text-xs text-muted-foreground">Suscripciones activas</p>
                    </div>
                </Card>
                <Card className="p-4 card-elevated flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">${(mrr * 12).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">ARR Proyectado</p>
                    </div>
                </Card>
            </div>

            <Card className="card-elevated border-border/50 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Inquilino</TableHead>
                            <TableHead>Plan</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Monto</TableHead>
                            <TableHead>Próx. Facturación</TableHead>
                            <TableHead>Desde</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {subscriptions.map((s) => {
                            const statusCfg = statusStyles[s.status] || statusStyles.active;
                            return (
                                <TableRow key={s.id}>
                                    <TableCell className="font-semibold">{s.tenant}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="rounded-full capitalize">{s.plan}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={`rounded-full ${statusCfg.color}`}>
                                            <statusCfg.icon className="w-3 h-3 mr-1" />
                                            {statusCfg.label}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-semibold">${s.amount.toLocaleString()}/mes</TableCell>
                                    <TableCell className="text-muted-foreground">{s.nextBilling}</TableCell>
                                    <TableCell className="text-muted-foreground">{s.since}</TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
