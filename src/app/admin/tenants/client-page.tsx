"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Search } from "lucide-react";
import { toggleTenantStatus } from "./actions";
import { toast } from "sonner";
import { CreateTenantDialog } from "./create-tenant-dialog";

interface Tenant {
    id: string;
    name: string;
    slug: string;
    plan: string;
    planStatus: string;
    modules: string[];
    isActive: boolean;
    complexes: number;
    users: number;
    mrr: number;
}

const planConfig: Record<string, { label: string; color: string }> = {
    free: { label: "Free", color: "bg-gray-100 text-gray-700" },
    starter: { label: "Starter", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400" },
    pro: { label: "Pro", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" },
    enterprise: { label: "Enterprise", color: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400" },
};

export function AdminTenantsClient({ initialTenants }: { initialTenants: Tenant[] }) {
    const [search, setSearch] = useState("");

    const filtered = initialTenants.filter((t) =>
        t.name.toLowerCase().includes(search.toLowerCase())
    );

    const handleToggleStatus = async (id: string, currentlyActive: boolean) => {
        try {
            await toggleTenantStatus(id, !currentlyActive);
            toast.success(`Inquilino ${currentlyActive ? 'desactivado' : 'activado'}`);
        } catch (error) {
            toast.error("Error al actualizar estado");
        }
    };

    return (
        <>
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar inquilinos..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 rounded-xl"
                />
            </div>

            <Card className="card-elevated border-border/50 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Inquilino</TableHead>
                            <TableHead>Plan</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-center">Complejos</TableHead>
                            <TableHead className="text-center">Usuarios</TableHead>
                            <TableHead className="text-right">MRR</TableHead>
                            <TableHead className="text-center">Módulos</TableHead>
                            <TableHead className="text-center">Activo</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.map((t) => (
                            <TableRow key={t.id}>
                                <TableCell>
                                    <div>
                                        <p className="font-semibold">{t.name}</p>
                                        <p className="text-xs text-muted-foreground">{t.slug}</p>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge className={`rounded-full ${planConfig[t.plan]?.color || "bg-gray-100"}`}>
                                        {planConfig[t.plan]?.label || t.plan}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge className={`rounded-full ${t.planStatus === "active" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                                        {t.planStatus === "active" ? "Activo" : "Vencido"}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-center">{t.complexes}</TableCell>
                                <TableCell className="text-center">{t.users}</TableCell>
                                <TableCell className="text-right font-semibold">${t.mrr.toLocaleString()}</TableCell>
                                <TableCell className="text-center">
                                    <div className="flex gap-1 justify-center flex-wrap">
                                        {t.modules.map((m) => (
                                            <Badge key={m} variant="secondary" className="text-[9px] px-1.5 rounded-full">{m}</Badge>
                                        ))}
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Switch
                                        checked={t.isActive}
                                        onCheckedChange={() => handleToggleStatus(t.id, t.isActive)}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </>
    );
}
