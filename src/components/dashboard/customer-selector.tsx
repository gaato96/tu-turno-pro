"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, ChevronsUpDown, UserPlus, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { searchCustomers, createCustomer } from "@/app/dashboard/customers/actions";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface CustomerSelectorProps {
    onSelect: (customer: { id?: string; name: string; phone: string }) => void;
    initialValue?: string;
}

export function CustomerSelector({ onSelect, initialValue }: CustomerSelectorProps) {
    const [open, setOpen] = useState(false);
    const [searchValue, setSearchValue] = useState("");
    const [customers, setCustomers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

    // Create form state
    const [newCustomer, setNewCustomer] = useState({ name: "", phone: "" });

    const fetchCustomers = useCallback(async (query: string) => {
        if (query.length < 2) {
            setCustomers([]);
            return;
        }
        setIsLoading(true);
        try {
            const results = await searchCustomers(query);
            setCustomers(results);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchValue) fetchCustomers(searchValue);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchValue, fetchCustomers]);

    const handleCreate = async () => {
        if (!newCustomer.name) return;
        setIsLoading(true);
        try {
            const customer = await createCustomer(newCustomer);
            onSelect({ id: customer.id, name: customer.name, phone: customer.phone || "" });
            setSelectedCustomer(customer);
            setShowCreateForm(false);
            setOpen(false);
            toast.success("Cliente guardado");
        } catch (error) {
            toast.error("Error al guardar cliente");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-2">
            {!showCreateForm ? (
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger
                        className="flex items-center justify-between w-full h-11 px-3 py-2 text-sm border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        aria-expanded={open}
                    >
                        {selectedCustomer
                            ? selectedCustomer.name
                            : initialValue || "Buscar cliente..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command shouldFilter={false}>
                            <CommandInput
                                placeholder="Escribe nombre o teléfono..."
                                value={searchValue}
                                onValueChange={setSearchValue}
                            />
                            <CommandList>
                                {isLoading && <div className="p-4 text-center text-xs text-muted-foreground">Buscando...</div>}
                                {!isLoading && customers.length === 0 && searchValue.length >= 2 && (
                                    <CommandEmpty className="p-4 text-center">
                                        <p className="text-sm mb-2">No se encontró el cliente</p>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            className="w-full gap-2"
                                            onClick={() => {
                                                setNewCustomer({ name: searchValue, phone: "" });
                                                setShowCreateForm(true);
                                            }}
                                        >
                                            <UserPlus className="w-4 h-4" /> Registrar Nuevo
                                        </Button>
                                    </CommandEmpty>
                                )}
                                {!isLoading && searchValue.length < 2 && (
                                    <div className="p-4 text-center text-xs text-muted-foreground">
                                        Escribe al menos 2 caracteres
                                    </div>
                                )}
                                <CommandGroup>
                                    {customers.map((customer) => (
                                        <CommandItem
                                            key={customer.id}
                                            value={customer.id}
                                            onSelect={() => {
                                                setSelectedCustomer(customer);
                                                onSelect({ id: customer.id, name: customer.name, phone: customer.phone || "" });
                                                setOpen(false);
                                            }}
                                            className="flex flex-col items-start gap-0.5 py-2"
                                        >
                                            <div className="flex items-center w-full justify-between">
                                                <span className="font-bold">{customer.name}</span>
                                                {selectedCustomer?.id === customer.id && <Check className="h-4 w-4 text-primary" />}
                                            </div>
                                            {customer.phone && (
                                                <span className="text-[10px] text-muted-foreground">{customer.phone}</span>
                                            )}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                                <Separator />
                                <div className="p-1">
                                    <Button
                                        variant="ghost"
                                        className="w-full justify-start gap-2 h-9 text-xs"
                                        onClick={() => {
                                            setNewCustomer({ name: "", phone: "" });
                                            setShowCreateForm(true);
                                        }}
                                    >
                                        <UserPlus className="w-4 h-4" /> Registrar nuevo cliente
                                    </Button>
                                </div>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            ) : (
                <div className="p-4 border-2 border-dashed rounded-xl bg-muted/30 space-y-3 relative">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={() => setShowCreateForm(false)}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                    <h4 className="text-sm font-bold flex items-center gap-2">
                        <UserPlus className="w-4 h-4 text-emerald-600" /> Nuevo Cliente
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1 col-span-2">
                            <Label className="text-[11px]">Nombre Completo</Label>
                            <Input
                                size={1}
                                className="h-9 rounded-lg"
                                value={newCustomer.name}
                                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1 col-span-2">
                            <Label className="text-[11px]">Teléfono (opcional)</Label>
                            <Input
                                size={1}
                                className="h-9 rounded-lg"
                                value={newCustomer.phone}
                                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                            />
                        </div>
                    </div>
                    <Button
                        size="sm"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg h-9"
                        onClick={handleCreate}
                        disabled={!newCustomer.name || isLoading}
                    >
                        {isLoading ? "Guardando..." : "Guardar y Seleccionar"}
                    </Button>
                </div>
            )}
        </div>
    );
}
