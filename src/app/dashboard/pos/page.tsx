import { getPOSData } from "./actions";
import { POSTerminal } from "./pos-terminal";
import { Suspense } from "react";

export default async function POSPage() {
    let categories: any[] = [], products: any[] = [], activeReservations: any[] = [];
    try {
        const data = await getPOSData();
        categories = data.categories;
        products = data.products;
        activeReservations = data.activeReservations;
    } catch { /* mostrar vacío si no hay sesión o complejo */ }

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col">
            <div className="mb-4">
                <h1 className="text-3xl font-bold tracking-tight">Kiosko (POS)</h1>
                <p className="text-muted-foreground mt-1">Vende productos rápidamente</p>
            </div>
            <Suspense fallback={<div className="flex-1 flex items-center justify-center">Cargando kiosko...</div>}>
                <POSTerminal categories={categories} products={products} activeReservations={activeReservations} />
            </Suspense>
        </div>
    );
}
