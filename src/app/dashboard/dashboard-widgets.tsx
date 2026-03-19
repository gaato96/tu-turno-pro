"use client";

import { useTransition, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Timer, Play, Clock, AlertCircle, Square, DollarSign, Activity } from "lucide-react";
import { changeReservationStatus, payReservation } from "./reservations/actions";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { PaymentDialog } from "@/components/payment-dialog";

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

    const handlePayment = (method: string, details?: any) => {
        if (!paymentReservation) return;
        startTransition(async () => {
            try {
                await payReservation(paymentReservation.id, method, details);
                toast.success("Cobro registrado exitosamente");
                setPaymentReservation(null);
                router.refresh();
            } catch (e: any) {
                toast.error(e.message);
            }
        });
    };

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
                        const dateStr = r.startTime.split("T")[0];
                        return (
                            <Link href={`/dashboard/reservations?date=${dateStr}&openRes=${r.id}`} key={r.id}>
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
                            </Link>
                        );
                    })}
                </div>
            ) : (
                <Card className="p-8 text-center border-dashed animate-fade-in">
                    <Play className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
                    <p className="text-muted-foreground">Sin juegos activos ahora</p>
                </Card>
            )}

            {paymentReservation && (
                <PaymentDialog
                    open={!!paymentReservation}
                    onOpenChange={(open) => !open && setPaymentReservation(null)}
                    totalAmount={paymentReservation.totalAmount}
                    onConfirm={handlePayment}
                    isPending={isPending}
                />
            )}
        </div>
    );
}

export function UpcomingReservationsWidget({ upcomingReservations }: { upcomingReservations: any[] }) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleStatus = (id: string, status: string) => {
        startTransition(async () => {
            try {
                await changeReservationStatus(id, status);
                toast.success("Estado actualizado a En Juego");
                router.refresh();
            } catch (e: any) {
                toast.error(e.message);
            }
        });
    };

    return (
        <div className="space-y-3 stagger-children">
            {upcomingReservations && upcomingReservations.length > 0 ? (
                upcomingReservations.map((r: any) => {
                    const dateStr = r.startTime.split("T")[0];
                    return (
                        <Link href={`/dashboard/reservations?date=${dateStr}&openRes=${r.id}`} key={r.id} className="block group">
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
                                {/* Hover Action */}
                                <div className="absolute inset-y-0 right-0 p-1.5 bg-gradient-to-l from-amber-50 dark:from-background to-transparent via-amber-50 dark:via-background flex items-center opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0">
                                    {r.status === "pending" ? (
                                        <Button size="sm" className="h-full rounded-lg bg-blue-500 hover:bg-blue-600 text-white" disabled={isPending} onClick={(e) => { e.preventDefault(); handleStatus(r.id, "confirmed"); }}>
                                            Confirmar
                                        </Button>
                                    ) : (
                                        <Button size="sm" className="h-full rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white" disabled={isPending} onClick={(e) => { e.preventDefault(); handleStatus(r.id, "in_game"); }}>
                                            <Play className="w-3.5 h-3.5 mr-1.5" />
                                            Check-in
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </Link>
                    )
                })
            ) : (
                <div className="p-6 text-center text-sm text-muted-foreground border rounded-xl border-dashed">
                    <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-30" />
                    No hay turnos programados para hoy
                </div>
            )}
        </div>
    );
}

export function FinishedReservationsWidget({ finishedReservations }: { finishedReservations: any[] }) {
    const [isPending, startTransition] = useTransition();
    const [paymentReservation, setPaymentReservation] = useState<any | null>(null);
    const router = useRouter();

    const handlePayment = (method: string, details?: any) => {
        if (!paymentReservation) return;
        startTransition(async () => {
            try {
                await payReservation(paymentReservation.id, method, details);
                toast.success("Cobro registrado exitosamente");
                setPaymentReservation(null);
                router.refresh();
            } catch (e: any) {
                toast.error(e.message);
            }
        });
    };

    if (!finishedReservations || finishedReservations.length === 0) return null;

    return (
        <div className="space-y-3 mt-6 animate-slide-up">
            <h2 className="text-xl font-bold text-orange-600 dark:text-orange-400">Pendientes a Cobrar</h2>
            <div className="stagger-children">
                {finishedReservations.map((r: any) => {
                    const dateStr = r.startTime.split("T")[0];
                    return (
                        <Link href={`/dashboard/reservations?date=${dateStr}&openRes=${r.id}`} key={r.id}>
                            <Card className="p-3.5 mt-2 rounded-xl border border-orange-500/30 bg-orange-50 dark:bg-orange-500/5 hover:bg-orange-100/50 dark:hover:bg-orange-500/10 cursor-pointer flex items-center justify-between shadow-sm transition-colors">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold truncate">{r.customerName}</p>
                                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                        <span>{r.courtName}</span>
                                        <span>•</span>
                                        <span className="font-bold text-foreground">${r.totalAmount.toLocaleString()}</span>
                                    </div>
                                </div>
                                <Button size="sm" className="shrink-0 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isPending} onClick={(e) => { e.preventDefault(); setPaymentReservation(r); }}>
                                    <DollarSign className="w-3.5 h-3.5 mr-1" />
                                    Cobrar
                                </Button>
                            </Card>
                        </Link>
                    )
                })}
            </div>

            {paymentReservation && (
                <PaymentDialog
                    open={!!paymentReservation}
                    onOpenChange={(open) => !open && setPaymentReservation(null)}
                    totalAmount={paymentReservation.totalAmount}
                    onConfirm={handlePayment}
                    isPending={isPending}
                />
            )}
        </div>
    );
}
