import { getCalendarData } from "./actions";
import ReservationsClient from "./reservations-client";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ReservationsPage({
    searchParams
}: {
    searchParams: Promise<{ date?: string, new?: string, openRes?: string }>
}) {
    const params = await searchParams;

    const today = new Date().toISOString().split("T")[0];
    const targetDateStr = params.date || today;
    const isNew = params.new === "true";
    const openResId = params.openRes;

    const session = await auth();
    const userRole = (session?.user as any)?.role || "staff";

    let calendarData: any;
    try {
        calendarData = await getCalendarData(targetDateStr);
    } catch (e) {
        console.error("RESERVATIONS FETCH ERROR:", e);
        calendarData = { complex: null, complexes: [], courts: [], reservations: [], events: [] };
    }
    const { complex, complexes, courts, reservations, events } = calendarData;

    if (!complex) {
        if (complexes && complexes.length > 0) {
            redirect("/dashboard/select-complex");
        }
        return (
            <div className="flex-1 flex items-center justify-center border-2 border-dashed rounded-xl h-[calc(100vh-6rem)]">
                <p className="text-muted-foreground">No tienes complejos registrados en tu cuenta.</p>
            </div>
        );
    }

    return (
        <ReservationsClient
            complex={complex}
            courts={courts}
            initialReservations={reservations}
            initialEvents={events || []}
            currentDate={targetDateStr}
            isNew={isNew}
            openResId={openResId}
        />
    );
}
