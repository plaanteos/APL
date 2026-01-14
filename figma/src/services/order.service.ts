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

class OrderService {
  /**
   * Obtener todos los pedidos con filtros opcionales
   */
  async getAll(filters?: IOrderFilters): Promise<IOrderWithCalculations[]> {
    const response = await api.get<IOrderWithCalculations[]>('/pedidos', {
      params: filters
    });
    return response.data;
  }

  /**
   * Obtener pedido por ID con cálculos
   */
  async getById(id: ID): Promise<IOrderWithCalculations> {
    const response = await api.get<IOrderWithCalculations>(`/pedidos/${id}`);
    return response.data;
  }

  /**
   * Crear nuevo pedido con detalles
   */
  async create(data: IOrderFormData): Promise<IOrder> {
    const response = await api.post<IOrder>('/pedidos', data);
    return response.data;
  }

  /**
   * Actualizar pedido (solo fechas)
   */
  async update(id: ID, data: { fecha_pedido?: string; fecha_entrega?: string }): Promise<IOrder> {
    const response = await api.put<IOrder>(`/pedidos/${id}`, data);
    return response.data;
  }

  /**
   * Soft delete de pedido
   */
  async softDelete(id: ID): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/pedidos/${id}`);
    return response.data;
  }

  /**
   * Marcar pedido como entregado
   */
  async markAsDelivered(id: ID): Promise<IOrder> {
    const response = await api.put<IOrder>(`/pedidos/${id}/entregar`);
    return response.data;
  }

  /**
   * Agregar detalle a un pedido
   */
  async addDetalle(pedidoId: ID, detalle: IDetallePedidoFormData): Promise<IOrder> {
    const response = await api.post<IOrder>(`/pedidos/${pedidoId}/detalles`, detalle);
    return response.data;
  }

  /**
   * Actualizar detalle de pedido
   */
  async updateDetalle(
    pedidoId: ID,
    detalleId: ID,
    data: Partial<IDetallePedidoFormData>
  ): Promise<IOrder> {
    const response = await api.put<IOrder>(
      `/pedidos/${pedidoId}/detalles/${detalleId}`,
      data
    );
    return response.data;
  }

  /**
   * Eliminar detalle de pedido
   */
  async deleteDetalle(pedidoId: ID, detalleId: ID): Promise<IOrder> {
    const response = await api.delete<IOrder>(`/pedidos/${pedidoId}/detalles/${detalleId}`);
    return response.data;
  }

  /**
   * Obtener pedidos por cliente
   */
  async getByClient(clienteId: ID): Promise<IOrderWithCalculations[]> {
    const response = await api.get<IOrderWithCalculations[]>('/pedidos', {
      params: { clienteId }
    });
    return response.data;
  }

  /**
   * Obtener pedidos pendientes (no entregados)
   */
  async getPending(): Promise<IOrderWithCalculations[]> {
    const response = await api.get<IOrderWithCalculations[]>('/pedidos', {
      params: { entregado: false }
    });
    return response.data;
  }

  /**
   * Obtener pedidos entregados
   */
  async getDelivered(): Promise<IOrderWithCalculations[]> {
    const response = await api.get<IOrderWithCalculations[]>('/pedidos', {
      params: { entregado: true }
    });
    return response.data;
  }

  /**
   * Obtener pedidos con deuda
   */
  async getWithDebt(): Promise<IOrderWithCalculations[]> {
    const response = await api.get<IOrderWithCalculations[]>('/pedidos', {
      params: { conDeuda: true }
    });
    return response.data;
  }

  /**
   * Obtener estadísticas de pedidos
   */
  async getStats(): Promise<IOrderStats> {
    const response = await api.get<IOrderStats>('/pedidos/stats');
    return response.data;
  }

  /**
   * Obtener pedidos próximos a vencer (recordatorios)
   */
  async getUpcoming(dias: number = 7): Promise<IOrderWithCalculations[]> {
    const response = await api.get<IOrderWithCalculations[]>('/pedidos/proximos', {
      params: { dias }
    });
    return response.data;
  }

  /**
   * Obtener pedidos vencidos
   */
  async getOverdue(): Promise<IOrderWithCalculations[]> {
    const response = await api.get<IOrderWithCalculations[]>('/pedidos/vencidos');
    return response.data;
  }
}

export default new OrderService();
