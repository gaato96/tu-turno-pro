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
import { Plus, Package, Search, AlertTriangle, Edit, Trash2, Truck, Grid } from "lucide-react";
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
                        <Button onClick={() => openProductForm()} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shrink-0">
                            <Plus className="w-4 h-4 mr-2" /> Nuevo Producto
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredProducts.map((product: any) => (
                            <Card key={product.id} className="p-4 card-elevated card-hover-lift transition-shadow group">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600">
                                            <Package className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold">{product.name}</h4>
                                            <p className="text-xs text-muted-foreground capitalize flex items-center gap-1 mt-0.5">
                                                <Grid className="w-3 h-3" /> {product.category?.name || "Sin categoria"}
                                                {product.supplier && <><span className="mx-1">•</span> <Truck className="w-3 h-3" /> {product.supplier.name}</>}
                                            </p>
                                        </div>
                                    </div>
                                    {product.stock <= product.minStock && product.trackStock && (
                                        <Badge variant="destructive" className="text-[10px] gap-1 px-1.5 py-0 rounded-full flex items-center shrink-0">
                                            <AlertTriangle className="w-3 h-3" /> Bajo
                                        </Badge>
                                    )}
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-sm bg-accent/50 dark:bg-accent/20 p-3 rounded-xl border border-border/50">
                                    <div className="text-center">
                                        <p className="text-[10px] text-muted-foreground">Costo</p>
                                        <p className="font-semibold">${product.costPrice.toLocaleString()}</p>
                                    </div>
                                    <div className="text-center border-x border-border/50">
                                        <p className="text-[10px] text-muted-foreground">Venta</p>
                                        <p className="font-bold text-emerald-600">${product.salePrice.toLocaleString()}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] text-muted-foreground">Stock</p>
                                        <p className={`font-semibold ${product.trackStock && product.stock <= product.minStock ? 'text-destructive' : ''}`}>
                                            {product.trackStock ? product.stock : "∞"}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-3 flex gap-2">
                                    <Button variant="outline" size="sm" className="flex-1 rounded-lg h-8 px-2 text-xs" onClick={() => openProductForm(product)}>
                                        <Edit className="w-3.5 h-3.5 mr-1.5" /> Editar
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg shrink-0" onClick={() => { setDeleteTarget({ id: product.id, type: 'product' }); setDeleteConfirmOpen(true); }}>
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>

                    {filteredProducts.length === 0 && (
                        <div className="py-16 text-center border border-dashed rounded-2xl bg-card">
                            <Package className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                            <p className="text-muted-foreground font-medium">No se encontraron productos.</p>
                        </div>
                    )}
                </TabsContent>

                {/* --- CATEGORÍAS --- */}
                <TabsContent value="categories" className="space-y-4 animate-fade-in">
                    <div className="flex justify-end">
                        <Button onClick={() => openCategoryForm()} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md">
                            <Plus className="w-4 h-4 mr-2" /> Nueva Categoría
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {initialCategories.map((cat: any) => (
                            <Card key={cat.id} className="p-4 flex items-center justify-between rounded-xl hover:shadow-sm transition-shadow">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-600">
                                        <Grid className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold capitalize">{cat.name}</h4>
                                        <p className="text-xs text-muted-foreground">{cat._count?.products || 0} productos</p>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => openCategoryForm(cat)}>
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg" onClick={() => { setDeleteTarget({ id: cat.id, type: 'category' }); setDeleteConfirmOpen(true); }}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
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
        </div>
    );
}
