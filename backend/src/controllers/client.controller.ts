import { Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { AuditService } from '../services/audit.service';

const prisma = new PrismaClient();

// Schemas de validación - Modelo Oficial APL
const createClientSchema = z.object({
  nombre: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  telefono: z.string().min(8, 'Teléfono debe tener al menos 8 caracteres'),
  id_administrador: z.number().int().positive('ID de administrador inválido'),
});

const updateClientSchema = z.object({
  nombre: z.string().min(2, 'Nombre debe tener al menos 2 caracteres').optional(),
  email: z.string().email('Email inválido').optional(),
  telefono: z.string().min(8, 'Teléfono debe tener al menos 8 caracteres').optional(),
  id_administrador: z.number().int().positive().optional(),
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

      // Obtener clientes con estadísticas calculadas dinámicamente
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
            pedidos: {
              include: {
                detalles: {
                  include: {
                    producto: true,
                  },
                },
                detallesPago: true,
              },
            },
          },
          orderBy: { id: 'desc' },
          skip: offset,
          take: Number(limit),
        }),
        prisma.cliente.count({ where }),
      ]);

      // Calcular estadísticas por cliente
      const clientesWithStats = clientes.map(cliente => {
        const totalPedidos = cliente.pedidos.filter(p => !p.fecha_delete).length;
        
        // Calcular montoTotal (suma de todos los detalles)
        const montoTotal = cliente.pedidos
          .filter(p => !p.fecha_delete)
          .reduce((sum, pedido) => {
            const montoPedido = pedido.detalles.reduce(
              (detSum, det) => detSum + (det.cantidad * Number(det.precio_unitario)),
              0
            );
            return sum + montoPedido;
          }, 0);

        // Calcular montoPagado (suma de todos los detalles de pago)
        const montoPagado = cliente.pedidos
          .filter(p => !p.fecha_delete)
          .reduce((sum, pedido) => {
            const pagadoPedido = pedido.detallesPago.reduce(
              (pagSum, det) => pagSum + Number(det.valor),
              0
            );
            return sum + pagadoPedido;
          }, 0);

        // Calcular montoPendiente
        const montoPendiente = montoTotal - montoPagado;

        const { pedidos, ...clienteData } = cliente;
        return {
          ...clienteData,
          totalPedidos,
          montoTotal,
          montoPagado,
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
        include: {
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
              detallesPago: {
                include: {
                  pago: true,
                },
              },
            },
            orderBy: {
              fecha_pedido: 'desc',
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

      // Calcular estadísticas por pedido
      const pedidosConBalance = cliente.pedidos.map(pedido => {
        const montoTotal = pedido.detalles.reduce(
          (sum, det) => sum + (det.cantidad * Number(det.precio_unitario)),
          0
        );
        const montoPagado = pedido.detallesPago.reduce(
          (sum, det) => sum + Number(det.valor),
          0
        );
        const montoPendiente = montoTotal - montoPagado;

        return {
          id: pedido.id,
          fecha_pedido: pedido.fecha_pedido,
          fecha_entrega: pedido.fecha_entrega,
          cantidadProductos: pedido.detalles.length,
          montoTotal,
          montoPagado,
          montoPendiente,
          cantidadPagos: pedido.detallesPago.length,
          ultimoPago: pedido.detallesPago.length > 0 
            ? {
                fecha: pedido.detallesPago[0].fecha_pago,
                monto: Number(pedido.detallesPago[0].valor),
              }
            : null,
        };
      });

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
}
