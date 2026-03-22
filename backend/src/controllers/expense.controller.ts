import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import logger from '../utils/logger';

export const ExpenseController = {
  /**
   * GET /api/expenses
   * Obtener todos los gastos (con filtros opcionales por tipo, fechaDesde, fechaHasta)
   */
  async getAll(req: Request, res: Response): Promise<void> {
    const adminId = (req as any).user?.id;
    const { tipo, fechaDesde, fechaHasta } = req.query;

    const where: any = { id_administrador: Number(adminId) };

    if (tipo && tipo !== 'all') {
      where.tipo = String(tipo);
    }

    if (fechaDesde || fechaHasta) {
      where.fecha = {};
      if (fechaDesde) where.fecha.gte = new Date(String(fechaDesde));
      if (fechaHasta) {
        const end = new Date(String(fechaHasta));
        end.setHours(23, 59, 59, 999);
        where.fecha.lte = end;
      }
    }

    const gastos = await prisma.otroGasto.findMany({
      where,
      orderBy: { fecha: 'desc' },
    });

    const mapped = gastos.map((g) => ({
      id: String(g.id),
      tipo: g.tipo as 'supplies' | 'delivery',
      descripcion: g.descripcion,
      monto: Number(g.monto),
      fecha: g.fecha.toISOString(),
      id_administrador: g.id_administrador,
    }));

    res.json({ success: true, data: mapped });
  },

  /**
   * POST /api/expenses
   * Crear un nuevo gasto
   */
  async create(req: Request, res: Response): Promise<void> {
    const adminId = (req as any).user?.id;
    const { tipo, descripcion, monto } = req.body;

    if (!tipo || !descripcion || monto === undefined) {
      res.status(400).json({ success: false, error: 'Campos requeridos: tipo, descripcion, monto' });
      return;
    }

    if (!['supplies', 'delivery'].includes(tipo)) {
      res.status(400).json({ success: false, error: 'Tipo inválido. Use "supplies" o "delivery"' });
      return;
    }

    const montoNum = Number(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      res.status(400).json({ success: false, error: 'Monto debe ser un número positivo' });
      return;
    }

    const gasto = await prisma.otroGasto.create({
      data: {
        tipo: String(tipo),
        descripcion: String(descripcion),
        monto: montoNum,
        id_administrador: Number(adminId),
      },
    });

    logger.info(`Gasto creado: ID ${gasto.id}, tipo ${gasto.tipo}, monto ${gasto.monto}`);

    res.status(201).json({
      success: true,
      data: {
        id: String(gasto.id),
        tipo: gasto.tipo,
        descripcion: gasto.descripcion,
        monto: Number(gasto.monto),
        fecha: gasto.fecha.toISOString(),
        id_administrador: gasto.id_administrador,
      },
    });
  },

  /**
   * DELETE /api/expenses/:id
   * Eliminar un gasto
   */
  async delete(req: Request, res: Response): Promise<void> {
    const adminId = (req as any).user?.id;
    const { id } = req.params;

    const gasto = await prisma.otroGasto.findFirst({
      where: { id: Number(id), id_administrador: Number(adminId) },
    });

    if (!gasto) {
      res.status(404).json({ success: false, error: 'Gasto no encontrado' });
      return;
    }

    await prisma.otroGasto.delete({ where: { id: Number(id) } });

    res.json({ success: true, message: 'Gasto eliminado' });
  },

  /**
   * GET /api/expenses/summary
   * Resumen de gastos por período (mensual o anual)
   * Query params: period=monthly|yearly, year=YYYY, month=MM
   */
  async getSummary(req: Request, res: Response): Promise<void> {
    const adminId = (req as any).user?.id;
    const { period, year, month } = req.query;

    const where: any = { id_administrador: Number(adminId) };

    if (period === 'monthly' && year && month) {
      const y = parseInt(String(year));
      const m = parseInt(String(month));
      where.fecha = {
        gte: new Date(y, m - 1, 1),
        lt: new Date(y, m, 1),
      };
    } else if (period === 'yearly' && year) {
      const y = parseInt(String(year));
      where.fecha = {
        gte: new Date(y, 0, 1),
        lt: new Date(y + 1, 0, 1),
      };
    }

    const gastos = await prisma.otroGasto.findMany({
      where,
      orderBy: { fecha: 'desc' },
    });

    const totalInsumos = gastos
      .filter((g) => g.tipo === 'supplies')
      .reduce((sum, g) => sum + Number(g.monto), 0);

    const totalCadeteria = gastos
      .filter((g) => g.tipo === 'delivery')
      .reduce((sum, g) => sum + Number(g.monto), 0);

    const total = totalInsumos + totalCadeteria;

    res.json({
      success: true,
      data: {
        total,
        totalInsumos,
        totalCadeteria,
        cantidad: gastos.length,
        gastos: gastos.map((g) => ({
          id: String(g.id),
          tipo: g.tipo,
          descripcion: g.descripcion,
          monto: Number(g.monto),
          fecha: g.fecha.toISOString(),
        })),
      },
    });
  },
};
