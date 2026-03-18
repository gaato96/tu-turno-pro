import { getCalendarData } from "./actions";
import ReservationsClient from "./reservations-client";

export default async function ReservationsPage({
    searchParams
}: {
    searchParams: { date?: string }
}) {
    // Get server date or query param
    const today = new Date().toISOString().split("T")[0];
    const targetDateStr = searchParams.date || today;

    const { complex, courts, reservations } = await getCalendarData(targetDateStr);

    if (!complex) {
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
            currentDate={targetDateStr}
        />
    );
}
