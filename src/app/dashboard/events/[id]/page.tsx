import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/utils";
import EventDetailClient from "./event-detail-client";

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    if (!session || !session.user) redirect("/login");

    const tenantId = getTenantId(session);
    const { id } = await params;

    const event = await prisma.event.findFirst({
        where: { id, tenantId },
        include: {
            complex: { select: { id: true, name: true } },
            payments: { orderBy: { createdAt: "desc" } },
        },
    });

    if (!event) redirect("/dashboard/events");

    // Serialize Decimal fields
    const serialized = {
        ...event,
        date: event.date.toISOString().replace("Z", ""),
        startTime: event.startTime.toISOString().replace("Z", ""),
        endTime: event.endTime.toISOString().replace("Z", ""),
        totalAmount: Number(event.totalAmount),
        depositPaid: Number(event.depositPaid),
        paidAmount: Number(event.paidAmount),
        payments: event.payments.map(p => ({
            ...p,
            amount: Number(p.amount),
            createdAt: p.createdAt.toISOString(),
        })),
    };

    return <EventDetailClient event={serialized} tenantId={tenantId} />;
}
