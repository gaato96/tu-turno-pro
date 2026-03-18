"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    Wallet,
    Lock,
    Unlock,
    Banknote,
    CreditCard,
    ArrowLeftRight,
    TrendingUp,
    TrendingDown,
    Clock,
    CheckCircle,
    AlertCircle,
    FileText,
} from "lucide-react";
import { toast } from "sonner";

interface CashSession {
    id: string;
    status: "open" | "closed";
    openingDate: string;
    closingDate?: string;
    openingBalance: number;
    closingBalance?: number;
    cashTotal: number;
    cardTotal: number;
    transferTotal: number;
    expectedBalance: number;
    difference?: number;
    openedBy: string;
}

export default function CashPage() {
    const [currentSession, setCurrentSession] = useState<CashSession | null>({
        id: "cs1",
        status: "open",
        openingDate: new Date().toISOString(),
        openingBalance: 15000,
        cashTotal: 37000,
        cardTotal: 12500,
        transferTotal: 8000,
        expectedBalance: 52000,
        openedBy: "Admin Demo",
    });

    const [showOpenModal, setShowOpenModal] = useState(false);
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [openingAmount, setOpeningAmount] = useState("");
    const [closingAmount, setClosingAmount] = useState("");
    const [closingNotes, setClosingNotes] = useState("");

    const handleOpenCash = () => {
        const amount = Number(openingAmount);
        if (amount < 0 || isNaN(amount)) return;

        setCurrentSession({
            id: `cs${Date.now()}`,
            status: "open",
            openingDate: new Date().toISOString(),
            openingBalance: amount,
            cashTotal: 0,
            cardTotal: 0,
            transferTotal: 0,
            expectedBalance: amount,
            openedBy: "Admin Demo",
        });
        setShowOpenModal(false);
        setOpeningAmount("");
        toast.success("Caja abierta exitosamente", { description: `Apertura: $${amount.toLocaleString()}` });
    };

    const handleCloseCash = () => {
        if (!currentSession) return;
        const actual = Number(closingAmount);
        if (isNaN(actual)) return;

        const diff = actual - currentSession.expectedBalance;

        setCurrentSession({
            ...currentSession,
            status: "closed",
            closingDate: new Date().toISOString(),
            closingBalance: actual,
            difference: diff,
        });
        setShowCloseModal(false);
        setClosingAmount("");

        toast.success("Caja cerrada", {
            description: diff === 0
                ? "Sin diferencia — ¡Perfecto! 🎉"
                : diff > 0
                    ? `Sobrante: $${diff.toLocaleString()}`
                    : `Faltante: $${Math.abs(diff).toLocaleString()}`,
        });
    };

    const totalSales = currentSession
        ? currentSession.cashTotal + currentSession.cardTotal + currentSession.transferTotal
        : 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gestión de Caja</h1>
                    <p className="text-muted-foreground mt-1">Control de ingresos y sesiones de caja</p>
                </div>
                <div className="flex gap-2">
                    {!currentSession || currentSession.status === "closed" ? (
                        <Button onClick={() => setShowOpenModal(true)} className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg shadow-emerald-500/20 rounded-xl">
                            <Unlock className="w-4 h-4 mr-2" />
                            Abrir Caja
                        </Button>
                    ) : (
                        <Button onClick={() => setShowCloseModal(true)} variant="outline" className="rounded-xl border-destructive text-destructive hover:bg-destructive/10">
                            <Lock className="w-4 h-4 mr-2" />
                            Cerrar Caja
                        </Button>
                    )}
                </div>
            </div>

            {/* Status Banner */}
            {currentSession && currentSession.status === "open" && (
                <Card className="p-4 card-elevated border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/5 animate-fade-in">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center animate-pulse-glow">
                            <Wallet className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="font-bold text-emerald-700 dark:text-emerald-400">Caja Abierta</p>
                            <p className="text-sm text-muted-foreground">
                                Abierta por {currentSession.openedBy} — {new Date(currentSession.openingDate).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                        </div>
                        <Badge className="ml-auto bg-emerald-500 text-white rounded-full px-3 py-1">
                            <Clock className="w-3 h-3 mr-1" />
                            En curso
                        </Badge>
                    </div>
                </Card>
            )}

            {currentSession && currentSession.status === "closed" && (
                <Card className="p-4 card-elevated border-blue-500/30 bg-blue-50/50 dark:bg-blue-500/5 animate-fade-in">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
                            <Lock className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="font-bold text-blue-700 dark:text-blue-400">Caja Cerrada</p>
                            <p className="text-sm text-muted-foreground">Último cierre completado</p>
                        </div>
                    </div>
                </Card>
            )}

            {currentSession && (
                <>
                    {/* Report X / Z */}
                    <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-5 h-5 text-emerald-600" />
                        <h2 className="text-xl font-bold">
                            {currentSession.status === "open" ? "Reporte X (En Tiempo Real)" : "Reporte Z (Final)"}
                        </h2>
                    </div>

                    {/* Finance Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="p-4 card-elevated">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center">
                                    <Wallet className="w-4 h-4 text-emerald-600" />
                                </div>
                                <span className="text-sm text-muted-foreground">Apertura</span>
                            </div>
                            <p className="text-2xl font-bold">${currentSession.openingBalance.toLocaleString()}</p>
                        </Card>

                        <Card className="p-4 card-elevated">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center">
                                    <TrendingUp className="w-4 h-4 text-blue-600" />
                                </div>
                                <span className="text-sm text-muted-foreground">Ventas Totales</span>
                            </div>
                            <p className="text-2xl font-bold">${totalSales.toLocaleString()}</p>
                        </Card>

                        <Card className="p-4 card-elevated">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center">
                                    <Banknote className="w-4 h-4 text-amber-600" />
                                </div>
                                <span className="text-sm text-muted-foreground">Esperado en Caja</span>
                            </div>
                            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                ${currentSession.expectedBalance.toLocaleString()}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                                Apertura + Efectivo = ${currentSession.openingBalance.toLocaleString()} + ${currentSession.cashTotal.toLocaleString()}
                            </p>
                        </Card>

                        {currentSession.status === "closed" && currentSession.difference !== undefined && (
                            <Card className={`p-4 card-elevated ${currentSession.difference === 0 ? "border-emerald-500/30" : currentSession.difference > 0 ? "border-blue-500/30" : "border-destructive/30"}`}>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${currentSession.difference === 0 ? "bg-emerald-100" : currentSession.difference > 0 ? "bg-blue-100" : "bg-red-100"}`}>
                                        {currentSession.difference === 0 ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : currentSession.difference > 0 ? <TrendingUp className="w-4 h-4 text-blue-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
                                    </div>
                                    <span className="text-sm text-muted-foreground">Diferencia</span>
                                </div>
                                <p className={`text-2xl font-bold ${currentSession.difference === 0 ? "text-emerald-600" : currentSession.difference > 0 ? "text-blue-600" : "text-destructive"}`}>
                                    {currentSession.difference >= 0 ? "+" : ""}${currentSession.difference.toLocaleString()}
                                </p>
                                <p className="text-xs mt-1">
                                    {currentSession.difference === 0 ? "Sin diferencia ✓" : currentSession.difference > 0 ? "Sobrante" : "Faltante"}
                                </p>
                            </Card>
                        )}
                    </div>

                    {/* Payment Breakdown */}
                    <Card className="card-elevated border-border/50">
                        <div className="p-4">
                            <h3 className="font-bold text-lg mb-4">Desglose por Método de Pago</h3>
                            <div className="space-y-3">
                                {[
                                    { label: "Efectivo", amount: currentSession.cashTotal, icon: Banknote, color: "emerald" },
                                    { label: "Tarjeta", amount: currentSession.cardTotal, icon: CreditCard, color: "blue" },
                                    { label: "Transferencia", amount: currentSession.transferTotal, icon: ArrowLeftRight, color: "purple" },
                                ].map((method) => (
                                    <div key={method.label} className="flex items-center gap-4 p-3 rounded-xl bg-muted/30">
                                        <div className={`w-10 h-10 rounded-xl bg-${method.color}-100 dark:bg-${method.color}-500/10 flex items-center justify-center`}>
                                            <method.icon className={`w-5 h-5 text-${method.color}-600`} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium">{method.label}</p>
                                        </div>
                                        <p className="text-lg font-bold">${method.amount.toLocaleString()}</p>
                                        <div className="w-24">
                                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full bg-${method.color}-500 transition-all duration-500`}
                                                    style={{ width: `${totalSales > 0 ? (method.amount / totalSales) * 100 : 0}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>
                </>
            )}

            {/* Open Cash Dialog */}
            <Dialog open={showOpenModal} onOpenChange={setShowOpenModal}>
                <DialogContent className="sm:max-w-[380px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Abrir Caja</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div>
                            <Label>Monto Inicial en Caja</Label>
                            <Input
                                type="number"
                                placeholder="$0"
                                value={openingAmount}
                                onChange={(e) => setOpeningAmount(e.target.value)}
                                className="mt-1.5 rounded-xl text-lg"
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowOpenModal(false)} className="rounded-xl">Cancelar</Button>
                        <Button onClick={handleOpenCash} disabled={!openingAmount} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
                            <Unlock className="w-4 h-4 mr-1.5" />
                            Abrir
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Close Cash Dialog */}
            <Dialog open={showCloseModal} onOpenChange={setShowCloseModal}>
                <DialogContent className="sm:max-w-[420px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Cerrar Caja</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <Card className="p-3 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 rounded-xl">
                            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                                Monto Esperado: ${currentSession?.expectedBalance.toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Apertura (${currentSession?.openingBalance.toLocaleString()}) + Efectivo (${currentSession?.cashTotal.toLocaleString()})
                            </p>
                        </Card>

                        <div>
                            <Label>Monto Real en Caja (contá el efectivo)</Label>
                            <Input
                                type="number"
                                placeholder="$0"
                                value={closingAmount}
                                onChange={(e) => setClosingAmount(e.target.value)}
                                className="mt-1.5 rounded-xl text-lg"
                                autoFocus
                            />
                        </div>

                        {closingAmount && currentSession && (
                            <Card className={`p-3 rounded-xl ${Number(closingAmount) - currentSession.expectedBalance === 0 ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20" : Number(closingAmount) - currentSession.expectedBalance > 0 ? "bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20" : "bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/20"}`}>
                                <p className="text-sm font-semibold">
                                    Diferencia: {Number(closingAmount) - currentSession.expectedBalance >= 0 ? "+" : ""}
                                    ${(Number(closingAmount) - currentSession.expectedBalance).toLocaleString()}
                                    {Number(closingAmount) - currentSession.expectedBalance === 0 && " ✓ Sin diferencia"}
                                    {Number(closingAmount) - currentSession.expectedBalance > 0 && " (Sobrante)"}
                                    {Number(closingAmount) - currentSession.expectedBalance < 0 && " (Faltante)"}
                                </p>
                            </Card>
                        )}

                        <div>
                            <Label>Notas (opcional)</Label>
                            <Input
                                placeholder="Observaciones del cierre..."
                                value={closingNotes}
                                onChange={(e) => setClosingNotes(e.target.value)}
                                className="mt-1.5 rounded-xl"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCloseModal(false)} className="rounded-xl">Cancelar</Button>
                        <Button onClick={handleCloseCash} disabled={!closingAmount} className="bg-destructive hover:bg-destructive/90 text-white rounded-xl">
                            <Lock className="w-4 h-4 mr-1.5" />
                            Cerrar Caja
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
