import { Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Schemas de validación
const auditFiltersSchema = z.object({
  page: z.string().transform(Number).optional().default('1'),
  limit: z.string().transform(Number).optional().default('20'),
  administradorId: z.string().optional(),
  accion: z.enum(['CREAR', 'ACTUALIZAR', 'ELIMINAR', 'LOGIN', 'LOGOUT', 'CAMBIO_ESTADO']).optional(),
  tipoEntidad: z.string().optional(),
  entidadId: z.string().optional(),
  fechaDesde: z.string().transform((str) => new Date(str)).optional(),
  fechaHasta: z.string().transform((str) => new Date(str)).optional(),
  direccionIP: z.string().optional(),
  search: z.string().optional(),
});

export class AuditController {
  // GET /api/audit
  static async getAuditLogs(req: Request, res: Response) {
    try {
      const filters = auditFiltersSchema.parse(req.query);
      const offset = (filters.page - 1) * filters.limit;

      // Construir filtros
      const where: any = {};

      if (filters.administradorId) {
        where.administradorId = filters.administradorId;
      }

      if (filters.accion) {
        where.accion = filters.accion;
      }

      if (filters.tipoEntidad) {
        where.tipoEntidad = filters.tipoEntidad;
      }

      if (filters.entidadId) {
        where.entidadId = filters.entidadId;
      }

      if (filters.direccionIP) {
        where.direccionIP = { contains: filters.direccionIP };
      }

      if (filters.fechaDesde || filters.fechaHasta) {
        where.timestamp = {};
        if (filters.fechaDesde) where.timestamp.gte = filters.fechaDesde;
        if (filters.fechaHasta) where.timestamp.lte = filters.fechaHasta;
      }

      if (filters.search) {
        where.OR = [
          { descripcion: { contains: filters.search } },
          { tipoEntidad: { contains: filters.search } },
          { administrador: { email: { contains: filters.search } } },
          { administrador: { username: { contains: filters.search } } },
        ];
      }

      const [auditLogs, total] = await Promise.all([
        prisma.auditoria.findMany({
          where,
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
          orderBy: { timestamp: 'desc' },
          skip: offset,
          take: filters.limit,
        }),
        prisma.auditoria.count({ where }),
      ]);

      // Formatear respuesta
      const logsFormatted = auditLogs.map(log => ({
        id: log.id,
        administrador: {
          id: log.administrador.id,
          email: log.administrador.email,
          username: log.administrador.username,
          nombreCompleto: `${log.administrador.nombres} ${log.administrador.apellidos}`,
        },
        accion: log.accion,
        tipoEntidad: log.tipoEntidad,
        entidadId: log.entidadId,
        valoresAnteriores: log.valoresAnteriores,
        valoresNuevos: log.valoresNuevos,
        direccionIP: log.direccionIP,
        userAgent: log.userAgent,
        descripcion: log.descripcion,
        timestamp: log.timestamp,
      }));

      res.json({
        success: true,
        data: logsFormatted,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total,
          totalPages: Math.ceil(total / filters.limit),
        },
      });
    } catch (error) {
      console.error('Get audit logs error:', error);

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

  // GET /api/audit/:id
  static async getAuditLogById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const auditLog = await prisma.auditoria.findUnique({
        where: { id },
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

      if (!auditLog) {
        return res.status(404).json({
          success: false,
          error: 'Log de auditoría no encontrado',
        });
      }

      // Formatear respuesta
      const logFormatted = {
        id: auditLog.id,
        administrador: {
          id: auditLog.administrador.id,
          email: auditLog.administrador.email,
          username: auditLog.administrador.username,
          nombreCompleto: `${auditLog.administrador.nombres} ${auditLog.administrador.apellidos}`,
        },
        accion: auditLog.accion,
        tipoEntidad: auditLog.tipoEntidad,
        entidadId: auditLog.entidadId,
        valoresAnteriores: auditLog.valoresAnteriores,
        valoresNuevos: auditLog.valoresNuevos,
        direccionIP: auditLog.direccionIP,
        userAgent: auditLog.userAgent,
        descripcion: auditLog.descripcion,
        timestamp: auditLog.timestamp,
      };

      res.json({
        success: true,
        data: logFormatted,
      });
    } catch (error) {
      console.error('Get audit log by id error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // GET /api/audit/user/:userId
  static async getAuditLogsByUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { 
        page = '1', 
        limit = '20',
        accion,
        tipoEntidad,
        fechaDesde,
        fechaHasta 
      } = req.query;

      const filters = {
        page: Number(page),
        limit: Number(limit),
      };
      const offset = (filters.page - 1) * filters.limit;

      // Verificar que el usuario existe
      const user = await prisma.administrador.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          username: true,
          nombres: true,
          apellidos: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado',
        });
      }

      // Construir filtros
      const where: any = { administradorId: userId };

      if (accion) where.accion = accion;
      if (tipoEntidad) where.tipoEntidad = tipoEntidad;

      if (fechaDesde || fechaHasta) {
        where.timestamp = {};
        if (fechaDesde) where.timestamp.gte = new Date(fechaDesde as string);
        if (fechaHasta) where.timestamp.lte = new Date(fechaHasta as string);
      }

      const [auditLogs, total] = await Promise.all([
        prisma.auditoria.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          skip: offset,
          take: filters.limit,
        }),
        prisma.auditoria.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          usuario: user,
          logs: auditLogs,
        },
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total,
          totalPages: Math.ceil(total / filters.limit),
        },
      });
    } catch (error) {
      console.error('Get audit logs by user error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // GET /api/audit/entity/:entityType/:entityId
  static async getAuditLogsByEntity(req: Request, res: Response) {
    try {
      const { entityType, entityId } = req.params;
      const { 
        page = '1', 
        limit = '20',
        accion,
        administradorId,
        fechaDesde,
        fechaHasta 
      } = req.query;

      const filters = {
        page: Number(page),
        limit: Number(limit),
      };
      const offset = (filters.page - 1) * filters.limit;

      // Construir filtros
      const where: any = { 
        tipoEntidad: entityType,
        entidadId: entityId,
      };

      if (accion) where.accion = accion;
      if (administradorId) where.administradorId = administradorId;

      if (fechaDesde || fechaHasta) {
        where.timestamp = {};
        if (fechaDesde) where.timestamp.gte = new Date(fechaDesde as string);
        if (fechaHasta) where.timestamp.lte = new Date(fechaHasta as string);
      }

      const [auditLogs, total] = await Promise.all([
        prisma.auditoria.findMany({
          where,
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
          orderBy: { timestamp: 'desc' },
          skip: offset,
          take: filters.limit,
        }),
        prisma.auditoria.count({ where }),
      ]);

      // Formatear respuesta
      const logsFormatted = auditLogs.map(log => ({
        id: log.id,
        administrador: {
          id: log.administrador.id,
          email: log.administrador.email,
          username: log.administrador.username,
          nombreCompleto: `${log.administrador.nombres} ${log.administrador.apellidos}`,
        },
        accion: log.accion,
        valoresAnteriores: log.valoresAnteriores,
        valoresNuevos: log.valoresNuevos,
        direccionIP: log.direccionIP,
        userAgent: log.userAgent,
        descripcion: log.descripcion,
        timestamp: log.timestamp,
      }));

      res.json({
        success: true,
        data: {
          entidad: {
            tipo: entityType,
            id: entityId,
          },
          logs: logsFormatted,
        },
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total,
          totalPages: Math.ceil(total / filters.limit),
        },
      });
    } catch (error) {
      console.error('Get audit logs by entity error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // GET /api/audit/stats
  static async getAuditStats(req: Request, res: Response) {
    try {
      const { fechaDesde, fechaHasta } = req.query;

      // Construir filtro de fecha
      const dateFilter: any = {};
      if (fechaDesde || fechaHasta) {
        if (fechaDesde) dateFilter.gte = new Date(fechaDesde as string);
        if (fechaHasta) dateFilter.lte = new Date(fechaHasta as string);
      }

      const where = fechaDesde || fechaHasta ? { timestamp: dateFilter } : {};

      // Estadísticas generales
      const [
        totalLogs,
        logsByAction,
        logsByEntity,
        logsByUser,
        recentActivity
      ] = await Promise.all([
        // Total de logs
        prisma.auditoria.count({ where }),

        // Logs por acción
        prisma.auditoria.groupBy({
          by: ['accion'],
          where,
          _count: { accion: true },
          orderBy: { _count: { accion: 'desc' } },
        }),

        // Logs por tipo de entidad
        prisma.auditoria.groupBy({
          by: ['tipoEntidad'],
          where,
          _count: { tipoEntidad: true },
          orderBy: { _count: { tipoEntidad: 'desc' } },
        }),

        // Logs por usuario (top 10)
        prisma.auditoria.groupBy({
          by: ['administradorId'],
          where,
          _count: { administradorId: true },
          orderBy: { _count: { administradorId: 'desc' } },
          take: 10,
        }),

        // Actividad reciente (últimos 10)
        prisma.auditoria.findMany({
          where,
          include: {
            administrador: {
              select: {
                username: true,
                nombres: true,
                apellidos: true,
              },
            },
          },
          orderBy: { timestamp: 'desc' },
          take: 10,
        }),
      ]);

      // Obtener información de usuarios para estadísticas
      const userIds = logsByUser.map(item => item.administradorId);
      const users = await prisma.administrador.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          username: true,
          nombres: true,
          apellidos: true,
        },
      });

      // Mapear usuarios con sus estadísticas
      const userStatsWithNames = logsByUser.map(stat => {
        const user = users.find(u => u.id === stat.administradorId);
        return {
          usuario: user ? {
            id: user.id,
            username: user.username,
            nombreCompleto: `${user.nombres} ${user.apellidos}`,
          } : null,
          totalLogs: stat._count.administradorId,
        };
      });

      res.json({
        success: true,
        data: {
          totalLogs,
          logsByAction: logsByAction.map(item => ({
            accion: item.accion,
            count: item._count.accion,
          })),
          logsByEntity: logsByEntity.map(item => ({
            tipoEntidad: item.tipoEntidad,
            count: item._count.tipoEntidad,
          })),
          topUsers: userStatsWithNames.filter(item => item.usuario !== null),
          recentActivity: recentActivity.map(log => ({
            id: log.id,
            accion: log.accion,
            tipoEntidad: log.tipoEntidad,
            descripcion: log.descripcion,
            administrador: `${log.administrador.nombres} ${log.administrador.apellidos}`,
            timestamp: log.timestamp,
          })),
        },
      });
    } catch (error) {
      console.error('Get audit stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // DELETE /api/audit/cleanup
  static async cleanupOldLogs(req: Request, res: Response) {
    try {
      const { dias = '90' } = req.query; // Por defecto, eliminar logs más antiguos que 90 días
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      // Solo permitir a administradores
      if (userRole !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Solo los administradores pueden realizar esta acción',
        });
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - Number(dias));

      // Contar logs que serán eliminados
      const logsToDelete = await prisma.auditoria.count({
        where: {
          timestamp: {
            lt: cutoffDate,
          },
        },
      });

      // Eliminar logs antiguos
      const result = await prisma.auditoria.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate,
          },
        },
      });

      // Registrar la acción de limpieza
      await prisma.auditoria.create({
        data: {
          administradorId: userId,
          accion: 'ELIMINAR',
          tipoEntidad: 'auditoria',
          entidadId: 'cleanup',
          valoresNuevos: { 
            logsEliminados: result.count,
            fechaCorte: cutoffDate,
            dias: Number(dias) 
          },
          direccionIP: req.ip,
          descripcion: `Limpieza automática de logs de auditoría: ${result.count} registros eliminados`,
        },
      });

      res.json({
        success: true,
        message: `Limpieza completada: ${result.count} logs eliminados`,
        data: {
          logsEliminados: result.count,
          fechaCorte: cutoffDate,
          diasRetencion: Number(dias),
        },
      });
    } catch (error) {
      console.error('Cleanup old logs error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // GET /api/audit/export
  static async exportAuditLogs(req: Request, res: Response) {
    try {
      const { formato = 'json', ...filters } = req.query;
      const userRole = (req as any).user?.role;

      // Solo permitir a administradores
      if (userRole !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Solo los administradores pueden exportar logs de auditoría',
        });
      }

      // Aplicar filtros similares a getAuditLogs pero sin paginación
      const where: any = {};

      if (filters.administradorId) where.administradorId = filters.administradorId as string;
      if (filters.accion) where.accion = filters.accion;
      if (filters.tipoEntidad) where.tipoEntidad = filters.tipoEntidad as string;
      if (filters.fechaDesde || filters.fechaHasta) {
        where.timestamp = {};
        if (filters.fechaDesde) where.timestamp.gte = new Date(filters.fechaDesde as string);
        if (filters.fechaHasta) where.timestamp.lte = new Date(filters.fechaHasta as string);
      }

      const auditLogs = await prisma.auditoria.findMany({
        where,
        include: {
          administrador: {
            select: {
              email: true,
              username: true,
              nombres: true,
              apellidos: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        take: 5000, // Límite de seguridad
      });

      // Formatear para exportación
      const exportData = auditLogs.map(log => ({
        id: log.id,
        timestamp: log.timestamp.toISOString(),
        administrador: {
          email: log.administrador.email,
          username: log.administrador.username,
          nombreCompleto: `${log.administrador.nombres} ${log.administrador.apellidos}`,
        },
        accion: log.accion,
        tipoEntidad: log.tipoEntidad,
        entidadId: log.entidadId,
        valoresAnteriores: log.valoresAnteriores,
        valoresNuevos: log.valoresNuevos,
        direccionIP: log.direccionIP,
        descripcion: log.descripcion,
      }));

      if (formato === 'csv') {
        // Exportar como CSV
        const csvHeaders = 'ID,Timestamp,Email,Usuario,Nombre Completo,Accion,Tipo Entidad,Entidad ID,IP,Descripcion\n';
        const csvData = exportData.map(log => 
          `"${log.id}","${log.timestamp}","${log.administrador.email}","${log.administrador.username}","${log.administrador.nombreCompleto}","${log.accion}","${log.tipoEntidad}","${log.entidadId}","${log.direccionIP || ''}","${log.descripcion || ''}"`
        ).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csvHeaders + csvData);
      } else {
        // Exportar como JSON (por defecto)
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${new Date().toISOString().split('T')[0]}.json"`);
        res.json({
          exportDate: new Date().toISOString(),
          totalRecords: exportData.length,
          filters: filters,
          data: exportData,
        });
      }
    } catch (error) {
      console.error('Export audit logs error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // GET /api/audit/dashboard
  static async getDashboard(req: Request, res: Response) {
    try {
      const { dias = '30' } = req.query;
      const daysCount = Number(dias);

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysCount);
      const endDate = new Date();

      // Obtener todas las métricas del dashboard
      const [
        quickStats,
        activityTimeline,
        userComparison,
        performanceMetrics,
        suspiciousActivity,
        recentLogs,
      ] = await Promise.all([
        // Estadísticas rápidas
        (async () => {
          const where = { timestamp: { gte: startDate } };
          const [total, byAction, byEntity, uniqueUsers] = await Promise.all([
            prisma.auditoria.count({ where }),
            prisma.auditoria.groupBy({
              by: ['accion'],
              where,
              _count: { accion: true },
            }),
            prisma.auditoria.groupBy({
              by: ['tipoEntidad'],
              where,
              _count: { tipoEntidad: true },
            }),
            prisma.auditoria.findMany({
              where,
              select: { administradorId: true },
              distinct: ['administradorId'],
            }),
          ]);

          return {
            totalLogs: total,
            logsByAction: byAction.reduce((acc, item) => {
              acc[item.accion] = item._count.accion;
              return acc;
            }, {} as Record<string, number>),
            logsByEntity: byEntity.reduce((acc, item) => {
              acc[item.tipoEntidad] = item._count.tipoEntidad;
              return acc;
            }, {} as Record<string, number>),
            uniqueUsers: uniqueUsers.length,
          };
        })(),

        // Timeline de actividad
        (async () => {
          const logs = await prisma.auditoria.findMany({
            where: { timestamp: { gte: startDate, lte: endDate } },
            select: { timestamp: true, accion: true },
            orderBy: { timestamp: 'asc' },
          });

          const timeline: Map<string, { count: number; actions: Record<string, number> }> = new Map();

          logs.forEach(log => {
            const key = log.timestamp.toISOString().substring(0, 10); // YYYY-MM-DD
            
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
        })(),

        // Comparación de usuarios
        (async () => {
          const logs = await prisma.auditoria.findMany({
            where: { timestamp: { gte: startDate, lte: endDate } },
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
                entidadesUnicas: new Set<string>(),
              });
            }

            const stats = userStats.get(userId);
            stats.totalAcciones++;
            stats.accionesPorTipo[log.accion] = (stats.accionesPorTipo[log.accion] || 0) + 1;
            stats.entidadesUnicas.add(`${log.tipoEntidad}:${log.entidadId}`);
          });

          return Array.from(userStats.values())
            .map(stat => ({
              ...stat,
              entidadesModificadas: stat.entidadesUnicas.size,
              entidadesUnicas: undefined, // Remover el Set para JSON
            }))
            .sort((a, b) => b.totalAcciones - a.totalAcciones)
            .slice(0, 10); // Top 10
        })(),

        // Métricas de rendimiento
        (async () => {
          const logs = await prisma.auditoria.findMany({
            where: { timestamp: { gte: startDate } },
            select: { timestamp: true, accion: true, tipoEntidad: true },
          });

          const avgOperationsPerDay = logs.length / daysCount;

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
            totalOperations: logs.length,
          };
        })(),

        // Actividad sospechosa
        (async () => {
          const lastHour = new Date();
          lastHour.setHours(lastHour.getHours() - 1);

          const last24Hours = new Date();
          last24Hours.setHours(last24Hours.getHours() - 24);

          // Operaciones masivas
          const massOperations = await prisma.auditoria.groupBy({
            by: ['administradorId', 'accion', 'tipoEntidad'],
            where: {
              timestamp: { gte: lastHour },
              accion: { in: ['CREAR', 'ACTUALIZAR', 'ELIMINAR'] },
            },
            _count: { id: true },
            having: { id: { _count: { gt: 20 } } },
          });

          // Actividad en horarios inusuales
          const unusualLogs = await prisma.auditoria.findMany({
            where: { timestamp: { gte: last24Hours } },
            include: {
              administrador: {
                select: { email: true, username: true },
              },
            },
          });

          const unusualActivityTimes = unusualLogs.filter(log => {
            const hour = log.timestamp.getHours();
            return hour >= 2 && hour <= 6;
          });

          return {
            massOperations: massOperations.length,
            unusualActivityCount: unusualActivityTimes.length,
            hasAlerts: massOperations.length > 0 || unusualActivityTimes.length > 0,
          };
        })(),

        // Logs recientes
        prisma.auditoria.findMany({
          where: { timestamp: { gte: startDate } },
          include: {
            administrador: {
              select: {
                username: true,
                nombres: true,
                apellidos: true,
              },
            },
          },
          orderBy: { timestamp: 'desc' },
          take: 20,
        }),
      ]);

      res.json({
        success: true,
        data: {
          periodo: {
            dias: daysCount,
            desde: startDate,
            hasta: endDate,
          },
          estadisticas: quickStats,
          timeline: activityTimeline,
          topUsuarios: userComparison,
          rendimiento: performanceMetrics,
          alertas: suspiciousActivity,
          actividadReciente: recentLogs.map(log => ({
            id: log.id,
            accion: log.accion,
            tipoEntidad: log.tipoEntidad,
            descripcion: log.descripcion,
            administrador: `${log.administrador.nombres} ${log.administrador.apellidos}`,
            timestamp: log.timestamp,
          })),
        },
      });
    } catch (error) {
      console.error('Get audit dashboard error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // GET /api/audit/suspicious
  static async getSuspiciousActivity(req: Request, res: Response) {
    try {
      const lastHour = new Date();
      lastHour.setHours(lastHour.getHours() - 1);

      const last24Hours = new Date();
      last24Hours.setHours(last24Hours.getHours() - 24);

      // Operaciones masivas en la última hora
      const massOpsRaw = await prisma.auditoria.groupBy({
        by: ['administradorId', 'accion', 'tipoEntidad'],
        where: {
          timestamp: { gte: lastHour },
          accion: { in: ['CREAR', 'ACTUALIZAR', 'ELIMINAR'] },
        },
        _count: { id: true },
        having: { id: { _count: { gt: 20 } } },
      });

      // Obtener información de usuarios para operaciones masivas
      const userIds = massOpsRaw.map(op => op.administradorId);
      const users = await prisma.administrador.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true, nombres: true, apellidos: true },
      });

      const massOperations = massOpsRaw.map(op => {
        const user = users.find(u => u.id === op.administradorId);
        return {
          administrador: user ? {
            id: user.id,
            username: user.username,
            nombreCompleto: `${user.nombres} ${user.apellidos}`,
          } : null,
          accion: op.accion,
          tipoEntidad: op.tipoEntidad,
          cantidad: op._count.id,
          periodo: 'última hora',
        };
      });

      // Actividad en horarios inusuales (2am - 6am)
      const unusualLogs = await prisma.auditoria.findMany({
        where: { timestamp: { gte: last24Hours } },
        include: {
          administrador: {
            select: { id: true, username: true, nombres: true, apellidos: true },
          },
        },
      });

      const unusualActivityTimes = unusualLogs
        .filter(log => {
          const hour = log.timestamp.getHours();
          return hour >= 2 && hour <= 6;
        })
        .map(log => ({
          id: log.id,
          administrador: {
            id: log.administrador.id,
            username: log.administrador.username,
            nombreCompleto: `${log.administrador.nombres} ${log.administrador.apellidos}`,
          },
          accion: log.accion,
          tipoEntidad: log.tipoEntidad,
          timestamp: log.timestamp,
          hora: log.timestamp.getHours(),
        }));

      // Múltiples IPs para un mismo usuario
      const multipleIPs = await prisma.auditoria.groupBy({
        by: ['administradorId', 'direccionIP'],
        where: { timestamp: { gte: last24Hours } },
        _count: { id: true },
      });

      const userIPCounts = new Map<string, Set<string>>();
      multipleIPs.forEach(item => {
        if (!userIPCounts.has(item.administradorId)) {
          userIPCounts.set(item.administradorId, new Set());
        }
        if (item.direccionIP) {
          userIPCounts.get(item.administradorId)!.add(item.direccionIP);
        }
      });

      const suspiciousIPs = Array.from(userIPCounts.entries())
        .filter(([_, ips]) => ips.size > 3) // Más de 3 IPs diferentes
        .map(([userId, ips]) => {
          const user = users.find(u => u.id === userId);
          return {
            administrador: user ? {
              id: user.id,
              username: user.username,
              nombreCompleto: `${user.nombres} ${user.apellidos}`,
            } : null,
            cantidadIPs: ips.size,
            ips: Array.from(ips),
          };
        });

      res.json({
        success: true,
        data: {
          operacionesMasivas: massOperations,
          actividadHorariosInusuales: unusualActivityTimes,
          multiplesIPsPorUsuario: suspiciousIPs,
          totalAlertas: massOperations.length + unusualActivityTimes.length + suspiciousIPs.length,
        },
      });
    } catch (error) {
      console.error('Get suspicious activity error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // GET /api/audit/timeline
  static async getActivityTimeline(req: Request, res: Response) {
    try {
      const {
        fechaDesde,
        fechaHasta,
        groupBy = 'day',
        administradorId,
        tipoEntidad,
      } = req.query;

      const startDate = fechaDesde ? new Date(fechaDesde as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = fechaHasta ? new Date(fechaHasta as string) : new Date();

      const where: any = {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      };

      if (administradorId) where.administradorId = administradorId;
      if (tipoEntidad) where.tipoEntidad = tipoEntidad;

      const logs = await prisma.auditoria.findMany({
        where,
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
          // week
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

      const result = Array.from(timeline.entries()).map(([date, data]) => ({
        date,
        count: data.count,
        actions: data.actions,
      }));

      res.json({
        success: true,
        data: {
          periodo: {
            desde: startDate,
            hasta: endDate,
            agrupacion: groupBy,
          },
          timeline: result,
          totalRegistros: logs.length,
        },
      });
    } catch (error) {
      console.error('Get activity timeline error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // GET /api/audit/entity-history/:type/:id
  static async getEntityHistory(req: Request, res: Response) {
    try {
      const { type, id } = req.params;

      const history = await prisma.auditoria.findMany({
        where: {
          tipoEntidad: type,
          entidadId: id,
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

      const formatted = history.map(log => ({
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
        descripcion: log.descripcion,
        direccionIP: log.direccionIP,
      }));

      res.json({
        success: true,
        data: {
          entidad: {
            tipo: type,
            id: id,
          },
          historial: formatted,
          totalCambios: formatted.length,
        },
      });
    } catch (error) {
      console.error('Get entity history error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }
}