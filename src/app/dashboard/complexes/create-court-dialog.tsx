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
import { createCourt, updateCourt } from "./actions";
import { toast } from "sonner";
import { Plus, Edit2 } from "lucide-react";

interface Court {
    id: string;
    name: string;
    sportType: string;
    dayRate: number;
    nightRate: number;
    nightRateStartTime: string;
    isActive: boolean;
    parentCourtId: string | null;
}

interface Complex {
    id: string;
    name: string;
    sportTypes: string[];
    courts: Court[];
}

export function CreateCourtDialog({
    complex,
    courtToEdit,
    onClose
}: {
    complex: Complex;
    courtToEdit?: Court;
    onClose: () => void;
}) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: courtToEdit?.name || "",
        sportType: courtToEdit?.sportType || complex.sportTypes[0] || "futbol",
        dayRate: courtToEdit?.dayRate || 0,
        nightRate: courtToEdit?.nightRate || 0,
        nightRateStartTime: courtToEdit?.nightRateStartTime || "19:00",
        parentCourtId: courtToEdit?.parentCourtId || "_none",
        isActive: courtToEdit?.isActive ?? true,
    });

    const isEdit = !!courtToEdit;

    // Filter courts that could be parents: active, same sport, and not self if editing
    const validParents = complex.courts.filter(c =>
        c.sportType === formData.sportType &&
        (!isEdit || c.id !== courtToEdit.id)
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const dataToSubmit = {
                name: formData.name,
                sportType: formData.sportType,
                dayRate: Number(formData.dayRate),
                nightRate: Number(formData.nightRate),
                nightRateStartTime: formData.nightRateStartTime,
                parentCourtId: formData.parentCourtId === "_none" ? undefined : formData.parentCourtId,
                ...(isEdit && { isActive: formData.isActive }),
            };

            if (isEdit) {
                await updateCourt(courtToEdit.id, dataToSubmit);
                toast.success("Cancha actualizada");
            } else {
                await createCourt({ ...dataToSubmit, complexId: complex.id });
                toast.success("Cancha creada exitosamente");
            }
            onClose();
        } catch {
            toast.error(isEdit ? "Error al actualizar la cancha" : "Error al crear la cancha");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {isEdit ? <Edit2 className="w-5 h-5 text-emerald-600" /> : <Plus className="w-5 h-5 text-emerald-600" />}
                        {isEdit ? "Editar Cancha" : `Agregar Cancha a ${complex.name}`}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 py-4">

                    {isEdit && (
                        <div className="flex items-center justify-between p-3 border rounded-xl bg-muted/30">
                            <div className="space-y-0.5">
                                <Label>Estado de la cancha</Label>
                                <p className="text-sm text-muted-foreground">
                                    {formData.isActive ? "Activa y disponible para reservas" : "Inactiva temporalmente"}
                                </p>
                            </div>
                            <Switch checked={formData.isActive} onCheckedChange={(c) => setFormData({ ...formData, isActive: c })} />
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nombre o Número</Label>
                                <Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ej: Cancha 1" />
                            </div>
                            <div className="space-y-2">
                                <Label>Deporte</Label>
                                <Select value={formData.sportType} onValueChange={(v) => setFormData({ ...formData, sportType: v || "futbol", parentCourtId: "_none" })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {complex.sportTypes.map(s => (
                                            <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Cancha Principal (Opcional)</Label>
                            <p className="text-xs text-muted-foreground mb-2">Si esta cancha es una subdivisión de otra más grande, seleccionala aquí para vincular los bloqueos.</p>
                            <Select value={formData.parentCourtId} onValueChange={(v) => setFormData({ ...formData, parentCourtId: v || "_none" })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="No es subdivisión" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="_none">Ninguna (Cancha independiente)</SelectItem>
                                    {validParents.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Label>Tarifas y Precios</Label>
                        <div className="grid grid-cols-3 gap-4 p-4 border rounded-xl bg-muted/20">
                            <div className="space-y-2">
                                <Label>Tarifa de Día</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    required
                                    value={formData.dayRate}
                                    onChange={(e) => setFormData({ ...formData, dayRate: Number(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Tarifa de Noche</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    required
                                    value={formData.nightRate}
                                    onChange={(e) => setFormData({ ...formData, nightRate: Number(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Inicio hr. Noche</Label>
                                <Input
                                    type="time"
                                    required
                                    value={formData.nightRateStartTime}
                                    onChange={(e) => setFormData({ ...formData, nightRateStartTime: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            {loading ? "Guardando..." : "Guardar Cancha"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
