import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PublicTournamentClient from "./public-tournament-client";

export default async function PublicTournamentPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const tournament = await prisma.tournament.findUnique({
        where: { publicSlug: slug },
        include: {
            complex: true,
            teams: {
                orderBy: [
                    { points: 'desc' },
                    { goalsFor: 'desc' }
                ]
            },
            matches: {
                include: {
                    homeTeam: true,
                    awayTeam: true
                },
                orderBy: { matchDay: 'asc' }
            }
        }
    });

    if (!tournament) {
        notFound();
    }

    return <PublicTournamentClient tournament={tournament} />;
}
