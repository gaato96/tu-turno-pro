"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Trophy, CalendarDays, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function PublicTournamentClient({ tournament }: { tournament: any }) {
    const [activeTab, setActiveTab] = useState<"posiciones" | "fixture">("posiciones");

    const matchesByDay = tournament.matches.reduce((acc: any, match: any) => {
        acc[match.matchDay] = acc[match.matchDay] || [];
        acc[match.matchDay].push(match);
        return acc;
    }, {});

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-12">
            {/* Header / Hero */}
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white pt-16 pb-24 px-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
                    <Trophy className="w-64 h-64" />
                </div>
                <div className="max-w-4xl mx-auto relative z-10 flex flex-col items-center text-center space-y-4">
                    <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase backdrop-blur-md">
                        {tournament.status === "registration" ? "Inscripciones Abiertas" : tournament.status === "in_progress" ? "Torneo en Juego" : "Finalizado"}
                    </span>
                    <h1 className="text-4xl md:text-5xl font-black">{tournament.name}</h1>
                    <div className="flex flex-wrap justify-center gap-4 text-emerald-100 font-medium">
                        <span className="flex items-center gap-1"><MapPin className="w-4 h-4"/> Sede: {tournament.complex.name}</span>
                        <span className="flex items-center gap-1"><Trophy className="w-4 h-4"/> {tournament.sportType}</span>
                        {tournament.startDate && <span className="flex items-center gap-1"><CalendarDays className="w-4 h-4"/> Inicia: {format(new Date(tournament.startDate), "dd/MM/yyyy")}</span>}
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 -mt-10 relative z-20 space-y-8">
                {/* Tabs */}
                <div className="flex justify-center">
                    <div className="flex space-x-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-lg border border-border/50">
                        {(["posiciones", "fixture"]).map(t => (
                            <button
                                key={t}
                                onClick={() => setActiveTab(t as any)}
                                className={`px-8 py-3 rounded-xl text-sm font-bold capitalize transition-all ${activeTab === t ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab: Posiciones */}
                {activeTab === "posiciones" && (
                    <Card className="rounded-3xl border-border/50 shadow-xl overflow-hidden bg-white dark:bg-slate-900">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-muted-foreground uppercase bg-slate-50 dark:bg-slate-900/50 border-b">
                                    <tr>
                                        <th className="px-6 py-5 font-bold text-center w-12">Pos</th>
                                        <th className="px-6 py-5 font-bold">Equipo</th>
                                        <th className="px-4 py-5 font-bold text-center hidden sm:table-cell" title="Partidos Jugados">PJ</th>
                                        <th className="px-4 py-5 font-bold text-center hidden sm:table-cell" title="Ganados">G</th>
                                        <th className="px-4 py-5 font-bold text-center hidden sm:table-cell" title="Empatados">E</th>
                                        <th className="px-4 py-5 font-bold text-center hidden sm:table-cell" title="Perdidos">P</th>
                                        <th className="px-4 py-5 font-bold text-center hidden lg:table-cell" title="Goles a Favor">GF</th>
                                        <th className="px-4 py-5 font-bold text-center hidden lg:table-cell" title="Goles en Contra">GC</th>
                                        <th className="px-4 py-5 font-bold text-center hidden lg:table-cell" title="Diferencia de Gol">DIF</th>
                                        <th className="px-6 py-5 font-black text-center text-emerald-600 dark:text-emerald-400">PTS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tournament.teams.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} className="text-center py-12 text-muted-foreground">Aún no hay equipos inscritos</td>
                                        </tr>
                                    ) : null}
                                    {tournament.teams.map((team: any, i: number) => (
                                        <tr key={team.id} className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-5 text-center font-black text-slate-400">{i + 1}</td>
                                            <td className="px-6 py-5 font-black text-base">{team.name}</td>
                                            <td className="px-4 py-5 text-center hidden sm:table-cell font-medium">{team.gamesPlayed}</td>
                                            <td className="px-4 py-5 text-center hidden sm:table-cell font-medium">{team.wins}</td>
                                            <td className="px-4 py-5 text-center hidden sm:table-cell font-medium">{team.draws}</td>
                                            <td className="px-4 py-5 text-center hidden sm:table-cell font-medium">{team.losses}</td>
                                            <td className="px-4 py-5 text-center hidden lg:table-cell font-medium">{team.goalsFor}</td>
                                            <td className="px-4 py-5 text-center hidden lg:table-cell font-medium">{team.goalsAgainst}</td>
                                            <td className="px-4 py-5 text-center hidden lg:table-cell font-medium">{team.goalsFor - team.goalsAgainst}</td>
                                            <td className="px-6 py-5 text-center font-black text-emerald-600 dark:text-emerald-400 text-xl">{team.points}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}

                {/* Tab: Fixture */}
                {activeTab === "fixture" && (
                    <div className="space-y-8">
                        {tournament.matches.length === 0 ? (
                            <div className="text-center p-12 bg-white dark:bg-slate-900 border border-border/50 rounded-3xl shadow-lg">
                                <CalendarDays className="w-16 h-16 text-slate-200 dark:text-slate-800 mx-auto mb-4"/>
                                <h3 className="text-2xl font-bold">Fixture en preparación</h3>
                                <p className="text-muted-foreground mt-2 max-w-md mx-auto">Vuelve pronto. Cuando cierren las inscripciones publicaremos el fixture aquí.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {Object.keys(matchesByDay).sort((a,b)=>Number(a)-Number(b)).map((day) => (
                                    <div key={day} className="space-y-4">
                                        <h3 className="font-bold text-lg flex items-center justify-center gap-2 text-slate-500">
                                            <span className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-1.5 rounded-full text-xs uppercase tracking-widest">
                                                Fecha {day}
                                            </span>
                                        </h3>
                                        <div className="space-y-3">
                                            {matchesByDay[day].map((match: any) => (
                                                <Card key={match.id} className="p-4 rounded-2xl flex flex-col justify-center border-border/50 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] transition-shadow">
                                                    {match.homeTeamId === "FREE" || match.awayTeamId === "FREE" ? (
                                                        <div className="text-center py-2">
                                                            <p className="font-bold text-muted-foreground text-sm uppercase tracking-widest"> Libre: <span className="text-foreground">{match.homeTeam?.name || match.awayTeam?.name}</span></p>
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-between items-center w-full">
                                                            <div className="flex-1 text-right font-bold truncate pr-3">{match.homeTeam?.name}</div>
                                                            <div className={`px-4 py-2 rounded-xl font-black min-w-[80px] text-center text-lg ${match.status === "played" ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200/50' : 'bg-slate-100 dark:bg-slate-800 border text-slate-400'}`}>
                                                                {match.status === "played" ? `${match.homeGoals} - ${match.awayGoals}` : "vs"}
                                                            </div>
                                                            <div className="flex-1 text-left font-bold truncate pl-3">{match.awayTeam?.name}</div>
                                                        </div>
                                                    )}
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            <div className="text-center mt-12 pb-8 border-t pt-8 max-w-4xl mx-auto opacity-50 font-medium">
                <p>Gestionado con <span className="font-bold text-emerald-600">Tu Turno Pro</span></p>
            </div>
        </div>
    );
}
