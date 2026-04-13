"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Banknote, CreditCard, ArrowLeftRight, Check, Receipt } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface PaymentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    totalAmount: number;
    hasCustomer?: boolean;
    onConfirm: (method: string, amount: number, leaveOnAccount: boolean, details?: any) => void;
    isPending?: boolean;
}

export function PaymentDialog({ open, onOpenChange, totalAmount, hasCustomer = true, onConfirm, isPending }: PaymentDialogProps) {
    const [paymentMethod, setPaymentMethod] = useState<string>("");
    const [paymentAmount, setPaymentAmount] = useState<string>(totalAmount.toString());
    const [leaveOnAccount, setLeaveOnAccount] = useState<boolean>(false);
    const [mixedPayment, setMixedPayment] = useState({ cash: "", card: "", transfer: "" });

    // Sync amount when totalAmount changes
    // (In reality we might use a useEffect if totalAmount can change while dialog is open)

    const handleConfirm = () => {
        if (!paymentMethod) return;

        const amountToPayThisTime = Number(paymentAmount) || 0;

        if (paymentMethod === "mixed") {
            const mCash = Number(mixedPayment.cash || 0);
            const mCard = Number(mixedPayment.card || 0);
            const mTransfer = Number(mixedPayment.transfer || 0);

            onConfirm("mixed", amountToPayThisTime, leaveOnAccount, { cash: mCash, card: mCard, transfer: mTransfer });
        } else {
            onConfirm(paymentMethod, amountToPayThisTime, leaveOnAccount);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[420px] rounded-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">Cobrar</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="text-center p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                        <p className="text-sm text-muted-foreground">Total de la reserva</p>
                        <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
                            ${totalAmount.toLocaleString()}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label>Monto a abonar ahora</Label>
                        <Input
                            type="number"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            className="text-lg w-full rounded-xl"
                        />
                    </div>

                    {Number(paymentAmount) < totalAmount && (
                        <div className="flex flex-col gap-2 rounded-xl border p-4">
                            <div className="flex flex-row items-center justify-between">
                                <div className="space-y-0.5 pr-4">
                                    <Label>Dejar saldo a cuenta</Label>
                                    <p className="text-xs text-muted-foreground">Registrar deuda de ${(totalAmount - Number(paymentAmount)).toLocaleString()} en el perfil del cliente</p>
                                </div>
                                <Switch checked={leaveOnAccount} onCheckedChange={setLeaveOnAccount} disabled={!hasCustomer} />
                            </div>
                            {!hasCustomer && (
                                <p className="text-xs text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400 p-2 rounded-lg font-medium">
                                    ⚠️ Para dejar saldo pendiente, asigna este turno a un cliente registrado (no casual).
                                </p>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { id: "cash", label: "Efectivo", icon: Banknote },
                            { id: "card", label: "Tarjeta", icon: CreditCard },
                            { id: "transfer", label: "Transfer", icon: ArrowLeftRight },
                            { id: "mixed", label: "Mixto", icon: Receipt },
                        ].map((method) => (
                            <Button
                                key={method.id}
                                variant={paymentMethod === method.id ? "default" : "outline"}
                                onClick={() => setPaymentMethod(method.id)}
                                className={`h-14 rounded-xl flex items-center justify-center gap-2 ${paymentMethod === method.id ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                            >
                                <method.icon className="w-5 h-5 flex-shrink-0" />
                                <span className="text-sm font-semibold">{method.label}</span>
                            </Button>
                        ))}
                    </div>

                    {paymentMethod === "mixed" && (
                        <div className="space-y-3 animate-fade-in">
                            <div>
                                <Label>Efectivo</Label>
                                <Input
                                    type="number"
                                    placeholder="$0"
                                    value={mixedPayment.cash}
                                    onChange={(e) => setMixedPayment({ ...mixedPayment, cash: e.target.value })}
                                    className="mt-1 rounded-xl"
                                />
                            </div>
                            <div>
                                <Label>Tarjeta</Label>
                                <Input
                                    type="number"
                                    placeholder="$0"
                                    value={mixedPayment.card}
                                    onChange={(e) => setMixedPayment({ ...mixedPayment, card: e.target.value })}
                                    className="mt-1 rounded-xl"
                                />
                            </div>
                            <div>
                                <Label>Transferencia</Label>
                                <Input
                                    type="number"
                                    placeholder="$0"
                                    value={mixedPayment.transfer}
                                    onChange={(e) => setMixedPayment({ ...mixedPayment, transfer: e.target.value })}
                                    className="mt-1 rounded-xl"
                                />
                            </div>
                            <Card className="p-3 rounded-xl bg-muted/50">
                                <div className="flex justify-between text-sm">
                                    <span>Suma parciales:</span>
                                    <span className="font-bold">
                                        ${(Number(mixedPayment.cash || 0) + Number(mixedPayment.card || 0) + Number(mixedPayment.transfer || 0)).toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm mt-1">
                                    <span>Faltante:</span>
                                    <span className={`font-bold ${totalAmount - (Number(mixedPayment.cash || 0) + Number(mixedPayment.card || 0) + Number(mixedPayment.transfer || 0)) > 0 ? "text-destructive" : "text-emerald-600"}`}>
                                        ${Math.max(0, totalAmount - (Number(mixedPayment.cash || 0) + Number(mixedPayment.card || 0) + Number(mixedPayment.transfer || 0))).toLocaleString()}
                                    </span>
                                </div>
                            </Card>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl" disabled={isPending}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!paymentMethod || isPending}
                        className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl"
                    >
                        <Check className="w-4 h-4 mr-1.5" />
                        {isPending ? "Procesando..." : "Confirmar Pago"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
