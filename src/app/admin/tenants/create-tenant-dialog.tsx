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
import { createTenant } from "./actions";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export function CreateTenantDialog() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        slug: "",
        plan: "starter",
        adminEmail: "",
        adminName: "",
        adminPassword: "",
        modules: [] as string[],
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const formDataObj = new FormData();
            Object.entries(formData).forEach(([key, value]) => {
                if (key === 'modules') {
                    formDataObj.append(key, JSON.stringify(value));
                } else {
                    formDataObj.append(key, value as string);
                }
            });

            await createTenant(formDataObj);
            toast.success("Inquilino creado exitosamente");
            setOpen(false);
            setFormData({ name: "", slug: "", plan: "starter", adminEmail: "", adminName: "", adminPassword: "", modules: [] });
        } catch (error: any) {
            toast.error(error.message || "Error al crear inquilino");
        } finally {
            setLoading(false);
        }
    };

    const generateSlug = (name: string) => {
        return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
    };

    const handleModules = (module: string, checked: boolean) => {
        if (checked) {
            setFormData({ ...formData, modules: [...formData.modules, module] });
        } else {
            setFormData({ ...formData, modules: formData.modules.filter(m => m !== module) });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <Button
                onClick={() => setOpen(true)}
                className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg shadow-emerald-500/20 rounded-xl"
            >
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Inquilino
            </Button>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Crear Nuevo Inquilino</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    <div className="space-y-4">
                        <h3 className="font-semibold text-sm text-emerald-600">Datos del complejo</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nombre comercial</Label>
                                <Input
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value, slug: generateSlug(e.target.value) })}
                                    placeholder="Ej: Padel Center"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Slug (URL amistosa)</Label>
                                <Input required value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Plan de Suscripción</Label>
                            <Select value={formData.plan} onValueChange={(v) => setFormData({ ...formData, plan: v || "starter" })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="starter">Starter</SelectItem>
                                    <SelectItem value="pro">Pro</SelectItem>
                                    <SelectItem value="enterprise">Enterprise</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-semibold text-sm text-emerald-600">Administrador Inicial</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nombre completo</Label>
                                <Input required value={formData.adminName} onChange={(e) => setFormData({ ...formData, adminName: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input required type="email" value={formData.adminEmail} onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })} />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <Label>Contraseña</Label>
                                <Input required type="password" value={formData.adminPassword} onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="font-semibold text-sm text-emerald-600">Módulos Habilitados</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <label className="flex items-center gap-3 p-3 border rounded-xl hover:bg-accent cursor-pointer">
                                <Switch checked={formData.modules.includes('reservations')} onCheckedChange={(c) => handleModules('reservations', c)} />
                                <span className="text-sm font-medium">Reservas</span>
                            </label>
                            <label className="flex items-center gap-3 p-3 border rounded-xl hover:bg-accent cursor-pointer">
                                <Switch checked={formData.modules.includes('pos')} onCheckedChange={(c) => handleModules('pos', c)} />
                                <span className="text-sm font-medium">Kiosko (POS)</span>
                            </label>
                            <label className="flex items-center gap-3 p-3 border rounded-xl hover:bg-accent cursor-pointer">
                                <Switch checked={formData.modules.includes('inventory')} onCheckedChange={(c) => handleModules('inventory', c)} />
                                <span className="text-sm font-medium">Inventario</span>
                            </label>
                            <label className="flex items-center gap-3 p-3 border rounded-xl hover:bg-accent cursor-pointer">
                                <Switch checked={formData.modules.includes('reports')} onCheckedChange={(c) => handleModules('reports', c)} />
                                <span className="text-sm font-medium">Reportes</span>
                            </label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                        <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            {loading ? "Creando..." : "Crear Inquilino"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
