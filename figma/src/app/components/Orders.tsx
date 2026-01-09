import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Plus, Filter } from "lucide-react";
import { NewOrderDialog } from "./NewOrderDialog";
import { orderService, Order } from "../../services/order.service";
import { toast } from "sonner";
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
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewOrderDialog, setShowNewOrderDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>(initialFilter);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const fetchedOrders = await orderService.getAllOrders();
      setOrders(fetchedOrders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Error al cargar pedidos");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Update filter when initialFilter changes
  useEffect(() => {
    if (initialFilter) {
      setStatusFilter(initialFilter);
    }
  }, [initialFilter]);

  const filteredOrders =
    statusFilter === "all"
      ? orders
      : statusFilter === "pending"
      ? orders.filter((order) => order.estado === "PENDIENTE")
      : statusFilter === "paid"
      ? orders.filter((order) => order.estado === "PAGADO")
      : statusFilter === "delivered"
      ? orders.filter((order) => order.estado === "ENTREGADO")
      : orders;

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case "PENDIENTE":
        return "bg-[#fedc97]/70 text-[#b5b682]";
      case "PAGADO":
        return "bg-[#7c9885]/30 text-[#28666e]";
      case "ENTREGADO":
        return "bg-[#7c9885]/50 text-[#033f63]";
      case "COMPLETADO":
        return "bg-blue-100 text-blue-800";
      case "EN_PROCESO":
        return "bg-yellow-100 text-yellow-800";
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
      case "COMPLETADO":
        return "Completado";
      case "EN_PROCESO":
        return "En Proceso";
      default:
        return estado;
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
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#033f63]"></div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No hay pedidos {statusFilter !== "all" ? "con este estado" : ""}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <Card
              key={order.id}
              className="p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onNavigateToBalance(order.clienteId)}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{order.cliente?.nombre || 'Cliente desconocido'}</p>
                    <p className="text-sm text-gray-500">Pedido #{order.id}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${getStatusColor(
                      order.estado
                    )}`}
                  >
                    {getStatusText(order.estado)}
                  </span>
                </div>

                <div>
                  <p className="text-sm">{order.descripcion}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Tipo: {order.tipo} • Cantidad: {order.cantidad}
                  </p>
                </div>

                <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-100">
                  <div>
                    <p className="text-gray-500 text-xs">Fecha de Pedido</p>
                    <p>{new Date(order.fecha).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500 text-xs">Entrega</p>
                    <p>{order.fechaEntrega ? new Date(order.fechaEntrega).toLocaleDateString() : 'N/A'}</p>
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
      )}

      <NewOrderDialog
        open={showNewOrderDialog}
        onOpenChange={setShowNewOrderDialog}
        onOrderCreated={fetchOrders}
      />
    </div>
  );
}