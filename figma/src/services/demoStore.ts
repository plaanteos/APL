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
  IOrderFormData,
  IPagoFormData,
  ID,
} from '../app/types';

type DemoDb = {
  adminId: ID;
  clients: IClient[];
  productos: IProducto[];
  estados: IEstado[];
  orders: IOrder[];
  pagos: IPagoWithDetails[];
  nextClientId: ID;
  nextOrderId: ID;
  nextDetallePedidoId: ID;
  nextPagoId: ID;
  nextDetallePagoId: ID;
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
    { id: 1, descripcion: 'En proceso', fecha_delete: null, id_administrador: 1 },
    { id: 2, descripcion: 'Listo para entrega', fecha_delete: null, id_administrador: 1 },
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
          id_estado: 2,
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
  nextClientId: 5,
  nextOrderId: 104,
  nextDetallePedidoId: 1004,
  nextPagoId: 203,
  nextDetallePagoId: 3003,
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
      detalles,
      cliente: db.clients.find((c) => c.id === data.id_cliente),
    };

    db.orders = [order, ...db.orders];
    return order;
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
};
