"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getDashboardData } from "./actions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    CalendarDays,
    DollarSign,
    Timer,
    ArrowRight,
    Activity,
    ShoppingCart,
    Play,
    Clock,
    Trophy,
    BarChart3,
    TrendingUp,
    Plus,
    Wallet,
    Bell,
    MessageCircle,
    RefreshCcw,
} from "lucide-react";
import Link from "next/link";
import { ActiveReservationsWidget, UpcomingReservationsWidget, FinishedReservationsWidget, PendingReservationsAlert } from "./dashboard-widgets";

const POLL_INTERVAL = 60_000; // 60 seconds

function KPICard({
    title,
    value,
    subtitle,
    icon: Icon,
    color = "emerald",
}: {
    title: string;
    value: string;
    subtitle?: string;
    icon: React.ElementType;
    color?: string;
}) {
    const colorMap: Record<string, string> = {
        emerald: "from-emerald-500 to-emerald-600 shadow-emerald-500/20",
        blue: "from-blue-500 to-blue-600 shadow-blue-500/20",
        amber: "from-amber-500 to-amber-600 shadow-amber-500/20",
        purple: "from-purple-500 to-purple-600 shadow-purple-500/20",
    };

    return (
        <Card className="p-5 card-elevated card-hover-lift border-border/50 animate-fade-in">
            <div className="flex items-start justify-between">
                <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <p className="text-3xl font-bold tracking-tight">{value}</p>
                    {subtitle && (
                        <p className="text-xs text-muted-foreground">{subtitle}</p>
                    )}
                </div>
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${colorMap[color]} shadow-lg flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
            </div>
        </Card>
    );
}

function ImminentTurnAlert({ reservations }: { reservations: any[] }) {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 30_000); // update every 30s
        return () => clearInterval(timer);
    }, []);

    // Find reservations starting within 15 minutes
    const imminent = reservations.filter((r) => {
        const start = new Date(r.startTime);
        const diff = (start.getTime() - now.getTime()) / 60_000;
        return diff > 0 && diff <= 15;
    });

    if (imminent.length === 0) return null;

    return (
        <div className="animate-slide-up p-4 rounded-2xl bg-red-500/5 border-2 border-red-500/30 space-y-3">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/20">
                    <Bell className="w-5 h-5 text-white animate-bounce" />
                </div>
                <div>
                    <h3 className="text-lg font-extrabold tracking-tight">⏰ Turnos por Comenzar</h3>
                    <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                        {imminent.length === 1
                            ? "Hay 1 turno que comienza en menos de 15 minutos"
                            : `Hay ${imminent.length} turnos que comienzan en menos de 15 minutos`}
                    </p>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {imminent.map((r: any) => {
                    const startDate = new Date(r.startTime);
                    const minsLeft = Math.max(0, Math.round((startDate.getTime() - now.getTime()) / 60_000));

                    const handleWhatsApp = () => {
                        if (!r.customerPhone) return;
                        const timeStr = startDate.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
                        const msg = encodeURIComponent(`¡Hola ${r.customerName}! Te recordamos que tu turno en ${r.courtName} comienza a las ${timeStr} hs. ¡Te esperamos! 🏆`);
                        window.open(`https://wa.me/${r.customerPhone.replace(/\D/g, "")}?text=${msg}`, "_blank");
                    };

                    return (
                        <Card key={r.id} className="p-4 rounded-xl border-2 border-red-200 dark:border-red-500/20 bg-white dark:bg-slate-900 shadow-sm">
                            <div className="flex items-start justify-between mb-2">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold truncate">{r.customerName}</p>
                                    <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{r.courtName}</p>
                                </div>
                                <Badge className="bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 border-none px-2 py-0 h-5 text-[10px] font-bold animate-pulse">
                                    {minsLeft} min
                                </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-3">
                                <div className="flex items-center gap-1 text-xs font-bold text-red-700 dark:text-red-400">
                                    <Clock className="w-3 h-3" />
                                    {startDate.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                                </div>
                                {r.customerPhone && (
                                    <Button size="sm" variant="outline" className="ml-auto rounded-lg h-7 text-[11px] border-emerald-500/30 text-emerald-600 hover:bg-emerald-50" onClick={handleWhatsApp}>
                                        <MessageCircle className="w-3 h-3 mr-1" /> Recordar
                                    </Button>
                                )}
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}

type DashboardData = {
    todayReservations: number;
    todayRevenue: number;
    occupancy: number;
    salesCount: number;
    activeReservations: any[];
    upcomingReservations: any[];
    finishedReservations: any[];
    pendingReservations: any[];
    topProducts: any[];
};

export default function DashboardClient({ initialData, greeting }: { initialData: DashboardData | null; greeting: string }) {
    const [data, setData] = useState<DashboardData | null>(initialData);

    // Auto-sync wrapper state when Next.js server actions trigger router.refresh() 
    useEffect(() => {
        if (initialData) setData(initialData);
    }, [initialData]);

    const [lastRefresh, setLastRefresh] = useState(new Date());
    const [isRefreshing, setIsRefreshing] = useState(false);
    const router = useRouter();

    const refresh = useCallback(async () => {
        try {
            setIsRefreshing(true);
            const freshData = await getDashboardData();
            setData(freshData as any);
            setLastRefresh(new Date());
        } catch {
            // silent fail — the server action may redirect
        } finally {
            setIsRefreshing(false);
        }
    }, []);

    // Auto-refresh polling
    useEffect(() => {
        const interval = setInterval(refresh, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, [refresh]);

    return (
        <div className="space-y-8 page-pattern pb-20">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 animate-fade-in overflow-hidden">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {greeting} 👋
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Resumen del día — {new Date().toLocaleDateString("es-AR", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                        })}
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                    <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/dashboard/reservations?new=true`}>
                            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 rounded-xl">
                                <Plus className="w-4 h-4 mr-2" />
                                Nueva Reserva
                            </Button>
                        </Link>
                        <Link href="/dashboard/pos">
                            <Button variant="outline" className="rounded-xl">
                                <ShoppingCart className="w-4 h-4 mr-2" />
                                Nueva Venta
                            </Button>
                        </Link>
                        <Link href="/dashboard/cash">
                            <Button variant="outline" className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400">
                                <Wallet className="w-4 h-4 mr-2" />
                                Caja
                            </Button>
                        </Link>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-xl"
                            onClick={refresh}
                            disabled={isRefreshing}
                            title="Actualizar datos"
                        >
                            <RefreshCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Pending Web Reservations Alert */}
            <PendingReservationsAlert pendingReservations={data?.pendingReservations ?? []} />

            {/* Imminent Turn Alert (<=15 mins) */}
            <ImminentTurnAlert reservations={data?.upcomingReservations ?? []} />

            {/* KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
                <KPICard
                    title="Ingresos del Día"
                    value={`$${(data?.todayRevenue ?? 0).toLocaleString()}`}
                    subtitle={`${data?.salesCount ?? 0} cobros realizados`}
                    icon={DollarSign}
                    color="emerald"
                />
                <KPICard
                    title="Reservas Hoy"
                    value={String(data?.todayReservations ?? 0)}
                    subtitle="turnos programados"
                    icon={CalendarDays}
                    color="blue"
                />
                <KPICard
                    title="Ocupación"
                    value={`${data?.occupancy ?? 0}%`}
                    subtitle={`${data?.activeReservations?.length ?? 0} canchas activas`}
                    icon={BarChart3}
                    color="amber"
                />
                <KPICard
                    title="Top Ventas"
                    value={data?.topProducts?.[0]?.name ?? "—"}
                    subtitle={data?.topProducts?.[0] ? `${data.topProducts[0].quantity} uds vendidas` : "Sin ventas"}
                    icon={Trophy}
                    color="purple"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <ActiveReservationsWidget activeReservations={data?.activeReservations ?? []} />
                </div>

                {/* Notifications / Upcoming */}
                <div className="space-y-4 animate-slide-up">
                    <h2 className="text-xl font-bold">Próximos Turnos</h2>
                    <UpcomingReservationsWidget upcomingReservations={data?.upcomingReservations ?? []} />

                    <FinishedReservationsWidget finishedReservations={data?.finishedReservations ?? []} />

                    <Link href="/dashboard/reservations" className="block">
                        <Button variant="ghost" className="w-full rounded-xl text-sm text-muted-foreground mt-4">
                            Ver agenda completa
                            <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Last refresh indicator */}
            <div className="text-center text-[10px] text-muted-foreground/50">
                Última actualización: {lastRefresh.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                {" · "}Se actualiza automáticamente cada 60 segundos
            </div>
        </div>
    );
}
