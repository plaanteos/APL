import { useState, useEffect, useMemo, useCallback } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { Printer, MessageCircle, Mail, Download, Plus, Eye, Loader2, DollarSign, CheckCircle, TrendingUp, TrendingDown } from "lucide-react";
import clientService from "../../services/client.service";
import orderService from "../../services/order.service";
import expenseService, { IOtherExpense } from "../../services/expense.service";
import { IClient, IClientBalance, IBalanceItem } from "../types";
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
import { AddExpenseSheet } from "./AddExpenseSheet";
import { OtherExpensesSheet } from "./OtherExpensesSheet";
import { PrintableReceipt } from "./PrintableReceipt";
import { notificationService } from "../../services/notification.service";

interface BalanceProps {
  selectedClientId: number | null;
}

type BalancePeriod = "all" | "monthly" | "yearly";

export function Balance({ selectedClientId }: BalanceProps) {
  const [clients, setClients] = useState<IClient[]>([]);
  const [currentClientId, setCurrentClientId] = useState<number | null>(
    selectedClientId
  );
  const [balanceData, setBalanceData] = useState<IClientBalance | null>(null);
  const [period, setPeriod] = useState<BalancePeriod>("all");
  const [monthValue, setMonthValue] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  });
  const [yearValue, setYearValue] = useState<string>(
    () => String(new Date().getFullYear())
  );
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [showNewOrderDialog, setShowNewOrderDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showAddExpenseSheet, setShowAddExpenseSheet] = useState(false);
  const [showExpensesSheet, setShowExpensesSheet] = useState(false);
  const [expensesCount, setExpensesCount] = useState(0);
  const [paymentTarget, setPaymentTarget] = useState<{
    pedidoId: number;
    paciente: string;
    montoTotal: number;
    montoPagado: number;
  } | null>(null);

  // Pedidos globales para Balances Mensual/Anual
  const [globalOrders, setGlobalOrders] = useState<any[]>([]);
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false);

  // Selección de pedidos para comprobante
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);

  // Gastos para balance mensual/anual
  const [periodExpenses, setPeriodExpenses] = useState<IOtherExpense[]>([]);
  const [periodExpenseSummary, setPeriodExpenseSummary] = useState<{
    total: number;
    totalInsumos: number;
    totalCadeteria: number;
  } | null>(null);

  // ─── Cargar clientes ────────────────────────────────────────────────────────
  const fetchClients = useCallback(async () => {
    try {
      setIsLoadingClients(true);
      const data = await clientService.getAll();
      setClients(data);
      if (!currentClientId && data.length > 0) {
        setCurrentClientId(data[0].id);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Error al cargar clientes");
    } finally {
      setIsLoadingClients(false);
    }
  }, [currentClientId]);

  useEffect(() => {
    if (selectedClientId) setCurrentClientId(selectedClientId);
  }, [selectedClientId]);

  // ─── Cargar balance del cliente ─────────────────────────────────────────────
  const fetchBalance = useCallback(async () => {
    if (!currentClientId) return;
    try {
      setIsLoadingBalance(true);
      setError(null);
      const balance = await clientService.getBalance(currentClientId);
      setBalanceData(balance);
    } catch (err: any) {
      setError(err.response?.data?.error || "Error al cargar balance");
      setBalanceData(null);
    } finally {
      setIsLoadingBalance(false);
    }
  }, [currentClientId]);

  // Cargar contador de gastos
  const fetchExpenseCount = useCallback(async () => {
    try {
      const expenses = await expenseService.getAll();
      setExpensesCount(expenses.length);
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Efectos
  useEffect(() => {
    fetchClients();
    fetchExpenseCount();
  }, [fetchClients, fetchExpenseCount]);

  useEffect(() => {
    fetchBalance();
    setSelectedOrderIds([]);
  }, [fetchBalance]);

  // ─── Cargar gastos del período seleccionado ──────────────────────────────────
  useEffect(() => {
    if (period === "all") {
      setPeriodExpenses([]);
      setPeriodExpenseSummary(null);
      return;
    }

    (async () => {
      try {

        const [year, month] = period === "monthly"
          ? [parseInt(monthValue.split("-")[0]), parseInt(monthValue.split("-")[1])]
          : [parseInt(yearValue), undefined];

        const summary = await expenseService.getSummary({
          period: period as "monthly" | "yearly",
          year,
          month,
        });

        setPeriodExpenses(summary.gastos);
        setPeriodExpenseSummary({
          total: summary.total,
          totalInsumos: summary.totalInsumos,
          totalCadeteria: summary.totalCadeteria,
        });
      } catch (err: any) {
        toast.error("Error al cargar gastos del período");
        setPeriodExpenses([]);
        setPeriodExpenseSummary(null);
      } finally {

      }
    })();

    // Cargar pedidos globales si elegimos un filtro global
    (async () => {
      try {
        setIsLoadingGlobal(true);
        const orders = await orderService.getAll();
        setGlobalOrders(orders);
      } catch (err) {
        toast.error("Error al cargar pedidos globales");
      } finally {
        setIsLoadingGlobal(false);
      }
    })();
  }, [period, monthValue, yearValue]);

  // ─── Filtrado de pedidos del cliente ─────────────────────────────────────────
  const filteredPedidos = useMemo(() => {
    const pedidos = balanceData?.pedidos ?? [];
    return pedidos; // El Balance de Cliente siempre muestra todo el balance del cliente sin importar la fecha
  }, [balanceData]);

  // ─── Filtrado de pedidos globales (para Mensual / Anual) ─────────────────────
  const filteredGlobalOrders = useMemo(() => {
    if (period === "all") return [];

    const parse = (value: any) => {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? null : d;
    };

    if (period === "monthly") {
      const mm = String(monthValue).match(/^([0-9]{4})-([0-9]{2})$/);
      if (!mm) return [];
      const y = Number(mm[1]);
      const month = Number(mm[2]);
      const start = new Date(y, month - 1, 1);
      const end = new Date(y, month, 1);
      return globalOrders.filter((p) => {
        const d = parse((p as any).fecha_pedido || (p as any).fecha);
        return d != null && d >= start && d < end && !p.fecha_delete;
      });
    }

    const y = Number(String(yearValue).trim());
    if (Number.isNaN(y)) return [];
    const start = new Date(y, 0, 1);
    const end = new Date(y + 1, 0, 1);
    return globalOrders.filter((p) => {
      const d = parse((p as any).fecha_pedido || (p as any).fecha);
      return d != null && d >= start && d < end && !p.fecha_delete;
    });
  }, [globalOrders, period, monthValue, yearValue]);

  const viewTotals = useMemo(() => {
    const totalGeneral = filteredPedidos.reduce(
      (sum, p) => sum + Number((p as any).montoTotal ?? 0),
      0
    );
    const totalPagado = filteredPedidos.reduce(
      (sum, p) => sum + Number((p as any).montoPagado ?? 0),
      0
    );
    const totalPendiente = filteredPedidos.reduce(
      (sum, p) => sum + Number((p as any).montoPendiente ?? 0),
      0
    );
    return { totalGeneral, totalPagado, totalPendiente };
  }, [filteredPedidos]);

  // ─── Handlers de selección ───────────────────────────────────────────────────
  const handleToggleOrderSelection = (pedidoId: number) => {
    setSelectedOrderIds((prev) =>
      prev.includes(pedidoId)
        ? prev.filter((id) => id !== pedidoId)
        : [...prev, pedidoId]
    );
  };

  const handleSelectAll = () => {
    if (selectedOrderIds.length === filteredPedidos.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredPedidos.map((p) => p.pedidoId));
    }
  };

  // ─── Imprimir comprobante ────────────────────────────────────────────────────
  const handlePrintReceipt = () => {
    if (selectedOrderIds.length === 0) {
      toast.error("Selecciona al menos un pedido para imprimir");
      return;
    }
    setTimeout(() => window.print(), 100);
    toast.success("Abriendo vista de impresión");
  };

  // ─── Enviar WhatsApp con pedidos seleccionados ───────────────────────────────
  const handleSendWhatsAppSelected = async () => {
    if (selectedOrderIds.length === 0) {
      toast.error("Selecciona al menos un pedido para enviar");
      return;
    }
    const client = selectedClient;
    if (!client?.telefono) {
      toast.error("El cliente no tiene teléfono");
      return;
    }

    const selectedOrders = filteredPedidos.filter((p) =>
      selectedOrderIds.includes(p.pedidoId)
    );
    const total = selectedOrders.reduce((s, p) => s + p.montoTotal, 0);
    const pagado = selectedOrders.reduce((s, p) => s + p.montoPagado, 0);

    const msg = [
      `Comprobante de Pedidos - APL Laboratorio Dental`,
      ``,
      `Hola ${client.nombre},`,
      ``,
      `Detalle de ${selectedOrders.length} pedido(s):`,
      ...selectedOrders.map(
        (p) =>
          `• ${p.paciente || "—"}: $${p.montoTotal.toLocaleString("es-ES")} (pagado: $${p.montoPagado.toLocaleString("es-ES")})`
      ),
      ``,
      `Total: $${total.toLocaleString("es-ES")}`,
      `Pagado: $${pagado.toLocaleString("es-ES")}`,
      ``,
      `- APL Laboratorio Dental`,
    ].join("\n");

    toast.promise(
      notificationService.send({ channel: "whatsapp", to: client.telefono, message: msg }),
      {
        loading: "Enviando WhatsApp...",
        success: "Comprobante enviado por WhatsApp",
        error: (e: any) => e?.response?.data?.error || "Error al enviar",
      }
    );
    setSelectedOrderIds([]);
  };

  // ─── Handlers de notificación ────────────────────────────────────────────────
  const buildBalanceMessage = () => {
    if (!selectedClient) return "";
    return [
      `Resumen de balance - APL Laboratorio Dental`,
      ``,
      `Hola ${selectedClient.nombre},`,
      `Total: $${viewTotals.totalGeneral.toLocaleString("es-ES")}`,
      `Pagado: $${viewTotals.totalPagado.toLocaleString("es-ES")}`,
      `Pendiente: $${viewTotals.totalPendiente.toLocaleString("es-ES")}`,
      ``,
      `- APL Laboratorio Dental`,
    ].join("\n");
  };

  const handleSendEmail = async () => {
    if (!selectedClient?.email) { toast.error("El cliente no tiene email"); return; }
    if (!currentClientId) { toast.error("No hay cliente seleccionado"); return; }
    toast.promise(
      notificationService.send({
        channel: "email",
        to: selectedClient.email,
        subject: `Resumen de balance - ${selectedClient.nombre}`,
        message: buildBalanceMessage(),
        attachBalanceExcel: true,
        balanceClientId: currentClientId,
        balanceClientName: selectedClient.nombre,
      }),
      {
        loading: "Enviando email...",
        success: "Resumen enviado por email",
        error: (e: any) => e?.response?.data?.error || "Error al enviar email",
      }
    );
  };

  const handleSendWhatsApp = async () => {
    if (!selectedClient?.telefono) { toast.error("El cliente no tiene teléfono"); return; }
    toast.promise(
      notificationService.send({
        channel: "whatsapp",
        to: selectedClient.telefono,
        message: buildBalanceMessage(),
      }),
      {
        loading: "Enviando WhatsApp...",
        success: "Resumen enviado por WhatsApp",
        error: (e: any) => e?.response?.data?.error || "Error al enviar WhatsApp",
      }
    );
  };

  const handleDownloadExcel = async () => {
    if (!currentClientId || !selectedClient) return;
    toast.promise(
      clientService.exportBalance(currentClientId, selectedClient.nombre),
      {
        loading: "Generando Excel...",
        success: "Excel descargado correctamente",
        error: "Error al descargar Excel",
      }
    );
  };

  const handleMarkAsDelivered = async (pedidoId: number) => {
    try {
      await orderService.markAsDelivered(pedidoId);
      toast.success("Pedido marcado como entregado");
      fetchBalance();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Error al marcar como entregado");
    }
  };

  const openPaymentFor = (item: IBalanceItem) => {
    setPaymentTarget({
      pedidoId: item.pedidoId,
      paciente: item.paciente,
      montoTotal: item.montoTotal ?? 0,
      montoPagado: item.montoPagado ?? 0,
    });
    setShowPaymentDialog(true);
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const formatCurrency = (value: number) =>
    `$${Number(value ?? 0).toLocaleString("es-ES")}`;

  const formatDate = (value: any) => {
    try { return new Date(value).toLocaleDateString("es-ES"); } catch { return ""; }
  };

  const formatExpenseDate = (isoString: string) => {
    try { return new Date(isoString).toLocaleDateString("es-ES"); } catch { return isoString; }
  };

  const getTrabajoTitle = (productos: string) => {
    const first = String(productos ?? "").split(",")[0]?.trim() || "";
    return first.replace(/\s+x\d+\s*$/i, "").trim() || first;
  };

  const selectedClient = clients.find((c) => c.id === currentClientId);

  // ─── Descarga CSV mensual / anual (sin dependencias externas) ────────────────
  const handleDownloadPeriodExcel = () => {
    try {
      const periodLabel = period === "monthly" ? monthValue : yearValue;
      const income = viewTotals.totalPagado;
      const expenses = periodExpenseSummary?.total ?? 0;
      const balance = income - expenses;

      const esc = (v: any) => {
        const s = String(v ?? "");
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const csvRow = (cells: any[]) => cells.map(esc).join(",");

      const lines: string[] = [];

      lines.push("=== RESUMEN ===");
      lines.push(csvRow(["Concepto", "Monto"]));
      lines.push(csvRow(["Total Ingresos", income]));
      lines.push(csvRow(["Total Egresos - Insumos", periodExpenseSummary?.totalInsumos ?? 0]));
      lines.push(csvRow(["Total Egresos - Cadeteria", periodExpenseSummary?.totalCadeteria ?? 0]));
      lines.push(csvRow(["Total Egresos", expenses]));
      lines.push(csvRow(["Balance", balance]));
      lines.push("");
      lines.push("=== PEDIDOS ===");
      lines.push(csvRow(["Fecha", "Paciente", "Trabajo", "Total", "Pagado", "Pendiente", "Entregado"]));
      filteredGlobalOrders.forEach((p) => // Use filteredGlobalOrders for orders list
        lines.push(csvRow([
          formatDate(p.fecha), p.paciente || "-", p.productos,
          p.montoTotal, p.montoPagado, p.montoPendiente,
          p.entregado ? "Si" : "No",
        ]))
      );
      lines.push("");
      lines.push("=== GASTOS ===");
      lines.push(csvRow(["Fecha", "Tipo", "Descripcion", "Monto"]));
      periodExpenses.forEach((e) =>
        lines.push(csvRow([
          formatExpenseDate(e.fecha),
          e.tipo === "supplies" ? "Insumos" : "Cadeteria",
          e.descripcion, e.monto,
        ]))
      );

      const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Balance_${period === "monthly" ? "Mensual" : "Anual"}_${periodLabel}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast.success("CSV descargado exitosamente");
    } catch {
      toast.error("Error al descargar");
    }
  };


  // ─── Vista de Pedidos (tabla compartida) ─────────────────────────────────────
  const renderOrdersTable = (showCheckboxes = false) => (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-[#033f63]">
          {period === "all" ? "Detalle de Pedidos" : period === "monthly" ? "Pedidos del Mes" : "Pedidos del Año"}
        </h3>
        {showCheckboxes && filteredPedidos.length > 0 && (
          <Button
            onClick={handleSelectAll}
            variant="ghost"
            size="sm"
            className="h-auto py-1 px-2 text-xs text-[#033f63]"
          >
            {selectedOrderIds.length === filteredPedidos.length
              ? "Deseleccionar todos"
              : "Seleccionar todos"}
          </Button>
        )}
      </div>

      {filteredPedidos.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          No hay pedidos registrados para este período
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <colgroup>
              {showCheckboxes && <col className="w-[5%]" />}
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[15%]" />
              <col className={showCheckboxes ? "w-[20%]" : "w-[25%]"} />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
              {period === "all" && <col className="w-[10%]" />}
            </colgroup>
            <thead>
              <tr className="border-b-2 border-[#033f63] text-left">
                {showCheckboxes && (
                  <th className="py-3 px-3">
                    <Checkbox
                      checked={
                        selectedOrderIds.length === filteredPedidos.length &&
                        filteredPedidos.length > 0
                      }
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                )}
                <th className="py-3 px-3 font-semibold text-[#033f63] whitespace-nowrap">Fecha pedido</th>
                <th className="py-3 px-3 font-semibold text-[#033f63] whitespace-nowrap">Fecha entrega</th>
                <th className="py-3 px-3 font-semibold text-[#033f63] whitespace-nowrap">Paciente</th>
                <th className="py-3 px-3 font-semibold text-[#033f63]">Trabajo</th>
                <th className="py-3 px-3 font-semibold text-[#033f63] text-right whitespace-nowrap">Total</th>
                <th className="py-3 px-3 font-semibold text-[#033f63] text-right whitespace-nowrap">Pagado</th>
                <th className="py-3 px-3 font-semibold text-[#033f63] text-right whitespace-nowrap">Falta</th>
                <th className="py-3 px-3 font-semibold text-[#033f63] whitespace-nowrap">Estado</th>
                {period === "all" && (
                  <th className="py-3 px-3 font-semibold text-[#033f63] text-center whitespace-nowrap">Acciones</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredPedidos.map((item) => {
                const trabajoTitle = getTrabajoTitle(item.productos);
                const isDelivered = !!item.entregado;
                const hasDebt = Number(item.montoPendiente ?? 0) > 0;
                const isPaid = !hasDebt && Number(item.montoTotal ?? 0) > 0;
                const isSelected = selectedOrderIds.includes(item.pedidoId);

                return (
                  <tr
                    key={item.pedidoId}
                    className={`border-b last:border-b-0 ${
                      isSelected ? "bg-[#033f63]/10" : ""
                    }`}
                  >
                    {showCheckboxes && (
                      <td className="py-4 px-3 align-top">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleOrderSelection(item.pedidoId)}
                        />
                      </td>
                    )}
                    <td className="py-4 px-3 text-gray-700 whitespace-nowrap align-top">
                      {formatDate(item.fecha)}
                    </td>
                    <td className="py-4 px-3 text-gray-700 whitespace-nowrap align-top">
                      {item.fecha_entrega ? formatDate(item.fecha_entrega as string) : "-"}
                    </td>
                    <td className="py-4 px-3 text-gray-700 whitespace-nowrap align-top">
                      {item.paciente || "-"}
                    </td>
                    <td className="py-4 px-3 align-top">
                      <div className="font-medium text-gray-900 truncate">{trabajoTitle || "-"}</div>
                      <div className="text-xs text-gray-500 truncate">{item.productos}</div>
                    </td>
                    <td className="py-4 px-3 text-right text-[#033f63] whitespace-nowrap align-top">
                      {formatCurrency(item.montoTotal ?? 0)}
                    </td>
                    <td className="py-4 px-3 text-right text-[#7c9885] whitespace-nowrap align-top">
                      {formatCurrency(item.montoPagado ?? 0)}
                    </td>
                    <td className="py-4 px-3 text-right text-[#b5b682] whitespace-nowrap align-top">
                      {formatCurrency(item.montoPendiente ?? 0)}
                    </td>
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
                    {period === "all" && (
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
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#033f63] bg-gray-50">
                <td
                  colSpan={showCheckboxes ? 4 : 3}
                  className="py-3 px-3 text-right font-semibold text-[#033f63]"
                >
                  TOTAL:
                </td>
                <td className="py-3 px-3 text-right font-semibold text-[#033f63] whitespace-nowrap">
                  {formatCurrency(viewTotals.totalGeneral ?? 0)}
                </td>
                <td className="py-3 px-3 text-right font-semibold text-[#7c9885] whitespace-nowrap">
                  {formatCurrency(viewTotals.totalPagado ?? 0)}
                </td>
                <td className="py-3 px-3 text-right font-semibold text-[#b5b682] whitespace-nowrap">
                  {formatCurrency(viewTotals.totalPendiente ?? 0)}
                </td>
                <td colSpan={period === "all" ? 2 : 1} className="py-3 px-3" />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Card>
  );

  // ─── Resumen mensual / anual ─────────────────────────────────────────────────
  const renderPeriodSummary = () => {
    const income = filteredGlobalOrders.reduce((acc, o) => acc + (o.montoPagado || 0), 0);
    const expenses = periodExpenseSummary?.total ?? 0;
    const balance = income - expenses;

    return (
      <div className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 border-none bg-[#7c9885] text-white shadow-md">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-white/90">Ingresos</p>
              <TrendingUp size={18} className="text-white/80" />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(income)}</p>
            <p className="text-[10px] text-white/70 mt-1">{filteredGlobalOrders.length} pedidos</p>
          </Card>

          <Card className="p-4 border-none bg-[#fedc97] text-[#033f63] shadow-md">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-[#033f63]/80">Egresos</p>
              <TrendingDown size={18} className="text-[#033f63]/70" />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(expenses)}</p>
            <p className="text-[10px] text-[#033f63]/60 mt-1">{periodExpenses.length} gastos</p>
          </Card>
        </div>

        {/* Balance Card */}
        <Card
          className="p-4 border-none shadow-lg bg-[#033f63] text-white"
        >
          <p className="text-xs font-semibold text-white/80 mb-1">
            {period === "monthly" ? "Balance del Mes" : "Balance Anual"}
          </p>
          <p className={`text-3xl font-bold ${balance >= 0 ? 'text-white' : 'text-[#fedc97]'}`}>
            {formatCurrency(balance)}
          </p>
        </Card>

        {/* Desglose Egresos */}
        {periodExpenseSummary && (
          <Card className="p-4">
            <h3 className="text-[#033f63] font-medium mb-3">Desglose de Egresos</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Insumos:</span>
                <span className="text-sm font-medium text-[#033f63]">
                  {formatCurrency(periodExpenseSummary.totalInsumos)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Cadetería:</span>
                <span className="text-sm font-medium text-[#28666e]">
                  {formatCurrency(periodExpenseSummary.totalCadeteria)}
                </span>
              </div>
              <div className="border-t pt-2 flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Total:</span>
                <span className="text-sm font-bold text-[#033f63]">
                  {formatCurrency(periodExpenseSummary.total)}
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* Download Button */}
        <Button
          onClick={handleDownloadPeriodExcel}
          variant="outline"
          size="sm"
          className="w-full flex items-center justify-center gap-2 border-[#7c9885] text-[#7c9885] hover:bg-[#7c9885]/10"
        >
          <Download size={18} />
          <span>Descargar CSV</span>
        </Button>
      </div>
    );
  };

  // ─── Loading / Error states ───────────────────────────────────────────────────
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

  // ─── Render principal ────────────────────────────────────────────────────────
  return (
    <>
      <div className="p-4 space-y-4 print:hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-[#033f63] font-semibold text-lg">Balance</h2>
        <Button
          onClick={() => setShowNewOrderDialog(true)}
          className="bg-[#033f63] hover:bg-[#28666e]"
          size="sm"
        >
          <Plus size={16} className="mr-1" />
          Pedido
        </Button>
      </div>

      {/* Filtros: cliente + período */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Período / Tipo de Balance (Aparece primero como pidió el cliente) */}
          <div className="space-y-2">
            <label htmlFor="balancePeriod" className="text-sm font-medium text-gray-700">
              Tipo de balance
            </label>
            <Select value={period} onValueChange={(v) => setPeriod(v as BalancePeriod)}>
              <SelectTrigger id="balancePeriod" className="w-full">
                <SelectValue placeholder="Seleccionar filtro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Balance por Cliente</SelectItem>
                <SelectItem value="monthly">Balance Mensual</SelectItem>
                <SelectItem value="yearly">Balance Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Cliente (Solo si está en 'Balance por Cliente') */}
          {period === "all" && (
            <div className="space-y-2">
              <label htmlFor="balanceClient" className="text-sm font-medium text-gray-700">
                Seleccionar cliente
              </label>
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
              {selectedClient && (
                <p className="text-xs text-gray-500">
                  Mostrando balance de:{" "}
                  <span className="font-medium text-gray-700">{selectedClient.nombre}</span>
                </p>
              )}
            </div>
          )}
          </div>

          {period === "monthly" && (
            <div className="space-y-2">
              <label htmlFor="balanceMonth" className="text-sm font-medium text-gray-700">Mes</label>
              <Input
                id="balanceMonth"
                type="month"
                value={monthValue}
                onChange={(e) => setMonthValue(e.target.value)}
              />
            </div>
          )}

          {period === "yearly" && (
            <div className="space-y-2">
              <label htmlFor="balanceYear" className="text-sm font-medium text-gray-700">Año</label>
              <Input
                id="balanceYear"
                type="number"
                min="2000"
                max="2100"
                value={yearValue}
                onChange={(e) => setYearValue(e.target.value)}
              />
            </div>
          )}
        </div>
      </Card>

      {period === "all" ? (
        isLoadingBalance ? (
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
          {/* Summary Cards - Vista por Cliente */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-4 border-none bg-[#033f63] text-white shadow-md">
              <p className="text-xs font-semibold text-white/80 mb-1">Total</p>
              <p className="text-xl font-bold">
                {formatCurrency(viewTotals.totalGeneral ?? 0)}
              </p>
            </Card>
            <Card className="p-4 border-none bg-[#7c9885] text-white shadow-md">
              <p className="text-xs font-semibold text-white/80 mb-1">Pagado</p>
              <p className="text-xl font-bold">
                {formatCurrency(viewTotals.totalPagado ?? 0)}
              </p>
            </Card>
            <Card className="p-4 border-none bg-[#fedc97] text-[#033f63] shadow-md">
              <p className="text-xs font-semibold text-[#033f63]/70 mb-1">Pendiente</p>
              <p className="text-xl font-bold">
                {formatCurrency(viewTotals.totalPendiente ?? 0)}
              </p>
            </Card>
          </div>

          {/* Actions - Notificaciones y Excel */}
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
              disabled={!balanceData || filteredPedidos.length === 0}
            >
              <Download className="h-5 w-5" />
              <span className="text-xs">Excel</span>
            </Button>
          </div>

          {/* Otros Gastos */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => setShowAddExpenseSheet(true)}
              variant="outline"
              size="sm"
              className="flex items-center justify-center gap-2 h-auto py-3 border-[#b5b682] text-[#b5b682] hover:bg-[#b5b682]/10"
            >
              <Plus size={18} />
              <span className="text-sm">Agregar Otros Gastos</span>
            </Button>
            <Button
              onClick={() => setShowExpensesSheet(true)}
              variant="outline"
              size="sm"
              className="flex items-center justify-center gap-2 h-auto py-3 border-[#033f63] text-[#033f63] hover:bg-[#033f63]/10"
            >
              <Eye size={18} />
              <span className="text-sm">Ver Otros Gastos</span>
              {expensesCount > 0 && (
                <span className="flex items-center justify-center w-5 h-5 ml-1 text-xs font-medium text-white bg-[#033f63] rounded-full">
                  {expensesCount}
                </span>
              )}
            </Button>
          </div>

          {/* Panel de acciones cuando hay pedidos seleccionados */}
          {selectedOrderIds.length > 0 && (
            <Card className="p-4 bg-[#033f63]/5 border-[#033f63]">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-[#033f63] font-medium">
                  {selectedOrderIds.length} pedido(s) seleccionado(s)
                </p>
                <Button
                  onClick={() => setSelectedOrderIds([])}
                  variant="ghost"
                  size="sm"
                  className="h-auto py-1 px-2 text-xs text-gray-600"
                >
                  Limpiar selección
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={handlePrintReceipt}
                  size="sm"
                  className="flex items-center justify-center gap-2 bg-[#033f63] hover:bg-[#28666e]"
                >
                  <Printer size={16} />
                  <span className="text-xs">Imprimir Comprobante</span>
                </Button>
                <Button
                  onClick={handleSendWhatsAppSelected}
                  size="sm"
                  className="flex items-center justify-center gap-2 bg-[#28666e] hover:bg-[#7c9885]"
                >
                  <MessageCircle size={16} />
                  <span className="text-xs">Enviar WhatsApp</span>
                </Button>
              </div>
            </Card>
          )}

          {/* Data tables */}
          {renderOrdersTable(true)}
        </>
        )
      ) : (
        isLoadingGlobal ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
          </div>
        ) : (
          renderPeriodSummary()
        )
      )}

      {/* Dialogs */}
      <NewOrderDialog
        open={showNewOrderDialog}
        onOpenChange={setShowNewOrderDialog}
        preselectedClientId={currentClientId != null ? currentClientId.toString() : undefined}
        onOrderCreated={fetchBalance}
      />

      <PaymentDialog
        open={showPaymentDialog}
        onOpenChange={(open) => {
          setShowPaymentDialog(open);
          if (!open) setPaymentTarget(null);
        }}
        pedidoId={paymentTarget?.pedidoId ?? null}
        paciente={paymentTarget?.paciente ?? ""}
        montoTotal={paymentTarget?.montoTotal ?? 0}
        montoPagado={paymentTarget?.montoPagado ?? 0}
        onPaymentCreated={fetchBalance}
      />

      <AddExpenseSheet
        open={showAddExpenseSheet}
        onOpenChange={setShowAddExpenseSheet}
        onExpenseAdded={fetchExpenseCount}
      />

      <OtherExpensesSheet
        open={showExpensesSheet}
        onOpenChange={setShowExpensesSheet}
      />
      </div>

      {/* Comprobante imprimible (No oculto por print:hidden del padre) */}
      {selectedClient && (
        <PrintableReceipt
          client={selectedClient}
          orders={filteredPedidos}
          selectedOrderIds={selectedOrderIds}
        />
      )}
    </>
  );
}
