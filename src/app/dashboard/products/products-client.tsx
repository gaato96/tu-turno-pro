"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Package, Search, AlertTriangle, Edit, Trash2, Truck, Grid, FileText, CheckCircle } from "lucide-react";
import {
    createProduct, updateProduct, deleteProduct,
    createCategory, updateCategory, deleteCategory,
    createSupplier, updateSupplier, deleteSupplier
} from "./actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function ProductsClient({ initialProducts, initialCategories, initialSuppliers }: { initialProducts: any[], initialCategories: any[], initialSuppliers: any[] }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [search, setSearch] = useState("");

    // Modals
    const [productOpen, setProductOpen] = useState(false);
    const [categoryOpen, setCategoryOpen] = useState(false);
    const [supplierOpen, setSupplierOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string, type: 'product' | 'category' | 'supplier' } | null>(null);
    const [showOrderModal, setShowOrderModal] = useState(false);

    // Form states
    const [productForm, setProductForm] = useState<any>({});
    const [categoryForm, setCategoryForm] = useState<any>({});
    const [supplierForm, setSupplierForm] = useState<any>({});

    const filteredProducts = initialProducts.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.category?.name || "").toLowerCase().includes(search.toLowerCase())
    );

    // -- PRODUCTS --
    const openProductForm = (product?: any) => {
        if (product) {
            setProductForm({ ...product });
        } else {
            setProductForm({ name: "", categoryId: "", supplierId: "", costPrice: "0", salePrice: "0", stock: "0", trackStock: true, minStock: "5" });
        }
        setProductOpen(true);
    };

    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        startTransition(async () => {
            try {
                const fd = new FormData();
                fd.append("name", productForm.name);
                fd.append("categoryId", productForm.categoryId);
                if (productForm.supplierId) fd.append("supplierId", productForm.supplierId);
                fd.append("costPrice", productForm.costPrice);
                fd.append("salePrice", productForm.salePrice);
                fd.append("stock", productForm.stock);
                fd.append("trackStock", productForm.trackStock ? "true" : "false");
                fd.append("minStock", productForm.minStock);

                if (productForm.id) {
                    await updateProduct(productForm.id, fd);
                    toast.success("Producto actualizado");
                } else {
                    await createProduct(fd);
                    toast.success("Producto creado");
                }
                setProductOpen(false);
                router.refresh();
            } catch (error: any) {
                toast.error(error.message || "Error al guardar producto");
            }
        });
    };

    // -- CATEGORIES --
    const openCategoryForm = (category?: any) => {
        if (category) {
            setCategoryForm({ ...category });
        } else {
            setCategoryForm({ name: "" });
        }
        setCategoryOpen(true);
    };

    const handleSaveCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        startTransition(async () => {
            try {
                const fd = new FormData();
                fd.append("name", categoryForm.name);
                if (categoryForm.id) {
                    await updateCategory(categoryForm.id, fd);
                    toast.success("Categoría actualizada");
                } else {
                    await createCategory(fd);
                    toast.success("Categoría creada");
                }
                setCategoryOpen(false);
                router.refresh();
            } catch (error: any) {
                toast.error(error.message || "Error al guardar categoría");
            }
        });
    };

    // -- SUPPLIERS --
    const openSupplierForm = (supplier?: any) => {
        if (supplier) {
            setSupplierForm({ ...supplier });
        } else {
            setSupplierForm({ name: "", contactName: "", phone: "", email: "", address: "", notes: "" });
        }
        setSupplierOpen(true);
    };

    const handleSaveSupplier = async (e: React.FormEvent) => {
        e.preventDefault();
        startTransition(async () => {
            try {
                const fd = new FormData();
                fd.append("name", supplierForm.name);
                fd.append("contactName", supplierForm.contactName || "");
                fd.append("phone", supplierForm.phone || "");
                fd.append("email", supplierForm.email || "");
                fd.append("address", supplierForm.address || "");
                fd.append("notes", supplierForm.notes || "");

                if (supplierForm.id) {
                    await updateSupplier(supplierForm.id, fd);
                    toast.success("Proveedor actualizado");
                } else {
                    await createSupplier(fd);
                    toast.success("Proveedor creado");
                }
                setSupplierOpen(false);
                router.refresh();
            } catch (error: any) {
                toast.error(error.message || "Error al guardar proveedor");
            }
        });
    };

    // -- DELETIONS --
    const handleDelete = async () => {
        if (!deleteTarget) return;
        startTransition(async () => {
            try {
                if (deleteTarget.type === 'product') await deleteProduct(deleteTarget.id);
                if (deleteTarget.type === 'category') await deleteCategory(deleteTarget.id);
                if (deleteTarget.type === 'supplier') await deleteSupplier(deleteTarget.id);

                toast.success("Elemento eliminado");
                setDeleteConfirmOpen(false);
                router.refresh();
            } catch (error: any) {
                toast.error(error.message || "Error al eliminar el elemento");
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Inventario y Productos</h2>
                    <p className="text-muted-foreground mt-1">Gestiona tus artículos, categorías y proveedores.</p>
                </div>
                <div className="relative w-full md:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 rounded-xl" />
                </div>
            </div>

            <Tabs defaultValue="products" className="w-full">
                <TabsList className="grid w-full lg:w-[400px] grid-cols-3 rounded-xl mb-6">
                    <TabsTrigger value="products" className="rounded-lg">Productos</TabsTrigger>
                    <TabsTrigger value="categories" className="rounded-lg">Categorías</TabsTrigger>
                    <TabsTrigger value="suppliers" className="rounded-lg">Proveedores</TabsTrigger>
                </TabsList>

                {/* --- PRODUCTOS --- */}
                <TabsContent value="products" className="space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between">
                        <div className="flex gap-2 py-2 overflow-x-auto">
                            <Badge variant="secondary" className="shrink-0 cursor-pointer">Todos ({initialProducts.length})</Badge>
                            {initialCategories.map((cat: any) => (
                                <Badge key={cat.id} variant="outline" className="shrink-0 cursor-pointer capitalize">
                                    {cat.name} ({cat._count?.products || 0})
                                </Badge>
                            ))}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Button variant="outline" onClick={() => setShowOrderModal(true)} className="border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-500/30 dark:text-amber-400 dark:hover:bg-amber-500/10 rounded-xl shadow-sm shrink-0">
                                <AlertTriangle className="w-4 h-4 mr-2" /> Stock Bajo / Pedir
                            </Button>
                            <Button onClick={() => openProductForm()} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shrink-0">
                                <Plus className="w-4 h-4 mr-2" /> Nuevo Producto
                            </Button>
                        </div>
                    </div>

                    <Card className="rounded-2xl border-border/50 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-muted-foreground bg-muted/50 border-b border-border">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold">Producto</th>
                                        <th className="px-4 py-3 font-semibold">Categoría/Proveedor</th>
                                        <th className="px-4 py-3 font-semibold text-right">Costo</th>
                                        <th className="px-4 py-3 font-semibold text-right">Venta</th>
                                        <th className="px-4 py-3 font-semibold text-center">Stock</th>
                                        <th className="px-4 py-3 font-semibold text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProducts.map((product: any) => (
                                        <tr key={product.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                                                        <Package className="w-4 h-4" />
                                                    </div>
                                                    <span className="font-semibold">{product.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 capitalize">
                                                <div className="flex flex-col">
                                                    <span>{product.category?.name || "Sin categoria"}</span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {product.supplier?.name || "Sin Proveedor"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">${product.costPrice.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-right font-bold text-emerald-600">${product.salePrice.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className={`font-semibold ${product.trackStock && product.stock <= product.minStock ? 'text-destructive' : ''}`}>
                                                        {product.trackStock ? product.stock : "∞"}
                                                    </span>
                                                    {product.stock <= product.minStock && product.trackStock && (
                                                        <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-muted-foreground hover:text-emerald-600" onClick={() => openProductForm(product)}>
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive" onClick={() => { setDeleteTarget({ type: 'product', id: product.id }); setDeleteConfirmOpen(true); }}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredProducts.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                                                <Package className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                                                <p className="font-medium">No se encontraron productos.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </TabsContent>

                {/* --- CATEGORÍAS --- */}
                <TabsContent value="categories" className="space-y-4 animate-fade-in">
                    <div className="flex justify-end">
                        <Button onClick={() => openCategoryForm()} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md">
                            <Plus className="w-4 h-4 mr-2" /> Nueva Categoría
                        </Button>
                    </div>
                    <Card className="rounded-2xl border-border/50 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-muted-foreground bg-muted/50 border-b border-border">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold">Categoría</th>
                                        <th className="px-4 py-3 font-semibold text-center">Productos Asociados</th>
                                        <th className="px-4 py-3 font-semibold text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {initialCategories.map((cat: any) => (
                                        <tr key={cat.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center text-blue-600">
                                                        <Grid className="w-4 h-4" />
                                                    </div>
                                                    <span className="font-semibold capitalize">{cat.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center text-muted-foreground">
                                                {cat._count?.products || 0}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-muted-foreground hover:text-blue-600" onClick={() => openCategoryForm(cat)}>
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive" onClick={() => { setDeleteTarget({ id: cat.id, type: 'category' }); setDeleteConfirmOpen(true); }}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {initialCategories.length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                                                <Grid className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                                                <p className="font-medium">No se encontraron categorías.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </TabsContent>

                {/* --- PROVEEDORES --- */}
                <TabsContent value="suppliers" className="space-y-4 animate-fade-in">
                    <div className="flex justify-end">
                        <Button onClick={() => openSupplierForm()} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md">
                            <Plus className="w-4 h-4 mr-2" /> Nuevo Proveedor
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {initialSuppliers.map((sup: any) => (
                            <Card key={sup.id} className="p-4 rounded-xl hover:shadow-sm transition-shadow">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-600">
                                            <Truck className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold">{sup.name}</h4>
                                            <p className="text-xs text-muted-foreground">{sup.contactName || "Sin contacto"}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => openSupplierForm(sup)}>
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg" onClick={() => { setDeleteTarget({ id: sup.id, type: 'supplier' }); setDeleteConfirmOpen(true); }}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="text-sm space-y-1">
                                    {sup.phone && <p><span className="font-semibold mr-1">T:</span>{sup.phone}</p>}
                                    {sup.email && <p><span className="font-semibold mr-1">@:</span>{sup.email}</p>}
                                </div>
                            </Card>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>

            {/* PRODUCT MODAL */}
            <Dialog open={productOpen} onOpenChange={setProductOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader><DialogTitle>{productForm.id ? "Editar Producto" : "Nuevo Producto"}</DialogTitle></DialogHeader>
                    <form onSubmit={handleSaveProduct} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Nombre</Label>
                            <Input required value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} className="rounded-xl" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>Categoría</Label>
                                <Select value={productForm.categoryId} onValueChange={(v) => setProductForm({ ...productForm, categoryId: v })}>
                                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                    <SelectContent>
                                        {initialCategories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Proveedor (Opcional)</Label>
                                <Select value={productForm.supplierId || "none"} onValueChange={(v) => setProductForm({ ...productForm, supplierId: v === "none" ? null : v })}>
                                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Opcional..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Ninguno</SelectItem>
                                        {initialSuppliers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>Costo ($)</Label>
                                <Input required type="number" min="0" step="0.01" value={productForm.costPrice} onChange={(e) => setProductForm({ ...productForm, costPrice: e.target.value })} className="rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <Label>Venta ($)</Label>
                                <Input required type="number" min="0" step="0.01" value={productForm.salePrice} onChange={(e) => setProductForm({ ...productForm, salePrice: e.target.value })} className="rounded-xl" />
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-muted/20">
                            <div>
                                <Label className="text-sm font-semibold">Controlar Stock</Label>
                                <p className="text-xs text-muted-foreground mt-1">Lleva seguimiento de existencias.</p>
                            </div>
                            <Switch checked={productForm.trackStock} onCheckedChange={(c) => setProductForm({ ...productForm, trackStock: c })} />
                        </div>
                        {productForm.trackStock && (
                            <div className="grid grid-cols-2 gap-3 animate-slide-up">
                                <div className="space-y-2">
                                    <Label>Stock Actual</Label>
                                    <Input required type="number" min="0" value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })} className="rounded-xl" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Stock Mínimo (Alerta)</Label>
                                    <Input required type="number" min="0" value={productForm.minStock} onChange={(e) => setProductForm({ ...productForm, minStock: e.target.value })} className="rounded-xl" />
                                </div>
                            </div>
                        )}
                        <DialogFooter className="mt-6">
                            <Button type="button" variant="outline" onClick={() => setProductOpen(false)} className="rounded-xl">Cancelar</Button>
                            <Button type="submit" disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
                                {isPending ? "Guardando..." : "Guardar Producto"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* CATEGORY MODAL */}
            <Dialog open={categoryOpen} onOpenChange={setCategoryOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader><DialogTitle>{categoryForm.id ? "Editar Categoría" : "Nueva Categoría"}</DialogTitle></DialogHeader>
                    <form onSubmit={handleSaveCategory} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Nombre de Categoría</Label>
                            <Input required value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} className="rounded-xl" autoFocus />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setCategoryOpen(false)} className="rounded-xl">Cancelar</Button>
                            <Button type="submit" disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
                                Guardar
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* SUPPLIER MODAL */}
            <Dialog open={supplierOpen} onOpenChange={setSupplierOpen}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader><DialogTitle>{supplierForm.id ? "Editar Proveedor" : "Nuevo Proveedor"}</DialogTitle></DialogHeader>
                    <form onSubmit={handleSaveSupplier} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Nombre de la Empresa</Label>
                            <Input required value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} className="rounded-xl" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>Contacto</Label>
                                <Input value={supplierForm.contactName} onChange={(e) => setSupplierForm({ ...supplierForm, contactName: e.target.value })} className="rounded-xl" />
                            </div>
                            <div className="space-y-2">
                                <Label>Teléfono</Label>
                                <Input value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} className="rounded-xl" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input type="email" value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} className="rounded-xl" />
                        </div>
                        <DialogFooter className="mt-6">
                            <Button type="button" variant="outline" onClick={() => setSupplierOpen(false)} className="rounded-xl">Cancelar</Button>
                            <Button type="submit" disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
                                Guardar
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* DELETE MODAL */}
            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader><DialogTitle>¿Confirmar eliminación?</DialogTitle></DialogHeader>
                    <p className="py-4 text-muted-foreground text-sm">
                        Esta acción marcará el elemento como inactivo, manteniéndolo en los historiales financieros pero removiéndolo de las vistas principales. ¿Está seguro?
                    </p>
                    <DialogFooter>
                        <Button type="button" variant="outline" className="rounded-xl" onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
                        <Button type="button" variant="destructive" className="rounded-xl" onClick={handleDelete} disabled={isPending}>
                            Eliminar Permanentemente
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Order/Low Stock Modal */}
            <Dialog open={showOrderModal} onOpenChange={setShowOrderModal}>
                <DialogContent className="sm:max-w-[600px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <FileText className="w-5 h-5 text-emerald-600" />
                            Generador de Pedidos (Stock Bajo)
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground mb-4">
                            Los siguientes productos han alcanzado su límite de stock mínimo y requieren reposición.
                        </p>
                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                            {[...initialSuppliers, { id: null, name: "Sin Proveedor" }].map((supplier: any) => {
                                const productsToOrder = initialProducts.filter(p => p.supplierId === supplier.id && p.trackStock && p.stock <= p.minStock);
                                if (productsToOrder.length === 0) return null;

                                return (
                                    <Card key={supplier.id || "none"} className="p-4 border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-500/5">
                                        <h3 className="font-bold flex items-center gap-2 mb-2 text-emerald-800 dark:text-emerald-400">
                                            <Truck className="w-4 h-4" /> {supplier.name}
                                        </h3>
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-border/50 text-xs text-muted-foreground">
                                                    <th className="py-2 text-left">Producto</th>
                                                    <th className="py-2 text-center">Stock Actual</th>
                                                    <th className="py-2 text-center">Min</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {productsToOrder.map((prod: any) => (
                                                    <tr key={prod.id} className="border-b border-border/30 last:border-0">
                                                        <td className="py-2 font-medium">{prod.name}</td>
                                                        <td className="py-2 text-center text-destructive font-bold">{prod.stock}</td>
                                                        <td className="py-2 text-center text-muted-foreground">{prod.minStock}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </Card>
                                );
                            })}

                            {initialProducts.filter(p => p.trackStock && p.stock <= p.minStock).length === 0 && (
                                <div className="text-center py-8">
                                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-3 text-emerald-600">
                                        <CheckCircle className="w-6 h-6" />
                                    </div>
                                    <p className="font-medium text-emerald-600 dark:text-emerald-400">¡Todo en orden!</p>
                                    <p className="text-sm text-muted-foreground">No hay productos con stock por debajo del mínimo.</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowOrderModal(false)} className="rounded-xl">Cerrar</Button>
                        <Button
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                            onClick={() => {
                                const lowStock = initialProducts.filter(p => p.trackStock && p.stock <= p.minStock);
                                let text = "📋 *PEDIDO DE REPOSICIÓN - TU TURNO PRO*\n\n";

                                const groups = [
                                    ...initialSuppliers.map(s => ({ name: s.name, id: s.id })),
                                    { name: "Sin Proveedor", id: null }
                                ];

                                groups.forEach(g => {
                                    const prods = lowStock.filter(p => p.supplierId === g.id);
                                    if (prods.length > 0) {
                                        text += `🔹 *Proveedor: ${g.name}*\n`;
                                        prods.forEach(p => {
                                            text += `  • ${p.name} (Faltan: ${p.minStock - p.stock + 5} aprox)\n`;
                                        });
                                        text += "\n";
                                    }
                                });

                                navigator.clipboard.writeText(text);
                                toast.success("Pedido copiado al portapapeles", { description: "Ahora puedes pegarlo en WhatsApp o por mail a tus proveedores." });
                            }}
                        >
                            <FileText className="w-4 h-4 mr-2" />
                            Copiar para WhatsApp
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
