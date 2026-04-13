import { getSettingsData } from "./actions";
import { SettingsClient } from "./settings-client";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
    const session = await auth();
    const userRole = (session?.user as any)?.role || "staff";

    if (userRole === "staff") {
        redirect("/dashboard");
    }

    try {
        const complex = await getSettingsData();
        return (
            <div className="p-4 md:p-8 pb-32 animate-fade-in max-w-7xl mx-auto">
                <SettingsClient initialComplex={complex} />
            </div>
        );
    } catch (e) {
        // If no complex exists, redirect or handle. Here we just redirect for now.
        redirect("/dashboard");
    }
}
