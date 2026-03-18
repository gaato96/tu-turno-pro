import { ProductsClient } from "./products-client";
import { getProducts, getCategories, getSuppliers } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProductsPage() {
    const products = await getProducts();
    const categories = await getCategories();
    const suppliers = await getSuppliers();

    return (
        <div className="p-4 md:p-8 pb-32 max-w-7xl mx-auto animate-fade-in">
            <ProductsClient
                initialProducts={products}
                initialCategories={categories}
                initialSuppliers={suppliers}
            />
        </div>
    );
}
