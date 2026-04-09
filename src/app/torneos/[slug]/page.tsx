import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PublicTournamentClient from "./public-tournament-client";

export default async function PublicTournamentPage({ params }: { params: { slug: string } }) {
    const tournament = await prisma.tournament.findUnique({
        where: { publicSlug: params.slug },
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
