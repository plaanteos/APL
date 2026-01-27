import { Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { AuditService } from '../services/audit.service';
import { cacheDelByPrefix, cacheGetOrSet } from '../utils/cache';

const prisma = new PrismaClient();

// Schemas de validación - Modelo Oficial APL
const createProductoSchema = z.object({
  tipo: z.string().min(2, 'Tipo de producto debe tener al menos 2 caracteres'),
  precio: z.number().positive('El precio debe ser mayor a 0'),
  id_administrador: z.number().int().positive('ID de administrador inválido'),
});

const updateProductoSchema = z.object({
  tipo: z.string().min(2, 'Tipo de producto debe tener al menos 2 caracteres').optional(),
  precio: z.number().positive('El precio debe ser mayor a 0').optional(),
  id_administrador: z.number().int().positive().optional(),
});

export class ProductoController {
  // GET /api/productos
  static async getProductos(req: Request, res: Response) {
    try {
      const { 
        page = 1, 
        limit = 50, 
        search,
        id_administrador,
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);

      // Construir filtros
      const where: any = {};

      if (search) {
        where.tipo = { 
          contains: search as string, 
          mode: 'insensitive' 
        };
      }

      if (id_administrador) {
        where.id_administrador = Number(id_administrador);
      }

      const canCache = !search && Number(page) === 1;
      const cacheKey = canCache
        ? `productos:v1:admin:${id_administrador ? Number(id_administrador) : 'all'}:limit:${Number(limit)}`
        : null;

      // Obtener productos (con caché en el caso típico de catálogo)
      const [productos, total] = cacheKey
        ? await cacheGetOrSet(cacheKey, 60_000, async () => {
          const result = await Promise.all([
            prisma.producto.findMany({
              where,
              include: {
                administrador: {
                  select: {
                    id: true,
                    nombre: true,
                    email: true,
                  },
                },
              },
              orderBy: { tipo: 'asc' },
              skip: offset,
              take: Number(limit),
            }),
            prisma.producto.count({ where }),
          ]);
          return result as [typeof result[0], number];
        })
        : await Promise.all([
          prisma.producto.findMany({
            where,
            include: {
              administrador: {
                select: {
                  id: true,
                  nombre: true,
                  email: true,
                },
              },
            },
            orderBy: { tipo: 'asc' },
            skip: offset,
            take: Number(limit),
          }),
          prisma.producto.count({ where }),
        ]);

      res.json({
        success: true,
        data: productos,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error('Get productos error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // GET /api/productos/:id
  static async getProductoById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const producto = await prisma.producto.findUnique({
        where: { id: Number(id) },
        include: {
          administrador: {
            select: {
              id: true,
              nombre: true,
              email: true,
            },
          },
        },
      });

      if (!producto) {
        return res.status(404).json({
          success: false,
          error: 'Producto no encontrado',
        });
      }

      res.json({
        success: true,
        data: producto,
      });
    } catch (error) {
      console.error('Get producto by id error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // POST /api/productos
  static async createProducto(req: Request, res: Response) {
    try {
      const productoData = createProductoSchema.parse(req.body);

      // Verificar si ya existe un producto con el mismo tipo
      const existingProducto = await prisma.producto.findFirst({
        where: { 
          tipo: productoData.tipo,
          id_administrador: productoData.id_administrador,
        },
      });

      if (existingProducto) {
        return res.status(400).json({
          success: false,
          error: 'Ya existe un producto con este tipo para el administrador',
        });
      }

      // Crear producto
      const newProducto = await prisma.producto.create({
        data: productoData,
        include: {
          administrador: {
            select: {
              id: true,
              nombre: true,
              email: true,
            },
          },
        },
      });

      await cacheDelByPrefix('productos:v1:');

      res.status(201).json({
        success: true,
        message: 'Producto creado exitosamente',
        data: newProducto,
      });
    } catch (error) {
      console.error('Create producto error:', error);

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

  // PUT /api/productos/:id
  static async updateProducto(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = updateProductoSchema.parse(req.body);

      // Verificar que el producto existe
      const existingProducto = await prisma.producto.findUnique({
        where: { id: Number(id) },
      });

      if (!existingProducto) {
        return res.status(404).json({
          success: false,
          error: 'Producto no encontrado',
        });
      }

      // Si se está actualizando el tipo, verificar que no esté en uso
      if (updateData.tipo && updateData.tipo !== existingProducto.tipo) {
        const tipoExists = await prisma.producto.findFirst({
          where: { 
            tipo: updateData.tipo,
            id_administrador: existingProducto.id_administrador,
          },
        });

        if (tipoExists) {
          return res.status(400).json({
            success: false,
            error: 'Ya existe un producto con este tipo',
          });
        }
      }

      // Actualizar producto
      const updatedProducto = await prisma.producto.update({
        where: { id: Number(id) },
        data: updateData,
        include: {
          administrador: {
            select: {
              id: true,
              nombre: true,
              email: true,
            },
          },
        },
      });

      await cacheDelByPrefix('productos:v1:');

      // Registrar auditoría
      res.json({
        success: true,
        message: 'Producto actualizado exitosamente',
        data: updatedProducto,
      });
    } catch (error) {
      console.error('Update producto error:', error);

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

  // DELETE /api/productos/:id
  static async deleteProducto(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Verificar que el producto existe
      const existingProducto = await prisma.producto.findUnique({
        where: { id: Number(id) },
        include: {
          detalles: true, // Verificar si está en uso en detalles de pedidos
        },
      });

      if (!existingProducto) {
        return res.status(404).json({
          success: false,
          error: 'Producto no encontrado',
        });
      }

      // Verificar que no esté en uso
      if (existingProducto.detalles.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'No se puede eliminar un producto que está siendo utilizado en pedidos',
        });
      }

      // Eliminar producto
      await prisma.producto.delete({
        where: { id: Number(id) },
      });

      await cacheDelByPrefix('productos:v1:');

      // Registrar auditoría
      res.json({
        success: true,
        message: 'Producto eliminado exitosamente',
      });
    } catch (error) {
      console.error('Delete producto error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // GET /api/productos/stats - Estadísticas de productos
  static async getProductosStats(req: Request, res: Response) {
    try {
      const totalProductos = await prisma.producto.count();

      // Top 5 productos más usados
      const topProductos = await prisma.detallePedido.groupBy({
        by: ['id_producto'],
        _count: {
          id: true,
        },
        _sum: {
          cantidad: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: 5,
      });

      // Enriquecer con datos del producto
      const topProductosConDetalles = await Promise.all(
        topProductos.map(async (item: any) => {
          const producto = await prisma.producto.findUnique({
            where: { id: item.id_producto },
            select: {
              id: true,
              tipo: true,
              precio: true,
            },
          });
          return {
            ...producto,
            vecesUsado: item._count.id,
            cantidadTotal: item._sum.cantidad,
          };
        })
      );

      res.json({
        success: true,
        data: {
          totalProductos,
          topProductos: topProductosConDetalles,
        },
      });
    } catch (error) {
      console.error('Get productos stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }
}

