import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TournamentsClient from "./tournaments-client";
import { getTenantId } from "@/lib/utils";

export default async function TournamentsPage() {
    const session = await auth();
    if (!session || !session.user) {
        redirect("/login");
    }

    const tenantId = await getTenantId(session);

    const tournaments = await prisma.tournament.findMany({
        where: { tenantId },
        include: { complex: true, teams: true },
        orderBy: { createdAt: "desc" }
    });

    const complexes = await prisma.complex.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, name: true }
    });

    return <TournamentsClient initialTournaments={tournaments} complexes={complexes} tenantId={tenantId} />;
}
