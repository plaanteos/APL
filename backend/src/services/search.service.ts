import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Servicio de Búsqueda - Modelo Oficial APL
 * Búsqueda global simplificada en clientes y pedidos
 */

interface SearchResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

interface ClientSearchFilters {
  query?: string;
  adminId?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface OrderSearchFilters {
  query?: string;
  clienteId?: number;
  estadoId?: number;
  adminId?: number;
  fechaDesde?: Date;
  fechaHasta?: Date;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class SearchService {
  /**
   * Búsqueda de clientes con filtros
   */
  static async searchClients(filters: ClientSearchFilters): Promise<SearchResult<any>> {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ClienteWhereInput = {};

    // Búsqueda por texto
    if (filters.query) {
      where.OR = [
        { nombre: { contains: filters.query } },
        { email: { contains: filters.query } },
        { telefono: { contains: filters.query } },
      ];
    }

    // Filtrar por administrador
    if (filters.adminId) {
      where.id_administrador = filters.adminId;
    }

    // Ordenamiento
    let orderBy: Prisma.ClienteOrderByWithRelationInput = { id: 'desc' };
    if (filters.sortBy === 'nombre') {
      orderBy = { nombre: filters.sortOrder || 'asc' };
    } else if (filters.sortBy === 'email') {
      orderBy = { email: filters.sortOrder || 'asc' };
    }

    const [items, total] = await Promise.all([
      prisma.cliente.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          administrador: {
            select: {
              id: true,
              usuario: true,
              email: true,
            },
          },
          pedidos: {
            select: {
              id: true,
            },
          },
        },
      }),
      prisma.cliente.count({ where }),
    ]);

    // Transformar resultados con conteo de pedidos
    const results = items.map((cliente) => ({
      id: cliente.id,
      nombre: cliente.nombre,
      email: cliente.email,
      telefono: cliente.telefono,
      id_administrador: cliente.id_administrador,
      administrador: cliente.administrador,
      totalPedidos: cliente.pedidos.length,
    }));

    return {
      items: results,
      total,
      page,
      limit,
    };
  }

  /**
   * Búsqueda de pedidos con filtros
   */
  static async searchOrders(filters: OrderSearchFilters): Promise<SearchResult<any>> {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.PedidoWhereInput = {};

    // Excluir pedidos eliminados
    where.fecha_delete = null;

    // Búsqueda por cliente (nombre)
    if (filters.query) {
      where.cliente = {
        nombre: { contains: filters.query },
      };
    }

    // Filtrar por cliente ID
    if (filters.clienteId) {
      where.id_cliente = filters.clienteId;
    }

    // Filtrar por estado (via detalles)
    if (filters.estadoId) {
      where.detalles = {
        some: {
          id_estado: filters.estadoId,
        },
      };
    }

    // Filtrar por administrador
    if (filters.adminId) {
      where.id_administrador = filters.adminId;
    }

    // Filtrar por fechas
    if (filters.fechaDesde || filters.fechaHasta) {
      where.fecha_pedido = {};
      if (filters.fechaDesde) where.fecha_pedido.gte = filters.fechaDesde;
      if (filters.fechaHasta) where.fecha_pedido.lte = filters.fechaHasta;
    }

    // Ordenamiento
    let orderBy: Prisma.PedidoOrderByWithRelationInput = { fecha_pedido: 'desc' };
    if (filters.sortBy === 'fecha_entrega') {
      orderBy = { fecha_entrega: filters.sortOrder || 'asc' };
    }

    const [items, total] = await Promise.all([
      prisma.pedido.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          cliente: {
            select: {
              id: true,
              nombre: true,
              telefono: true,
            },
          },
          administrador: {
            select: {
              id: true,
              usuario: true,
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
      }),
      prisma.pedido.count({ where }),
    ]);

    // Calcular montos dinámicamente para cada pedido
    const results = items.map((pedido) => {
      const montoTotal = pedido.detalles.reduce(
        (sum: number, d) => sum + d.cantidad * Number(d.precio_unitario),
        0
      );
      const montoPagado = pedido.detallesPago.reduce(
        (sum: number, dp) => sum + Number(dp.valor),
        0
      );
      const montoPendiente = montoTotal - montoPagado;

      return {
        id: pedido.id,
        id_cliente: pedido.id_cliente,
        id_administrador: pedido.id_administrador,
        fecha_pedido: pedido.fecha_pedido,
        fecha_entrega: pedido.fecha_entrega,
        cliente: pedido.cliente,
        administrador: pedido.administrador,
        detalles: pedido.detalles,
        montoTotal,
        montoPagado,
        montoPendiente,
        totalDetalles: pedido.detalles.length,
      };
    });

    return {
      items: results,
      total,
      page,
      limit,
    };
  }

  /**
   * Búsqueda global en todas las entidades
   */
  static async globalSearch(query: string, limit: number = 5): Promise<{
    clientes: any[];
    pedidos: any[];
  }> {
    const [clientes, pedidos] = await Promise.all([
      // Buscar clientes
      prisma.cliente.findMany({
        where: {
          OR: [
            { nombre: { contains: query } },
            { email: { contains: query } },
            { telefono: { contains: query } },
          ],
        },
        take: limit,
        select: {
          id: true,
          nombre: true,
          email: true,
          telefono: true,
        },
      }),

      // Buscar pedidos (por nombre de cliente)
      prisma.pedido.findMany({
        where: {
          AND: [
            { fecha_delete: null },
            {
              cliente: {
                nombre: { contains: query },
              },
            },
          ],
        },
        take: limit,
        include: {
          cliente: {
            select: {
              id: true,
              nombre: true,
            },
          },
          detalles: {
            take: 3,
            include: {
              producto: true,
            },
          },
        },
      }),
    ]);

    return {
      clientes,
      pedidos: pedidos.map((p) => ({
        id: p.id,
        fecha_pedido: p.fecha_pedido,
        fecha_entrega: p.fecha_entrega,
        cliente: p.cliente,
        totalDetalles: p.detalles.length,
      })),
    };
  }
}
