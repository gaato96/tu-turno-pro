"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2 } from "lucide-react";

export function ComplexSelector({ complexes }: { complexes: { id: string, name: string }[] }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentComplexId = searchParams.get("complexId") || "all";

    const handleSelect = (id: string | null) => {
        const params = new URLSearchParams(searchParams.toString());
        if (id && id !== "all") {
            params.set("complexId", id);
        } else {
            params.delete("complexId");
        }
        router.push(`/dashboard?${params.toString()}`);
    };

    return (
        <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <Select value={currentComplexId} onValueChange={handleSelect}>
                <SelectTrigger className="w-[220px] h-10 rounded-xl border-border/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm shadow-sm transition-all hover:border-emerald-500/30">
                    <SelectValue placeholder="Todos los complejos">
                        {currentComplexId === "all" ? "Todos los complejos" : complexes.find(c => c.id === currentComplexId)?.name}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/50">
                    <SelectItem value="all" textValue="Todos los complejos">
                        Todos los complejos
                    </SelectItem>
                    {complexes.map((c) => (
                        <SelectItem key={c.id} value={c.id} textValue={c.name}>
                            {c.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
