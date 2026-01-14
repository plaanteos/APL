import api from './api';
import { IEstado, IEstadoFormData } from '../app/types';

class EstadoService {
  /**
   * Obtener todos los estados (incluyendo eliminados si se especifica)
   */
  async getAll(includeDeleted: boolean = false): Promise<IEstado[]> {
    const response = await api.get<IEstado[]>('/estados', {
      params: { includeDeleted }
    });
    return response.data;
  }

  /**
   * Obtener estado por ID
   */
  async getById(id: number): Promise<IEstado> {
    const response = await api.get<IEstado>(`/estados/${id}`);
    return response.data;
  }

  /**
   * Crear nuevo estado
   */
  async create(data: IEstadoFormData): Promise<IEstado> {
    const response = await api.post<IEstado>('/estados', data);
    return response.data;
  }

  /**
   * Actualizar estado
   */
  async update(id: number, data: Partial<IEstadoFormData>): Promise<IEstado> {
    const response = await api.put<IEstado>(`/estados/${id}`, data);
    return response.data;
  }

  /**
   * Soft delete de estado
   */
  async softDelete(id: number): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/estados/${id}`);
    return response.data;
  }

  /**
   * Restaurar estado eliminado
   */
  async restore(id: number): Promise<IEstado> {
    const response = await api.post<IEstado>(`/estados/${id}/restore`);
    return response.data;
  }

  /**
   * Obtener estadísticas de estados
   */
  async getStats(): Promise<{ total: number; activos: number; eliminados: number }> {
    const response = await api.get('/estados/stats');
    return response.data;
  }
}

export default new EstadoService();
