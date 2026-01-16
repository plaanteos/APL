import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Mail, MessageCircle, Download, Plus, DollarSign, Package, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import clientService from "../../services/client.service";
import orderService from "../../services/order.service";
import paymentService from "../../services/payment.service";
import { IClient, IClientBalance, IOrderWithCalculations } from "../types";
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
  selectedClientId: number | null;
}

export function Balance({ selectedClientId }: BalanceProps) {
  const [clients, setClients] = useState<IClient[]>([]);
  const [currentClientId, setCurrentClientId] = useState<number | null>(selectedClientId);
  const [balanceData, setBalanceData] = useState<IClientBalance | null>(null);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewOrderDialog, setShowNewOrderDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());

  // Cargar clientes al montar
  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setIsLoadingClients(true);
      const data = await clientService.getAll();
      setClients(data);

      // Si no hay cliente seleccionado, usar el primero
      if (!currentClientId && data.length > 0) {
        setCurrentClientId(data[0].id);
      }
    } catch (err: any) {
      console.error('Error loading clients:', err);
      setError(err.response?.data?.error || 'Error al cargar clientes');
    } finally {
      setIsLoadingClients(false);
    }
  };

  // Update current client if selectedClientId changes
  useEffect(() => {
    if (selectedClientId) {
      setCurrentClientId(selectedClientId);
    }
  }, [selectedClientId]);

  // Cargar balance cuando cambia el cliente
  useEffect(() => {
    if (!currentClientId) return;
    fetchBalance();
  }, [currentClientId]);

  const fetchBalance = async () => {
    if (!currentClientId) return;

    try {
      setIsLoadingBalance(true);
      setError(null);
      const balance = await clientService.getBalance(currentClientId);
      setBalanceData(balance);
    } catch (err: any) {
      console.error('Error loading balance:', err);
      setError(err.response?.data?.error || 'Error al cargar balance');
      setBalanceData(null);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const handleOrderCreated = () => {
    fetchBalance();
  };

  const handlePaymentCreated = () => {
    fetchBalance();
  };

  const toggleOrderExpanded = (pedidoId: number) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pedidoId)) {
        newSet.delete(pedidoId);
      } else {
        newSet.add(pedidoId);
      }
      return newSet;
    });
  };

  const handleDownloadExcel = () => {
    if (!balanceData) return;

    try {
      const selectedClient = clients.find(c => c.id === currentClientId);

      // Crear datos para Excel
      const excelData = balanceData.pedidos.map((item) => ({
        Pedido: `#${item.pedidoId}`,
        Fecha: new Date(item.fecha).toLocaleDateString('es-ES'),
        Paciente: item.paciente,
        Productos: item.productos,
        Total: item.montoTotal,
        Pagado: item.montoPagado,
        Pendiente: item.montoPendiente,
        Entregado: item.entregado ? 'Sí' : 'No',
      }));

      // Agregar fila de total
      excelData.push({
        Pedido: '',
        Fecha: '',
        Paciente: '',
        Productos: 'TOTAL',
        Total: balanceData.totalGeneral,
        Pagado: balanceData.totalPagado,
        Pendiente: balanceData.totalPendiente,
        Entregado: '',
      });

      // Crear libro de trabajo
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Balance");

      // Descargar archivo
      const fileName = `Balance_${selectedClient?.nombre}_${new Date().toLocaleDateString()}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast.success("Excel descargado correctamente");
    } catch (error) {
      console.error('Error downloading Excel:', error);
      toast.error("Error al descargar Excel");
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
    toast.success("Resumen enviado por WhatsApp", {
      description: `Mensaje enviado a ${selectedClient?.telefono}`,
    });
  };

  if (isLoadingClients) {
    return (
      <div className="p-4 flex items-center justify-center h-96">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="p-4">
        <Card className="p-8 text-center">
          <p className="text-gray-500">No hay clientes registrados</p>
        </Card>
      </div>
    );
  }

  const selectedClient = clients.find(c => c.id === currentClientId);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2>Balance</h2>
        <Button
          onClick={() => setShowNewOrderDialog(true)}
          className="bg-blue-600 hover:bg-blue-700"
          size="sm"
          disabled={!currentClientId}
        >
          <Plus size={16} className="mr-1" />
          Nuevo Pedido
        </Button>
      </div>

      {/* Client Selector */}
      <Card className="p-4">
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700">Cliente</label>
          <Select 
            value={currentClientId?.toString() || ""} 
            onValueChange={(val) => setCurrentClientId(Number(val))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleccionar cliente" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id.toString()}>
                  {client.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Client Info & Actions */}
      {selectedClient && (
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium">{selectedClient.nombre}</h3>
              <p className="text-sm text-gray-600">{selectedClient.email}</p>
              <p className="text-sm text-gray-600">{selectedClient.telefono}</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSendEmail}
                variant="outline"
                size="sm"
              >
                <Mail size={16} className="mr-1" />
                Email
              </Button>
              <Button
                onClick={handleSendWhatsApp}
                variant="outline"
                size="sm"
              >
                <MessageCircle size={16} className="mr-1" />
                WhatsApp
              </Button>
              <Button
                onClick={handleDownloadExcel}
                variant="outline"
                size="sm"
                disabled={!balanceData || balanceData.pedidos.length === 0}
              >
                <Download size={16} className="mr-1" />
                Excel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Balance Data */}
      {isLoadingBalance ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
        </div>
      ) : error ? (
        <Card className="p-4 bg-red-50 border-red-200">
          <p className="text-red-800">{error}</p>
        </Card>
      ) : !balanceData ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">Selecciona un cliente para ver su balance</p>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-4">
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-2xl font-semibold text-[#033f63]">
                ${balanceData.totalGeneral.toLocaleString()}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-gray-500">Pagado</p>
              <p className="text-2xl font-semibold text-[#7c9885]">
                ${balanceData.totalPagado.toLocaleString()}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-gray-500">Pendiente</p>
              <p className="text-2xl font-semibold text-[#b5b682]">
                ${balanceData.totalPendiente.toLocaleString()}
              </p>
            </Card>
          </div>

          {/* Orders List */}
          <Card className="p-4">
            <h3 className="font-medium mb-4">Pedidos del Cliente</h3>
            
            {balanceData.pedidos.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No hay pedidos registrados para este cliente
              </div>
            ) : (
              <div className="space-y-3">
                {balanceData.pedidos.map((item) => {
                  const isExpanded = expandedOrders.has(item.pedidoId);
                  
                  return (
                    <div
                      key={item.pedidoId}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-medium">Pedido #{item.pedidoId}</p>
                            {item.entregado ? (
                              <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                                Entregado
                              </span>
                            ) : (
                              <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                                Pendiente
                              </span>
                            )}
                            {item.montoPendiente > 0 && (
                              <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-800">
                                Con deuda
                              </span>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600">
                            {new Date(item.fecha).toLocaleDateString('es-ES')}
                          </p>
                          <p className="text-sm text-gray-600">Paciente: {item.paciente}</p>
                          
                          <button
                            onClick={() => toggleOrderExpanded(item.pedidoId)}
                            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 mt-2"
                          >
                            <Package size={14} />
                            <span>{item.productos}</span>
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </div>
                        
                        <div className="text-right space-y-2">
                          <div>
                            <p className="text-xs text-gray-500">Total</p>
                            <p className="text-lg font-semibold text-[#033f63]">
                              ${item.montoTotal.toLocaleString()}
                            </p>
                          </div>
                          <div className="flex gap-3">
                            <div>
                              <p className="text-xs text-gray-500">Pagado</p>
                              <p className="text-sm text-[#7c9885]">
                                ${item.montoPagado.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Pendiente</p>
                              <p className="text-sm text-[#b5b682]">
                                ${item.montoPendiente.toLocaleString()}
                              </p>
                            </div>
                          </div>
                          
                          {item.montoPendiente > 0 && (
                            <Button
                              onClick={() => setShowPaymentDialog(true)}
                              size="sm"
                              className="mt-2 w-full bg-blue-600 hover:bg-blue-700"
                            >
                              <DollarSign size={14} className="mr-1" />
                              Registrar Pago
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
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

      <PaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        clientId={currentClientId}
        onPaymentCreated={handlePaymentCreated}
      />
    </div>
  );
}
