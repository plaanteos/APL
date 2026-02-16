import { Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient, Prisma } from '@prisma/client';
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

// Schemas de validación - Modelo Oficial APL
const createClientSchema = z.object({
  nombre: z.coerce.string().trim().min(2, 'Nombre debe tener al menos 2 caracteres'),
  email: z.coerce.string().trim().email('Email inválido'),
  telefono: z.coerce.string().trim().min(8, 'Teléfono debe tener al menos 8 caracteres'),
});

const updateClientSchema = z.object({
  nombre: z.coerce.string().trim().min(2, 'Nombre debe tener al menos 2 caracteres').optional(),
  email: z.coerce.string().trim().email('Email inválido').optional(),
  telefono: z.coerce.string().trim().min(8, 'Teléfono debe tener al menos 8 caracteres').optional(),
});

export class ClientController {
  // GET /api/clients
  static async getClients(req: Request, res: Response) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);

      // Construir filtros
      const where: any = {};

      if (search) {
        where.OR = [
          { nombre: { contains: search as string, mode: 'insensitive' } },
          { email: { contains: search as string, mode: 'insensitive' } },
          { telefono: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      // Obtener clientes (sin cargar pedidos/detalles) y luego calcular stats por SQL.
      const [clientes, total] = await Promise.all([
        prisma.cliente.findMany({
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
          orderBy: { id: 'desc' },
          skip: offset,
          take: Number(limit),
        }),
        prisma.cliente.count({ where }),
      ]);

      const clienteIds = clientes.map(c => c.id);

      type ClienteStatsRow = {
        cliente_id: number;
        total_pedidos: bigint | number;
        monto_total: any;
        monto_pagado: any;
      };

      const statsRows: ClienteStatsRow[] = clienteIds.length
        ? await prisma.$queryRaw<ClienteStatsRow[]>(Prisma.sql`
            SELECT
              p.id_cliente AS cliente_id,
              COUNT(*) AS total_pedidos,
              COALESCE(SUM(dp_agg.monto_total), 0) AS monto_total,
              COALESCE(SUM(pg_agg.monto_pagado), 0) AS monto_pagado
            FROM pedidos p
            LEFT JOIN (
              SELECT id_pedido, SUM(cantidad * precio_unitario) AS monto_total
              FROM detalle_pedidos
              GROUP BY id_pedido
            ) dp_agg ON dp_agg.id_pedido = p.id
            LEFT JOIN (
              SELECT id_pedido, SUM(valor) AS monto_pagado
              FROM detalle_pago
              GROUP BY id_pedido
            ) pg_agg ON pg_agg.id_pedido = p.id
            WHERE p.fecha_delete IS NULL
              AND p.id_cliente IN (${Prisma.join(clienteIds)})
            GROUP BY p.id_cliente
          `)
        : [];

      const statsByClienteId = new Map<number, { totalPedidos: number; montoTotal: number; montoPagado: number }>();
      for (const row of statsRows) {
        const totalPedidos = Number(row.total_pedidos ?? 0);
        const montoTotal = Number(row.monto_total ?? 0);
        const montoPagado = Number(row.monto_pagado ?? 0);
        statsByClienteId.set(Number(row.cliente_id), { totalPedidos, montoTotal, montoPagado });
      }

      const clientesWithStats = clientes.map((cliente) => {
        const stats = statsByClienteId.get(cliente.id) ?? { totalPedidos: 0, montoTotal: 0, montoPagado: 0 };
        const montoPendiente = stats.montoTotal - stats.montoPagado;
        return {
          ...cliente,
          totalPedidos: stats.totalPedidos,
          montoTotal: stats.montoTotal,
          montoPagado: stats.montoPagado,
          montoPendiente,
        };
      });

      res.json({
        success: true,
        data: clientesWithStats,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error('Get clients error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // GET /api/clients/:id
  static async getClientById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const cliente = await prisma.cliente.findUnique({
        where: { id: Number(id) },
        include: {
          administrador: {
            select: {
              id: true,
              nombre: true,
              email: true,
            },
          },
          pedidos: {
            where: {
              fecha_delete: null,
            },
            include: {
              detalles: {
                include: {
                  producto: true,
                  estado: true,
                },
              },
              detallesPago: true,
            },
            orderBy: { fecha_pedido: 'desc' },
          },
        },
      });

      if (!cliente) {
        return res.status(404).json({
          success: false,
          error: 'Cliente no encontrado',
        });
      }

      // Calcular estadísticas
      const totalPedidos = cliente.pedidos.length;

      const montoTotal = cliente.pedidos.reduce((sum, pedido) => {
        const montoPedido = pedido.detalles.reduce(
          (detSum, det) => detSum + (det.cantidad * Number(det.precio_unitario)),
          0
        );
        return sum + montoPedido;
      }, 0);

      const montoPagado = cliente.pedidos.reduce((sum, pedido) => {
        const pagadoPedido = pedido.detallesPago.reduce(
          (pagSum, det) => pagSum + Number(det.valor),
          0
        );
        return sum + pagadoPedido;
      }, 0);

      const montoPendiente = montoTotal - montoPagado;

      res.json({
        success: true,
        data: {
          ...cliente,
          totalPedidos,
          montoTotal,
          montoPagado,
          montoPendiente,
        },
      });
    } catch (error) {
      console.error('Get client by id error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // POST /api/clients
  static async createClient(req: Request, res: Response) {
    try {
      const clientData = createClientSchema.parse(req.body);

      const authReq = req as AuthRequest;
      const adminId = authReq.user?.id;
      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Acceso denegado. Usuario no autenticado.',
        });
      }

      // Verificar si el email ya existe
      const existingClient = await prisma.cliente.findUnique({
        where: { email: clientData.email },
      });

      if (existingClient) {
        return res.status(400).json({
          success: false,
          error: 'Ya existe un cliente con este email',
        });
      }

      // Crear cliente
      const newClient = await prisma.cliente.create({
        data: {
          ...clientData,
          id_administrador: adminId,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Cliente creado exitosamente',
        data: {
          ...newClient,
          totalPedidos: 0,
          montoTotal: 0,
          montoPagado: 0,
          montoPendiente: 0,
        },
      });
    } catch (error) {
      console.error('Create client error:', error);

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

  // PUT /api/clients/:id
  static async updateClient(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = updateClientSchema.parse(req.body);

      // Verificar que el cliente existe
      const existingClient = await prisma.cliente.findUnique({
        where: { id: Number(id) },
      });

      if (!existingClient) {
        return res.status(404).json({
          success: false,
          error: 'Cliente no encontrado',
        });
      }

      // Si se está actualizando el email, verificar que no esté en uso
      if (updateData.email && updateData.email !== existingClient.email) {
        const emailExists = await prisma.cliente.findUnique({
          where: { email: updateData.email },
        });

        if (emailExists) {
          return res.status(400).json({
            success: false,
            error: 'Ya existe un cliente con este email',
          });
        }
      }

      // Actualizar cliente
      const updatedClient = await prisma.cliente.update({
        where: { id: Number(id) },
        data: updateData,
        include: {
          pedidos: {
            where: { fecha_delete: null },
            include: {
              detalles: true,
              detallesPago: true,
            },
          },
        },
      });

      // Calcular estadísticas
      const totalPedidos = updatedClient.pedidos.length;
      const montoTotal = updatedClient.pedidos.reduce((sum, pedido) => {
        const montoPedido = pedido.detalles.reduce(
          (detSum, det) => detSum + (det.cantidad * Number(det.precio_unitario)),
          0
        );
        return sum + montoPedido;
      }, 0);
      const montoPagado = updatedClient.pedidos.reduce((sum, pedido) => {
        const pagadoPedido = pedido.detallesPago.reduce(
          (pagSum, det) => pagSum + Number(det.valor),
          0
        );
        return sum + pagadoPedido;
      }, 0);
      const montoPendiente = montoTotal - montoPagado;

      // Registrar auditoría
      const { pedidos, ...clienteData } = updatedClient;
      res.json({
        success: true,
        message: 'Cliente actualizado exitosamente',
        data: {
          ...clienteData,
          totalPedidos,
          montoTotal,
          montoPagado,
          montoPendiente,
        },
      });
    } catch (error) {
      console.error('Update client error:', error);

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

  // DELETE /api/clients/:id
  static async deleteClient(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Verificar que el cliente existe
      const existingClient = await prisma.cliente.findUnique({
        where: { id: Number(id) },
        include: {
          pedidos: {
            where: {
              fecha_delete: null, // Solo pedidos activos
            },
          },
        },
      });

      if (!existingClient) {
        return res.status(404).json({
          success: false,
          error: 'Cliente no encontrado',
        });
      }

      // Verificar que no tenga pedidos activos
      if (existingClient.pedidos.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'No se puede eliminar un cliente con pedidos activos. Elimine o complete los pedidos primero.',
        });
      }

      // Eliminar permanentemente (en modelo oficial no hay campo activo)
      await prisma.cliente.delete({
        where: { id: Number(id) },
      });

      // Registrar auditoría
      res.json({
        success: true,
        message: 'Cliente eliminado exitosamente',
      });
    } catch (error) {
      console.error('Delete client error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // GET /api/clients/stats
  static async getClientsStats(req: Request, res: Response) {
    try {
      const totalClientes = await prisma.cliente.count();

      // Estadísticas por administrador (top 5)
      const clientesPorAdmin = await prisma.cliente.groupBy({
        by: ['id_administrador'],
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: 5,
      });

      res.json({
        success: true,
        data: {
          totalClientes,
          clientesPorAdmin,
        },
      });
    } catch (error) {
      console.error('Get clients stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // GET /api/clients/:id/balance - Obtener balance completo del cliente
  static async getClientBalance(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const cliente = await prisma.cliente.findUnique({
        where: { id: Number(id) },
        select: {
          id: true,
          nombre: true,
          email: true,
          telefono: true,
        },
      });

      if (!cliente) {
        return res.status(404).json({
          success: false,
          error: 'Cliente no encontrado',
        });
      }

      type PedidoBalanceRow = {
        id: number;
        fecha_pedido: Date;
        fecha_entrega: Date;
        entregado: boolean | null;
        cantidad_productos: bigint | number | null;
        monto_total: any;
        monto_pagado: any;
        cantidad_pagos: bigint | number | null;
        ultimo_pago_fecha: Date | null;
        ultimo_pago_valor: any;
      };

      const pedidosConBalance = await prisma.$queryRaw<PedidoBalanceRow[]>(Prisma.sql`
        SELECT
          p.id,
          p.fecha_pedido,
          p.fecha_entrega,
          COALESCE(st_agg.entregado, false) AS entregado,
          COALESCE(dp_agg.cantidad_productos, 0) AS cantidad_productos,
          COALESCE(dp_agg.monto_total, 0) AS monto_total,
          COALESCE(pg_agg.monto_pagado, 0) AS monto_pagado,
          COALESCE(pg_agg.cantidad_pagos, 0) AS cantidad_pagos,
          lastp.fecha_pago AS ultimo_pago_fecha,
          lastp.valor AS ultimo_pago_valor
        FROM pedidos p
        LEFT JOIN (
          SELECT
            dp.id_pedido,
            BOOL_AND(LOWER(e.descripcion) = 'entregado') AS entregado
          FROM detalle_pedidos dp
          INNER JOIN estado e ON e.id = dp.id_estado
          GROUP BY dp.id_pedido
        ) st_agg ON st_agg.id_pedido = p.id
        LEFT JOIN (
          SELECT
            id_pedido,
            COUNT(*) AS cantidad_productos,
            SUM(cantidad * precio_unitario) AS monto_total
          FROM detalle_pedidos
          GROUP BY id_pedido
        ) dp_agg ON dp_agg.id_pedido = p.id
        LEFT JOIN (
          SELECT
            id_pedido,
            COUNT(*) AS cantidad_pagos,
            SUM(valor) AS monto_pagado
          FROM detalle_pago
          GROUP BY id_pedido
        ) pg_agg ON pg_agg.id_pedido = p.id
        LEFT JOIN (
          SELECT DISTINCT ON (id_pedido)
            id_pedido,
            fecha_pago,
            valor
          FROM detalle_pago
          ORDER BY id_pedido, fecha_pago DESC, id DESC
        ) lastp ON lastp.id_pedido = p.id
        WHERE p.id_cliente = ${Number(id)}
          AND p.fecha_delete IS NULL
        ORDER BY p.fecha_pedido DESC
      `).then(rows => rows.map(r => {
        const montoTotal = Number(r.monto_total ?? 0);
        const montoPagado = Number(r.monto_pagado ?? 0);
        const montoPendiente = montoTotal - montoPagado;
        return {
          id: Number(r.id),
          fecha_pedido: r.fecha_pedido,
          fecha_entrega: r.fecha_entrega,
          entregado: Boolean(r.entregado),
          cantidadProductos: Number(r.cantidad_productos ?? 0),
          montoTotal,
          montoPagado,
          montoPendiente,
          cantidadPagos: Number(r.cantidad_pagos ?? 0),
          ultimoPago: r.ultimo_pago_fecha
            ? { fecha: r.ultimo_pago_fecha, monto: Number(r.ultimo_pago_valor ?? 0) }
            : null,
        };
      }));

      // Resumen global
      const totalPedidos = pedidosConBalance.length;
      const montoTotal = pedidosConBalance.reduce((sum, p) => sum + p.montoTotal, 0);
      const montoPagado = pedidosConBalance.reduce((sum, p) => sum + p.montoPagado, 0);
      const montoPendiente = pedidosConBalance.reduce((sum, p) => sum + p.montoPendiente, 0);

      const balance = {
        cliente: {
          id: cliente.id,
          nombre: cliente.nombre,
          email: cliente.email,
          telefono: cliente.telefono,
        },
        resumen: {
          totalPedidos,
          montoTotal,
          montoPagado,
          montoPendiente,
          porcentajePagado: montoTotal > 0 ? Math.round((montoPagado / montoTotal) * 100 * 100) / 100 : 0,
        },
        pedidos: pedidosConBalance,
      };

      res.json({
        success: true,
        data: balance,
      });
    } catch (error) {
      console.error('Get client balance error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  /**
   * GET /api/clients/:id/balance/export - Exportar balance a Excel
   */
  static async exportBalanceToExcel(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Verificar que el cliente existe
      const cliente = await prisma.cliente.findUnique({
        where: { id: Number(id) },
      });

      if (!cliente) {
        return res.status(404).json({
          success: false,
          error: 'Cliente no encontrado',
        });
      }

      // Generar Excel
      const { ExcelService } = await import('../services/excel.service');
      const buffer = await ExcelService.generateBalanceExcel(Number(id));

      // Configurar headers para descarga
      const filename = `Balance_${cliente.nombre.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length.toString());

      // Registrar en auditoría
      const usuario = (req as any).user?.usuario || 'sistema';
      await AuditService.log(
        usuario,
        `BALANCE_EXPORTED - Balance exportado a Excel para cliente ${cliente.nombre} (ID: ${id})`
      );

      res.send(buffer);
    } catch (error) {
      console.error('Export balance to Excel error:', error);
      res.status(500).json({
        success: false,
        error: 'Error al generar archivo Excel',
      });
    }
  }
}
