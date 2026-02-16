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

// ============================================
// SCHEMAS DE VALIDACIÓN - MODELO OFICIAL APL
// ============================================

// Detalle de pago: relación N:M entre pago y pedido
const detallePagoSchema = z.object({
  id_pedido: z.coerce.number().int().positive('ID de pedido inválido'),
  valor: z.coerce.number().positive('El valor debe ser mayor a 0'),
});

const createPaymentSchema = z.object({
  valor: z.coerce.number().positive('El valor total debe ser mayor a 0'),
  // id_administrador se toma del JWT (req.user)
  // fecha_pago es opcional; si no viene, se usa la fecha actual
  fecha_pago: z.union([
    z.string().min(1).transform((str) => new Date(str)),
    z.date(),
  ]).optional(),
  detalles: z.array(detallePagoSchema).min(1, 'Debe incluir al menos un pedido para aplicar el pago'),
});

const updatePaymentSchema = z.object({
  valor: z.coerce.number().positive().optional(),
  fecha_pago: z.union([
    z.string().min(1).transform((str) => new Date(str)),
    z.date(),
  ]).optional(),
});

// ============================================
// PAYMENT CONTROLLER
// ============================================

export class PaymentController {
  private static logError(context: string, error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(context, message);
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
  }

  // GET /api/payments - Listar pagos
  static async getPayments(req: Request, res: Response) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        id_administrador,
        id_pedido,
        fechaDesde,
        fechaHasta,
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);

      // Construir filtros
      const where: any = {};

      if (search) {
        where.OR = [
          { id: Number(search) || 0 },
          { administrador: { nombre: { contains: search as string, mode: 'insensitive' } } },
        ];
      }

      if (id_administrador) {
        where.id_administrador = Number(id_administrador);
      }

      if (id_pedido) {
        where.detalles = {
          some: {
            id_pedido: Number(id_pedido),
          },
        };
      }

      if (fechaDesde || fechaHasta) {
        where.detalles = {
          some: {
            fecha_pago: {},
          },
        };
        if (fechaDesde) (where.detalles.some.fecha_pago as any).gte = new Date(fechaDesde as string);
        if (fechaHasta) (where.detalles.some.fecha_pago as any).lte = new Date(fechaHasta as string);
      }

      const [pagos, total] = await Promise.all([
        prisma.pago.findMany({
          where,
          include: {
            administrador: {
              select: {
                id: true,
                nombre: true,
                email: true,
              },
            },
            detalles: {
              include: {
                pedido: {
                  include: {
                    cliente: {
                      select: {
                        id: true,
                        nombre: true,
                        email: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { id: 'desc' },
          skip: offset,
          take: Number(limit),
        }),
        prisma.pago.count({ where }),
      ]);

      // Formatear respuesta
      const pagosFormatted = pagos.map(pago => ({
        id: pago.id,
        valor: Number(pago.valor),
        id_administrador: pago.id_administrador,
        nombreAdministrador: pago.administrador.nombre,
        pedidos: pago.detalles.map(det => ({
          id_pedido: det.id_pedido,
          nombreCliente: det.pedido.cliente.nombre,
          valorAplicado: Number(det.valor),
          fecha_pago: det.fecha_pago,
        })),
        cantidadPedidos: pago.detalles.length,
        fechaPago: pago.detalles[0]?.fecha_pago || null,
      }));

      res.json({
        success: true,
        data: pagosFormatted,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      PaymentController.logError('Get payments error:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // GET /api/payments/:id - Obtener pago por ID
  static async getPaymentById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const pago = await prisma.pago.findUnique({
        where: { id: Number(id) },
        include: {
          administrador: {
            select: {
              id: true,
              nombre: true,
              email: true,
            },
          },
          detalles: {
            include: {
              pedido: {
                include: {
                  cliente: true,
                  detalles: {
                    include: {
                      producto: true,
                      estado: true,
                    },
                  },
                  detallesPago: true,
                },
              },
            },
          },
        },
      });

      if (!pago) {
        return res.status(404).json({
          success: false,
          error: 'Pago no encontrado',
        });
      }

      // Calcular montos por pedido
      const pedidosConMontos = pago.detalles.map(det => {
        const montoTotal = det.pedido.detalles.reduce(
          (sum, d) => sum + (d.cantidad * Number(d.precio_unitario)),
          0
        );
        const montoPagado = det.pedido.detallesPago.reduce(
          (sum, dp) => sum + Number(dp.valor),
          0
        );

        return {
          id_pedido: det.id_pedido,
          cliente: det.pedido.cliente,
          valorAplicado: Number(det.valor),
          fecha_pago: det.fecha_pago,
          montoTotal,
          montoPagadoTotal: montoPagado,
          montoPendiente: montoTotal - montoPagado,
        };
      });

      res.json({
        success: true,
        data: {
          id: pago.id,
          valor: Number(pago.valor),
          id_administrador: pago.id_administrador,
          administrador: pago.administrador,
          pedidos: pedidosConMontos,
          cantidadPedidos: pago.detalles.length,
        },
      });
    } catch (error) {
      PaymentController.logError('Get payment by id error:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // POST /api/payments - Crear pago y aplicarlo a pedidos
  static async createPayment(req: Request, res: Response) {
    try {
      const paymentData = createPaymentSchema.parse(req.body);

      const authReq = req as AuthRequest;
      const adminId = authReq.user?.id;
      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Acceso denegado. Usuario no autenticado.',
        });
      }

      const fechaPago = paymentData.fecha_pago ? new Date(paymentData.fecha_pago as any) : new Date();

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

      // Verificar que todos los pedidos existen y no están eliminados
      const pedidoIds = paymentData.detalles.map(d => d.id_pedido);
      const pedidos = await prisma.pedido.findMany({
        where: { 
          id: { in: pedidoIds },
          fecha_delete: null,
        },
        include: {
          detalles: true,
          detallesPago: true,
        },
      });

      if (pedidos.length !== pedidoIds.length) {
        return res.status(400).json({
          success: false,
          error: 'Uno o más pedidos no existen o están eliminados',
        });
      }

      // Verificar que el valor total del pago coincida con la suma de detalles
      const sumaDetalles = paymentData.detalles.reduce((sum, det) => sum + det.valor, 0);
      if (Math.abs(sumaDetalles - paymentData.valor) > 0.01) {
        return res.status(400).json({
          success: false,
          error: `El valor total del pago (${paymentData.valor}) debe coincidir con la suma de los detalles (${sumaDetalles})`,
        });
      }

      // Verificar que no se pague más de lo que debe cada pedido
      for (const detalle of paymentData.detalles) {
        const pedido = pedidos.find(p => p.id === detalle.id_pedido);
        if (!pedido) continue;

        const montoTotal = pedido.detalles.reduce(
          (sum, d) => sum + (d.cantidad * Number(d.precio_unitario)),
          0
        );
        const montoPagado = pedido.detallesPago.reduce(
          (sum, dp) => sum + Number(dp.valor),
          0
        );
        const montoPendiente = montoTotal - montoPagado;

        if (detalle.valor > montoPendiente + 0.01) {
          return res.status(400).json({
            success: false,
            error: `El monto a pagar para el pedido ${detalle.id_pedido} (${detalle.valor}) excede el monto pendiente (${montoPendiente})`,
          });
        }
      }

      // Crear pago con detalles en transacción
      const newPago = await prisma.$transaction(async (tx) => {
        // Crear el pago
        const pago = await tx.pago.create({
          data: {
            valor: paymentData.valor,
            id_administrador: adminId,
          },
        });

        // Crear los detalles de pago
        await tx.detallePago.createMany({
          data: paymentData.detalles.map(detalle => ({
            id_pago: pago.id,
            id_pedido: detalle.id_pedido,
            valor: detalle.valor,
            fecha_pago: fechaPago,
          })),
        });

        // Obtener el pago completo con detalles
        return await tx.pago.findUnique({
          where: { id: pago.id },
          include: {
            administrador: {
              select: {
                id: true,
                nombre: true,
                email: true,
              },
            },
            detalles: {
              include: {
                pedido: {
                  include: {
                    cliente: true,
                  },
                },
              },
            },
          },
        });
      });

      if (!newPago) {
        throw new Error('Error creando pago');
      }

      res.status(201).json({
        success: true,
        message: 'Pago registrado exitosamente',
        data: {
          id: newPago.id,
          valor: Number(newPago.valor),
          id_administrador: newPago.id_administrador,
          nombreAdministrador: newPago.administrador.nombre,
          pedidos: newPago.detalles.map(det => ({
            id_pedido: det.id_pedido,
            nombreCliente: det.pedido.cliente.nombre,
            valorAplicado: Number(det.valor),
            fecha_pago: det.fecha_pago,
          })),
        },
      });
    } catch (error) {
      PaymentController.logError('Create payment error:', error);

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

  // PUT /api/payments/:id - Actualizar pago
  static async updatePayment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = updatePaymentSchema.parse(req.body);

      const existingPayment = await prisma.pago.findUnique({
        where: { id: Number(id) },
      });

      if (!existingPayment) {
        return res.status(404).json({
          success: false,
          error: 'Pago no encontrado',
        });
      }

      const updatedPayment = await prisma.pago.update({
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
          detalles: {
            include: {
              pedido: {
                include: {
                  cliente: true,
                },
              },
            },
          },
        },
      });

      res.json({
        success: true,
        message: 'Pago actualizado exitosamente',
        data: {
          id: updatedPayment.id,
          valor: Number(updatedPayment.valor),
          id_administrador: updatedPayment.id_administrador,
          nombreAdministrador: updatedPayment.administrador.nombre,
          pedidos: updatedPayment.detalles.map(det => ({
            id_pedido: det.id_pedido,
            nombreCliente: det.pedido.cliente.nombre,
            valorAplicado: Number(det.valor),
            fecha_pago: det.fecha_pago,
          })),
        },
      });
    } catch (error) {
      PaymentController.logError('Update payment error:', error);

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

  // DELETE /api/payments/:id - Eliminar pago
  static async deletePayment(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const existingPayment = await prisma.pago.findUnique({
        where: { id: Number(id) },
        include: {
          detalles: true,
        },
      });

      if (!existingPayment) {
        return res.status(404).json({
          success: false,
          error: 'Pago no encontrado',
        });
      }

      // Eliminar pago y sus detalles en transacción
      await prisma.$transaction(async (tx) => {
        // Eliminar detalles de pago
        await tx.detallePago.deleteMany({
          where: { id_pago: Number(id) },
        });

        // Eliminar pago
        await tx.pago.delete({
          where: { id: Number(id) },
        });
      });

      res.json({
        success: true,
        message: 'Pago eliminado exitosamente',
      });
    } catch (error) {
      console.error('Delete payment error:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // GET /api/payments/stats - Estadísticas de pagos
  static async getPaymentsStats(req: Request, res: Response) {
    try {
      const totalPagos = await prisma.pago.count();

      // Total recaudado
      const pagos = await prisma.pago.findMany({
        select: {
          valor: true,
        },
      });

      const totalRecaudado = pagos.reduce((sum, p) => sum + Number(p.valor), 0);

      // Pagos por administrador
      const pagosPorAdmin = await prisma.pago.groupBy({
        by: ['id_administrador'],
        _count: {
          id: true,
        },
        _sum: {
          valor: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: 5,
      });

      const pagosPorAdminDetalle = await Promise.all(
        pagosPorAdmin.map(async (item: any) => {
          const admin = await prisma.administrador.findUnique({
            where: { id: item.id_administrador },
            select: { nombre: true },
          });
          return {
            id_administrador: item.id_administrador,
            nombreAdministrador: admin?.nombre || 'Desconocido',
            cantidadPagos: item._count.id,
            totalRecaudado: Number(item._sum.valor) || 0,
          };
        })
      );

      // Pagos por mes (últimos 6 meses)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const detallesPago = await prisma.detallePago.findMany({
        where: {
          fecha_pago: {
            gte: sixMonthsAgo,
          },
        },
        select: {
          fecha_pago: true,
          valor: true,
        },
      });

      const pagosPorMes = detallesPago.reduce((acc: any, det) => {
        const mes = det.fecha_pago.toISOString().substring(0, 7); // YYYY-MM
        if (!acc[mes]) {
          acc[mes] = { mes, cantidad: 0, total: 0 };
        }
        acc[mes].cantidad += 1;
        acc[mes].total += Number(det.valor);
        return acc;
      }, {});

      res.json({
        success: true,
        data: {
          totalPagos,
          totalRecaudado,
          pagosPorAdministrador: pagosPorAdminDetalle,
          pagosPorMes: Object.values(pagosPorMes),
        },
      });
    } catch (error) {
      console.error('Get payments stats error:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }
}

