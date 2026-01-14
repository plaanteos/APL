import api from './api';
import { IClient, IClientFormData, IClientStats, IClientBalance } from '../app/types';

class ClientService {
  /**
   * Obtener todos los clientes
   */
  async getAll(): Promise<IClient[]> {
    const response = await api.get<IClient[]>('/clientes');
    return response.data;
  }

  /**
   * Obtener cliente por ID
   */
  async getById(id: number): Promise<IClient> {
    const response = await api.get<IClient>(`/clientes/${id}`);
    return response.data;
  }

  /**
   * Crear nuevo cliente
   */
  async create(data: IClientFormData): Promise<IClient> {
    const response = await api.post<IClient>('/clientes', data);
    return response.data;
  }

  /**
   * Actualizar cliente
   */
  async update(id: number, data: Partial<IClientFormData>): Promise<IClient> {
    const response = await api.put<IClient>(`/clientes/${id}`, data);
    return response.data;
  }

  /**
   * Eliminar cliente
   */
  async delete(id: number): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/clientes/${id}`);
    return response.data;
  }

  /**
   * Obtener estadísticas del cliente
   */
  async getStats(id: number): Promise<IClientStats> {
    const response = await api.get<IClientStats>(`/clientes/${id}/stats`);
    return response.data;
  }

  /**
   * Obtener balance del cliente (pedidos con detalles de pagos)
   */
  async getBalance(id: number): Promise<IClientBalance> {
    const response = await api.get<IClientBalance>(`/clientes/${id}/balance`);
    return response.data;
  }

  /**
   * Buscar clientes
   */
  async search(query: string): Promise<IClient[]> {
    const response = await api.get<IClient[]>('/clientes/search', {
      params: { q: query }
    });
    return response.data;
  }
}

export default new ClientService();
