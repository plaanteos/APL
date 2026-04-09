import api from './api';
import {
  IOrder,
  IOrderWithCalculations,
  IOrderFormData,
  IDetallePedidoFormData,
  IOrderFilters,
  IOrderStats,
  ID
} from '../app/types';
import { isDemoMode } from './demoMode';
import { demoStore } from './demoStore';
import { getPedidoStatus, isPedidoPendienteLista } from '../utils/orderStatus';

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string;
  pagination?: any;
};

class OrderService {
  /**
   * Obtener todos los pedidos con filtros opcionales
   */
  async getAll(filters?: IOrderFilters): Promise<IOrderWithCalculations[]> {
    if (isDemoMode()) {
      const data = await demoStore.getOrders({
        id_cliente: filters?.clienteId,
      });
      // Aplicar filtros client-side que el demo soporta
      let out = data;
      if (filters?.eliminado != null) {
        out = out.filter((o) => (filters.eliminado ? !!o.fecha_delete : !o.fecha_delete));
      }
      if (filters?.entregado != null) {
        out = out.filter((o) => (filters.entregado ? !!o.fecha_entrega : !o.fecha_entrega));
      }
      if (filters?.conDeuda) {
        out = out.filter((o) => (o.montoPendiente ?? 0) > 0);
      }
      return out;
    }

    const params: Record<string, any> = {
      page: 1,
      limit: 1000,
    };

    if (filters?.clienteId != null) params.id_cliente = filters.clienteId;
    if (filters?.fechaDesde) params.dateFrom = filters.fechaDesde;
    if (filters?.fechaHasta) params.dateTo = filters.fechaHasta;
    if (filters?.eliminado != null) params.activos = !filters.eliminado;

    const response = await api.get<ApiEnvelope<IOrderWithCalculations[]>>('/orders', { params });
    return response.data.data;
  }

  /**
   * Obtener pedido por ID con cálculos
   */
  async getById(id: ID): Promise<IOrderWithCalculations> {
    if (isDemoMode()) {
      const orders = await demoStore.getOrders();
      const found = (orders || []).find((o) => Number(o.id) === Number(id));
      if (!found) {
        throw new Error('Pedido no encontrado (demo)');
      }
      return found;
    }
    const response = await api.get<ApiEnvelope<IOrderWithCalculations>>(`/orders/${id}`);
    return response.data.data;
  }

  /**
   * Crear nuevo pedido con detalles
   */
  async create(data: IOrderFormData): Promise<IOrder> {
    if (isDemoMode()) {
      return demoStore.createOrder(data);
    }
    const response = await api.post<ApiEnvelope<IOrder>>('/orders', data);
    return response.data.data;
  }

  /**
   * Actualizar pedido
   */
  async update(id: ID, data: { fecha_pedido?: string; fecha_entrega?: string; descripcion?: string }): Promise<IOrder> {
    if (isDemoMode()) {
      return demoStore.updateOrder(id, data);
    }
    const response = await api.put<ApiEnvelope<IOrder>>(`/orders/${id}`, data);
    return response.data.data;
  }

  /**
   * Soft delete de pedido
   */
  async softDelete(id: ID): Promise<{ message: string }> {
    if (isDemoMode()) {
      await demoStore.deleteOrder(id);
      return { message: 'Pedido eliminado' };
    }
    const response = await api.delete<ApiEnvelope<{ message?: string }>>(`/orders/${id}`);
    return { message: response.data.message || 'Pedido eliminado' };
  }

  /**
   * Marcar pedido como entregado
   */
  async markAsDelivered(id: ID): Promise<IOrderWithCalculations> {
    if (isDemoMode()) {
      return demoStore.markOrderAsDelivered(id);
    }
    const response = await api.patch<ApiEnvelope<IOrderWithCalculations>>(`/orders/${id}/deliver`);
    return response.data.data;
  }

  /**
   * Agregar detalle a un pedido
   */
  async addDetalle(pedidoId: ID, detalle: IDetallePedidoFormData): Promise<IOrder> {
    const response = await api.post<ApiEnvelope<IOrder>>(`/orders/${pedidoId}/detalles`, detalle);
    return response.data.data;
  }

  /**
   * Actualizar detalle de pedido
   */
  async updateDetalle(
    pedidoId: ID,
    detalleId: ID,
    data: Partial<IDetallePedidoFormData>
  ): Promise<IOrder> {
    if (isDemoMode()) {
      return demoStore.updateOrderDetalle(pedidoId, detalleId, data);
    }
    const response = await api.put<ApiEnvelope<IOrder>>(
      `/orders/${pedidoId}/detalles/${detalleId}`,
      data
    );
    return response.data.data;
  }

  /**
   * Eliminar detalle de pedido
   */
  async deleteDetalle(pedidoId: ID, detalleId: ID): Promise<{ message: string; deletedOrder?: boolean }> {
    if (isDemoMode()) {
      const result = await demoStore.deleteOrderDetalle(pedidoId, detalleId);
      return {
        message: result.deletedOrder
          ? 'Se eliminó el último detalle, por lo tanto el pedido completo fue eliminado permanentemente.'
          : 'Detalle eliminado permanentemente de la base de datos.',
        deletedOrder: result.deletedOrder,
      };
    }
    const response = await api.delete<ApiEnvelope<{ deletedOrder?: boolean }>>(`/orders/${pedidoId}/detalles/${detalleId}`);
    return {
      message: response.data.message || 'Detalle eliminado',
      deletedOrder: response.data.data?.deletedOrder,
    };
  }

  /**
   * Obtener pedidos por cliente
   */
  async getByClient(clienteId: ID): Promise<IOrderWithCalculations[]> {
    const response = await api.get<ApiEnvelope<IOrderWithCalculations[]>>('/orders', {
      params: { page: 1, limit: 1000, id_cliente: clienteId },
    });
    return response.data.data;
  }

  /**
   * Obtener pedidos con saldo pendiente (no totalmente pagados).
   */
  async getPending(): Promise<IOrderWithCalculations[]> {
    const orders = await this.getAll();
    return orders.filter(isPedidoPendienteLista);
  }

  /**
   * Obtener pedidos entregados
   */
  async getDelivered(): Promise<IOrderWithCalculations[]> {
    // La API actual no expone "entregado" como filtro; se debe filtrar por estado (id_estado) si aplica.
    return this.getAll();
  }

  /**
   * Obtener pedidos con deuda
   */
  async getWithDebt(): Promise<IOrderWithCalculations[]> {
    const orders = await this.getAll();
    return orders.filter(
      (o) => (o.montoPendiente || 0) > 0 && getPedidoStatus(o) !== 'PAGADO'
    );
  }

  /**
   * Obtener estadísticas de pedidos
   */
  async getStats(): Promise<IOrderStats> {
    const response = await api.get<ApiEnvelope<IOrderStats>>('/orders/stats');
    return response.data.data;
  }

  /**
   * Obtener pedidos próximos a vencer (recordatorios)
   */
  async getUpcoming(dias: number = 7): Promise<IOrderWithCalculations[]> {
    throw new Error('getUpcoming no está disponible en la API actual');
  }

  /**
   * Obtener pedidos vencidos
   */
  async getOverdue(): Promise<IOrderWithCalculations[]> {
    throw new Error('getOverdue no está disponible en la API actual');
  }
}

export default new OrderService();
