"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createReservation, changeReservationStatus, payReservation, getAvailableSlots } from "./actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PaymentDialog } from "@/components/payment-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    Phone,
    Clock,
    CalendarDays,
    Check,
    Play,
    Square,
    DollarSign,
    X,
    MessageCircle,
    RotateCcw,
    ShoppingCart,
    Link as LinkIcon,
} from "lucide-react";
import { format, addDays, subDays, isToday } from "date-fns";
import { es } from "date-fns/locale";

// Types
interface Court {
    id: string;
    name: string;
    sportType: string;
    dayRate: number;
    nightRate: number;
    nightRateStartTime: string;
    parentCourtId: string | null;
}

interface Reservation {
    id: string;
    courtId: string;
    customerName: string;
    customerPhone: string;
    startTime: string;
    endTime: string;
    status: string;
    courtAmount: number;
    totalAmount: number;
    source: string;
    isRecurring: boolean;
}

// Status colors and labels
const statusConfig: Record<string, { label: string; class: string; icon: React.ElementType }> = {
    pending: { label: "Pendiente", class: "status-pending", icon: Clock },
    confirmed: { label: "Confirmada", class: "status-confirmed", icon: Check },
    in_game: { label: "En Juego", class: "status-in_game", icon: Play },
    finished: { label: "Finalizada", class: "status-finished", icon: Square },
    paid: { label: "Pagada", class: "status-paid", icon: DollarSign },
    cancelled: { label: "Cancelada", class: "status-cancelled", icon: X },
};

const sportEmoji: Record<string, string> = {
    futbol: "⚽",
    padel: "🎾",
    tenis: "🎾",
};

export default function ReservationsClient({
    complex,
    courts,
    initialReservations,
    currentDate,
    isNew,
    openResId,
}: {
    complex: any;
    courts: Court[];
    initialReservations: any[];
    currentDate: string;
    isNew?: boolean;
    openResId?: string;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    // Use current date from URL, normalized to midday to avoid timezone shifts
    const [selectedDate, setSelectedDate] = useState(new Date(currentDate + "T12:00:00"));

    useEffect(() => {
        setSelectedDate(new Date(currentDate + "T12:00:00"));
    }, [currentDate]);

    const [showNewReservation, setShowNewReservation] = useState(isNew || false);
    const [selectedSlot, setSelectedSlot] = useState<{ courtId: string; time: string } | null>(null);
    const [reservations, setReservations] = useState(initialReservations);

    // Sync state when props change
    useEffect(() => {
        setReservations(initialReservations);
    }, [initialReservations]);

    // New reservation form state
    const [newRes, setNewRes] = useState({
        customerName: "",
        customerPhone: "",
        courtId: "",
        startTime: "",
        endTime: "",
        duration: "60",
        isRecurring: false,
    });

    // Dynamic Time Slots generation
    const timeSlots = (() => {
        const slots: string[] = [];
        const openH = parseInt(complex.openingTime?.split(":")[0] || "08");
        const closeH = parseInt(complex.closingTime?.split(":")[0] || "23");

        // Calculate total 30min slots
        let currentH = openH;
        let currentM = 0;

        const endH = closeH <= openH ? closeH + 24 : closeH;

        while (currentH < endH || (currentH === endH && currentM === 0)) {
            const h = currentH % 24;
            slots.push(`${h.toString().padStart(2, "0")}:${currentM === 0 ? "00" : "30"}`);

            currentM += 30;
            if (currentM >= 60) {
                currentH += 1;
                currentM = 0;
            }
        }
        return slots;
    })();

    const [detailReservation, setDetailReservation] = useState<any | null>(null);
    const [paymentReservation, setPaymentReservation] = useState<any | null>(null);

    // Auto-open reservation detail if openResId is passed
    useEffect(() => {
        if (openResId && reservations.length > 0) {
            const resToOpen = reservations.find(r => r.id === openResId);
            if (resToOpen) {
                setDetailReservation(resToOpen);
            }
        }
    }, [openResId, reservations]);

    const handleSlotClick = (courtId: string, time: string) => {
        // Check if slot is occupied (basic client side validation)
        const occupied = reservations.some((r) => {
            if (r.courtId !== courtId && r.status !== "cancelled") return false;
            const rStart = format(new Date(r.startTime), "HH:mm");
            const rEnd = format(new Date(r.endTime), "HH:mm");
            return time >= rStart && time < rEnd;
        });
        if (occupied) return;

        const court = courts.find((c) => c.id === courtId);
        const startHour = parseInt(time.split(":")[0]);
        const isNight = court ? startHour >= parseInt(court.nightRateStartTime.split(":")[0]) : false;

        // Calculate end time
        const [h, m] = time.split(":").map(Number);
        const endMinutes = h * 60 + m + 60; // default 60 min
        const endH = Math.floor(endMinutes / 60);
        const endM = endMinutes % 60;
        const endTime = `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;

        setNewRes({
            customerName: "",
            customerPhone: "",
            courtId,
            startTime: time,
            endTime,
            duration: "60",
            isRecurring: false,
        });
        setSelectedSlot({ courtId, time });
        setShowNewReservation(true);
    };

    const handleCreateReservation = () => {
        if (!newRes.customerName || !newRes.courtId) return;

        startTransition(async () => {
            try {
                const formData = new FormData();
                formData.append("complexId", complex.id);
                formData.append("courtId", newRes.courtId);
                formData.append("customerName", newRes.customerName);
                if (newRes.customerPhone) formData.append("customerPhone", newRes.customerPhone);
                formData.append("date", currentDate);
                formData.append("startTime", newRes.startTime);
                formData.append("endTime", newRes.endTime);

                await createReservation(formData);
                toast.success("Reserva creada exitosamente");
                setShowNewReservation(false);
                setSelectedSlot(null);
            } catch (error: any) {
                toast.error(error.message || "Error al crear la reserva");
            }
        });
    };

    const updateStatus = (id: string, newStatus: string) => {
        startTransition(async () => {
            try {
                await changeReservationStatus(id, newStatus);
                toast.success("Estado actualizado con éxito");
                if (detailReservation?.id === id) {
                    setDetailReservation({ ...detailReservation, status: newStatus });
                }
                router.refresh();
            } catch (error: any) {
                toast.error(error.message || "Error al actualizar la reserva");
            }
        });
    };

    const handlePayment = (method: string, details?: any) => {
        if (!paymentReservation) return;
        startTransition(async () => {
            try {
                await payReservation(paymentReservation.id, method, details);
                toast.success("Cobro registrado exitosamente");

                // Update detail modal if it's open
                if (detailReservation?.id === paymentReservation.id) {
                    setDetailReservation({ ...detailReservation, status: "paid" });
                }

                setPaymentReservation(null);
            } catch (error: any) {
                toast.error(error.message || "Error al registrar el cobro");
            }
        });
    };

    const handleWhatsApp = (phone: string, name: string) => {
        const message = encodeURIComponent(
            `¡Hola ${name}! Te recordamos tu reserva en ${complex.name}. ¡Te esperamos! 🏆`
        );
        window.open(`https://wa.me/${phone.replace(/\D/g, "")}?text=${message}`, "_blank");
    };

    const getReservationForSlot = (courtId: string, time: string): any | undefined => {
        return reservations.find((r) => {
            if (r.courtId !== courtId) return false;
            const rStart = format(new Date(r.startTime), "HH:mm");
            const rEnd = format(new Date(r.endTime), "HH:mm");
            return time >= rStart && time < rEnd;
        });
    };

    const isSlotStart = (courtId: string, time: string): boolean => {
        return reservations.some((r) => r.courtId === courtId && format(new Date(r.startTime), "HH:mm") === time);
    };

    const getSlotSpan = (reservation: any): number => {
        const sh = new Date(reservation.startTime).getHours();
        const sm = new Date(reservation.startTime).getMinutes();
        const eh = new Date(reservation.endTime).getHours();
        const em = new Date(reservation.endTime).getMinutes();
        return ((eh * 60 + em) - (sh * 60 + sm)) / 30;
    };

    // Update duration → endTime
    const handleDurationChange = (duration: string) => {
        const [h, m] = newRes.startTime.split(":").map(Number);
        const endMinutes = h * 60 + m + parseInt(duration);
        const endH = Math.floor(endMinutes / 60);
        const endM = endMinutes % 60;
        setNewRes({
            ...newRes,
            duration,
            endTime: `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`,
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Agenda de Reservas</h1>
                    <p className="text-muted-foreground mt-1">
                        Gestión visual de turnos en {complex.name}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        onClick={() => {
                            setNewRes({ customerName: "", customerPhone: "", courtId: "", startTime: "10:00", endTime: "11:00", duration: "60", isRecurring: false });
                            setShowNewReservation(true);
                        }}
                        className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg shadow-emerald-500/20 rounded-xl"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Nueva Reserva
                    </Button>
                </div>
            </div>

            {/* Date Navigation */}
            <Card className="p-4 card-elevated border-border/50">
                <div className="flex items-center justify-between">
                    <Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/reservations?date=${format(subDays(selectedDate, 1), "yyyy-MM-dd")}`)} className="rounded-xl">
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <div className="text-center">
                        <p className="text-xl font-bold capitalize">
                            {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
                        </p>
                        {currentDate === format(new Date(), "yyyy-MM-dd") && (
                            <Badge className="mt-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 rounded-full">
                                Hoy
                            </Badge>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {currentDate !== format(new Date(), "yyyy-MM-dd") && (
                            <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/reservations`)} className="rounded-xl text-xs">
                                Hoy
                            </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/reservations?date=${format(addDays(selectedDate, 1), "yyyy-MM-dd")}`)} className="rounded-xl">
                            <ChevronRight className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Calendar Grid */}
            <Card className={`card-elevated border-border/50 overflow-hidden ${isPending ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="overflow-x-auto">
                    <div className="min-w-[700px] md:min-w-0">
                        {/* Column Headers (Courts) */}
                        <div className="grid sticky top-0 z-10 bg-card border-b border-border" style={{ gridTemplateColumns: `80px repeat(${courts.length}, 1fr)` }}>
                            <div className="p-3 text-xs font-semibold text-muted-foreground border-r border-border flex items-center">
                                <Clock className="w-3.5 h-3.5 mr-1" />
                                Hora
                            </div>
                            {courts.map((court) => (
                                <div key={court.id} className="p-3 text-center border-r border-border last:border-r-0">
                                    <p className="text-sm font-bold">{court.name}</p>
                                    <div className="flex items-center justify-center gap-1 mt-1">
                                        <span className="text-[10px]">{sportEmoji[court.sportType]}</span>
                                        <span className="text-[10px] text-muted-foreground">
                                            ${court.dayRate.toLocaleString()} / ${court.nightRate.toLocaleString()}
                                        </span>
                                    </div>
                                    {court.parentCourtId && (
                                        <Badge variant="secondary" className="mt-1 text-[9px] px-1.5 py-0 rounded-full">
                                            Vinculada
                                        </Badge>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Time Rows */}
                        {timeSlots.map((time) => {
                            const isHour = time.endsWith(":00");
                            const hour = parseInt(time.split(":")[0]);
                            const isNightStart = hour >= 19 || hour < 6;

                            return (
                                <div
                                    key={time}
                                    className="grid border-b border-border/50 last:border-b-0"
                                    style={{ gridTemplateColumns: `80px repeat(${courts.length}, 1fr)` }}
                                >
                                    {/* Time label */}
                                    <div className={`p-2 text-xs border-r border-border flex items-center justify-center ${isHour ? "font-semibold" : "text-muted-foreground text-[10px]"} ${isNightStart ? "bg-indigo-50/50 dark:bg-indigo-500/5" : ""}`}>
                                        {time}
                                        {isNightStart && isHour && <span className="ml-1 text-[9px]">🌙</span>}
                                    </div>

                                    {/* Court cells */}
                                    {courts.map((court) => {
                                        const reservation = getReservationForSlot(court.id, time);
                                        const isStart = reservation && isSlotStart(court.id, time);
                                        const span = reservation && isStart ? getSlotSpan(reservation) : 0;
                                        const isNight = hour >= parseInt(court.nightRateStartTime.split(":")[0]);

                                        if (reservation && !isStart) {
                                            return <div key={court.id} className="border-r border-border/30 last:border-r-0" />;
                                        }

                                        if (reservation && isStart) {
                                            const statusCfg = statusConfig[reservation.status];
                                            return (
                                                <div
                                                    key={court.id}
                                                    className={`border-r border-border/30 last:border-r-0 p-1`}
                                                    style={{ gridRow: `span ${span}` }}
                                                >
                                                    <div
                                                        className={`h-full rounded-xl p-2.5 ${statusCfg.class} cursor-pointer group relative transition-all duration-200 hover:shadow-md`}
                                                        onClick={() => setDetailReservation(reservation)}
                                                    >
                                                        <div className="flex items-start justify-between">
                                                            <div className="min-w-0 text-white">
                                                                <p className="text-xs font-bold truncate">{reservation.customerName}</p>
                                                                <p className="text-[10px] opacity-75">
                                                                    {format(new Date(reservation.startTime), "HH:mm")} — {format(new Date(reservation.endTime), "HH:mm")}
                                                                </p>
                                                            </div>
                                                            <Badge className="text-[9px] px-1.5 py-0 rounded-full shrink-0 ml-1 bg-white/20 border-white/20 text-white" variant="outline">
                                                                {statusCfg.label}
                                                            </Badge>
                                                        </div>
                                                        {reservation.isRecurring && (
                                                            <div className="absolute top-1 right-1">
                                                                <RotateCcw className="w-3 h-3 text-white/50" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div
                                                key={court.id}
                                                className={`border-r border-border/30 last:border-r-0 p-0.5 calendar-slot ${isNight ? "bg-indigo-50/30 dark:bg-indigo-500/3" : ""}`}
                                                onClick={() => handleSlotClick(court.id, time)}
                                            >
                                                <div className="h-full w-full rounded-lg hover:bg-emerald-100/50 dark:hover:bg-emerald-500/10 min-h-[28px] transition-colors" />
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </Card>

            {/* New Reservation Dialog */}
            <Dialog open={showNewReservation} onOpenChange={setShowNewReservation}>
                <DialogContent className="sm:max-w-[480px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Nueva Reserva</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <Label>Nombre del Cliente</Label>
                                <Input
                                    placeholder="Nombre completo"
                                    value={newRes.customerName}
                                    onChange={(e) => setNewRes({ ...newRes, customerName: e.target.value })}
                                    className="mt-1.5 rounded-xl"
                                />
                            </div>
                            <div className="col-span-2">
                                <Label>Teléfono</Label>
                                <Input
                                    placeholder="+54 11 xxxx-xxxx"
                                    value={newRes.customerPhone}
                                    onChange={(e) => setNewRes({ ...newRes, customerPhone: e.target.value })}
                                    className="mt-1.5 rounded-xl"
                                />
                            </div>
                        </div>

                        <div>
                            <Label>Cancha</Label>
                            <Select value={newRes.courtId} onValueChange={(v) => v && setNewRes({ ...newRes, courtId: v })}>
                                <SelectTrigger className="mt-1.5 rounded-xl">
                                    <SelectValue placeholder="Seleccionar cancha">
                                        {newRes.courtId ? courts.find(c => c.id === newRes.courtId)?.name : "Seleccionar cancha"}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {courts.map((court) => (
                                        <SelectItem key={court.id} value={court.id}>
                                            {sportEmoji[court.sportType]} {court.name} — ${court.dayRate.toLocaleString()}/{court.nightRate.toLocaleString()}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <Label>Hora Inicio</Label>
                                <Select value={newRes.startTime} onValueChange={(v) => {
                                    if (!v) return;
                                    const [h, m] = v.split(":").map(Number);
                                    const endMinutes = h * 60 + m + parseInt(newRes.duration);
                                    const endH = Math.floor(endMinutes / 60);
                                    const endM = endMinutes % 60;
                                    setNewRes({ ...newRes, startTime: v, endTime: `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}` });
                                }}>
                                    <SelectTrigger className="mt-1.5 rounded-xl">
                                        <SelectValue>{newRes.startTime || "10:00"}</SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {timeSlots.filter((t) => t.endsWith(":00")).map((t) => {
                                            // Check if this slot is occupied for the selected court
                                            const isOccupied = newRes.courtId ? reservations.some((r) => {
                                                if (r.courtId !== newRes.courtId || r.status === "cancelled") return false;
                                                const rStart = format(new Date(r.startTime), "HH:mm");
                                                const rEnd = format(new Date(r.endTime), "HH:mm");
                                                return t >= rStart && t < rEnd;
                                            }) : false;
                                            return (
                                                <SelectItem key={t} value={t} disabled={isOccupied}>
                                                    {isOccupied ? `🔴 ${t} — Ocupado` : t}
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Duración</Label>
                                <Select value={newRes.duration} onValueChange={(v) => v && handleDurationChange(v)}>
                                    <SelectTrigger className="mt-1.5 rounded-xl">
                                        <SelectValue>{newRes.duration === "120" ? "2 horas" : newRes.duration === "90" ? "1.5 horas" : "1 hora"}</SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="60">1 hora</SelectItem>
                                        <SelectItem value="90">1.5 horas</SelectItem>
                                        <SelectItem value="120">2 horas</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Hora Fin</Label>
                                <Input value={newRes.endTime} readOnly className="mt-1.5 rounded-xl bg-muted" />
                            </div>
                        </div>

                        <Separator />

                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="recurring"
                                checked={newRes.isRecurring}
                                onChange={(e) => setNewRes({ ...newRes, isRecurring: e.target.checked })}
                                className="rounded"
                            />
                            <Label htmlFor="recurring" className="cursor-pointer">
                                <span className="font-semibold">Es Fijo (Recurrente)</span>
                                <br />
                                <span className="text-xs text-muted-foreground">Crea 4 reservas semanales</span>
                            </Label>
                        </div>

                        {newRes.courtId && newRes.startTime && (
                            <Card className="p-3 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 rounded-xl">
                                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                                    💰 Tarifa estimada: ${(() => {
                                        const court = courts.find((c) => c.id === newRes.courtId);
                                        if (!court) return 0;
                                        const startHour = parseInt(newRes.startTime.split(":")[0]);
                                        const isNight = startHour >= parseInt(court.nightRateStartTime.split(":")[0]);
                                        const rate = isNight ? court.nightRate : court.dayRate;
                                        return (rate * Number(newRes.duration) / 60).toLocaleString();
                                    })()}
                                </p>
                            </Card>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNewReservation(false)} className="rounded-xl" disabled={isPending}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleCreateReservation}
                            disabled={!newRes.customerName || !newRes.courtId || isPending}
                            className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl"
                        >
                            {isPending ? "Creando..." : "Crear Reserva"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reservation Detail Modal */}
            <Dialog open={!!detailReservation} onOpenChange={(open) => !open && setDetailReservation(null)}>
                <DialogContent className="sm:max-w-[420px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center justify-between">
                            <span>Detalle de Reserva</span>
                            {detailReservation && (
                                <Badge className={`${statusConfig[detailReservation.status]?.class} rounded-full`}>
                                    {statusConfig[detailReservation.status]?.label}
                                </Badge>
                            )}
                        </DialogTitle>
                    </DialogHeader>

                    {detailReservation && (
                        <div className="space-y-6 py-2">
                            {/* Summary Card */}
                            <Card className={`p-4 rounded-xl border-dashed ${statusConfig[detailReservation.status]?.class}`}>
                                <h3 className="text-lg font-bold mb-1">{detailReservation.customerName}</h3>
                                {detailReservation.customerPhone && (
                                    <p className="text-sm font-medium mb-3 opacity-90">{detailReservation.customerPhone}</p>
                                )}

                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <div>
                                        <p className="text-xs opacity-75 mb-1">Cancha</p>
                                        <p className="font-semibold text-sm">
                                            {courts.find(c => c.id === detailReservation.courtId)?.name || 'Desconocida'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs opacity-75 mb-1">Horario</p>
                                        <p className="font-semibold text-sm flex items-center">
                                            <Clock className="w-3.5 h-3.5 mr-1" />
                                            {format(new Date(detailReservation.startTime), "HH:mm")} - {format(new Date(detailReservation.endTime), "HH:mm")}
                                        </p>
                                    </div>
                                </div>
                            </Card>

                            {/* Financial Summary */}
                            <div className="flex justify-between items-center px-2">
                                <span className="text-sm text-muted-foreground">Total a pagar</span>
                                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                    ${Number(detailReservation.totalAmount).toLocaleString()}
                                </span>
                            </div>

                            {/* Consumptions List */}
                            {detailReservation.sales && detailReservation.sales.length > 0 && (
                                <div className="space-y-2 px-2">
                                    <h4 className="text-sm font-bold flex items-center gap-2">
                                        <ShoppingCart className="w-4 h-4" /> Consumos
                                    </h4>
                                    <div className="bg-muted/50 rounded-xl p-3 space-y-2 border border-border/50">
                                        {detailReservation.sales.flatMap((s: any) => s.items).map((item: any, idx: number) => (
                                            <div key={idx} className="flex justify-between text-xs">
                                                <span>{item.quantity}x {item.product?.name || "Producto"}</span>
                                                <span className="font-semibold">${Number(item.subtotal).toLocaleString()}</span>
                                            </div>
                                        ))}
                                        <div className="pt-2 border-t flex justify-between text-[11px] text-muted-foreground uppercase font-bold tracking-tighter">
                                            <span>Subtotal Consumo</span>
                                            <span className="text-emerald-600 dark:text-emerald-400">
                                                ${Number(detailReservation.consumptionAmount).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Actions Grouped by Status */}
                            <div className="grid grid-cols-2 gap-2 mt-4">
                                {detailReservation.status === "pending" && (
                                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-12" onClick={() => updateStatus(detailReservation.id, "confirmed")} disabled={isPending}>
                                        <Check className="w-4 h-4 mr-2" /> Confirmar
                                    </Button>
                                )}
                                {detailReservation.status === "confirmed" && (
                                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12" onClick={() => updateStatus(detailReservation.id, "in_game")} disabled={isPending}>
                                        <Play className="w-4 h-4 mr-2" /> Iniciar (Check-in)
                                    </Button>
                                )}
                                {detailReservation.status === "in_game" && (
                                    <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-xl h-12" onClick={() => updateStatus(detailReservation.id, "finished")} disabled={isPending}>
                                        <Square className="w-4 h-4 mr-2" /> Finalizar Turno
                                    </Button>
                                )}
                                {(detailReservation.status === "pending" || detailReservation.status === "confirmed") && (
                                    <Button variant="outline" className="w-full rounded-xl h-12 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30" onClick={() => updateStatus(detailReservation.id, "cancelled")} disabled={isPending}>
                                        Cancelar Turno
                                    </Button>
                                )}

                                {detailReservation.customerPhone && (
                                    <Button variant="outline" className="w-full rounded-xl h-12 border-emerald-500/30 text-emerald-600 hover:bg-emerald-50" onClick={() => handleWhatsApp(detailReservation.customerPhone, detailReservation.customerName)}>
                                        <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
                                    </Button>
                                )}
                            </div>

                            {/* Giant Pay Button if Finished */}
                            {detailReservation.status === "finished" && (
                                <Button
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-14 mt-2 text-lg font-bold"
                                    onClick={() => setPaymentReservation(detailReservation)}
                                    disabled={isPending}
                                >
                                    <DollarSign className="w-5 h-5 mr-2" /> Cobrar Turno
                                </Button>
                            )}

                            {detailReservation.status !== "cancelled" && (
                                <Button
                                    variant="outline"
                                    className="w-full mt-2 rounded-xl h-12 border-blue-500/30 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                    onClick={() => {
                                        router.push(`/dashboard/pos?reservationId=${detailReservation.id}`);
                                    }}
                                >
                                    <ShoppingCart className="w-4 h-4 mr-2" /> Agregar Consumo
                                </Button>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <PaymentDialog
                open={!!paymentReservation}
                onOpenChange={(open) => !open && setPaymentReservation(null)}
                totalAmount={paymentReservation?.totalAmount || 0}
                onConfirm={handlePayment}
                isPending={isPending}
            />
        </div>
    );
}
