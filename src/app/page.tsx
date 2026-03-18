import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();
  const role = (session?.user as any)?.role;

  if (role === "super_admin") {
    redirect("/admin/tenants");
  } else {
    redirect("/dashboard");
  }
}
