import { PrismaClient } from '@prisma/client';
import { Request } from 'express';

const prisma = new PrismaClient();

export type AuditAction = 'CREAR' | 'ACTUALIZAR' | 'ELIMINAR' | 'LOGIN' | 'LOGOUT' | 'CAMBIO_ESTADO';
export type EntityType = 'cliente' | 'pedido' | 'pago' | 'administrador' | 'auth' | 'auditoria';

export interface AuditLogData {
  administradorId: string;
  accion: AuditAction;
  tipoEntidad: EntityType;
  entidadId: string;
  valoresAnteriores?: any;
  valoresNuevos?: any;
  descripcion?: string;
  direccionIP?: string;
  userAgent?: string;
}

export class AuditService {
  /**
   * Registra una acción en el log de auditoría
   */
  static async log(data: AuditLogData): Promise<void> {
    try {
      await prisma.auditoria.create({
        data: {
          administradorId: data.administradorId,
          accion: data.accion,
          tipoEntidad: data.tipoEntidad,
          entidadId: data.entidadId,
          valoresAnteriores: data.valoresAnteriores || null,
          valoresNuevos: data.valoresNuevos || null,
          direccionIP: data.direccionIP,
          userAgent: data.userAgent,
          descripcion: data.descripcion || `${data.accion} ${data.tipoEntidad}: ${data.entidadId}`,
        },
      });
    } catch (error) {
      // No lanzar error para no interferir con la operación principal
      console.error('Error registrando auditoría:', error);
    }
  }

  /**
   * Extrae información del request para auditoría
   */
  static extractRequestInfo(req: Request): { ip?: string; userAgent?: string; userId?: string } {
    return {
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      userId: (req as any).user?.id,
    };
  }

  /**
   * Registra creación de entidad
   */
  static async logCreate(
    req: Request,
    tipoEntidad: EntityType,
    entidadId: string,
    datosCreados: any,
    descripcion?: string
  ): Promise<void> {
    const { ip, userAgent, userId } = this.extractRequestInfo(req);
    
    if (!userId) return;

    await this.log({
      administradorId: userId,
      accion: 'CREAR',
      tipoEntidad,
      entidadId,
      valoresNuevos: datosCreados,
      descripcion: descripcion || `Creación de ${tipoEntidad}: ${entidadId}`,
      direccionIP: ip,
      userAgent,
    });
  }

  /**
   * Registra actualización de entidad
   */
  static async logUpdate(
    req: Request,
    tipoEntidad: EntityType,
    entidadId: string,
    datosAnteriores: any,
    datosNuevos: any,
    descripcion?: string
  ): Promise<void> {
    const { ip, userAgent, userId } = this.extractRequestInfo(req);
    
    if (!userId) return;

    await this.log({
      administradorId: userId,
      accion: 'ACTUALIZAR',
      tipoEntidad,
      entidadId,
      valoresAnteriores: datosAnteriores,
      valoresNuevos: datosNuevos,
      descripcion: descripcion || `Actualización de ${tipoEntidad}: ${entidadId}`,
      direccionIP: ip,
      userAgent,
    });
  }

  /**
   * Registra eliminación de entidad
   */
  static async logDelete(
    req: Request,
    tipoEntidad: EntityType,
    entidadId: string,
    datosEliminados: any,
    descripcion?: string
  ): Promise<void> {
    const { ip, userAgent, userId } = this.extractRequestInfo(req);
    
    if (!userId) return;

    await this.log({
      administradorId: userId,
      accion: 'ELIMINAR',
      tipoEntidad,
      entidadId,
      valoresAnteriores: datosEliminados,
      descripcion: descripcion || `Eliminación de ${tipoEntidad}: ${entidadId}`,
      direccionIP: ip,
      userAgent,
    });
  }

  /**
   * Registra cambio de estado
   */
  static async logStatusChange(
    req: Request,
    tipoEntidad: EntityType,
    entidadId: string,
    estadoAnterior: string,
    estadoNuevo: string,
    descripcion?: string
  ): Promise<void> {
    const { ip, userAgent, userId } = this.extractRequestInfo(req);
    
    if (!userId) return;

    await this.log({
      administradorId: userId,
      accion: 'CAMBIO_ESTADO',
      tipoEntidad,
      entidadId,
      valoresAnteriores: { estado: estadoAnterior },
      valoresNuevos: { estado: estadoNuevo },
      descripcion: descripcion || `Cambio de estado en ${tipoEntidad}: ${estadoAnterior} → ${estadoNuevo}`,
      direccionIP: ip,
      userAgent,
    });
  }

  /**
   * Registra login de usuario
   */
  static async logLogin(req: Request, userId: string, email: string): Promise<void> {
    const { ip, userAgent } = this.extractRequestInfo(req);

    await this.log({
      administradorId: userId,
      accion: 'LOGIN',
      tipoEntidad: 'auth',
      entidadId: userId,
      valoresNuevos: { email, timestamp: new Date() },
      descripcion: `Login exitoso: ${email}`,
      direccionIP: ip,
      userAgent,
    });
  }

  /**
   * Registra logout de usuario
   */
  static async logLogout(req: Request, userId: string, email?: string): Promise<void> {
    const { ip, userAgent } = this.extractRequestInfo(req);

    await this.log({
      administradorId: userId,
      accion: 'LOGOUT',
      tipoEntidad: 'auth',
      entidadId: userId,
      valoresNuevos: { timestamp: new Date() },
      descripcion: `Logout: ${email || userId}`,
      direccionIP: ip,
      userAgent,
    });
  }

  /**
   * Obtiene estadísticas de auditoría rápidas
   */
  static async getQuickStats(days: number = 7): Promise<{
    totalLogs: number;
    logsByAction: Record<string, number>;
    logsByEntity: Record<string, number>;
    uniqueUsers: number;
  }> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [totalLogs, logsByAction, logsByEntity, uniqueUsers] = await Promise.all([
      prisma.auditoria.count({
        where: { timestamp: { gte: since } },
      }),
      
      prisma.auditoria.groupBy({
        by: ['accion'],
        where: { timestamp: { gte: since } },
        _count: { accion: true },
      }),
      
      prisma.auditoria.groupBy({
        by: ['tipoEntidad'],
        where: { timestamp: { gte: since } },
        _count: { tipoEntidad: true },
      }),
      
      prisma.auditoria.findMany({
        where: { timestamp: { gte: since } },
        select: { administradorId: true },
        distinct: ['administradorId'],
      }),
    ]);

    return {
      totalLogs,
      logsByAction: logsByAction.reduce((acc, item) => {
        acc[item.accion] = item._count.accion;
        return acc;
      }, {} as Record<string, number>),
      logsByEntity: logsByEntity.reduce((acc, item) => {
        acc[item.tipoEntidad] = item._count.tipoEntidad;
        return acc;
      }, {} as Record<string, number>),
      uniqueUsers: uniqueUsers.length,
    };
  }

  /**
   * Limpia logs antiguos automáticamente
   */
  static async autoCleanup(retentionDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await prisma.auditoria.deleteMany({
      where: {
        timestamp: { lt: cutoffDate },
        // Nunca eliminar logs de LOGIN/LOGOUT para seguridad
        accion: { notIn: ['LOGIN', 'LOGOUT'] },
      },
    });

    return result.count;
  }

  /**
   * Detecta actividad sospechosa
   */
  static async detectSuspiciousActivity(): Promise<{
    multipleFailedLogins: any[];
    unusualActivityTimes: any[];
    massOperations: any[];
  }> {
    const lastHour = new Date();
    lastHour.setHours(lastHour.getHours() - 1);

    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);

    // Múltiples intentos de operaciones en corto tiempo
    const massOperations = await prisma.auditoria.groupBy({
      by: ['administradorId', 'accion', 'tipoEntidad'],
      where: {
        timestamp: { gte: lastHour },
        accion: { in: ['CREAR', 'ACTUALIZAR', 'ELIMINAR'] },
      },
      _count: { id: true },
      having: { id: { _count: { gt: 20 } } }, // Más de 20 operaciones por hora
    });

    // Actividad en horarios inusuales (2am - 6am)
    const unusualActivityTimes = await prisma.auditoria.findMany({
      where: {
        timestamp: { gte: last24Hours },
      },
      include: {
        administrador: {
          select: { email: true, username: true },
        },
      },
    }).then(logs => 
      logs.filter(log => {
        const hour = log.timestamp.getHours();
        return hour >= 2 && hour <= 6;
      })
    );

    return {
      multipleFailedLogins: [], // Implementar si se agregan logs de fallos de login
      unusualActivityTimes,
      massOperations,
    };
  }

  /**
   * Obtiene métricas de rendimiento del sistema
   */
  static async getPerformanceMetrics(days: number = 7): Promise<{
    avgOperationsPerDay: number;
    peakHour: { hour: number; count: number };
    slowestOperations: any[];
  }> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const logs = await prisma.auditoria.findMany({
      where: { timestamp: { gte: since } },
      select: { timestamp: true, accion: true, tipoEntidad: true },
    });

    // Operaciones promedio por día
    const avgOperationsPerDay = logs.length / days;

    // Hora pico de actividad
    const hourCounts: Record<number, number> = {};
    logs.forEach(log => {
      const hour = log.timestamp.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const peakHour = Object.entries(hourCounts).reduce(
      (max, [hour, count]) => (count > max.count ? { hour: Number(hour), count } : max),
      { hour: 0, count: 0 }
    );

    return {
      avgOperationsPerDay: Math.round(avgOperationsPerDay),
      peakHour,
      slowestOperations: [], // Para futuras optimizaciones
    };
  }

  /**
   * Obtiene timeline de actividades
   */
  static async getActivityTimeline(
    startDate: Date,
    endDate: Date,
    groupBy: 'hour' | 'day' | 'week' = 'day'
  ): Promise<Array<{ date: string; count: number; actions: Record<string, number> }>> {
    const logs = await prisma.auditoria.findMany({
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: { timestamp: true, accion: true },
      orderBy: { timestamp: 'asc' },
    });

    const timeline: Map<string, { count: number; actions: Record<string, number> }> = new Map();

    logs.forEach(log => {
      let key: string;
      
      if (groupBy === 'hour') {
        key = log.timestamp.toISOString().substring(0, 13); // YYYY-MM-DDTHH
      } else if (groupBy === 'day') {
        key = log.timestamp.toISOString().substring(0, 10); // YYYY-MM-DD
      } else {
        // week - calcular semana del año
        const week = Math.ceil(
          ((log.timestamp.getTime() - new Date(log.timestamp.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7
        );
        key = `${log.timestamp.getFullYear()}-W${week}`;
      }

      if (!timeline.has(key)) {
        timeline.set(key, { count: 0, actions: {} });
      }

      const entry = timeline.get(key)!;
      entry.count++;
      entry.actions[log.accion] = (entry.actions[log.accion] || 0) + 1;
    });

    return Array.from(timeline.entries()).map(([date, data]) => ({
      date,
      count: data.count,
      actions: data.actions,
    }));
  }

  /**
   * Obtiene comparación de actividad por usuarios
   */
  static async getUserActivityComparison(
    startDate: Date,
    endDate: Date
  ): Promise<Array<{
    usuario: any;
    totalAcciones: number;
    accionesPorTipo: Record<string, number>;
    entidadesModificadas: Set<string>;
  }>> {
    const logs = await prisma.auditoria.findMany({
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        administrador: {
          select: {
            id: true,
            email: true,
            username: true,
            nombres: true,
            apellidos: true,
          },
        },
      },
    });

    const userStats = new Map<string, any>();

    logs.forEach(log => {
      const userId = log.administradorId;
      
      if (!userStats.has(userId)) {
        userStats.set(userId, {
          usuario: {
            id: log.administrador.id,
            email: log.administrador.email,
            username: log.administrador.username,
            nombreCompleto: `${log.administrador.nombres} ${log.administrador.apellidos}`,
          },
          totalAcciones: 0,
          accionesPorTipo: {},
          entidadesModificadas: new Set<string>(),
        });
      }

      const stats = userStats.get(userId);
      stats.totalAcciones++;
      stats.accionesPorTipo[log.accion] = (stats.accionesPorTipo[log.accion] || 0) + 1;
      stats.entidadesModificadas.add(`${log.tipoEntidad}:${log.entidadId}`);
    });

    return Array.from(userStats.values());
  }

  /**
   * Obtiene cambios realizados en una entidad específica
   */
  static async getEntityChangeHistory(
    tipoEntidad: EntityType,
    entidadId: string
  ): Promise<Array<{
    id: string;
    timestamp: Date;
    accion: string;
    administrador: any;
    cambios: any;
  }>> {
    const logs = await prisma.auditoria.findMany({
      where: {
        tipoEntidad,
        entidadId,
      },
      include: {
        administrador: {
          select: {
            id: true,
            username: true,
            nombres: true,
            apellidos: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    return logs.map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      accion: log.accion,
      administrador: {
        id: log.administrador.id,
        username: log.administrador.username,
        nombreCompleto: `${log.administrador.nombres} ${log.administrador.apellidos}`,
      },
      cambios: {
        anterior: log.valoresAnteriores,
        nuevo: log.valoresNuevos,
      },
    }));
  }
}