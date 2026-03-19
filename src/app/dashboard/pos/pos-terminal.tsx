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
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, DollarSign, Send } from "lucide-react";
import { processSale } from "./actions";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";

type CartItem = { productId: string; name: string; unitPrice: number; quantity: number };

export function POSTerminal({ categories, products, activeReservations }: any) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [cart, setCart] = useState<CartItem[]>([]);

    // Checkout
    const defaultRes = searchParams.get("reservationId") || "";
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const [checkoutType, setCheckoutType] = useState<"direct" | "tab">(defaultRes ? "tab" : "direct");
    const [payMethod, setPayMethod] = useState("cash");
    const [selectedReservationId, setSelectedReservationId] = useState(defaultRes);

    const filteredProducts = products.filter((p: any) => {
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
        const matchCat = selectedCategory === "all" || p.categoryId === selectedCategory;
        return matchSearch && matchCat;
    });

    const addToCart = (product: any) => {
        const existing = cart.find(i => i.productId === product.id);
        if (existing) {
            setCart(cart.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i));
        } else {
            setCart([...cart, { productId: product.id, name: product.name, unitPrice: product.salePrice, quantity: 1 }]);
        }
    };

    const updateQty = (productId: string, delta: number) => {
        setCart(prev => prev.map(i => {
            if (i.productId !== productId) return i;
            const newQty = i.quantity + delta;
            return newQty <= 0 ? i : { ...i, quantity: newQty };
        }));
    };

    const removeItem = (productId: string) => {
        setCart(prev => prev.filter(i => i.productId !== productId));
    };

    const cartTotal = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

    const handleCheckout = async () => {
        startTransition(async () => {
            try {
                const result = await processSale({
                    items: cart.map(i => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
                    paymentMethod: checkoutType === "direct" ? payMethod : "on_tab",
                    reservationId: checkoutType === "tab" ? selectedReservationId : undefined,
                });
                toast.success(`Venta registrada: ${result.invoiceNumber}`);
                setCart([]);
                setCheckoutOpen(false);
                router.refresh();
            } catch {
                toast.error("Error al procesar la venta");
            }
        });
    };

    return (
        <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
            {/* ── LEFT: Product Grid ── */}
            <div className="flex-1 flex flex-col min-h-0">
                {/* Search + Categories */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input placeholder="Buscar producto..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
                    </div>
                </div>

                <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                    <Badge
                        variant={selectedCategory === "all" ? "default" : "outline"}
                        className="cursor-pointer shrink-0"
                        onClick={() => setSelectedCategory("all")}
                    >
                        Todos
                    </Badge>
                    {categories.map((cat: any) => (
                        <Badge
                            key={cat.id}
                            variant={selectedCategory === cat.id ? "default" : "outline"}
                            className="cursor-pointer shrink-0 capitalize"
                            onClick={() => setSelectedCategory(cat.id)}
                        >
                            {cat.name}
                        </Badge>
                    ))}
                </div>

                {/* Products */}
                <div className="flex-1 overflow-auto grid grid-cols-2 lg:grid-cols-3 gap-3 auto-rows-max">
                    {filteredProducts.map((product: any) => (
                        <Card
                            key={product.id}
                            className="p-3 cursor-pointer hover:shadow-md hover:border-emerald-500/50 transition-all active:scale-[0.98]"
                            onClick={() => addToCart(product)}
                        >
                            <p className="font-bold text-sm truncate">{product.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{product.category?.name}</p>
                            <div className="flex justify-between items-end mt-2">
                                <span className="text-lg font-bold text-emerald-600">${product.salePrice.toLocaleString()}</span>
                                <span className="text-[10px] text-muted-foreground">Stock: {product.stock}</span>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            {/* ── RIGHT: Cart ── */}
            <div className="w-[340px] shrink-0 bg-card border rounded-xl flex flex-col shadow-sm">
                <div className="p-4 border-b flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-bold">Carrito</h3>
                    <Badge variant="secondary" className="ml-auto">{cart.length}</Badge>
                </div>

                <div className="flex-1 overflow-auto p-4 space-y-2">
                    {cart.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            Carrito vacío
                        </div>
                    )}
                    {cart.map((item) => (
                        <div key={item.productId} className="flex items-center gap-2 p-2 bg-accent/30 rounded-lg">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{item.name}</p>
                                <p className="text-xs text-muted-foreground">${item.unitPrice.toLocaleString()} c/u</p>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button variant="outline" size="icon" className="w-6 h-6" onClick={() => updateQty(item.productId, -1)}>
                                    <Minus className="w-3 h-3" />
                                </Button>
                                <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                                <Button variant="outline" size="icon" className="w-6 h-6" onClick={() => updateQty(item.productId, 1)}>
                                    <Plus className="w-3 h-3" />
                                </Button>
                            </div>
                            <p className="text-sm font-bold w-16 text-right">${(item.unitPrice * item.quantity).toLocaleString()}</p>
                            <Button variant="ghost" size="icon" className="w-6 h-6 text-red-500" onClick={() => removeItem(item.productId)}>
                                <Trash2 className="w-3 h-3" />
                            </Button>
                        </div>
                    ))}
                </div>

                {/* Cart Footer */}
                <div className="p-4 border-t space-y-3">
                    <div className="flex justify-between text-lg font-bold">
                        <span>Total</span>
                        <span className="text-emerald-600">${cartTotal.toLocaleString()}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            variant="outline"
                            disabled={cart.length === 0}
                            className="gap-1.5"
                            onClick={() => { setCheckoutType("tab"); setCheckoutOpen(true); }}
                        >
                            <Send className="w-3.5 h-3.5" /> A la Cuenta
                        </Button>
                        <Button
                            disabled={cart.length === 0}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                            onClick={() => { setCheckoutType("direct"); setCheckoutOpen(true); }}
                        >
                            <CreditCard className="w-3.5 h-3.5" /> Cobrar
                        </Button>
                    </div>
                </div>
            </div>

            {/* ── Checkout Dialog ── */}
            <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{checkoutType === "direct" ? "Cobrar Venta" : "Agregar a la Cuenta"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-200 dark:border-emerald-500/20">
                            <p className="text-sm text-muted-foreground">Total</p>
                            <p className="text-3xl font-bold text-emerald-600">${cartTotal.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground mt-1">{cart.length} producto(s)</p>
                        </div>

                        {checkoutType === "direct" ? (
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
                        ) : (
                            <div className="space-y-2">
                                <Label>Vincular a Reserva Activa</Label>
                                <Select value={selectedReservationId} onValueChange={(v) => setSelectedReservationId(v ?? "")}>
                                    <SelectTrigger><SelectValue placeholder="Seleccionar reserva" /></SelectTrigger>
                                    <SelectContent>
                                        {activeReservations.map((r: any) => {
                                            const timeString = new Date(r.startTime).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
                                            const label = `${r.customerName} — ${r.court?.name || "Cancha"} (${timeString})`;
                                            return (
                                                <SelectItem key={r.id} value={r.id} textValue={label}>
                                                    {label}
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                                {activeReservations.length === 0 && (
                                    <p className="text-xs text-muted-foreground">No hay reservas activas para vincular.</p>
                                )}
                            </div>
                        )}

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>Cancelar</Button>
                            <Button
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                disabled={isPending || (checkoutType === "tab" && !selectedReservationId)}
                                onClick={handleCheckout}
                            >
                                {isPending ? "Procesando..." : checkoutType === "direct" ? "Confirmar Pago" : "Agregar a la Cuenta"}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
