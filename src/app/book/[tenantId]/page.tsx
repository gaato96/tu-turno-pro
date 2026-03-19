import { getTenantInfo } from "./actions";
import { BookingClient } from "./booking-client";

// Forcing dynamic to ensure we don't cache availability
export const dynamic = "force-dynamic";

export default async function PublicBookingPage({
    params
}: {
    params: Promise<{ tenantId: string }>
}) {
    const { tenantId } = await params;
    const info = await getTenantInfo(tenantId);

    if (!info) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
                <div className="text-center p-8 bg-card rounded-3xl shadow-xl max-w-md w-full border border-border/50">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Página No Encontrada</h1>
                    <p className="text-muted-foreground">Este complejo no existe o el enlace es inválido.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
            <header className="bg-white dark:bg-slate-900 border-b border-border/50 sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1v1H9V7zm5 0h1v1h-1V7zm-5 4h1v1H9v-1zm5 0h1v1h-1v-1zm-5 4h1v1H9v-1zm5 0h1v1h-1v-1z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">{info.tenant.tenantName}</h1>
                        <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 capitalize">Reservas Online</p>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-4xl mx-auto w-full p-4 lg:py-8">
                <BookingClient tenantId={info.tenant.tenantId} tenantName={info.tenant.tenantName!} complexes={info.complexes} />
            </main>
        </div>
    );
}
