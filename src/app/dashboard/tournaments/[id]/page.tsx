import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TournamentDetailClient from "./tournament-detail-client";
import { getTenantId } from "@/lib/utils";

export default async function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session || !session.user) {
        redirect("/login");
    }

    const tenantId = getTenantId(session);
    const { id } = await params;

    const tournament = await prisma.tournament.findFirst({
        where: { id, tenantId },
        include: {
            teams: {
                include: {
                    players: { orderBy: { goals: "desc" } }
                },
                orderBy: [
                    { points: 'desc' },
                    { goalsFor: 'desc' }
                ]
            },
            matches: {
                include: {
                    homeTeam: true,
                    awayTeam: true,
                    complex: true
                },
                orderBy: { matchDay: 'asc' }
            }
        }
    });

    const complexes = await prisma.complex.findMany({
        where: { tenantId }
    });

    if (!tournament) {
        redirect("/dashboard/tournaments");
    }

    return <TournamentDetailClient initialTournament={tournament} complexes={complexes} />;
}
