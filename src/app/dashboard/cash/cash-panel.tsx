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
import { openCashSession, closeCashSession, deleteSale, deleteExpense } from "./actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function CashPanel({ openSession, history, userRole }: { openSession: any, history: any[], userRole?: string }) {
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

    const handleDeleteSale = (saleId: string) => {
        if (!confirm("¿Seguro de eliminar esta operación? Esta acción es permanente.")) return;
        startTransition(async () => {
            try {
                await deleteSale(saleId);
                toast.success("Operación eliminada");
                router.refresh();
            } catch (err: any) {
                toast.error(err?.message || "Error");
            }
        });
    };

    const handleDeleteExpense = (expenseId: string) => {
        if (!confirm("¿Seguro de eliminar este gasto? Esta acción es permanente.")) return;
        startTransition(async () => {
            try {
                await deleteExpense(expenseId);
                toast.success("Gasto eliminado");
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
                                <p className="text-xs text-muted-foreground mb-1">Ingresos Netos Efectivo</p>
                                <p className="text-xl font-bold text-emerald-600">${openSession.netCashExpected?.toLocaleString() ?? 0}</p>
                                <p className="text-[10px] text-muted-foreground">Sin incluir apertura</p>
                            </Card>
                            <Card className="p-4 text-center">
                                <p className="text-xs text-muted-foreground mb-1">Desglose</p>
                                <div className="space-y-1 text-xs text-left mt-1">
                                    <div className="flex justify-between border-b pb-1 mb-1">
                                        <span className="font-medium">Reservas</span>
                                        <span className="font-bold text-emerald-600">${openSession.resTotal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between border-b pb-1 mb-1">
                                        <span className="font-medium">Ingresos por Señas</span>
                                        <span className="font-bold text-emerald-600">${openSession.senasTotal?.toLocaleString() || 0}</span>
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

                            {/* Reservas */}
                            {openSession.sales?.filter((s: any) => s.reservationId).length > 0 && (
                                <div className="space-y-3">
                                    <h5 className="font-semibold text-emerald-700 dark:text-emerald-400 border-b pb-1">Cobros de Reservas</h5>
                                    <div className="bg-white dark:bg-slate-900 rounded-xl border p-4 space-y-3">
                                        {openSession.sales.filter((s: any) => s.reservationId).map((s: any) => (
                                            <details key={s.id} className="group border-b dark:border-border/50 pb-2 last:border-0 last:pb-0">
                                                <summary className="flex justify-between items-center text-sm font-medium cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:bg-muted/30 p-1 -mx-1 rounded-lg transition-colors">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-emerald-600 dark:text-emerald-400 opacity-70 group-open:opacity-100 transition-opacity">▶</span>
                                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{s.invoiceNumber || 'Ticket'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <span>{s.createdAt ? format(new Date(s.createdAt), "HH:mm") : ""}</span>
                                                        <span className="font-bold text-foreground text-sm ml-2">${s.total.toLocaleString()}</span>
                                                        {userRole === "admin" && (
                                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={(e) => { e.preventDefault(); handleDeleteSale(s.id); }} disabled={isPending}>
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                                            </Button>
                                                        )}
                                                    </div>
                                                </summary>
                                                <div className="mt-2 text-xs bg-muted/50 p-3 rounded-lg flex flex-col gap-1 border">
                                                    <p><span className="font-medium text-muted-foreground">ID Operación:</span> {s.id}</p>
                                                    {s.reservation && (
                                                        <div className="pl-4 border-l-2 border-emerald-500/20 mt-1 mb-1 space-y-1 py-1">
                                                            <p className="text-muted-foreground font-semibold">Datos del Turno:</p>
                                                            <p>• Titular: {s.reservation.customerName}</p>
                                                            <p>• Horario: {s.reservation.startTime ? format(new Date(s.reservation.startTime), "HH:mm") : ''} a {s.reservation.endTime ? format(new Date(s.reservation.endTime), "HH:mm") : ''}</p>
                                                        </div>
                                                    )}
                                                    <p><span className="font-medium text-muted-foreground">Método Principal:</span> <Badge variant="outline" className="text-[10px] ml-1">{s.paymentMethod?.toUpperCase() || 'N/A'}</Badge></p>
                                                    {s.paymentMethod === 'mixed' && s.paymentDetails && (
                                                        <div className="pl-4 border-l-2 border-emerald-500/20 mt-1 space-y-1">
                                                            <p className="text-muted-foreground font-semibold">Detalle Mixto:</p>
                                                            {s.paymentDetails.cash > 0 && <p>• Efectivo: ${Number(s.paymentDetails.cash).toLocaleString()}</p>}
                                                            {s.paymentDetails.card > 0 && <p>• Tarjeta: ${Number(s.paymentDetails.card).toLocaleString()}</p>}
                                                            {s.paymentDetails.transfer > 0 && <p>• Transferencia: ${Number(s.paymentDetails.transfer).toLocaleString()}</p>}
                                                        </div>
                                                    )}
                                                    {s.items && s.items.length > 0 && (
                                                        <div className="mt-2 text-xs">
                                                            <p className="font-medium text-muted-foreground mb-1">Ítems adicionales de la reserva:</p>
                                                            <ul className="list-disc pl-4 space-y-0.5 text-[10px]">
                                                                {s.items.map((i: any) => (
                                                                    <li key={i.id}>{i.quantity}x {i.productName || 'Producto'} (${Number(i.subtotal).toLocaleString()})</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            </details>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Kiosko */}
                            {openSession.sales?.filter((s: any) => !s.reservationId).length > 0 && (
                                <div className="space-y-3 mt-4">
                                    <h5 className="font-semibold text-blue-700 dark:text-blue-400 border-b pb-1">Venta de Kiosco</h5>
                                    <div className="bg-white dark:bg-slate-900 rounded-xl border p-4 space-y-3">
                                        {openSession.sales.filter((s: any) => !s.reservationId).map((s: any) => (
                                            <details key={s.id} className="group border-b dark:border-border/50 pb-2 last:border-0 last:pb-0">
                                                <summary className="flex justify-between items-center text-sm font-medium cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:bg-muted/30 p-1 -mx-1 rounded-lg transition-colors">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-blue-600 dark:text-blue-400 opacity-70 group-open:opacity-100 transition-opacity">▶</span>
                                                        <span className="font-bold text-blue-600 dark:text-blue-400">{s.invoiceNumber || 'Ticket'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <span>{s.createdAt ? format(new Date(s.createdAt), "HH:mm") : ""}</span>
                                                        <span className="font-bold text-foreground text-sm ml-2">${s.total.toLocaleString()}</span>
                                                        {userRole === "admin" && (
                                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={(e) => { e.preventDefault(); handleDeleteSale(s.id); }} disabled={isPending}>
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                                            </Button>
                                                        )}
                                                    </div>
                                                </summary>
                                                <div className="mt-2 text-xs bg-muted/50 p-3 rounded-lg flex flex-col gap-1 border">
                                                    <p><span className="font-medium text-muted-foreground">ID Operación:</span> {s.id}</p>
                                                    <p><span className="font-medium text-muted-foreground">Método Principal:</span> <Badge variant="outline" className="text-[10px] ml-1">{s.paymentMethod?.toUpperCase() || 'N/A'}</Badge></p>
                                                    {s.paymentMethod === 'mixed' && s.paymentDetails && (
                                                        <div className="pl-4 border-l-2 border-blue-500/20 mt-1 space-y-1">
                                                            <p className="text-muted-foreground font-semibold">Detalle Mixto:</p>
                                                            {s.paymentDetails.cash > 0 && <p>• Efectivo: ${Number(s.paymentDetails.cash).toLocaleString()}</p>}
                                                            {s.paymentDetails.card > 0 && <p>• Tarjeta: ${Number(s.paymentDetails.card).toLocaleString()}</p>}
                                                            {s.paymentDetails.transfer > 0 && <p>• Transferencia: ${Number(s.paymentDetails.transfer).toLocaleString()}</p>}
                                                        </div>
                                                    )}
                                                    {s.items && s.items.length > 0 && (
                                                        <div className="mt-2 text-xs">
                                                            <p className="font-medium text-muted-foreground mb-1">Ítems comprados:</p>
                                                            <ul className="list-disc pl-4 space-y-0.5 text-[10px]">
                                                                {s.items.map((i: any) => (
                                                                    <li key={i.id}>{i.quantity}x {i.productName || 'Producto'} (${Number(i.subtotal).toLocaleString()})</li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                            </details>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Gastos */}
                            {openSession.expenses?.length > 0 && (
                                <div className="space-y-3 mt-4">
                                    <h5 className="font-semibold text-red-700 dark:text-red-400 border-b pb-1">Gastos Registrados</h5>
                                    <div className="bg-white dark:bg-slate-900 rounded-xl border p-4 space-y-3">
                                        {openSession.expenses.map((e: any) => (
                                            <div key={e.id} className="flex justify-between items-center text-sm font-medium border-b dark:border-border/50 pb-2 last:border-0 last:pb-0 hover:bg-muted/30 p-1 -mx-1 px-1 rounded-lg transition-colors">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-red-600 dark:text-red-400">Gasto</span>
                                                    <span className="text-muted-foreground text-xs">{e.description}</span>
                                                </div>
                                                <div className="flex flex-row items-center gap-2">
                                                    <span className="font-bold text-red-600 dark:text-red-400">-${e.amount.toLocaleString()}</span>
                                                    {userRole === "admin" && (
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDeleteExpense(e.id)} disabled={isPending}>
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {(!openSession.sales?.length && !openSession.expenses?.length) && (
                                <p className="text-sm text-muted-foreground text-center py-4">No hay operaciones registradas en esta caja.</p>
                            )}
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
                                <div className="flex justify-between border-t pt-2"><span className="font-bold">Ingresos Netos Efectivo:</span><span className="font-bold text-emerald-600">${openSession.netCashExpected?.toLocaleString() ?? 0}</span></div>
                                <div className="flex justify-between mt-1"><span className="text-muted-foreground text-xs">+ Apertura (fondo fijo):</span><span className="text-xs">${openSession.openingBalance.toLocaleString()}</span></div>
                                <div className="flex justify-between border-t pt-2 mt-2"><span className="font-bold">Esperado Total en Caja:</span><span className="font-bold text-emerald-600">${openSession.expectedBalance.toLocaleString()}</span></div>

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
