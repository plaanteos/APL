import api from './api';
import { IProducto, IProductoFormData, IProductoStats, ID } from '../app/types';

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string;
  pagination?: any;
};

class ProductoService {
  /**
   * Obtener todos los productos
   */
  async getAll(params?: { page?: number; limit?: number; search?: string; id_administrador?: ID }): Promise<IProducto[]> {
    const response = await api.get<ApiEnvelope<IProducto[]>>('/productos', {
      params: { page: 1, limit: 1000, ...(params || {}) },
    });
    return response.data.data;
  }

  /**
   * Obtener producto por ID
   */
  async getById(id: ID): Promise<IProducto> {
    const response = await api.get<ApiEnvelope<IProducto>>(`/productos/${id}`);
    return response.data.data;
  }

  /**
   * Crear nuevo producto
   */
  async create(data: IProductoFormData & { id_administrador: ID }): Promise<IProducto> {
    const response = await api.post<ApiEnvelope<IProducto>>('/productos', data);
    return response.data.data;
  }

  /**
   * Actualizar producto
   */
  async update(id: ID, data: Partial<IProductoFormData> & { id_administrador?: ID }): Promise<IProducto> {
    const response = await api.put<ApiEnvelope<IProducto>>(`/productos/${id}`, data);
    return response.data.data;
  }

  /**
   * Eliminar producto
   */
  async delete(id: ID): Promise<{ message: string }> {
    const response = await api.delete<ApiEnvelope<{ message?: string }>>(`/productos/${id}`);
    return { message: response.data.message || 'Producto eliminado' };
  }

  /**
   * Obtener estadísticas de productos
   */
  async getStats(): Promise<IProductoStats> {
    const response = await api.get<ApiEnvelope<IProductoStats>>('/productos/stats');
    return response.data.data;
  }
}

export default new ProductoService();
