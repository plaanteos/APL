import { Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { AuditService } from '../services/audit.service';

const prisma = new PrismaClient();

// Schemas de validación
const createOrderSchema = z.object({
  clienteId: z.string().cuid('ID de cliente inválido'),
  nombrePaciente: z.string().min(2, 'Nombre del paciente requerido'),
  fechaVencimiento: z.string().transform((str) => new Date(str)),
  descripcion: z.string().min(10, 'Descripción debe tener al menos 10 caracteres'),
  tipoPedido: z.string().min(2, 'Tipo de pedido requerido'),
  cantidad: z.number().int().min(1, 'Cantidad debe ser mayor a 0'),
  precioUnitario: z.number().positive('Precio debe ser mayor a 0'),
  prioridad: z.enum(['BAJA', 'NORMAL', 'ALTA', 'URGENTE']).default('NORMAL'),
  observaciones: z.string().optional(),
  detalles: z.array(z.object({
    descripcion: z.string().min(2, 'Descripción del detalle requerida'),
    tipoTrabajo: z.string().min(2, 'Tipo de trabajo requerido'),
    material: z.string().optional(),
    cantidad: z.number().int().min(1, 'Cantidad debe ser mayor a 0'),
    precioUnitario: z.number().positive('Precio debe ser mayor a 0'),
    observaciones: z.string().optional(),
  })).default([]),
});

const updateOrderSchema = z.object({
  nombrePaciente: z.string().min(2).optional(),
  fechaVencimiento: z.string().transform((str) => new Date(str)).optional(),
  descripcion: z.string().min(10).optional(),
  tipoPedido: z.string().min(2).optional(),
  cantidad: z.number().int().min(1).optional(),
  precioUnitario: z.number().positive().optional(),
  prioridad: z.enum(['BAJA', 'NORMAL', 'ALTA', 'URGENTE']).optional(),
  observaciones: z.string().optional(),
});

const updateStatusSchema = z.object({
  estado: z.enum(['PENDIENTE', 'EN_PROCESO', 'ENTREGADO', 'PAGADO', 'CANCELADO']),
});

// Función para generar número de pedido
const generateOrderNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const count = await prisma.pedido.count({
    where: {
      createdAt: {
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1),
      },
    },
  });
  return `PED-${String(count + 1).padStart(3, '0')}-${year}`;
};

export class OrderController {
  // GET /api/orders
  static async getOrders(req: Request, res: Response) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        clienteId,
        estado,
        prioridad,
        dateFrom,
        dateTo,
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);

      // Construir filtros
      const where: any = {};

      if (search) {
        where.OR = [
          { numeroPedido: { contains: search as string, mode: 'insensitive' } },
          { nombrePaciente: { contains: search as string, mode: 'insensitive' } },
          { descripcion: { contains: search as string, mode: 'insensitive' } },
          { cliente: { nombre: { contains: search as string, mode: 'insensitive' } } },
        ];
      }

      if (clienteId) {
        where.clienteId = clienteId;
      }

      if (estado) {
        where.estado = estado;
      }

      if (prioridad) {
        where.prioridad = prioridad;
      }

      if (dateFrom || dateTo) {
        where.fechaPedido = {};
        if (dateFrom) where.fechaPedido.gte = new Date(dateFrom as string);
        if (dateTo) where.fechaPedido.lte = new Date(dateTo as string);
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
                tipo: true,
              },
            },
            detallesPedido: true,
            pagos: true,
          },
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: Number(limit),
        }),
        prisma.pedido.count({ where }),
      ]);

      // Formatear respuesta
      const pedidosFormatted = pedidos.map(pedido => ({
        ...pedido,
        clientName: pedido.cliente.nombre,
        totalPagado: pedido.pagos.reduce((sum, pago) => sum + Number(pago.monto), 0),
      }));

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

  // GET /api/orders/:id
  static async getOrderById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const pedido = await prisma.pedido.findUnique({
        where: { id },
        include: {
          cliente: true,
          detallesPedido: true,
          pagos: {
            orderBy: { fechaPago: 'desc' },
          },
        },
      });

      if (!pedido) {
        return res.status(404).json({
          success: false,
          error: 'Pedido no encontrado',
        });
      }

      // Calcular total pagado
      const totalPagado = pedido.pagos.reduce((sum, pago) => sum + Number(pago.monto), 0);

      res.json({
        success: true,
        data: {
          ...pedido,
          totalPagado,
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

  // POST /api/orders
  static async createOrder(req: Request, res: Response) {
    try {
      const orderData = createOrderSchema.parse(req.body);
      const userId = (req as any).user?.id;

      // Verificar que el cliente existe
      const cliente = await prisma.cliente.findUnique({
        where: { id: orderData.clienteId },
      });

      if (!cliente) {
        return res.status(404).json({
          success: false,
          error: 'Cliente no encontrado',
        });
      }

      // Generar número de pedido
      const numeroPedido = await generateOrderNumber();

      // Calcular montos
      const montoTotal = orderData.cantidad * orderData.precioUnitario;
      const montoPendiente = montoTotal;

      // Crear transacción para pedido y detalles
      const result = await prisma.$transaction(async (tx) => {
        // Separar detalles del resto de datos
        const { detalles, ...pedidoData } = orderData;
        
        // Crear el pedido
        const nuevoPedido = await tx.pedido.create({
          data: {
            ...pedidoData,
            numeroPedido,
            montoTotal,
            montoPendiente,
            montoPagado: 0,
          },
          include: {
            cliente: true,
          },
        });

        // Crear detalles si existen
        if (detalles && detalles.length > 0) {
          const detallesData = detalles.map(detalle => ({
            ...detalle,
            pedidoId: nuevoPedido.id,
            subtotal: detalle.cantidad * detalle.precioUnitario,
          }));

          await tx.detallePedido.createMany({
            data: detallesData,
          });
        }

        return nuevoPedido;
      });

      // Registrar auditoría
      await AuditService.logCreate(req, 'pedido', result.id, { numeroPedido, nombrePaciente: orderData.nombrePaciente });

      res.status(201).json({
        success: true,
        message: 'Pedido creado exitosamente',
        data: result,
      });
    } catch (error) {
      console.error('Create order error:', error instanceof Error ? error.message : 'Unknown error');

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

  // PUT /api/orders/:id
  static async updateOrder(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = updateOrderSchema.parse(req.body);
      const userId = (req as any).user?.id;

      // Verificar que el pedido existe
      const existingOrder = await prisma.pedido.findUnique({
        where: { id },
      });

      if (!existingOrder) {
        return res.status(404).json({
          success: false,
          error: 'Pedido no encontrado',
        });
      }

      // No permitir editar pedidos pagados
      if (existingOrder.estado === 'PAGADO') {
        return res.status(400).json({
          success: false,
          error: 'No se puede editar un pedido que ya está pagado',
        });
      }

      // Recalcular montos si cambia cantidad o precio
      let prismaUpdateData: any = { ...updateData };
      if (updateData.cantidad || updateData.precioUnitario) {
        const cantidad = updateData.cantidad || existingOrder.cantidad;
        const precioUnitario = updateData.precioUnitario || Number(existingOrder.precioUnitario);
        const montoTotal = cantidad * precioUnitario;
        const montoPagado = Number(existingOrder.montoPagado);
        const montoPendiente = montoTotal - montoPagado;

        prismaUpdateData = {
          ...updateData,
          montoTotal,
          montoPendiente,
        };
      }

      // Actualizar pedido
      const updatedOrder = await prisma.pedido.update({
        where: { id },
        data: prismaUpdateData,
        include: {
          cliente: true,
          detallesPedido: true,
          pagos: true,
        },
      });

      // Registrar auditoría
      await AuditService.logUpdate(req, 'pedido', id, existingOrder, updateData);

      res.json({
        success: true,
        message: 'Pedido actualizado exitosamente',
        data: updatedOrder,
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

  // PATCH /api/orders/:id/status
  static async updateOrderStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { estado } = updateStatusSchema.parse(req.body);
      const userId = (req as any).user?.id;

      // Verificar que el pedido existe
      const existingOrder = await prisma.pedido.findUnique({
        where: { id },
        include: { cliente: true },
      });

      if (!existingOrder) {
        return res.status(404).json({
          success: false,
          error: 'Pedido no encontrado',
        });
      }

      // Validaciones de cambio de estado
      if (estado === 'PAGADO' && Number(existingOrder.montoPendiente) > 0) {
        return res.status(400).json({
          success: false,
          error: 'No se puede marcar como pagado un pedido con monto pendiente',
        });
      }

      // Actualizar estado
      const updatedOrder = await prisma.pedido.update({
        where: { id },
        data: { estado },
        include: {
          cliente: true,
          detallesPedido: true,
          pagos: true,
        },
      });

      // Registrar auditoría
      await AuditService.logStatusChange(req, 'pedido', id, existingOrder.estado, estado);

      res.json({
        success: true,
        message: `Estado del pedido actualizado a ${estado}`,
        data: updatedOrder,
      });
    } catch (error) {
      console.error('Update order status error:', error);

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

  // DELETE /api/orders/:id
  static async deleteOrder(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      // Verificar que el pedido existe
      const existingOrder = await prisma.pedido.findUnique({
        where: { id },
        include: { pagos: true },
      });

      if (!existingOrder) {
        return res.status(404).json({
          success: false,
          error: 'Pedido no encontrado',
        });
      }

      // No permitir eliminar pedidos con pagos
      if (existingOrder.pagos.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'No se puede eliminar un pedido que tiene pagos registrados',
        });
      }

      // Eliminar pedido (cascade eliminará detalles)
      await prisma.pedido.delete({
        where: { id },
      });

      // Registrar auditoría
      await AuditService.logDelete(req, 'pedido', id, existingOrder, 'Pedido eliminado');

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

  // GET /api/orders/stats
  static async getOrdersStats(req: Request, res: Response) {
    try {
      const [
        totalOrders,
        pendingOrders,
        inProgressOrders,
        deliveredOrders,
        paidOrders,
        canceledOrders
      ] = await Promise.all([
        prisma.pedido.count(),
        prisma.pedido.count({ where: { estado: 'PENDIENTE' } }),
        prisma.pedido.count({ where: { estado: 'EN_PROCESO' } }),
        prisma.pedido.count({ where: { estado: 'ENTREGADO' } }),
        prisma.pedido.count({ where: { estado: 'PAGADO' } }),
        prisma.pedido.count({ where: { estado: 'CANCELADO' } }),
      ]);

      // Estadísticas de montos
      const montoStats = await prisma.pedido.aggregate({
        _sum: {
          montoTotal: true,
          montoPagado: true,
          montoPendiente: true,
        },
      });

      res.json({
        success: true,
        data: {
          totalOrders,
          pendingOrders,
          inProgressOrders,
          deliveredOrders,
          paidOrders,
          canceledOrders,
          totalAmount: Number(montoStats._sum.montoTotal || 0),
          totalPaid: Number(montoStats._sum.montoPagado || 0),
          totalPending: Number(montoStats._sum.montoPendiente || 0),
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
}