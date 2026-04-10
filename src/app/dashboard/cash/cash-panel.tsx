"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Lock, Unlock, DollarSign, CreditCard, ArrowRightLeft, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { openCashSession, closeCashSession } from "./actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function CashPanel({ openSession, history }: { openSession: any, history: any[] }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [openDialogVisible, setOpenDialogVisible] = useState(false);
    const [closeDialogVisible, setCloseDialogVisible] = useState(false);
    const [openingBalance, setOpeningBalance] = useState("");
    const [closingBalance, setClosingBalance] = useState("");
    const [closeNotes, setCloseNotes] = useState("");

    const handleOpen = () => {
        startTransition(async () => {
            try {
                await openCashSession(parseFloat(openingBalance) || 0);
                toast.success("Caja abierta");
                setOpenDialogVisible(false);
                setOpeningBalance("");
                router.refresh();
            } catch (err: any) {
                toast.error(err?.message || "Error");
            }
        });
    };

    const handleClose = () => {
        startTransition(async () => {
            try {
                await closeCashSession(parseFloat(closingBalance) || 0, closeNotes || undefined);
                toast.success("Caja cerrada");
                setCloseDialogVisible(false);
                router.refresh();
            } catch (err: any) {
                toast.error(err?.message || "Error");
            }
        });
    };

    return (
        <div className="space-y-6">
            {/* Current Status */}
            {openSession ? (
                <>
                    {/* X Report — Current Session */}
                    <Card className="p-6 border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex shrink-0 items-center justify-center">
                                    <Unlock className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-lg truncate">Caja Abierta</h3>
                                    <p className="text-xs text-muted-foreground truncate">
                                        Abierta por {openSession.openedBy?.name} — {format(new Date(openSession.openingDate), "dd/MM HH:mm", { locale: es })}
                                    </p>
                                </div>
                            </div>
                            <Button variant="destructive" onClick={() => setCloseDialogVisible(true)} className="gap-2 w-full sm:w-auto shrink-0">
                                <Lock className="w-4 h-4" /> Cerrar Caja
                            </Button>
                        </div>

                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <Card className="p-4 text-center">
                                <p className="text-xs text-muted-foreground mb-1">Apertura</p>
                                <p className="text-xl font-bold">${openSession.openingBalance.toLocaleString()}</p>
                            </Card>
                            <Card className="p-4 text-center">
                                <p className="text-xs text-muted-foreground mb-1">Ventas del turno</p>
                                <p className="text-xl font-bold text-emerald-600">${openSession.salesTotal.toLocaleString()}</p>
                                <p className="text-[10px] text-muted-foreground">{openSession.salesCount} operaciones</p>
                            </Card>
                            <Card className="p-4 text-center">
                                <p className="text-xs text-muted-foreground mb-1">Esperado en Caja</p>
                                <p className="text-xl font-bold">${openSession.expectedBalance.toLocaleString()}</p>
                            </Card>
                            <Card className="p-4 text-center">
                                <p className="text-xs text-muted-foreground mb-1">Desglose</p>
                                <div className="space-y-1 text-xs text-left mt-1">
                                    <div className="flex justify-between border-b pb-1 mb-1">
                                        <span className="font-medium">Reservas</span>
                                        <span className="font-bold text-emerald-600">${openSession.resTotal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between border-b pb-1 mb-1">
                                        <span className="font-medium">Kiosco</span>
                                        <span className="font-bold text-blue-600">${openSession.kioskTotal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between border-b pb-1 mb-1">
                                        <span className="font-medium text-red-600">Gastos</span>
                                        <span className="font-bold text-red-600">-${openSession.expensesTotal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />Efectivo</span>
                                        <span className="font-semibold">${openSession.cashTotal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" />Tarjeta</span>
                                        <span className="font-semibold">${openSession.cardTotal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="flex items-center gap-1"><ArrowRightLeft className="w-3 h-3" />Transf.</span>
                                        <span className="font-semibold">${openSession.transferTotal.toLocaleString()}</span>
                                    </div>
                                </div>
                            </Card>

                        </div>
                        {/* Transaction Details */}
                        <div className="mt-8 space-y-4">
                            <h4 className="font-bold text-lg">Operaciones Detalladas del Turno</h4>
                            <div className="bg-white dark:bg-slate-900 rounded-xl border p-4 space-y-3">
                                {openSession.sales?.map((s: any) => (
                                    <div key={s.id} className="flex justify-between items-center text-sm font-medium border-b dark:border-border/50 pb-2 last:border-0 last:pb-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{s.invoiceNumber || 'Ticket'}</span>
                                            <span className="text-muted-foreground">{s.reservationId ? 'Cobro de Reserva' : 'Venta de Kiosco'}</span>
                                            <Badge variant="outline" className="text-[10px]">{s.paymentMethod?.toUpperCase() || 'N/A'}</Badge>
                                        </div>
                                        <span className="font-bold text-foreground">${s.total.toLocaleString()}</span>
                                    </div>
                                ))}
                                {openSession.expenses?.map((e: any) => (
                                    <div key={e.id} className="flex justify-between items-center text-sm font-medium border-b dark:border-border/50 pb-2 last:border-0 last:pb-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-red-600 dark:text-red-400">Gasto</span>
                                            <span className="text-muted-foreground">{e.description}</span>
                                        </div>
                                        <span className="font-bold text-red-600 dark:text-red-400">-${e.amount.toLocaleString()}</span>
                                    </div>
                                ))}
                                {(!openSession.sales?.length && !openSession.expenses?.length) && (
                                    <p className="text-sm text-muted-foreground text-center py-4">No hay operaciones registradas en esta caja.</p>
                                )}
                            </div>
                        </div>
                    </Card>
                </>
            ) : (
                <Card className="p-8 text-center border-dashed">
                    <Lock className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                    <h3 className="text-xl font-bold mb-2">Caja Cerrada</h3>
                    <p className="text-muted-foreground mb-6">Abrí la caja para empezar a registrar operaciones</p>
                    <Button onClick={() => setOpenDialogVisible(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                        <Unlock className="w-4 h-4" /> Abrir Caja
                    </Button>
                </Card>
            )}

            {/* History */}
            {history.length > 0 && (
                <div>
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5" /> Historial de Cierres
                    </h3>
                    <div className="space-y-3">
                        {history.map((session: any) => (
                            <Card key={session.id} className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-sm">
                                            {format(new Date(session.openingDate), "dd/MM/yyyy HH:mm")} → {session.closingDate ? format(new Date(session.closingDate), "HH:mm") : "-"}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {session.openedBy?.name} {session.closedBy ? `→ Cerrado por ${session.closedBy.name}` : ""}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center gap-2">
                                            {session.difference !== null && (
                                                <Badge
                                                    variant={session.difference >= 0 ? "default" : "destructive"}
                                                    className="text-xs gap-1"
                                                >
                                                    {session.difference >= 0
                                                        ? <TrendingUp className="w-3 h-3" />
                                                        : <TrendingDown className="w-3 h-3" />
                                                    }
                                                    ${Math.abs(session.difference).toLocaleString()}
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Esperado: ${session.expectedBalance?.toLocaleString()} | Real: ${session.closingBalance?.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Open Dialog */}
            <Dialog open={openDialogVisible} onOpenChange={setOpenDialogVisible}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Abrir Caja</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Monto Inicial en Caja ($)</Label>
                            <Input type="number" min="0" step="0.01" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} placeholder="0.00" />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setOpenDialogVisible(false)}>Cancelar</Button>
                            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isPending} onClick={handleOpen}>
                                {isPending ? "Abriendo..." : "Abrir Caja"}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Close Dialog */}
            <Dialog open={closeDialogVisible} onOpenChange={setCloseDialogVisible}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Cerrar Caja (Reporte Z)</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                        {openSession && (
                            <div className="p-4 bg-accent/50 rounded-xl border space-y-2 text-sm">
                                <div className="flex justify-between"><span className="text-muted-foreground">Apertura:</span><span className="font-semibold">${openSession.openingBalance.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Ingresos Reservas:</span><span className="font-semibold text-emerald-600">${openSession.resTotal.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Ingresos Kiosco:</span><span className="font-semibold text-blue-600">${openSession.kioskTotal.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground w-1/2">Retiros / Egresos:</span><span className="font-semibold text-red-600 text-right">-${openSession.expensesTotal.toLocaleString()}</span></div>
                                <div className="flex justify-between border-t pt-2"><span className="text-muted-foreground">Ventas Efectivo:</span><span className="font-semibold">${openSession.cashTotal.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Ventas Tarjeta:</span><span className="font-semibold">${openSession.cardTotal.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Ventas Transf.:</span><span className="font-semibold">${openSession.transferTotal.toLocaleString()}</span></div>
                                <div className="flex justify-between border-t pt-2"><span className="font-bold">Esperado en Caja:</span><span className="font-bold text-emerald-600">${openSession.expectedBalance.toLocaleString()}</span></div>

                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Monto Real en Caja ($)</Label>
                            <Input type="number" min="0" step="0.01" value={closingBalance} onChange={(e) => setClosingBalance(e.target.value)} placeholder="Contá el efectivo..." />
                        </div>

                        {closingBalance && openSession && (
                            <div className={`p-3 rounded-lg text-center font-bold ${parseFloat(closingBalance) - openSession.expectedBalance >= 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'}`}>
                                Diferencia: ${(parseFloat(closingBalance) - openSession.expectedBalance).toLocaleString()}
                                {parseFloat(closingBalance) - openSession.expectedBalance > 0 ? " (Sobrante)" : parseFloat(closingBalance) - openSession.expectedBalance < 0 ? " (Faltante)" : " (Exacto ✓)"}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Notas (opcional)</Label>
                            <Input value={closeNotes} onChange={(e) => setCloseNotes(e.target.value)} placeholder="Observaciones del cierre..." />
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setCloseDialogVisible(false)}>Cancelar</Button>
                            <Button variant="destructive" disabled={isPending} onClick={handleClose}>
                                {isPending ? "Cerrando..." : "Cerrar Caja"}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
