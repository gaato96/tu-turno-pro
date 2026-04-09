"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, Calendar, Clock, MapPin, DollarSign, CheckCircle, XCircle, Trash2, CreditCard, Banknote, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { registerEventPayment, updateEventStatus, deleteEventFromDetail } from "./actions";
import Link from "next/link";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
    pending: { label: "Seña Pendiente", color: "bg-amber-100 text-amber-800 border-amber-300" },
    confirmed: { label: "Pagado / Confirmado", color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
    in_progress: { label: "En Curso", color: "bg-blue-100 text-blue-800 border-blue-300" },
    completed: { label: "Completado", color: "bg-gray-100 text-gray-700 border-gray-300" },
    cancelled: { label: "Cancelado", color: "bg-red-100 text-red-800 border-red-300" },
};

export default function EventDetailClient({ event, tenantId }: { event: any; tenantId: string }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [payOpen, setPayOpen] = useState(false);
    const [payAmount, setPayAmount] = useState(String(Math.max(0, event.totalAmount - event.paidAmount)));
    const [payMethod, setPayMethod] = useState("cash");
    const [payNotes, setPayNotes] = useState("");

    const remaining = event.totalAmount - event.paidAmount;
    const status = STATUS_MAP[event.status] || STATUS_MAP.pending;
    const paidPercent = event.totalAmount > 0 ? Math.min(100, (event.paidAmount / event.totalAmount) * 100) : 0;

    const handlePayment = () => {
        const amount = Number(payAmount);
        if (!amount || amount <= 0) { toast.error("Ingresa un monto válido"); return; }
        startTransition(async () => {
            try {
                await registerEventPayment(event.id, amount, payMethod, payNotes);
                toast.success("Pago registrado correctamente");
                setPayOpen(false);
                router.refresh();
            } catch (e: any) {
                toast.error(e.message || "Error al registrar pago");
            }
        });
    };

    const handleStatus = (newStatus: string) => {
        startTransition(async () => {
            try {
                await updateEventStatus(event.id, newStatus);
                toast.success("Estado actualizado");
                router.refresh();
            } catch (e: any) {
                toast.error(e.message || "Error");
            }
        });
    };

    const handleDelete = () => {
        if (!confirm("¿Eliminar este evento? Esta acción no se puede deshacer.")) return;
        startTransition(async () => {
            try {
                await deleteEventFromDetail(event.id);
                toast.success("Evento eliminado");
                router.push("/dashboard/events");
            } catch (e: any) {
                toast.error(e.message || "Error al eliminar");
            }
        });
    };

    return (
        <div className="space-y-6 max-w-3xl mx-auto pb-12">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/dashboard/events">
                    <Button variant="outline" size="icon" className="rounded-xl shrink-0">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                </Link>
                <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-bold truncate">{event.name}</h1>
                    <p className="text-sm text-muted-foreground">{event.complex.name}</p>
                </div>
                <Badge className={`text-xs px-3 py-1 rounded-full border ${status.color}`}>{status.label}</Badge>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
                        <Calendar className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Fecha</p>
                        <p className="font-semibold text-sm">{format(new Date(event.date), "dd 'de' MMMM, yyyy", { locale: es })}</p>
                    </div>
                </Card>
                <Card className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center shrink-0">
                        <Clock className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Horario</p>
                        <p className="font-semibold text-sm">{format(new Date(event.startTime), "HH:mm")} — {format(new Date(event.endTime), "HH:mm")}</p>
                    </div>
                </Card>
                <Card className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
                        <MapPin className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Complejo</p>
                        <p className="font-semibold text-sm">{event.complex.name}</p>
                    </div>
                </Card>
            </div>

            {/* Financial Summary */}
            <Card className="p-6 space-y-4">
                <h2 className="font-bold text-lg">Resumen Financiero</h2>
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <p className="text-2xl font-bold">${event.totalAmount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground mt-1">Total del Evento</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-emerald-600">${event.paidAmount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground mt-1">Cobrado</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-amber-600">${Math.max(0, remaining).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground mt-1">Saldo Restante</p>
                    </div>
                </div>

                {/* Progress bar */}
                {event.totalAmount > 0 && (
                    <div className="space-y-1">
                        <div className="w-full bg-muted rounded-full h-2.5">
                            <div
                                className="h-2.5 rounded-full bg-emerald-500 transition-all"
                                style={{ width: `${paidPercent}%` }}
                            />
                        </div>
                        <p className="text-xs text-right text-muted-foreground">{paidPercent.toFixed(0)}% cobrado</p>
                    </div>
                )}

                {/* Pay button */}
                {remaining > 0 && (
                    <Button
                        className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg"
                        onClick={() => setPayOpen(true)}
                        disabled={isPending}
                    >
                        <DollarSign className="w-4 h-4 mr-2" /> Registrar Cobro (Saldo: ${remaining.toLocaleString()})
                    </Button>
                )}
            </Card>

            {/* Payment History */}
            {event.payments.length > 0 && (
                <Card className="p-5 space-y-3">
                    <h2 className="font-bold text-base">Historial de Pagos</h2>
                    <div className="space-y-2">
                        {event.payments.map((p: any) => (
                            <div key={p.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-xl text-sm">
                                <div className="flex items-center gap-2">
                                    {p.paymentMethod === "cash" && <Banknote className="w-4 h-4 text-emerald-600" />}
                                    {p.paymentMethod === "card" && <CreditCard className="w-4 h-4 text-blue-600" />}
                                    {p.paymentMethod === "transfer" && <ArrowLeftRight className="w-4 h-4 text-purple-600" />}
                                    <div>
                                        <p className="font-medium capitalize">{p.paymentMethod === "cash" ? "Efectivo" : p.paymentMethod === "card" ? "Tarjeta" : "Transferencia"}</p>
                                        {p.notes && <p className="text-xs text-muted-foreground">{p.notes}</p>}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-emerald-600">${Number(p.amount).toLocaleString()}</p>
                                    <p className="text-xs text-muted-foreground">{format(new Date(p.createdAt), "dd/MM HH:mm")}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Actions */}
            <Card className="p-5 space-y-3">
                <h2 className="font-bold text-base">Acciones del Evento</h2>
                <div className="flex flex-wrap gap-2">
                    {event.status !== "in_progress" && (
                        <Button variant="outline" className="rounded-xl" onClick={() => handleStatus("in_progress")} disabled={isPending}>
                            <Clock className="w-4 h-4 mr-2" /> Marcar En Curso
                        </Button>
                    )}
                    {event.status !== "completed" && (
                        <Button variant="outline" className="rounded-xl text-emerald-600 border-emerald-300 hover:bg-emerald-50" onClick={() => handleStatus("completed")} disabled={isPending}>
                            <CheckCircle className="w-4 h-4 mr-2" /> Marcar Completado
                        </Button>
                    )}
                    {event.status !== "cancelled" && (
                        <Button variant="outline" className="rounded-xl text-orange-600 border-orange-300 hover:bg-orange-50" onClick={() => handleStatus("cancelled")} disabled={isPending}>
                            <XCircle className="w-4 h-4 mr-2" /> Cancelar Evento
                        </Button>
                    )}
                    <Button variant="outline" className="rounded-xl text-red-600 border-red-300 hover:bg-red-50 ml-auto" onClick={handleDelete} disabled={isPending}>
                        <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                    </Button>
                </div>
            </Card>

            {/* Payment Dialog */}
            <Dialog open={payOpen} onOpenChange={setPayOpen}>
                <DialogContent className="rounded-2xl">
                    <DialogHeader><DialogTitle>Registrar Cobro al Evento</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                        <div>
                            <Label>Monto a cobrar ($)</Label>
                            <Input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} className="rounded-xl mt-1.5 text-lg font-bold" placeholder="0" />
                            <p className="text-xs text-muted-foreground mt-1">Saldo total: ${remaining.toLocaleString()}</p>
                        </div>
                        <div>
                            <Label>Método de pago</Label>
                            <Select value={payMethod} onValueChange={v => setPayMethod(v || "cash")}>
                                <SelectTrigger className="rounded-xl mt-1.5"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cash">Efectivo</SelectItem>
                                    <SelectItem value="card">Tarjeta</SelectItem>
                                    <SelectItem value="transfer">Transferencia</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Notas (opcional)</Label>
                            <Input value={payNotes} onChange={e => setPayNotes(e.target.value)} className="rounded-xl mt-1.5" placeholder="Ej. Seña, saldo final..." />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPayOpen(false)} className="rounded-xl">Cancelar</Button>
                        <Button onClick={handlePayment} disabled={isPending} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white">
                            {isPending ? "Registrando..." : "Confirmar Cobro"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
