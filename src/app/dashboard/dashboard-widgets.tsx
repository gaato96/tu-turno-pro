"use client";

import { useTransition, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Timer, Play, Clock, AlertCircle, Square, DollarSign, Activity, MessageCircle, ShoppingCart, Check, X } from "lucide-react";
import { changeReservationStatus, payReservation } from "./reservations/actions";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { PaymentDialog } from "@/components/payment-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const statusConfig: Record<string, { label: string; class: string }> = {
    pending: { label: "Pendiente", class: "status-pending" },
    confirmed: { label: "Confirmada", class: "status-confirmed" },
    in_game: { label: "En Juego", class: "status-in_game" },
    finished: { label: "Finalizada", class: "status-finished" },
    paid: { label: "Pagada", class: "status-paid" },
    cancelled: { label: "Cancelada", class: "status-cancelled" },
};

export function DashboardReservationModal({ reservation, onClose }: { reservation: any | null, onClose: () => void }) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const [paymentOpen, setPaymentOpen] = useState(false);

    if (!reservation) return null;

    const handleWhatsApp = () => {
        if (!reservation.customerPhone) return;
        const msg = encodeURIComponent(`¡Hola ${reservation.customerName}! Te recordamos tu reserva de la cancha ${reservation.courtName}. ¡Te esperamos! 🏆`);
        window.open(`https://wa.me/${reservation.customerPhone.replace(/\D/g, "")}?text=${msg}`, "_blank");
    };

    const updateStatus = (newStatus: string) => {
        startTransition(async () => {
            try {
                await changeReservationStatus(reservation.id, newStatus);
                toast.success("Estado actualizado con éxito");
                router.refresh();
                onClose();
            } catch (e: any) {
                toast.error(e.message || "Error al actualizar");
            }
        });
    };

    const handlePayment = (method: string, amount: number, leaveOnAccount: boolean, details?: any) => {
        startTransition(async () => {
            try {
                await payReservation(reservation.id, method, amount, leaveOnAccount, details);
                toast.success("Cobro registrado exitosamente");
                setPaymentOpen(false);
                router.refresh();
                onClose();
            } catch (error: any) {
                toast.error(error.message || "Error al registrar el cobro");
            }
        });
    };

    return (
        <Dialog open={!!reservation} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[420px] rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center justify-between">
                        <span>Detalle de Reserva</span>
                        <Badge className={`${statusConfig[reservation.status]?.class} rounded-full`}>
                            {statusConfig[reservation.status]?.label || "Activa"}
                        </Badge>
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-2">
                    <Card className={`p-4 rounded-xl border-dashed ${statusConfig[reservation.status]?.class || ""}`}>
                        <h3 className="text-lg font-bold mb-1">{reservation.customerName}</h3>
                        {reservation.customerPhone && (
                            <p className="text-sm font-medium mb-3 opacity-90">{reservation.customerPhone}</p>
                        )}

                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <div>
                                <p className="text-xs opacity-75 mb-1">Cancha</p>
                                <p className="font-semibold text-sm">{reservation.courtName}</p>
                            </div>
                            <div>
                                <p className="text-xs opacity-75 mb-1">Horario</p>
                                <p className="font-semibold text-sm flex items-center">
                                    <Clock className="w-3.5 h-3.5 mr-1" />
                                    {new Date(reservation.startTime).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                                    {" - "}
                                    {new Date(reservation.endTime).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                                </p>
                            </div>
                        </div>
                    </Card>

                    {/* Consumptions List */}
                    {reservation.sales && reservation.sales.length > 0 && (
                        <div className="space-y-2 px-2">
                            <h4 className="text-sm font-bold flex items-center gap-2 text-muted-foreground">
                                <ShoppingCart className="w-4 h-4" /> Consumos vinculado
                            </h4>
                            <div className="bg-muted/50 rounded-xl p-3 space-y-2 border border-border/50">
                                {reservation.sales.flatMap((s: any) => s.items).map((item: any, idx: number) => (
                                    <div key={idx} className="flex justify-between text-xs">
                                        <span>{item.quantity}x {item.product?.name || "Producto"}</span>
                                        <span className="font-semibold">${Number(item.subtotal).toLocaleString()}</span>
                                    </div>
                                ))}
                                <div className="pt-2 border-t flex justify-between text-[11px] text-muted-foreground uppercase font-bold tracking-tighter">
                                    <span>Subtotal Consumo</span>
                                    <span className="text-emerald-600 dark:text-emerald-400">
                                        ${Number(reservation.consumptionAmount).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between items-center px-2">
                        <span className="text-sm text-muted-foreground">Total a pagar</span>
                        <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                            ${reservation.totalAmount.toLocaleString()}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-4">
                        {reservation.status === "pending" && (
                            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-12" onClick={() => updateStatus("confirmed")} disabled={isPending}>
                                <Check className="w-4 h-4 mr-2" /> Confirmar
                            </Button>
                        )}
                        {reservation.status === "confirmed" && (
                            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12" onClick={() => updateStatus("in_game")} disabled={isPending}>
                                <Play className="w-4 h-4 mr-2" /> Iniciar (Check-in)
                            </Button>
                        )}
                        {reservation.status === "in_game" && (
                            <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-xl h-12" onClick={() => updateStatus("finished")} disabled={isPending}>
                                <Square className="w-4 h-4 mr-2" /> Finalizar Turno
                            </Button>
                        )}
                        {(reservation.status === "pending" || reservation.status === "confirmed") && (
                            <Button variant="outline" className="w-full rounded-xl h-12 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30" onClick={() => updateStatus("cancelled")} disabled={isPending}>
                                Cancelar Turno
                            </Button>
                        )}

                        {reservation.customerPhone && (
                            <Button variant="outline" className="w-full rounded-xl h-12 border-emerald-500/30 text-emerald-600 hover:bg-emerald-50" onClick={handleWhatsApp}>
                                <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
                            </Button>
                        )}

                        {(reservation.status === "in_game" || reservation.status === "confirmed" || reservation.status === "finished") && (
                            <Button variant="outline" className="col-span-2 w-full rounded-xl h-12 border-emerald-500/30 font-medium" onClick={() => router.push(`/dashboard/pos?reservationId=${reservation.id}`)}>
                                <ShoppingCart className="w-4 h-4 mr-2" /> Agregar Consumo al Turno
                            </Button>
                        )}
                    </div>

                    {reservation.status === "finished" && (
                        <Button
                            className="w-full h-14 text-lg rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/20"
                            onClick={() => setPaymentOpen(true)}
                            disabled={isPending}
                        >
                            <DollarSign className="w-5 h-5 mr-2" /> Cobrar Turno
                        </Button>
                    )}
                </div>
            </DialogContent>

            {paymentOpen && (
                <PaymentDialog
                    open={paymentOpen}
                    onOpenChange={setPaymentOpen}
                    totalAmount={reservation.totalAmount}
                    onConfirm={handlePayment}
                    isPending={isPending}
                />
            )}
        </Dialog>
    );
}

export function ActiveReservationsWidget({ activeReservations }: { activeReservations: any[] }) {
    const [isPending, startTransition] = useTransition();
    const [paymentReservation, setPaymentReservation] = useState<any | null>(null);
    const router = useRouter();

    const handleStatus = (id: string, status: string) => {
        startTransition(async () => {
            try {
                await changeReservationStatus(id, status);
                toast.success("Estado actualizado");
                router.refresh();
            } catch (e: any) {
                toast.error(e.message);
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
                router.refresh();
            } catch (e: any) {
                toast.error(e.message);
            }
        });
    };

    const [selectedReservation, setSelectedReservation] = useState<any | null>(null);

    return (
        <div className="lg:col-span-2 space-y-4 animate-slide-up">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">En Juego Ahora</h2>
                <Badge variant="secondary" className="rounded-full px-3 py-1 font-semibold">
                    <Activity className="w-3 h-3 mr-1.5 text-emerald-500 animate-pulse" />
                    {activeReservations?.length ?? 0} activos
                </Badge>
            </div>

            {activeReservations && activeReservations.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger-children">
                    {activeReservations.map((r: any) => {
                        return (
                            <div key={r.id} onClick={() => setSelectedReservation(r)}>
                                <Card className="p-4 cursor-pointer card-elevated card-hover-lift border-emerald-500/20 dark:border-emerald-500/10 animate-fade-in flex flex-col justify-between h-full hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5 transition-colors">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <p className="font-semibold">{r.courtName}</p>
                                            <p className="text-sm text-muted-foreground">{r.customerName}</p>
                                        </div>
                                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 rounded-full px-2.5 py-0.5 text-xs">
                                            En Juego
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-auto pt-4">
                                        <Timer className="w-3.5 h-3.5" />
                                        <span>{new Date(r.startTime).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} — {new Date(r.endTime).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</span>
                                        <span className="ml-auto font-bold text-foreground">${r.totalAmount.toLocaleString()}</span>
                                    </div>
                                </Card>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <Card className="p-8 text-center border-dashed animate-fade-in">
                    <Play className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
                    <p className="text-muted-foreground">Sin juegos activos ahora</p>
                </Card>
            )}

            <DashboardReservationModal reservation={selectedReservation} onClose={() => setSelectedReservation(null)} />
        </div>
    );
}

export function UpcomingReservationsWidget({ upcomingReservations }: { upcomingReservations: any[] }) {
    const [selectedReservation, setSelectedReservation] = useState<any | null>(null);

    return (
        <div className="space-y-3 stagger-children">
            {upcomingReservations && upcomingReservations.length > 0 ? (
                upcomingReservations.map((r: any) => {
                    return (
                        <div key={r.id} onClick={() => setSelectedReservation(r)} className="block group cursor-pointer">
                            <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-50 dark:bg-amber-500/5 hover:bg-amber-100/50 dark:hover:bg-amber-500/10 transition-colors animate-fade-in relative overflow-hidden">
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5"><Clock className="w-4 h-4 text-amber-500" /></div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold">{r.customerName}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{r.courtName}</p>
                                    </div>
                                    <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                                        {new Date(r.startTime).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )
                })
            ) : (
                <div className="p-6 text-center text-sm text-muted-foreground border rounded-xl border-dashed">
                    <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-30" />
                    No hay turnos programados para hoy
                </div>
            )}

            <DashboardReservationModal reservation={selectedReservation} onClose={() => setSelectedReservation(null)} />
        </div>
    );
}

export function FinishedReservationsWidget({ finishedReservations }: { finishedReservations: any[] }) {
    const [selectedReservation, setSelectedReservation] = useState<any | null>(null);

    if (!finishedReservations || finishedReservations.length === 0) return null;

    return (
        <div className="space-y-3 mt-6 animate-slide-up">
            <h2 className="text-xl font-bold text-orange-600 dark:text-orange-400">Pendientes a Cobrar</h2>
            <div className="stagger-children">
                {finishedReservations.map((r: any) => {
                    return (
                        <div key={r.id} onClick={() => setSelectedReservation(r)} className="block">
                            <Card className="p-3.5 mt-2 rounded-xl border border-orange-500/30 bg-orange-50 dark:bg-orange-500/5 hover:bg-orange-100/50 dark:hover:bg-orange-500/10 cursor-pointer flex items-center justify-between shadow-sm transition-colors">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold truncate">{r.customerName}</p>
                                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                        <span>{r.courtName}</span>
                                        <span>•</span>
                                        <span className="font-bold text-foreground">${r.totalAmount.toLocaleString()}</span>
                                    </div>
                                </div>
                                <Button size="sm" className="shrink-0 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white" disabled>
                                    <DollarSign className="w-3.5 h-3.5 mr-1" />
                                    Cobrar
                                </Button>
                            </Card>
                        </div>
                    )
                })}
            </div>

            <DashboardReservationModal reservation={selectedReservation} onClose={() => setSelectedReservation(null)} />
        </div>
    );
}

export function PendingReservationsAlert({ pendingReservations }: { pendingReservations: any[] }) {
    const [selectedReservation, setSelectedReservation] = useState<any | null>(null);

    if (!pendingReservations || pendingReservations.length === 0) return null;

    return (
        <div className="space-y-3 animate-slide-up mb-8 p-4 rounded-2xl bg-amber-500/5 border-2 border-amber-500/20">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center animate-pulse shadow-lg shadow-amber-500/20">
                    <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h2 className="text-xl font-extrabold tracking-tight">
                        Confirmar Reservas Web
                    </h2>
                    <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">Hay {pendingReservations.length} pedidos nuevos pendientes de aprobación.</p>
                </div>
            </div>
            <div className="stagger-children grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {pendingReservations.map((r: any) => (
                    <Card key={r.id} onClick={() => setSelectedReservation(r)} className="p-4 rounded-xl border-2 border-amber-200 dark:border-amber-500/20 bg-white dark:bg-slate-900 hover:border-amber-500 cursor-pointer shadow-sm transition-all transform hover:scale-[1.02]">
                        <div className="flex justify-between items-start mb-2">
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold truncate leading-tight">{r.customerName}</p>
                                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{r.courtName}</p>
                            </div>
                            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-none px-2 py-0 h-5 text-[10px] font-bold">
                                NUEVA
                            </Badge>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1 font-bold text-amber-700 dark:text-amber-400">
                                <Clock className="w-3 h-3" />
                                {new Date(r.startTime).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                            <span className="text-muted-foreground font-medium">Sede: {r.courtName?.split(" - ")[0] || "..."}</span>
                        </div>
                    </Card>
                ))}
            </div>
            <DashboardReservationModal reservation={selectedReservation} onClose={() => setSelectedReservation(null)} />
        </div>
    );
}

