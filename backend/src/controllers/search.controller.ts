import { Request, Response } from 'express';
import { z } from 'zod';
import { AdvancedSearchService } from '../services/search.service';

// Schema de validación para búsqueda avanzada
const advancedSearchSchema = z.object({
  query: z.string().optional(),
  fechaDesde: z.string().transform((str) => new Date(str)).optional(),
  fechaHasta: z.string().transform((str) => new Date(str)).optional(),
  tipoCliente: z.enum(['CLINICA', 'ODONTOLOGO']).optional(),
  clienteActivo: z.string().transform((str) => str === 'true').optional(),
  ciudad: z.string().optional(),
  estadoPedido: z.enum(['PENDIENTE', 'EN_PROCESO', 'ENTREGADO', 'PAGADO', 'CANCELADO']).optional(),
  prioridad: z.enum(['BAJA', 'NORMAL', 'ALTA', 'URGENTE']).optional(),
  clienteId: z.string().optional(),
  montoPendienteMin: z.string().transform(Number).optional(),
  montoPendienteMax: z.string().transform(Number).optional(),
  montoTotalMin: z.string().transform(Number).optional(),
  montoTotalMax: z.string().transform(Number).optional(),
  metodoPago: z.enum(['EFECTIVO', 'TRANSFERENCIA', 'TARJETA_CREDITO', 'TARJETA_DEBITO', 'CHEQUE']).optional(),
  pedidoId: z.string().optional(),
  orderBy: z.string().optional(),
  orderDirection: z.enum(['asc', 'desc']).optional(),
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
});

export class SearchController {
  // GET /api/search/global
  static async globalSearch(req: Request, res: Response) {
    try {
      const filters = advancedSearchSchema.parse(req.query);
      const results = await AdvancedSearchService.globalSearch(filters);

      res.json({
        success: true,
        data: results,
        totalResults: {
          clientes: results.clientes.total,
          pedidos: results.pedidos.total,
          pagos: results.pagos.total,
        },
      });
    } catch (error) {
      console.error('Global search error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Parámetros de búsqueda inválidos',
          details: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // GET /api/search/clientes
  static async searchClientes(req: Request, res: Response) {
    try {
      const filters = advancedSearchSchema.parse(req.query);
      const result = await AdvancedSearchService.searchClientes(filters);

      res.json({
        success: true,
        data: result.data,
        pagination: {
          page: result.page,
          limit: filters.limit || 20,
          total: result.total,
          totalPages: result.totalPages,
          hasMore: result.hasMore,
        },
      });
    } catch (error) {
      console.error('Search clientes error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Parámetros de búsqueda inválidos',
          details: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // GET /api/search/pedidos
  static async searchPedidos(req: Request, res: Response) {
    try {
      const filters = advancedSearchSchema.parse(req.query);
      const result = await AdvancedSearchService.searchPedidos(filters);

      res.json({
        success: true,
        data: result.data,
        pagination: {
          page: result.page,
          limit: filters.limit || 20,
          total: result.total,
          totalPages: result.totalPages,
          hasMore: result.hasMore,
        },
      });
    } catch (error) {
      console.error('Search pedidos error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Parámetros de búsqueda inválidos',
          details: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // GET /api/search/pagos
  static async searchPagos(req: Request, res: Response) {
    try {
      const filters = advancedSearchSchema.parse(req.query);
      const result = await AdvancedSearchService.searchPagos(filters);

      res.json({
        success: true,
        data: result.data,
        pagination: {
          page: result.page,
          limit: filters.limit || 20,
          total: result.total,
          totalPages: result.totalPages,
          hasMore: result.hasMore,
        },
      });
    } catch (error) {
      console.error('Search pagos error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Parámetros de búsqueda inválidos',
          details: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // GET /api/search/pedidos-with-stats
  static async searchPedidosWithStats(req: Request, res: Response) {
    try {
      const filters = advancedSearchSchema.parse(req.query);
      const result = await AdvancedSearchService.searchWithStats(filters);

      res.json({
        success: true,
        data: result.pedidos.data,
        stats: result.stats,
        pagination: {
          page: result.pedidos.page,
          limit: filters.limit || 20,
          total: result.pedidos.total,
          totalPages: result.pedidos.totalPages,
          hasMore: result.pedidos.hasMore,
        },
      });
    } catch (error) {
      console.error('Search pedidos with stats error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Parámetros de búsqueda inválidos',
          details: error.errors,
        });
      }

      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // GET /api/search/pedidos-proximos-vencer
  static async getPedidosProximosVencer(req: Request, res: Response) {
    try {
      const { dias = '7' } = req.query;
      const diasNum = Number(dias);

      const pedidos = await AdvancedSearchService.searchPedidosProximosVencer(diasNum);

      res.json({
        success: true,
        data: pedidos,
        total: pedidos.length,
        dias: diasNum,
      });
    } catch (error) {
      console.error('Get pedidos proximos vencer error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }

  // GET /api/search/clientes-con-deuda
  static async getClientesConDeuda(req: Request, res: Response) {
    try {
      const clientes = await AdvancedSearchService.searchClientesConDeuda();

      res.json({
        success: true,
        data: clientes,
        total: clientes.length,
      });
    } catch (error) {
      console.error('Get clientes con deuda error:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
      });
    }
  }
}
