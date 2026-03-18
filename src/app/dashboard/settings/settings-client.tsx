"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
    Building2,
    CalendarClock,
    Palette,
    Shield,
    Save,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { updateComplexInfo, updateComplexSchedule } from "./actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const DAYS_OF_WEEK = [
    "Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"
];

export function SettingsClient({ initialComplex }: { initialComplex: any }) {
    const { theme, toggleTheme } = useTheme();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [info, setInfo] = useState({
        name: initialComplex.name || "",
        phone: initialComplex.phone || "",
        address: initialComplex.address || ""
    });

    // Initialize 7 days of schedule
    const initialSchedules = Array.from({ length: 7 }).map((_, i) => {
        const existing = initialComplex.schedules?.find((s: any) => s.dayOfWeek === i);
        return {
            dayOfWeek: i,
            openingTime: existing?.openingTime || "08:00",
            closingTime: existing?.closingTime || "23:00",
            isActive: existing !== undefined ? existing.isActive : true
        };
    });

    const [schedules, setSchedules] = useState(initialSchedules);

    const handleScheduleChange = (dayIndex: number, field: string, value: any) => {
        setSchedules(prev => prev.map(s => s.dayOfWeek === dayIndex ? { ...s, [field]: value } : s));
    };

    const handleSaveInfo = () => {
        startTransition(async () => {
            try {
                await updateComplexInfo(initialComplex.id, info.name, info.phone, info.address);
                toast.success("Información guardada");
                router.refresh();
            } catch (e: any) {
                toast.error(e.message || "Error al guardar información");
            }
        });
    };

    const handleSaveSchedules = () => {
        startTransition(async () => {
            try {
                await updateComplexSchedule(initialComplex.id, schedules);
                toast.success("Horarios actualizados");
                router.refresh();
            } catch (e: any) {
                toast.error(e.message || "Error al guardar horarios");
            }
        });
    };

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
                <p className="text-muted-foreground mt-1">Ajustes generales del complejo</p>
            </div>

            {/* Complex Info */}
            <Card className="card-elevated p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-emerald-600" />
                        <h2 className="text-lg font-bold">Información del Complejo</h2>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div>
                        <Label>Nombre</Label>
                        <Input value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} className="mt-1.5 rounded-xl" />
                    </div>
                    <div>
                        <Label>Teléfono</Label>
                        <Input value={info.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })} className="mt-1.5 rounded-xl" />
                    </div>
                    <div className="col-span-full">
                        <Label>Dirección</Label>
                        <Input value={info.address} onChange={(e) => setInfo({ ...info, address: e.target.value })} className="mt-1.5 rounded-xl" />
                    </div>
                </div>
                <div className="flex justify-end pt-2">
                    <Button onClick={handleSaveInfo} disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md">
                        <Save className="w-4 h-4 mr-2" /> Guardar Info
                    </Button>
                </div>
            </Card>

            {/* Operating Hours (Per Day) */}
            <Card className="card-elevated p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <CalendarClock className="w-5 h-5 text-emerald-600" />
                        <div>
                            <h2 className="text-lg font-bold">Horarios por Día</h2>
                            <p className="text-xs text-muted-foreground">Configura los horarios de apertura y cierre para cada día de la semana.</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-3 pt-2">
                    {schedules.map((schedule) => (
                        <div key={schedule.dayOfWeek} className={`flex items-center gap-4 p-3 rounded-xl border ${schedule.isActive ? 'border-border' : 'border-dashed bg-muted/30 opacity-70'}`}>
                            <div className="w-28 flex items-center gap-3 shrink-0">
                                <Switch checked={schedule.isActive} onCheckedChange={(c) => handleScheduleChange(schedule.dayOfWeek, 'isActive', c)} />
                                <Label className={`font-medium ${schedule.isActive ? '' : 'text-muted-foreground line-through'}`}>
                                    {DAYS_OF_WEEK[schedule.dayOfWeek]}
                                </Label>
                            </div>

                            {schedule.isActive ? (
                                <div className="flex-1 flex items-center gap-3 flex-wrap sm:flex-nowrap">
                                    <div className="flex-1 min-w-[120px]">
                                        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Apertura</Label>
                                        <Input type="time" value={schedule.openingTime} onChange={(e) => handleScheduleChange(schedule.dayOfWeek, 'openingTime', e.target.value)} className="rounded-xl h-9" />
                                    </div>
                                    <div className="flex-1 min-w-[120px]">
                                        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Cierre</Label>
                                        <Input type="time" value={schedule.closingTime} onChange={(e) => handleScheduleChange(schedule.dayOfWeek, 'closingTime', e.target.value)} className="rounded-xl h-9" />
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex items-center text-muted-foreground text-sm italic">
                                    Cerrado este día
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="flex justify-end pt-4">
                    <Button onClick={handleSaveSchedules} disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md">
                        <Save className="w-4 h-4 mr-2" /> Guardar Horarios
                    </Button>
                </div>
            </Card>

            {/* Appearance */}
            <Card className="card-elevated p-6 space-y-4">
                <div className="flex items-center gap-3">
                    <Palette className="w-5 h-5 text-emerald-600" />
                    <h2 className="text-lg font-bold">Apariencia</h2>
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-medium">Modo Oscuro</p>
                        <p className="text-sm text-muted-foreground">Tema premium con glassmorphism</p>
                    </div>
                    <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
                </div>
            </Card>

            {/* Modules */}
            <Card className="card-elevated p-6 space-y-4">
                <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-emerald-600" />
                    <h2 className="text-lg font-bold">Módulos Activos</h2>
                </div>
                <div className="space-y-3">
                    {[
                        { name: "Reservas", desc: "Gestión de turnos y calendario", enabled: true },
                        { name: "POS / Kiosko", desc: "Punto de venta", enabled: true },
                        { name: "Inventario", desc: "Control de stock y productos", enabled: true },
                        { name: "Reportes", desc: "Analíticas y reportes financieros", enabled: true },
                    ].map((mod) => (
                        <div key={mod.name} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                            <div>
                                <p className="font-medium">{mod.name}</p>
                                <p className="text-xs text-muted-foreground">{mod.desc}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge className="bg-emerald-100 text-emerald-700 rounded-full text-xs">Activo</Badge>
                                <Switch defaultChecked={mod.enabled} />
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}
