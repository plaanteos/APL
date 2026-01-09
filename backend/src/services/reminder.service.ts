import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';

const prisma = new PrismaClient();

export type TipoRecordatorio = 'VENCIMIENTO_PEDIDO' | 'SEGUIMIENTO_CLIENTE' | 'PAGO_PENDIENTE' | 'REUNION' | 'LLAMADA' | 'OTRO';
export type EstadoRecordatorio = 'PENDIENTE' | 'COMPLETADO' | 'CANCELADO' | 'VENCIDO';

export interface CreateRecordatorioData {
  titulo: string;
  descripcion?: string;
  tipo: TipoRecordatorio;
  tipoEntidad: string;
  entidadId: string;
  fechaRecordatorio: Date;
  prioridad?: 'BAJA' | 'NORMAL' | 'ALTA' | 'URGENTE';
  administradorId?: string;
  repetir?: boolean;
  frecuencia?: 'diario' | 'semanal' | 'mensual';
  observaciones?: string;
}

export class ReminderService {
  private static cronJobs: Map<string, cron.ScheduledTask> = new Map();

  /**
   * Iniciar el sistema de recordatorios automáticos
   */
  static async initialize(): Promise<void> {
    console.log('🔔 Inicializando sistema de recordatorios automáticos...');

    // Verificar recordatorios cada hora
    this.scheduleJob('check-reminders', '0 * * * *', async () => {
      await this.checkPendingReminders();
    });

    // Crear recordatorios automáticos para pedidos por vencer (cada día a las 8am)
    this.scheduleJob('auto-pedidos-vencer', '0 8 * * *', async () => {
      await this.createAutomaticRemindersForDuePedidos();
    });

    // Marcar recordatorios vencidos (cada 6 horas)
    this.scheduleJob('mark-overdue', '0 */6 * * *', async () => {
      await this.markOverdueReminders();
    });

    // Ejecutar verificación inicial
    await this.checkPendingReminders();
    
    console.log('✅ Sistema de recordatorios iniciado correctamente');
  }

  /**
   * Programar un trabajo cron
   */
  private static scheduleJob(name: string, schedule: string, task: () => Promise<void>): void {
    if (this.cronJobs.has(name)) {
      this.cronJobs.get(name)?.stop();
    }

    const job = cron.schedule(schedule, async () => {
      try {
        console.log(`⏰ Ejecutando tarea programada: ${name}`);
        await task();
      } catch (error) {
        console.error(`❌ Error en tarea programada ${name}:`, error);
      }
    });

    this.cronJobs.set(name, job);
  }

  /**
   * Detener todos los trabajos programados
   */
  static stopAllJobs(): void {
    this.cronJobs.forEach((job, name) => {
      console.log(`⏹️  Deteniendo tarea: ${name}`);
      job.stop();
    });
    this.cronJobs.clear();
  }

  /**
   * Crear un recordatorio
   */
  static async createReminder(data: CreateRecordatorioData) {
    return await prisma.recordatorio.create({
      data: {
        titulo: data.titulo,
        descripcion: data.descripcion,
        tipo: data.tipo,
        tipoEntidad: data.tipoEntidad,
        entidadId: data.entidadId,
        fechaRecordatorio: data.fechaRecordatorio,
        prioridad: data.prioridad || 'NORMAL',
        administradorId: data.administradorId,
        repetir: data.repetir || false,
        frecuencia: data.frecuencia,
        observaciones: data.observaciones,
      },
    });
  }

  /**
   * Obtener recordatorios pendientes
   */
  static async getPendingReminders(userId?: string) {
    const where: any = {
      estado: 'PENDIENTE',
      fechaRecordatorio: {
        lte: new Date(Date.now() + 24 * 60 * 60 * 1000), // Próximas 24 horas
      },
    };

    if (userId) {
      where.OR = [
        { administradorId: userId },
        { administradorId: null }, // Recordatorios generales
      ];
    }

    return await prisma.recordatorio.findMany({
      where,
      orderBy: [
        { fechaRecordatorio: 'asc' },
        { prioridad: 'desc' },
      ],
    });
  }

  /**
   * Obtener todos los recordatorios con filtros
   */
  static async getReminders(filters: {
    estado?: EstadoRecordatorio;
    tipo?: TipoRecordatorio;
    administradorId?: string;
    fechaDesde?: Date;
    fechaHasta?: Date;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const where: any = {};

    if (filters.estado) where.estado = filters.estado;
    if (filters.tipo) where.tipo = filters.tipo;
    if (filters.administradorId) {
      where.OR = [
        { administradorId: filters.administradorId },
        { administradorId: null },
      ];
    }

    if (filters.fechaDesde || filters.fechaHasta) {
      where.fechaRecordatorio = {};
      if (filters.fechaDesde) where.fechaRecordatorio.gte = filters.fechaDesde;
      if (filters.fechaHasta) where.fechaRecordatorio.lte = filters.fechaHasta;
    }

    const [recordatorios, total] = await Promise.all([
      prisma.recordatorio.findMany({
        where,
        orderBy: [
          { fechaRecordatorio: 'asc' },
          { prioridad: 'desc' },
        ],
        skip: offset,
        take: limit,
      }),
      prisma.recordatorio.count({ where }),
    ]);

    return {
      data: recordatorios,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Obtener recordatorio por ID
   */
  static async getReminderById(id: string) {
    return await prisma.recordatorio.findUnique({
      where: { id },
    });
  }

  /**
   * Actualizar recordatorio
   */
  static async updateReminder(id: string, data: Partial<CreateRecordatorioData>) {
    return await prisma.recordatorio.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Marcar recordatorio como completado
   */
  static async completeReminder(id: string) {
    const recordatorio = await prisma.recordatorio.update({
      where: { id },
      data: {
        estado: 'COMPLETADO',
        updatedAt: new Date(),
      },
    });

    // Si es repetitivo, crear el siguiente
    if (recordatorio.repetir && recordatorio.frecuencia) {
      const nextDate = this.calculateNextDate(recordatorio.fechaRecordatorio, recordatorio.frecuencia);
      
      await this.createReminder({
        titulo: recordatorio.titulo,
        descripcion: recordatorio.descripcion || undefined,
        tipo: recordatorio.tipo as TipoRecordatorio,
        tipoEntidad: recordatorio.tipoEntidad,
        entidadId: recordatorio.entidadId,
        fechaRecordatorio: nextDate,
        prioridad: recordatorio.prioridad as any,
        administradorId: recordatorio.administradorId || undefined,
        repetir: true,
        frecuencia: recordatorio.frecuencia as any,
        observaciones: recordatorio.observaciones || undefined,
      });
    }

    return recordatorio;
  }

  /**
   * Cancelar recordatorio
   */
  static async cancelReminder(id: string) {
    return await prisma.recordatorio.update({
      where: { id },
      data: {
        estado: 'CANCELADO',
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Eliminar recordatorio
   */
  static async deleteReminder(id: string) {
    return await prisma.recordatorio.delete({
      where: { id },
    });
  }

  /**
   * Verificar recordatorios pendientes y notificar
   */
  static async checkPendingReminders(): Promise<void> {
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const reminders = await prisma.recordatorio.findMany({
      where: {
        estado: 'PENDIENTE',
        notificado: false,
        fechaRecordatorio: {
          lte: in24Hours,
        },
      },
    });

    console.log(`📋 Encontrados ${reminders.length} recordatorios para notificar`);

    for (const reminder of reminders) {
      await this.notifyReminder(reminder);
    }
  }

  /**
   * Notificar un recordatorio
   */
  private static async notifyReminder(reminder: any): Promise<void> {
    try {
      // Aquí implementarías la lógica de notificación
      // Por ahora solo marcamos como notificado
      console.log(`🔔 Notificando recordatorio: ${reminder.titulo}`);

      await prisma.recordatorio.update({
        where: { id: reminder.id },
        data: {
          notificado: true,
          fechaNotificacion: new Date(),
        },
      });

      // TODO: Implementar notificaciones:
      // - Email
      // - SMS / WhatsApp
      // - Notificaciones push
      // - Webhook
    } catch (error) {
      console.error(`❌ Error notificando recordatorio ${reminder.id}:`, error);
    }
  }

  /**
   * Marcar recordatorios vencidos
   */
  static async markOverdueReminders(): Promise<void> {
    const now = new Date();

    const result = await prisma.recordatorio.updateMany({
      where: {
        estado: 'PENDIENTE',
        fechaRecordatorio: {
          lt: now,
        },
      },
      data: {
        estado: 'VENCIDO',
      },
    });

    console.log(`⏰ Marcados ${result.count} recordatorios como vencidos`);
  }

  /**
   * Crear recordatorios automáticos para pedidos próximos a vencer
   */
  static async createAutomaticRemindersForDuePedidos(): Promise<void> {
    console.log('📅 Creando recordatorios automáticos para pedidos próximos a vencer...');

    const in7Days = new Date();
    in7Days.setDate(in7Days.getDate() + 7);

    const in3Days = new Date();
    in3Days.setDate(in3Days.getDate() + 3);

    const today = new Date();

    // Buscar pedidos sin recordatorio que vencen pronto
    const pedidos = await prisma.pedido.findMany({
      where: {
        estado: {
          notIn: ['ENTREGADO', 'PAGADO', 'CANCELADO'],
        },
        fechaVencimiento: {
          gte: today,
          lte: in7Days,
        },
      },
      include: {
        cliente: {
          select: {
            nombre: true,
          },
        },
      },
    });

    for (const pedido of pedidos) {
      // Verificar si ya existe un recordatorio para este pedido
      const existingReminder = await prisma.recordatorio.findFirst({
        where: {
          tipoEntidad: 'pedido',
          entidadId: pedido.id,
          tipo: 'VENCIMIENTO_PEDIDO',
          estado: {
            in: ['PENDIENTE', 'VENCIDO'],
          },
        },
      });

      if (existingReminder) {
        continue; // Ya existe un recordatorio
      }

      // Determinar prioridad según días restantes
      const daysUntilDue = Math.ceil(
        (pedido.fechaVencimiento.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      let prioridad: 'BAJA' | 'NORMAL' | 'ALTA' | 'URGENTE' = 'NORMAL';
      if (daysUntilDue <= 1) prioridad = 'URGENTE';
      else if (daysUntilDue <= 3) prioridad = 'ALTA';
      else if (daysUntilDue <= 5) prioridad = 'NORMAL';

      // Crear recordatorio
      await this.createReminder({
        titulo: `Pedido #${pedido.numeroPedido} próximo a vencer`,
        descripcion: `El pedido ${pedido.numeroPedido} del cliente ${pedido.cliente.nombre} vence en ${daysUntilDue} día(s)`,
        tipo: 'VENCIMIENTO_PEDIDO',
        tipoEntidad: 'pedido',
        entidadId: pedido.id,
        fechaRecordatorio: pedido.fechaVencimiento,
        prioridad,
      });

      console.log(`✅ Creado recordatorio para pedido ${pedido.numeroPedido}`);
    }
  }

  /**
   * Crear recordatorios automáticos para pagos pendientes
   */
  static async createAutomaticRemindersForPendingPayments(): Promise<void> {
    console.log('💰 Creando recordatorios para pagos pendientes...');

    const today = new Date();
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const pedidosConDeuda = await prisma.pedido.findMany({
      where: {
        montoPendiente: {
          gt: 0,
        },
        fechaPedido: {
          lte: last30Days, // Pedidos con más de 30 días
        },
      },
      include: {
        cliente: {
          select: {
            nombre: true,
            email: true,
          },
        },
      },
    });

    for (const pedido of pedidosConDeuda) {
      // Verificar si ya existe un recordatorio
      const existingReminder = await prisma.recordatorio.findFirst({
        where: {
          tipoEntidad: 'pedido',
          entidadId: pedido.id,
          tipo: 'PAGO_PENDIENTE',
          estado: {
            in: ['PENDIENTE', 'VENCIDO'],
          },
        },
      });

      if (existingReminder) {
        continue;
      }

      const diasVencido = Math.ceil(
        (today.getTime() - pedido.fechaPedido.getTime()) / (1000 * 60 * 60 * 24)
      );

      await this.createReminder({
        titulo: `Pago pendiente: Pedido #${pedido.numeroPedido}`,
        descripcion: `El cliente ${pedido.cliente.nombre} tiene un pago pendiente de $${pedido.montoPendiente} desde hace ${diasVencido} días`,
        tipo: 'PAGO_PENDIENTE',
        tipoEntidad: 'pedido',
        entidadId: pedido.id,
        fechaRecordatorio: today,
        prioridad: diasVencido > 60 ? 'URGENTE' : diasVencido > 45 ? 'ALTA' : 'NORMAL',
      });

      console.log(`✅ Creado recordatorio de pago para pedido ${pedido.numeroPedido}`);
    }
  }

  /**
   * Calcular próxima fecha según frecuencia
   */
  private static calculateNextDate(currentDate: Date, frequency: string): Date {
    const nextDate = new Date(currentDate);

    switch (frequency) {
      case 'diario':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'semanal':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'mensual':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      default:
        nextDate.setDate(nextDate.getDate() + 1);
    }

    return nextDate;
  }

  /**
   * Obtener estadísticas de recordatorios
   */
  static async getStatistics() {
    const [total, pendientes, completados, vencidos, porTipo, porPrioridad] = await Promise.all([
      prisma.recordatorio.count(),
      prisma.recordatorio.count({ where: { estado: 'PENDIENTE' } }),
      prisma.recordatorio.count({ where: { estado: 'COMPLETADO' } }),
      prisma.recordatorio.count({ where: { estado: 'VENCIDO' } }),
      prisma.recordatorio.groupBy({
        by: ['tipo'],
        _count: true,
      }),
      prisma.recordatorio.groupBy({
        by: ['prioridad'],
        where: { estado: 'PENDIENTE' },
        _count: true,
      }),
    ]);

    return {
      total,
      pendientes,
      completados,
      vencidos,
      porTipo: porTipo.reduce((acc, item) => {
        acc[item.tipo] = item._count;
        return acc;
      }, {} as Record<string, number>),
      porPrioridad: porPrioridad.reduce((acc, item) => {
        acc[item.prioridad] = item._count;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  /**
   * Obtener recordatorios de hoy
   */
  static async getTodayReminders(userId?: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const where: any = {
      fechaRecordatorio: {
        gte: startOfDay,
        lte: endOfDay,
      },
      estado: {
        in: ['PENDIENTE', 'VENCIDO'],
      },
    };

    if (userId) {
      where.OR = [
        { administradorId: userId },
        { administradorId: null },
      ];
    }

    return await prisma.recordatorio.findMany({
      where,
      orderBy: [
        { prioridad: 'desc' },
        { fechaRecordatorio: 'asc' },
      ],
    });
  }
}
