import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import EventsClient from "./events-client";
import { getTenantId } from "@/lib/utils";

export default async function EventsPage() {
    const session = await auth();
    if (!session || !session.user) {
        redirect("/login");
    }

    const tenantId = await getTenantId(session);

    const events = await prisma.event.findMany({
        where: { tenantId },
        include: { complex: true, sales: true, payments: true },
        orderBy: { date: "desc" }
    });

    const complexes = await prisma.complex.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, name: true }
    });

    return <EventsClient initialEvents={events} complexes={complexes} tenantId={tenantId} />;
}
