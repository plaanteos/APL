import apiClient from './api';

export interface Payment {
  id: string;
  pedidoId: string;
  monto: number;
  metodoPago: 'EFECTIVO' | 'TRANSFERENCIA' | 'CHEQUE' | 'TARJETA' | 'TARJETA_CREDITO' | 'TARJETA_DEBITO';
  fechaPago: string;
  numeroRecibo?: string;
  numeroTransf?: string;
  observaciones?: string;
  createdAt?: string;
  pedido?: {
    id: string;
    nombrePaciente: string;
    cliente: {
      nombre: string;
    };
  };
}

export interface CreatePaymentData {
  pedidoId: string;
  monto: number;
  metodoPago: 'EFECTIVO' | 'TRANSFERENCIA' | 'CHEQUE' | 'TARJETA_CREDITO' | 'TARJETA_DEBITO';
  fechaPago?: string;
  numeroRecibo?: string;
  numeroTransf?: string;
  observaciones?: string;
}

export interface PaymentSummary {
  totalPagos: number;
  montoTotal: number;
  porMetodoPago: {
    metodoPago: string;
    cantidad: number;
    monto: number;
  }[];
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const paymentService = {
  // Get all payments with optional pagination
  getAllPayments: async (page?: number, limit?: number): Promise<PaginatedResponse<Payment> | Payment[]> => {
    const params: any = {};
    if (page) params.page = page;
    if (limit) params.limit = limit;

    const response = await apiClient.get('/payments', { params });
    
    // Si el backend devuelve paginación, usarla
    if (response.data.data.items) {
      return {
        items: response.data.data.items,
        pagination: response.data.data.pagination
      };
    }
    
    // Fallback: devolver array directo (compatibilidad)
    return response.data.data;
  },

  // Get payment by ID
  getPaymentById: async (id: string): Promise<Payment> => {
    const response = await apiClient.get(`/payments/${id}`);
    return response.data.data;
  },

  // Create payment
  createPayment: async (paymentData: CreatePaymentData): Promise<Payment> => {
    const response = await apiClient.post('/payments', paymentData);
    return response.data.data;
  },

  // Delete payment
  deletePayment: async (id: string): Promise<void> => {
    await apiClient.delete(`/payments/${id}`);
  },

  // Get payments by order
  getPaymentsByOrder: async (orderId: string): Promise<Payment[]> => {
    const response = await apiClient.get(`/payments/order/${orderId}`);
    return response.data.data;
  },

  // Get payments by client
  getPaymentsByClient: async (clientId: string): Promise<Payment[]> => {
    const response = await apiClient.get(`/payments/client/${clientId}`);
    return response.data.data;
  },

  // Get payment summary
  getPaymentSummary: async (fechaDesde?: string, fechaHasta?: string): Promise<PaymentSummary> => {
    const response = await apiClient.get('/payments/summary', {
      params: { fechaDesde, fechaHasta },
    });
    return response.data.data;
  },

  // Get payments by date range
  getPaymentsByDateRange: async (fechaDesde: string, fechaHasta: string): Promise<Payment[]> => {
    const response = await apiClient.get('/payments', {
      params: { fechaDesde, fechaHasta },
    });
    return response.data.data;
  },
};
