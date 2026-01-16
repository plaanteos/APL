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
    const response = await api.get<ApiEnvelope<IOrderWithCalculations>>(`/orders/${id}`);
    return response.data.data;
  }

  /**
   * Crear nuevo pedido con detalles
   */
  async create(data: IOrderFormData): Promise<IOrder> {
    const response = await api.post<ApiEnvelope<IOrder>>('/orders', data);
    return response.data.data;
  }

  /**
   * Actualizar pedido (solo fechas)
   */
  async update(id: ID, data: { fecha_pedido?: string; fecha_entrega?: string }): Promise<IOrder> {
    const response = await api.put<ApiEnvelope<IOrder>>(`/orders/${id}`, data);
    return response.data.data;
  }

  /**
   * Soft delete de pedido
   */
  async softDelete(id: ID): Promise<{ message: string }> {
    const response = await api.delete<ApiEnvelope<{ message?: string }>>(`/orders/${id}`);
    return { message: response.data.message || 'Pedido eliminado' };
  }

  /**
   * Marcar pedido como entregado
   */
  async markAsDelivered(id: ID): Promise<IOrder> {
    throw new Error('markAsDelivered no está disponible en la API actual');
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
    const response = await api.put<ApiEnvelope<IOrder>>(
      `/orders/${pedidoId}/detalles/${detalleId}`,
      data
    );
    return response.data.data;
  }

  /**
   * Eliminar detalle de pedido
   */
  async deleteDetalle(pedidoId: ID, detalleId: ID): Promise<IOrder> {
    const response = await api.delete<ApiEnvelope<IOrder>>(`/orders/${pedidoId}/detalles/${detalleId}`);
    return response.data.data;
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
   * Obtener pedidos pendientes (no entregados)
   */
  async getPending(): Promise<IOrderWithCalculations[]> {
    // La API actual no expone "entregado" como filtro; se debe filtrar por estado (id_estado) si aplica.
    return this.getAll();
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
    // La API actual no expone "conDeuda" como filtro; se puede filtrar client-side con montoPendiente.
    const orders = await this.getAll();
    return orders.filter(o => (o.montoPendiente || 0) > 0);
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
