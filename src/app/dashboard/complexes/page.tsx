import { getComplexes } from "./actions";
import { ComplexesClient } from "./complexes-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ComplexesPage() {
    const complexes = await getComplexes();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Complejos</h1>
                <p className="text-muted-foreground mt-1">Gestión de sedes y canchas</p>
            </div>
            <ComplexesClient initialComplexes={complexes} />
        </div>
    );
}
