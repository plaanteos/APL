import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Mail, MessageCircle, Download, Plus, DollarSign, CheckCircle } from "lucide-react";
import { mockClients, mockOrders } from "../data/mockData";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { toast } from "sonner";
import { NewOrderDialog } from "./NewOrderDialog";
import { PaymentDialog } from "./PaymentDialog";
import * as XLSX from "xlsx";

interface BalanceProps {
  selectedClientId: string | null;
}

export function Balance({ selectedClientId }: BalanceProps) {
  const [currentClientId, setCurrentClientId] = useState<string>(
    selectedClientId || mockClients[0].id
  );
  const [showNewOrderDialog, setShowNewOrderDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [orders, setOrders] = useState(mockOrders);

  // Update current client if selectedClientId changes
  useEffect(() => {
    if (selectedClientId) {
      setCurrentClientId(selectedClientId);
    }
  }, [selectedClientId]);

  const selectedClient = mockClients.find((c) => c.id === currentClientId);
  const clientOrders = orders.filter((o) => o.clientId === currentClientId);

  const totalAmount = clientOrders.reduce((sum, order) => sum + order.total, 0);
  const paidAmount = clientOrders.reduce((sum, order) => sum + order.amountPaid, 0);
  const pendingAmount = totalAmount - paidAmount;

  const handleSendEmail = () => {
    toast.success("Resumen enviado por email", {
      description: `Email enviado a ${selectedClient?.email}`,
    });
  };

  const handleSendWhatsApp = () => {
    toast.success("Resumen enviado por WhatsApp", {
      description: `Mensaje enviado a ${selectedClient?.whatsapp}`,
    });
  };

  const handleDownloadExcel = () => {
    try {
      // Crear datos para Excel
      const excelData = clientOrders.map((order) => ({
        Fecha: order.date,
        Paciente: order.patientName,
        Trabajo: order.type,
        Descripción: order.description,
        Total: order.total,
        Pagado: order.amountPaid,
        Falta: order.total - order.amountPaid,
        Estado: getStatusText(order.status),
      }));

      // Agregar fila de total
      excelData.push({
        Fecha: "",
        Paciente: "",
        Trabajo: "",
        Descripción: "TOTAL",
        Total: totalAmount,
        Pagado: paidAmount,
        Falta: pendingAmount,
        Estado: "",
      });

      // Crear libro de trabajo
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Balance");

      // Descargar archivo
      const fileName = `Balance_${selectedClient?.name}_${new Date().toLocaleDateString()}.xlsx`;
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

  const handleRegisterPayment = (orderId: string, amount: number) => {
    setOrders((prevOrders) =>
      prevOrders.map((order) => {
        if (order.id === orderId) {
          const newAmountPaid = order.amountPaid + amount;
          const isPaid = newAmountPaid >= order.total;
          return {
            ...order,
            amountPaid: newAmountPaid,
            status: isPaid ? ("paid" as const) : order.status,
          };
        }
        return order;
      })
    );
    toast.success("Pago registrado exitosamente", {
      description: `Se registró un pago de $${amount.toLocaleString()}`,
    });
  };

  const handleMarkAsDelivered = (orderId: string) => {
    setOrders((prevOrders) =>
      prevOrders.map((order) =>
        order.id === orderId ? { ...order, status: "delivered" as const } : order
      )
    );
    toast.success("Pedido marcado como entregado");
  };

  const handleOpenPaymentDialog = (orderId: string) => {
    setSelectedOrder(orderId);
    setShowPaymentDialog(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-[#fedc97]/70 text-[#b5b682]";
      case "paid":
        return "bg-[#7c9885]/30 text-[#28666e]";
      case "delivered":
        return "bg-[#7c9885]/50 text-[#033f63]";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Pendiente";
      case "paid":
        return "Pagado";
      case "delivered":
        return "Entregado";
      default:
        return status;
    }
  };

  const selectedOrderData = orders.find((o) => o.id === selectedOrder);

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
        <Select value={currentClientId} onValueChange={setCurrentClientId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Seleccionar cliente" />
          </SelectTrigger>
          <SelectContent>
            {mockClients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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

        {clientOrders.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No hay pedidos para este cliente
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-[#033f63]">
                  <th className="text-left py-2 px-2 text-[#033f63]">Fecha</th>
                  <th className="text-left py-2 px-2 text-[#033f63]">Paciente</th>
                  <th className="text-left py-2 px-2 text-[#033f63]">Trabajo</th>
                  <th className="text-right py-2 px-2 text-[#033f63]">Total</th>
                  <th className="text-right py-2 px-2 text-[#033f63]">Pagado</th>
                  <th className="text-right py-2 px-2 text-[#033f63]">Falta</th>
                  <th className="text-center py-2 px-2 text-[#033f63]">Estado</th>
                  <th className="text-center py-2 px-2 text-[#033f63]">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientOrders.map((order, index) => {
                  const remaining = order.total - order.amountPaid;
                  const isFullyPaid = remaining <= 0;
                  
                  return (
                    <tr
                      key={order.id}
                      className={`border-b border-gray-100 ${
                        index % 2 === 0 ? "bg-gray-50" : ""
                      }`}
                    >
                      <td className="py-3 px-2 text-gray-700">{order.date}</td>
                      <td className="py-3 px-2 text-gray-700">
                        {order.patientName}
                      </td>
                      <td className="py-3 px-2">
                        <div>
                          <p className="text-gray-800">{order.type}</p>
                          <p className="text-xs text-gray-500">
                            {order.description}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right text-[#033f63]">
                        ${order.total.toLocaleString()}
                      </td>
                      <td className="py-3 px-2 text-right text-[#7c9885]">
                        ${order.amountPaid.toLocaleString()}
                      </td>
                      <td
                        className={`py-3 px-2 text-right font-medium ${
                          remaining > 0 ? "text-[#b5b682]" : "text-gray-400"
                        }`}
                      >
                        ${remaining.toLocaleString()}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span
                          className={`text-xs px-2 py-1 rounded-full inline-block ${getStatusColor(
                            order.status
                          )}`}
                        >
                          {getStatusText(order.status)}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex gap-1 justify-center">
                          {/* Botón Registrar Pago - siempre visible si no está completamente pagado */}
                          {!isFullyPaid && order.status !== "delivered" && (
                            <Button
                              onClick={() => handleOpenPaymentDialog(order.id)}
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 px-2 border-[#7c9885] text-[#7c9885] hover:bg-[#7c9885]/10"
                              title="Registrar pago"
                            >
                              <DollarSign size={14} />
                            </Button>
                          )}
                          
                          {/* Botón Entregar - solo si está pagado completamente y no entregado */}
                          {isFullyPaid && order.status !== "delivered" && (
                            <Button
                              onClick={() => handleMarkAsDelivered(order.id)}
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 px-2 border-[#033f63] text-[#033f63] hover:bg-[#033f63]/10"
                              title="Marcar como entregado"
                            >
                              <CheckCircle size={14} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {/* Total Row */}
                <tr className="border-t-2 border-[#033f63] bg-[#033f63]/5">
                  <td colSpan={3} className="py-3 px-2 text-right text-[#033f63]">
                    <strong>TOTAL:</strong>
                  </td>
                  <td className="py-3 px-2 text-right text-[#033f63]">
                    <strong>${totalAmount.toLocaleString()}</strong>
                  </td>
                  <td className="py-3 px-2 text-right text-[#7c9885]">
                    <strong>${paidAmount.toLocaleString()}</strong>
                  </td>
                  <td className="py-3 px-2 text-right text-[#b5b682]">
                    <strong>${pendingAmount.toLocaleString()}</strong>
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <NewOrderDialog
        open={showNewOrderDialog}
        onOpenChange={setShowNewOrderDialog}
        preselectedClientId={currentClientId}
      />

      {selectedOrderData && (
        <PaymentDialog
          open={showPaymentDialog}
          onOpenChange={setShowPaymentDialog}
          orderId={selectedOrderData.id}
          patientName={selectedOrderData.patientName}
          total={selectedOrderData.total}
          amountPaid={selectedOrderData.amountPaid}
          onPayment={handleRegisterPayment}
        />
      )}
    </div>
  );
}
