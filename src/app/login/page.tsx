"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trophy, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                setError("Credenciales incorrectas. Intentá de nuevo.");
            } else {
                router.push("/dashboard");
                router.refresh();
            }
        } catch {
            setError("Error de conexión. Intentá más tarde.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Left panel - Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900 relative overflow-hidden">
                {/* Decorative circles */}
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-emerald-400/10 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-300/5 rounded-full border border-emerald-400/10" />

                <div className="relative z-10 flex flex-col justify-center px-16 text-white">
                    <div className="mb-8">
                        <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mb-6">
                            <Trophy className="w-8 h-8" />
                        </div>
                        <h1 className="text-5xl font-bold tracking-tight mb-3">Tu Turno</h1>
                        <p className="text-emerald-200 text-lg font-light tracking-wider uppercase">Pro</p>
                    </div>
                    <p className="text-emerald-100/80 text-lg leading-relaxed max-w-md">
                        Gestión integral para complejos deportivos. Reservas, POS, inventario y analíticas en un solo lugar.
                    </p>
                    <div className="mt-12 flex gap-4">
                        {["Fútbol", "Pádel", "Tenis"].map((sport) => (
                            <span
                                key={sport}
                                className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-sm font-medium"
                            >
                                {sport}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right panel - Form */}
            <div className="flex-1 flex items-center justify-center p-8 bg-background">
                <div className="w-full max-w-md">
                    {/* Mobile logo */}
                    <div className="lg:hidden text-center mb-10">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <Trophy className="w-7 h-7 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold">Tu Turno <span className="text-emerald-600">Pro</span></h1>
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold mb-1">Bienvenido</h2>
                        <p className="text-muted-foreground mb-8">Ingresá tus credenciales para acceder al sistema</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-medium">
                                Correo electrónico
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="tu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="h-12 rounded-xl px-4 bg-muted/50 border-border focus:border-emerald-500 focus:ring-emerald-500/20"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-sm font-medium">
                                Contraseña
                            </Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="h-12 rounded-xl px-4 pr-12 bg-muted/50 border-border focus:border-emerald-500 focus:ring-emerald-500/20"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-fade-in">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold text-base shadow-lg shadow-emerald-500/20 transition-all duration-200"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Iniciar Sesión
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </>
                            )}
                        </Button>
                    </form>

                    <p className="text-center text-xs text-muted-foreground mt-8">
                        Tu Turno Pro v2.0 — Gestión Deportiva Integral
                    </p>
                </div>
            </div>
        </div>
    );
}
