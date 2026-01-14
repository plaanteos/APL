import apiClient from './api';

export interface Client {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  whatsapp?: string;
  tipo: 'CLINICA' | 'DENTISTA' | 'PARTICULAR';
  activo: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateClientData {
  nombre: string;
  email: string;
  telefono: string;
  whatsapp?: string;
  tipo: 'CLINICA' | 'DENTISTA' | 'PARTICULAR';
}

export interface UpdateClientData extends Partial<CreateClientData> {
  activo?: boolean;
}

export interface ClientStats {
  totalOrders: number;
  totalAmount: number;
  pendingAmount: number;
}

export interface ClientBalance {
  cliente: {
    id: string;
    nombre: string;
    email: string;
  };
  pedidos: Array<{
    id: string;
    fecha: string;
    total: number;
    estado: string;
    pagado: number;
  }>;
  totalPedidos: number;
  totalPagado: number;
  saldoPendiente: number;
  porcentajePagado: number;
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

export const clientService = {
  // Get all clients with optional pagination
  getAllClients: async (page?: number, limit?: number): Promise<PaginatedResponse<Client> | Client[]> => {
    const params: any = {};
    if (page) params.page = page;
    if (limit) params.limit = limit;

    const response = await apiClient.get('/clients', { params });
    
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

  // Get client by ID
  getClientById: async (id: string): Promise<Client> => {
    const response = await apiClient.get(`/clients/${id}`);
    return response.data.data;
  },

  // Create client
  createClient: async (clientData: CreateClientData): Promise<Client> => {
    const response = await apiClient.post('/clients', clientData);
    return response.data.data;
  },

  // Update client
  updateClient: async (id: string, clientData: UpdateClientData): Promise<Client> => {
    const response = await apiClient.put(`/clients/${id}`, clientData);
    return response.data.data;
  },

  // Delete client
  deleteClient: async (id: string): Promise<void> => {
    await apiClient.delete(`/clients/${id}`);
  },

  // Get client statistics
  getClientStats: async (id: string): Promise<ClientStats> => {
    const response = await apiClient.get(`/clients/${id}/stats`);
    return response.data.data;
  },

  // Search clients
  searchClients: async (query: string): Promise<Client[]> => {
    const response = await apiClient.get('/clients/search', {
      params: { q: query },
    });
    return response.data.data;
  },

  // Get client balance (total orders, paid, pending)
  getClientBalance: async (clientId: string): Promise<ClientBalance> => {
    const response = await apiClient.get(`/clients/${clientId}/balance`);
    return response.data.data;
  },
};
