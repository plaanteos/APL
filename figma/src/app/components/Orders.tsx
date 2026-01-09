import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Plus, Filter } from "lucide-react";
import { mockOrders } from "../data/mockData";
import { OrderStatus } from "../types";
import { NewOrderDialog } from "./NewOrderDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface OrdersProps {
  onNavigateToBalance: (clientId: string) => void;
  initialFilter?: string;
}

export function Orders({ onNavigateToBalance, initialFilter = "all" }: OrdersProps) {
  const [showNewOrderDialog, setShowNewOrderDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>(initialFilter);
  const [refreshKey, setRefreshKey] = useState(0);

  // Update filter when initialFilter changes
  useEffect(() => {
    if (initialFilter) {
      setStatusFilter(initialFilter);
    }
  }, [initialFilter]);

  const handleOrderCreated = () => {
    setRefreshKey(prev => prev + 1);
  };

  const filteredOrders =
    statusFilter === "all"
      ? mockOrders
      : mockOrders.filter((order) => order.status === statusFilter);

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

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2>Pedidos</h2>
        <Button
          onClick={() => setShowNewOrderDialog(true)}
          className="bg-blue-600 hover:bg-blue-700"
          size="sm"
        >
          <Plus size={16} className="mr-1" />
          Nuevo
        </Button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter size={16} className="text-gray-500" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
            <SelectItem value="paid">Pagados</SelectItem>
            <SelectItem value="delivered">Entregados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {filteredOrders.map((order) => (
          <Card
            key={order.id}
            className="p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onNavigateToBalance(order.clientId)}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="truncate">{order.clientName}</p>
                  <p className="text-sm text-gray-500">Pedido #{order.id}</p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${getStatusColor(
                    order.status
                  )}`}
                >
                  {getStatusText(order.status)}
                </span>
              </div>

              <div>
                <p className="text-sm">{order.description}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Tipo: {order.type} • Cantidad: {order.quantity}
                </p>
              </div>

              <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-100">
                <div>
                  <p className="text-gray-500 text-xs">Fecha de Pedido</p>
                  <p>{order.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-500 text-xs">Entrega</p>
                  <p>{order.dueDate}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <p className="text-gray-500 text-sm">Total</p>
                <p className="text-lg">${order.total.toLocaleString()}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <NewOrderDialog
        open={showNewOrderDialog}
        onOpenChange={setShowNewOrderDialog}
        onOrderCreated={handleOrderCreated}
      />
    </div>
  );
}