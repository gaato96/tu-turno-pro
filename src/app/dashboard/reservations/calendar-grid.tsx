"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { ChevronLeft, ChevronRight, Play, Square, DollarSign, X, Phone, MessageCircle } from "lucide-react";
import { format, addDays, subDays, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { createReservation, changeReservationStatus, payReservation, cancelReservation } from "./actions";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
    pending: "bg-amber-400 border-amber-600 text-amber-950 font-bold dark:bg-amber-500 dark:text-amber-950 shadow-sm",
    confirmed: "bg-emerald-500 border-emerald-700 text-white font-bold dark:bg-emerald-600 dark:text-white shadow-sm",
    in_game: "bg-blue-500 border-blue-700 text-white font-bold dark:bg-blue-600 dark:text-white shadow-sm",
    finished: "bg-orange-500 border-orange-700 text-white font-bold dark:bg-orange-600 dark:text-white shadow-sm",
    paid: "bg-slate-500 border-slate-700 text-white font-bold dark:bg-slate-600 dark:text-white shadow-sm",
};

const STATUS_LABELS: Record<string, string> = {
    pending: "Pendiente",
    confirmed: "Confirmada",
    in_game: "En Juego",
    finished: "Finalizada",
    paid: "Pagada",
    cancelled: "Cancelada",
};

const TYPE_LABELS: Record<string, string> = {
    casual: "Casual",
    fixed: "Turno Fijo",
    tournament: "Torneo",
    school: "Escuelita",
    event: "Evento",
};

export function CalendarGrid({ currentDate, complex, courts, initialReservations }: any) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const dateObj = parseISO(currentDate);

    // ── Create Reservation Dialog ──
    const [createOpen, setCreateOpen] = useState(false);
    const [createForm, setCreateForm] = useState({
        courtId: "",
        customerName: "",
        customerPhone: "",
        startTime: "",
        endTime: "",
        notes: "",
        reservationType: "casual",
    });

    // ── View Reservation Dialog ──
    const [viewOpen, setViewOpen] = useState(false);
    const [selectedRes, setSelectedRes] = useState<any>(null);

    // ── Pay Dialog ──
    const [payOpen, setPayOpen] = useState(false);
    const [payMethod, setPayMethod] = useState("cash");

    // Generate 60min slots from opening to closing
    const openH = parseInt(complex.openingTime?.split(":")[0] || "8");
    const closeH = parseInt(complex.closingTime?.split(":")[0] || "23");
    const slots: string[] = [];
    for (let h = openH; h <= closeH; h++) {
        slots.push(`${h.toString().padStart(2, "0")}:00`);
    }

    // ── Navigation ──
    const goDay = (offset: number) => {
        const d = offset > 0 ? addDays(dateObj, offset) : subDays(dateObj, Math.abs(offset));
        router.push(`/dashboard/reservations?date=${format(d, "yyyy-MM-dd")}`);
    };

    // ── Slot Click → Open Create Dialog ──
    const handleSlotClick = (courtId: string, time: string) => {
        const startH = parseInt(time.split(":")[0]);
        const endH = startH + 1;
        setCreateForm({
            courtId,
            customerName: "",
            customerPhone: "",
            startTime: time,
            endTime: `${endH.toString().padStart(2, "0")}:00`,
            notes: "",
            reservationType: "casual",
        });
        setCreateOpen(true);
    };

    // ── Submit Create ──
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        startTransition(async () => {
            try {
                const fd = new FormData();
                fd.append("complexId", complex.id);
                fd.append("courtId", createForm.courtId);
                fd.append("customerName", createForm.customerName);
                fd.append("customerPhone", createForm.customerPhone);
                fd.append("date", currentDate);
                fd.append("startTime", createForm.startTime);
                fd.append("endTime", createForm.endTime);
                fd.append("notes", createForm.notes);
                fd.append("reservationType", createForm.reservationType);
                await createReservation(fd);
                toast.success("Reserva creada");
                setCreateOpen(false);
                router.refresh();
            } catch {
                toast.error("Error al crear reserva");
            }
        });
    };

    // ── Reservation Click → View Dialog ──
    const handleResClick = (res: any) => {
        setSelectedRes(res);
        setViewOpen(true);
    };

    // ── Status Transitions ──
    const handleStatus = async (newStatus: string) => {
        if (!selectedRes) return;
        startTransition(async () => {
            try {
                await changeReservationStatus(selectedRes.id, newStatus);
                toast.success(`Estado cambiado a ${STATUS_LABELS[newStatus]}`);
                setViewOpen(false);
                router.refresh();
            } catch {
                toast.error("Error al cambiar estado");
            }
        });
    };

    const handlePay = async () => {
        if (!selectedRes) return;
        startTransition(async () => {
            try {
                await payReservation(selectedRes.id, payMethod, selectedRes.totalAmount, false);
                toast.success("Pago registrado");
                setPayOpen(false);
                setViewOpen(false);
                router.refresh();
            } catch {
                toast.error("Error al registrar pago");
            }
        });
    };

    const handleCancel = async () => {
        if (!selectedRes) return;
        startTransition(async () => {
            try {
                await cancelReservation(selectedRes.id);
                toast.success("Reserva cancelada");
                setViewOpen(false);
                router.refresh();
            } catch {
                toast.error("Error al cancelar");
            }
        });
    };

    // ── Find reservations per cell ──
    const getResForCell = (courtId: string, time: string) => {
        const slotH = parseInt(time.split(":")[0]);
        return initialReservations.filter((r: any) => {
            if (r.courtId !== courtId) return false;
            const rStart = new Date(r.startTime).getHours();
            const rEnd = new Date(r.endTime).getHours();
            return slotH >= rStart && slotH < rEnd;
        });
    };

    const courtForId = (id: string) => courts.find((c: any) => c.id === id);

    return (
        <div className="flex flex-col h-full">
            {/* ── Header ── */}
            <div className="flex items-center justify-between p-4 border-b bg-card shrink-0">
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" onClick={() => goDay(-1)} className="rounded-lg">
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <div className="text-center min-w-[160px]">
                        <p className="text-lg font-bold capitalize">{format(dateObj, "EEEE", { locale: es })}</p>
                        <p className="text-xs text-muted-foreground">{format(dateObj, "d 'de' MMMM, yyyy", { locale: es })}</p>
                    </div>
                    <Button variant="outline" size="icon" onClick={() => goDay(1)} className="rounded-lg">
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/reservations?date=${format(new Date(), "yyyy-MM-dd")}`)}>
                        Hoy
                    </Button>
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden md:flex items-center gap-3 text-[11px] mr-2">
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Confirmada</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> En Juego</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> A Pagar</span>
                    </div>
                </div>
            </div>

            {/* ── Grid ── */}
            <div className="flex-1 overflow-auto">
                <div className="inline-block min-w-full">
                    {/* Court Headers */}
                    <div className="sticky top-0 z-20 flex border-b">
                        <div className="w-16 shrink-0 border-r bg-muted p-2 text-center text-[10px] font-semibold text-muted-foreground sticky left-0 z-30">
                            HORA
                        </div>
                        {courts.map((court: any) => (
                            <div key={court.id} className="flex-1 min-w-[180px] border-r p-2.5 text-center bg-card border-b-2 border-b-emerald-500/30">
                                <p className="font-bold text-sm">{court.name}</p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{court.sportType}</p>
                            </div>
                        ))}
                    </div>

                    {/* Time Rows */}
                    {slots.map((time) => (
                        <div key={time} className="flex border-b border-border/40 hover:bg-accent/10 transition-colors">
                            <div className="w-16 shrink-0 border-r bg-background p-1.5 text-xs font-mono text-muted-foreground text-center sticky left-0 z-10 flex items-center justify-center">
                                {time}
                            </div>
                            {courts.map((court: any) => {
                                const cellRes = getResForCell(court.id, time);
                                const isFirstSlot = cellRes.length > 0 && new Date(cellRes[0].startTime).getHours() === parseInt(time.split(":")[0]);

                                return (
                                    <div
                                        key={`${time}-${court.id}`}
                                        className="flex-1 min-w-[180px] border-r relative h-[56px] cursor-pointer hover:bg-emerald-500/5 transition-colors p-0.5"
                                        onClick={() => cellRes.length === 0 && handleSlotClick(court.id, time)}
                                    >
                                        {cellRes.length > 0 && isFirstSlot && (
                                            <div
                                                className={`absolute inset-0.5 rounded-lg border-l-4 p-2 cursor-pointer transition-all hover:shadow-md ${STATUS_COLORS[cellRes[0].status] || STATUS_COLORS.confirmed}`}
                                                onClick={(e) => { e.stopPropagation(); handleResClick(cellRes[0]); }}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <span className="font-bold text-xs truncate max-w-[100px]">{cellRes[0].customerName}</span>
                                                    <span className="text-[10px] font-mono opacity-80">${cellRes[0].totalAmount.toLocaleString()}</span>
                                                </div>
                                                <div className="flex items-center justify-between mt-0.5">
                                                    <div className="text-[10px] opacity-70">
                                                        {format(new Date(cellRes[0].startTime), "HH:mm")} - {format(new Date(cellRes[0].endTime), "HH:mm")}
                                                    </div>
                                                    {cellRes[0].reservationType && cellRes[0].reservationType !== 'casual' && (
                                                        <span className="text-[9px] uppercase tracking-widest bg-black/20 px-1.5 py-0.5 rounded opacity-90">
                                                            {TYPE_LABELS[cellRes[0].reservationType] || cellRes[0].reservationType}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {cellRes.length > 0 && !isFirstSlot && (
                                            <div
                                                className={`absolute inset-0.5 rounded-lg border-l-4 opacity-60 cursor-pointer ${STATUS_COLORS[cellRes[0].status] || STATUS_COLORS.confirmed}`}
                                                onClick={(e) => { e.stopPropagation(); handleResClick(cellRes[0]); }}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Create Reservation Dialog ── */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nueva Reserva</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 col-span-2">
                                <Label>Cancha</Label>
                                <Select value={createForm.courtId} onValueChange={(v) => setCreateForm({ ...createForm, courtId: v ?? "" })}>
                                    <SelectTrigger><SelectValue placeholder="Seleccionar cancha" /></SelectTrigger>
                                    <SelectContent>
                                        {courts.map((c: any) => (
                                            <SelectItem key={c.id} value={c.id}>{c.name} ({c.sportType})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 col-span-2">
                                <Label>Tipo de Reserva</Label>
                                <Select value={createForm.reservationType} onValueChange={(v) => setCreateForm({ ...createForm, reservationType: v ?? "casual" })}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="casual">Turno Casual</SelectItem>
                                        <SelectItem value="fixed">Turno Fijo</SelectItem>
                                        <SelectItem value="tournament">Torneo</SelectItem>
                                        <SelectItem value="school">Escuelita</SelectItem>
                                        <SelectItem value="event">Evento</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 col-span-2">
                                <Label>Nombre del Cliente</Label>
                                <Input required value={createForm.customerName} onChange={(e) => setCreateForm({ ...createForm, customerName: e.target.value })} placeholder="Nombre completo" />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <Label>Teléfono (opcional)</Label>
                                <Input value={createForm.customerPhone} onChange={(e) => setCreateForm({ ...createForm, customerPhone: e.target.value })} placeholder="+54 9 ..." />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Hora Inicio</Label>
                                <Input required type="time" value={createForm.startTime} onChange={(e) => setCreateForm({ ...createForm, startTime: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Hora Fin</Label>
                                <Input required type="time" value={createForm.endTime} onChange={(e) => setCreateForm({ ...createForm, endTime: e.target.value })} />
                            </div>
                        </div>

                        {createForm.courtId && (
                            <div className="p-3 bg-accent/50 rounded-xl text-sm border">
                                <p className="text-muted-foreground">
                                    Tarifa diurna: <strong>${courtForId(createForm.courtId)?.dayRate.toLocaleString()}</strong> |
                                    Tarifa nocturna: <strong>${courtForId(createForm.courtId)?.nightRate.toLocaleString()}</strong>
                                </p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Notas (opcional)</Label>
                            <Input value={createForm.notes} onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })} placeholder="Observaciones..." />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                {isPending ? "Creando..." : "Crear Reserva"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ── View Reservation Dialog ── */}
            <Dialog open={viewOpen} onOpenChange={setViewOpen}>
                <DialogContent>
                    {selectedRes && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-3">
                                    <span>{selectedRes.customerName}</span>
                                    <Badge className={`text-[10px] ${STATUS_COLORS[selectedRes.status]}`}>
                                        {STATUS_LABELS[selectedRes.status]}
                                    </Badge>
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-2">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-muted-foreground">Cancha</p>
                                        <p className="font-semibold">{selectedRes.court?.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Horario</p>
                                        <p className="font-semibold">{format(new Date(selectedRes.startTime), "HH:mm")} - {format(new Date(selectedRes.endTime), "HH:mm")}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Monto Cancha</p>
                                        <p className="font-semibold">${selectedRes.courtAmount.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Total</p>
                                        <p className="font-bold text-lg">${selectedRes.totalAmount.toLocaleString()}</p>
                                    </div>
                                </div>

                                {selectedRes.customerPhone && (
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => window.open(`tel:${selectedRes.customerPhone}`)}>
                                            <Phone className="w-3.5 h-3.5" /> Llamar
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="gap-1.5 text-xs text-green-600" 
                                            onClick={() => {
                                                const tel = selectedRes.customerPhone?.replace(/[^0-9]/g, "");
                                                const dDate = format(new Date(selectedRes.startTime), "dd/MM/yyyy");
                                                const dTime = format(new Date(selectedRes.startTime), "HH:mm");
                                                const msg = encodeURIComponent(`Hola ${selectedRes.customerName}, te recordamos tu turno en *${complex.name}*.\n\n📅 Fecha: ${dDate}\n⏰ Hora: ${dTime}hs\n🏟️ Cancha: ${selectedRes.court?.name}\n💰 Total: $${selectedRes.totalAmount.toLocaleString()}\n\n¡Gracias por elegirnos!`);
                                                window.open(`https://wa.me/${tel}?text=${msg}`);
                                            }}
                                        >
                                            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                                        </Button>
                                    </div>
                                )}

                                {selectedRes.notes && (
                                    <div className="p-3 bg-accent/50 rounded-lg text-sm">
                                        <p className="text-muted-foreground text-xs mb-1">Notas:</p>
                                        <p>{selectedRes.notes}</p>
                                    </div>
                                )}

                                {/* Action Buttons based on status */}
                                <div className="flex flex-wrap gap-2 pt-2 border-t">
                                    {selectedRes.status === "confirmed" && (
                                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5" disabled={isPending} onClick={() => handleStatus("in_game")}>
                                            <Play className="w-3.5 h-3.5" /> Check-in (En Juego)
                                        </Button>
                                    )}
                                    {selectedRes.status === "in_game" && (
                                        <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white gap-1.5" disabled={isPending} onClick={() => handleStatus("finished")}>
                                            <Square className="w-3.5 h-3.5" /> Terminar Turno
                                        </Button>
                                    )}
                                    {selectedRes.status === "finished" && (
                                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5" disabled={isPending} onClick={() => { setPayOpen(true); }}>
                                            <DollarSign className="w-3.5 h-3.5" /> Cobrar
                                        </Button>
                                    )}
                                    {["confirmed", "pending"].includes(selectedRes.status) && (
                                        <Button variant="destructive" size="sm" className="gap-1.5" disabled={isPending} onClick={handleCancel}>
                                            <X className="w-3.5 h-3.5" /> Cancelar Reserva
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* ── Pay Dialog ── */}
            <Dialog open={payOpen} onOpenChange={setPayOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Registrar Pago</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-200 dark:border-emerald-500/20">
                            <p className="text-sm text-muted-foreground">Total a cobrar</p>
                            <p className="text-3xl font-bold text-emerald-600">${selectedRes?.totalAmount.toLocaleString()}</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Método de Pago</Label>
                            <Select value={payMethod} onValueChange={(v) => setPayMethod(v ?? "cash")}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cash">Efectivo</SelectItem>
                                    <SelectItem value="card">Tarjeta</SelectItem>
                                    <SelectItem value="transfer">Transferencia</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setPayOpen(false)}>Cancelar</Button>
                            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isPending} onClick={handlePay}>
                                {isPending ? "Procesando..." : "Confirmar Pago"}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
