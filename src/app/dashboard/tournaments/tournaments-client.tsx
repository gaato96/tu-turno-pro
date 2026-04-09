"use client";

import { useState, useTransition } from "react";
import { Plus, Trash, Trophy, Users, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { createTournament, deleteTournament } from "./actions";
import Link from "next/link";

export default function TournamentsClient({ initialTournaments, complexes, tenantId }: { initialTournaments: any[], complexes: any[], tenantId: string }) {
    const [tournaments, setTournaments] = useState(initialTournaments);
    const [showNew, setShowNew] = useState(false);
    const [isPending, startTransition] = useTransition();

    const [newTour, setNewTour] = useState({
        complexId: complexes.length > 0 ? complexes[0].id : "",
        name: "",
        sportType: "futbol",
        maxTeams: "16",
        inscriptionFee: "",
    });

    const handleCreate = () => {
        if (!newTour.name || !newTour.complexId) {
            toast.error("Debe completar el nombre y complejo.");
            return;
        }
        startTransition(async () => {
            try {
                await createTournament({
                    tenantId,
                    complexId: newTour.complexId,
                    name: newTour.name,
                    sportType: newTour.sportType,
                    maxTeams: Number(newTour.maxTeams) || 16,
                    inscriptionFee: Number(newTour.inscriptionFee) || 0,
                });
                toast.success("Torneo creado exitosamente.");
                setShowNew(false);
                setTimeout(() => window.location.reload(), 1000);
            } catch (e: any) {
                toast.error(e.message || "Error al crear torneo");
            }
        });
    };

    const handleDelete = (id: string) => {
        if (!confirm("¿Está seguro de eliminar este torneo? Todas las estadísticas se perderán.")) return;
        startTransition(async () => {
             await deleteTournament(id);
             setTournaments(tournaments.filter(e => e.id !== id));
             toast.success("Torneo eliminado");
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Gestión de Torneos</h1>
                <Button onClick={() => setShowNew(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
                    <Plus className="w-4 h-4 mr-2" /> Nuevo Torneo
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tournaments.length === 0 && (
                    <div className="col-span-full p-8 text-center bg-muted/30 rounded-2xl border-2 border-dashed">
                        <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-30" />
                        <h3 className="text-lg font-bold text-muted-foreground">Aún no hay torneos</h3>
                        <p className="text-sm text-muted-foreground">Crea tu primer torneo para comenzar a registrar equipos.</p>
                    </div>
                )}
                {tournaments.map(tour => (
                    <Card key={tour.id} className="p-5 flex flex-col rounded-2xl hover:border-emerald-500/50 transition-colors">
                        <div className="flex flex-1 flex-col">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-bold text-lg">{tour.name}</h3>
                                    <p className="text-xs text-muted-foreground bg-muted inline-block px-2 py-0.5 rounded-full mt-1 uppercase tracking-wider">{tour.status}</p>
                                </div>
                            </div>
                            
                            <div className="space-y-2 mt-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2"><Trophy className="w-4 h-4" /> Deporte: {tour.sportType}</div>
                                <div className="flex items-center gap-2"><Users className="w-4 h-4" /> Equipos: {tour.teams?.length || 0} / {tour.maxTeams}</div>
                            </div>
                        </div>

                        <div className="pt-4 border-t mt-4 flex gap-2">
                            <Link href={`/dashboard/tournaments/${tour.id}`} className="flex-1">
                                <Button className="w-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400">
                                    <Settings className="w-4 h-4 mr-2" />
                                    Gestionar
                                </Button>
                            </Link>
                            <Button variant="outline" size="icon" onClick={() => handleDelete(tour.id)} className="text-red-500 hover:text-red-700 border-red-200 hover:bg-red-50">
                                <Trash className="w-4 h-4" />
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>

            <Dialog open={showNew} onOpenChange={setShowNew}>
                <DialogContent className="rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>Crear Torneo</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <Label>Nombre del Torneo</Label>
                            <Input 
                                value={newTour.name} 
                                onChange={e => setNewTour({...newTour, name: e.target.value})} 
                                placeholder="Ej. Copa de Verano 2024" 
                                className="rounded-xl mt-1.5"
                            />
                        </div>
                        <div className="col-span-2">
                            <Label>Complejo de Sede</Label>
                            <Select value={newTour.complexId} onValueChange={v => setNewTour({...newTour, complexId: v || ""})}>
                                <SelectTrigger className="rounded-xl mt-1.5"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {complexes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Deporte</Label>
                            <Select value={newTour.sportType} onValueChange={v => setNewTour({...newTour, sportType: v || "futbol"})}>
                                <SelectTrigger className="rounded-xl mt-1.5"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="futbol">Fútbol</SelectItem>
                                    <SelectItem value="padel">Pádel</SelectItem>
                                    <SelectItem value="tenis">Tenis</SelectItem>
                                    <SelectItem value="basquet">Básquet</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Límite de Equipos</Label>
                            <Input type="number" value={newTour.maxTeams} onChange={e => setNewTour({...newTour, maxTeams: e.target.value})} className="rounded-xl mt-1.5" />
                        </div>
                        <div className="col-span-2">
                            <Label>Costo de Inscripción por Equipo ($)</Label>
                            <Input type="number" placeholder="25000" value={newTour.inscriptionFee} onChange={e => setNewTour({...newTour, inscriptionFee: e.target.value})} className="rounded-xl mt-1.5" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNew(false)} className="rounded-xl">Cancelar</Button>
                        <Button onClick={handleCreate} disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
                            {isPending ? "Creando..." : "Crear Torneo"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
