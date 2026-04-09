"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function addTeam(tournamentId: string, name: string) {
    const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: { teams: true }
    });

    if (!tournament) throw new Error("Torneo no encontrado");
    if (tournament.teams.length >= tournament.maxTeams) {
        throw new Error(`El torneo ya alcanzó el límite de ${tournament.maxTeams} equipos.`);
    }
    if (tournament.status !== "registration") {
        throw new Error("El torneo ya no está en fase de inscripción.");
    }

    await prisma.tournamentTeam.create({
        data: {
            tournamentId,
            name,
        }
    });

    revalidatePath(`/dashboard/tournaments/${tournamentId}`);
    return { success: true };
}

export async function removeTeam(teamId: string, tournamentId: string) {
    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (tournament?.status !== "registration") {
        throw new Error("No se pueden eliminar equipos una vez que el torneo ha comenzado o finalizado.");
    }

    await prisma.tournamentTeam.delete({ where: { id: teamId } });
    revalidatePath(`/dashboard/tournaments/${tournamentId}`);
    return { success: true };
}

export async function generateFixture(tournamentId: string) {
    const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: { teams: true, matches: true }
    });

    if (!tournament) throw new Error("Torneo no encontrado");
    if (tournament.teams.length < 2) throw new Error("Se necesitan al menos 2 equipos para generar un fixture.");
    if (tournament.matches.length > 0) throw new Error("El fixture ya fue generado. Elimine los partidos primero o reinicie el torneo.");

    const teams = [...tournament.teams];
    
    // Si la cantidad de equipos es impar, agregamos un equipo "Libre" (null)
    if (teams.length % 2 !== 0) {
        teams.push({ id: "FREE", name: "Libre", tournamentId, points: 0, gamesPlayed: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 });
    }

    const numDays = teams.length - 1;
    const halfSize = teams.length / 2;

    const matchesToCreate: any[] = [];

    for (let day = 0; day < numDays; day++) {
        for (let i = 0; i < halfSize; i++) {
            const home = teams[i];
            const away = teams[teams.length - 1 - i];

            // Si ninguno es "Libre", crear partido
            if (home.id !== "FREE" && away.id !== "FREE") {
                // Alternar local/visitante cada fecha para balancear
                const isEvenDay = day % 2 === 0;
                matchesToCreate.push({
                    tournamentId,
                    matchDay: day + 1,
                    homeTeamId: isEvenDay ? home.id : away.id,
                    awayTeamId: isEvenDay ? away.id : home.id,
                    status: "scheduled"
                });
            }
        }
        // Rotar equipos (todos menos el primero)
        teams.splice(1, 0, teams.pop()!);
    }

    await prisma.$transaction(async (tx) => {
        await tx.tournamentMatch.createMany({
            data: matchesToCreate
        });
        await tx.tournament.update({
            where: { id: tournamentId },
            data: { status: "in_progress" }
        });
    });

    revalidatePath(`/dashboard/tournaments/${tournamentId}`);
    return { success: true };
}

export async function updateMatchResult(matchId: string, tournamentId: string, homeGoals: number, awayGoals: number) {
    await prisma.$transaction(async (tx) => {
        const match = await tx.tournamentMatch.findUnique({ where: { id: matchId } });
        if (!match) throw new Error("Partido no encontrado");

        // Si el partido ya fue jugado, revertir estadísticas previas
        if (match.status === "played") {
            await revertTeamStats(tx, match);
        }

        // Actualizar partido
        await tx.tournamentMatch.update({
            where: { id: matchId },
            data: {
                homeGoals,
                awayGoals,
                status: "played"
            }
        });

        // Aplicar nuevas estadísticas
        await applyTeamStats(tx, match.homeTeamId, match.awayTeamId, homeGoals, awayGoals);
    });

    revalidatePath(`/dashboard/tournaments/${tournamentId}`);
    return { success: true };
}

async function revertTeamStats(tx: any, match: any) {
    if (match.status !== "played" || match.homeGoals === null || match.awayGoals === null) return;
    
    const hGoals = match.homeGoals;
    const aGoals = match.awayGoals;

    let hWins = 0, hDraws = 0, hLosses = 0, hPoints = 0;
    let aWins = 0, aDraws = 0, aLosses = 0, aPoints = 0;

    if (hGoals > aGoals) {
        hWins = 1; hPoints = 3;
        aLosses = 1;
    } else if (hGoals < aGoals) {
        aWins = 1; aPoints = 3;
        hLosses = 1;
    } else {
        hDraws = 1; hPoints = 1;
        aDraws = 1; aPoints = 1;
    }

    await tx.tournamentTeam.update({
        where: { id: match.homeTeamId },
        data: {
            gamesPlayed: { decrement: 1 },
            wins: { decrement: hWins },
            draws: { decrement: hDraws },
            losses: { decrement: hLosses },
            points: { decrement: hPoints },
            goalsFor: { decrement: hGoals },
            goalsAgainst: { decrement: aGoals }
        }
    });

    await tx.tournamentTeam.update({
        where: { id: match.awayTeamId },
        data: {
            gamesPlayed: { decrement: 1 },
            wins: { decrement: aWins },
            draws: { decrement: aDraws },
            losses: { decrement: aLosses },
            points: { decrement: aPoints },
            goalsFor: { decrement: aGoals },
            goalsAgainst: { decrement: hGoals }
        }
    });
}

async function applyTeamStats(tx: any, homeTeamId: string, awayTeamId: string, hGoals: number, aGoals: number) {
    let hWins = 0, hDraws = 0, hLosses = 0, hPoints = 0;
    let aWins = 0, aDraws = 0, aLosses = 0, aPoints = 0;

    if (hGoals > aGoals) {
        hWins = 1; hPoints = 3;
        aLosses = 1;
    } else if (hGoals < aGoals) {
        aWins = 1; aPoints = 3;
        hLosses = 1;
    } else {
        hDraws = 1; hPoints = 1;
        aDraws = 1; aPoints = 1;
    }

    await tx.tournamentTeam.update({
        where: { id: homeTeamId },
        data: {
            gamesPlayed: { increment: 1 },
            wins: { increment: hWins },
            draws: { increment: hDraws },
            losses: { increment: hLosses },
            points: { increment: hPoints },
            goalsFor: { increment: hGoals },
            goalsAgainst: { increment: aGoals }
        }
    });

    await tx.tournamentTeam.update({
        where: { id: awayTeamId },
        data: {
            gamesPlayed: { increment: 1 },
            wins: { increment: aWins },
            draws: { increment: aDraws },
            losses: { increment: aLosses },
            points: { increment: aPoints },
            goalsFor: { increment: aGoals },
            goalsAgainst: { increment: hGoals }
        }
    });
}
