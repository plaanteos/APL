import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Servicio de Recordatorios - Modelo Oficial APL
 * Gestiona recordatorios basados en pedidos próximos a fecha_entrega
 */
export class ReminderService {
  /**
   * Obtiene pedidos próximos a vencer (próximos N días)
   * @param diasAntes - Número de días de anticipación para el recordatorio
   */
  static async getPedidosProximosAVencer(diasAntes: number = 3): Promise<any[]> {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const fechaLimite = new Date(hoy);
    fechaLimite.setDate(fechaLimite.getDate() + diasAntes);

    const pedidos = await prisma.pedido.findMany({
      where: {
        AND: [
          { fecha_delete: null }, // Solo activos
          {
            fecha_entrega: {
              gte: hoy,
              lte: fechaLimite,
            },
          },
        ],
      },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            telefono: true,
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
      orderBy: {
        fecha_entrega: 'asc',
      },
    });

    // Calcular montos dinámicamente
    return pedidos.map((pedido) => {
      const montoTotal = pedido.detalles.reduce(
        (sum, d) => sum + d.cantidad * Number(d.precio_unitario),
        0
      );
      const montoPagado = pedido.detallesPago.reduce((sum, dp) => sum + Number(dp.valor), 0);
      const montoPendiente = montoTotal - montoPagado;

      const diasRestantes = Math.ceil(
        (pedido.fecha_entrega.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        id: pedido.id,
        fecha_pedido: pedido.fecha_pedido,
        fecha_entrega: pedido.fecha_entrega,
        cliente: pedido.cliente,
        detalles: pedido.detalles,
        montoTotal,
        montoPagado,
        montoPendiente,
        diasRestantes,
      };
    });
  }

  /**
   * Obtiene pedidos vencidos (fecha_entrega pasada)
   */
  static async getPedidosVencidos(): Promise<any[]> {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const pedidos = await prisma.pedido.findMany({
      where: {
        AND: [
          { fecha_delete: null },
          {
            fecha_entrega: {
              lt: hoy,
            },
          },
        ],
      },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            telefono: true,
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
      orderBy: {
        fecha_entrega: 'asc',
      },
    });

    // Calcular montos y días de retraso
    return pedidos.map((pedido) => {
      const montoTotal = pedido.detalles.reduce(
        (sum, d) => sum + d.cantidad * Number(d.precio_unitario),
        0
      );
      const montoPagado = pedido.detallesPago.reduce((sum, dp) => sum + Number(dp.valor), 0);
      const montoPendiente = montoTotal - montoPagado;

      const diasRetraso = Math.floor(
        (hoy.getTime() - pedido.fecha_entrega.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        id: pedido.id,
        fecha_pedido: pedido.fecha_pedido,
        fecha_entrega: pedido.fecha_entrega,
        cliente: pedido.cliente,
        detalles: pedido.detalles,
        montoTotal,
        montoPagado,
        montoPendiente,
        diasRetraso,
      };
    });
  }

  /**
   * Obtiene clientes con deuda pendiente
   */
  static async getClientesConDeuda(montoMinimo: number = 0): Promise<any[]> {
    const clientes = await prisma.cliente.findMany({
      include: {
        pedidos: {
          where: {
            fecha_delete: null,
          },
          include: {
            detalles: true,
            detallesPago: true,
          },
        },
      },
    });

    // Filtrar clientes que tienen saldo pendiente
    const clientesConDeuda = clientes
      .map((cliente) => {
        let totalDeuda = 0;
        let pedidosConDeuda = 0;

        cliente.pedidos.forEach((pedido) => {
          const montoTotal = pedido.detalles.reduce(
            (sum, d) => sum + d.cantidad * Number(d.precio_unitario),
            0
          );
          const montoPagado = pedido.detallesPago.reduce((sum, dp) => sum + Number(dp.valor), 0);
          const montoPendiente = montoTotal - montoPagado;

          if (montoPendiente > 0.01) {
            totalDeuda += montoPendiente;
            pedidosConDeuda++;
          }
        });

        return {
          id: cliente.id,
          nombre: cliente.nombre,
          email: cliente.email,
          telefono: cliente.telefono,
          totalDeuda,
          pedidosConDeuda,
        };
      })
      .filter((c) => c.totalDeuda >= montoMinimo)
      .sort((a, b) => b.totalDeuda - a.totalDeuda);

    return clientesConDeuda;
  }

  /**
   * Obtiene pedidos que requieren seguimiento (sin pagos o con pago parcial)
   */
  static async getPedidosParaSeguimiento(): Promise<any[]> {
    const pedidos = await prisma.pedido.findMany({
      where: {
        fecha_delete: null,
      },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            telefono: true,
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
      orderBy: {
        fecha_pedido: 'desc',
      },
    });

    // Filtrar pedidos con saldo pendiente
    const pedidosConSaldo = pedidos
      .map((pedido) => {
        const montoTotal = pedido.detalles.reduce(
          (sum, d) => sum + d.cantidad * Number(d.precio_unitario),
          0
        );
        const montoPagado = pedido.detallesPago.reduce((sum, dp) => sum + Number(dp.valor), 0);
        const montoPendiente = montoTotal - montoPagado;

        return {
          id: pedido.id,
          fecha_pedido: pedido.fecha_pedido,
          fecha_entrega: pedido.fecha_entrega,
          cliente: pedido.cliente,
          detalles: pedido.detalles,
          montoTotal,
          montoPagado,
          montoPendiente,
          porcentajePagado: montoTotal > 0 ? (montoPagado / montoTotal) * 100 : 0,
        };
      })
      .filter((p) => p.montoPendiente > 0.01);

    return pedidosConSaldo;
  }

  /**
   * Obtiene estadísticas de recordatorios
   */
  static async getEstadisticasRecordatorios(): Promise<{
    pedidosProximosAVencer: number;
    pedidosVencidos: number;
    clientesConDeuda: number;
    totalDeudaPendiente: number;
  }> {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const fechaLimite = new Date(hoy);
    fechaLimite.setDate(fechaLimite.getDate() + 3);

    const [proximosAVencer, vencidos, todosLosClientes] = await Promise.all([
      // Pedidos próximos a vencer (3 días)
      prisma.pedido.count({
        where: {
          AND: [
            { fecha_delete: null },
            {
              fecha_entrega: {
                gte: hoy,
                lte: fechaLimite,
              },
            },
          ],
        },
      }),

      // Pedidos vencidos
      prisma.pedido.count({
        where: {
          AND: [
            { fecha_delete: null },
            {
              fecha_entrega: {
                lt: hoy,
              },
            },
          ],
        },
      }),

      // Todos los clientes con sus pedidos para calcular deuda
      prisma.cliente.findMany({
        include: {
          pedidos: {
            where: {
              fecha_delete: null,
            },
            include: {
              detalles: true,
              detallesPago: true,
            },
          },
        },
      }),
    ]);

    // Calcular total de deuda pendiente
    let totalDeudaPendiente = 0;
    let clientesConDeuda = 0;

    todosLosClientes.forEach((cliente) => {
      let deudaCliente = 0;

      cliente.pedidos.forEach((pedido) => {
        const montoTotal = pedido.detalles.reduce(
          (sum, d) => sum + d.cantidad * Number(d.precio_unitario),
          0
        );
        const montoPagado = pedido.detallesPago.reduce((sum, dp) => sum + Number(dp.valor), 0);
        const montoPendiente = montoTotal - montoPagado;

        if (montoPendiente > 0.01) {
          deudaCliente += montoPendiente;
        }
      });

      if (deudaCliente > 0.01) {
        clientesConDeuda++;
        totalDeudaPendiente += deudaCliente;
      }
    });

    return {
      pedidosProximosAVencer: proximosAVencer,
      pedidosVencidos: vencidos,
      clientesConDeuda,
      totalDeudaPendiente,
    };
  }
}


