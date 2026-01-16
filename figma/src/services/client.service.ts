import api from './api';
import { IClient, IClientFormData, IClientStats, IClientBalance } from '../app/types';

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string;
  pagination?: any;
};

class ClientService {
  /**
   * Obtener todos los clientes
   */
  async getAll(): Promise<IClient[]> {
    const response = await api.get<ApiEnvelope<IClient[]>>('/clients', {
      params: { page: 1, limit: 1000 },
    });
    return response.data.data;
  }

  /**
   * Obtener cliente por ID
   */
  async getById(id: number): Promise<IClient> {
    const response = await api.get<ApiEnvelope<IClient>>(`/clients/${id}`);
    return response.data.data;
  }

  /**
   * Crear nuevo cliente
   */
  async create(data: IClientFormData): Promise<IClient> {
    const response = await api.post<ApiEnvelope<IClient>>('/clients', data);
    return response.data.data;
  }

  /**
   * Actualizar cliente
   */
  async update(id: number, data: Partial<IClientFormData>): Promise<IClient> {
    const response = await api.put<ApiEnvelope<IClient>>(`/clients/${id}`, data);
    return response.data.data;
  }

  /**
   * Eliminar cliente
   */
  async delete(id: number): Promise<{ message: string }> {
    const response = await api.delete<ApiEnvelope<{ message?: string }>>(`/clients/${id}`);
    return { message: response.data.message || 'Cliente eliminado' };
  }

  /**
   * Obtener estadísticas del cliente
   */
  async getStats(): Promise<IClientStats> {
    const response = await api.get<ApiEnvelope<IClientStats>>('/clients/stats');
    return response.data.data;
  }

  /**
   * Obtener balance del cliente (pedidos con detalles de pagos)
   */
  async getBalance(id: number): Promise<IClientBalance> {
    const response = await api.get<ApiEnvelope<IClientBalance>>(`/clients/${id}/balance`);
    return response.data.data;
  }

  /**
   * Buscar clientes
   */
  async search(query: string): Promise<IClient[]> {
    const response = await api.get<ApiEnvelope<IClient[]>>('/clients', {
      params: { page: 1, limit: 1000, search: query },
    });
    return response.data.data;
  }
}

export default new ClientService();
