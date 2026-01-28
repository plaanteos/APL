import { Request, Response } from 'express';
import { z } from 'zod';
import { AuditService } from '../services/audit.service';

/**
 * Controlador de Auditoría - Modelo Oficial APL
 * Tabla auditoria: id, usuario, fecha_accion, accion
 */

// Schemas de validación
const auditFiltersSchema = z.object({
  page: z.string().transform(Number).optional().default('1'),
  limit: z.string().transform(Number).optional().default('50'),
  usuario: z.string().optional(),
  accion: z.string().optional(),
});

export class AuditController {
  /**
   * GET /api/audit
   * Obtiene logs de auditoría con filtros
   */
  static async getAuditLogs(req: Request, res: Response) {
    try {
      const filters = auditFiltersSchema.parse(req.query);
      const skip = (filters.page - 1) * filters.limit;

      let logs;

      if (filters.usuario) {
        // Filtrar por usuario
        logs = await AuditService.getLogsByUsuario(filters.usuario, filters.limit, skip);
      } else if (filters.accion) {
        // Filtrar por acción
        logs = await AuditService.getLogsByAccion(filters.accion, filters.limit, skip);
      } else {
        // Obtener todos
        logs = await AuditService.getLogs(filters.limit, skip);
      }

      res.json({
        success: true,
        data: logs,
        page: filters.page,
        limit: filters.limit,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Datos de entrada inválidos',
          details: error.errors,
        });
      }

      console.error('Error al obtener logs de auditoría:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener logs de auditoría',
      });
    }
  }

  /**
   * GET /api/audit/stats
   * Obtiene estadísticas de auditoría
   */
  static async getAuditStats(req: Request, res: Response) {
    try {
      const { days = '7' } = req.query;
      const diasNum = parseInt(days as string, 10);

      const stats = await AuditService.getStats(diasNum);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('Error al obtener estadísticas de auditoría:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener estadísticas de auditoría',
      });
    }
  }

  /**
   * DELETE /api/audit/cleanup
   * Limpia logs antiguos (solo super usuarios)
   */
  static async cleanupOldLogs(req: Request, res: Response) {
    try {
      const { retentionDays = '90' } = req.body;
      const diasNum = parseInt(retentionDays as string, 10);

      if (diasNum < 30) {
        return res.status(400).json({
          success: false,
          error: 'El período de retención mínimo es de 30 días',
        });
      }

      const deletedCount = await AuditService.cleanOldLogs(diasNum);

      res.json({
        success: true,
        data: {
          deletedCount,
          message: `Se eliminaron ${deletedCount} registros de auditoría`,
        },
      });
    } catch (error: any) {
      console.error('Error al limpiar logs de auditoría:', error);
      res.status(500).json({
        success: false,
        error: 'Error al limpiar logs de auditoría',
      });
    }
  }
}

