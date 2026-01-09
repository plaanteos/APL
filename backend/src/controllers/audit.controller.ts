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
          { descripcion: { contains: filters.search, mode: 'insensitive' } },
          { tipoEntidad: { contains: filters.search, mode: 'insensitive' } },
          { administrador: { email: { contains: filters.search, mode: 'insensitive' } } },
          { administrador: { username: { contains: filters.search, mode: 'insensitive' } } },
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
}