import { Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { AuditService } from '../services/audit.service';

const prisma = new PrismaClient();

// Schemas de validación
const createClientSchema = z.object({
  nombre: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  telefono: z.string().min(8, 'Teléfono debe tener al menos 8 caracteres'),
  whatsapp: z.string().optional(),
  tipo: z.enum(['CLINICA', 'ODONTOLOGO']),
  direccion: z.string().optional(),
  ciudad: z.string().optional(),
  codigoPostal: z.string().optional(),
  observaciones: z.string().optional(),
});

const updateClientSchema = createClientSchema.partial();

export class ClientController {
  // GET /api/clients
  static async getClients(req: Request, res: Response) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search, 
        tipo, 
        activo = 'true' 
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);
      const isActive = activo === 'true';

      // Construir filtros
      const where: any = {
        activo: isActive,
      };

      if (search) {
        where.OR = [
          { nombre: { contains: search as string, mode: 'insensitive' } },
          { email: { contains: search as string, mode: 'insensitive' } },
          { telefono: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      if (tipo) {
        where.tipo = tipo;
      }

      // Obtener clientes con conteos
      const [clientes, total] = await Promise.all([
        prisma.cliente.findMany({
          where,
          include: {
            pedidos: {
              select: {
                id: true,
                montoTotal: true,
                montoPendiente: true,
                estado: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: Number(limit),
        }),
        prisma.cliente.count({ where }),
      ]);

      // Calcular estadísticas por cliente
      const clientesWithStats = clientes.map(cliente => {
        const totalOrders = cliente.pedidos.length;
        const totalAmount = cliente.pedidos.reduce((sum, pedido) => sum + Number(pedido.montoTotal), 0);
        const pendingAmount = cliente.pedidos.reduce((sum, pedido) => sum + Number(pedido.montoPendiente), 0);

        const { pedidos, ...clienteData } = cliente;
        return {
          ...clienteData,
          totalOrders,
          totalAmount,
          pendingAmount,
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
        where: { id },
        include: {
          pedidos: {
            orderBy: { createdAt: 'desc' },
            include: {
              pagos: true,
            },
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
      const totalOrders = cliente.pedidos.length;
      const totalAmount = cliente.pedidos.reduce((sum, pedido) => sum + Number(pedido.montoTotal), 0);
      const pendingAmount = cliente.pedidos.reduce((sum, pedido) => sum + Number(pedido.montoPendiente), 0);

      res.json({
        success: true,
        data: {
          ...cliente,
          totalOrders,
          totalAmount,
          pendingAmount,
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
      const userId = (req as any).user?.id;

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
        data: clientData,
      });

      // Registrar auditoría
      await AuditService.logCreate(req, 'cliente', newClient.id, clientData);

      res.status(201).json({
        success: true,
        message: 'Cliente creado exitosamente',
        data: {
          ...newClient,
          totalOrders: 0,
          totalAmount: 0,
          pendingAmount: 0,
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
      const userId = (req as any).user?.id;

      // Verificar que el cliente existe
      const existingClient = await prisma.cliente.findUnique({
        where: { id },
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
        where: { id },
        data: updateData,
        include: {
          pedidos: {
            select: {
              id: true,
              montoTotal: true,
              montoPendiente: true,
            },
          },
        },
      });

      // Calcular estadísticas
      const totalOrders = updatedClient.pedidos.length;
      const totalAmount = updatedClient.pedidos.reduce((sum, pedido) => sum + Number(pedido.montoTotal), 0);
      const pendingAmount = updatedClient.pedidos.reduce((sum, pedido) => sum + Number(pedido.montoPendiente), 0);

      // Registrar auditoría
      await AuditService.logUpdate(req, 'cliente', id, existingClient, updateData);

      const { pedidos, ...clienteData } = updatedClient;
      res.json({
        success: true,
        message: 'Cliente actualizado exitosamente',
        data: {
          ...clienteData,
          totalOrders,
          totalAmount,
          pendingAmount,
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
      const userId = (req as any).user?.id;

      // Verificar que el cliente existe
      const existingClient = await prisma.cliente.findUnique({
        where: { id },
        include: {
          pedidos: {
            where: {
              estado: {
                not: 'PAGADO',
              },
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

      // Verificar que no tenga pedidos pendientes
      if (existingClient.pedidos.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'No se puede eliminar un cliente con pedidos pendientes',
        });
      }

      // Marcar como inactivo en lugar de eliminar
      await prisma.cliente.update({
        where: { id },
        data: { activo: false },
      });

      // Registrar auditoría
      await AuditService.logDelete(req, 'cliente', id, existingClient, 'Cliente marcado como inactivo');

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
      const [
        totalClients,
        totalClinics,
        totalDentists,
        totalActiveClients
      ] = await Promise.all([
        prisma.cliente.count(),
        prisma.cliente.count({ where: { tipo: 'CLINICA', activo: true } }),
        prisma.cliente.count({ where: { tipo: 'ODONTOLOGO', activo: true } }),
        prisma.cliente.count({ where: { activo: true } }),
      ]);

      res.json({
        success: true,
        data: {
          totalClients,
          totalClinics,
          totalDentists,
          totalActiveClients,
          totalInactiveClients: totalClients - totalActiveClients,
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
        where: { id },
        include: {
          pedidos: {
            include: {
              pagos: {
                select: {
                  id: true,
                  numeroPago: true,
                  monto: true,
                  metodoPago: true,
                  fechaPago: true,
                },
              },
            },
            orderBy: {
              fechaPedido: 'desc',
            },
          },
        },
      });

      if (!cliente) {
        return res.status(404).json({
          success: false,
          error: 'Cliente no encontrado',
        });
      }

      // Calcular estadísticas globales
      const pedidosActivos = cliente.pedidos.filter(p => p.estado !== 'CANCELADO');
      const pedidosPendientes = pedidosActivos.filter(p => p.estado === 'PENDIENTE');
      const pedidosEnProceso = pedidosActivos.filter(p => p.estado === 'EN_PROCESO');
      const pedidosEntregados = pedidosActivos.filter(p => p.estado === 'ENTREGADO');
      const pedidosPagados = pedidosActivos.filter(p => p.estado === 'PAGADO');

      const montoTotal = pedidosActivos.reduce((sum, p) => sum + Number(p.montoTotal), 0);
      const montoPagado = pedidosActivos.reduce((sum, p) => sum + Number(p.montoPagado), 0);
      const montoPendiente = pedidosActivos.reduce((sum, p) => sum + Number(p.montoPendiente), 0);

      // Desglose por pedido
      const pedidosConBalance = pedidosActivos.map(pedido => ({
        id: pedido.id,
        numeroPedido: pedido.numeroPedido,
        nombrePaciente: pedido.nombrePaciente,
        tipoPedido: pedido.tipoPedido,
        fechaPedido: pedido.fechaPedido,
        fechaVencimiento: pedido.fechaVencimiento,
        estado: pedido.estado,
        montoTotal: Number(pedido.montoTotal),
        montoPagado: Number(pedido.montoPagado),
        montoPendiente: Number(pedido.montoPendiente),
        cantidadPagos: pedido.pagos.length,
        ultimoPago: pedido.pagos.length > 0 
          ? {
              fecha: pedido.pagos[0].fechaPago,
              monto: Number(pedido.pagos[0].monto),
              metodo: pedido.pagos[0].metodoPago,
            }
          : null,
      }));

      const balance = {
        cliente: {
          id: cliente.id,
          nombre: cliente.nombre,
          email: cliente.email,
          telefono: cliente.telefono,
          whatsapp: cliente.whatsapp,
          tipo: cliente.tipo,
          direccion: cliente.direccion,
        },
        resumen: {
          totalPedidos: pedidosActivos.length,
          pedidosPendientes: pedidosPendientes.length,
          pedidosEnProceso: pedidosEnProceso.length,
          pedidosEntregados: pedidosEntregados.length,
          pedidosPagados: pedidosPagados.length,
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
}