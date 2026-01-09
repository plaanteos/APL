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

export const clientService = {
  // Get all clients
  getAllClients: async (): Promise<Client[]> => {
    const response = await apiClient.get('/clients');
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
};
