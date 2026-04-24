"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createComplex } from "../complexes/actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Building2, Plus, MapPin, Clock, Trophy } from "lucide-react";

export default function NoComplexesClient({ tenantName }: { tenantName: string }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [formData, setFormData] = useState({
        name: "",
        address: "",
        phone: "",
        openingTime: "08:00",
        closingTime: "23:00",
        sportTypes: ["futbol"],
    });

    const handleSports = (sport: string, checked: boolean) => {
        if (checked) {
            setFormData({ ...formData, sportTypes: [...formData.sportTypes, sport] });
        } else {
            setFormData({ ...formData, sportTypes: formData.sportTypes.filter(s => s !== sport) });
        }
    };

    const handleCreate = () => {
        if (!formData.name) {
            toast.error("El nombre del complejo es requerido");
            return;
        }
        startTransition(async () => {
            try {
                await createComplex(formData);
                toast.success("¡Complejo creado exitosamente! Redirigiendo...");
                // Small delay then redirect to select-complex which will now have the new complex
                setTimeout(() => {
                    router.refresh();
                }, 500);
            } catch (error: any) {
                toast.error(error.message || "Error al crear el complejo");
            }
        });
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 page-pattern relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl opacity-50 pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl opacity-50 pointer-events-none" />

            <div className="relative w-full max-w-xl z-10">
                <div className="text-center mb-8 animate-fade-in">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-xl mb-6">
                        <Building2 className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight mb-2">¡Bienvenido a {tenantName}!</h1>
                    <p className="text-lg text-muted-foreground max-w-md mx-auto">
                        Para empezar, creá tu primer complejo deportivo.
                    </p>
                </div>

                <Card className="p-6 card-elevated border-border/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md animate-slide-up">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Plus className="w-5 h-5 text-emerald-600" />
                        Crear Primer Complejo
                    </h2>

                    <div className="space-y-5">
                        <div className="space-y-2">
                            <Label>Nombre del complejo *</Label>
                            <Input
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ej: Mi Complejo Deportivo"
                                className="rounded-xl"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Dirección</Label>
                                <Input
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    placeholder="Ej: Av. Ejemplo 123"
                                    className="rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Teléfono</Label>
                                <Input
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+54 11 1234-5678"
                                    className="rounded-xl"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Apertura</Label>
                                <Input
                                    type="time"
                                    value={formData.openingTime}
                                    onChange={(e) => setFormData({ ...formData, openingTime: e.target.value })}
                                    className="rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Cierre</Label>
                                <Input
                                    type="time"
                                    value={formData.closingTime}
                                    onChange={(e) => setFormData({ ...formData, closingTime: e.target.value })}
                                    className="rounded-xl"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5" /> Deportes</Label>
                            <div className="grid grid-cols-3 gap-3">
                                {["futbol", "padel", "tenis"].map((sport) => (
                                    <label key={sport} className="flex items-center gap-2 p-3 border rounded-xl hover:bg-accent cursor-pointer">
                                        <Switch
                                            checked={formData.sportTypes.includes(sport)}
                                            onCheckedChange={(c) => handleSports(sport, c)}
                                        />
                                        <span className="text-sm font-medium capitalize">{sport}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <Button
                            onClick={handleCreate}
                            disabled={isPending || !formData.name}
                            className="w-full h-14 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl text-lg font-bold shadow-lg shadow-emerald-500/20"
                        >
                            {isPending ? "Creando..." : "🏟️ Crear Complejo"}
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
}
