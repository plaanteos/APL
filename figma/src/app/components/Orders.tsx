import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Plus, Filter, Loader2 } from "lucide-react";
import { orderService, Order } from "../../services/order.service";
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
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
  });

  // Update filter when initialFilter changes
  useEffect(() => {
    if (initialFilter) {
      setStatusFilter(initialFilter);
    }
  }, [initialFilter]);

  // Fetch orders
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const filters: any = { page, limit: 20 };
        
        // Mapear filtros del frontend al backend
        if (statusFilter !== "all") {
          const statusMap: Record<string, string> = {
            pending: "PENDIENTE",
            paid: "PAGADO",
            delivered: "ENTREGADO",
          };
          filters.estado = statusMap[statusFilter] || statusFilter;
        }
        
        const response = await orderService.getAllOrders(filters);
        
        // Manejar respuesta con o sin paginación
        if (Array.isArray(response)) {
          setOrders(response);
        } else {
          setOrders(response.items);
          setPagination(response.pagination);
        }
      } catch (err: any) {
        console.error('Error fetching orders:', err);
        setError(err.response?.data?.error || 'Error al cargar pedidos');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [statusFilter, page]);

  const handleOrderCreated = () => {
    // Refrescar datos después de crear pedido
    setPage(1);
    const fetchOrders = async () => {
      try {
        const filters: any = { page: 1, limit: 20 };
        if (statusFilter !== "all") {
          const statusMap: Record<string, string> = {
            pending: "PENDIENTE",
            paid: "PAGADO",
            delivered: "ENTREGADO",
          };
          filters.estado = statusMap[statusFilter] || statusFilter;
        }
        const response = await orderService.getAllOrders(filters);
        if (Array.isArray(response)) {
          setOrders(response);
        } else {
          setOrders(response.items);
          setPagination(response.pagination);
        }
      } catch (err) {
        console.error('Error refreshing orders:', err);
      }
    };
    fetchOrders();
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
      case "CANCELADO":
        return "Cancelado";
      default:
        return estado;
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center h-96">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      </div>
    );
  }

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
        {orders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay pedidos {statusFilter !== "all" ? "con este estado" : "registrados"}
          </div>
        ) : (
          orders.map((order) => (
            <Card
              key={order.id}
              className="p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onNavigateToBalance(order.clienteId)}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{order.cliente?.nombre || 'Cliente desconocido'}</p>
                    <p className="text-sm text-gray-500">Pedido #{order.numeroPedido || order.id.slice(0, 8)}</p>
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
                  <p className="text-sm font-medium">{order.nombrePaciente}</p>
                  <p className="text-sm text-gray-600">{order.descripcion}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Tipo: {order.tipoPedido} • Cantidad: {order.cantidad}
                  </p>
                </div>

                <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-100">
                  <div>
                    <p className="text-gray-500 text-xs">Fecha de Pedido</p>
                    <p>{new Date(order.fechaPedido).toLocaleDateString('es-ES')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500 text-xs">Entrega</p>
                    <p>{new Date(order.fechaVencimiento).toLocaleDateString('es-ES')}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div className="flex-1">
                    <p className="text-gray-500 text-sm">Total</p>
                    <p className="text-lg font-semibold">${order.montoTotal.toLocaleString()}</p>
                  </div>
                  {order.montoPagado > 0 && (
                    <div className="text-right">
                      <p className="text-gray-500 text-xs">Pagado</p>
                      <p className="text-sm text-green-600">${order.montoPagado.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Anterior
          </Button>
          <span className="text-sm text-gray-600">
            Página {page} de {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
            disabled={page === pagination.totalPages}
          >
            Siguiente
          </Button>
        </div>
      )}

      <NewOrderDialog
        open={showNewOrderDialog}
        onOpenChange={setShowNewOrderDialog}
        onOrderCreated={handleOrderCreated}
      />
    </div>
  );
}