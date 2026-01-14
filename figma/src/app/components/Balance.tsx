import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Mail, MessageCircle, Download, Plus, DollarSign, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { clientService, Client, ClientBalance } from "../../services/client.service";
import { orderService } from "../../services/order.service";
import { paymentService } from "../../services/payment.service";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { toast } from "sonner";
import { NewOrderDialog } from "./NewOrderDialog";
import { PaymentDialog } from "./PaymentDialog";
import * as XLSX from "xlsx";

interface BalanceProps {
  selectedClientId: string | null;
}

export function Balance({ selectedClientId }: BalanceProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [currentClientId, setCurrentClientId] = useState<string | null>(selectedClientId);
  const [balanceData, setBalanceData] = useState<ClientBalance | null>(null);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewOrderDialog, setShowNewOrderDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderToDeliver, setOrderToDeliver] = useState<string | null>(null);

  // Cargar clientes al montar
  useEffect(() => {
    const fetchClients = async () => {
      try {
        setIsLoadingClients(true);
        const response = await clientService.getAllClients();
        const clientList = Array.isArray(response) ? response : response.items;
        setClients(clientList);

        // Si no hay cliente seleccionado, usar el primero
        if (!currentClientId && clientList.length > 0) {
          setCurrentClientId(clientList[0].id);
        }
      } catch (err: any) {
        console.error('Error loading clients:', err);
        setError(err.response?.data?.error || 'Error al cargar clientes');
      } finally {
        setIsLoadingClients(false);
      }
    };

    fetchClients();
  }, []);

  // Update current client if selectedClientId changes
  useEffect(() => {
    if (selectedClientId) {
      setCurrentClientId(selectedClientId);
    }
  }, [selectedClientId]);

  // Cargar balance cuando cambia el cliente
  useEffect(() => {
    if (!currentClientId) return;

    const fetchBalance = async () => {
      try {
        setIsLoadingBalance(true);
        setError(null);
        const balance = await clientService.getClientBalance(currentClientId);
        setBalanceData(balance);
      } catch (err: any) {
        console.error('Error loading balance:', err);
        setError(err.response?.data?.error || 'Error al cargar balance');
        setBalanceData(null);
      } finally {
        setIsLoadingBalance(false);
      }
    };

    fetchBalance();
  }, [currentClientId]);

  const refreshBalance = async () => {
    if (!currentClientId) return;
    try {
      const balance = await clientService.getClientBalance(currentClientId);
      setBalanceData(balance);
    } catch (err) {
      console.error('Error refreshing balance:', err);
    }
  };

  const handleOrderCreated = () => {
    refreshBalance();
  };

  const handleRegisterPayment = async (orderId: string, amount: number) => {
    try {
      await paymentService.createPayment({
        pedidoId: orderId,
        monto: amount,
        metodoPago: 'EFECTIVO',
        fechaPago: new Date().toISOString(),
      });
      toast.success("Pago registrado exitosamente");
      setShowPaymentDialog(false);
      refreshBalance();
    } catch (err: any) {
      console.error('Error registering payment:', err);
      const errorMessage = err.response?.data?.error || "No se pudo registrar el pago";
      toast.error(errorMessage);
    }
  };

  const handleSendEmail = () => {
    const selectedClient = clients.find(c => c.id === currentClientId);
    toast.success("Resumen enviado por email", {
      description: `Email enviado a ${selectedClient?.email}`,
    });
  };

  const handleSendWhatsApp = () => {
    const selectedClient = clients.find(c => c.id === currentClientId);
    const phone = selectedClient?.whatsapp || selectedClient?.telefono;
    toast.success("Resumen enviado por WhatsApp", {
      description: `Mensaje enviado a ${phone}`,
    });
  };

  const handleDownloadExcel = () => {
    if (!balanceData) return;

    try {
      const selectedClient = clients.find(c => c.id === currentClientId);

      // Crear datos para Excel
      const excelData = balanceData.pedidos.map((order) => ({
        Fecha: new Date(order.fecha).toLocaleDateString('es-ES'),
        Total: order.total,
        Pagado: order.pagado,
        Falta: order.total - order.pagado,
        Estado: order.estado,
      }));

      // Agregar fila de total
      excelData.push({
        Fecha: "",
        Total: balanceData.totalPedidos,
        Pagado: balanceData.totalPagado,
        Falta: balanceData.saldoPendiente,
        Estado: "TOTAL",
      });

      // Crear libro de trabajo
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Balance");

      // Descargar archivo
      const fileName = `Balance_${selectedClient?.nombre}_${new Date().toLocaleDateString()}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast.success("Excel descargado", {
        description: "Balance del cliente descargado exitosamente",
      });
    } catch (error) {
      toast.error("Error al descargar Excel", {
        description: "Hubo un problema al generar el archivo",
      });
    }
  };

  const handleMarkAsDelivered = async () => {
    if (!orderToDeliver) return;

    try {
      await orderService.markAsDelivered(orderToDeliver);
      toast.success("Pedido marcado como entregado");
      setOrderToDeliver(null);
      refreshBalance();
    } catch (err: any) {
      console.error('Error marking as delivered:', err);
      const errorMessage = err.response?.data?.error || "No se pudo marcar como entregado";
      toast.error(errorMessage);
    }
  };

  const handleOpenPaymentDialog = (orderId: string) => {
    setSelectedOrderId(orderId);
    setShowPaymentDialog(true);
  };

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case "PENDIENTE":
        return "bg-[#fedc97]/70 text-[#b5b682]";
      case "PAGADO":
      case "COMPLETADO":
        return "bg-[#7c9885]/30 text-[#28666e]";
      case "ENTREGADO":
        return "bg-[#7c9885]/50 text-[#033f63]";
      case "EN_PROCESO":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (estado: string) => {
    switch (estado) {
      case "PENDIENTE":
        return "Pendiente";
      case "PAGADO":
        return "Pagado";
      case "ENTREGADO":
        return "Entregado";
      case "EN_PROCESO":
        return "En Proceso";
      case "COMPLETADO":
        return "Completado";
      default:
        return estado;
    }
  };

  if (isLoadingClients) {
    return (
      <div className="p-4 flex items-center justify-center h-96">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  if (error && !balanceData) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 flex items-start gap-2">
          <AlertCircle className="flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-medium">Error al cargar datos</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const selectedClient = clients.find(c => c.id === currentClientId);
  const totalAmount = balanceData?.totalPedidos || 0;
  const paidAmount = balanceData?.totalPagado || 0;
  const pendingAmount = balanceData?.saldoPendiente || 0;
  const selectedOrderData = balanceData?.pedidos.find(o => o.id === selectedOrderId);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[#033f63]">Balance por Cliente</h2>
          <Button
            onClick={() => setShowNewOrderDialog(true)}
            className="bg-[#033f63] hover:bg-[#28666e]"
            size="sm"
          >
            <Plus size={16} className="mr-1" />
            Pedido
          </Button>
        </div>

        {/* Client Selector */}
        <Select value={currentClientId || ""} onValueChange={setCurrentClientId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Seleccionar cliente" />
          </SelectTrigger>
          <SelectContent>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoadingBalance ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-3">
              <p className="text-xs text-gray-500 mb-1">Total</p>
              <p className="text-lg text-[#033f63]">
                ${totalAmount.toLocaleString()}
              </p>
            </Card>
            <Card className="p-3">
              <p className="text-xs text-gray-500 mb-1">Pagado</p>
              <p className="text-lg text-[#7c9885]">
                ${paidAmount.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {balanceData?.porcentajePagado.toFixed(0)}%
              </p>
            </Card>
            <Card className="p-3">
              <p className="text-xs text-gray-500 mb-1">Falta</p>
              <p className="text-lg text-[#b5b682]">
                ${pendingAmount.toLocaleString()}
              </p>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={handleSendEmail}
              variant="outline"
              size="sm"
              className="flex flex-col items-center gap-1 h-auto py-3 border-[#033f63] text-[#033f63] hover:bg-[#033f63]/10"
            >
              <Mail size={20} />
              <span className="text-xs">Email</span>
            </Button>
            <Button
              onClick={handleSendWhatsApp}
              variant="outline"
              size="sm"
              className="flex flex-col items-center gap-1 h-auto py-3 text-[#28666e] border-[#28666e] hover:bg-[#28666e]/10"
            >
              <MessageCircle size={20} />
              <span className="text-xs">WhatsApp</span>
            </Button>
            <Button
              onClick={handleDownloadExcel}
              variant="outline"
              size="sm"
              className="flex flex-col items-center gap-1 h-auto py-3 border-[#7c9885] text-[#7c9885] hover:bg-[#7c9885]/10"
            >
              <Download size={20} />
              <span className="text-xs">Excel</span>
            </Button>
          </div>

          {/* Orders Table */}
          <Card className="p-4">
            <h3 className="mb-3 text-[#033f63]">Detalle de Pedidos</h3>

            {!balanceData || balanceData.pedidos.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No hay pedidos para este cliente
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-[#033f63]">
                      <th className="text-left py-2 px-2 text-[#033f63]">Fecha</th>
                      <th className="text-right py-2 px-2 text-[#033f63]">Total</th>
                      <th className="text-right py-2 px-2 text-[#033f63]">Pagado</th>
                      <th className="text-right py-2 px-2 text-[#033f63]">Falta</th>
                      <th className="text-center py-2 px-2 text-[#033f63]">Estado</th>
                      <th className="text-center py-2 px-2 text-[#033f63]">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balanceData.pedidos.map((order, index) => {
                      const remaining = order.total - order.pagado;
                      const isFullyPaid = remaining <= 0;
                      const canDeliver = order.estado !== "ENTREGADO" && order.estado !== "CANCELADO";

                      return (
                        <tr
                          key={order.id}
                          className={`border-b border-gray-100 ${index % 2 === 0 ? "bg-gray-50" : ""
                            }`}
                        >
                          <td className="py-3 px-2 text-gray-700">
                            {new Date(order.fecha).toLocaleDateString('es-ES')}
                          </td>
                          <td className="py-3 px-2 text-right text-[#033f63]">
                            ${order.total.toLocaleString()}
                          </td>
                          <td className="py-3 px-2 text-right text-[#7c9885]">
                            ${order.pagado.toLocaleString()}
                          </td>
                          <td
                            className={`py-3 px-2 text-right font-medium ${remaining > 0 ? "text-[#b5b682]" : "text-gray-400"
                              }`}
                          >
                            ${remaining.toLocaleString()}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span
                              className={`text-xs px-2 py-1 rounded-full inline-block ${getStatusColor(
                                order.estado
                              )}`}
                            >
                              {getStatusText(order.estado)}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex items-center justify-center gap-2">
                              {!isFullyPaid && (
                                <Button
                                  onClick={() => handleOpenPaymentDialog(order.id)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-[#033f63] hover:bg-[#033f63]/10"
                                >
                                  <DollarSign size={16} className="mr-1" />
                                  Pagar
                                </Button>
                              )}
                              {canDeliver && (
                                <Button
                                  onClick={() => setOrderToDeliver(order.id)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-[#7c9885] hover:bg-[#7c9885]/10"
                                >
                                  <CheckCircle size={16} className="mr-1" />
                                  Entregar
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[#033f63] font-bold">
                      <td className="py-3 px-2 text-[#033f63]">TOTAL</td>
                      <td className="py-3 px-2 text-right text-[#033f63]">
                        ${totalAmount.toLocaleString()}
                      </td>
                      <td className="py-3 px-2 text-right text-[#7c9885]">
                        ${paidAmount.toLocaleString()}
                      </td>
                      <td className="py-3 px-2 text-right text-[#b5b682]">
                        ${pendingAmount.toLocaleString()}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      <NewOrderDialog
        open={showNewOrderDialog}
        onOpenChange={setShowNewOrderDialog}
        preselectedClientId={currentClientId || undefined}
        onOrderCreated={handleOrderCreated}
      />

      {selectedOrderId && selectedOrderData && (
        <PaymentDialog
          open={showPaymentDialog}
          onOpenChange={setShowPaymentDialog}
          orderId={selectedOrderData.id}
          patientName={selectedClient?.nombre || ""}
          total={selectedOrderData.total}
          amountPaid={selectedOrderData.pagado}
          onPayment={handleRegisterPayment}
        />
      )}

      <AlertDialog open={!!orderToDeliver} onOpenChange={(open) => !open && setOrderToDeliver(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Marcar pedido como entregado?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción marcará el pedido como entregado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkAsDelivered}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
