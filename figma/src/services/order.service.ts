import apiClient from './api';

export interface Order {
  id: string;
  clienteId: string;
  nombrePaciente: string;
  fechaPedido: string;
  fechaVencimiento: string;
  descripcion: string;
  tipoPedido: string;
  cantidad: number;
  precioUnitario: number;
  montoTotal: number;
  montoPagado: number;
  montoPendiente: number;
  estado: 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO' | 'ENTREGADO' | 'PAGADO' | 'CANCELADO';
  prioridad?: 'BAJA' | 'NORMAL' | 'ALTA' | 'URGENTE';
  observaciones?: string;
  numeroPedido?: string;
  createdAt?: string;
  updatedAt?: string;
  cliente?: {
    id: string;
    nombre: string;
    email?: string;
    tipo?: string;
  };
  detallesPedido?: any[];
  pagos?: any[];
  totalPagado?: number;
}

export interface CreateOrderData {
  clienteId: number;
  paciente: string;
  descripcion: string;
  tipoPedido: string;
  cantidad: number;
  precioUnitario: number;
  estado?: 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO' | 'ENTREGADO' | 'PAGADO' | 'CANCELADO';
  fechaVencimiento?: string;
  observaciones?: string;
}

export interface UpdateOrderData extends Partial<CreateOrderData> {
  estado?: 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO' | 'ENTREGADO' | 'PAGADO';
  montoPagado?: number;
}

export interface OrderFilters {
  clienteId?: string;
  estado?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}

export const orderService = {
  // Get all orders
  getAllOrders: async (filters?: OrderFilters): Promise<Order[]> => {
    const response = await apiClient.get('/orders', {
      params: filters,
    });
    return response.data.data;
  },

  // Get order by ID
  getOrderById: async (id: string): Promise<Order> => {
    const response = await apiClient.get(`/orders/${id}`);
    return response.data.data;
  },

  // Create order
  createOrder: async (orderData: CreateOrderData): Promise<Order> => {
    const response = await apiClient.post('/orders', orderData);
    return response.data.data;
  },

  // Update order
  updateOrder: async (id: string, orderData: UpdateOrderData): Promise<Order> => {
    const response = await apiClient.put(`/orders/${id}`, orderData);
    return response.data.data;
  },

  // Delete order
  deleteOrder: async (id: string): Promise<void> => {
    await apiClient.delete(`/orders/${id}`);
  },

  // Update order status
  updateOrderStatus: async (
    id: string,
    estado: 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO' | 'ENTREGADO' | 'PAGADO'
  ): Promise<Order> => {
    const response = await apiClient.patch(`/orders/${id}/status`, { estado });
    return response.data.data;
  },

  // Get orders by client
  getOrdersByClient: async (clienteId: string): Promise<Order[]> => {
    const response = await apiClient.get('/orders', {
      params: { clienteId },
    });
    return response.data.data;
  },

  // Get pending orders
  getPendingOrders: async (): Promise<Order[]> => {
    const response = await apiClient.get('/orders', {
      params: { estado: 'PENDIENTE' },
    });
    return response.data.data;
  },

  // Get in-process orders
  getInProcessOrders: async (): Promise<Order[]> => {
    const response = await apiClient.get('/orders', {
      params: { estado: 'EN_PROCESO' },
    });
    return response.data.data;
  },

  // Get completed orders
  getCompletedOrders: async (): Promise<Order[]> => {
    const response = await apiClient.get('/orders', {
      params: { estado: 'COMPLETADO,ENTREGADO,PAGADO' },
    });
    return response.data.data;
  },
};
