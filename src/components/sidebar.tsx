"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import {
    LayoutDashboard,
    CalendarDays,
    ShoppingCart,
    Package,
    Wallet,
    Settings,
    LogOut,
    Menu,
    Moon,
    Sun,
    Shield,
    Building2,
    ChevronLeft,
    Trophy,
    Link as LinkIcon,
    Users,
} from "lucide-react";
import { useState } from "react";

const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Complejos", href: "/dashboard/complexes", icon: Building2 },
    { name: "Reservas", href: "/dashboard/reservations", icon: CalendarDays },
    { name: "Eventos", href: "/dashboard/events", icon: Trophy },
    { name: "Torneos", href: "/dashboard/tournaments", icon: Trophy },
    { name: "Clientes", href: "/dashboard/customers", icon: Users },
    { name: "Kiosko (POS)", href: "/dashboard/pos", icon: ShoppingCart },
    { name: "Productos", href: "/dashboard/products", icon: Package },
    { name: "Caja", href: "/dashboard/cash", icon: Wallet },
    { name: "Configuración", href: "/dashboard/settings", icon: Settings },
];

const adminNavigation = [
    { name: "Negocios", href: "/admin/tenants", icon: Building2 },
    { name: "Suscripciones", href: "/admin/subscriptions", icon: Shield },
];

export function Sidebar({ activeComplexName, userRoleProp, activeModules }: { activeComplexName?: string, userRoleProp?: string, activeModules?: string[] }) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const { theme, toggleTheme } = useTheme();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const isSuperAdmin = session?.user?.role === "super_admin";
    const userRole = userRoleProp || session?.user?.role;

    const initials = session?.user?.name
        ? session.user.name.split(" ").map((n) => n[0]).join("").toUpperCase()
        : "U";

    const navContent = (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className={cn(
                "flex items-center gap-3 px-4 py-5 border-b border-border",
                collapsed && "justify-center px-2"
            )}>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg">
                    <Trophy className="w-5 h-5 text-white" />
                </div>
                {!collapsed && (
                    <div className="animate-fade-in">
                        <h1 className="text-lg font-bold tracking-tight">Tu Turno</h1>
                        <p className="text-[10px] font-medium text-muted-foreground tracking-widest uppercase">Pro</p>
                    </div>
                )}
            </div>

            {/* Active Complex info */}
            {!collapsed && activeComplexName && (
                <div className="px-4 py-3 border-b border-border flex justify-between items-center bg-emerald-50/50 dark:bg-emerald-950/20">
                    <div className="min-w-0 pr-2">
                        <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Complejo Activo</p>
                        <p className="text-sm font-bold truncate text-foreground">{activeComplexName}</p>
                    </div>
                    {userRole === "admin" && (
                        <Link
                            href="/dashboard/select-complex"
                            className="shrink-0 p-1.5 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 transition-colors"
                            title="Cambiar Complejo"
                        >
                            <Building2 className="w-4 h-4" />
                        </Link>
                    )}
                </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {isSuperAdmin ? (
                    <>
                        <p className={cn(
                            "px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2",
                            collapsed && "text-center"
                        )}>
                            {collapsed ? "SA" : "Super Admin"}
                        </p>
                        {adminNavigation.map((item) => {
                            const isActive = pathname === item.href || pathname.startsWith(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setMobileOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                                        collapsed && "justify-center px-2",
                                        isActive
                                            ? "bg-primary text-primary-foreground shadow-md"
                                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                                    )}
                                >
                                    <item.icon className="w-5 h-5 shrink-0" />
                                    {!collapsed && <span>{item.name}</span>}
                                </Link>
                            );
                        })}
                    </>
                ) : (
                    <>
                        {navigation.map((item) => {
                            // Hide "Complejos" and "Configuración" for staff (Encargado)
                            if (userRole !== "admin" && (item.name === "Complejos" || item.name === "Configuración")) {
                                return null;
                            }

                            // Filter by active Modules
                            if (activeModules) {
                                if (item.name === "Torneos" && !activeModules.includes("tournaments")) return null;
                                if (item.name === "Eventos" && !activeModules.includes("events")) return null;
                                if (item.name === "Kiosko (POS)" && !activeModules.includes("pos")) return null;
                                if (item.name === "Productos" && (!activeModules.includes("pos") && !activeModules.includes("inventory"))) return null;
                                if (item.name === "Reportes" && !activeModules.includes("reports")) return null;
                            }

                            const isActive = pathname === item.href ||
                                (item.href !== "/dashboard" && pathname.startsWith(item.href));
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setMobileOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                                        collapsed && "justify-center px-2",
                                        isActive
                                            ? "bg-primary text-primary-foreground shadow-md"
                                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                                    )}
                                >
                                    <item.icon className={cn("w-5 h-5 shrink-0", isActive && "drop-shadow-sm")} />
                                    {!collapsed && <span>{item.name}</span>}
                                </Link>
                            );
                        })}

                        {session?.user?.tenantId && (
                            <Link
                                href={`/book/${session.user.tenantId}`}
                                target="_blank"
                                onClick={() => setMobileOpen(false)}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 mt-4",
                                    "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400 dark:hover:bg-emerald-500/30",
                                    collapsed ? "justify-center px-2 py-3" : "border border-emerald-500/20 border-dashed"
                                )}
                            >
                                <LinkIcon className="w-5 h-5 shrink-0" />
                                {!collapsed && <span>Portal de Clientes</span>}
                            </Link>
                        )}
                    </>
                )}
            </nav>

            {/* Footer */}
            <div className="border-t border-border p-3 space-y-2">
                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className={cn(
                        "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200",
                        collapsed && "justify-center px-2"
                    )}
                >
                    {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    {!collapsed && <span>{theme === "dark" ? "Modo Claro" : "Modo Oscuro"}</span>}
                </button>

                {/* User Info */}
                <div className={cn(
                    "flex items-center gap-3 px-3 py-2",
                    collapsed && "justify-center px-0"
                )}>
                    <Avatar className="h-8 w-8 border-2 border-emerald-500/30">
                        <AvatarFallback className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    {!collapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{session?.user?.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{session?.user?.email}</p>
                        </div>
                    )}
                    {!collapsed && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => signOut({ callbackUrl: "/login" })}
                            className="shrink-0 text-muted-foreground hover:text-destructive"
                        >
                            <LogOut className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className={cn(
                "hidden lg:flex flex-col h-screen border-r border-border bg-sidebar transition-all duration-300 sticky top-0",
                collapsed ? "w-[72px]" : "w-[260px]"
            )}>
                {navContent}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border shadow-sm flex items-center justify-center hover:bg-accent transition-colors"
                >
                    <ChevronLeft className={cn("w-3.5 h-3.5 transition-transform", collapsed && "rotate-180")} />
                </button>
            </aside>

            {/* Mobile Sidebar */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger
                    className="lg:hidden fixed top-4 left-4 z-50 bg-card/80 backdrop-blur-sm border border-border shadow-lg rounded-xl inline-flex items-center justify-center w-10 h-10 hover:bg-accent transition-colors"
                >
                    <Menu className="w-5 h-5" />
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] p-0">
                    <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
                    {navContent}
                </SheetContent>
            </Sheet>
        </>
    );
}
