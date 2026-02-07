import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { NewOrderDialog } from "./NewOrderDialog";
import { DayOrdersDialog } from "./DayOrdersDialog";
import orderService from "../../services/order.service";
import { toast } from "sonner";

type CalendarOrder = {
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
};

interface CalendarWidgetProps {
  onNavigateToBalance?: (clientId: number) => void;
}

export function CalendarWidget({ onNavigateToBalance }: CalendarWidgetProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showNewOrderDialog, setShowNewOrderDialog] = useState(false);
  const [showDayOrdersDialog, setShowDayOrdersDialog] = useState(false);
  const [preselectedDate, setPreselectedDate] = useState<string>("");
  const [orders, setOrders] = useState<CalendarOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const fetchedOrders = await orderService.getAll();
      const mappedOrders: CalendarOrder[] = (fetchedOrders || []).map((order: any) => {
        const firstDetalle = order?.detalles?.[0];
        const dueDate = order?.fecha_entrega ?? order?.fecha_pedido;

        return {
          id: String(order?.id ?? ""),
          clienteId: String(order?.id_cliente ?? ""),
          nombrePaciente: String(firstDetalle?.paciente ?? ""),
          fechaVencimiento: dueDate ? new Date(dueDate).toISOString() : new Date().toISOString(),
          descripcion: String(order?.descripcion ?? ""),
          tipoPedido: String(firstDetalle?.producto?.tipo ?? "Pedido"),
          montoTotal: Number(order?.montoTotal ?? 0),
          montoPagado: Number(order?.montoPagado ?? 0),
          estado: String(firstDetalle?.estado?.descripcion ?? ""),
          cliente: { nombre: String(order?.cliente?.nombre ?? "") },
        };
      });

      const validOrders = mappedOrders.filter(order => order.fechaVencimiento && order.tipoPedido);
      setOrders(validOrders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Error al cargar pedidos");
    } finally {
      setIsLoading(false);
    }
  };

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const daysOfWeek = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const getOrdersForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return orders.filter(order => {
      const orderDate = new Date(order.fechaVencimiento).toISOString().split('T')[0];
      return orderDate === dateString;
    });
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSameDay = (date1: Date | null, date2: Date | null) => {
    if (!date1 || !date2) return false;
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  const normalizeStatus = (status: string) => {
    return String(status ?? '')
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[\s-]+/g, '_');
  };

  const getDayStatus = (dayOrders: CalendarOrder[]) => {
    const normalized = dayOrders.map((o) => normalizeStatus(o.estado));

    // Prioridad visual: si hay algo pendiente, se ve como pendiente.
    if (normalized.some((s) => s === 'PENDIENTE' || s === 'EN_PROCESO')) return 'PENDIENTE';
    if (normalized.some((s) => s === 'LISTO_PARA_ENTREGA')) return 'LISTO_PARA_ENTREGA';
    if (normalized.some((s) => s === 'ENTREGADO')) return 'ENTREGADO';

    return normalized[0] || '';
  };

  const getDayColors = (status: string) => {
    switch (status) {
      case 'ENTREGADO':
        return {
          bg: 'bg-[#7c9885]/25 hover:bg-[#7c9885]/35',
          indicator: 'bg-[#7c9885]',
        };
      case 'LISTO_PARA_ENTREGA':
        return {
          bg: 'bg-[#033f63]/10 hover:bg-[#033f63]/15',
          indicator: 'bg-[#033f63]',
        };
      case 'PENDIENTE':
      default:
        return {
          bg: 'bg-[#fedc97]/40 hover:bg-[#fedc97]/60',
          indicator: 'bg-[#b5b682]',
        };
    }
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    const dayOrders = getOrdersForDate(date);
    if (dayOrders.length === 0) {
      // No orders for this date, open new order dialog
      const dateString = date.toISOString().split('T')[0];
      setPreselectedDate(dateString);
      setShowNewOrderDialog(true);
    } else {
      // Show all orders for this date in dialog
      setShowDayOrdersDialog(true);
    }
  };

  const handleAddOrder = () => {
    const dateString = selectedDate 
      ? selectedDate.toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    setPreselectedDate(dateString);
    setShowNewOrderDialog(true);
  };

  const handleOrderCreated = () => {
    fetchOrders();
  };

  const days = getDaysInMonth(currentDate);

  return (
    <>
      <Card className="p-4">
        {isLoading && (
          <div className="mb-3 text-sm text-gray-500">
            Cargando pedidos…
          </div>
        )}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[#033f63]">Calendario de Entregas</h2>
            <button
              onClick={handleAddOrder}
              className="p-2 bg-[#033f63] text-white rounded-full hover:bg-[#28666e] transition-colors"
              aria-label="Agregar pedido"
            >
              <Plus size={18} />
            </button>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={previousMonth}
              className="p-2 hover:bg-[#7c9885]/10 rounded-full transition-colors"
              aria-label="Mes anterior"
            >
              <ChevronLeft size={20} className="text-[#033f63]" />
            </button>
            <h3 className="text-center text-[#033f63]">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-[#7c9885]/10 rounded-full transition-colors"
              aria-label="Mes siguiente"
            >
              <ChevronRight size={20} className="text-[#033f63]" />
            </button>
          </div>

          {/* Days of week */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {daysOfWeek.map((day) => (
              <div
                key={day}
                className="text-center text-xs text-gray-500 py-1 font-medium"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              const ordersCount = getOrdersForDate(day).length;
              const dayOrders = getOrdersForDate(day);
              const hasOrders = ordersCount > 0;
              const isSelected = isSameDay(day, selectedDate);
              const isTodayDate = isToday(day);
              const firstOrder = dayOrders[0];
              const dayStatus = hasOrders ? getDayStatus(dayOrders) : '';
              const dayColors = hasOrders ? getDayColors(dayStatus) : null;

              return (
                <button
                  key={index}
                  onClick={() => handleDateClick(day)}
                  className={`
                    relative p-3 rounded-lg text-sm transition-all aspect-square
                    ${isSelected ? 'bg-[#033f63] text-white ring-2 ring-[#033f63] ring-offset-2' : ''}
                    ${!isSelected && isTodayDate ? 'bg-[#7c9885]/30 text-[#033f63] font-semibold ring-2 ring-[#7c9885]' : ''}
                    ${!isSelected && !isTodayDate && hasOrders ? `${dayColors?.bg ?? ''}` : ''}
                    ${!isSelected && !isTodayDate && !hasOrders ? 'hover:bg-gray-100' : ''}
                  `}
                  title={hasOrders ? `${ordersCount} ${ordersCount === 1 ? 'pedido' : 'pedidos'}` : ''}
                >
                  <div className="flex flex-col items-start h-full w-full">
                    <span className={`mb-1 ${hasOrders ? 'font-semibold' : ''}`}>
                      {day.getDate()}
                    </span>

                    {hasOrders && (
                      <div
                        className={`h-[3px] w-full rounded-full ${
                          isSelected ? 'bg-white/70' : (dayColors?.indicator ?? 'bg-[#b5b682]')
                        }`}
                        aria-hidden="true"
                      />
                    )}
                    
                    {hasOrders && firstOrder && (
                      <div className="w-full text-left space-y-1 mt-auto">
                        <div className={`text-[10px] leading-tight truncate ${
                          isSelected ? 'text-white' : 'text-[#033f63]'
                        }`}>
                          {firstOrder.cliente?.nombre || "Cliente"}
                        </div>
                        <div className={`text-[9px] leading-tight truncate font-medium ${
                          isSelected ? 'text-white/90' : 'text-[#28666e]'
                        }`}>
                          {firstOrder.tipoPedido}
                        </div>
                        {ordersCount > 1 && (
                          <div className={`text-[9px] font-semibold ${
                            isSelected ? 'text-white' : 'text-[#b5b682]'
                          }`}>
                            +{ordersCount - 1} más
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      <NewOrderDialog
        open={showNewOrderDialog}
        onOpenChange={setShowNewOrderDialog}
        preselectedDate={preselectedDate}
        onOrderCreated={handleOrderCreated}
      />

      <DayOrdersDialog
        open={showDayOrdersDialog}
        onOpenChange={setShowDayOrdersDialog}
        date={selectedDate}
        orders={selectedDate ? getOrdersForDate(selectedDate) : []}
        onNavigateToBalance={onNavigateToBalance}
      />
    </>
  );
}