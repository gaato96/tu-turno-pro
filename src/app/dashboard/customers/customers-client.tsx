"use client";

import { useState } from "react";
import { Search, Phone, History, CreditCard, Eye, Plus, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getCustomerDetail, addCustomerPayment, createCustomer } from "./actions";
import { ScrollArea } from "@/components/ui/scroll-area";

type CustomerSummary = {
  id: string;
  name: string;
  phone: string | null;
  balance: number;
  reservationCount: number;
};

export function CustomersClient({ initialCustomers }: { initialCustomers: CustomerSummary[] }) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<any | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Payment dialog state
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // New Customer Dialog state
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.phone && c.phone.includes(search))
  );

  const openCustomerDetail = async (id: string) => {
    setSelectedCustomerId(id);
    setIsLoadingDetail(true);
    setDetailData(null);
    try {
      const data = await getCustomerDetail(id);
      setDetailData(data);
    } catch (error: any) {
      toast.error(error.message || "Error al cargar detalle");
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handlePayment = async () => {
    if (!selectedCustomerId || !paymentAmount || isNaN(Number(paymentAmount)) || Number(paymentAmount) <= 0) {
      toast.error("Ingresá un monto válido");
      return;
    }

    setIsSubmittingPayment(true);
    try {
        await addCustomerPayment(selectedCustomerId, Number(paymentAmount), paymentMethod, paymentNotes);
        toast.success("Pago registrado correctamente");
        setIsPaymentDialogOpen(false);
        setPaymentAmount("");
        setPaymentNotes("");
        // Reload detail
        await openCustomerDetail(selectedCustomerId);
        // We'd ideally reload the main list too, for now we just use a page refresh
        window.location.reload(); 
    } catch (error: any) {
        toast.error(error.message || "Error al registrar pago");
    } finally {
        setIsSubmittingPayment(false);
    }
  };

  const handleCreateCustomer = async () => {
    if (!newName) {
       toast.error("El nombre es requerido");
       return;
    }
    setIsSubmittingNew(true);
    try {
        await createCustomer({ name: newName, phone: newPhone });
        toast.success("Cliente creado");
        setIsNewCustomerOpen(false);
        setNewName("");
        setNewPhone("");
        window.location.reload();
    } catch(err: any) {
        toast.error(err.message || "Error al crear cliente");
    } finally {
        setIsSubmittingNew(false);
    }
  };

  return (
    <>
      <div className="flex justify-between items-center bg-card p-4 rounded-xl border">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente por nombre o teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>
        <Button onClick={() => setIsNewCustomerOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Cliente
        </Button>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead className="text-center">Reservas Totales</TableHead>
              <TableHead className="text-right">Saldo a Cuenta</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No se encontraron clientes
                </TableCell>
              </TableRow>
            ) : (
              filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>
                    {customer.phone ? (
                      <div className="flex items-center text-sm">
                        <Phone className="h-3 w-3 mr-2 text-muted-foreground" />
                        {customer.phone}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Sin teléfono</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{customer.reservationCount}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {customer.balance > 0 ? (
                      <span className="text-destructive font-medium flex items-center justify-end">
                        <ArrowRight className="h-3 w-3 mr-1" />
                        A favor del local: ${customer.balance}
                      </span>
                    ) : customer.balance < 0 ? (
                      <span className="text-green-600 font-medium flex items-center justify-end">
                        <ArrowRight className="h-3 w-3 mr-1" />
                        A favor del cliente: ${Math.abs(customer.balance)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">$0.00</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openCustomerDetail(customer.id)}>
                      <Eye className="h-4 w-4 mr-2" /> Ver Detalles
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Customer Detail Sheet */}
      <Sheet open={!!selectedCustomerId} onOpenChange={(open) => !open && setSelectedCustomerId(null)}>
        <SheetContent className="sm:max-w-xl flex flex-col gap-0 p-0">
          <SheetHeader className="p-6 border-b">
            <SheetTitle>Detalle del Cliente</SheetTitle>
            <SheetDescription>
              Información de contacto, historial de reservas y estado de cuenta.
            </SheetDescription>
          </SheetHeader>
          
          <ScrollArea className="flex-1 p-6">
            {isLoadingDetail ? (
              <div className="flex justify-center py-8">Cargando...</div>
            ) : detailData ? (
              <div className="space-y-8">
                {/* Info Card */}
                <div className="bg-muted p-4 rounded-xl flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold">{detailData.name}</h3>
                    {detailData.phone && <p className="text-muted-foreground text-sm mt-1 flex items-center"><Phone className="h-3 w-3 mr-2" />{detailData.phone}</p>}
                    {detailData.email && <p className="text-muted-foreground text-sm mt-1">{detailData.email}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground mb-1">Saldo a Cuenta</p>
                    <p className={`text-2xl font-bold ${detailData.balance > 0 ? 'text-destructive' : detailData.balance < 0 ? 'text-green-600' : ''}`}>
                      ${Math.abs(detailData.balance).toFixed(2)}
                    </p>
                    {detailData.balance > 0 ? <p className="text-xs text-destructive">Deuda pendiente</p> : detailData.balance < 0 ? <p className="text-xs text-green-600">A favor del cliente</p> : null}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button className="w-full" variant="default" onClick={() => setIsPaymentDialogOpen(true)} disabled={detailData.balance <= 0}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Registrar Pago de Saldo
                  </Button>
                </div>

                {/* History */}
                <div>
                  <h4 className="font-semibold mb-4 flex items-center">
                    <History className="h-4 w-4 mr-2" /> Últimas Reservas
                  </h4>
                  {detailData.reservations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hay reservas registradas.</p>
                  ) : (
                    <div className="space-y-3">
                      {detailData.reservations.map((res: any) => (
                        <div key={res.id} className="flex justify-between items-center p-3 border rounded-lg">
                          <div>
                            <p className="font-medium text-sm">
                              {format(new Date(res.date), "EEEE d 'de' MMMM", { locale: es })}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(res.startTime), "HH:mm")} - {res.court?.name}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant={res.status === "paid" ? "default" : res.status === "cancelled" ? "destructive" : "secondary"}>
                              {res.status}
                            </Badge>
                            <p className="text-xs mt-1 font-medium">${Number(res.totalAmount).toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pago a Cuenta</DialogTitle>
            <DialogDescription>
              El cliente tiene una deuda pendiente de ${detailData?.balance}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Monto a abonar</Label>
              <Input 
                type="number" 
                placeholder="0.00" 
                value={paymentAmount} 
                onChange={(e) => setPaymentAmount(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Método de Pago</Label>
              <Select value={paymentMethod} onValueChange={(v) => v && setPaymentMethod(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Efectivo</SelectItem>
                  <SelectItem value="card">Tarjeta / Mercadopago</SelectItem>
                  <SelectItem value="transfer">Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notas (Opcional)</Label>
              <Input 
                placeholder="Ej. Transferencia Banco XX" 
                value={paymentNotes} 
                onChange={(e) => setPaymentNotes(e.target.value)} 
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handlePayment} disabled={isSubmittingPayment}>
              {isSubmittingPayment ? "Registrando..." : "Confirmar Pago"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Customer Dialog */}
      <Dialog open={isNewCustomerOpen} onOpenChange={setIsNewCustomerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Cliente</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nombre Completo</Label>
              <Input 
                placeholder="Ej. Juan Pérez" 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Teléfono / WhatsApp (Opcional)</Label>
              <Input 
                placeholder="Ej. 11 1234-5678" 
                value={newPhone} 
                onChange={(e) => setNewPhone(e.target.value)} 
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewCustomerOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateCustomer} disabled={isSubmittingNew}>
              Crear Cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
