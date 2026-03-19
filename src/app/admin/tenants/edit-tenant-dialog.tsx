"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { updateTenant } from "./actions";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

interface Tenant {
    id: string;
    name: string;
    slug: string;
    phone: string | null;
    plan: string;
    modules: string[];
    isActive: boolean;
}

export function EditTenantDialog({ tenant, onClose }: { tenant: Tenant; onClose: () => void }) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: tenant.name,
        slug: tenant.slug,
        phone: tenant.phone || "",
        plan: tenant.plan,
        modules: [...tenant.modules],
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await updateTenant(tenant.id, {
                name: formData.name,
                slug: formData.slug,
                phone: formData.phone,
                plan: formData.plan,
                modules: formData.modules,
            });
            toast.success("Negocio actualizado");
            onClose();
        } catch (error: any) {
            toast.error(error.message || "Error al actualizar");
        } finally {
            setLoading(false);
        }
    };

    const handleModules = (module: string, checked: boolean) => {
        if (checked) {
            setFormData({ ...formData, modules: [...formData.modules, module] });
        } else {
            setFormData({ ...formData, modules: formData.modules.filter(m => m !== module) });
        }
    };

    return (
        <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Pencil className="w-4 h-4" />
                        Editar Negocio
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    <div className="space-y-4">
                        <h3 className="font-semibold text-sm text-emerald-600">Datos del negocio</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nombre comercial</Label>
                                <Input
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Slug (URL amigable)</Label>
                                <Input required value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Teléfono</Label>
                                <Input
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+54 11 1234-5678"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Plan de Suscripción</Label>
                                <Select value={formData.plan} onValueChange={(v) => setFormData({ ...formData, plan: v || "starter" })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="starter">Starter (hasta 3 canchas)</SelectItem>
                                        <SelectItem value="pro">Pro (4-6 canchas)</SelectItem>
                                        <SelectItem value="enterprise">Enterprise (7+ canchas)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-semibold text-sm text-emerald-600">Módulos Habilitados</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { key: "reservations", label: "Reservas" },
                                { key: "pos", label: "Kiosko (POS)" },
                                { key: "inventory", label: "Inventario" },
                                { key: "reports", label: "Reportes" },
                            ].map((mod) => (
                                <label key={mod.key} className="flex items-center gap-3 p-3 border rounded-xl hover:bg-accent cursor-pointer">
                                    <Switch checked={formData.modules.includes(mod.key)} onCheckedChange={(c) => handleModules(mod.key, c)} />
                                    <span className="text-sm font-medium">{mod.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            {loading ? "Guardando..." : "Guardar Cambios"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
