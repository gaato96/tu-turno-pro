"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { selectComplex } from "./actions";
import { Card } from "@/components/ui/card";
import { Building2, MapPin, ChevronRight, Activity } from "lucide-react";

export default function SelectComplexClient({ complexes, tenantName }: { complexes: any[], tenantName: string }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const handleSelect = (complexId: string) => {
        startTransition(async () => {
            try {
                const res = await selectComplex(complexId);
                if (res.success) {
                    toast.success("Cargando entorno...");
                    router.push(res.redirectUrl);
                }
            } catch (error: any) {
                toast.error(error.message || "Error al seleccionar complejo");
            }
        });
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 selection-bg page-pattern stagger-children relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl opacity-50 pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl opacity-50 pointer-events-none" />

            <div className="relative w-full max-w-4xl z-10">
                <div className="text-center mb-10 animate-fade-in">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-xl mb-6">
                        <Building2 className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight mb-2">¡Bienvenido de nuevo!</h1>
                    <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                        Estás administrando la cuenta de <span className="font-semibold text-foreground">{tenantName}</span>.
                        Selecciona el complejo al que deseas ingresar.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
                    {complexes.map((complex) => (
                        <button
                            key={complex.id}
                            onClick={() => handleSelect(complex.id)}
                            disabled={isPending}
                            className="text-left w-full block group focus:outline-none"
                        >
                            <Card className="h-full p-6 card-elevated card-hover-lift animate-fade-in border-border/50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md relative overflow-hidden transition-all duration-300">
                                {/* Hover gradient indicator */}
                                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-600 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />

                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300 text-emerald-600 dark:text-emerald-400">
                                        <Building2 className="w-6 h-6" />
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                                        <ChevronRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                </div>

                                <h3 className="text-xl font-bold mb-2 line-clamp-1">{complex.name}</h3>

                                {complex.address && (
                                    <div className="flex items-start text-sm text-muted-foreground mb-4 opacity-80">
                                        <MapPin className="w-4 h-4 mr-1.5 shrink-0 mt-0.5" />
                                        <span className="line-clamp-2">{complex.address}</span>
                                    </div>
                                )}

                                <div className="mt-auto pt-4 border-t border-border/50 flex items-center justify-between text-sm">
                                    <span className="font-medium flex items-center gap-1.5 opacity-80">
                                        <Activity className="w-4 h-4 text-emerald-500" />
                                        {complex.courtCount} {complex.courtCount === 1 ? 'Cancha' : 'Canchas'}
                                    </span>
                                </div>
                            </Card>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
