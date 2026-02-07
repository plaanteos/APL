import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Plus, Filter, Loader2, ChevronDown, ChevronUp, Package, TrendingUp } from "lucide-react";
import orderService from "../../services/order.service";
import { IOrderWithCalculations } from "../types";
import { NewOrderDialog } from "./NewOrderDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface OrdersProps {
  onNavigateToBalance: (clientId: number) => void;
  initialFilter?: string;
}

export function Orders({ onNavigateToBalance, initialFilter = "all" }: OrdersProps) {
  const [showNewOrderDialog, setShowNewOrderDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>(initialFilter);
  const [orders, setOrders] = useState<IOrderWithCalculations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());

  // Update filter when initialFilter changes
  useEffect(() => {
    if (initialFilter) {
      setStatusFilter(initialFilter);
    }
  }, [initialFilter]);

  // Fetch orders
  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const filters: any = {};

      // Mapear filtros del frontend al backend
      switch (statusFilter) {
        case "pending":
          filters.entregado = false;
          break;
        case "delivered":
          filters.entregado = true;
          break;
        case "debt":
          filters.conDeuda = true;
          break;
      }

      const data = await orderService.getAll(filters);
      setOrders(data);
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      setError(err.response?.data?.error || 'Error al cargar pedidos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrderCreated = () => {
    fetchOrders();
  };

  const toggleOrderExpanded = (orderId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
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
            <SelectItem value="delivered">Entregados</SelectItem>
            <SelectItem value="debt">Con deuda</SelectItem>
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
          orders.map((order) => {
            const isExpanded = expandedOrders.has(order.id);
            const hasDetalles = order.detalles && order.detalles.length > 0;

            return (
              <Card
                key={order.id}
                className="p-4 hover:shadow-md transition-shadow"
              >
                <div className="space-y-3">
                  <div
                    className="flex items-start justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{order.cliente?.nombre || 'Cliente desconocido'}</p>
                      <p className="text-sm text-gray-500">Pedido #{order.id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {order.fecha_entrega ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-[#7c9885]/15 text-[#28666e] border border-[#7c9885]/40">
                          Entregado
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full bg-[#fedc97]/60 text-[#033f63] border border-[#b5b682]/50">
                          Pendiente
                        </span>
                      )}
                      {order.montoPendiente > 0 && (
                        <span className="text-xs px-2 py-1 rounded-full bg-[#f7c6c7]/60 text-[#7a1f23] border border-[#f7c6c7]/70">
                          Con deuda
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-100">
                    <div>
                      <p className="text-gray-500 text-xs">Fecha de Pedido</p>
                      <p>{new Date(order.fecha_pedido).toLocaleDateString('es-ES')}</p>
                    </div>
                    {order.fecha_entrega && (
                      <div className="text-right">
                        <p className="text-gray-500 text-xs">Fecha de Entrega</p>
                        <p>{new Date(order.fecha_entrega).toLocaleDateString('es-ES')}</p>
                      </div>
                    )}
                  </div>

                  {/* Detalles del pedido */}
                  {hasDetalles && (
                    <div className="pt-2 border-t border-gray-100">
                      <button
                        onClick={(e) => toggleOrderExpanded(order.id, e)}
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 w-full"
                      >
                        <Package size={14} />
                        <span>{order.detalles!.length} {order.detalles!.length === 1 ? 'detalle' : 'detalles'}</span>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>

                      {isExpanded && (
                        <div className="mt-3 space-y-2 pl-6">
                          {order.detalles!.map((detalle) => (
                            <div key={detalle.id} className="text-sm bg-gray-50 p-2 rounded">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="font-medium">{detalle.producto?.tipo || 'Producto'}</p>
                                  <p className="text-gray-600">Paciente: {detalle.paciente}</p>
                                  <p className="text-gray-500 text-xs">
                                    Estado: {detalle.estado?.descripcion || 'N/A'}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-gray-500">Cantidad: {detalle.cantidad}</p>
                                  <p className="font-medium">
                                    ${(
                                      Number(detalle.cantidad ?? 0) *
                                      Number(detalle.precio_unitario ?? 0)
                                    ).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* Botón para ver balance del cliente */}
                          <div className="pt-2 mt-2 border-t border-gray-200">
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                onNavigateToBalance(order.id_cliente);
                              }}
                              variant="outline"
                              size="sm"
                              className="w-full text-[#033f63] border-[#033f63] hover:bg-[#033f63] hover:text-white"
                            >
                              <TrendingUp size={16} className="mr-2" />
                              Ver Balance del Cliente
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Totales */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="flex-1">
                      <p className="text-gray-500 text-sm">Total</p>
                      <p className="text-lg font-semibold">${Number(order.montoTotal ?? 0).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-500 text-xs">Pagado</p>
                      <p className="text-sm text-[#28666e]">${Number(order.montoPagado ?? 0).toLocaleString()}</p>
                    </div>
                    {order.montoPendiente > 0 && (
                      <div className="text-right ml-4">
                        <p className="text-gray-500 text-xs">Pendiente</p>
                        <p className="text-sm text-[#b05b5d]">${Number(order.montoPendiente ?? 0).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      <NewOrderDialog
        open={showNewOrderDialog}
        onOpenChange={setShowNewOrderDialog}
        onOrderCreated={handleOrderCreated}
      />
    </div>
  );
}