import api from './api';
import { isDemoMode } from './demoMode';
import { demoStore } from './demoStore';

export interface IOtherExpense {
  id: string;
  tipo: 'supplies' | 'delivery';
  descripcion: string;
  monto: number;
  fecha: string; // ISO string
  id_administrador?: number;
}

export interface IExpenseFormData {
  tipo: 'supplies' | 'delivery';
  descripcion: string;
  monto: number;
}

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string;
};

class ExpenseService {
  /**
   * Obtener todos los gastos con filtros opcionales
   */
  async getAll(params?: {
    tipo?: 'all' | 'supplies' | 'delivery';
    fechaDesde?: string;
    fechaHasta?: string;
  }): Promise<IOtherExpense[]> {
    if (isDemoMode()) {
      return demoStore.getExpenses(params);
    }

    const query: Record<string, string> = {};
    if (params?.tipo && params.tipo !== 'all') query.tipo = params.tipo;
    if (params?.fechaDesde) query.fechaDesde = params.fechaDesde;
    if (params?.fechaHasta) query.fechaHasta = params.fechaHasta;

    const response = await api.get<ApiEnvelope<IOtherExpense[]>>('/expenses', { params: query });
    return response.data.data;
  }

  /**
   * Crear un nuevo gasto
   */
  async create(data: IExpenseFormData): Promise<IOtherExpense> {
    if (isDemoMode()) {
      return demoStore.createExpense(data);
    }

    const response = await api.post<ApiEnvelope<IOtherExpense>>('/expenses', data);
    return response.data.data;
  }

  /**
   * Eliminar un gasto
   */
  async delete(id: string): Promise<void> {
    if (isDemoMode()) {
      demoStore.deleteExpense(id);
      return;
    }

    await api.delete(`/expenses/${id}`);
  }

  /**
   * Obtener resumen por período
   */
  async getSummary(params: {
    period: 'monthly' | 'yearly';
    year: number;
    month?: number;
  }): Promise<{
    total: number;
    totalInsumos: number;
    totalCadeteria: number;
    cantidad: number;
    gastos: IOtherExpense[];
  }> {
    if (isDemoMode()) {
      return demoStore.getExpenseSummary(params);
    }

    const query: Record<string, string> = {
      period: params.period,
      year: String(params.year),
    };
    if (params.month) query.month = String(params.month);

    const response = await api.get<ApiEnvelope<any>>('/expenses/summary', { params: query });
    return response.data.data;
  }
}

export default new ExpenseService();
