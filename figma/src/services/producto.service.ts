import api from './api';
import { IProducto, IProductoFormData, IProductoStats } from '../app/types';

class ProductoService {
  /**
   * Obtener todos los productos
   */
  async getAll(): Promise<IProducto[]> {
    const response = await api.get<IProducto[]>('/productos');
    return response.data;
  }

  /**
   * Obtener producto por ID
   */
  async getById(id: number): Promise<IProducto> {
    const response = await api.get<IProducto>(`/productos/${id}`);
    return response.data;
  }

  /**
   * Crear nuevo producto
   */
  async create(data: IProductoFormData): Promise<IProducto> {
    const response = await api.post<IProducto>('/productos', data);
    return response.data;
  }

  /**
   * Actualizar producto
   */
  async update(id: number, data: Partial<IProductoFormData>): Promise<IProducto> {
    const response = await api.put<IProducto>(`/productos/${id}`, data);
    return response.data;
  }

  /**
   * Eliminar producto
   */
  async delete(id: number): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/productos/${id}`);
    return response.data;
  }

  /**
   * Obtener estadísticas de productos
   */
  async getStats(): Promise<IProductoStats> {
    const response = await api.get<IProductoStats>('/productos/stats');
    return response.data;
  }
}

export default new ProductoService();
