import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Plus, Filter, Loader2, ChevronDown, ChevronUp, Package, TrendingUp, Pencil, Trash2 } from "lucide-react";
import orderService from "../../services/order.service";
import clientService from "../../services/client.service";
import productoService from "../../services/producto.service";
import { IOrderWithCalculations } from "../types";
import { NewOrderDialog } from "./NewOrderDialog";
import { EditOrderDialog } from "./EditOrderDialog";
import { toast } from "sonner";
import { EditOrderDetailDialog } from "./EditOrderDetailDialog";
import {
  getPedidoStatus,
  type PedidoStatus,
} from "../../utils/orderStatus";
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
  const [editDialog, setEditDialog] = useState<{ open: boolean; order: IOrderWithCalculations | null }>({
    open: false,
    order: null,
  });
  const [statusFilter, setStatusFilter] = useState<string>(initialFilter);
  const [orders, setOrders] = useState<IOrderWithCalculations[]>([]);
  const [clientsById, setClientsById] = useState<Map<number, string>>(new Map());
  const [productosById, setProductosById] = useState<Map<number, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());
  const [editDetailDialog, setEditDetailDialog] = useState<{
    open: boolean;
    order: IOrderWithCalculations | null;
    detalle: any | null;
  }>({
    open: false,
    order: null,
    detalle: null,
  });

  // Cargar clientes se manejaba aparte pero es mejor todo en fetchOrders para evitar carga parcial
  // Se mantienen states `clientsById` y `productosById` que se poblarán en `fetchOrders`.

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

      // Cargar pedidos, clientes y productos en paralelo para evitar parpadeos
      const [data, clients, productos] = await Promise.all([
        orderService.getAll(),
        clientService.getAll().catch(() => []),
        productoService.getAll().catch(() => [])
      ]);

      const clientMap = new Map<number, string>();
      (clients || []).forEach((c: any) => {
        if (c?.id != null) clientMap.set(Number(c.id), String(c.nombre ?? '').trim());
      });
      setClientsById(clientMap);

      const productMap = new Map<number, string>();
      (productos || []).forEach((p: any) => {
        if (p?.id != null) productMap.set(Number(p.id), String(p.tipo ?? '').trim());
      });
      setProductosById(productMap);

      const filtered = (data || []).filter((o) => {
        if (statusFilter === 'all') return true;
        const s = getPedidoStatus(o);
        if (statusFilter === 'debt') {
          return Number(o.montoPendiente ?? 0) > 0 && s !== 'PAGADO';
        }
        if (statusFilter === 'delivered') return s === 'ENTREGADO';
        if (statusFilter === 'pending') return Number(o.montoPendiente ?? 0) > 0;
        if (statusFilter === 'paid') return s === 'PAGADO';
        return true;
      });

      setOrders(filtered);
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

  const handleOpenEdit = (order: IOrderWithCalculations, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditDialog({ open: true, order });
  };

  const handleDeleteOrder = async (order: IOrderWithCalculations, e: React.MouseEvent) => {
    e.stopPropagation();

    if (Number(order.montoPagado ?? 0) > 0) {
      toast.error('No se puede eliminar un pedido que tiene pagos registrados');
      return;
    }

    const confirmDelete = window.confirm(`¿Eliminar el pedido #${order.id}? Esta acción lo marcará como eliminado.`);
    if (!confirmDelete) return;

    try {
      await orderService.softDelete(order.id);
      toast.success('Pedido eliminado');
      await fetchOrders();
    } catch (err: any) {
      console.error('Error deleting order:', err);
      toast.error(err?.response?.data?.error || 'No se pudo eliminar el pedido');
    }
  };

  const handleOpenEditDetail = (order: IOrderWithCalculations, detalle: any, e: React.MouseEvent) => {
    e.stopPropagation();

    if (Number(order.montoPagado ?? 0) > 0) {
      toast.error('No se pueden editar detalles de un pedido con pagos registrados');
      return;
    }

    setEditDetailDialog({
      open: true,
      order,
      detalle,
    });
  };

  const handleDeleteDetail = async (order: IOrderWithCalculations, detalle: any, e: React.MouseEvent) => {
    e.stopPropagation();

    if (Number(order.montoPagado ?? 0) > 0) {
      toast.error('No se pueden eliminar detalles de un pedido con pagos registrados');
      return;
    }

    const confirmDelete = window.confirm(
      `¿Eliminar este detalle del pedido #${order.id}? Si es el único detalle, la API lo bloqueará.`
    );
    if (!confirmDelete) return;

    try {
      await orderService.deleteDetalle(order.id, detalle.id);
      toast.success('Detalle eliminado');
      await fetchOrders();
    } catch (err: any) {
      console.error('Error deleting order detail:', err);
      toast.error(err?.response?.data?.error || 'No se pudo eliminar el detalle');
    }
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

  const getDetalleEstadoDescripcion = (detalle: any) => {
    return (
      String(detalle?.estado?.descripcion ?? '').trim() ||
      String(detalle?.estadoDescripcion ?? '').trim() ||
      ''
    );
  };

  const getDetalleProductoNombre = (detalle: any) => {
    const direct = String(detalle?.producto?.tipo ?? '').trim();
    if (direct) return direct;

    const byId = productosById.get(Number(detalle?.id_producto));
    if (byId) return byId;

    return 'Producto';
  };

  const getStatusPillClasses = (status: PedidoStatus) => {
    switch (status) {
      case 'PENDIENTE':
        return 'bg-[#fedc97]/55 text-[#033f63] border border-[#b5b682]/70';
      case 'EN_PROCESO':
        return 'bg-[#033f63]/15 text-[#033f63] border border-[#033f63]/25';
      case 'PAGADO':
        return 'bg-[#28666e]/20 text-[#28666e] border border-[#28666e]/40';
      case 'ENTREGADO':
        return 'bg-[#7c9885]/30 text-[#033f63] border border-[#7c9885]/60';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getStatusLabel = (status: PedidoStatus) => {
    switch (status) {
      case 'PENDIENTE':
        return 'Pendiente';
      case 'EN_PROCESO':
        return 'En proceso';
      case 'PAGADO':
        return 'Pagado';
      case 'ENTREGADO':
        return 'Entregado';
      default:
        return 'Pendiente';
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
            const pedidoStatus = getPedidoStatus(order);
            const resolvedClientName =
              String(order.cliente?.nombre ?? '').trim() ||
              String(clientsById.get(Number(order.id_cliente)) ?? '').trim() ||
              'Cliente desconocido';

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
                      <p className="font-medium truncate">{resolvedClientName}</p>
                      <p className="text-sm text-gray-500">Pedido #{order.id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => handleOpenEdit(order, e)}
                        className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                        aria-label="Editar pedido"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteOrder(order, e)}
                        className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-red-700"
                        aria-label="Eliminar pedido"
                      >
                        <Trash2 size={16} />
                      </button>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusPillClasses(pedidoStatus)}`}>
                        {getStatusLabel(pedidoStatus)}
                      </span>
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
                                  <p className="font-medium">{getDetalleProductoNombre(detalle)}</p>
                                  <p className="text-gray-600">Paciente: {detalle.paciente || '-'}</p>
                                  <p className="text-gray-500 text-xs">
                                    Estado: {getDetalleEstadoDescripcion(detalle) || 'N/A'}
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
                                  <div className="flex justify-end gap-1 mt-1">
                                    <button
                                      type="button"
                                      onClick={(e) => handleOpenEditDetail(order, detalle, e)}
                                      className="p-1 rounded hover:bg-white text-gray-500 hover:text-gray-700"
                                      aria-label="Editar detalle"
                                    >
                                      <Pencil size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => handleDeleteDetail(order, detalle, e)}
                                      className="p-1 rounded hover:bg-white text-gray-500 hover:text-red-700"
                                      aria-label="Eliminar detalle"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
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

      <EditOrderDialog
        open={editDialog.open}
        onOpenChange={(open) => setEditDialog({ open, order: open ? editDialog.order : null })}
        order={editDialog.order}
        onOrderUpdated={() => fetchOrders()}
      />

      <EditOrderDetailDialog
        open={editDetailDialog.open}
        onOpenChange={(open) =>
          setEditDetailDialog({
            open,
            order: open ? editDetailDialog.order : null,
            detalle: open ? editDetailDialog.detalle : null,
          })
        }
        order={editDetailDialog.order}
        detalle={editDetailDialog.detalle}
        onUpdated={() => fetchOrders()}
      />
    </div>
  );
}