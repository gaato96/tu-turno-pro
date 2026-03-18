"use client";

import { useState, useMemo } from "react";
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Search,
    ShoppingCart,
    Plus,
    Minus,
    Trash2,
    CreditCard,
    Banknote,
    ArrowLeftRight,
    Receipt,
    X,
    Coffee,
    Cookie,
    Trophy,
    Check,
    User,
} from "lucide-react";
import { toast } from "sonner";

// Types
interface Product {
    id: string;
    name: string;
    salePrice: number;
    stock: number;
    category: string;
    categoryIcon: string;
}

interface CartItem {
    product: Product;
    quantity: number;
}

// Demo data
const demoProducts: Product[] = [
    { id: "p1", name: "Agua 500ml", salePrice: 800, stock: 48, category: "Bebidas", categoryIcon: "coffee" },
    { id: "p2", name: "Gatorade 500ml", salePrice: 1500, stock: 24, category: "Bebidas", categoryIcon: "coffee" },
    { id: "p3", name: "Coca-Cola 500ml", salePrice: 1200, stock: 36, category: "Bebidas", categoryIcon: "coffee" },
    { id: "p4", name: "Cerveza 473ml", salePrice: 1800, stock: 48, category: "Bebidas", categoryIcon: "coffee" },
    { id: "p5", name: "Papas Fritas", salePrice: 1000, stock: 20, category: "Snacks", categoryIcon: "cookie" },
    { id: "p6", name: "Hamburguesa", salePrice: 3500, stock: 15, category: "Snacks", categoryIcon: "cookie" },
    { id: "p7", name: "Pancho", salePrice: 1500, stock: 20, category: "Snacks", categoryIcon: "cookie" },
    { id: "p8", name: "Alquiler Paletas", salePrice: 3000, stock: 6, category: "Deportivo", categoryIcon: "trophy" },
    { id: "p9", name: "Pelotas Pádel x3", salePrice: 4500, stock: 10, category: "Deportivo", categoryIcon: "trophy" },
];

const categories = ["Todos", "Bebidas", "Snacks", "Deportivo"];

const categoryIcons: Record<string, React.ElementType> = {
    Todos: ShoppingCart,
    Bebidas: Coffee,
    Snacks: Cookie,
    Deportivo: Trophy,
};

const demoActiveReservations = [
    { id: "r2", label: "Gastón Rodríguez — Fútbol 5 (A)", courtName: "Fútbol 5 (A)" },
    { id: "r1", label: "Juan Pérez — Pádel 1", courtName: "Pádel 1" },
];

export default function POSPage() {
    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("Todos");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [linkedReservation, setLinkedReservation] = useState<string>("");
    const [showPayment, setShowPayment] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<string>("");
    const [mixedPayment, setMixedPayment] = useState({ cash: "", card: "", transfer: "" });

    const filteredProducts = useMemo(() => {
        return demoProducts.filter((p) => {
            const matchCategory = selectedCategory === "Todos" || p.category === selectedCategory;
            const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
            return matchCategory && matchSearch;
        });
    }, [search, selectedCategory]);

    const addToCart = (product: Product) => {
        setCart((prev) => {
            const existing = prev.find((i) => i.product.id === product.id);
            if (existing) {
                return prev.map((i) =>
                    i.product.id === product.id
                        ? { ...i, quantity: i.quantity + 1 }
                        : i
                );
            }
            return [...prev, { product, quantity: 1 }];
        });
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart((prev) => {
            return prev
                .map((i) =>
                    i.product.id === productId
                        ? { ...i, quantity: Math.max(0, i.quantity + delta) }
                        : i
                )
                .filter((i) => i.quantity > 0);
        });
    };

    const removeFromCart = (productId: string) => {
        setCart((prev) => prev.filter((i) => i.product.id !== productId));
    };

    const cartTotal = cart.reduce((sum, i) => sum + i.product.salePrice * i.quantity, 0);
    const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

    const handleDirectSale = () => {
        if (cart.length === 0) return;
        setShowPayment(true);
    };

    const handleAddToTab = () => {
        if (cart.length === 0 || !linkedReservation) return;
        const resLabel = demoActiveReservations.find((r) => r.id === linkedReservation)?.label;
        toast.success(`Consumo agregado a la cuenta de ${resLabel?.split(" — ")[0]}`, {
            description: `${cartCount} productos — $${cartTotal.toLocaleString()}`,
        });
        setCart([]);
        setLinkedReservation("");
    };

    const handleCompleteSale = () => {
        // Validate mixed payment
        if (paymentMethod === "mixed") {
            const total = Number(mixedPayment.cash || 0) + Number(mixedPayment.card || 0) + Number(mixedPayment.transfer || 0);
            if (total < cartTotal) {
                toast.error("El monto total no cubre el total de la venta");
                return;
            }
        }

        const invoiceNumber = `V${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(Math.floor(Math.random() * 9999) + 1).padStart(4, "0")}`;

        toast.success("Venta completada", {
            description: `Factura: ${invoiceNumber} — $${cartTotal.toLocaleString()} — ${paymentMethod === "mixed" ? "Pago Mixto" : paymentMethod === "cash" ? "Efectivo" : paymentMethod === "card" ? "Tarjeta" : "Transferencia"}`,
        });

        setCart([]);
        setShowPayment(false);
        setPaymentMethod("");
        setMixedPayment({ cash: "", card: "", transfer: "" });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Kiosko — POS</h1>
                <p className="text-muted-foreground mt-1">Punto de venta: venta directa o a la cuenta</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Products Panel */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Search & Categories */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar productos..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 rounded-xl"
                            />
                        </div>
                        <div className="flex gap-2">
                            {categories.map((cat) => {
                                const Icon = categoryIcons[cat];
                                return (
                                    <Button
                                        key={cat}
                                        variant={selectedCategory === cat ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`rounded-xl ${selectedCategory === cat ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                                    >
                                        <Icon className="w-3.5 h-3.5 mr-1.5" />
                                        {cat}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Products Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {filteredProducts.map((product) => (
                            <Card
                                key={product.id}
                                className="p-3 card-elevated cursor-pointer hover:shadow-lg hover:border-emerald-500/30 transition-all duration-200 animate-fade-in group"
                                onClick={() => addToCart(product)}
                            >
                                <div className="h-16 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-500/10 dark:to-emerald-500/5 flex items-center justify-center mb-2 group-hover:from-emerald-100 group-hover:to-emerald-200 dark:group-hover:from-emerald-500/15 dark:group-hover:to-emerald-500/10 transition-colors">
                                    <Plus className="w-6 h-6 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <p className="text-sm font-semibold truncate">{product.name}</p>
                                <div className="flex items-center justify-between mt-1.5">
                                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                        ${product.salePrice.toLocaleString()}
                                    </p>
                                    <Badge variant="secondary" className="text-[10px] rounded-full px-2">
                                        Stock: {product.stock}
                                    </Badge>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Cart Panel */}
                <div className="space-y-4">
                    <Card className="card-elevated border-border/50 overflow-hidden">
                        <div className="p-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white">
                            <div className="flex items-center gap-2">
                                <ShoppingCart className="w-5 h-5" />
                                <span className="font-bold">Carrito</span>
                                {cartCount > 0 && (
                                    <Badge className="bg-white/20 text-white rounded-full ml-auto">
                                        {cartCount}
                                    </Badge>
                                )}
                            </div>
                        </div>

                        <div className="p-4 space-y-3 max-h-[300px] overflow-y-auto">
                            {cart.length === 0 ? (
                                <p className="text-center text-sm text-muted-foreground py-8">
                                    Carrito vacío
                                </p>
                            ) : (
                                cart.map((item) => (
                                    <div key={item.product.id} className="flex items-center gap-3 animate-fade-in">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{item.product.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                ${item.product.salePrice.toLocaleString()} c/u
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Button
                                                size="icon"
                                                variant="outline"
                                                className="w-7 h-7 rounded-lg"
                                                onClick={() => updateQuantity(item.product.id, -1)}
                                            >
                                                <Minus className="w-3 h-3" />
                                            </Button>
                                            <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                                            <Button
                                                size="icon"
                                                variant="outline"
                                                className="w-7 h-7 rounded-lg"
                                                onClick={() => updateQuantity(item.product.id, 1)}
                                            >
                                                <Plus className="w-3 h-3" />
                                            </Button>
                                        </div>
                                        <p className="text-sm font-bold w-16 text-right">
                                            ${(item.product.salePrice * item.quantity).toLocaleString()}
                                        </p>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="w-7 h-7 text-muted-foreground hover:text-destructive"
                                            onClick={() => removeFromCart(item.product.id)}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>

                        <Separator />

                        <div className="p-4">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-lg font-bold">Total</span>
                                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                    ${cartTotal.toLocaleString()}
                                </span>
                            </div>

                            {/* Link to reservation */}
                            <div className="mb-4">
                                <Label className="text-xs text-muted-foreground">Vincular a Reserva Activa</Label>
                                <Select value={linkedReservation} onValueChange={(v) => v && setLinkedReservation(v)}>
                                    <SelectTrigger className="mt-1.5 rounded-xl">
                                        <SelectValue placeholder="Sin vincular (Venta directa)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Sin vincular</SelectItem>
                                        {demoActiveReservations.map((r) => (
                                            <SelectItem key={r.id} value={r.id}>
                                                <User className="w-3 h-3 inline mr-1" />
                                                {r.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    onClick={handleDirectSale}
                                    disabled={cart.length === 0}
                                    className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl shadow-lg shadow-emerald-500/20"
                                >
                                    <Receipt className="w-4 h-4 mr-1.5" />
                                    Cobrar
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleAddToTab}
                                    disabled={cart.length === 0 || !linkedReservation || linkedReservation === "none"}
                                    className="rounded-xl"
                                >
                                    <User className="w-4 h-4 mr-1.5" />
                                    A la Cuenta
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Payment Dialog */}
            <Dialog open={showPayment} onOpenChange={setShowPayment}>
                <DialogContent className="sm:max-w-[420px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Cobrar Venta</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="text-center p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                            <p className="text-sm text-muted-foreground">Total a cobrar</p>
                            <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
                                ${cartTotal.toLocaleString()}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { id: "cash", label: "Efectivo", icon: Banknote },
                                { id: "card", label: "Tarjeta", icon: CreditCard },
                                { id: "transfer", label: "Transferencia", icon: ArrowLeftRight },
                                { id: "mixed", label: "Pago Mixto", icon: Receipt },
                            ].map((method) => (
                                <Button
                                    key={method.id}
                                    variant={paymentMethod === method.id ? "default" : "outline"}
                                    onClick={() => setPaymentMethod(method.id)}
                                    className={`h-14 rounded-xl flex-col gap-1 ${paymentMethod === method.id ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                                >
                                    <method.icon className="w-5 h-5" />
                                    <span className="text-xs">{method.label}</span>
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
                                        <span className={`font-bold ${cartTotal - (Number(mixedPayment.cash || 0) + Number(mixedPayment.card || 0) + Number(mixedPayment.transfer || 0)) > 0 ? "text-destructive" : "text-emerald-600"}`}>
                                            ${Math.max(0, cartTotal - (Number(mixedPayment.cash || 0) + Number(mixedPayment.card || 0) + Number(mixedPayment.transfer || 0))).toLocaleString()}
                                        </span>
                                    </div>
                                </Card>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowPayment(false)} className="rounded-xl">
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleCompleteSale}
                            disabled={!paymentMethod}
                            className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl"
                        >
                            <Check className="w-4 h-4 mr-1.5" />
                            Confirmar Pago
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
