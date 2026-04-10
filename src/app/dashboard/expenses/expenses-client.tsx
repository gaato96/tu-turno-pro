"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { FileText, Plus, Trash, Receipt, Wallet, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getExpenses, createExpense, deleteExpense, createExpenseCategory, toggleExpenseCategory } from "./actions";

export default function ExpensesClient({ complexes, categories, tenantId }: { complexes: any[], categories: any[], tenantId: string }) {
    const [selectedComplex, setSelectedComplex] = useState(complexes[0]?.id || "");
    const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));

    const [expenses, setExpenses] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPending, startTransition] = useTransition();

    const [activeTab, setActiveTab] = useState<"gastos" | "categorias">("gastos");

    // Add Expense Dialog
    const [showAddExpense, setShowAddExpense] = useState(false);
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [linkToCash, setLinkToCash] = useState(true);

    // Add Category
    const [newCategoryName, setNewCategoryName] = useState("");

    const loadExpenses = useCallback(async () => {
        if (!selectedComplex || !selectedDate) return;
        setIsLoading(true);
        try {
            const data = await getExpenses(selectedComplex, selectedDate);
            setExpenses(data);
        } catch (e: any) {
            toast.error(e.message || "Error al cargar gastos");
        } finally {
            setIsLoading(false);
        }
    }, [selectedComplex, selectedDate]);

    useEffect(() => {
        loadExpenses();
    }, [loadExpenses]);

    const handleCreateExpense = () => {
        if (!amount || Number(amount) <= 0 || !description || !categoryId) {
            toast.error("Complete todos los campos obligatorios");
            return;
        }

        startTransition(async () => {
            try {
                await createExpense(tenantId, selectedComplex, categoryId, Number(amount), description, selectedDate, linkToCash);
                toast.success("Gasto registrado");
                setAmount("");
                setDescription("");
                setShowAddExpense(false);
                loadExpenses();
            } catch (e: any) {
                toast.error(e.message || "Error al registrar gasto");
            }
        });
    };

    const handleDeleteExpense = (expenseId: string) => {
        if (!confirm("¿Eliminar este gasto?")) return;
        startTransition(async () => {
            try {
                await deleteExpense(expenseId);
                toast.success("Gasto eliminado");
                loadExpenses();
            } catch (e: any) {
                toast.error(e.message || "Error");
            }
        });
    };

    const handleCreateCategory = () => {
        if (!newCategoryName) return;
        startTransition(async () => {
            try {
                await createExpenseCategory(tenantId, newCategoryName);
                toast.success("Categoría creada");
                setNewCategoryName("");
            } catch (e: any) {
                toast.error(e.message || "Error");
            }
        });
    };

    const handleToggleCategory = (id: string, current: boolean) => {
        startTransition(async () => {
            try {
                await toggleExpenseCategory(id, !current);
                toast.success("Estado actualizado");
            } catch (e: any) {
                toast.error(e.message || "Error");
            }
        });
    };

    const totalGastos = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

    return (
        <div className="space-y-6 animate-fade-in p-2 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-border/50">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Receipt className="w-6 h-6 text-emerald-600" /> Gastos y Egresos
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">Gestión de gastos operativos, proveedores e insumos</p>
                </div>

                <div className="flex items-center gap-3 bg-muted/30 p-1.5 rounded-2xl w-fit">
                    {(["gastos", "categorias"]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`px-6 py-2 rounded-xl text-sm font-bold capitalize transition-all ${activeTab === tab ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === "gastos" && (
                <div className="space-y-6">
                    {/* Filters */}
                    <div className="flex flex-wrap items-end gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 border border-emerald-100 dark:border-emerald-900/30 rounded-3xl">
                        <div className="flex-1 min-w-[200px]">
                            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1 mb-1 block">Complejo</Label>
                            <Select value={selectedComplex} onValueChange={setSelectedComplex}>
                                <SelectTrigger className="h-12 rounded-xl bg-white dark:bg-slate-900 border-border">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {complexes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-[200px]">
                            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1 mb-1 block">Fecha</Label>
                            <Input
                                type="date"
                                value={selectedDate}
                                onChange={e => setSelectedDate(e.target.value)}
                                className="h-12 rounded-xl bg-white dark:bg-slate-900"
                            />
                        </div>
                        <Button
                            onClick={() => setShowAddExpense(true)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 h-12 rounded-xl px-6"
                        >
                            <Plus className="w-5 h-5 mr-2" /> Nuevo Gasto
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {/* Summary Widget */}
                        <div className="md:col-span-1">
                            <Card className="p-6 rounded-3xl border-border/50 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/40 dark:to-emerald-900/20 md:sticky md:top-24">
                                <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-sm mb-4">
                                    <Receipt className="w-6 h-6 text-emerald-600" />
                                </div>
                                <h3 className="text-muted-foreground text-sm font-medium">Total Gastos</h3>
                                <p className="text-3xl font-black mt-1 tracking-tight text-foreground">
                                    ${totalGastos.toLocaleString()}
                                </p>
                                <p className="text-xs font-medium text-muted-foreground mt-2 flex items-center gap-1 opacity-70">
                                    <FileText className="w-3.5 h-3.5" /> {expenses.length} registros
                                </p>
                            </Card>
                        </div>

                        {/* Expenses List */}
                        <div className="md:col-span-3">
                            <Card className="rounded-3xl border-border/50 shadow-sm overflow-hidden min-h-[400px]">
                                {isLoading ? (
                                    <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                                        <div className="w-8 h-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin mb-4"></div>
                                        Cargando...
                                    </div>
                                ) : expenses.length === 0 ? (
                                    <div className="p-20 text-center text-muted-foreground flex flex-col items-center">
                                        <FileText className="w-16 h-16 opacity-20 mb-4" />
                                        <p className="font-medium text-lg">No hay gastos en esta fecha</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border/50">
                                        {expenses.map((exp: any) => (
                                            <div key={exp.id} className="p-4 sm:p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div className="flex gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border text-muted-foreground">
                                                        <Tag className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-foreground text-base capitalize">{exp.description}</p>
                                                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs">
                                                            <span className="font-medium bg-muted/60 px-2 py-0.5 rounded-md text-muted-foreground">{exp.category?.name}</span>
                                                            {exp.cashSessionId && (
                                                                <span className="flex items-center gap-1 text-orange-600 bg-orange-50 dark:bg-orange-950/30 px-2 py-0.5 rounded-md font-semibold">
                                                                    <Wallet className="w-3 h-3" /> Imputado en Caja
                                                                </span>
                                                            )}
                                                            <span className="text-muted-foreground text-[10px] uppercase font-semibold">{format(new Date(exp.date), "dd MMM, yyyy", { locale: es })}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between sm:justify-end flex-row-reverse sm:flex-row gap-6 w-full sm:w-auto">
                                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteExpense(exp.id)} className="text-red-500 hover:text-red-700 w-8 h-8 rounded-lg" disabled={isPending}>
                                                        <Trash className="w-4 h-4" />
                                                    </Button>
                                                    <p className="font-black text-xl tabular-nums tracking-tight">
                                                        ${Number(exp.amount).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "categorias" && (
                <div className="max-w-2xl mx-auto space-y-6">
                    <Card className="p-6 rounded-3xl border-border/50 shadow-sm">
                        <Label className="text-sm font-bold text-foreground mb-2 block">Nueva Categoría</Label>
                        <div className="flex gap-3">
                            <Input
                                placeholder="Ej: Luz, Proveedores, Limpieza..."
                                value={newCategoryName}
                                onChange={e => setNewCategoryName(e.target.value)}
                                className="h-12 rounded-xl"
                                onKeyDown={e => e.key === "Enter" && handleCreateCategory()}
                            />
                            <Button
                                onClick={handleCreateCategory}
                                disabled={isPending || !newCategoryName.trim()}
                                className="h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-500/20 px-6"
                            >
                                <Plus className="w-5 h-5 mr-1" /> Crear
                            </Button>
                        </div>
                    </Card>

                    <Label className="uppercase tracking-widest text-xs font-bold text-muted-foreground ml-2">Categorías Existentes ({categories.length})</Label>
                    <Card className="rounded-3xl border-border/50 shadow-sm overflow-hidden">
                        <div className="divide-y divide-border/50">
                            {categories.map((cat: any) => (
                                <div key={cat.id} className="p-4 hover:bg-muted/30 transition-colors flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-600">
                                            <Tag className="w-4 h-4" />
                                        </div>
                                        <span className={`font-bold transition-opacity ${!cat.isActive && "opacity-50 line-through"}`}>{cat.name}</span>
                                    </div>
                                    <Button
                                        variant={cat.isActive ? "outline" : "secondary"}
                                        size="sm"
                                        onClick={() => handleToggleCategory(cat.id, cat.isActive)}
                                        className="rounded-lg text-xs"
                                        disabled={isPending}
                                    >
                                        {cat.isActive ? "Desactivar" : "Activar"}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}

            <Dialog open={showAddExpense} onOpenChange={setShowAddExpense}>
                <DialogContent className="sm:max-w-[425px] rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl">Nuevo Gasto</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label className="font-bold">Descripción del gasto</Label>
                            <Input
                                placeholder="Breve detalle..."
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="h-12 mt-1.5 rounded-xl bg-muted/50"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="font-bold">Monto ($)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    className="h-12 mt-1.5 rounded-xl font-bold font-mono text-lg bg-muted/50"
                                />
                            </div>
                            <div>
                                <Label className="font-bold">Categoría</Label>
                                <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? "")}>
                                    <SelectTrigger className="h-12 mt-1.5 rounded-xl bg-muted/50">
                                        <SelectValue placeholder="Seleccionar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.filter(c => c.isActive).map((c: any) => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 mt-4 rounded-2xl p-4 cursor-pointer transition-colors hover:bg-orange-100 dark:hover:bg-orange-900/30" onClick={() => setLinkToCash(!linkToCash)}>
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-orange-900 dark:text-orange-400 flex items-center gap-1.5">
                                        <Wallet className="w-4 h-4" /> Imputar en Caja Abierta
                                    </p>
                                    <p className="text-xs text-orange-700 dark:text-orange-600 leading-tight pr-6">Descuenta este monto de forma visible del efectivo disponible en el reporte X/Z de la caja actual.</p>
                                </div>
                                <div className={`shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${linkToCash ? "bg-orange-500 border-orange-500" : "bg-white border-orange-300"}`}>
                                    {linkToCash && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                </div>
                            </div>
                        </div>

                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddExpense(false)} className="rounded-xl flex-1">Cancelar</Button>
                        <Button
                            onClick={handleCreateExpense}
                            disabled={isPending || !amount || !categoryId || !description}
                            className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl flex-1"
                        >
                            Guardar Gasto
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
