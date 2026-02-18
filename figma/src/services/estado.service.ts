import api from './api';
import { IEstado, IEstadoFormData, ID } from '../app/types';
import { isDemoMode } from './demoMode';
import { demoStore } from './demoStore';

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string;
  pagination?: any;
};

class EstadoService {
  private normalizeEstadoDescripcion(raw: unknown) {
    return String(raw ?? '')
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[\s-]+/g, '_');
  }

  private filterEstados(estados: IEstado[]) {
    return (estados || []).filter((e) => this.normalizeEstadoDescripcion((e as any)?.descripcion) !== 'CANCELADO');
  }

  /**
   * Obtener catálogo de estados activos
   */
  async getAll(): Promise<IEstado[]> {
    if (isDemoMode()) {
      return this.filterEstados(demoStore.getEstados());
    }
    const response = await api.get<ApiEnvelope<IEstado[]>>('/estados');
    return this.filterEstados(response.data.data);
  }

  /**
   * Obtener estado por ID
   */
  async getById(id: ID): Promise<IEstado> {
    const response = await api.get<ApiEnvelope<IEstado>>(`/estados/${id}`);
    return response.data.data;
  }

  /**
   * Crear nuevo estado
   */
  async create(data: IEstadoFormData): Promise<IEstado> {
    const response = await api.post<ApiEnvelope<IEstado>>('/estados', data);
    return response.data.data;
  }

  /**
   * Actualizar estado
   */
  async update(id: ID, data: Partial<IEstadoFormData>): Promise<IEstado> {
    const response = await api.put<ApiEnvelope<IEstado>>(`/estados/${id}`, data);
    return response.data.data;
  }

  /**
   * Soft delete de estado
   */
  async softDelete(id: ID): Promise<{ message: string }> {
    const response = await api.delete<ApiEnvelope<{ message?: string }>>(`/estados/${id}`);
    return { message: response.data.message || 'Estado eliminado' };
  }

  /**
   * Restaurar estado eliminado
   */
  // Nota: la API backend no expone restore/stats en las rutas actuales.
}

export default new EstadoService();
