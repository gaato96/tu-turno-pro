import { CustomersClient } from "./customers-client";
import { getCustomers } from "./actions";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Cartera de Clientes | Tu Turno Pro",
};

export default async function CustomersPage() {
  const session = await auth();
  const userRole = (session?.user as any)?.role || "staff";

  if (userRole === "staff") {
    redirect("/dashboard");
  }

  const customers = await getCustomers();

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Cartera de Clientes</h2>
      </div>
      <p className="text-muted-foreground">
        Administrá tu lista de clientes, revisá su historial de reservas y gestioná saldos a cuenta.
      </p>

      <CustomersClient initialCustomers={customers} />
    </div>
  );
}
