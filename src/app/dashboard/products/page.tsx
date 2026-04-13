import { ProductsClient } from "./products-client";
import { getProducts, getCategories, getSuppliers } from "./actions";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProductsPage() {
    const session = await auth();
    const userRole = (session?.user as any)?.role || "staff";

    if (userRole === "staff") {
        redirect("/dashboard");
    }

    let products: any[] = [], categories: any[] = [], suppliers: any[] = [];
    try {
        [products, categories, suppliers] = await Promise.all([getProducts(), getCategories(), getSuppliers()]);
    } catch (e) {
        console.error("PRODUCTS FETCH ERROR:", e);
        /* sin complejo activo o sin sesión — mostrar vacío */
    }

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
