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
import { createComplex } from "./actions";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export function CreateComplexDialog() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        address: "",
        phone: "",
        openingTime: "08:00",
        closingTime: "23:00",
        sportTypes: ["futbol"],
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await createComplex(formData);
            toast.success("Sede creada exitosamente");
            setOpen(false);
            setFormData({ name: "", address: "", phone: "", openingTime: "08:00", closingTime: "23:00", sportTypes: ["futbol"] });
        } catch {
            toast.error("Error al crear la sede");
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
        <Dialog open={open} onOpenChange={setOpen}>
            <Button
                onClick={() => setOpen(true)}
                className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg shadow-emerald-500/20 rounded-xl"
            >
                <Plus className="w-4 h-4 mr-2" />
                Nueva Sede
            </Button>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Crear Nueva Sede</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nombre de la sede</Label>
                            <Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ej: Sede Centro" />
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
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                        <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            {loading ? "Creando..." : "Crear Sede"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
