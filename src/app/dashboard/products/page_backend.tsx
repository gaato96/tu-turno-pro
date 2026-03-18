import { getProducts, getCategories } from "./actions";
import { ProductsList } from "./products-list";

export default async function ProductsPage() {
    const [products, categories] = await Promise.all([getProducts(), getCategories()]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Productos & Inventario</h1>
                <p className="text-muted-foreground mt-1">Gestiona tu catálogo de productos para el POS</p>
            </div>
            <ProductsList initialProducts={products} initialCategories={categories} />
        </div>
    );
}
