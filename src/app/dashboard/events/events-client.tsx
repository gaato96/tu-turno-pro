"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { Plus, Trash, Calendar as CalendarIcon, MapPin, Clock } from "lucide-react";
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
import { createEvent, deleteEvent } from "./actions";
import Link from "next/link";
import { Settings } from "lucide-react";

export default function EventsClient({ initialEvents, complexes, tenantId }: { initialEvents: any[], complexes: any[], tenantId: string }) {
    const [events, setEvents] = useState(initialEvents);
    const [showNew, setShowNew] = useState(false);
    const [isPending, startTransition] = useTransition();

    const [newEvent, setNewEvent] = useState({
        complexId: "",
        name: "",
        date: format(new Date(), "yyyy-MM-dd"),
        startTime: "18:00",
        endTime: "20:00",
        totalAmount: "",
        depositPaid: "",
    });

    const handleCreate = () => {
        if (!newEvent.name || !newEvent.complexId) {
            toast.error("Debe completar el nombre y complejo.");
            return;
        }
        startTransition(async () => {
            try {
                await createEvent({
                    tenantId,
                    complexId: newEvent.complexId,
                    name: newEvent.name,
                    date: newEvent.date,
                    startTime: newEvent.startTime,
                    endTime: newEvent.endTime,
                    totalAmount: Number(newEvent.totalAmount) || 0,
                    depositPaid: Number(newEvent.depositPaid) || 0,
                });
                toast.success("Evento creado exitosamente.");
                setShowNew(false);
                setTimeout(() => window.location.reload(), 1000);
            } catch (e: any) {
                toast.error(e.message || "Error al crear evento");
            }
        });
    };

    const handleDelete = (id: string) => {
        if (!confirm("¿Está seguro de eliminar este evento?")) return;
        startTransition(async () => {
             await deleteEvent(id);
             setEvents(events.filter(e => e.id !== id));
             toast.success("Evento eliminado");
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Eventos del Complejo</h1>
                <Button onClick={() => setShowNew(true)}>
                    <Plus className="w-4 h-4 mr-2" /> Nuevo Evento
                </Button>
            </div>

            <p className="text-muted-foreground text-sm">
                Nota: Los eventos <b>bloquean todas las canchas</b> del complejo durante su rango horario.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map(event => (
                    <Card key={event.id} className="p-5 space-y-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="font-bold text-lg">{event.name}</h3>
                                <p className="text-sm text-emerald-600 font-semibold capitalize">{event.status}</p>
                            </div>
                            <div className="flex gap-1">
                                <Link href={`/dashboard/events/${event.id}`}>
                                    <Button variant="ghost" size="icon" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                                        <Settings className="w-4 h-4" />
                                    </Button>
                                </Link>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(event.id)} className="text-red-500 hover:text-red-700">
                                    <Trash className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-2">
                            <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {event.complex.name}</div>
                            <div className="flex items-center gap-2"><CalendarIcon className="w-4 h-4" /> {format(new Date(event.date), "dd/MM/yyyy")}</div>
                            <div className="flex items-center gap-2"><Clock className="w-4 h-4" /> {format(new Date(event.startTime), "HH:mm")} a {format(new Date(event.endTime), "HH:mm")}</div>
                        </div>
                        <div className="pt-3 border-t">
                            <p className="text-sm">Total: <span className="font-semibold">${Number(event.totalAmount).toLocaleString()}</span></p>
                            <p className="text-sm">Cobrado: <span className="font-semibold text-emerald-600">${Number(event.paidAmount).toLocaleString()}</span></p>
                        </div>
                    </Card>
                ))}
            </div>

            <Dialog open={showNew} onOpenChange={setShowNew}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Crear Nuevo Evento</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <Label>Nombre del Evento</Label>
                            <Input value={newEvent.name} onChange={e => setNewEvent({...newEvent, name: e.target.value})} placeholder="Ej. Torneo Relámpago o Cumpleaños" />
                        </div>
                        <div className="col-span-2">
                            <Label>Sede / Complejo</Label>
                            <Select value={newEvent.complexId} onValueChange={v => setNewEvent({...newEvent, complexId: v})}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar complejo" />
                                </SelectTrigger>
                                <SelectContent>
                                    {complexes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="col-span-2">
                            <Label>Fecha</Label>
                            <Input type="date" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} />
                        </div>
                        <div>
                            <Label>Hora Inicio</Label>
                            <Input type="time" value={newEvent.startTime} onChange={e => setNewEvent({...newEvent, startTime: e.target.value})} />
                        </div>
                        <div>
                            <Label>Hora Fin</Label>
                            <Input type="time" value={newEvent.endTime} onChange={e => setNewEvent({...newEvent, endTime: e.target.value})} />
                        </div>
                        <div>
                            <Label>Costo Total (Opcional)</Label>
                            <Input type="number" placeholder="100000" value={newEvent.totalAmount} onChange={e => setNewEvent({...newEvent, totalAmount: e.target.value})} />
                        </div>
                        <div>
                            <Label>Seña Pagada (Opcional)</Label>
                            <Input type="number" placeholder="20000" value={newEvent.depositPaid} onChange={e => setNewEvent({...newEvent, depositPaid: e.target.value})} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNew(false)}>Cancelar</Button>
                        <Button onClick={handleCreate} disabled={isPending}>{isPending ? "Guardando..." : "Guardar Evento"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
