import { Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { AuditService } from '../services/audit.service';

const prisma = new PrismaClient();

type AuthUser = {
  id: number;
  email: string;
  super_usuario: boolean;
};

type AuthRequest = Request & {
  user?: AuthUser;
};

const parseDateInput = (raw: string) => {
  const value = String(raw ?? '').trim();
  // Si viene como fecha simple (YYYY-MM-DD), guardamos como mediodía UTC para evitar
  // corrimientos por zona horaria (ej: UTC-3 lo mostraría como el día anterior si fuera 00:00Z).
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(`${value}T12:00:00.000Z`);
    if (Number.isNaN(d.getTime())) throw new Error('Fecha inválida');
    return d;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error('Fecha inválida');
  return d;
};

// ============================================
// SCHEMAS DE VALIDACIÓN - MODELO OFICIAL APL
// ============================================

const detalleSchema = z.object({
  id_producto: z.coerce.number().int().positive('ID de producto inválido'),
  cantidad: z.coerce.number().int().positive('Cantidad debe ser mayor a 0'),
  precio_unitario: z.coerce.number().positive('Precio debe ser mayor a 0'),
  paciente: z.coerce.string().trim().min(2, 'Nombre del paciente requerido'),
  id_estado: z.coerce.number().int().positive('ID de estado inválido'),
});

const createOrderSchema = z.object({
  id_cliente: z.coerce.number().int().positive('ID de cliente inválido'),
  fecha_entrega: z.union([
    z.string().min(1).transform((str) => parseDateInput(str)),
    z.date(),
  ]),
  // id_administrador se toma del JWT (req.user)
  descripcion: z.coerce.string().trim().max(2000, 'Descripción demasiado larga').optional(),
  detalles: z.array(detalleSchema).min(1, 'Debe incluir al menos un detalle de pedido'),
});

const updateOrderSchema = z.object({
  fecha_entrega: z.union([
    z.string().min(1).transform((str) => parseDateInput(str)),
    z.date(),
  ]).optional(),
  id_administrador: z.coerce.number().int().positive().optional(),
});

const updateDetalleSchema = z.object({
  cantidad: z.coerce.number().int().positive().optional(),
  precio_unitario: z.coerce.number().positive().optional(),
  paciente: z.coerce.string().trim().min(2).optional(),
  id_estado: z.coerce.number().int().positive().optional(),
});

const logError = (context: string, error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(context, message);
  if (error instanceof Error && error.stack) {
    console.error(error.stack);
  }
};

// ============================================
// FUNCIONES AUXILIARES
// ============================================

/**
 * Calcula el monto total de un pedido desde sus detalles
 */
const calculateOrderTotal = (detalles: any[]): number => {
  return detalles.reduce((sum, det) => sum + (det.cantidad * Number(det.precio_unitario)), 0);
};

/**
 * Calcula el monto pagado de un pedido desde sus detalles de pago
 */
const calculateOrderPaid = (detallesPago: any[]): number => {
  return detallesPago.reduce((sum, det) => sum + Number(det.valor), 0);
};

/**
 * Formatea un pedido con cálculos dinámicos
 */
const formatOrderWithCalculations = (pedido: any) => {
  const montoTotal = calculateOrderTotal(pedido.detalles || []);
  const montoPagado = calculateOrderPaid(pedido.detallesPago || []);
  const montoPendiente = montoTotal - montoPagado;

  return {
    id: pedido.id,
    id_cliente: pedido.id_cliente,
    nombreCliente: pedido.cliente?.nombre || '',
    fecha_pedido: pedido.fecha_pedido,
    fecha_entrega: pedido.fecha_entrega,
    id_administrador: pedido.id_administrador,
    descripcion: pedido.descripcion ?? '',
    detalles: (pedido.detalles || []).map((det: any) => ({
      id: det.id,
      id_producto: det.id_producto,
      tipoProducto: det.producto?.tipo || '',
      cantidad: det.cantidad,
      precio_unitario: Number(det.precio_unitario),
      paciente: det.paciente,
      id_estado: det.id_estado,
      estadoDescripcion: det.estado?.descripcion || '',
      subtotal: det.cantidad * Number(det.precio_unitario),
    })),
    montoTotal,
    montoPagado,
    montoPendiente,
    cantidadDetalles: pedido.detalles?.length || 0,
    cantidadPagos: pedido.detallesPago?.length || 0,
  };
};

// ============================================
// ORDER CONTROLLER
// ============================================

export class OrderController {
  // GET /api/orders - Listar pedidos con cálculos dinámicos
  static async getOrders(req: Request, res: Response) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        id_cliente,
        id_estado,
        dateFrom,
        dateTo,
        activos = 'true',
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);

      // Construir filtros
      const where: any = {};

      // Solo pedidos activos por defecto
      if (activos === 'true') {
        where.fecha_delete = null;
      }

      if (search) {
        where.OR = [
          { cliente: { nombre: { contains: search as string, mode: 'insensitive' } } },
          { detalles: { some: { paciente: { contains: search as string, mode: 'insensitive' } } } },
        ];
      }

      if (id_cliente) {
        where.id_cliente = Number(id_cliente);
      }

      if (id_estado) {
        where.detalles = {
          some: {
            id_estado: Number(id_estado),
          },
        };
      }

      if (dateFrom || dateTo) {
        where.fecha_pedido = {};
        if (dateFrom) where.fecha_pedido.gte = new Date(dateFrom as string);
        if (dateTo) where.fecha_pedido.lte = new Date(dateTo as string);
      }

      const [pedidos, total] = await Promise.all([
        prisma.pedido.findMany({
          where,
          include: {
            cliente: {
              select: {
                id: true,
                nombre: true,
                email: true,
                telefono: true,
              },
            },
            administrador: {
              select: {
                id: true,
                nombre: true,
                email: true,
              },
            },
            detalles: {
              include: {
                producto: true,
                estado: true,
              },
            },
            detallesPago: true,
          },
          orderBy: { fecha_pedido: 'desc' },
          skip: offset,
          take: Number(limit),
        }),
        prisma.pedido.count({ where }),
      ]);

      // Formatear con cálculos
      const pedidosFormatted = pedidos.map(formatOrderWithCalculations);

      res.json({
        success: true,
        data: pedidosFormatted,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error('Get orders error:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // GET /api/orders/:id - Obtener pedido por ID con detalles completos
  static async getOrderById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const pedido = await prisma.pedido.findUnique({
        where: { id: Number(id) },
        include: {
          cliente: true,
          administrador: {
            select: {
              id: true,
              nombre: true,
              email: true,
            },
          },
          detalles: {
            include: {
              producto: true,
              estado: true,
            },
          },
          detallesPago: {
            include: {
              pago: true,
            },
          },
        },
      });

      if (!pedido || pedido.fecha_delete) {
        return res.status(404).json({
          success: false,
          error: 'Pedido no encontrado',
        });
      }

      const formatted = formatOrderWithCalculations(pedido);

      res.json({
        success: true,
        data: {
          ...formatted,
          cliente: pedido.cliente,
          administrador: pedido.administrador,
          pagos: pedido.detallesPago.map(dp => ({
            id_pago: dp.id_pago,
            valor: Number(dp.valor),
            fecha_pago: dp.fecha_pago,
          })),
        },
      });
    } catch (error) {
      console.error('Get order by id error:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // POST /api/orders - Crear nuevo pedido con detalles
  static async createOrder(req: Request, res: Response) {
    try {
      const orderData = createOrderSchema.parse(req.body);

      const authReq = req as AuthRequest;
      const adminId = authReq.user?.id;
      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Acceso denegado. Usuario no autenticado.',
        });
      }

      // Verificar que el cliente existe
      const cliente = await prisma.cliente.findUnique({
        where: { id: orderData.id_cliente },
      });

      if (!cliente) {
        return res.status(404).json({
          success: false,
          error: 'Cliente no encontrado',
        });
      }

      // Verificar que el administrador existe
      const admin = await prisma.administrador.findUnique({
        where: { id: adminId },
      });

      if (!admin) {
        return res.status(404).json({
          success: false,
          error: 'Administrador no encontrado',
        });
      }

      // Verificar que todos los productos existen
      const productIds = orderData.detalles.map(d => d.id_producto);
      const productos = await prisma.producto.findMany({
        where: { id: { in: productIds } },
      });

      if (productos.length !== productIds.length) {
        return res.status(400).json({
          success: false,
          error: 'Uno o más productos no existen',
        });
      }

      // Verificar que todos los estados existen
      const estadoIds = orderData.detalles.map(d => d.id_estado);
      const estados = await prisma.estado.findMany({
        where: {
          id: { in: estadoIds },
          fecha_delete: null,
        },
      });

      if (estados.length !== estadoIds.length) {
        return res.status(400).json({
          success: false,
          error: 'Uno o más estados no existen o están inactivos',
        });
      }

      // Crear pedido con detalles en una transacción
      const newPedido = await prisma.$transaction(async (tx) => {
        // Crear el pedido
        const pedido = await tx.pedido.create({
          data: {
            id_cliente: orderData.id_cliente,
            fecha_entrega: orderData.fecha_entrega,
            id_administrador: adminId,
            descripcion: orderData.descripcion,
          },
        });

        // Crear los detalles
        await tx.detallePedido.createMany({
          data: orderData.detalles.map(detalle => ({
            id_pedido: pedido.id,
            id_producto: detalle.id_producto,
            cantidad: detalle.cantidad,
            precio_unitario: detalle.precio_unitario,
            paciente: detalle.paciente,
            id_estado: detalle.id_estado,
          })),
        });

        // Obtener el pedido completo con detalles
        return await tx.pedido.findUnique({
          where: { id: pedido.id },
          include: {
            cliente: true,
            administrador: {
              select: {
                id: true,
                nombre: true,
                email: true,
              },
            },
            detalles: {
              include: {
                producto: true,
                estado: true,
              },
            },
            detallesPago: true,
          },
        });
      });

      if (!newPedido) {
        throw new Error('Error creando pedido');
      }

      const formatted = formatOrderWithCalculations(newPedido);

      res.status(201).json({
        success: true,
        message: 'Pedido creado exitosamente',
        data: formatted,
      });
    } catch (error) {
      logError('Create order error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Datos de entrada inválidos',
          details: error.errors,
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // PUT /api/orders/:id - Actualizar pedido
  static async updateOrder(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = updateOrderSchema.parse(req.body);

      const existingOrder = await prisma.pedido.findUnique({
        where: { id: Number(id) },
      });

      if (!existingOrder || existingOrder.fecha_delete) {
        return res.status(404).json({
          success: false,
          error: 'Pedido no encontrado',
        });
      }

      const updatedOrder = await prisma.pedido.update({
        where: { id: Number(id) },
        data: updateData,
        include: {
          cliente: true,
          administrador: {
            select: {
              id: true,
              nombre: true,
              email: true,
            },
          },
          detalles: {
            include: {
              producto: true,
              estado: true,
            },
          },
          detallesPago: true,
        },
      });

      const formatted = formatOrderWithCalculations(updatedOrder);

      res.json({
        success: true,
        message: 'Pedido actualizado exitosamente',
        data: formatted,
      });
    } catch (error) {
      console.error('Update order error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Datos de entrada inválidos',
          details: error.errors,
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // DELETE /api/orders/:id - Soft delete (marcar fecha_delete)
  static async deleteOrder(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const existingOrder = await prisma.pedido.findUnique({
        where: { id: Number(id) },
        include: {
          detallesPago: true,
        },
      });

      if (!existingOrder || existingOrder.fecha_delete) {
        return res.status(404).json({
          success: false,
          error: 'Pedido no encontrado',
        });
      }

      // Verificar que no tenga pagos
      if (existingOrder.detallesPago.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'No se puede eliminar un pedido que tiene pagos registrados',
        });
      }

      // Soft delete
      await prisma.pedido.update({
        where: { id: Number(id) },
        data: { fecha_delete: new Date() },
      });

      res.json({
        success: true,
        message: 'Pedido eliminado exitosamente',
      });
    } catch (error) {
      console.error('Delete order error:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // POST /api/orders/:id/detalles - Agregar detalle a pedido existente
  static async addDetalle(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const detalleData = detalleSchema.parse(req.body);

      const pedido = await prisma.pedido.findUnique({
        where: { id: Number(id) },
      });

      if (!pedido || pedido.fecha_delete) {
        return res.status(404).json({
          success: false,
          error: 'Pedido no encontrado',
        });
      }

      // Verificar producto y estado
      const [producto, estado] = await Promise.all([
        prisma.producto.findUnique({ where: { id: detalleData.id_producto } }),
        prisma.estado.findUnique({ where: { id: detalleData.id_estado } }),
      ]);

      if (!producto) {
        return res.status(404).json({
          success: false,
          error: 'Producto no encontrado',
        });
      }

      if (!estado || estado.fecha_delete) {
        return res.status(404).json({
          success: false,
          error: 'Estado no encontrado o inactivo',
        });
      }

      const newDetalle = await prisma.detallePedido.create({
        data: {
          id_pedido: Number(id),
          ...detalleData,
        },
        include: {
          producto: true,
          estado: true,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Detalle agregado exitosamente',
        data: {
          id: newDetalle.id,
          id_producto: newDetalle.id_producto,
          tipoProducto: newDetalle.producto.tipo,
          cantidad: newDetalle.cantidad,
          precio_unitario: Number(newDetalle.precio_unitario),
          paciente: newDetalle.paciente,
          id_estado: newDetalle.id_estado,
          estadoDescripcion: newDetalle.estado.descripcion,
          subtotal: newDetalle.cantidad * Number(newDetalle.precio_unitario),
        },
      });
    } catch (error) {
      console.error('Add detalle error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Datos de entrada inválidos',
          details: error.errors,
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // PUT /api/orders/:id/detalles/:detalleId - Actualizar detalle
  static async updateDetalle(req: Request, res: Response) {
    try {
      const { id, detalleId } = req.params;
      const updateData = updateDetalleSchema.parse(req.body);

      const detalle = await prisma.detallePedido.findUnique({
        where: { id: Number(detalleId) },
        include: { pedido: true },
      });

      if (!detalle || detalle.id_pedido !== Number(id)) {
        return res.status(404).json({
          success: false,
          error: 'Detalle no encontrado',
        });
      }

      if (detalle.pedido.fecha_delete) {
        return res.status(400).json({
          success: false,
          error: 'No se puede modificar un detalle de un pedido eliminado',
        });
      }

      const updatedDetalle = await prisma.detallePedido.update({
        where: { id: Number(detalleId) },
        data: updateData,
        include: {
          producto: true,
          estado: true,
        },
      });

      res.json({
        success: true,
        message: 'Detalle actualizado exitosamente',
        data: {
          id: updatedDetalle.id,
          id_producto: updatedDetalle.id_producto,
          tipoProducto: updatedDetalle.producto.tipo,
          cantidad: updatedDetalle.cantidad,
          precio_unitario: Number(updatedDetalle.precio_unitario),
          paciente: updatedDetalle.paciente,
          id_estado: updatedDetalle.id_estado,
          estadoDescripcion: updatedDetalle.estado.descripcion,
          subtotal: updatedDetalle.cantidad * Number(updatedDetalle.precio_unitario),
        },
      });
    } catch (error) {
      console.error('Update detalle error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Datos de entrada inválidos',
          details: error.errors,
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // DELETE /api/orders/:id/detalles/:detalleId - Eliminar detalle
  static async deleteDetalle(req: Request, res: Response) {
    try {
      const { id, detalleId } = req.params;

      const detalle = await prisma.detallePedido.findUnique({
        where: { id: Number(detalleId) },
        include: { pedido: true },
      });

      if (!detalle || detalle.id_pedido !== Number(id)) {
        return res.status(404).json({
          success: false,
          error: 'Detalle no encontrado',
        });
      }

      if (detalle.pedido.fecha_delete) {
        return res.status(400).json({
          success: false,
          error: 'No se puede eliminar un detalle de un pedido eliminado',
        });
      }

      // Verificar que el pedido tenga al menos 2 detalles
      const detallesCount = await prisma.detallePedido.count({
        where: { id_pedido: Number(id) },
      });

      if (detallesCount <= 1) {
        return res.status(400).json({
          success: false,
          error: 'No se puede eliminar el único detalle del pedido. Elimine el pedido completo.',
        });
      }

      await prisma.detallePedido.delete({
        where: { id: Number(detalleId) },
      });

      res.json({
        success: true,
        message: 'Detalle eliminado exitosamente',
      });
    } catch (error) {
      console.error('Delete detalle error:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // GET /api/orders/stats - Estadísticas de pedidos
  static async getOrdersStats(req: Request, res: Response) {
    try {
      const totalPedidos = await prisma.pedido.count({
        where: { fecha_delete: null },
      });

      // Pedidos por estado (contando detalles)
      const pedidosPorEstado = await prisma.estado.findMany({
        where: { fecha_delete: null },
        include: {
          _count: {
            select: {
              detalles: {
                where: {
                  pedido: {
                    fecha_delete: null,
                  },
                },
              },
            },
          },
        },
      });

      // Productos más pedidos
      const topProductos = await prisma.detallePedido.groupBy({
        by: ['id_producto'],
        where: {
          pedido: {
            fecha_delete: null,
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

      const topProductosDetalle = await Promise.all(
        topProductos.map(async (item: any) => {
          const producto = await prisma.producto.findUnique({
            where: { id: item.id_producto },
          });
          return {
            id_producto: item.id_producto,
            tipoProducto: producto?.tipo || 'Desconocido',
            vecesOrdenado: item._count.id,
            cantidadTotal: item._sum.cantidad,
          };
        })
      );

      res.json({
        success: true,
        data: {
          totalPedidos,
          pedidosPorEstado: pedidosPorEstado.map((est: any) => ({
            id: est.id,
            descripcion: est.descripcion,
            cantidad: est._count.detalles,
          })),
          topProductos: topProductosDetalle,
        },
      });
    } catch (error) {
      console.error('Get orders stats error:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  /**
   * PATCH /api/orders/:id/deliver - Marcar pedido como entregado
   */
  static async markAsDelivered(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const pedido = await prisma.pedido.findUnique({
        where: { id: Number(id) },
      });

      if (!pedido || pedido.fecha_delete) {
        return res.status(404).json({
          success: false,
          error: 'Pedido no encontrado',
        });
      }

      if (pedido.fecha_entrega && pedido.fecha_entrega <= new Date()) {
        return res.status(400).json({
          success: false,
          error: 'El pedido ya está marcado como entregado',
        });
      }

      // Marcar como entregado con la fecha actual
      const updatedOrder = await prisma.pedido.update({
        where: { id: Number(id) },
        data: { fecha_entrega: new Date() },
        include: {
          cliente: true,
          administrador: {
            select: {
              id: true,
              nombre: true,
              email: true,
            },
          },
          detalles: {
            include: {
              producto: true,
              estado: true,
            },
          },
          detallesPago: true,
        },
      });

      const formatted = formatOrderWithCalculations(updatedOrder);

      // Registrar en auditoría
      const usuario = (req as any).user?.usuario || 'sistema';
      await AuditService.log(
        usuario,
        `ORDER_DELIVERED - Pedido #${id} marcado como entregado`
      );

      res.json({
        success: true,
        message: 'Pedido marcado como entregado exitosamente',
        data: formatted,
      });
    } catch (error) {
      console.error('Mark as delivered error:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }
}

