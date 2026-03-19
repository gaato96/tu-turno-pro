"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Search, Pencil, Trash2, Users, MoreHorizontal } from "lucide-react";
import { toggleTenantStatus, deleteTenant } from "./actions";
import { toast } from "sonner";
import { EditTenantDialog } from "./edit-tenant-dialog";
import { ManageUsersDialog } from "./manage-users-dialog";

interface Tenant {
    id: string;
    name: string;
    slug: string;
    phone: string | null;
    plan: string;
    calculatedPlan: string;
    planStatus: string;
    modules: string[];
    isActive: boolean;
    complexes: number;
    users: number;
    totalCourts: number;
    mrr: number;
    createdAt: string;
}

const planConfig: Record<string, { label: string; color: string }> = {
    free: { label: "Free", color: "bg-gray-100 text-gray-700" },
    starter: { label: "Starter", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400" },
    pro: { label: "Pro", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" },
    enterprise: { label: "Enterprise", color: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400" },
};

export function AdminTenantsClient({ initialTenants }: { initialTenants: Tenant[] }) {
    const [search, setSearch] = useState("");
    const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
    const [managingUsersTenant, setManagingUsersTenant] = useState<Tenant | null>(null);

    const filtered = initialTenants.filter((t) =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.slug.toLowerCase().includes(search.toLowerCase())
    );

    const handleToggleStatus = async (id: string, currentlyActive: boolean) => {
        try {
            await toggleTenantStatus(id, !currentlyActive);
            toast.success(`Negocio ${currentlyActive ? 'desactivado' : 'activado'}`);
        } catch {
            toast.error("Error al actualizar estado");
        }
    };

    const handleDelete = async (tenant: Tenant) => {
        if (!confirm(`¿Eliminar "${tenant.name}" y todos sus datos? Esta acción no se puede deshacer.`)) return;
        try {
            await deleteTenant(tenant.id);
            toast.success("Negocio eliminado");
        } catch {
            toast.error("Error al eliminar negocio");
        }
    };

    return (
        <>
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar negocios..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 rounded-xl"
                />
            </div>

            <Card className="card-elevated border-border/50 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Negocio</TableHead>
                            <TableHead>Plan</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-center">Sedes</TableHead>
                            <TableHead className="text-center">Canchas</TableHead>
                            <TableHead className="text-center">Usuarios</TableHead>
                            <TableHead className="text-right">MRR</TableHead>
                            <TableHead className="text-center">Activo</TableHead>
                            <TableHead className="text-center">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.map((t) => (
                            <TableRow key={t.id}>
                                <TableCell>
                                    <div>
                                        <p className="font-semibold">{t.name}</p>
                                        <p className="text-xs text-muted-foreground">{t.slug}</p>
                                        {t.phone && <p className="text-xs text-muted-foreground">{t.phone}</p>}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge className={`rounded-full ${planConfig[t.plan]?.color || "bg-gray-100"}`}>
                                        {planConfig[t.plan]?.label || t.plan}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge className={`rounded-full ${t.planStatus === "active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"}`}>
                                        {t.planStatus === "active" ? "Activo" : "Vencido"}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-center">{t.complexes}</TableCell>
                                <TableCell className="text-center font-semibold">{t.totalCourts}</TableCell>
                                <TableCell className="text-center">{t.users}</TableCell>
                                <TableCell className="text-right font-semibold">${t.mrr.toLocaleString()}</TableCell>
                                <TableCell className="text-center">
                                    <Switch
                                        checked={t.isActive}
                                        onCheckedChange={() => handleToggleStatus(t.id, t.isActive)}
                                    />
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center justify-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            title="Editar negocio"
                                            onClick={() => setEditingTenant(t)}
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            title="Gestionar usuarios"
                                            onClick={() => setManagingUsersTenant(t)}
                                        >
                                            <Users className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                            title="Eliminar negocio"
                                            onClick={() => handleDelete(t)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {filtered.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                                    No se encontraron negocios
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Edit Dialog */}
            {editingTenant && (
                <EditTenantDialog
                    tenant={editingTenant}
                    onClose={() => setEditingTenant(null)}
                />
            )}

            {/* Manage Users Dialog */}
            {managingUsersTenant && (
                <ManageUsersDialog
                    tenantId={managingUsersTenant.id}
                    tenantName={managingUsersTenant.name}
                    onClose={() => setManagingUsersTenant(null)}
                />
            )}
        </>
    );
}
