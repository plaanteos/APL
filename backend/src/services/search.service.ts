import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Servicio de búsqueda avanzada con filtros combinados
 * Permite realizar búsquedas complejas en múltiples entidades
 */

export interface AdvancedSearchFilters {
  // Búsqueda global
  query?: string;
  
  // Filtros de fecha
  fechaDesde?: Date;
  fechaHasta?: Date;
  
  // Filtros específicos para clientes
  tipoCliente?: 'CLINICA' | 'ODONTOLOGO';
  clienteActivo?: boolean;
  ciudad?: string;
  
  // Filtros específicos para pedidos
  estadoPedido?: 'PENDIENTE' | 'EN_PROCESO' | 'ENTREGADO' | 'PAGADO' | 'CANCELADO';
  prioridad?: 'BAJA' | 'NORMAL' | 'ALTA' | 'URGENTE';
  clienteId?: string;
  montoPendienteMin?: number;
  montoPendienteMax?: number;
  montoTotalMin?: number;
  montoTotalMax?: number;
  
  // Filtros específicos para pagos
  metodoPago?: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA_CREDITO' | 'TARJETA_DEBITO' | 'CHEQUE';
  pedidoId?: string;
  
  // Opciones de ordenamiento
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  
  // Paginación
  page?: number;
  limit?: number;
}

export interface SearchResult<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

export class AdvancedSearchService {
  /**
   * Búsqueda global en todas las entidades
   */
  static async globalSearch(filters: AdvancedSearchFilters): Promise<{
    clientes: SearchResult<any>;
    pedidos: SearchResult<any>;
    pagos: SearchResult<any>;
  }> {
    const [clientes, pedidos, pagos] = await Promise.all([
      this.searchClientes(filters),
      this.searchPedidos(filters),
      this.searchPagos(filters),
    ]);

    return { clientes, pedidos, pagos };
  }

  /**
   * Búsqueda avanzada de clientes
   */
  static async searchClientes(filters: AdvancedSearchFilters): Promise<SearchResult<any>> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const where: Prisma.ClienteWhereInput = {};

    // Búsqueda por texto
    if (filters.query) {
      where.OR = [
        { nombre: { contains: filters.query } },
        { email: { contains: filters.query } },
        { telefono: { contains: filters.query } },
        { whatsapp: { contains: filters.query } },
        { direccion: { contains: filters.query } },
        { ciudad: { contains: filters.query } },
      ];
    }

    // Filtros específicos
    if (filters.tipoCliente) {
      where.tipo = filters.tipoCliente;
    }

    if (filters.clienteActivo !== undefined) {
      where.activo = filters.clienteActivo;
    }

    if (filters.ciudad) {
      where.ciudad = { contains: filters.ciudad };
    }

    if (filters.fechaDesde || filters.fechaHasta) {
      where.fechaRegistro = {};
      if (filters.fechaDesde) where.fechaRegistro.gte = filters.fechaDesde;
      if (filters.fechaHasta) where.fechaRegistro.lte = filters.fechaHasta;
    }

    // Ordenamiento
    let orderBy: Prisma.ClienteOrderByWithRelationInput = { createdAt: 'desc' };
    if (filters.orderBy) {
      orderBy = { [filters.orderBy]: filters.orderDirection || 'asc' };
    }

    const [data, total] = await Promise.all([
      prisma.cliente.findMany({
        where,
        include: {
          _count: {
            select: { pedidos: true },
          },
          pedidos: {
            select: {
              id: true,
              montoTotal: true,
              montoPendiente: true,
            },
          },
        },
        orderBy,
        skip: offset,
        take: limit,
      }),
      prisma.cliente.count({ where }),
    ]);

    // Calcular métricas agregadas
    const formattedData = data.map(cliente => ({
      ...cliente,
      totalPedidos: cliente._count.pedidos,
      montoTotal: cliente.pedidos.reduce((sum, p) => sum + Number(p.montoTotal), 0),
      montoPendiente: cliente.pedidos.reduce((sum, p) => sum + Number(p.montoPendiente), 0),
    }));

    return {
      data: formattedData,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasMore: offset + limit < total,
    };
  }

  /**
   * Búsqueda avanzada de pedidos
   */
  static async searchPedidos(filters: AdvancedSearchFilters): Promise<SearchResult<any>> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const where: Prisma.PedidoWhereInput = {};

    // Búsqueda por texto
    if (filters.query) {
      where.OR = [
        { numeroPedido: { contains: filters.query } },
        { nombrePaciente: { contains: filters.query } },
        { descripcion: { contains: filters.query } },
        { tipoPedido: { contains: filters.query } },
        { observaciones: { contains: filters.query } },
        { cliente: { nombre: { contains: filters.query } } },
      ];
    }

    // Filtros específicos
    if (filters.estadoPedido) {
      where.estado = filters.estadoPedido;
    }

    if (filters.prioridad) {
      where.prioridad = filters.prioridad;
    }

    if (filters.clienteId) {
      where.clienteId = filters.clienteId;
    }

    // Filtros de monto
    if (filters.montoPendienteMin !== undefined || filters.montoPendienteMax !== undefined) {
      where.montoPendiente = {};
      if (filters.montoPendienteMin !== undefined) {
        where.montoPendiente.gte = filters.montoPendienteMin;
      }
      if (filters.montoPendienteMax !== undefined) {
        where.montoPendiente.lte = filters.montoPendienteMax;
      }
    }

    if (filters.montoTotalMin !== undefined || filters.montoTotalMax !== undefined) {
      where.montoTotal = {};
      if (filters.montoTotalMin !== undefined) {
        where.montoTotal.gte = filters.montoTotalMin;
      }
      if (filters.montoTotalMax !== undefined) {
        where.montoTotal.lte = filters.montoTotalMax;
      }
    }

    // Filtros de fecha
    if (filters.fechaDesde || filters.fechaHasta) {
      where.fechaPedido = {};
      if (filters.fechaDesde) where.fechaPedido.gte = filters.fechaDesde;
      if (filters.fechaHasta) where.fechaPedido.lte = filters.fechaHasta;
    }

    // Ordenamiento
    let orderBy: Prisma.PedidoOrderByWithRelationInput = { fechaPedido: 'desc' };
    if (filters.orderBy) {
      orderBy = { [filters.orderBy]: filters.orderDirection || 'asc' };
    }

    const [data, total] = await Promise.all([
      prisma.pedido.findMany({
        where,
        include: {
          cliente: {
            select: {
              id: true,
              nombre: true,
              email: true,
              telefono: true,
              tipo: true,
            },
          },
          detallesPedido: true,
          _count: {
            select: { pagos: true },
          },
        },
        orderBy,
        skip: offset,
        take: limit,
      }),
      prisma.pedido.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasMore: offset + limit < total,
    };
  }

  /**
   * Búsqueda avanzada de pagos
   */
  static async searchPagos(filters: AdvancedSearchFilters): Promise<SearchResult<any>> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const where: Prisma.PagoWhereInput = {};

    // Búsqueda por texto
    if (filters.query) {
      where.OR = [
        { numeroPago: { contains: filters.query } },
        { numeroRecibo: { contains: filters.query } },
        { numeroTransf: { contains: filters.query } },
        { observaciones: { contains: filters.query } },
        { pedido: { numeroPedido: { contains: filters.query } } },
        { pedido: { cliente: { nombre: { contains: filters.query } } } },
      ];
    }

    // Filtros específicos
    if (filters.metodoPago) {
      where.metodoPago = filters.metodoPago;
    }

    if (filters.pedidoId) {
      where.pedidoId = filters.pedidoId;
    }

    if (filters.clienteId) {
      where.pedido = { clienteId: filters.clienteId };
    }

    // Filtros de fecha
    if (filters.fechaDesde || filters.fechaHasta) {
      where.fechaPago = {};
      if (filters.fechaDesde) where.fechaPago.gte = filters.fechaDesde;
      if (filters.fechaHasta) where.fechaPago.lte = filters.fechaHasta;
    }

    // Ordenamiento
    let orderBy: Prisma.PagoOrderByWithRelationInput = { fechaPago: 'desc' };
    if (filters.orderBy) {
      orderBy = { [filters.orderBy]: filters.orderDirection || 'asc' };
    }

    const [data, total] = await Promise.all([
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
        orderBy,
        skip: offset,
        take: limit,
      }),
      prisma.pago.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasMore: offset + limit < total,
    };
  }

  /**
   * Búsqueda con estadísticas agregadas
   */
  static async searchWithStats(filters: AdvancedSearchFilters): Promise<{
    pedidos: SearchResult<any>;
    stats: {
      totalPedidos: number;
      montoTotalGeneral: number;
      montoPendienteTotal: number;
      promedioMonto: number;
      pedidosPorEstado: Record<string, number>;
      pedidosPorPrioridad: Record<string, number>;
    };
  }> {
    const pedidos = await this.searchPedidos(filters);

    // Construir where para estadísticas (mismo que búsqueda pero sin paginación)
    const where: Prisma.PedidoWhereInput = {};
    
    if (filters.query) {
      where.OR = [
        { numeroPedido: { contains: filters.query } },
        { nombrePaciente: { contains: filters.query } },
        { descripcion: { contains: filters.query } },
      ];
    }

    if (filters.estadoPedido) where.estado = filters.estadoPedido;
    if (filters.prioridad) where.prioridad = filters.prioridad;
    if (filters.clienteId) where.clienteId = filters.clienteId;

    const [aggregations, byEstado, byPrioridad] = await Promise.all([
      prisma.pedido.aggregate({
        where,
        _sum: { montoTotal: true, montoPendiente: true },
        _avg: { montoTotal: true },
        _count: true,
      }),
      prisma.pedido.groupBy({
        by: ['estado'],
        where,
        _count: true,
      }),
      prisma.pedido.groupBy({
        by: ['prioridad'],
        where,
        _count: true,
      }),
    ]);

    const stats = {
      totalPedidos: aggregations._count,
      montoTotalGeneral: Number(aggregations._sum.montoTotal || 0),
      montoPendienteTotal: Number(aggregations._sum.montoPendiente || 0),
      promedioMonto: Number(aggregations._avg.montoTotal || 0),
      pedidosPorEstado: byEstado.reduce((acc, item) => {
        acc[item.estado] = item._count;
        return acc;
      }, {} as Record<string, number>),
      pedidosPorPrioridad: byPrioridad.reduce((acc, item) => {
        acc[item.prioridad] = item._count;
        return acc;
      }, {} as Record<string, number>),
    };

    return { pedidos, stats };
  }

  /**
   * Búsqueda de pedidos por vencer
   */
  static async searchPedidosProximosVencer(dias: number = 7): Promise<any[]> {
    const hoy = new Date();
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + dias);

    const pedidos = await prisma.pedido.findMany({
      where: {
        fechaVencimiento: {
          gte: hoy,
          lte: fechaLimite,
        },
        estado: {
          notIn: ['ENTREGADO', 'PAGADO', 'CANCELADO'],
        },
      },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true,
            whatsapp: true,
          },
        },
        detallesPedido: true,
      },
      orderBy: { fechaVencimiento: 'asc' },
    });

    return pedidos.map(pedido => {
      const diasRestantes = Math.ceil(
        (pedido.fechaVencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        ...pedido,
        diasRestantes,
        esUrgente: diasRestantes <= 2,
      };
    });
  }

  /**
   * Búsqueda de clientes con deuda
   */
  static async searchClientesConDeuda(): Promise<any[]> {
    const clientes = await prisma.cliente.findMany({
      where: {
        activo: true,
        pedidos: {
          some: {
            montoPendiente: { gt: 0 },
          },
        },
      },
      include: {
        pedidos: {
          where: {
            montoPendiente: { gt: 0 },
          },
          select: {
            id: true,
            numeroPedido: true,
            montoTotal: true,
            montoPendiente: true,
            fechaPedido: true,
            estado: true,
          },
        },
      },
    });

    return clientes.map(cliente => {
      const totalDeuda = cliente.pedidos.reduce(
        (sum, p) => sum + Number(p.montoPendiente),
        0
      );
      const pedidosConDeuda = cliente.pedidos.length;

      return {
        ...cliente,
        totalDeuda,
        pedidosConDeuda,
      };
    });
  }
}
