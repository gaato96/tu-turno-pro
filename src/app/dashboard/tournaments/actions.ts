"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createTournament(data: {
    tenantId: string;
    complexId: string;
    name: string;
    sportType: string;
    maxTeams: number;
    inscriptionFee?: number;
}) {
    const { tenantId, complexId, name, sportType, maxTeams, inscriptionFee } = data;

    // generate a simple random slug
    const publicSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Math.floor(Math.random() * 10000);

    await prisma.tournament.create({
        data: {
            tenantId,
            complexId,
            name,
            sportType,
            maxTeams,
            inscriptionFee: inscriptionFee || 0,
            publicSlug
        }
    });

    revalidatePath("/dashboard/tournaments");
    return { success: true };
}

export async function deleteTournament(id: string) {
    await prisma.tournament.delete({ where: { id } });
    revalidatePath("/dashboard/tournaments");
    return { success: true };
}
