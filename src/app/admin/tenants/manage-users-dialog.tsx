"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import {
    getTenantUsers,
    getTenantComplexes,
    createTenantUser,
    updateTenantUser,
    deleteTenantUser,
} from "./actions";
import { toast } from "sonner";
import {
    Users,
    Plus,
    Pencil,
    Trash2,
    UserCheck,
    UserX,
    Building2,
    Shield,
    Loader2,
} from "lucide-react";

interface TenantUser {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    role: string;
    isActive: boolean;
    complexId: string | null;
    complexName: string | null;
    modules: string[];
    createdAt: string;
}

interface Complex {
    id: string;
    name: string;
}

export function ManageUsersDialog({
    tenantId,
    tenantName,
    onClose,
}: {
    tenantId: string;
    tenantName: string;
    onClose: () => void;
}) {
    const [users, setUsers] = useState<TenantUser[]>([]);
    const [complexes, setComplexes] = useState<Complex[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingUser, setEditingUser] = useState<TenantUser | null>(null);
    const [formLoading, setFormLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        phone: "",
        role: "staff",
        complexId: "",
        modules: [] as string[],
    });

    const loadData = async () => {
        setLoading(true);
        try {
            const [usersData, complexesData] = await Promise.all([
                getTenantUsers(tenantId),
                getTenantComplexes(tenantId),
            ]);
            setUsers(usersData);
            setComplexes(complexesData);
        } catch {
            toast.error("Error al cargar datos");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [tenantId]);

    const resetForm = () => {
        setFormData({ name: "", email: "", password: "", phone: "", role: "staff", complexId: "", modules: [] });
        setEditingUser(null);
        setShowForm(false);
    };

    const startEdit = (user: TenantUser) => {
        setEditingUser(user);
        setFormData({
            name: user.name || "",
            email: user.email,
            password: "",
            phone: user.phone || "",
            role: user.role,
            complexId: user.complexId || "",
            modules: user.modules || [],
        });
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        try {
            if (editingUser) {
                await updateTenantUser(editingUser.id, {
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    role: formData.role,
                    complexId: formData.role === "staff" ? (formData.complexId || null) : null,
                    modules: formData.modules,
                    ...(formData.password ? { password: formData.password } : {}),
                });
                toast.success("Usuario actualizado");
            } else {
                if (!formData.password) {
                    toast.error("La contraseña es requerida");
                    setFormLoading(false);
                    return;
                }
                await createTenantUser({
                    tenantId,
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                    phone: formData.phone,
                    role: formData.role,
                    complexId: formData.role === "staff" ? formData.complexId : undefined,
                    modules: formData.modules,
                });
                toast.success("Usuario creado");
            }
            resetForm();
            loadData();
        } catch (error: any) {
            toast.error(error.message || "Error");
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (userId: string, userName: string | null) => {
        if (!confirm(`¿Eliminar al usuario ${userName || "sin nombre"}?`)) return;
        try {
            await deleteTenantUser(userId);
            toast.success("Usuario eliminado");
            loadData();
        } catch {
            toast.error("Error al eliminar usuario");
        }
    };

    const handleToggleActive = async (user: TenantUser) => {
        try {
            await updateTenantUser(user.id, { isActive: !user.isActive });
            toast.success(user.isActive ? "Usuario desactivado" : "Usuario activado");
            loadData();
        } catch {
            toast.error("Error al cambiar estado");
        }
    };

    const roleLabels: Record<string, { label: string; color: string }> = {
        admin: { label: "Administrador", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" },
        staff: { label: "Encargado", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400" },
    };

    return (
        <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Usuarios de {tenantName}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* User list */}
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">{users.length} usuario(s)</p>
                                <Button
                                    size="sm"
                                    onClick={() => { resetForm(); setShowForm(true); }}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                                >
                                    <Plus className="w-4 h-4 mr-1" />
                                    Nuevo Usuario
                                </Button>
                            </div>

                            <div className="space-y-2">
                                {users.map((user) => (
                                    <div
                                        key={user.id}
                                        className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${user.isActive ? "bg-card" : "bg-muted/50 opacity-60"
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${user.role === "admin"
                                                ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                                                : "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400"
                                                }`}>
                                                {user.name ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "??"}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-sm truncate">{user.name || "Sin nombre"}</p>
                                                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                                {user.phone && <p className="text-xs text-muted-foreground">{user.phone}</p>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Badge className={`rounded-full text-[10px] ${roleLabels[user.role]?.color || "bg-gray-100"}`}>
                                                {roleLabels[user.role]?.label || user.role}
                                            </Badge>
                                            {user.complexName && (
                                                <Badge variant="secondary" className="rounded-full text-[10px]">
                                                    <Building2 className="w-3 h-3 mr-1" />
                                                    {user.complexName}
                                                </Badge>
                                            )}
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(user)}>
                                                <Pencil className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => handleToggleActive(user)}
                                            >
                                                {user.isActive ? <UserX className="w-3.5 h-3.5 text-amber-500" /> : <UserCheck className="w-3.5 h-3.5 text-emerald-500" />}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-destructive hover:text-destructive"
                                                onClick={() => handleDelete(user.id, user.name)}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {users.length === 0 && (
                                    <p className="text-center text-muted-foreground py-6 text-sm">No hay usuarios. Creá el primero.</p>
                                )}
                            </div>
                        </>
                    )}

                    {/* Create/Edit Form */}
                    {showForm && (
                        <div className="border rounded-xl p-4 bg-muted/30 space-y-4 mt-4">
                            <h3 className="font-semibold text-sm text-emerald-600 flex items-center gap-2">
                                {editingUser ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                {editingUser ? "Editar Usuario" : "Nuevo Usuario"}
                            </h3>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Nombre completo</Label>
                                        <Input
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Email</Label>
                                        <Input
                                            required
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{editingUser ? "Nueva contraseña (dejar vacío para no cambiar)" : "Contraseña"}</Label>
                                        <Input
                                            type="password"
                                            required={!editingUser}
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Teléfono</Label>
                                        <Input
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            placeholder="+54 11 1234-5678"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Rol</Label>
                                        <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v || "staff" })}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="admin">
                                                    <div className="flex items-center gap-2">
                                                        <Shield className="w-3.5 h-3.5" />
                                                        Administrador (todas las sedes)
                                                    </div>
                                                </SelectItem>
                                                <SelectItem value="staff">
                                                    <div className="flex items-center gap-2">
                                                        <Building2 className="w-3.5 h-3.5" />
                                                        Encargado (sede específica)
                                                    </div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {formData.role === "staff" && (
                                        <div className="space-y-2">
                                            <Label>Sede asignada</Label>
                                            <Select value={formData.complexId} onValueChange={(v) => setFormData({ ...formData, complexId: v || "" })}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccionar sede..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {complexes.map((c) => (
                                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                    ))}
                                                    {complexes.length === 0 && (
                                                        <SelectItem value="_none" disabled>No hay sedes creadas</SelectItem>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2 justify-end">
                                    <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                                        Cancelar
                                    </Button>
                                    <Button type="submit" size="sm" disabled={formLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                        {formLoading ? "Guardando..." : editingUser ? "Guardar" : "Crear Usuario"}
                                    </Button>
                                </div>
                            </form>

                            {/* Per-user module visibility */}
                            <div className="mt-4 pt-4 border-t">
                                <h4 className="text-sm font-semibold text-emerald-600 mb-2">Módulos Visibles</h4>
                                <p className="text-xs text-muted-foreground mb-3">Si no seleccionás ninguno, se usan los módulos por defecto del rol.</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { key: "reservations", label: "Reservas" },
                                        { key: "events", label: "Eventos" },
                                        { key: "tournaments", label: "Torneos" },
                                        { key: "pos", label: "Kiosko (POS)" },
                                        { key: "inventory", label: "Productos" },
                                        { key: "cash", label: "Caja" },
                                        { key: "customers", label: "Clientes" },
                                        { key: "expenses", label: "Gastos" },
                                        { key: "complexes", label: "Complejos" },
                                        { key: "settings", label: "Configuración" },
                                    ].map((mod) => (
                                        <label key={mod.key} className="flex items-center gap-2 p-2 border rounded-lg hover:bg-accent cursor-pointer text-sm">
                                            <Switch
                                                checked={formData.modules.includes(mod.key)}
                                                onCheckedChange={(c) => {
                                                    if (c) {
                                                        setFormData({ ...formData, modules: [...formData.modules, mod.key] });
                                                    } else {
                                                        setFormData({ ...formData, modules: formData.modules.filter(m => m !== mod.key) });
                                                    }
                                                }}
                                            />
                                            <span>{mod.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cerrar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
