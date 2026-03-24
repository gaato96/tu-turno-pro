import { getDashboardData } from "./actions";
import { auth } from "@/lib/auth";
import DashboardClient from "./dashboard-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardPage() {
    const session = await auth();
    let data;
    try {
        data = await getDashboardData();
    } catch {
        data = null;
    }

    const greeting = (() => {
        const hour = new Date().getHours();
        if (hour < 12) return "Buenos días";
        if (hour < 18) return "Buenas tardes";
        return "Buenas noches";
    })();

    return <DashboardClient initialData={data as any} greeting={greeting} />;
}
