import { useState } from "react";
import { Card } from "./ui/card";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { mockOrders } from "../data/mockData";
import { NewOrderDialog } from "./NewOrderDialog";

interface CalendarWidgetProps {
  onNavigateToBalance?: (clientId: string) => void;
}

export function CalendarWidget({ onNavigateToBalance }: CalendarWidgetProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showNewOrderDialog, setShowNewOrderDialog] = useState(false);
  const [preselectedDate, setPreselectedDate] = useState<string>("");

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
    return mockOrders.filter(order => order.dueDate === dateString);
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

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    const orders = getOrdersForDate(date);
    if (orders.length === 0) {
      // No orders for this date, open new order dialog
      const dateString = date.toISOString().split('T')[0];
      setPreselectedDate(dateString);
      setShowNewOrderDialog(true);
    }
  };

  const handleAddOrder = () => {
    const dateString = selectedDate 
      ? selectedDate.toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    setPreselectedDate(dateString);
    setShowNewOrderDialog(true);
  };

  const days = getDaysInMonth(currentDate);
  const ordersForSelectedDate = selectedDate ? getOrdersForDate(selectedDate) : [];

  return (
    <>
      <Card className="p-4">
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
                className="text-center text-xs text-gray-500 py-1"
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
              const hasOrders = ordersCount > 0;
              const isSelected = isSameDay(day, selectedDate);
              const isTodayDate = isToday(day);

              return (
                <button
                  key={index}
                  onClick={() => handleDateClick(day)}
                  className={`
                    aspect-square p-1 rounded-lg text-sm relative transition-all
                    ${isSelected ? 'bg-[#033f63] text-white' : ''}
                    ${!isSelected && isTodayDate ? 'bg-[#7c9885]/30 text-[#033f63] font-semibold' : ''}
                    ${!isSelected && !isTodayDate && hasOrders ? 'bg-[#fedc97]/40' : ''}
                    ${!isSelected && !isTodayDate && !hasOrders ? 'hover:bg-gray-100' : ''}
                  `}
                >
                  <div className="flex flex-col items-center justify-center h-full">
                    <span>{day.getDate()}</span>
                    {hasOrders && (
                      <div className="flex gap-0.5 mt-0.5">
                        {Array.from({ length: Math.min(ordersCount, 3) }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-1 h-1 rounded-full ${
                              isSelected ? 'bg-white' : 'bg-[#b5b682]'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Date Orders */}
        {selectedDate && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm text-[#033f63]">
                {selectedDate.getDate()} de {monthNames[selectedDate.getMonth()]}
              </h3>
              {ordersForSelectedDate.length > 0 && (
                <span className="text-xs text-gray-500">
                  {ordersForSelectedDate.length} {ordersForSelectedDate.length === 1 ? 'pedido' : 'pedidos'}
                </span>
              )}
            </div>

            {ordersForSelectedDate.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {ordersForSelectedDate.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => onNavigateToBalance?.(order.clientId)}
                    className="p-2 bg-[#7c9885]/10 rounded-md hover:bg-[#7c9885]/20 cursor-pointer transition-colors"
                  >
                    <p className="text-sm truncate text-[#033f63]">{order.clientName}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {order.description}
                    </p>
                    <p className="text-xs text-[#28666e] mt-1">
                      ${order.total.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500 mb-3">
                  No hay entregas para esta fecha
                </p>
                <button
                  onClick={handleAddOrder}
                  className="text-sm text-[#033f63] hover:text-[#28666e]"
                >
                  + Agregar pedido
                </button>
              </div>
            )}
          </div>
        )}
      </Card>

      <NewOrderDialog
        open={showNewOrderDialog}
        onOpenChange={setShowNewOrderDialog}
        preselectedDate={preselectedDate}
      />
    </>
  );
}