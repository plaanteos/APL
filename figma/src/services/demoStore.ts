import type {
  IClient,
  IClientBalance,
  IBalanceItem,
  IOrder,
  IOrderWithCalculations,
  IDetallePedido,
  IProducto,
  IEstado,
  IPago,
  IPagoWithDetails,
  IDetallePago,
  IClientFormData,
  IProductoFormData,
  IOrderFormData,
  IPagoFormData,
  ID,
} from '../app/types';
import type { IOtherExpense, IExpenseFormData } from './expense.service';

type DemoDb = {
  adminId: ID;
  clients: IClient[];
  productos: IProducto[];
  estados: IEstado[];
  orders: IOrder[];
  pagos: IPagoWithDetails[];
  expenses: IOtherExpense[];
  nextClientId: ID;
  nextProductoId: ID;
  nextOrderId: ID;
  nextDetallePedidoId: ID;
  nextPagoId: ID;
  nextDetallePagoId: ID;
  nextExpenseId: ID;
};

const nowIso = () => new Date().toISOString();

const db: DemoDb = {
  adminId: 1,
  clients: [
    {
      id: 1,
      nombre: 'Clínica Dental Sonrisa',
      email: 'contacto@sonrisa.com',
      telefono: '+598 99 123 456',
      id_administrador: 1,
    },
    {
      id: 2,
      nombre: 'Dr. Juan Pérez',
      email: 'juan.perez@email.com',
      telefono: '+598 99 234 567',
      id_administrador: 1,
    },
    {
      id: 3,
      nombre: 'Odontología Integral',
      email: 'info@integral.com',
      telefono: '+598 99 345 678',
      id_administrador: 1,
    },
    {
      id: 4,
      nombre: 'Dra. María González',
      email: 'maria.gonzalez@email.com',
      telefono: '+598 99 456 789',
      id_administrador: 1,
    },
  ],
  productos: [
    { id: 1, tipo: 'Corona zirconio', precio: 3500, id_administrador: 1 },
    { id: 2, tipo: 'Puente 3 piezas', precio: 7000, id_administrador: 1 },
    { id: 3, tipo: 'Placa de descarga', precio: 1500, id_administrador: 1 },
    { id: 4, tipo: 'Carillas', precio: 2000, id_administrador: 1 },
  ],
  estados: [
    { id: 1, descripcion: 'Pendiente', fecha_delete: null, id_administrador: 1 },
    { id: 2, descripcion: 'Pagado', fecha_delete: null, id_administrador: 1 },
    { id: 3, descripcion: 'Entregado', fecha_delete: null, id_administrador: 1 },
  ],
  orders: [
    {
      id: 101,
      id_cliente: 1,
      fecha_pedido: '2026-01-20T10:00:00.000Z',
      fecha_entrega: null,
      fecha_delete: null,
      id_administrador: 1,
      detalles: [
        {
          id: 1001,
          id_pedido: 101,
          id_producto: 1,
          cantidad: 2,
          precio_unitario: 3500,
          paciente: 'María Rodríguez',
          id_estado: 1,
        },
      ],
    },
    {
      id: 102,
      id_cliente: 2,
      fecha_pedido: '2026-01-18T09:00:00.000Z',
      fecha_entrega: '2026-01-28T12:00:00.000Z',
      fecha_delete: null,
      id_administrador: 1,
      detalles: [
        {
          id: 1002,
          id_pedido: 102,
          id_producto: 2,
          cantidad: 1,
          precio_unitario: 7000,
          paciente: 'Carlos Gómez',
          id_estado: 3,
        },
      ],
    },
    {
      id: 103,
      id_cliente: 3,
      fecha_pedido: '2026-01-25T15:00:00.000Z',
      fecha_entrega: null,
      fecha_delete: null,
      id_administrador: 1,
      detalles: [
        {
          id: 1003,
          id_pedido: 103,
          id_producto: 4,
          cantidad: 6,
          precio_unitario: 2000,
          paciente: 'Sofía Ramírez',
          id_estado: 1,
        },
      ],
    },
  ],
  pagos: [
    {
      id: 201,
      valor: 7000,
      id_administrador: 1,
      fecha: '2026-01-29T10:00:00.000Z',
      detalles: [
        {
          id: 3001,
          id_pago: 201,
          id_pedido: 102,
          valor: 7000,
        },
      ],
    },
    {
      id: 202,
      valor: 3000,
      id_administrador: 1,
      fecha: '2026-01-22T10:00:00.000Z',
      detalles: [
        {
          id: 3002,
          id_pago: 202,
          id_pedido: 101,
          valor: 3000,
        },
      ],
    },
  ],
  expenses: [
    // Enero 2026
    { id: 'e1', tipo: 'supplies', descripcion: 'Resina acrílica premium', monto: 4500, fecha: '2026-01-08T10:00:00.000Z', id_administrador: 1 },
    { id: 'e2', tipo: 'delivery', descripcion: 'Envío urgente zona norte', monto: 1200, fecha: '2026-01-12T14:00:00.000Z', id_administrador: 1 },
    { id: 'e3', tipo: 'supplies', descripcion: 'Dientes artificiales set completo', monto: 8900, fecha: '2026-01-15T09:00:00.000Z', id_administrador: 1 },
    { id: 'e4', tipo: 'supplies', descripcion: 'Porcelana dental A2', monto: 3200, fecha: '2026-01-22T11:00:00.000Z', id_administrador: 1 },
    { id: 'e5', tipo: 'delivery', descripcion: 'Cadetería express fin de mes', monto: 900, fecha: '2026-01-28T16:00:00.000Z', id_administrador: 1 },
    // Febrero 2026
    { id: 'e6', tipo: 'supplies', descripcion: 'Cera de modelado rosa', monto: 2100, fecha: '2026-02-03T10:00:00.000Z', id_administrador: 1 },
    { id: 'e7', tipo: 'supplies', descripcion: 'Discos de zirconio 98mm', monto: 12500, fecha: '2026-02-07T09:00:00.000Z', id_administrador: 1 },
    { id: 'e8', tipo: 'delivery', descripcion: 'Envío express clínica centro', monto: 1500, fecha: '2026-02-10T15:00:00.000Z', id_administrador: 1 },
    { id: 'e9', tipo: 'supplies', descripcion: 'Cemento dental dual-cure', monto: 5600, fecha: '2026-02-14T11:00:00.000Z', id_administrador: 1 },
    { id: 'e10', tipo: 'delivery', descripcion: 'Cadetería programada semanal', monto: 2200, fecha: '2026-02-18T14:00:00.000Z', id_administrador: 1 },
    { id: 'e11', tipo: 'supplies', descripcion: 'Material de impresión A-Silicona', monto: 7800, fecha: '2026-02-21T10:00:00.000Z', id_administrador: 1 },
    { id: 'e12', tipo: 'delivery', descripcion: 'Urgente fin de mes varios clientes', monto: 3100, fecha: '2026-02-27T16:00:00.000Z', id_administrador: 1 },
    // Marzo 2026 (mes con balance negativo)
    { id: 'e13', tipo: 'supplies', descripcion: 'Fresas y discos de grabado', monto: 18900, fecha: '2026-03-04T10:00:00.000Z', id_administrador: 1 },
    { id: 'e14', tipo: 'supplies', descripcion: 'Yeso tipo IV importado', monto: 15400, fecha: '2026-03-09T09:00:00.000Z', id_administrador: 1 },
    { id: 'e15', tipo: 'delivery', descripcion: 'Cadetería inicio de mes', monto: 2800, fecha: '2026-03-12T14:00:00.000Z', id_administrador: 1 },
    { id: 'e16', tipo: 'supplies', descripcion: 'Recarga de insumos generales', monto: 22000, fecha: '2026-03-15T11:00:00.000Z', id_administrador: 1 },
    { id: 'e17', tipo: 'delivery', descripcion: 'Envíos múltiples semana 3', monto: 4200, fecha: '2026-03-18T15:00:00.000Z', id_administrador: 1 },
    { id: 'e18', tipo: 'supplies', descripcion: 'Porcelana, resina y accesorios', monto: 19600, fecha: '2026-03-21T10:00:00.000Z', id_administrador: 1 },
  ] as IOtherExpense[],
  nextClientId: 5,
  nextProductoId: 5,
  nextOrderId: 104,
  nextDetallePedidoId: 1004,
  nextPagoId: 203,
  nextDetallePagoId: 3003,
  nextExpenseId: 19,
};

const normalizeProductTipo = (raw: unknown) => {
  return String(raw ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s-]+/g, ' ');
};

const attachRelations = () => {
  const productoById = new Map(db.productos.map((p) => [p.id, p] as const));
  const estadoById = new Map(db.estados.map((e) => [e.id, e] as const));
  const clientById = new Map(db.clients.map((c) => [c.id, c] as const));

  db.orders.forEach((o) => {
    o.cliente = clientById.get(o.id_cliente);
    o.detalles = (o.detalles || []).map((d) => ({
      ...d,
      producto: productoById.get(d.id_producto),
      estado: estadoById.get(d.id_estado),
    }));
  });
};

const calcOrderTotals = (order: IOrder): IOrderWithCalculations => {
  const detalles = order.detalles || [];
  const montoTotal = detalles.reduce(
    (sum, d) => sum + Number(d.cantidad ?? 0) * Number(d.precio_unitario ?? 0),
    0
  );

  const montoPagado = db.pagos
    .flatMap((p) => p.detalles)
    .filter((d) => d.id_pedido === order.id)
    .reduce((sum, d) => sum + Number(d.valor ?? 0), 0);

  const montoPendiente = Math.max(0, montoTotal - montoPagado);

  return {
    ...order,
    montoTotal,
    montoPagado,
    montoPendiente,
  };
};

const listOrdersWithCalculations = (): IOrderWithCalculations[] => {
  attachRelations();
  return db.orders.map(calcOrderTotals);
};

const calcClientBalance = (clientId: ID): IClientBalance => {
  attachRelations();

  const cliente = db.clients.find((c) => c.id === clientId);
  if (!cliente) {
    throw new Error('Cliente no encontrado (demo)');
  }

  const orders = db.orders.filter((o) => o.id_cliente === clientId && !o.fecha_delete);
  const pedidos: IBalanceItem[] = orders.map((o) => {
    const withTotals = calcOrderTotals(o);
    const paciente = withTotals.detalles?.[0]?.paciente || '';
    const productos = (withTotals.detalles || [])
      .map((d) => `${d.producto?.tipo ?? 'Producto'} x${d.cantidad}`)
      .join(', ');

    return {
      pedidoId: withTotals.id,
      fecha: withTotals.fecha_pedido,
      paciente,
      productos: productos || `${(withTotals.detalles || []).length} productos`,
      montoTotal: withTotals.montoTotal,
      montoPagado: withTotals.montoPagado,
      montoPendiente: withTotals.montoPendiente,
      entregado: !!withTotals.fecha_entrega,
    };
  });

  const totalGeneral = pedidos.reduce((s, p) => s + p.montoTotal, 0);
  const totalPagado = pedidos.reduce((s, p) => s + p.montoPagado, 0);
  const totalPendiente = pedidos.reduce((s, p) => s + p.montoPendiente, 0);

  return {
    cliente,
    pedidos,
    totalGeneral,
    totalPagado,
    totalPendiente,
  };
};

export const demoStore = {
  getAdminId(): ID {
    return db.adminId;
  },

  // Auth (lo mínimo)
  getDemoUser() {
    return {
      id: String(db.adminId),
      email: 'demo@apl.local',
      username: 'demo',
      nombres: 'Demo',
      apellidos: 'APL',
      telefono: '+000000000',
      rol: 'ADMIN',
      activo: true,
    };
  },

  // Clientes
  async getClients(): Promise<IClient[]> {
    return [...db.clients];
  },

  async createClient(data: IClientFormData): Promise<IClient> {
    const newClient: IClient = {
      id: db.nextClientId++,
      nombre: data.nombre,
      email: data.email,
      telefono: data.telefono,
      id_administrador: db.adminId,
    };
    db.clients = [newClient, ...db.clients];
    return newClient;
  },

  async getClientBalance(clientId: ID): Promise<IClientBalance> {
    return calcClientBalance(clientId);
  },

  // Catálogos
  async getProductos(): Promise<IProducto[]> {
    return [...db.productos];
  },

  async createProducto(data: IProductoFormData & { id_administrador: ID }): Promise<IProducto> {
    const tipo = String(data?.tipo ?? '').trim();
    if (!tipo) throw new Error('Tipo de producto requerido (demo)');

    // Evitar duplicados por nombre (similar a una unique constraint)
    const normalized = normalizeProductTipo(tipo);
    const existing = db.productos.find((p) => normalizeProductTipo(p.tipo) === normalized);
    if (existing) return existing;

    const precio = Number((data as any)?.precio ?? 0);
    const newProduct: IProducto = {
      id: db.nextProductoId++,
      tipo,
      precio: Number.isFinite(precio) ? precio : 0,
      id_administrador: data.id_administrador,
    };

    db.productos = [newProduct, ...db.productos];
    return newProduct;
  },

  async getEstados(): Promise<IEstado[]> {
    return [...db.estados].filter((e) => !e.fecha_delete);
  },

  // Pedidos
  async getOrders(filters?: { id_cliente?: ID }): Promise<IOrderWithCalculations[]> {
    const all = listOrdersWithCalculations();
    const filtered = filters?.id_cliente != null ? all.filter((o) => o.id_cliente === filters.id_cliente) : all;
    return filtered;
  },

  async createOrder(data: IOrderFormData): Promise<IOrder> {
    const pedidoId = db.nextOrderId++;
    const detalles: IDetallePedido[] = data.detalles.map((d) => ({
      id: db.nextDetallePedidoId++,
      id_pedido: pedidoId,
      id_producto: d.id_producto,
      cantidad: d.cantidad,
      precio_unitario: d.precio_unitario,
      paciente: d.paciente,
      id_estado: d.id_estado,
      producto: db.productos.find((p) => p.id === d.id_producto),
      estado: db.estados.find((e) => e.id === d.id_estado),
    }));

    const order: IOrder = {
      id: pedidoId,
      id_cliente: data.id_cliente,
      fecha_pedido: nowIso(),
      fecha_entrega: data.fecha_entrega,
      fecha_delete: null,
      id_administrador: data.id_administrador,
      descripcion: data.descripcion ?? null,
      detalles,
      cliente: db.clients.find((c) => c.id === data.id_cliente),
    };

    db.orders = [order, ...db.orders];
    return order;
  },

  async updateOrder(orderId: ID, data: { fecha_pedido?: string; fecha_entrega?: string; descripcion?: string }): Promise<IOrder> {
    const idx = db.orders.findIndex((o) => o.id === orderId);
    if (idx === -1) throw new Error('Pedido no encontrado (demo)');

    const existing = db.orders[idx];
    if (existing.fecha_delete) {
      throw new Error('No se puede actualizar un pedido eliminado (demo)');
    }

    db.orders[idx] = {
      ...existing,
      fecha_entrega: data.fecha_entrega ?? existing.fecha_entrega,
      descripcion: data.descripcion ?? existing.descripcion,
    };

    return db.orders[idx];
  },

  async deleteOrder(orderId: ID): Promise<void> {
    const idx = db.orders.findIndex((o) => o.id === orderId);
    if (idx === -1) throw new Error('Pedido no encontrado (demo)');

    const existing = db.orders[idx];
    if (existing.fecha_delete) {
      throw new Error('Pedido ya eliminado (demo)');
    }

    db.pagos = (db.pagos || [])
      .map((pago) => {
        const detalles = (pago.detalles || []).filter((detalle) => detalle.id_pedido !== orderId);
        const valor = detalles.reduce((sum, detalle) => sum + Number(detalle.valor ?? 0), 0);
        return {
          ...pago,
          detalles,
          valor,
        };
      })
      .filter((pago) => (pago.detalles || []).length > 0);

    db.orders[idx] = {
      ...existing,
      fecha_delete: nowIso(),
    };
  },

  async updateOrderDetalle(
    orderId: ID,
    detalleId: ID,
    data: Partial<{ id_producto: ID; cantidad: number; precio_unitario: number; paciente: string; id_estado: ID }>
  ): Promise<IOrder> {
    const orderIdx = db.orders.findIndex((o) => o.id === orderId);
    if (orderIdx === -1) throw new Error('Pedido no encontrado (demo)');
    if (db.orders[orderIdx].fecha_delete) throw new Error('Pedido eliminado (demo)');

    const detailIdx = (db.orders[orderIdx].detalles || []).findIndex((d) => d.id === detalleId);
    if (detailIdx === -1) throw new Error('Detalle no encontrado (demo)');

    const prev = db.orders[orderIdx].detalles![detailIdx];
    const nextProductoId = data.id_producto ?? prev.id_producto;
    const nextEstadoId = data.id_estado ?? prev.id_estado;

    db.orders[orderIdx].detalles![detailIdx] = {
      ...prev,
      id_producto: nextProductoId,
      cantidad: data.cantidad ?? prev.cantidad,
      precio_unitario: data.precio_unitario ?? prev.precio_unitario,
      paciente: data.paciente ?? prev.paciente,
      id_estado: nextEstadoId,
      producto: db.productos.find((p) => p.id === nextProductoId),
      estado: db.estados.find((e) => e.id === nextEstadoId),
    };

    return db.orders[orderIdx];
  },

  async deleteOrderDetalle(orderId: ID, detalleId: ID): Promise<void> {
    const orderIdx = db.orders.findIndex((o) => o.id === orderId);
    if (orderIdx === -1) throw new Error('Pedido no encontrado (demo)');
    if (db.orders[orderIdx].fecha_delete) throw new Error('Pedido eliminado (demo)');

    const details = db.orders[orderIdx].detalles || [];
    if (details.length <= 1) {
      throw new Error('No se puede eliminar el único detalle del pedido. Elimine el pedido completo.');
    }

    const hasTarget = details.some((d) => d.id === detalleId);
    if (!hasTarget) throw new Error('Detalle no encontrado (demo)');

    db.orders[orderIdx].detalles = details.filter((d) => d.id !== detalleId);
  },

  async markOrderAsDelivered(orderId: ID): Promise<IOrderWithCalculations> {
    const idx = db.orders.findIndex((o) => o.id === orderId);
    if (idx === -1) throw new Error('Pedido no encontrado (demo)');
    db.orders[idx] = {
      ...db.orders[idx],
      fecha_entrega: db.orders[idx].fecha_entrega ?? nowIso(),
    };
    return calcOrderTotals(db.orders[idx]);
  },

  // Pagos
  async getPagos(): Promise<IPagoWithDetails[]> {
    return [...db.pagos];
  },

  async createPago(data: IPagoFormData): Promise<IPago> {
    const pagoId = db.nextPagoId++;
    const detalles: IDetallePago[] = data.detalles.map((d) => ({
      id: db.nextDetallePagoId++,
      id_pago: pagoId,
      id_pedido: d.id_pedido,
      valor: d.valor,
    }));

    const pago: IPagoWithDetails = {
      id: pagoId,
      valor: data.valor,
      id_administrador: db.adminId,
      fecha: nowIso(),
      detalles,
    };

    db.pagos = [pago, ...db.pagos];
    return pago;
  },

  // Gastos
  async getExpenses(params?: {
    tipo?: 'all' | 'supplies' | 'delivery';
    fechaDesde?: string;
    fechaHasta?: string;
  }): Promise<IOtherExpense[]> {
    let result = [...db.expenses];

    if (params?.tipo && params.tipo !== 'all') {
      result = result.filter((e) => e.tipo === params.tipo);
    }
    if (params?.fechaDesde) {
      const start = new Date(params.fechaDesde + 'T00:00:00');
      result = result.filter((e) => new Date(e.fecha) >= start);
    }
    if (params?.fechaHasta) {
      const end = new Date(params.fechaHasta + 'T23:59:59');
      result = result.filter((e) => new Date(e.fecha) <= end);
    }

    return result.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  },

  async createExpense(data: IExpenseFormData): Promise<IOtherExpense> {
    const newExpense: IOtherExpense = {
      id: String(db.nextExpenseId++),
      tipo: data.tipo,
      descripcion: data.descripcion,
      monto: data.monto,
      fecha: new Date().toISOString(),
      id_administrador: db.adminId,
    };
    db.expenses = [newExpense, ...db.expenses];
    return newExpense;
  },

  deleteExpense(id: string): void {
    db.expenses = db.expenses.filter((e) => e.id !== id);
  },

  async getExpenseSummary(params: {
    period: 'monthly' | 'yearly';
    year: number;
    month?: number;
  }): Promise<{ total: number; totalInsumos: number; totalCadeteria: number; cantidad: number; gastos: IOtherExpense[] }> {
    let gastos = [...db.expenses];

    if (params.period === 'monthly' && params.month) {
      gastos = gastos.filter((e) => {
        const d = new Date(e.fecha);
        return d.getFullYear() === params.year && d.getMonth() + 1 === params.month;
      });
    } else if (params.period === 'yearly') {
      gastos = gastos.filter((e) => new Date(e.fecha).getFullYear() === params.year);
    }

    const totalInsumos = gastos.filter((g) => g.tipo === 'supplies').reduce((s, g) => s + g.monto, 0);
    const totalCadeteria = gastos.filter((g) => g.tipo === 'delivery').reduce((s, g) => s + g.monto, 0);

    return {
      total: totalInsumos + totalCadeteria,
      totalInsumos,
      totalCadeteria,
      cantidad: gastos.length,
      gastos,
    };
  },
};
