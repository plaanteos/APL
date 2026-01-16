import api from './api';
import {
  IPago,
  IPagoWithDetails,
  IPagoFormData,
  IDetallePagoFormData,
  IPaymentStats,
  ID
} from '../app/types';

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string;
  pagination?: any;
};

class PaymentService {
  /**
   * Obtener todos los pagos
   */
  async getAll(): Promise<IPagoWithDetails[]> {
    const response = await api.get<ApiEnvelope<IPagoWithDetails[]>>('/payments', {
      params: { page: 1, limit: 1000 },
    });
    return response.data.data;
  }

  /**
   * Obtener pago por ID con detalles
   */
  async getById(id: ID): Promise<IPagoWithDetails> {
    const response = await api.get<ApiEnvelope<IPagoWithDetails>>(`/payments/${id}`);
    return response.data.data;
  }

  /**
   * Crear nuevo pago con detalles (N:M con pedidos)
   * El valor total del pago debe ser igual a la suma de los detalles
   */
  async create(data: IPagoFormData): Promise<IPago> {
    // Validación client-side: suma de detalles debe igualar valor total
    const sumaDetalles = data.detalles.reduce((sum, d) => sum + d.valor, 0);
    if (Math.abs(sumaDetalles - data.valor) > 0.01) {
      throw new Error(
        `La suma de los detalles (${sumaDetalles}) debe ser igual al valor del pago (${data.valor})`
      );
    }

    const response = await api.post<ApiEnvelope<IPago>>('/payments', data);
    return response.data.data;
  }

  /**
   * Eliminar pago (elimina también sus detalles)
   */
  async delete(id: ID): Promise<{ message: string }> {
    const response = await api.delete<ApiEnvelope<{ message?: string }>>(`/payments/${id}`);
    return { message: response.data.message || 'Pago eliminado' };
  }

  /**
   * Obtener pagos por cliente
   */
  async getByClient(clienteId: ID): Promise<IPagoWithDetails[]> {
    throw new Error('getByClient no está disponible en la API actual');
  }

  /**
   * Obtener pagos por pedido
   */
  async getByOrder(pedidoId: ID): Promise<IPagoWithDetails[]> {
    throw new Error('getByOrder no está disponible en la API actual');
  }

  /**
   * Obtener estadísticas de pagos
   */
  async getStats(): Promise<IPaymentStats> {
    const response = await api.get<ApiEnvelope<IPaymentStats>>('/payments/stats');
    return response.data.data;
  }

  /**
   * Validar si se puede aplicar un pago a un pedido
   * Retorna el monto máximo que se puede pagar
   */
  async validatePayment(pedidoId: ID, monto: number): Promise<{ valid: boolean; montoPendiente: number }> {
    throw new Error('validatePayment no está disponible en la API actual');
  }
}

export default new PaymentService();
