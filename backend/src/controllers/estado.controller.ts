import { Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { AuditService } from '../services/audit.service';
import { cacheDel, cacheGetOrSet } from '../utils/cache';

const prisma = new PrismaClient();

// Schema de validación - Modelo Oficial APL
const createEstadoSchema = z.object({
  descripcion: z.string().min(2, 'Descripción debe tener al menos 2 caracteres').max(50, 'Descripción no puede exceder 50 caracteres'),
});

const updateEstadoSchema = z.object({
  descripcion: z.string().min(2, 'Descripción debe tener al menos 2 caracteres').max(50, 'Descripción no puede exceder 50 caracteres').optional(),
});

export class EstadoController {
  // GET /api/estados - Obtener catálogo de estados activos
  static async getEstados(req: Request, res: Response) {
    try {
      const estados = await cacheGetOrSet('estados:activos:v1', 60_000, async () => {
        return prisma.estado.findMany({
          where: {
            fecha_delete: null, // Solo estados activos
          },
          orderBy: { descripcion: 'asc' },
        });
      });

      res.json({
        success: true,
        data: estados,
      });
    } catch (error) {
      console.error('Get estados error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // GET /api/estados/:id
  static async getEstadoById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const estado = await prisma.estado.findUnique({
        where: { id: Number(id) },
      });

      if (!estado) {
        return res.status(404).json({
          success: false,
          error: 'Estado no encontrado',
        });
      }

      res.json({
        success: true,
        data: estado,
      });
    } catch (error) {
      console.error('Get estado by id error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // POST /api/estados - Crear nuevo estado (admin)
  static async createEstado(req: Request, res: Response) {
    try {
      const estadoData = createEstadoSchema.parse(req.body);

      // Verificar si ya existe un estado con la misma descripción
      const existingEstado = await prisma.estado.findFirst({
        where: { 
          descripcion: estadoData.descripcion,
          fecha_delete: null,
        },
      });

      if (existingEstado) {
        return res.status(400).json({
          success: false,
          error: 'Ya existe un estado con esta descripción',
        });
      }

      // Crear estado
      const newEstado = await prisma.estado.create({
        data: estadoData,
      });

      await cacheDel('estados:activos:v1');

      res.status(201).json({
        success: true,
        message: 'Estado creado exitosamente',
        data: newEstado,
      });
    } catch (error) {
      console.error('Create estado error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Datos de entrada inválidos',
          details: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // PUT /api/estados/:id - Actualizar estado
  static async updateEstado(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = updateEstadoSchema.parse(req.body);

      // Verificar que el estado existe
      const existingEstado = await prisma.estado.findUnique({
        where: { id: Number(id) },
      });

      if (!existingEstado || existingEstado.fecha_delete) {
        return res.status(404).json({
          success: false,
          error: 'Estado no encontrado',
        });
      }

      // Si se está actualizando la descripción, verificar que no esté en uso
      if (updateData.descripcion && updateData.descripcion !== existingEstado.descripcion) {
        const descripcionExists = await prisma.estado.findFirst({
          where: { 
            descripcion: updateData.descripcion,
            fecha_delete: null,
          },
        });

        if (descripcionExists) {
          return res.status(400).json({
            success: false,
            error: 'Ya existe un estado con esta descripción',
          });
        }
      }

      // Actualizar estado
      const updatedEstado = await prisma.estado.update({
        where: { id: Number(id) },
        data: updateData,
      });

      await cacheDel('estados:activos:v1');

      // Registrar auditoría
      res.json({
        success: true,
        message: 'Estado actualizado exitosamente',
        data: updatedEstado,
      });
    } catch (error) {
      console.error('Update estado error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Datos de entrada inválidos',
          details: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // DELETE /api/estados/:id - Soft delete (marcar fecha_delete)
  static async deleteEstado(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Verificar que el estado existe
      const existingEstado = await prisma.estado.findUnique({
        where: { id: Number(id) },
        include: {
          detalles: {
            where: {
              pedido: {
                fecha_delete: null, // Solo considerar pedidos activos
              },
            },
          },
        },
      });

      if (!existingEstado || existingEstado.fecha_delete) {
        return res.status(404).json({
          success: false,
          error: 'Estado no encontrado',
        });
      }

      // Verificar que no esté en uso en pedidos activos
      if (existingEstado.detalles.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'No se puede eliminar un estado que está siendo utilizado en pedidos activos',
        });
      }

      // Soft delete: marcar fecha_delete
      await prisma.estado.update({
        where: { id: Number(id) },
        data: { fecha_delete: new Date() },
      });

      await cacheDel('estados:activos:v1');

      res.json({
        success: true,
        message: 'Estado eliminado exitosamente',
      });
    } catch (error) {
      console.error('Delete estado error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // GET /api/estados/stats - Estadísticas de estados
  static async getEstadosStats(req: Request, res: Response) {
    try {
      const totalEstados = await prisma.estado.count({
        where: {
          fecha_delete: null,
        },
      });

      // Cantidad de detalles por estado
      const estadosConUso = await prisma.estado.findMany({
        where: {
          fecha_delete: null,
        },
        include: {
          _count: {
            select: {
              detalles: true,
            },
          },
        },
        orderBy: {
          descripcion: 'asc',
        },
      });

      res.json({
        success: true,
        data: {
          totalEstados,
          estadosConUso: estadosConUso.map((est: any) => ({
            id: est.id,
            descripcion: est.descripcion,
            cantidadUsos: est._count.detalles,
          })),
        },
      });
    } catch (error) {
      console.error('Get estados stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }
}

