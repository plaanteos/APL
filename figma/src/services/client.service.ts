import api from './api';
import { IClient, IClientFormData, IClientStats, IClientBalance } from '../app/types';
import { isDemoMode } from './demoMode';
import { demoStore } from './demoStore';

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
    if (isDemoMode()) {
      return demoStore.getClients();
    }
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
    if (isDemoMode()) {
      return demoStore.createClient(data);
    }
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
    if (isDemoMode()) {
      return demoStore.getClientBalance(id);
    }
    const response = await api.get<ApiEnvelope<any>>(`/clients/${id}/balance`);
    const raw = response.data.data;

    // Backend actual devuelve: { cliente, resumen, pedidos }
    if (raw && typeof raw === 'object' && 'resumen' in raw && 'pedidos' in raw) {
      const cliente = raw.cliente || {};
      const resumen = raw.resumen || {};
      const pedidos = Array.isArray(raw.pedidos) ? raw.pedidos : [];

      return {
        cliente: {
          id: Number(cliente.id),
          nombre: String(cliente.nombre ?? ''),
          email: String(cliente.email ?? ''),
          telefono: String(cliente.telefono ?? ''),
          // El endpoint de balance no incluye id_administrador; se completa para satisfacer el tipo.
          id_administrador: Number(cliente.id_administrador ?? 0),
        },
        pedidos: pedidos.map((p: any) => {
          const montoTotal = Number(p.montoTotal ?? 0);
          const montoPagado = Number(p.montoPagado ?? 0);
          const montoPendiente = Number(p.montoPendiente ?? Math.max(0, montoTotal - montoPagado));
          const pedidoId = Number(p.id ?? p.pedidoId ?? 0);
          const fecha = p.fecha_pedido ?? p.fecha ?? new Date().toISOString();

          return {
            pedidoId,
            fecha,
            // El backend no expone paciente/productos en este endpoint; se usa un fallback legible.
            paciente: String(p.paciente ?? ''),
            productos: String(p.productos ?? `${Number(p.cantidadProductos ?? 0)} productos`),
            montoTotal,
            montoPagado,
            montoPendiente,
            entregado: !!p.fecha_entrega,
          };
        }),
        totalGeneral: Number(resumen.montoTotal ?? resumen.totalGeneral ?? 0),
        totalPagado: Number(resumen.montoPagado ?? resumen.totalPagado ?? 0),
        totalPendiente: Number(resumen.montoPendiente ?? resumen.totalPendiente ?? 0),
      };
    }

    // Fallback: si el backend ya devuelve el tipo esperado.
    return raw as IClientBalance;
  }

  /**
   * Exportar balance del cliente a Excel (descarga desde backend)
   */
  async exportBalance(id: number, clientName: string): Promise<void> {
    if (isDemoMode()) {
      // En demo, exportar CSV local (sin backend) para evitar dependencias pesadas/vulnerables.
      const balance = await demoStore.getClientBalance(id);

      const headers = ['Pedido', 'Fecha', 'Paciente', 'Productos', 'Total', 'Pagado', 'Pendiente', 'Entregado'];
      const lines = [
        headers.join(','),
        ...balance.pedidos.map((p) => {
          const values = [
            p.pedidoId,
            new Date(p.fecha).toLocaleDateString('es-ES'),
            p.paciente,
            p.productos,
            p.montoTotal,
            p.montoPagado,
            p.montoPendiente,
            p.entregado ? 'Sí' : 'No',
          ].map((v) => {
            const s = String(v ?? '');
            // CSV escaping mínimo
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          });
          return values.join(',');
        }),
      ];

      const csv = lines.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const date = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `Balance_${clientName.replace(/\s+/g, '_')}_${date}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      return;
    }

    const response = await api.get(`/clients/${id}/balance/export`, {
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    const date = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `Balance_${clientName.replace(/\s+/g, '_')}_${date}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
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
