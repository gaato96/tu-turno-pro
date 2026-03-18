import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 lg:pl-0">
                <div className="p-4 lg:p-8 pt-16 lg:pt-8 max-w-[1600px] mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
