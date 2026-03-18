import { getPOSData } from "./actions";
import { POSTerminal } from "./pos-terminal";

export default async function POSPage() {
    const { categories, products, activeReservations } = await getPOSData();

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col">
            <div className="mb-4">
                <h1 className="text-3xl font-bold tracking-tight">Kiosko (POS)</h1>
                <p className="text-muted-foreground mt-1">Vende productos rápidamente</p>
            </div>
            <POSTerminal categories={categories} products={products} activeReservations={activeReservations} />
        </div>
    );
}
