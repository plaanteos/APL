import { Request, Response } from 'express';
import { z } from 'zod';
import { ReminderService, TipoRecordatorio, EstadoRecordatorio } from '../services/reminder.service';

// Schemas de validación
const createReminderSchema = z.object({
  titulo: z.string().min(1, 'El título es requerido'),
  descripcion: z.string().optional(),
  tipo: z.enum(['VENCIMIENTO_PEDIDO', 'SEGUIMIENTO_CLIENTE', 'PAGO_PENDIENTE', 'REUNION', 'LLAMADA', 'OTRO']),
  tipoEntidad: z.string(),
  entidadId: z.string(),
  fechaRecordatorio: z.string().transform((str) => new Date(str)),
  prioridad: z.enum(['BAJA', 'NORMAL', 'ALTA', 'URGENTE']).optional(),
  administradorId: z.string().optional(),
  repetir: z.boolean().optional(),
  frecuencia: z.enum(['diario', 'semanal', 'mensual']).optional(),
  observaciones: z.string().optional(),
});

const updateReminderSchema = createReminderSchema.partial();

const reminderFiltersSchema = z.object({
  estado: z.enum(['PENDIENTE', 'COMPLETADO', 'CANCELADO', 'VENCIDO']).optional(),
  tipo: z.enum(['VENCIMIENTO_PEDIDO', 'SEGUIMIENTO_CLIENTE', 'PAGO_PENDIENTE', 'REUNION', 'LLAMADA', 'OTRO']).optional(),
  administradorId: z.string().optional(),
  fechaDesde: z.string().transform((str) => new Date(str)).optional(),
  fechaHasta: z.string().transform((str) => new Date(str)).optional(),
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
});

export class ReminderController {
  // GET /api/reminders
  static async getReminders(req: Request, res: Response) {
    try {
      const filters = reminderFiltersSchema.parse(req.query);
      const result = await ReminderService.getReminders(filters);

      res.json({
        success: true,
        data: result.data,
        pagination: {
          page: result.page,
          limit: filters.limit || 20,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      console.error('Get reminders error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Parámetros de consulta inválidos',
          details: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // GET /api/reminders/pending
  static async getPendingReminders(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const reminders = await ReminderService.getPendingReminders(userId);

      res.json({
        success: true,
        data: reminders,
        total: reminders.length,
      });
    } catch (error) {
      console.error('Get pending reminders error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // GET /api/reminders/today
  static async getTodayReminders(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const reminders = await ReminderService.getTodayReminders(userId);

      res.json({
        success: true,
        data: reminders,
        total: reminders.length,
      });
    } catch (error) {
      console.error('Get today reminders error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // GET /api/reminders/stats
  static async getStatistics(req: Request, res: Response) {
    try {
      const stats = await ReminderService.getStatistics();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Get reminder stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // GET /api/reminders/:id
  static async getReminderById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const reminder = await ReminderService.getReminderById(id);

      if (!reminder) {
        return res.status(404).json({
          success: false,
          error: 'Recordatorio no encontrado',
        });
      }

      res.json({
        success: true,
        data: reminder,
      });
    } catch (error) {
      console.error('Get reminder by id error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // POST /api/reminders
  static async createReminder(req: Request, res: Response) {
    try {
      const data = createReminderSchema.parse(req.body);
      const reminder = await ReminderService.createReminder(data);

      res.status(201).json({
        success: true,
        message: 'Recordatorio creado exitosamente',
        data: reminder,
      });
    } catch (error) {
      console.error('Create reminder error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Datos inválidos',
          details: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // PUT /api/reminders/:id
  static async updateReminder(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = updateReminderSchema.parse(req.body);

      const reminder = await ReminderService.updateReminder(id, data);

      res.json({
        success: true,
        message: 'Recordatorio actualizado exitosamente',
        data: reminder,
      });
    } catch (error) {
      console.error('Update reminder error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Datos inválidos',
          details: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // PATCH /api/reminders/:id/complete
  static async completeReminder(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const reminder = await ReminderService.completeReminder(id);

      res.json({
        success: true,
        message: 'Recordatorio marcado como completado',
        data: reminder,
      });
    } catch (error) {
      console.error('Complete reminder error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // PATCH /api/reminders/:id/cancel
  static async cancelReminder(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const reminder = await ReminderService.cancelReminder(id);

      res.json({
        success: true,
        message: 'Recordatorio cancelado',
        data: reminder,
      });
    } catch (error) {
      console.error('Cancel reminder error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // DELETE /api/reminders/:id
  static async deleteReminder(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await ReminderService.deleteReminder(id);

      res.json({
        success: true,
        message: 'Recordatorio eliminado exitosamente',
      });
    } catch (error) {
      console.error('Delete reminder error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // POST /api/reminders/auto/due-pedidos
  static async createAutomaticRemindersForDuePedidos(req: Request, res: Response) {
    try {
      await ReminderService.createAutomaticRemindersForDuePedidos();

      res.json({
        success: true,
        message: 'Recordatorios automáticos creados para pedidos próximos a vencer',
      });
    } catch (error) {
      console.error('Create automatic reminders error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // POST /api/reminders/auto/pending-payments
  static async createAutomaticRemindersForPendingPayments(req: Request, res: Response) {
    try {
      await ReminderService.createAutomaticRemindersForPendingPayments();

      res.json({
        success: true,
        message: 'Recordatorios automáticos creados para pagos pendientes',
      });
    } catch (error) {
      console.error('Create automatic payment reminders error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // POST /api/reminders/check
  static async checkPendingReminders(req: Request, res: Response) {
    try {
      await ReminderService.checkPendingReminders();

      res.json({
        success: true,
        message: 'Verificación de recordatorios completada',
      });
    } catch (error) {
      console.error('Check pending reminders error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }
}
