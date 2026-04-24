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
    CreditCard,
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { updateComplexInfo, updateComplexSchedule, updateComplexPaymentSettings } from "./actions";
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

    // Bank Account Data State parsing
    const defaultBank = { alias: "", cbu: "", titular: "", tipoSena: "porcentaje", valorSena: "30" };
    let parsedBank = defaultBank;
    try {
        if (initialComplex.bankAccountInfo) {
            parsedBank = { ...defaultBank, ...JSON.parse(initialComplex.bankAccountInfo) };
        }
    } catch (e) { }

    const [paymentConfig, setPaymentConfig] = useState({
        requiresDeposit: initialComplex.requiresDeposit || false,
        alias: parsedBank.alias,
        cbu: parsedBank.cbu,
        titular: parsedBank.titular,
        tipoSena: parsedBank.tipoSena || "porcentaje",
        valorSena: parsedBank.valorSena !== undefined ? parsedBank.valorSena : (parsedBank as any).porcentajeSena || "30"
    });

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

    const handleSavePaymentConfig = () => {
        startTransition(async () => {
            try {
                const bankJson = JSON.stringify({
                    alias: paymentConfig.alias,
                    cbu: paymentConfig.cbu,
                    titular: paymentConfig.titular,
                    tipoSena: paymentConfig.tipoSena,
                    valorSena: paymentConfig.valorSena
                });

                const isPorcentaje = paymentConfig.tipoSena === "porcentaje";
                const depositPercentage = isPorcentaje ? Number(paymentConfig.valorSena) : null;
                const depositAmount = isPorcentaje ? null : Number(paymentConfig.valorSena);

                await updateComplexPaymentSettings(initialComplex.id, paymentConfig.requiresDeposit, depositPercentage, depositAmount, bankJson);
                toast.success("Configuración de pagos guardada");
                router.refresh();
            } catch (e: any) {
                toast.error(e.message || "Error al guardar configuración de pagos");
            }
        });
    };

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
                <p className="text-muted-foreground mt-1">Ajustes generales del complejo</p>
            </div>

            {/* Complex Info - REMOVED (managed by SuperAdmin/Complexes) */}

            {/* Operating Hours - REMOVED (managed by Complex/Court settings) */}

            {/* Online Payments Settings */}
            <Card className="card-elevated p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <CreditCard className="w-5 h-5 text-emerald-600" />
                        <div>
                            <h2 className="text-lg font-bold">Cobros y Señas Online</h2>
                            <p className="text-xs text-muted-foreground">Configura los datos bancarios para que los clientes te transfieran al reservar online.</p>
                        </div>
                    </div>
                </div>

                <div className="pt-2 border-b pb-4 mb-4">
                    <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-500/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-500/20">
                        <div>
                            <p className="font-bold text-emerald-800 dark:text-emerald-400">Solicitar Seña Obligatoria</p>
                            <p className="text-sm text-emerald-700/80 dark:text-emerald-500/80">Requerir comprobar un pago por transferencia para confirmar la reserva online.</p>
                        </div>
                        <Switch
                            checked={paymentConfig.requiresDeposit}
                            onCheckedChange={(c) => setPaymentConfig({ ...paymentConfig, requiresDeposit: c })}
                        />
                    </div>
                </div>

                {paymentConfig.requiresDeposit && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2 animate-fade-in">
                        <div className="space-y-4 col-span-full md:col-span-1">
                            <div>
                                <Label>Tipo de Seña</Label>
                                <div className="flex items-center gap-4 mt-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="tipoSena" value="porcentaje" checked={paymentConfig.tipoSena === "porcentaje"} onChange={() => setPaymentConfig({ ...paymentConfig, tipoSena: "porcentaje" })} className="accent-emerald-600" />
                                        <span className="text-sm">Porcentaje (%)</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="tipoSena" value="fija" checked={paymentConfig.tipoSena === "fija"} onChange={() => setPaymentConfig({ ...paymentConfig, tipoSena: "fija" })} className="accent-emerald-600" />
                                        <span className="text-sm">Monto Fijo ($)</span>
                                    </label>
                                </div>
                            </div>
                            <div>
                                <Label>{paymentConfig.tipoSena === "porcentaje" ? "Porcentaje de Seña (%)" : "Monto Fijo de Seña ($)"}</Label>
                                <Input type="number" min="1" max={paymentConfig.tipoSena === "porcentaje" ? "100" : undefined} value={paymentConfig.valorSena} onChange={(e) => setPaymentConfig({ ...paymentConfig, valorSena: e.target.value })} className="mt-1.5 rounded-xl" placeholder={paymentConfig.tipoSena === "porcentaje" ? "Ej: 30" : "Ej: 5000"} />
                                <p className="text-xs text-muted-foreground mt-1">
                                    {paymentConfig.tipoSena === "porcentaje"
                                        ? "Se calculará este porcentaje sobre el valor de la cancha al reservar."
                                        : "Se cobrará este monto fijo independientemente del valor de la cancha."}
                                </p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <Label>Titular de la Cuenta</Label>
                                <Input value={paymentConfig.titular} onChange={(e) => setPaymentConfig({ ...paymentConfig, titular: e.target.value })} className="mt-1.5 rounded-xl" placeholder="Ej: Juan Perez" />
                            </div>
                            <div>
                                <Label>Alias</Label>
                                <Input value={paymentConfig.alias} onChange={(e) => setPaymentConfig({ ...paymentConfig, alias: e.target.value })} className="mt-1.5 rounded-xl" placeholder="Ej: MI.CANCHA.MP" />
                            </div>
                            <div>
                                <Label>CBU / CVU</Label>
                                <Input value={paymentConfig.cbu} onChange={(e) => setPaymentConfig({ ...paymentConfig, cbu: e.target.value })} className="mt-1.5 rounded-xl" placeholder="Ej: 00000031000..." />
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-end pt-2">
                    <Button onClick={handleSavePaymentConfig} disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md">
                        <Save className="w-4 h-4 mr-2" /> Guardar Configuración
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

            {/* Modules - REMOVED (managed by SuperAdmin) */}
        </div>
    );
}
