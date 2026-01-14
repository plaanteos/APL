import api from './api';
import {
  IPago,
  IPagoWithDetails,
  IPagoFormData,
  IDetallePagoFormData,
  IPaymentStats,
  ID
} from '../app/types';

class PaymentService {
  /**
   * Obtener todos los pagos
   */
  async getAll(): Promise<IPagoWithDetails[]> {
    const response = await api.get<IPagoWithDetails[]>('/pagos');
    return response.data;
  }

  /**
   * Obtener pago por ID con detalles
   */
  async getById(id: ID): Promise<IPagoWithDetails> {
    const response = await api.get<IPagoWithDetails>(`/pagos/${id}`);
    return response.data;
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

    const response = await api.post<IPago>('/pagos', data);
    return response.data;
  }

  /**
   * Eliminar pago (elimina también sus detalles)
   */
  async delete(id: ID): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/pagos/${id}`);
    return response.data;
  }

  /**
   * Obtener pagos por cliente
   */
  async getByClient(clienteId: ID): Promise<IPagoWithDetails[]> {
    const response = await api.get<IPagoWithDetails[]>('/pagos/cliente', {
      params: { clienteId }
    });
    return response.data;
  }

  /**
   * Obtener pagos por pedido
   */
  async getByOrder(pedidoId: ID): Promise<IPagoWithDetails[]> {
    const response = await api.get<IPagoWithDetails[]>('/pagos/pedido', {
      params: { pedidoId }
    });
    return response.data;
  }

  /**
   * Obtener estadísticas de pagos
   */
  async getStats(): Promise<IPaymentStats> {
    const response = await api.get<IPaymentStats>('/pagos/stats');
    return response.data;
  }

  /**
   * Validar si se puede aplicar un pago a un pedido
   * Retorna el monto máximo que se puede pagar
   */
  async validatePayment(pedidoId: ID, monto: number): Promise<{ valid: boolean; montoPendiente: number }> {
    const response = await api.post<{ valid: boolean; montoPendiente: number }>(
      '/pagos/validar',
      { pedidoId, monto }
    );
    return response.data;
  }
}

export default new PaymentService();
