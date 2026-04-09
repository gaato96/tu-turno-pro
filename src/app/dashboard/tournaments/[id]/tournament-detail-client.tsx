"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { Trophy, Users, CalendarDays, Plus, Trash, PlayCircle, Edit3, UserPlus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { addTeam, removeTeam, generateFixture, updateMatchResult, addPlayer, removePlayer, updatePlayerStats } from "./actions";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TournamentDetailClient({ initialTournament }: { initialTournament: any }) {
    const [tour, setTour] = useState(initialTournament);
    const [activeTab, setActiveTab] = useState<"posiciones" | "fixture" | "equipos">("posiciones");
    const [isPending, startTransition] = useTransition();

    const [showAddTeam, setShowAddTeam] = useState(false);
    const [newTeamName, setNewTeamName] = useState("");

    const [showResultDialog, setShowResultDialog] = useState<any>(null);
    const [homeGoals, setHomeGoals] = useState("");
    const [awayGoals, setAwayGoals] = useState("");

    // Player management state
    const [showPlayers, setShowPlayers] = useState<string | null>(null); // teamId
    const [newPlayerName, setNewPlayerName] = useState("");
    const [editingPlayer, setEditingPlayer] = useState<any>(null);
    const [playerStats, setPlayerStats] = useState({ goals: 0, yellowCards: 0, redCards: 0 });

    const handleAddTeam = () => {
        if (!newTeamName) return;
        startTransition(async () => {
             try {
                 await addTeam(tour.id, newTeamName);
                 toast.success("Equipo agregado");
                 setShowAddTeam(false);
                 setNewTeamName("");
                 setTimeout(() => window.location.reload(), 1000); // Para actualizar el estado completo más fácil
             } catch (e: any) {
                 toast.error(e.message || "Error al agregar equipo");
             }
        });
    };

    const handleRemoveTeam = (teamId: string) => {
        if (!confirm("Remove team?")) return;
        startTransition(async () => {
            try {
                await removeTeam(teamId, tour.id);
                toast.success("Equipo eliminado");
                setTimeout(() => window.location.reload(), 1000);
            } catch (e: any) {
                toast.error(e.message || "Error");
            }
        });
    };

    const handleGenerateFixture = () => {
        if (!confirm("¿Está seguro? Esto cerrará la inscripción y generará todos los partidos aleatoriamente.")) return;
        startTransition(async () => {
            try {
                await generateFixture(tour.id);
                toast.success("Torneo iniciado y fixture generado!");
                setTimeout(() => window.location.reload(), 1000);
            } catch (e: any) {
                toast.error(e.message || "Error");
            }
        });
    };

    const handleSaveResult = () => {
        if (!showResultDialog || homeGoals === "" || awayGoals === "") return;
        startTransition(async () => {
            try {
                await updateMatchResult(showResultDialog.id, tour.id, parseInt(homeGoals), parseInt(awayGoals));
                toast.success("Resultado guardado correctamente");
                setShowResultDialog(null);
                setTimeout(() => window.location.reload(), 1000);
            } catch (e: any) {
                toast.error(e.message || "Error");
            }
        });
    };

    const handleAddPlayer = (teamId: string) => {
        if (!newPlayerName.trim()) return;
        startTransition(async () => {
            try {
                await addPlayer(teamId, tour.id, newPlayerName);
                toast.success("Jugador agregado");
                setNewPlayerName("");
                setTimeout(() => window.location.reload(), 800);
            } catch (e: any) {
                toast.error(e.message || "Error");
            }
        });
    };

    const handleRemovePlayer = (playerId: string) => {
        startTransition(async () => {
            try {
                await removePlayer(playerId, tour.id);
                toast.success("Jugador eliminado");
                setTimeout(() => window.location.reload(), 800);
            } catch (e: any) {
                toast.error(e.message || "Error");
            }
        });
    };

    const handleSavePlayerStats = () => {
        if (!editingPlayer) return;
        startTransition(async () => {
            try {
                await updatePlayerStats(editingPlayer.id, tour.id, playerStats.goals, playerStats.yellowCards, playerStats.redCards);
                toast.success("Estadísticas guardadas");
                setEditingPlayer(null);
                setTimeout(() => window.location.reload(), 800);
            } catch (e: any) {
                toast.error(e.message || "Error");
            }
        });
    };

    // Group matches by matchDay
    const matchesByDay = tour.matches.reduce((acc: any, match: any) => {
        acc[match.matchDay] = acc[match.matchDay] || [];
        acc[match.matchDay].push(match);
        return acc;
    }, {});

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-border/50">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/tournaments">
                        <Button variant="ghost" size="icon" className="rounded-xl"><ArrowLeft className="w-5 h-5"/></Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold">{tour.name}</h1>
                            <span className="text-xs font-bold uppercase tracking-widest bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400 px-2 py-1 rounded-md">
                                {tour.status}
                            </span>
                        </div>
                        <p className="text-muted-foreground text-sm mt-1 flex items-center gap-4">
                            <span className="flex items-center gap-1"><Trophy className="w-4 h-4"/> {tour.sportType}</span>
                            <span className="flex items-center gap-1"><Users className="w-4 h-4"/> {tour.teams.length} / {tour.maxTeams} Equipos</span>
                        </p>
                    </div>
                </div>
                {tour.status === "registration" && (
                    <Button onClick={handleGenerateFixture} disabled={isPending || tour.teams.length < 2} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-500/20">
                        <PlayCircle className="w-5 h-5 mr-2" /> Sortear Fixture e Iniciar
                    </Button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex space-x-2 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-2xl w-fit">
                {(["posiciones", "fixture", "equipos"]).map(t => (
                    <button
                        key={t}
                        onClick={() => setActiveTab(t as any)}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold capitalize transition-all ${activeTab === t ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {/* Tab: Posiciones */}
            {activeTab === "posiciones" && (
                <Card className="rounded-3xl border-border/50 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase bg-slate-50 dark:bg-slate-900 border-b">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-center w-12">Pos</th>
                                    <th className="px-6 py-4 font-semibold">Equipo</th>
                                    <th className="px-4 py-4 font-semibold text-center hidden sm:table-cell">PJ</th>
                                    <th className="px-4 py-4 font-semibold text-center hidden sm:table-cell">G</th>
                                    <th className="px-4 py-4 font-semibold text-center hidden sm:table-cell">E</th>
                                    <th className="px-4 py-4 font-semibold text-center hidden sm:table-cell">P</th>
                                    <th className="px-4 py-4 font-semibold text-center hidden lg:table-cell">GF</th>
                                    <th className="px-4 py-4 font-semibold text-center hidden lg:table-cell">GC</th>
                                    <th className="px-4 py-4 font-semibold text-center hidden lg:table-cell">DIF</th>
                                    <th className="px-6 py-4 font-bold text-center text-emerald-600 dark:text-emerald-400">PTS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tour.teams.map((team: any, i: number) => (
                                    <tr key={team.id} className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 text-center font-bold text-muted-foreground">{i + 1}</td>
                                        <td className="px-6 py-4 font-bold">{team.name}</td>
                                        <td className="px-4 py-4 text-center hidden sm:table-cell">{team.gamesPlayed}</td>
                                        <td className="px-4 py-4 text-center hidden sm:table-cell">{team.wins}</td>
                                        <td className="px-4 py-4 text-center hidden sm:table-cell">{team.draws}</td>
                                        <td className="px-4 py-4 text-center hidden sm:table-cell">{team.losses}</td>
                                        <td className="px-4 py-4 text-center hidden lg:table-cell">{team.goalsFor}</td>
                                        <td className="px-4 py-4 text-center hidden lg:table-cell">{team.goalsAgainst}</td>
                                        <td className="px-4 py-4 text-center hidden lg:table-cell">{team.goalsFor - team.goalsAgainst}</td>
                                        <td className="px-6 py-4 text-center font-bold text-emerald-600 dark:text-emerald-400 text-lg">{team.points}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Tab: Equipos */}
            {activeTab === "equipos" && (
                <div className="space-y-4">
                    {tour.status === "registration" && (
                        <Button onClick={() => setShowAddTeam(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
                            <Plus className="w-4 h-4 mr-2" /> Inscribir Equipo
                        </Button>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        {tour.teams.map((t: any) => (
                            <Card key={t.id} className="p-4 rounded-2xl border-border/50 shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="font-bold flex items-center gap-2 text-base">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border text-xs">🛡️</div>
                                        {t.name}
                                        <span className="text-xs text-muted-foreground font-normal">({t.players?.length || 0} jugadores)</span>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="sm" className="rounded-lg text-emerald-600 text-xs" onClick={() => setShowPlayers(showPlayers === t.id ? null : t.id)}>
                                            <UserPlus className="w-3.5 h-3.5 mr-1" /> Jugadores
                                        </Button>
                                        {tour.status === "registration" && (
                                            <Button variant="ghost" size="icon" onClick={() => handleRemoveTeam(t.id)} className="text-red-500 hover:text-red-700 w-8 h-8">
                                                <Trash className="w-3.5 h-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Players panel */}
                                {showPlayers === t.id && (
                                    <div className="mt-3 border-t pt-3 space-y-2">
                                        {t.players?.length === 0 && (
                                            <p className="text-xs text-muted-foreground text-center py-2">No hay jugadores inscritos</p>
                                        )}
                                        {t.players?.map((p: any) => (
                                            <div key={p.id} className="flex items-center justify-between text-sm bg-muted/40 rounded-lg px-3 py-2">
                                                <span className="font-medium truncate flex-1">{p.name}</span>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                                                    <span className="flex items-center gap-0.5">⚽ {p.goals}</span>
                                                    <span className="w-3 h-4 bg-yellow-400 rounded-sm inline-block" title="Amarillas"></span>{p.yellowCards}
                                                    <span className="w-3 h-4 bg-red-500 rounded-sm inline-block" title="Rojas"></span>{p.redCards}
                                                    <Button variant="ghost" size="icon" className="w-6 h-6 text-blue-500" onClick={() => { setEditingPlayer(p); setPlayerStats({ goals: p.goals, yellowCards: p.yellowCards, redCards: p.redCards }); }}>
                                                        <Edit3 className="w-3 h-3" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="w-6 h-6 text-red-500" onClick={() => handleRemovePlayer(p.id)}>
                                                        <Trash className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                        <div className="flex gap-2 pt-2">
                                            <Input
                                                placeholder="Nombre del jugador"
                                                value={newPlayerName}
                                                onChange={e => setNewPlayerName(e.target.value)}
                                                onKeyDown={e => e.key === "Enter" && handleAddPlayer(t.id)}
                                                className="h-8 rounded-lg text-sm"
                                            />
                                            <Button size="sm" className="h-8 rounded-lg bg-emerald-600 text-white" onClick={() => handleAddPlayer(t.id)} disabled={isPending}>
                                                <Plus className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Tab: Fixture */}
            {activeTab === "fixture" && (
                <div className="space-y-8">
                    {tour.matches.length === 0 ? (
                        <div className="text-center p-12 bg-muted/30 border-2 border-dashed rounded-3xl">
                            <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50"/>
                            <h3 className="text-lg font-bold">El fixture no ha sido generado</h3>
                            <p className="text-muted-foreground mt-2 max-w-md mx-auto">Cuando todos los equipos estén inscritos, haz click en "Sortear Fixture e Iniciar" para crear el calendario de partidos automáticamente.</p>
                        </div>
                    ) : (
                        Object.keys(matchesByDay).sort((a,b)=>Number(a)-Number(b)).map((day) => (
                            <div key={day} className="space-y-4">
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400 px-3 py-1 rounded-lg text-sm uppercase tracking-widest">
                                        Fecha {day}
                                    </span>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {matchesByDay[day].map((match: any) => (
                                        <Card key={match.id} className="p-4 rounded-2xl flex flex-col justify-center border-border/50 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                                            {match.homeTeamId === "FREE" || match.awayTeamId === "FREE" ? (
                                                <div className="text-center py-4">
                                                    <p className="font-bold text-muted-foreground"> LIBRE: <span className="text-foreground">{match.homeTeam?.name || match.awayTeam?.name}</span></p>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex justify-between items-center w-full">
                                                        <div className="flex-1 text-right font-bold truncate pr-3">{match.homeTeam?.name}</div>
                                                        <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold min-w-[80px] text-center border">
                                                            {match.status === "played" ? `${match.homeGoals} - ${match.awayGoals}` : "vs"}
                                                        </div>
                                                        <div className="flex-1 text-left font-bold truncate pl-3">{match.awayTeam?.name}</div>
                                                    </div>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm"
                                                        onClick={() => {
                                                            setShowResultDialog(match);
                                                            setHomeGoals(match.homeGoals?.toString() || "");
                                                            setAwayGoals(match.awayGoals?.toString() || "");
                                                        }}
                                                        className="mt-4 mx-auto w-fit text-xs rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                                    >
                                                        <Edit3 className="w-3 h-3 mr-1" /> {match.status === "played" ? "Editar Resultado" : "Cargar Resultado"}
                                                    </Button>
                                                </>
                                            )}
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Dialogs */}
            <Dialog open={showAddTeam} onOpenChange={setShowAddTeam}>
                <DialogContent className="rounded-3xl">
                    <DialogHeader>
                        <DialogTitle>Inscribir Equipo</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Label>Nombre del Equipo</Label>
                        <Input value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder="Ej. Los Pumas FC" className="h-12 mt-2 rounded-xl" />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddTeam(false)} className="rounded-xl">Cancelar</Button>
                        <Button onClick={handleAddTeam} disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">Guardar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!showResultDialog} onOpenChange={(open) => !open && setShowResultDialog(null)}>
                <DialogContent className="rounded-3xl sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="text-center text-xl">Resultado del Partido</DialogTitle>
                    </DialogHeader>
                    {showResultDialog && (
                        <div className="py-6 flex items-center justify-between gap-4">
                            <div className="flex flex-col items-center gap-2 flex-1">
                                <Label className="text-center font-bold text-sm truncate w-full">{showResultDialog.homeTeam?.name}</Label>
                                <Input type="number" min="0" value={homeGoals} onChange={e => setHomeGoals(e.target.value)} className="h-20 text-4xl text-center font-black rounded-2xl bg-muted border-2 border-transparent focus:border-emerald-500" />
                            </div>
                            <div className="text-2xl font-black text-muted-foreground/30">-</div>
                            <div className="flex flex-col items-center gap-2 flex-1">
                                <Label className="text-center font-bold text-sm truncate w-full">{showResultDialog.awayTeam?.name}</Label>
                                <Input type="number" min="0" value={awayGoals} onChange={e => setAwayGoals(e.target.value)} className="h-20 text-4xl text-center font-black rounded-2xl bg-muted border-2 border-transparent focus:border-emerald-500" />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowResultDialog(null)} className="rounded-xl w-full">Cancelar</Button>
                        <Button onClick={handleSaveResult} disabled={isPending || homeGoals === "" || awayGoals === ""} className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl w-full">Guardar Resultado</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Player Stats Dialog */}
            <Dialog open={!!editingPlayer} onOpenChange={(open) => !open && setEditingPlayer(null)}>
                <DialogContent className="rounded-3xl sm:max-w-[380px]">
                    <DialogHeader><DialogTitle>Estadísticas: {editingPlayer?.name}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                        <div>
                            <Label>⚽ Goles</Label>
                            <Input type="number" min="0" value={playerStats.goals} onChange={e => setPlayerStats({...playerStats, goals: Number(e.target.value)})} className="mt-1.5 rounded-xl" />
                        </div>
                        <div>
                            <Label>🟨 Tarjetas Amarillas</Label>
                            <Input type="number" min="0" value={playerStats.yellowCards} onChange={e => setPlayerStats({...playerStats, yellowCards: Number(e.target.value)})} className="mt-1.5 rounded-xl" />
                        </div>
                        <div>
                            <Label>🟥 Tarjetas Rojas</Label>
                            <Input type="number" min="0" value={playerStats.redCards} onChange={e => setPlayerStats({...playerStats, redCards: Number(e.target.value)})} className="mt-1.5 rounded-xl" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingPlayer(null)} className="rounded-xl">Cancelar</Button>
                        <Button onClick={handleSavePlayerStats} disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">Guardar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
