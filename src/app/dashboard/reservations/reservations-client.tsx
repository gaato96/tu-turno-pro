"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createReservation, changeReservationStatus, payReservation, getAvailableSlots, addDiscount, removeDiscount } from "./actions";
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
    Percent,
    Trash2,
    Users,
} from "lucide-react";
import { format, addDays, subDays, isToday, startOfWeek, eachDayOfInterval } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CustomerSelector } from "@/components/dashboard/customer-selector";


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
    initialEvents,
    currentDate,
    isNew,
    openResId,
    userRole,
}: {
    complex: any;
    courts: Court[];
    initialReservations: any[];
    initialEvents: any[];
    currentDate: string;
    isNew?: boolean;
    openResId?: string;
    userRole?: string;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    // Use current date from URL, normalized to midday to avoid timezone shifts
    const [selectedDate, setSelectedDate] = useState(new Date(currentDate + "T12:00:00"));

    useEffect(() => {
        setSelectedDate(new Date(currentDate + "T12:00:00"));
    }, [currentDate]);

    const [viewType, setViewType] = useState<"day" | "week" | "list">("day");
    const [selectedCourtForWeek, setSelectedCourtForWeek] = useState<string>(courts[0]?.id || "");
    const [showNewReservation, setShowNewReservation] = useState(isNew || false);



    const [selectedSlot, setSelectedSlot] = useState<{ courtId: string; time: string } | null>(null);
    const [reservations, setReservations] = useState(initialReservations);

    // Sync state when props change
    useEffect(() => {
        setReservations(initialReservations);
    }, [initialReservations]);

    // Events state
    const [events] = useState(initialEvents);

    // Check if a time slot is blocked by an event (applies to ALL courts)
    const getEventForSlot = (time: string): any | undefined => {
        return events.find((ev: any) => {
            const evStart = format(new Date(ev.startTime), "HH:mm");
            const evEnd = format(new Date(ev.endTime), "HH:mm");
            return time >= evStart && time < evEnd;
        });
    };

    const isEventStart = (time: string): boolean => {
        return events.some((ev: any) => format(new Date(ev.startTime), "HH:mm") === time);
    };

    // New reservation form state
    const [newRes, setNewRes] = useState({
        customerName: "",
        customerPhone: "",
        customerId: "" as string | undefined,
        courtId: "",
        date: currentDate,
        startTime: "",
        endTime: "",
        duration: "60",
        depositAmount: "",
        paymentMethod: "cash",
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

    // Discount form state
    const [discountDesc, setDiscountDesc] = useState("");
    const [discountAmount, setDiscountAmount] = useState("");

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
            if (r.courtId !== courtId || r.status === "cancelled") return false;
            const rStart = format(new Date(r.startTime), "HH:mm");
            const rEnd = format(new Date(r.endTime), "HH:mm");
            return time >= rStart && time < rEnd;
        });
        if (occupied) return;

        // Block if an event covers this slot
        if (getEventForSlot(time)) {
            toast.error("Este horario está bloqueado por un evento.");
            return;
        }

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
            customerId: undefined,
            courtId,
            date: currentDate,
            startTime: time,
            endTime,
            duration: "60",
            depositAmount: "",
            paymentMethod: "cash",
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
                if (newRes.customerId) formData.append("customerId", newRes.customerId);
                formData.append("date", newRes.date); // Use selected date in form
                formData.append("startTime", newRes.startTime);
                formData.append("endTime", newRes.endTime);

                if (Number(newRes.depositAmount) > 0) {
                    formData.append("depositAmount", newRes.depositAmount);
                    formData.append("paymentMethod", newRes.paymentMethod);
                }

                if (newRes.isRecurring) {
                    formData.append("isRecurring", "true");
                    formData.append("reservationType", "fixed");
                }


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

    const handlePayment = (method: string, amount: number, leaveOnAccount: boolean, details?: any) => {
        if (!paymentReservation) return;
        startTransition(async () => {
            try {
                await payReservation(paymentReservation.id, method, amount, leaveOnAccount, details);
                toast.success("Cobro registrado exitosamente");

                setPaymentReservation(null);

                // We reload to get the latest updated fields like paidAmount and status
                window.location.reload();
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

    const handleAddDiscount = (reservationId: string) => {
        if (!discountDesc.trim() || !discountAmount || Number(discountAmount) <= 0) {
            toast.error("Ingresá concepto y monto del descuento");
            return;
        }
        startTransition(async () => {
            try {
                await addDiscount(reservationId, discountDesc.trim(), Number(discountAmount));
                toast.success("Descuento aplicado");
                setDiscountDesc("");
                setDiscountAmount("");
                setDetailReservation(null);
                router.refresh();
            } catch (error: any) {
                toast.error(error.message || "Error al agregar descuento");
            }
        });
    };

    const handleRemoveDiscount = (discountId: string) => {
        startTransition(async () => {
            try {
                await removeDiscount(discountId);
                toast.success("Descuento eliminado");
                setDetailReservation(null);
                router.refresh();
            } catch (error: any) {
                toast.error(error.message || "Error al eliminar descuento");
            }
        });
    };

    const getReservationForSlot = (courtId: string, time: string, dateStr?: string): any | undefined => {
        return reservations.find((r) => {
            if (r.courtId !== courtId) return false;
            if (dateStr && r.date.split("T")[0] !== dateStr) return false;

            // To fix timezone shifts, we treat everything as local time strings
            const rStart = format(new Date(r.startTime), "HH:mm");
            const rEnd = format(new Date(r.endTime), "HH:mm");
            return r.status !== "cancelled" && time >= rStart && time < rEnd;
        });
    };

    const isSlotStart = (courtId: string, time: string, dateStr?: string): boolean => {
        return reservations.some((r) => {
            if (r.courtId !== courtId) return false;
            if (dateStr && r.date.split("T")[0] !== dateStr) return false;
            return format(new Date(r.startTime), "HH:mm") === time;
        });
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
                    <div className="flex bg-muted p-1 rounded-xl mr-2">
                        <Button
                            variant={viewType === "day" ? "secondary" : "ghost"}
                            size="sm"
                            className="rounded-lg text-xs"
                            onClick={() => setViewType("day")}
                        >
                            Día
                        </Button>
                        <Button
                            variant={viewType === "week" ? "secondary" : "ghost"}
                            size="sm"
                            className="rounded-lg text-xs"
                            onClick={() => setViewType("week")}
                        >
                            Semana
                        </Button>
                        {userRole === "admin" && (
                            <Button
                                variant={viewType === "list" ? "secondary" : "ghost"}
                                size="sm"
                                className="rounded-lg text-xs text-amber-700 dark:text-amber-500"
                                onClick={() => setViewType("list")}
                            >
                                Registro
                            </Button>
                        )}
                    </div>
                    <Button
                        onClick={() => {
                            setNewRes({ ...newRes, customerName: "", customerPhone: "", customerId: undefined, courtId: courts[0]?.id || "", date: currentDate, startTime: "10:00", endTime: "11:00", duration: "60", isRecurring: false });
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
                    <Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/reservations?date=${format(subDays(selectedDate, viewType === "week" ? 7 : 1), "yyyy-MM-dd")}`)} className="rounded-xl">
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
                        <Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/reservations?date=${format(addDays(selectedDate, viewType === "week" ? 7 : 1), "yyyy-MM-dd")}`)} className="rounded-xl">
                            <ChevronRight className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Calendar Grid */}
            <Card className={`card-elevated border-border/50 overflow-hidden ${isPending ? 'opacity-50 pointer-events-none' : ''}`}>
                {viewType === "day" ? (
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
                                        <div className={`p-2 text-xs border-r border-border flex items-center justify-center ${isHour ? "font-semibold" : "text-muted-foreground text-[10px]"} ${isNightStart ? "bg-indigo-50/50 dark:bg-indigo-500/5" : ""}`}>
                                            {time}
                                        </div>

                                        {courts.map((court, courtIndex) => {
                                            // Check event FIRST (events block ALL courts)
                                            const eventBlock = getEventForSlot(time);
                                            const isEvStart = eventBlock && isEventStart(time);

                                            if (eventBlock && !isEvStart) return <div key={court.id} className="border-r border-border/30 last:border-r-0" />;

                                            if (eventBlock && isEvStart) {
                                                const evSpan = (() => {
                                                    const s = new Date(eventBlock.startTime);
                                                    const e = new Date(eventBlock.endTime);
                                                    return ((e.getHours() * 60 + e.getMinutes()) - (s.getHours() * 60 + s.getMinutes())) / 30;
                                                })();
                                                return (
                                                    <div key={court.id} className="border-r border-border/30 last:border-r-0 p-1" style={{ gridRow: `span ${evSpan}` }}>
                                                        <div className="h-full rounded-xl p-2.5 bg-red-500/80 dark:bg-red-600/60 border border-red-600 cursor-default">
                                                            {courtIndex === 0 && (
                                                                <>
                                                                    <p className="text-xs font-bold truncate text-white">🎉 {eventBlock.name}</p>
                                                                    <p className="text-[10px] opacity-80 text-white">{format(new Date(eventBlock.startTime), "HH:mm")} — {format(new Date(eventBlock.endTime), "HH:mm")}</p>
                                                                </>
                                                            )}
                                                            {courtIndex > 0 && (
                                                                <p className="text-[10px] font-semibold text-white/70 truncate">BLOQUEADO</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            const reservation = getReservationForSlot(court.id, time);
                                            const isStart = reservation && isSlotStart(court.id, time);
                                            const span = reservation && isStart ? getSlotSpan(reservation) : 0;
                                            const isNight = hour >= parseInt(court.nightRateStartTime.split(":")[0]);

                                            if (reservation && !isStart) return <div key={court.id} className="border-r border-border/30 last:border-r-0" />;

                                            if (reservation && isStart) {
                                                const statusCfg = statusConfig[reservation.status];
                                                const restypeClass = `restype-${reservation.reservationType || "casual"}`;
                                                return (
                                                    <div key={court.id} className="border-r border-border/30 last:border-r-0 p-1" style={{ gridRow: `span ${span}` }}>
                                                        <div className={`h-full rounded-xl p-2.5 ${statusCfg.class} ${restypeClass} cursor-pointer group relative transition-all duration-200 hover:shadow-md`} onClick={() => setDetailReservation(reservation)}>
                                                            <p className="text-xs font-bold truncate">{reservation.customerName}</p>
                                                            <p className="text-[10px] opacity-75">{format(new Date(reservation.startTime), "HH:mm")} — {format(new Date(reservation.endTime), "HH:mm")}</p>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div key={court.id} className={`border-r border-border/30 last:border-r-0 p-0.5 calendar-slot ${isNight ? "bg-indigo-50/30 dark:bg-indigo-500/3" : ""}`} onClick={() => handleSlotClick(court.id, time)}>
                                                    <div className="h-full w-full rounded-lg hover:bg-emerald-100/50 dark:hover:bg-emerald-500/10 min-h-[28px] transition-colors" />
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : viewType === "week" ? (
                    <div className="flex flex-col">
                        <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Label className="text-xs">Cancha:</Label>
                                <Select value={selectedCourtForWeek} onValueChange={(v: string | null) => { if (v) setSelectedCourtForWeek(v); }}>


                                    <SelectTrigger className="w-[180px] h-8 text-xs rounded-lg">
                                        <SelectValue>{courts.find(c => c.id === selectedCourtForWeek)?.name || "Seleccionar Cancha"}</SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {courts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <p className="text-xs text-muted-foreground">Vista de 7 días (Lunes a Domingo)</p>
                        </div>
                        <div className="overflow-x-auto">
                            <div className="min-w-[800px]">
                                {/* Week Days Header */}
                                {(() => {
                                    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
                                    const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });

                                    return (
                                        <>
                                            <div className="grid sticky top-0 z-10 bg-card border-b border-border" style={{ gridTemplateColumns: `80px repeat(7, 1fr)` }}>
                                                <div className="p-3 text-xs font-semibold text-muted-foreground border-r border-border" />
                                                {weekDays.map((day) => (
                                                    <div key={day.toString()} className={cn("p-3 text-center border-r border-border last:border-r-0", isToday(day) && "bg-emerald-50/50 dark:bg-emerald-500/5")}>

                                                        <p className="text-[10px] uppercase font-medium text-muted-foreground">{format(day, "eee", { locale: es })}</p>
                                                        <p className="text-sm font-bold">{format(day, "d")}</p>
                                                    </div>
                                                ))}
                                            </div>
                                            {timeSlots.map((time) => {
                                                const isHour = time.endsWith(":00");
                                                return (
                                                    <div key={time} className="grid border-b border-border/40" style={{ gridTemplateColumns: `80px repeat(7, 1fr)` }}>
                                                        <div className={`p-2 text-[10px] border-r border-border flex items-center justify-center ${isHour ? "font-semibold" : "text-muted-foreground"}`}>
                                                            {time}
                                                        </div>
                                                        {weekDays.map((day) => {
                                                            const dStr = format(day, "yyyy-MM-dd");
                                                            const reservation = getReservationForSlot(selectedCourtForWeek, time, dStr);
                                                            const isStart = reservation && isSlotStart(selectedCourtForWeek, time, dStr);
                                                            const span = reservation && isStart ? getSlotSpan(reservation) : 0;

                                                            if (reservation && !isStart) return <div key={day.toString()} className="border-r border-border/30 last:border-r-0" />;

                                                            if (reservation && isStart) {
                                                                const statusCfg = statusConfig[reservation.status];
                                                                const restypeClass = `restype-${reservation.reservationType || "casual"}`;
                                                                return (
                                                                    <div key={day.toString()} className="border-r border-border/30 last:border-r-0 p-1" style={{ gridRow: `span ${span}` }}>
                                                                        <div className={`h-full rounded-lg p-1.5 ${statusCfg.class} ${restypeClass} cursor-pointer transition-all hover:brightness-110`} onClick={() => setDetailReservation(reservation)}>
                                                                            <p className="text-[9px] font-bold truncate">{reservation.customerName}</p>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }

                                                            return (
                                                                <div
                                                                    key={day.toString()}
                                                                    className={cn("border-r border-border/30 last:border-r-0 p-0.5 min-h-[32px] hover:bg-muted/30 cursor-pointer", isToday(day) && "bg-emerald-50/20")}
                                                                    onClick={() => {

                                                                        // Custom handleSlotClick for week view
                                                                        router.push(`/dashboard/reservations?date=${dStr}&new=true`);
                                                                    }}
                                                                >
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                ) : viewType === "list" && userRole === "admin" ? (
                    <div className="flex flex-col">
                        <div className="p-4 border-b bg-muted/30">
                            <h3 className="font-bold">Registro de Turnos ({format(selectedDate, "dd/MM/yyyy")})</h3>
                            <p className="text-xs text-muted-foreground">Vista de todos los turnos del día corriente. Solo visible para administradores.</p>
                        </div>

                        {/* User Management Summary - Turnos por usuario */}
                        {reservations.length > 0 && (
                            <div className="p-4 border-b bg-emerald-50/30 dark:bg-emerald-500/5">
                                <h4 className="text-sm font-bold flex items-center gap-2 mb-3">
                                    <Users className="w-4 h-4 text-emerald-600" />
                                    Turnos por Usuario
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {(() => {
                                        const userCounts: Record<string, number> = {};
                                        reservations.forEach((r: any) => {
                                            const userName = r.user?.name || "Cliente / Sistema";
                                            userCounts[userName] = (userCounts[userName] || 0) + 1;
                                        });
                                        return Object.entries(userCounts)
                                            .sort((a, b) => b[1] - a[1])
                                            .map(([name, count]) => (
                                                <Badge key={name} variant="secondary" className="rounded-full px-3 py-1 text-xs">
                                                    {name}: <span className="font-bold ml-1">{count}</span>
                                                </Badge>
                                            ));
                                    })()}
                                </div>
                            </div>
                        )}

                        <div className="p-4">
                            {reservations.length === 0 ? (
                                <p className="text-sm text-center py-8 text-muted-foreground">No hay turnos registrados para esta fecha.</p>
                            ) : (
                                <div className="space-y-2">
                                    {reservations.map((r: any) => (
                                        <div key={r.id} className={cn("flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border bg-card hover:bg-muted/50 transition-colors cursor-pointer", r.status === "cancelled" && "opacity-60 grayscale border-dashed")} onClick={() => setDetailReservation(r)}>
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                                                <div className="flex items-center gap-2">
                                                    <Badge className={`${statusConfig[r.status]?.class} rounded-full`}>{statusConfig[r.status]?.label}</Badge>
                                                    <span className="text-sm font-bold">{format(new Date(r.startTime), "HH:mm")} - {format(new Date(r.endTime), "HH:mm")}</span>
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm">{r.customerName}</p>
                                                    <p className="text-xs text-muted-foreground">{courts.find(c => c.id === r.courtId)?.name}</p>
                                                </div>
                                            </div>
                                            <div className="mt-2 sm:mt-0 flex items-center gap-3">
                                                <Badge variant="outline" className="rounded-full text-[10px] shrink-0">
                                                    {r.user?.name || "Cliente / Sistema"}
                                                </Badge>
                                                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">${Number(r.paidAmount).toLocaleString()} <span className="text-muted-foreground font-normal text-xs">/ ${Number(r.totalAmount).toLocaleString()}</span></p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : null}
            </Card>


            {/* New Reservation Dialog */}
            <Dialog open={showNewReservation} onOpenChange={setShowNewReservation}>
                <DialogContent className="sm:max-w-[480px] rounded-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
                    <DialogHeader className="p-6 pb-2">
                        <DialogTitle className="text-xl font-bold">Nueva Reserva</DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto px-6 py-2">
                        <div className="space-y-6 pb-6 pt-2">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <Label className="block mb-2">Buscar o Registrar Cliente</Label>
                                    <CustomerSelector
                                        onSelect={(c) => setNewRes({ ...newRes, customerName: c.name, customerPhone: c.phone, customerId: c.id })}
                                        initialValue={newRes.customerName}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <Label>Fecha de la Reserva</Label>
                                    <Input
                                        type="date"
                                        value={newRes.date}
                                        onChange={(e) => setNewRes({ ...newRes, date: e.target.value })}
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

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Seña / Abono Inicial (Opcional)</Label>
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        value={newRes.depositAmount}
                                        onChange={(e) => setNewRes({ ...newRes, depositAmount: e.target.value })}
                                        className="mt-1.5 rounded-xl"
                                    />
                                </div>
                                <div>
                                    <Label>Método de Pago</Label>
                                    <Select value={newRes.paymentMethod} onValueChange={(v) => v && setNewRes({ ...newRes, paymentMethod: v })}>
                                        <SelectTrigger className="mt-1.5 rounded-xl">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="cash">Efectivo</SelectItem>
                                            <SelectItem value="card">Tarjeta / Mercadopago</SelectItem>
                                            <SelectItem value="transfer">Transferencia</SelectItem>
                                        </SelectContent>
                                    </Select>
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
                                    <span className="text-xs text-muted-foreground">Crea 52 reservas semanales (1 año)</span>
                                </Label>
                            </div>

                            {newRes.courtId && newRes.startTime && (
                                <Card className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 rounded-xl">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Tarifa estimada</p>
                                    <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
                                        ${(() => {
                                            const court = courts.find((c) => c.id === newRes.courtId);
                                            if (!court) return "0";

                                            // Calculate mixed rate (Day/Night)
                                            const startMin = parseInt(newRes.startTime.split(":")[0]) * 60 + parseInt(newRes.startTime.split(":")[1] || "0");
                                            const duration = parseInt(newRes.duration);
                                            const endMin = startMin + duration;

                                            const nightStartMin = parseInt(court.nightRateStartTime.split(":")[0]) * 60 + parseInt(court.nightRateStartTime.split(":")[1] || "0");

                                            let total = 0;
                                            // Calculate in 30min steps
                                            for (let i = startMin; i < endMin; i += 30) {
                                                const isNight = i >= nightStartMin;
                                                const ratePer30 = (isNight ? court.nightRate : court.dayRate) / 2;
                                                total += ratePer30;
                                            }
                                            return total.toLocaleString();
                                        })()}
                                    </p>
                                </Card>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="p-6 pt-2 border-t shrink-0">
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
                <DialogContent className="sm:max-w-[420px] rounded-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
                    <DialogHeader className="p-6 pb-2 shrink-0">
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
                        <div className="flex-1 overflow-y-auto px-6 py-2">
                            <div className="space-y-6 pb-6">
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

                                {/* Gestión Info */}
                                <div className="flex items-center gap-2 p-3 bg-muted/60 border border-border rounded-xl">
                                    <div className="bg-primary/10 p-2 rounded-lg">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Gestionado por</p>
                                        <p className="text-sm font-semibold text-foreground">{detailReservation.user?.name || "Cliente / Sistema"}</p>
                                    </div>
                                </div>

                                {/* Financial Summary */}
                                {/* Financial Summary */}
                                <div className="flex flex-col gap-2 px-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Total de la reserva</span>
                                        <span className={`text-xl font-bold ${Number(detailReservation.paidAmount) === 0 ? "text-emerald-600 dark:text-emerald-400 text-2xl" : ""}`}>
                                            ${Number(detailReservation.totalAmount).toLocaleString()}
                                        </span>
                                    </div>
                                    {Number(detailReservation.paidAmount) > 0 && (
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground">Monto abonado</span>
                                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                                - ${Number(detailReservation.paidAmount).toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                    {Number(detailReservation.paidAmount) > 0 && Number(detailReservation.totalAmount) - Number(detailReservation.paidAmount) > 0 && (
                                        <div className="flex justify-between items-center pt-2 border-t border-border/50">
                                            <span className="text-sm font-semibold">Restante a pagar</span>
                                            <span className="text-2xl font-bold text-destructive">
                                                ${Math.max(0, Number(detailReservation.totalAmount) - Number(detailReservation.paidAmount)).toLocaleString()}
                                            </span>
                                        </div>
                                    )}
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

                                {/* Discounts Section */}
                                {detailReservation.status !== "cancelled" && detailReservation.status !== "paid" && (
                                    <div className="space-y-2 px-2">
                                        <h4 className="text-sm font-bold flex items-center gap-2">
                                            <Percent className="w-4 h-4" /> Descuentos
                                        </h4>

                                        {/* Existing discounts */}
                                        {detailReservation.discounts && detailReservation.discounts.length > 0 && (
                                            <div className="bg-amber-50/50 dark:bg-amber-500/5 rounded-xl p-3 space-y-2 border border-amber-200/50 dark:border-amber-500/20">
                                                {detailReservation.discounts.map((d: any) => (
                                                    <div key={d.id} className="flex items-center justify-between text-xs">
                                                        <span className="text-muted-foreground">{d.description}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold text-red-600 dark:text-red-400">-${Number(d.amount).toLocaleString()}</span>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-5 w-5 text-destructive hover:text-destructive"
                                                                onClick={() => handleRemoveDiscount(d.id)}
                                                                disabled={isPending}
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Add new discount */}
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="Concepto..."
                                                value={discountDesc}
                                                onChange={(e) => setDiscountDesc(e.target.value)}
                                                className="text-xs h-8 rounded-lg flex-1"
                                            />
                                            <Input
                                                type="number"
                                                placeholder="$"
                                                value={discountAmount}
                                                onChange={(e) => setDiscountAmount(e.target.value)}
                                                className="text-xs h-8 rounded-lg w-24"
                                            />
                                            <Button
                                                size="sm"
                                                className="h-8 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs"
                                                onClick={() => handleAddDiscount(detailReservation.id)}
                                                disabled={isPending || !discountDesc || !discountAmount}
                                            >
                                                Aplicar
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Show existing discounts for paid/cancelled (read-only) */}
                                {(detailReservation.status === "paid" || detailReservation.status === "cancelled") && detailReservation.discounts && detailReservation.discounts.length > 0 && (
                                    <div className="space-y-2 px-2">
                                        <h4 className="text-sm font-bold flex items-center gap-2">
                                            <Percent className="w-4 h-4" /> Descuentos
                                        </h4>
                                        <div className="bg-amber-50/50 dark:bg-amber-500/5 rounded-xl p-3 space-y-2 border border-amber-200/50 dark:border-amber-500/20">
                                            {detailReservation.discounts.map((d: any) => (
                                                <div key={d.id} className="flex justify-between text-xs">
                                                    <span className="text-muted-foreground">{d.description}</span>
                                                    <span className="font-semibold text-red-600 dark:text-red-400">-${Number(d.amount).toLocaleString()}</span>
                                                </div>
                                            ))}
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
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <PaymentDialog
                open={!!paymentReservation}
                onOpenChange={(open) => !open && setPaymentReservation(null)}
                totalAmount={(paymentReservation?.totalAmount || 0) - (paymentReservation?.paidAmount || 0)}
                hasCustomer={!!paymentReservation?.customerId}
                onConfirm={handlePayment}
                isPending={isPending}
            />
        </div>
    );
}
