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
import { Switch } from "@/components/ui/switch";
import { updateComplex } from "./actions";
import { toast } from "sonner";
import { Edit2 } from "lucide-react";

interface Complex {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    openingTime: string;
    closingTime: string;
    sportTypes: string[];
    isActive: boolean;
}

export function EditComplexDialog({ complex, onClose }: { complex: Complex, onClose: () => void }) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: complex.name,
        address: complex.address || "",
        phone: complex.phone || "",
        openingTime: complex.openingTime,
        closingTime: complex.closingTime,
        sportTypes: [...complex.sportTypes],
        isActive: complex.isActive,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await updateComplex(complex.id, formData);
            toast.success("Sede actualizada");
            onClose();
        } catch {
            toast.error("Error al actualizar la sede");
        } finally {
            setLoading(false);
        }
    };

    const handleSports = (sport: string, checked: boolean) => {
        if (checked) {
            setFormData({ ...formData, sportTypes: [...formData.sportTypes, sport] });
        } else {
            setFormData({ ...formData, sportTypes: formData.sportTypes.filter(s => s !== sport) });
        }
    };

    return (
        <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Edit2 className="w-4 h-4" />
                        Editar {complex.name}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    <div className="flex items-center justify-between p-3 border rounded-xl bg-muted/30">
                        <div className="space-y-0.5">
                            <Label>Estado de la sede</Label>
                            <p className="text-sm text-muted-foreground">
                                {formData.isActive ? "La sede está visible y recibe reservas" : "La sede está oculta temporalmente"}
                            </p>
                        </div>
                        <Switch checked={formData.isActive} onCheckedChange={(c) => setFormData({ ...formData, isActive: c })} />
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nombre de la sede</Label>
                            <Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Dirección</Label>
                                <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Teléfono</Label>
                                <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Horario Apertura</Label>
                                <Input type="time" required value={formData.openingTime} onChange={(e) => setFormData({ ...formData, openingTime: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Horario Cierre</Label>
                                <Input type="time" required value={formData.closingTime} onChange={(e) => setFormData({ ...formData, closingTime: e.target.value })} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Label>Deportes</Label>
                        <div className="grid grid-cols-3 gap-3">
                            {['futbol', 'padel', 'tenis'].map((sport) => (
                                <label key={sport} className="flex items-center gap-2 p-3 border rounded-xl hover:bg-accent cursor-pointer">
                                    <Switch checked={formData.sportTypes.includes(sport)} onCheckedChange={(c) => handleSports(sport, c)} />
                                    <span className="text-sm font-medium capitalize">{sport}</span>
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
