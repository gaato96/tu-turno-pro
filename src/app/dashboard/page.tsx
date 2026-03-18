import { getDashboardData } from "./actions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    CalendarDays,
    DollarSign,
    Users,
    Timer,
    AlertCircle,
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
} from "lucide-react";
import Link from "next/link";
import { ActiveReservationsWidget, UpcomingReservationsWidget } from "./dashboard-widgets";

function KPICard({
    title,
    value,
    subtitle,
    icon: Icon,
    trend,
    color = "emerald",
}: {
    title: string;
    value: string;
    subtitle?: string;
    icon: React.ElementType;
    trend?: string;
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
            {trend && (
                <div className="mt-3 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{trend}</span>
                </div>
            )}
        </Card>
    );
}

export default async function DashboardPage() {
    let data;
    try {
        data = await getDashboardData();
    } catch {
        data = null;
    }

    const greeting = (() => {
        const hour = new Date().getHours();
        if (hour < 12) return "Buenos días";
        if (hour < 18) return "Buenas tardes";
        return "Buenas noches";
    })();

    return (
        <div className="space-y-8 page-pattern">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
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
                <div className="flex flex-wrap gap-2">
                    <Link href="/dashboard/reservations?new=true">
                        <Button className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg shadow-emerald-500/20 rounded-xl">
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
                        <Button variant="outline" className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20">
                            <Wallet className="w-4 h-4 mr-2" />
                            Caja
                        </Button>
                    </Link>
                </div>
            </div>

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
                <ActiveReservationsWidget activeReservations={data?.activeReservations ?? []} />

                {/* Notifications / Upcoming */}
                <div className="space-y-4 animate-slide-up">
                    <h2 className="text-xl font-bold">Próximos Turnos</h2>
                    <UpcomingReservationsWidget upcomingReservations={data?.upcomingReservations ?? []} />

                    <Link href="/dashboard/reservations">
                        <Button variant="ghost" className="w-full rounded-xl text-sm text-muted-foreground">
                            Ver agenda completa
                            <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
