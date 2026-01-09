import { Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { AuditService } from '../services/audit.service';

const prisma = new PrismaClient();

// Schemas de validación
const createPaymentSchema = z.object({
  pedidoId: z.string().cuid('ID de pedido inválido'),
  monto: z.number().positive('El monto debe ser mayor a 0'),
  metodoPago: z.enum(['EFECTIVO', 'TRANSFERENCIA', 'TARJETA_CREDITO', 'TARJETA_DEBITO', 'CHEQUE']),
  fechaPago: z.string().transform((str) => new Date(str)).optional(),
  numeroRecibo: z.string().optional(),
  numeroTransf: z.string().optional(),
  observaciones: z.string().optional(),
});

const updatePaymentSchema = createPaymentSchema.partial().extend({
  procesadoPor: z.string().optional(),
});

const balanceFiltersSchema = z.object({
  fechaDesde: z.string().transform((str) => new Date(str)).optional(),
  fechaHasta: z.string().transform((str) => new Date(str)).optional(),
  clienteId: z.string().optional(),
  metodoPago: z.enum(['EFECTIVO', 'TRANSFERENCIA', 'TARJETA_CREDITO', 'TARJETA_DEBITO', 'CHEQUE']).optional(),
});

// Función para generar número de pago
const generatePaymentNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const count = await prisma.pago.count({
    where: {
      createdAt: {
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1),
      },
    },
  });
  return `PAG-${String(count + 1).padStart(3, '0')}-${year}`;
};

export class PaymentController {
  // GET /api/payments
  static async getPayments(req: Request, res: Response) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        pedidoId,
        clienteId,
        metodoPago,
        fechaDesde,
        fechaHasta,
        procesadoPor,
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);

      // Construir filtros
      const where: any = {};

      if (search) {
        where.OR = [
          { numeroPago: { contains: search as string, mode: 'insensitive' } },
          { numeroRecibo: { contains: search as string, mode: 'insensitive' } },
          { numeroTransf: { contains: search as string, mode: 'insensitive' } },
          { observaciones: { contains: search as string, mode: 'insensitive' } },
          { pedido: { nombrePaciente: { contains: search as string, mode: 'insensitive' } } },
          { pedido: { cliente: { nombre: { contains: search as string, mode: 'insensitive' } } } },
        ];
      }

      if (pedidoId) {
        where.pedidoId = pedidoId;
      }

      if (metodoPago) {
        where.metodoPago = metodoPago;
      }

      if (procesadoPor) {
        where.procesadoPor = procesadoPor;
      }

      if (clienteId) {
        where.pedido = { clienteId };
      }

      if (fechaDesde || fechaHasta) {
        where.fechaPago = {};
        if (fechaDesde) where.fechaPago.gte = new Date(fechaDesde as string);
        if (fechaHasta) where.fechaPago.lte = new Date(fechaHasta as string);
      }

      const [pagos, total] = await Promise.all([
        prisma.pago.findMany({
          where,
          include: {
            pedido: {
              include: {
                cliente: {
                  select: {
                    id: true,
                    nombre: true,
                    email: true,
                    tipo: true,
                  },
                },
              },
            },
          },
          orderBy: { fechaPago: 'desc' },
          skip: offset,
          take: Number(limit),
        }),
        prisma.pago.count({ where }),
      ]);

      res.json({
        success: true,
        data: pagos,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error('Get payments error:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // GET /api/payments/:id
  static async getPaymentById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const pago = await prisma.pago.findUnique({
        where: { id },
        include: {
          pedido: {
            include: {
              cliente: true,
              detallesPedido: true,
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

      res.json({
        success: true,
        data: pago,
      });
    } catch (error) {
      console.error('Get payment by id error:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // POST /api/payments
  static async createPayment(req: Request, res: Response) {
    try {
      const paymentData = createPaymentSchema.parse(req.body);
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuario no autenticado',
        });
      }

      // Verificar que el pedido existe
      const pedido = await prisma.pedido.findUnique({
        where: { id: paymentData.pedidoId },
        include: { cliente: true },
      });

      if (!pedido) {
        return res.status(404).json({
          success: false,
          error: 'Pedido no encontrado',
        });
      }

      // Verificar que el monto no exceda el monto pendiente
      const montoPendiente = Number(pedido.montoPendiente);
      if (paymentData.monto > montoPendiente) {
        return res.status(400).json({
          success: false,
          error: `El monto del pago (${paymentData.monto}) no puede ser mayor al monto pendiente (${montoPendiente})`,
        });
      }

      // Generar número de pago
      const numeroPago = await generatePaymentNumber();

      // Crear transacción para pago y actualización del pedido
      const result = await prisma.$transaction(async (tx) => {
        // Crear el pago
        const nuevoPago = await tx.pago.create({
          data: {
            ...paymentData,
            numeroPago,
            fechaPago: paymentData.fechaPago || new Date(),
            procesadoPor: userId,
          },
          include: {
            pedido: {
              include: { cliente: true },
            },
          },
        });

        // Actualizar el pedido con el nuevo monto pagado y pendiente
        const nuevoMontoPagado = Number(pedido.montoPagado) + paymentData.monto;
        const nuevoMontoPendiente = Number(pedido.montoTotal) - nuevoMontoPagado;
        const nuevoEstado = nuevoMontoPendiente <= 0 ? 'PAGADO' : pedido.estado;

        await tx.pedido.update({
          where: { id: paymentData.pedidoId },
          data: {
            montoPagado: nuevoMontoPagado,
            montoPendiente: nuevoMontoPendiente,
            estado: nuevoEstado,
          },
        });

        return nuevoPago;
      });

      // Registrar auditoría
      await AuditService.logCreate(req, 'pago', result.id, {
        numeroPago,
        monto: paymentData.monto,
        metodoPago: paymentData.metodoPago,
        pedidoId: paymentData.pedidoId,
      });

      // Si el pedido se completó, registrar cambio de estado
      const pedidoActualizado = await prisma.pedido.findUnique({
        where: { id: paymentData.pedidoId },
      });

      if (pedidoActualizado?.estado === 'PAGADO' && pedido.estado !== 'PAGADO') {
        await AuditService.logStatusChange(
          req,
          'pedido',
          paymentData.pedidoId,
          pedido.estado,
          'PAGADO',
          'Pedido marcado como pagado tras registrar pago'
        );
      }

      res.status(201).json({
        success: true,
        message: 'Pago registrado exitosamente',
        data: result,
      });
    } catch (error) {
      console.error('Create payment error:', error instanceof Error ? error.message : 'Unknown error');

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

  // PUT /api/payments/:id
  static async updatePayment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = updatePaymentSchema.parse(req.body);
      const userId = (req as any).user?.id;

      // Verificar que el pago existe
      const existingPayment = await prisma.pago.findUnique({
        where: { id },
        include: {
          pedido: true,
        },
      });

      if (!existingPayment) {
        return res.status(404).json({
          success: false,
          error: 'Pago no encontrado',
        });
      }

      // Si se cambia el monto, recalcular pedido
      let transactionUpdate = null;
      if (updateData.monto && updateData.monto !== Number(existingPayment.monto)) {
        const diferenciaMonto = updateData.monto - Number(existingPayment.monto);
        const nuevoMontoPagado = Number(existingPayment.pedido.montoPagado) + diferenciaMonto;
        const nuevoMontoPendiente = Number(existingPayment.pedido.montoTotal) - nuevoMontoPagado;

        // Verificar que el nuevo monto no cause problemas
        if (nuevoMontoPagado > Number(existingPayment.pedido.montoTotal)) {
          return res.status(400).json({
            success: false,
            error: 'El nuevo monto causaría que el total pagado exceda el monto total del pedido',
          });
        }

        transactionUpdate = {
          montoPagado: nuevoMontoPagado,
          montoPendiente: nuevoMontoPendiente,
          estado: nuevoMontoPendiente <= 0 ? 'PAGADO' as const : 'EN_PROCESO' as const,
        };
      }

      // Ejecutar transacción
      const result = await prisma.$transaction(async (tx) => {
        // Actualizar pago
        const pagoActualizado = await tx.pago.update({
          where: { id },
          data: {
            ...updateData,
            procesadoPor: userId, // Actualizar quien procesó la modificación
          },
          include: {
            pedido: {
              include: { cliente: true },
            },
          },
        });

        // Actualizar pedido si hay cambios de monto
        if (transactionUpdate) {
          await tx.pedido.update({
            where: { id: existingPayment.pedidoId },
            data: transactionUpdate,
          });
        }

        return pagoActualizado;
      });

      // Registrar auditoría
      await AuditService.logUpdate(req, 'pago', id, existingPayment, updateData);

      res.json({
        success: true,
        message: 'Pago actualizado exitosamente',
        data: result,
      });
    } catch (error) {
      console.error('Update payment error:', error);

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

  // DELETE /api/payments/:id
  static async deletePayment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      // Solo admins pueden eliminar pagos
      if (userRole !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Solo los administradores pueden eliminar pagos',
        });
      }

      // Verificar que el pago existe
      const existingPayment = await prisma.pago.findUnique({
        where: { id },
        include: { pedido: true },
      });

      if (!existingPayment) {
        return res.status(404).json({
          success: false,
          error: 'Pago no encontrado',
        });
      }

      // Ejecutar transacción para eliminar pago y actualizar pedido
      await prisma.$transaction(async (tx) => {
        // Eliminar pago
        await tx.pago.delete({
          where: { id },
        });

        // Recalcular montos del pedido
        const nuevoMontoPagado = Number(existingPayment.pedido.montoPagado) - Number(existingPayment.monto);
        const nuevoMontoPendiente = Number(existingPayment.pedido.montoTotal) - nuevoMontoPagado;

        await tx.pedido.update({
          where: { id: existingPayment.pedidoId },
          data: {
            montoPagado: nuevoMontoPagado,
            montoPendiente: nuevoMontoPendiente,
            estado: nuevoMontoPendiente > 0 ? 'EN_PROCESO' : 'PAGADO',
          },
        });
      });

      // Registrar auditoría
      await AuditService.logDelete(req, 'pago', id, existingPayment, 'Pago eliminado por administrador');

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

  // GET /api/payments/order/:orderId
  static async getPaymentsByOrder(req: Request, res: Response) {
    try {
      const { orderId } = req.params;

      // Verificar que el pedido existe
      const pedido = await prisma.pedido.findUnique({
        where: { id: orderId },
        include: { cliente: true },
      });

      if (!pedido) {
        return res.status(404).json({
          success: false,
          error: 'Pedido no encontrado',
        });
      }

      // Obtener pagos del pedido
      const pagos = await prisma.pago.findMany({
        where: { pedidoId: orderId },
        orderBy: { fechaPago: 'desc' },
      });

      // Calcular resumen
      const totalPagado = pagos.reduce((sum, pago) => sum + Number(pago.monto), 0);
      const montoPendiente = Number(pedido.montoTotal) - totalPagado;

      res.json({
        success: true,
        data: {
          pedido: {
            id: pedido.id,
            numeroPedido: pedido.numeroPedido,
            nombrePaciente: pedido.nombrePaciente,
            cliente: pedido.cliente.nombre,
            montoTotal: Number(pedido.montoTotal),
            montoPagado: totalPagado,
            montoPendiente: montoPendiente,
            estado: pedido.estado,
          },
          pagos,
          resumen: {
            totalPagos: pagos.length,
            montoTotal: Number(pedido.montoTotal),
            totalPagado,
            montoPendiente,
            porcentajePagado: Number(pedido.montoTotal) > 0 ? (totalPagado / Number(pedido.montoTotal)) * 100 : 0,
          },
        },
      });
    } catch (error) {
      console.error('Get payments by order error:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // GET /api/payments/balance
  static async getBalance(req: Request, res: Response) {
    try {
      const filters = balanceFiltersSchema.parse(req.query);

      // Construir filtros para consultas
      const dateFilter: any = {};
      if (filters.fechaDesde || filters.fechaHasta) {
        if (filters.fechaDesde) dateFilter.gte = filters.fechaDesde;
        if (filters.fechaHasta) dateFilter.lte = filters.fechaHasta;
      }

      const pagoWhere: any = {};
      if (Object.keys(dateFilter).length > 0) pagoWhere.fechaPago = dateFilter;
      if (filters.metodoPago) pagoWhere.metodoPago = filters.metodoPago;
      if (filters.clienteId) pagoWhere.pedido = { clienteId: filters.clienteId };

      const pedidoWhere: any = {};
      if (Object.keys(dateFilter).length > 0) pedidoWhere.fechaPedido = dateFilter;
      if (filters.clienteId) pedidoWhere.clienteId = filters.clienteId;

      // Ejecutar consultas en paralelo
      const [
        // Estadísticas de pagos
        totalPagos,
        sumaPagos,
        pagosPorMetodo,

        // Estadísticas de pedidos
        totalPedidos,
        sumaPedidos,
        pedidosPorEstado,

        // Balance general
        balanceGeneral,

        // Pagos recientes
        pagosRecientes,

        // Clientes con mayor deuda
        clientesConDeuda,
      ] = await Promise.all([
        // Total de pagos
        prisma.pago.count({ where: pagoWhere }),

        // Suma de pagos
        prisma.pago.aggregate({
          where: pagoWhere,
          _sum: { monto: true },
        }),

        // Pagos por método
        prisma.pago.groupBy({
          by: ['metodoPago'],
          where: pagoWhere,
          _count: { metodoPago: true },
          _sum: { monto: true },
        }),

        // Total de pedidos
        prisma.pedido.count({ where: pedidoWhere }),

        // Suma de pedidos
        prisma.pedido.aggregate({
          where: pedidoWhere,
          _sum: {
            montoTotal: true,
            montoPagado: true,
            montoPendiente: true,
          },
        }),

        // Pedidos por estado
        prisma.pedido.groupBy({
          by: ['estado'],
          where: pedidoWhere,
          _count: { estado: true },
          _sum: { montoTotal: true, montoPendiente: true },
        }),

        // Balance general (sin filtros de fecha para obtener totales reales)
        prisma.pedido.aggregate({
          _sum: {
            montoTotal: true,
            montoPagado: true,
            montoPendiente: true,
          },
        }),

        // Últimos pagos
        prisma.pago.findMany({
          where: pagoWhere,
          include: {
            pedido: {
              include: {
                cliente: {
                  select: { nombre: true },
                },
              },
            },
          },
          orderBy: { fechaPago: 'desc' },
          take: 10,
        }),

        // Clientes con mayor deuda
        prisma.pedido.groupBy({
          by: ['clienteId'],
          where: {
            ...pedidoWhere,
            montoPendiente: { gt: 0 },
          },
          _sum: { montoPendiente: true },
          orderBy: { _sum: { montoPendiente: 'desc' } },
          take: 10,
        }),
      ]);

      // Obtener información de clientes con deuda
      const clienteIds = clientesConDeuda.map(c => c.clienteId);
      const clientesInfo = await prisma.cliente.findMany({
        where: { id: { in: clienteIds } },
        select: { id: true, nombre: true, email: true, tipo: true },
      });

      // Mapear clientes con su deuda
      const clientesConDeudaCompleto = clientesConDeuda.map(deuda => {
        const cliente = clientesInfo.find(c => c.id === deuda.clienteId);
        return {
          cliente,
          montoPendiente: Number(deuda._sum.montoPendiente || 0),
        };
      });

      // Formatear respuesta
      res.json({
        success: true,
        data: {
          resumen: {
            totalIngresos: Number(sumaPagos._sum.monto || 0),
            totalFacturado: Number(sumaPedidos._sum.montoTotal || 0),
            totalPendiente: Number(sumaPedidos._sum.montoPendiente || 0),
            porcentajeCobrado: Number(sumaPedidos._sum.montoTotal || 0) > 0 
              ? (Number(sumaPagos._sum.monto || 0) / Number(sumaPedidos._sum.montoTotal || 0)) * 100 
              : 0,
          },
          balanceGeneral: {
            montoTotalHistorico: Number(balanceGeneral._sum.montoTotal || 0),
            montoPagadoHistorico: Number(balanceGeneral._sum.montoPagado || 0),
            montoPendienteTotal: Number(balanceGeneral._sum.montoPendiente || 0),
          },
          estadisticasPagos: {
            totalPagos,
            montoTotal: Number(sumaPagos._sum.monto || 0),
            promedioporPago: totalPagos > 0 ? Number(sumaPagos._sum.monto || 0) / totalPagos : 0,
            pagosPorMetodo: pagosPorMetodo.map(p => ({
              metodoPago: p.metodoPago,
              cantidad: p._count.metodoPago,
              monto: Number(p._sum.monto || 0),
            })),
          },
          estadisticasPedidos: {
            totalPedidos,
            montoTotal: Number(sumaPedidos._sum.montoTotal || 0),
            promedioPorPedido: totalPedidos > 0 ? Number(sumaPedidos._sum.montoTotal || 0) / totalPedidos : 0,
            pedidosPorEstado: pedidosPorEstado.map(p => ({
              estado: p.estado,
              cantidad: p._count.estado,
              montoTotal: Number(p._sum.montoTotal || 0),
              montoPendiente: Number(p._sum.montoPendiente || 0),
            })),
          },
          pagosRecientes: pagosRecientes.map(pago => ({
            id: pago.id,
            numeroPago: pago.numeroPago,
            monto: Number(pago.monto),
            metodoPago: pago.metodoPago,
            fechaPago: pago.fechaPago,
            cliente: pago.pedido.cliente.nombre,
            numeroPedido: pago.pedido.numeroPedido,
          })),
          clientesConMayorDeuda: clientesConDeudaCompleto.filter(c => c.cliente !== null),
          filtrosAplicados: filters,
        },
      });
    } catch (error) {
      console.error('Get balance error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Parámetros de consulta inválidos',
          details: error.errors,
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // GET /api/payments/stats
  static async getPaymentStats(req: Request, res: Response) {
    try {
      const [
        totalPayments,
        totalAmount,
        paymentsByMethod,
        paymentsToday,
        paymentsThisMonth,
        averagePayment
      ] = await Promise.all([
        prisma.pago.count(),
        
        prisma.pago.aggregate({
          _sum: { monto: true },
        }),
        
        prisma.pago.groupBy({
          by: ['metodoPago'],
          _count: { metodoPago: true },
          _sum: { monto: true },
        }),
        
        prisma.pago.count({
          where: {
            fechaPago: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        }),
        
        prisma.pago.count({
          where: {
            fechaPago: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        }),
        
        prisma.pago.aggregate({
          _avg: { monto: true },
        }),
      ]);

      res.json({
        success: true,
        data: {
          totalPayments,
          totalAmount: Number(totalAmount._sum.monto || 0),
          averagePayment: Number(averagePayment._avg.monto || 0),
          paymentsToday,
          paymentsThisMonth,
          paymentsByMethod: paymentsByMethod.map(p => ({
            method: p.metodoPago,
            count: p._count.metodoPago,
            amount: Number(p._sum.monto || 0),
          })),
        },
      });
    } catch (error) {
      console.error('Get payment stats error:', error);
      return res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }
}