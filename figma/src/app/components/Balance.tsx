import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Mail, MessageCircle, Download, DollarSign, Loader2, CheckCircle } from "lucide-react";
import clientService from "../../services/client.service";
import orderService from "../../services/order.service";
import { IClient, IClientBalance } from "../types";
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
import { notificationService } from "../../services/notification.service";

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
  const [paymentTarget, setPaymentTarget] = useState<{
    pedidoId: number;
    paciente: string;
    montoTotal: number;
    montoPagado: number;
  } | null>(null);

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

  const openPaymentFor = (item: { pedidoId: number; paciente: string; montoTotal: number; montoPagado: number }) => {
    setPaymentTarget({
      pedidoId: item.pedidoId,
      paciente: item.paciente,
      montoTotal: item.montoTotal ?? 0,
      montoPagado: item.montoPagado ?? 0,
    });
    setShowPaymentDialog(true);
  };

  const handleDownloadExcel = async () => {
    if (!currentClientId || !selectedClient) return;

    try {
      toast.promise(
        clientService.exportBalance(currentClientId, selectedClient.nombre),
        {
          loading: 'Generando Excel...',
          success: 'Excel descargado correctamente',
          error: 'Error al descargar Excel',
        }
      );
    } catch (error) {
      console.error('Error in download excel handler:', error);
    }
  };

  const handleMarkAsDelivered = async (pedidoId: number) => {
    try {
      await orderService.markAsDelivered(pedidoId);
      toast.success("Pedido marcado como entregado");
      fetchBalance(); // Recargar balance para ver cambios
    } catch (err: any) {
      console.error('Error marking as delivered:', err);
      toast.error(err.response?.data?.error || 'Error al marcar como entregado');
    }
  };

  const buildBalanceMessage = () => {
    if (!selectedClient || !balanceData) return "";
    const total = (balanceData.totalGeneral ?? 0).toLocaleString();
    const pagado = (balanceData.totalPagado ?? 0).toLocaleString();
    const pendiente = (balanceData.totalPendiente ?? 0).toLocaleString();
    const labName = "APL Laboratorio Dental";

    return [
      `Resumen - ${labName}`,
      "",
      `Hola ${selectedClient.nombre},`,
      `Resumen de balance:`,
      `Total: $${total}`,
      `Pagado: $${pagado}`,
      `Pendiente: $${pendiente}`,
      `- APL Laboratorio Dental`,
    ].join("\n");
  };

  const handleSendEmail = async () => {
    if (!selectedClient?.email) {
      toast.error('El cliente no tiene email');
      return;
    }
    if (!currentClientId) {
      toast.error('No hay cliente seleccionado');
      return;
    }
    const msg = buildBalanceMessage();
    if (!msg) {
      toast.error('No hay datos de balance para enviar');
      return;
    }

    toast.promise(
      notificationService.send({
        channel: 'email',
        to: selectedClient.email,
        subject: `Resumen de balance - ${selectedClient.nombre}`,
        message: msg,
        attachBalanceExcel: true,
        balanceClientId: currentClientId,
        balanceClientName: selectedClient.nombre,
      }),
      {
        loading: 'Enviando email...',
        success: 'Resumen enviado por email',
        error: (e: any) => e?.response?.data?.error || 'Error al enviar email',
      }
    );
  };

  const handleSendWhatsApp = async () => {
    if (!selectedClient?.telefono) {
      toast.error('El cliente no tiene teléfono');
      return;
    }
    const msg = buildBalanceMessage();
    if (!msg) {
      toast.error('No hay datos de balance para enviar');
      return;
    }

    toast.promise(
      notificationService.send({
        channel: 'whatsapp',
        to: selectedClient.telefono,
        message: msg,
      }),
      {
        loading: 'Enviando WhatsApp...',
        success: 'Resumen enviado por WhatsApp',
        error: (e: any) => e?.response?.data?.error || 'Error al enviar WhatsApp',
      }
    );
  };

  const formatCurrency = (value: number) => {
    const n = Number(value ?? 0);
    return `$${n.toLocaleString('es-ES')}`;
  };

  const formatDate = (value: any) => {
    try {
      return new Date(value).toLocaleDateString('es-ES');
    } catch {
      return '';
    }
  };

  const getTrabajoTitle = (productos: string) => {
    const first = String(productos ?? '').split(',')[0]?.trim() || '';
    // Ej: "Corona x2" => "Corona" / "Puente 3 piezas x1" => "Puente 3 piezas"
    return first.replace(/\s+x\d+\s*$/i, '').trim() || first;
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
      {/* Selector de cliente (solo si no viene preseleccionado) */}
      {!selectedClientId && (
        <Card className="p-4">
          <div className="space-y-3">
            <label htmlFor="balanceClient" className="text-sm font-medium text-gray-700">Cliente</label>
            <Select
              value={currentClientId?.toString() || ""}
              onValueChange={(val) => setCurrentClientId(Number(val))}
              name="clientId"
            >
              <SelectTrigger id="balanceClient" className="w-full">
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
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-xl font-semibold text-[#033f63]">
                {formatCurrency(balanceData.totalGeneral ?? 0)}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-gray-500">Pagado</p>
              <p className="text-xl font-semibold text-[#7c9885]">
                {formatCurrency(balanceData.totalPagado ?? 0)}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-gray-500">Falta</p>
              <p className="text-xl font-semibold text-[#b5b682]">
                {formatCurrency(balanceData.totalPendiente ?? 0)}
              </p>
            </Card>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-3 gap-3">
            <Button
              onClick={handleSendEmail}
              variant="outline"
              className="h-16 flex flex-col items-center justify-center gap-1"
              disabled={!selectedClient?.email}
            >
              <Mail className="h-5 w-5" />
              <span className="text-xs">Email</span>
            </Button>
            <Button
              onClick={handleSendWhatsApp}
              variant="outline"
              className="h-16 flex flex-col items-center justify-center gap-1"
              disabled={!selectedClient?.telefono}
            >
              <MessageCircle className="h-5 w-5" />
              <span className="text-xs">WhatsApp</span>
            </Button>
            <Button
              onClick={handleDownloadExcel}
              variant="outline"
              className="h-16 flex flex-col items-center justify-center gap-1"
              disabled={!balanceData || balanceData.pedidos.length === 0}
            >
              <Download className="h-5 w-5" />
              <span className="text-xs">Excel</span>
            </Button>
          </div>

          {/* Detalle de pedidos (tabla) */}
          <Card className="p-4">
            <div className="mb-3">
              <h3 className="text-base font-semibold">Detalle de Pedidos</h3>
            </div>

            {balanceData.pedidos.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                No hay pedidos registrados para este cliente
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm table-fixed">
                  <colgroup>
                    <col className="w-[12%]" />
                    <col className="w-[18%]" />
                    <col className="w-[30%]" />
                    <col className="w-[10%]" />
                    <col className="w-[10%]" />
                    <col className="w-[10%]" />
                    <col className="w-[10%]" />
                    <col className="w-[10%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b-2 border-[#033f63] text-left">
                      <th className="py-3 px-3 font-semibold text-[#033f63] whitespace-nowrap">Fecha</th>
                      <th className="py-3 px-3 font-semibold text-[#033f63] whitespace-nowrap">Paciente</th>
                      <th className="py-3 px-3 font-semibold text-[#033f63]">Trabajo</th>
                      <th className="py-3 px-3 font-semibold text-[#033f63] text-right whitespace-nowrap">Total</th>
                      <th className="py-3 px-3 font-semibold text-[#033f63] text-right whitespace-nowrap">Pagado</th>
                      <th className="py-3 px-3 font-semibold text-[#033f63] text-right whitespace-nowrap">Falta</th>
                      <th className="py-3 px-3 font-semibold text-[#033f63] whitespace-nowrap">Estado</th>
                      <th className="py-3 px-3 font-semibold text-[#033f63] text-center whitespace-nowrap">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balanceData.pedidos.map((item) => {
                      const trabajoTitle = getTrabajoTitle(item.productos);
                      const trabajoSubtitle = item.productos;
                      const isDelivered = !!item.entregado;
                      const hasDebt = Number(item.montoPendiente ?? 0) > 0;
                      const isPaid = !hasDebt && Number(item.montoTotal ?? 0) > 0;

                      return (
                        <tr key={item.pedidoId} className="border-b last:border-b-0">
                          <td className="py-4 px-3 text-gray-700 whitespace-nowrap align-top">{formatDate(item.fecha)}</td>
                          <td className="py-4 px-3 text-gray-700 whitespace-nowrap align-top">{item.paciente || '-'}</td>
                          <td className="py-4 px-3 align-top">
                            <div className="font-medium text-gray-900 truncate">{trabajoTitle || '-'}</div>
                            {trabajoSubtitle ? (
                              <div className="text-xs text-gray-500 truncate">{trabajoSubtitle}</div>
                            ) : null}
                          </td>
                          <td className="py-4 px-3 text-right text-[#033f63] whitespace-nowrap align-top">{formatCurrency(item.montoTotal ?? 0)}</td>
                          <td className="py-4 px-3 text-right text-[#7c9885] whitespace-nowrap align-top">{formatCurrency(item.montoPagado ?? 0)}</td>
                          <td className="py-4 px-3 text-right text-[#b5b682] whitespace-nowrap align-top">{formatCurrency(item.montoPendiente ?? 0)}</td>
                          <td className="py-4 px-3 align-top">
                            {isDelivered ? (
                              <span className="inline-flex items-center rounded-full bg-[#28666e]/20 px-3 py-1 text-xs text-[#28666e]">
                                Entregado
                              </span>
                            ) : isPaid ? (
                              <span className="inline-flex items-center rounded-full bg-[#28666e]/15 px-3 py-1 text-xs text-[#28666e]">
                                Pagado
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-[#fedc97]/60 px-3 py-1 text-xs text-[#b5b682]">
                                Pendiente
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-3 text-center align-top">
                            {hasDebt ? (
                              <Button
                                type="button"
                                onClick={() => openPaymentFor(item)}
                                variant="outline"
                                size="icon"
                                className="h-9 w-9"
                                title="Registrar pago"
                              >
                                <DollarSign className="h-4 w-4" />
                              </Button>
                            ) : !isDelivered && isPaid ? (
                              <Button
                                type="button"
                                onClick={() => handleMarkAsDelivered(item.pedidoId)}
                                variant="outline"
                                size="icon"
                                className="h-9 w-9"
                                title="Confirmar entrega"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[#033f63] bg-gray-50">
                      <td colSpan={3} className="py-3 px-3 text-right font-semibold text-[#033f63]">TOTAL:</td>
                      <td className="py-3 px-3 text-right font-semibold text-[#033f63] whitespace-nowrap">{formatCurrency(balanceData.totalGeneral ?? 0)}</td>
                      <td className="py-3 px-3 text-right font-semibold text-[#7c9885] whitespace-nowrap">{formatCurrency(balanceData.totalPagado ?? 0)}</td>
                      <td className="py-3 px-3 text-right font-semibold text-[#b5b682] whitespace-nowrap">{formatCurrency(balanceData.totalPendiente ?? 0)}</td>
                      <td colSpan={2} className="py-3 px-3" />
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
        preselectedClientId={currentClientId != null ? currentClientId.toString() : undefined}
        onOrderCreated={handleOrderCreated}
      />

      <PaymentDialog
        open={showPaymentDialog}
        onOpenChange={(open) => {
          setShowPaymentDialog(open);
          if (!open) setPaymentTarget(null);
        }}
        pedidoId={paymentTarget?.pedidoId ?? null}
        paciente={paymentTarget?.paciente ?? ''}
        montoTotal={paymentTarget?.montoTotal ?? 0}
        montoPagado={paymentTarget?.montoPagado ?? 0}
        onPaymentCreated={handlePaymentCreated}
      />
    </div>
  );
}
