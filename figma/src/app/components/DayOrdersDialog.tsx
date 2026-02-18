import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Card } from "./ui/card";
import { Calendar, User, FileText, DollarSign } from "lucide-react";

interface Order {
  id: string;
  clienteId: string;
  nombrePaciente: string;
  fechaVencimiento: string;
  descripcion: string;
  tipoPedido: string;
  montoTotal: number;
  montoPagado: number;
  estado: string;
  cliente?: {
    nombre: string;
  };
}

interface DayOrdersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  orders: Order[];
  onNavigateToBalance?: (clientId: number) => void;
}

export function DayOrdersDialog({
  open,
  onOpenChange,
  date,
  orders,
  onNavigateToBalance,
}: DayOrdersDialogProps) {
  if (!date) return null;

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const normalizeStatus = (status: string) => {
    return String(status ?? '')
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[\s-]+/g, '_');
  };

  const getStatusColor = (rawStatus: string) => {
    const status = normalizeStatus(rawStatus);
    switch (status) {
      case "PENDIENTE":
        return "bg-[#fedc97]/55 text-[#033f63] border-l-4 border-[#b5b682]";
      case "EN_PROCESO":
        return "bg-[#033f63]/10 text-[#033f63] border-l-4 border-[#033f63]";
      case "LISTO_PARA_ENTREGA":
        return "bg-[#b5b682]/25 text-[#033f63] border-l-4 border-[#b5b682]";
      case "ENTREGADO":
        return "bg-[#7c9885]/25 text-[#033f63] border-l-4 border-[#7c9885]";
      case "PAGADO":
        return "bg-[#28666e]/10 text-[#28666e] border-l-4 border-[#28666e]";
      default:
        return "bg-gray-100 text-gray-800 border-l-4 border-gray-400";
    }
  };

  const getStatusText = (rawStatus: string) => {
    const status = normalizeStatus(rawStatus);
    switch (status) {
      case "PENDIENTE":
        return "Pendiente";
      case "LISTO_PARA_ENTREGA":
        return "Listo para entrega";
      case "EN_PROCESO":
        return "En proceso";
      case "PAGADO":
        return "Pagado";
      case "ENTREGADO":
        return "Entregado";
      default:
        return rawStatus;
    }
  };

  const getStatusPill = (rawStatus: string) => {
    const status = normalizeStatus(rawStatus);
    switch (status) {
      case "PENDIENTE":
      case "EN_PROCESO":
        return "bg-[#033f63]/15 text-[#033f63] border border-[#033f63]/25";
      case "LISTO_PARA_ENTREGA":
        return "bg-[#b5b682]/30 text-[#033f63] border border-[#b5b682]/60";
      case "ENTREGADO":
        return "bg-[#7c9885]/30 text-[#033f63] border border-[#7c9885]/60";
      case "PAGADO":
        return "bg-[#28666e]/15 text-[#28666e] border border-[#28666e]/20";
      default:
        return "bg-gray-200 text-gray-700";
    }
  };

  const getTextClasses = (rawStatus: string) => {
    const status = normalizeStatus(rawStatus);
    if (status === 'PENDIENTE' || status === 'EN_PROCESO' || status === 'LISTO_PARA_ENTREGA' || status === 'ENTREGADO') {
      return {
        primary: 'text-[#033f63]',
        muted: 'text-[#033f63]/75',
        divider: 'border-[#033f63]/10',
      };
    }
    if (status === 'PAGADO') {
      return {
        primary: 'text-[#28666e]',
        muted: 'text-[#28666e]/75',
        divider: 'border-[#28666e]/10',
      };
    }
    return {
      primary: 'text-current',
      muted: 'text-current/75',
      divider: 'border-current/10',
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#033f63]">
            <Calendar size={20} />
            Pedidos del {date.getDate()} de {monthNames[date.getMonth()]} {date.getFullYear()}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {orders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar size={48} className="mx-auto mb-2 opacity-50" />
              <p>No hay entregas para esta fecha</p>
            </div>
          ) : (
            orders.map((order) => {
              const text = getTextClasses(order.estado);

              return (
                <Card
                  key={order.id}
                  className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${getStatusColor(order.estado)} ${text.primary}`}
                  onClick={() => {
                    const parsed = Number(order.clienteId);
                    if (!Number.isNaN(parsed)) onNavigateToBalance?.(parsed);
                  }}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <User size={16} className="text-current" />
                          <span className="font-semibold">{order.cliente?.nombre || "Cliente"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <FileText size={14} className={text.muted} />
                          <span className={text.muted}>{order.nombrePaciente}</span>
                        </div>
                      </div>

                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusPill(order.estado)}`}
                      >
                        {getStatusText(order.estado)}
                      </span>
                    </div>

                    <div className={`grid grid-cols-2 gap-2 text-sm pt-2 border-t ${text.divider}`}>
                      <div>
                        <p className={`${text.muted} text-xs mb-0.5`}>Tipo de Trabajo:</p>
                        <p className="font-medium">{order.tipoPedido}</p>
                      </div>
                      <div>
                        <p className={`${text.muted} text-xs mb-0.5`}>Descripción:</p>
                        <p className="font-medium truncate" title={order.descripcion}>
                          {order.descripcion}
                        </p>
                      </div>
                    </div>

                    <div className={`flex items-center justify-between pt-2 border-t ${text.divider}`}>
                      <div className="flex items-center gap-1 text-sm">
                        <DollarSign size={14} className="text-current" />
                        <span className="font-semibold">
                          ${Number(order.montoTotal || 0).toLocaleString()}
                        </span>
                      </div>
                      {Number(order.montoPagado || 0) > 0 && (
                        <div className={`text-xs ${text.muted}`}>
                          Pagado: ${Number(order.montoPagado || 0).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
