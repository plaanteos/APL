import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { AuditService } from '../services/audit.service';
import { cacheDelByPrefix, cacheGetOrSet } from '../utils/cache';

type AuthUser = {
  id: number;
  email: string;
  super_usuario: boolean;
};

type AuthRequest = Request & {
  user?: AuthUser;
};

// Schemas de validación - Modelo Oficial APL
const createProductoSchema = z.object({
  tipo: z.string().min(2, 'Tipo de producto debe tener al menos 2 caracteres'),
  // Compat: el frontend puede enviarlo, pero el backend lo ignora para no permitir fuga entre admins.
  id_administrador: z.number().int().positive('ID de administrador inválido').optional(),
});

const updateProductoSchema = z.object({
  tipo: z.string().min(2, 'Tipo de producto debe tener al menos 2 caracteres').optional(),
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
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);

      const authReq = req as AuthRequest;
      const adminId = authReq.user?.id;
      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Acceso denegado. Usuario no autenticado.',
        });
      }

      // Construir filtros
      const where: any = {};

      // Multi-admin: por defecto, solo catálogo del admin autenticado.
      where.id_administrador = adminId;

      if (search) {
        where.tipo = { 
          contains: search as string, 
          mode: 'insensitive' 
        };
      }

      const canCache = !search && Number(page) === 1;
      const cacheKey = canCache
        ? `productos:v1:admin:${adminId}:limit:${Number(limit)}`
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

      const authReq = req as AuthRequest;
      const adminId = authReq.user?.id;
      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Acceso denegado. Usuario no autenticado.',
        });
      }

      const producto = await prisma.producto.findFirst({
        where: { id: Number(id), id_administrador: adminId },
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

      const authReq = req as AuthRequest;
      const adminId = authReq.user?.id;
      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Acceso denegado. Usuario no autenticado.',
        });
      }

      const effectiveAdminId = adminId;

      // Verificar si ya existe un producto con el mismo tipo
      const existingProducto = await prisma.producto.findFirst({
        where: { 
          tipo: productoData.tipo,
          id_administrador: effectiveAdminId,
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
        data: {
          tipo: productoData.tipo,
          id_administrador: effectiveAdminId,
        },
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

      const authReq = req as AuthRequest;
      const adminId = authReq.user?.id;
      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Acceso denegado. Usuario no autenticado.',
        });
      }

      // Verificar que el producto existe
      const existingProducto = await prisma.producto.findFirst({
        where: { id: Number(id), id_administrador: adminId },
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
        data: {
          ...(updateData.tipo ? { tipo: updateData.tipo } : {}),
        },
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

      const authReq = req as AuthRequest;
      const adminId = authReq.user?.id;
      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Acceso denegado. Usuario no autenticado.',
        });
      }

      // Verificar que el producto existe
      const existingProducto = await prisma.producto.findFirst({
        where: { id: Number(id), id_administrador: adminId },
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
      const authReq = req as AuthRequest;
      const adminId = authReq.user?.id;
      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Acceso denegado. Usuario no autenticado.',
        });
      }

      const totalProductos = await prisma.producto.count({ where: { id_administrador: adminId } });

      // Top 5 productos más usados
      const topProductos = await prisma.detallePedido.groupBy({
        by: ['id_producto'],
        where: {
          producto: {
            id_administrador: adminId,
          },
        },
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

