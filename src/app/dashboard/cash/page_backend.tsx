import { getCashData } from "./actions";
import { CashPanel } from "./cash-panel";

export default async function CashPage() {
    const { openSession, history } = await getCashData();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Caja</h1>
                <p className="text-muted-foreground mt-1">Gestiona la apertura y cierre de caja</p>
            </div>
            <CashPanel openSession={openSession} history={history} />
        </div>
    );
}
