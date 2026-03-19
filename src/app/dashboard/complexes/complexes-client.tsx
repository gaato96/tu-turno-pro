"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Building2, MapPin, Clock, Edit2, Trash2, CalendarDays } from "lucide-react";
import { CreateComplexDialog } from "./create-complex-dialog";
import { EditComplexDialog } from "./edit-complex-dialog";
import { CreateCourtDialog } from "./create-court-dialog";
import { deleteComplex, deleteCourt } from "./actions";
import { toast } from "sonner";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";

interface Court {
    id: string;
    name: string;
    sportType: string;
    dayRate: number;
    nightRate: number;
    nightRateStartTime: string;
    isActive: boolean;
    displayOrder: number;
    parentCourtId: string | null;
    parentCourtName: string | null;
    childCourts: { id: string; name: string }[];
}

interface Complex {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    openingTime: string;
    closingTime: string;
    sportTypes: string[];
    isActive: boolean;
    courtsCount: number;
    reservationsCount: number;
    courts: Court[];
}

export function ComplexesClient({ initialComplexes }: { initialComplexes: Complex[] }) {
    const [complexes, setComplexes] = useState(initialComplexes);
    const [editingComplex, setEditingComplex] = useState<Complex | null>(null);
    const [creatingCourtFor, setCreatingCourtFor] = useState<Complex | null>(null);
    const [editingCourt, setEditingCourt] = useState<{ court: Court, complexId: string } | null>(null);

    const handleDeleteComplex = async (complex: Complex) => {
        if (!confirm(`¿Estás seguro de eliminar el complejo "${complex.name}"? Se eliminarán todas sus canchas.`)) return;
        try {
            await deleteComplex(complex.id);
            toast.success("Complejo eliminado");
            setComplexes(complexes.filter(c => c.id !== complex.id));
        } catch {
            toast.error("Error al eliminar complejo");
        }
    };

    const handleDeleteCourt = async (court: Court, complexId: string) => {
        if (!confirm(`¿Eliminar la cancha "${court.name}"?`)) return;
        try {
            await deleteCourt(court.id);
            toast.success("Cancha eliminada");
            // Update local state instead of doing full reload for snappier UI
            setComplexes(complexes.map(c => {
                if (c.id === complexId) {
                    return { ...c, courts: c.courts.filter(ct => ct.id !== court.id) };
                }
                return c;
            }));
        } catch {
            toast.error("Error al eliminar cancha");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <CreateComplexDialog />
            </div>

            {complexes.length === 0 ? (
                <Card className="flex flex-col items-center justify-center py-16 text-center border-dashed">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                        <Building2 className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-bold mb-1">Sin complejos</h3>
                    <p className="text-muted-foreground mb-4 max-w-sm">
                        Todavía no tenés complejos creados. Empezá agregando tu primera sede.
                    </p>
                    <CreateComplexDialog />
                </Card>
            ) : (
                <div className="grid gap-6">
                    {complexes.map((complex) => (
                        <Card key={complex.id} className="overflow-hidden border-border/50 card-elevated">
                            {/* Complex Header */}
                            <div className="bg-card p-6 border-b border-border/50">
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <h2 className="text-xl font-bold">{complex.name}</h2>
                                            {!complex.isActive && (
                                                <Badge variant="destructive" className="rounded-full">Inactivo</Badge>
                                            )}
                                            <div className="flex gap-1">
                                                {complex.sportTypes.map((sport) => (
                                                    <Badge key={sport} variant="secondary" className="rounded-full text-[10px] uppercase">
                                                        {sport}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                                            {complex.address && (
                                                <div className="flex items-center gap-1.5">
                                                    <MapPin className="w-4 h-4 text-emerald-500" />
                                                    {complex.address}
                                                </div>
                                            )}
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="w-4 h-4 text-blue-500" />
                                                {complex.openingTime} - {complex.closingTime}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <CalendarDays className="w-4 h-4 text-amber-500" />
                                                {complex.reservationsCount} reservas
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCreatingCourtFor(complex)}
                                            className="bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
                                        >
                                            <Plus className="w-4 h-4 mr-1" />
                                            Nueva Cancha
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setEditingComplex(complex)}
                                        >
                                            <Edit2 className="w-4 h-4 mr-1" />
                                            Editar
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => handleDeleteComplex(complex)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Courts Section */}
                            <div className="p-0 sm:p-6 bg-muted/20">
                                {complex.courts.length === 0 ? (
                                    <div className="text-center py-8">
                                        <p className="text-muted-foreground mb-3 text-sm">Este complejo no tiene canchas todavía.</p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCreatingCourtFor(complex)}
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Agregar Primera Cancha
                                        </Button>
                                    </div>
                                ) : (
                                    <Accordion defaultValue={["courts"]} className="w-full bg-card rounded-xl border sm:shadow-sm">
                                        <AccordionItem value="courts" className="border-none">
                                            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50 transition-colors rounded-xl">
                                                <div className="flex items-center gap-2 font-semibold">
                                                    <span className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center text-xs">
                                                        {complex.courts.length}
                                                    </span>
                                                    Canchas configuradas
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="px-4 pb-4 pt-1">
                                                <div className="space-y-3 mt-2">
                                                    {complex.courts.map((court) => (
                                                        <div key={court.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border bg-card hover:border-emerald-500/30 transition-colors gap-4">
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-semibold">{court.name}</span>
                                                                    <Badge variant="outline" className="text-[10px] uppercase bg-muted/50">
                                                                        {court.sportType}
                                                                    </Badge>
                                                                    {!court.isActive && (
                                                                        <Badge variant="secondary" className="text-[10px] text-red-500 bg-red-100 dark:bg-red-500/10">Inactiva</Badge>
                                                                    )}
                                                                </div>
                                                                {court.parentCourtName && (
                                                                    <p className="text-xs text-muted-foreground">
                                                                        Sub-cancha de: <span className="font-medium text-foreground">{court.parentCourtName}</span>
                                                                    </p>
                                                                )}
                                                                {court.childCourts.length > 0 && (
                                                                    <p className="text-xs text-muted-foreground">
                                                                        Contiene: {court.childCourts.map(c => c.name).join(", ")}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                                                                <div className="flex gap-4 text-sm">
                                                                    <div className="text-right">
                                                                        <p className="text-xs text-muted-foreground">Día</p>
                                                                        <p className="font-medium">${court.dayRate.toLocaleString()}</p>
                                                                    </div>
                                                                    <Separator orientation="vertical" className="h-8" />
                                                                    <div className="text-right">
                                                                        <p className="text-xs text-muted-foreground">
                                                                            Noche <span className="text-[10px]">({court.nightRateStartTime})</span>
                                                                        </p>
                                                                        <p className="font-medium text-emerald-600 dark:text-emerald-400">${court.nightRate.toLocaleString()}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex gap-1 shrink-0">
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingCourt({ court, complexId: complex.id })}>
                                                                        <Edit2 className="w-4 h-4" />
                                                                    </Button>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteCourt(court, complex.id)}>
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {editingComplex && (
                <EditComplexDialog
                    complex={editingComplex}
                    onClose={() => setEditingComplex(null)}
                />
            )}

            {creatingCourtFor && (
                <CreateCourtDialog
                    complex={creatingCourtFor}
                    onClose={() => setCreatingCourtFor(null)}
                />
            )}

            {editingCourt && (
                <CreateCourtDialog
                    complex={complexes.find(c => c.id === editingCourt.complexId)!}
                    courtToEdit={editingCourt.court}
                    onClose={() => setEditingCourt(null)}
                />
            )}
        </div>
    );
}
