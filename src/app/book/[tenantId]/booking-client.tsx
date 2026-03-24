"use client";

import { useState, useTransition, useEffect } from "react";
import { format, addDays, startOfDay, isBefore, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getAvailableSlots, createPublicReservation } from "./actions";
import { CalendarDays, MapPin, Clock, User, CheckCircle2, ChevronRight, Trophy, ArrowLeft, MessageCircle } from "lucide-react";

const TIME_SLOTS = Array.from({ length: 32 }, (_, i) => {
    const hour = Math.floor(i / 2) + 8;
    const isHalf = i % 2 !== 0;
    return `${hour.toString().padStart(2, "0")}:${isHalf ? "30" : "00"}`;
});

const sportEmoji: Record<string, string> = {
    padel: "🎾",
    futbol: "⚽",
    tenis: "🎾",
    basquet: "🏀",
    voley: "🏐",
    otro: "🎯"
};

export function BookingClient({ tenantId, tenantName, tenantPhone, complexes }: { tenantId: string, tenantName: string, tenantPhone: string, complexes: any[] }) {
    const [step, setStep] = useState(1);
    const [isPending, startTransition] = useTransition();

    // Booking Data
    const [selectedComplex, setSelectedComplex] = useState(complexes.length === 1 ? complexes[0].id : "");
    const [selectedCourt, setSelectedCourt] = useState<any>(null);
    const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [duration, setDuration] = useState("60");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");

    // Customer Data
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");

    // Availability Data
    const [reservations, setReservations] = useState<any[]>([]);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);
    const [successData, setSuccessData] = useState<any>(null);

    const activeComplex = complexes.find(c => c.id === selectedComplex);
    const activeCourts = activeComplex?.courts || [];

    useEffect(() => {
        if (step === 2 && selectedCourt && date) {
            setIsLoadingSlots(true);
            getAvailableSlots(tenantId, selectedCourt.id, date).then(res => {
                setReservations(res.reservations);
                setIsLoadingSlots(false);
            }).catch(() => {
                toast.error("Error al cargar disponibilidad");
                setIsLoadingSlots(false);
            });
        }
    }, [step, selectedCourt, date, tenantId]);

    const handleDurationChange = (val: string) => {
        setDuration(val);
        setStartTime("");
        setEndTime("");
    };

    const handleSlotSelection = (time: string) => {
        setStartTime(time);
        const [h, m] = time.split(":").map(Number);
        const totalMinutes = h * 60 + m + parseInt(duration);
        const endH = Math.floor(totalMinutes / 60);
        const endM = totalMinutes % 60;
        setEndTime(`${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`);
    };

    const checkAvailability = (time: string): boolean => {
        if (!selectedCourt) return false;

        const [targetH, targetM] = time.split(":").map(Number);
        const targetMinutes = targetH * 60 + targetM;
        const durMins = parseInt(duration);
        const targetEndMinutes = targetMinutes + durMins;

        const now = new Date();
        if (date === format(now, "yyyy-MM-dd")) {
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            if (targetMinutes <= currentMinutes) return false;
        }

        for (const res of reservations) {
            const [rh, rm] = res.startTime.split(":").map(Number);
            const resStartMins = rh * 60 + rm;
            const [reH, reM] = res.endTime.split(":").map(Number);
            const resEndMins = reH * 60 + reM;

            if (targetMinutes < resEndMins && targetEndMinutes > resStartMins) {
                return false;
            }
        }
        return true;
    };

    const handleConfirm = () => {
        startTransition(async () => {
            try {
                const res = await createPublicReservation({
                    tenantId,
                    courtId: selectedCourt.id,
                    date,
                    startTime,
                    duration,
                    customerName,
                    customerPhone
                });

                if (res.success) {
                    setSuccessData({
                        ...res.reservation,
                        courtName: selectedCourt.name,
                        complexName: activeComplex.name
                    });
                    setStep(4);
                }
            } catch (error: any) {
                toast.error(error.message || "Error al confirmar reserva");
            }
        });
    };

    if (step === 4 && successData) {
        return (
            <div className="max-w-md mx-auto animate-fade-in mt-10">
                <Card className="p-8 text-center rounded-3xl border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/5 shadow-xl">
                    <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h2 className="text-3xl font-bold text-emerald-800 dark:text-emerald-400 mb-2">¡Reserva Confirmada!</h2>
                    <p className="text-muted-foreground mb-8">Te esperamos el día de tu turno. Tu reserva está anotada.</p>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 text-left border border-border shadow-sm mb-8 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500"><CalendarDays className="w-5 h-5" /></div>
                            <div>
                                <p className="text-xs text-muted-foreground">Día y Hora</p>
                                <p className="font-semibold">{format(new Date(successData.date), "EEEE d 'de' MMMM", { locale: es })} — {format(new Date(successData.startTime), "HH:mm")} hs</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500"><Trophy className="w-5 h-5" /></div>
                            <div>
                                <p className="text-xs text-muted-foreground">Cancha</p>
                                <p className="font-semibold">{successData.courtName} ({successData.complexName})</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg text-emerald-600"><Clock className="w-5 h-5" /></div>
                            <div>
                                <p className="text-xs text-muted-foreground">A pagar en el complejo</p>
                                <p className="font-bold text-emerald-600 dark:text-emerald-400 text-lg">${Number(successData.totalAmount).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        {(activeComplex?.phone || tenantPhone) && (
                            <Button
                                onClick={() => {
                                    const targetPhone = activeComplex?.phone || tenantPhone;
                                    const dateStr = format(new Date(successData.date), "EEEE d 'de' MMMM", { locale: es });
                                    const timeStr = format(new Date(successData.startTime), "HH:mm");
                                    const msg = encodeURIComponent(`Hola, realicé una reserva en ${successData.complexName}.\n\n📅 *Día:* ${dateStr}\n⏰ *Hora:* ${timeStr}hs\n🏟️ *Cancha:* ${successData.courtName}\n👤 *Nombre:* ${customerName}\n\nFavor de confirmar. ¡Gracias!`);
                                    window.open(`https://wa.me/${targetPhone.replace(/\D/g, "")}?text=${msg}`, "_blank");
                                }}
                                className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-md flex items-center justify-center gap-2 h-12"
                            >
                                <MessageCircle className="w-5 h-5" />
                                Enviar comprobante al {activeComplex?.name ? 'Complejo' : 'Encargado'}
                            </Button>
                        )}
                        <Button variant="outline" onClick={() => window.location.reload()} className="w-full rounded-xl h-12 border-border/50">
                            Hacer otra reserva
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="w-full space-y-6 animate-fade-in">
            {/* Stepper Header */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-sm border border-border/50 flex justify-between tracking-tight relative">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-muted -translate-y-1/2 z-0 hidden sm:block">
                    <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${((step - 1) / 2) * 100}%` }} />
                </div>

                {[
                    { s: 1, title: "Cancha", icon: Trophy },
                    { s: 2, title: "Horario", icon: Clock },
                    { s: 3, title: "Datos", icon: User },
                ].map((item) => {
                    const active = step >= item.s;
                    return (
                        <div key={item.s} className="relative z-10 flex flex-col items-center gap-2 bg-white dark:bg-slate-900 px-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-300 ${active ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/30' : 'bg-muted text-muted-foreground'}`}>
                                <item.icon className="w-5 h-5" />
                            </div>
                            <span className={`text-xs font-semibold hidden sm:block ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{item.title}</span>
                        </div>
                    );
                })}
            </div>

            <Card className="p-4 md:p-8 rounded-3xl border-border/50 shadow-sm bg-white dark:bg-slate-900">
                {/* STEP 1: Complejo y Cancha */}
                {step === 1 && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold">¿Qué vas a jugar?</h2>
                            <p className="text-muted-foreground">Selecciona la cancha que deseas reservar.</p>
                        </div>

                        {complexes.length > 1 && (
                            <div className="space-y-3">
                                <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Sede / Complejo</Label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {complexes.map(comp => (
                                        <Card key={comp.id} onClick={() => { setSelectedComplex(comp.id); setSelectedCourt(null); }} className={`p-4 cursor-pointer transition-all ${selectedComplex === comp.id ? 'ring-2 ring-emerald-500 border-transparent bg-emerald-50/50 dark:bg-emerald-500/10' : 'hover:border-emerald-300'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-xl ${selectedComplex === comp.id ? 'bg-emerald-500 text-white' : 'bg-muted'}`}>
                                                    <MapPin className="w-5 h-5" />
                                                </div>
                                                <span className="font-bold">{comp.name}</span>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeComplex && activeCourts.length > 0 && (
                            <div className="space-y-3 pt-2">
                                <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Canchas Disponibles</Label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {activeCourts.map((court: any) => (
                                        <Card key={court.id} onClick={() => setSelectedCourt(court)} className={`p-4 cursor-pointer transition-all flex items-center justify-between ${selectedCourt?.id === court.id ? 'ring-2 ring-emerald-500 border-transparent bg-emerald-50/50 dark:bg-emerald-500/10' : 'hover:border-emerald-300'}`}>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-2xl">{sportEmoji[court.sportType] || "🎯"}</span>
                                                    <div>
                                                        <h3 className="font-bold line-clamp-1">{court.name}</h3>
                                                        <p className="text-xs text-muted-foreground mt-0.5">Día: ${court.dayRate} | Noche: ${court.nightRate}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="pt-6 flex justify-end">
                            <Button
                                onClick={() => setStep(2)}
                                disabled={!selectedCourt}
                                className="w-full sm:w-auto rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white h-12 px-8"
                            >
                                Siguiente <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* STEP 2: Fecha y Hora */}
                {step === 2 && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex items-center mb-6">
                            <Button variant="ghost" size="icon" onClick={() => setStep(1)} className="mr-4 rounded-xl">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            <div>
                                <h2 className="text-2xl font-bold">Día y Horario</h2>
                                <p className="text-muted-foreground capitalize">{selectedCourt?.name}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <Label className="text-sm font-semibold">Fecha</Label>
                                    <Input
                                        type="date"
                                        min={format(new Date(), "yyyy-MM-dd")}
                                        value={date}
                                        onChange={(e) => { setDate(e.target.value); setStartTime(""); setEndTime(""); }}
                                        className="h-14 mt-1.5 rounded-2xl text-lg font-semibold cursor-pointer"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold">Duración del Turno</Label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { val: "60", label: "1 Hora" },
                                            { val: "90", label: "1.5 Hs" },
                                            { val: "120", label: "2 Hs" },
                                        ].map(d => (
                                            <Button
                                                key={d.val}
                                                variant={duration === d.val ? "default" : "outline"}
                                                onClick={() => handleDurationChange(d.val)}
                                                className={`rounded-xl ${duration === d.val ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900' : ''}`}
                                            >
                                                {d.label}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <Label className="text-sm font-semibold block mb-3">Horarios Disponibles</Label>
                                {isLoadingSlots ? (
                                    <div className="h-48 flex items-center justify-center border-2 border-dashed rounded-2xl">
                                        <p className="text-muted-foreground animate-pulse">Cargando horarios...</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[300px] overflow-y-auto pr-2 pb-2">
                                        {TIME_SLOTS.map(time => {
                                            const isAvailable = checkAvailability(time);
                                            const isSelected = startTime === time;

                                            return (
                                                <Button
                                                    key={time}
                                                    variant="outline"
                                                    disabled={!isAvailable}
                                                    onClick={() => handleSlotSelection(time)}
                                                    className={`h-12 rounded-xl transition-all ${isSelected
                                                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-500/20'
                                                        : isAvailable
                                                            ? 'hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400'
                                                            : 'opacity-30'}`}
                                                >
                                                    {time}
                                                </Button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="pt-6 flex justify-end border-t border-border/50">
                            <Button
                                onClick={() => setStep(3)}
                                disabled={!startTime}
                                className="w-full sm:w-auto rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white h-12 px-8"
                            >
                                Siguiente <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* STEP 3: Datos del Cliente */}
                {step === 3 && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex items-center mb-6">
                            <Button variant="ghost" size="icon" onClick={() => setStep(2)} className="mr-4 rounded-xl">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            <div>
                                <h2 className="text-2xl font-bold">Tus Datos</h2>
                                <p className="text-muted-foreground">Último paso para confirmar tu reserva.</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-border/50 mb-6 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Resumen de Reserva</p>
                                <p className="font-bold text-lg">{selectedCourt?.name}</p>
                                <p className="text-sm font-medium">{format(parseISO(date), "EEEE d 'de' MMMM", { locale: es })}</p>
                                <p className="text-sm text-muted-foreground">{startTime} hs a {endTime} hs</p>
                            </div>
                        </div>

                        <div className="space-y-4 max-w-sm">
                            <div>
                                <Label className="text-sm font-semibold">Nombre y Apellido</Label>
                                <Input
                                    placeholder="Ej: Juan Pérez"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    className="h-12 mt-1.5 rounded-xl text-base"
                                />
                            </div>
                            <div>
                                <Label className="text-sm font-semibold">Teléfono / WhatsApp</Label>
                                <Input
                                    type="tel"
                                    placeholder="+54 11 0000 0000"
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    className="h-12 mt-1.5 rounded-xl text-base"
                                />
                            </div>
                        </div>

                        <div className="pt-6 border-t border-border/50 flex flex-col items-center">
                            <p className="text-xs text-muted-foreground mb-4 text-center max-w-sm">
                                Al confirmar, estás aceptando las políticas de cancelación de {tenantName}. El pago se realizará en el establecimiento.
                            </p>
                            <Button
                                onClick={handleConfirm}
                                disabled={!customerName || customerPhone.length < 8 || isPending}
                                className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white h-14 px-12 text-lg shadow-xl shadow-emerald-500/20"
                            >
                                {isPending ? "Confirmando reserva..." : "Confirmar Reserva"}
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
