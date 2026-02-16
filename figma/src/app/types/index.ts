// ==========================================
// TIPOS BASE - MODELO OFICIAL APL
// ==========================================

// IDs ahora son números (no strings)
export type ID = number;

// ==========================================
// ADMINISTRADOR
// ==========================================
export interface IAdministrador {
  id: ID;
  usuario: string;
  email: string;
  password?: string; // No se devuelve en respuestas por seguridad
  nombre: string;
  telefono?: string;
  super_usuario: boolean;
  activo: boolean;
  refreshToken?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ==========================================
// CLIENTE
// ==========================================
export interface IClient {
  id: ID;
  nombre: string;
  email: string;
  telefono: string;
  id_administrador: ID;
  // Campos calculados (no en DB)
  totalOrders?: number;
  totalAmount?: number;
  pendingAmount?: number;
}

// ==========================================
// PRODUCTO
// ==========================================
export interface IProducto {
  id: ID;
  tipo: string;
  precio: number;
  id_administrador: ID;
  // Campos calculados
  usageCount?: number;
}

// ==========================================
// ESTADO
// ==========================================
export interface IEstado {
  id: ID;
  descripcion: string;
  fecha_delete?: Date | string | null;
  id_administrador?: ID;
  // Campos calculados
  usageCount?: number;
}

// ==========================================
// DETALLE DE PEDIDO
// ==========================================
export interface IDetallePedido {
  id: ID;
  id_pedido: ID;
  id_producto: ID;
  cantidad: number;
  precio_unitario: number;
  paciente: string;
  id_estado: ID;
  // Relaciones populadas
  producto?: IProducto;
  estado?: IEstado;
}

// ==========================================
// PEDIDO
// ==========================================
export interface IOrder {
  id: ID;
  id_cliente: ID;
  fecha_pedido: Date | string;
  fecha_entrega?: Date | string | null;
  fecha_delete?: Date | string | null;
  id_administrador: ID;
  descripcion?: string | null;
  // Relaciones
  cliente?: IClient;
  detalles?: IDetallePedido[];
  detallesPago?: IDetallePago[];
  // Campos calculados (no en DB, calculados dinámicamente)
  montoTotal?: number;
  montoPagado?: number;
  montoPendiente?: number;
}

// Pedido con cálculos garantizados
export interface IOrderWithCalculations extends IOrder {
  montoTotal: number;
  montoPagado: number;
  montoPendiente: number;
}

// ==========================================
// DETALLE DE PAGO
// ==========================================
export interface IDetallePago {
  id: ID;
  id_pago: ID;
  id_pedido: ID;
  valor: number;
  // Relaciones
  pago?: IPago;
  pedido?: IOrder;
}

// ==========================================
// PAGO
// ==========================================
export interface IPago {
  id: ID;
  valor: number;
  id_administrador: ID;
  // Relaciones
  detalles?: IDetallePago[];
  // Campos calculados
  clienteId?: ID;
  clienteNombre?: string;
  fecha?: Date | string;
}

// Pago con detalles completos
export interface IPagoWithDetails extends IPago {
  detalles: IDetallePago[];
}

// ==========================================
// AUDITORÍA
// ==========================================
export interface IAuditoria {
  id: ID;
  usuario: string;
  fecha_accion: Date | string;
  accion: string;
}

// ==========================================
// TIPOS DE RESPUESTA API
// ==========================================

// Respuesta de login
export interface ILoginResponse {
  accessToken: string;
  refreshToken: string;
  user: Omit<IAdministrador, 'password' | 'refreshToken'>;
}

// Respuesta de registro
export interface IRegisterResponse {
  message: string;
  user: Omit<IAdministrador, 'password' | 'refreshToken'>;
}

// Respuesta genérica de éxito
export interface ISuccessResponse {
  message: string;
}

// Respuesta de error
export interface IErrorResponse {
  error: string;
  details?: any;
}

// ==========================================
// ESTADÍSTICAS
// ==========================================

export interface IClientStats {
  totalClientes: number;
  clientesActivos: number;
  clientesConDeuda: number;
  totalDeuda: number;
}

export interface IOrderStats {
  totalPedidos: number;
  pedidosEntregados: number;
  pedidosPendientes: number;
  pedidosEliminados: number;
  montoTotal: number;
  montoPagado: number;
  montoPendiente: number;
}

export interface IPaymentStats {
  totalPagos: number;
  montoTotalPagado: number;
  pagosPorMes: {
    mes: string;
    total: number;
  }[];
}

export interface IProductoStats {
  totalProductos: number;
  productoMasUsado: string;
  usoPorProducto: {
    tipo: string;
    cantidad: number;
  }[];
}

export interface IDashboardStats {
  totalOrders: number;
  totalClients: number;
  totalRevenue: number;
  pendingOrders: number;
  pendingAmount: number;
  deliveredOrders: number;
}

// ==========================================
// FILTROS Y BÚSQUEDA
// ==========================================

export interface IOrderFilters {
  clienteId?: ID;
  fechaDesde?: string;
  fechaHasta?: string;
  entregado?: boolean;
  eliminado?: boolean;
  conDeuda?: boolean;
}

export interface IClientFilters {
  nombre?: string;
  email?: string;
  telefono?: string;
}

export interface ISearchResults {
  clientes: IClient[];
  pedidos: IOrder[];
}

// ==========================================
// FORMULARIOS (CREATE/UPDATE)
// ==========================================

export interface IClientFormData {
  nombre: string;
  email: string;
  telefono: string;
}

export interface IProductoFormData {
  tipo: string;
  precio: number;
}

export interface IEstadoFormData {
  descripcion: string;
}

export interface IDetallePedidoFormData {
  id_producto: ID;
  cantidad: number;
  precio_unitario: number;
  paciente: string;
  id_estado: ID;
}

export interface IOrderFormData {
  id_cliente: ID;
  fecha_entrega: string;
  id_administrador: ID;
  descripcion?: string;
  detalles: IDetallePedidoFormData[];
}

export interface IDetallePagoFormData {
  id_pedido: ID;
  valor: number;
}

export interface IPagoFormData {
  valor: number;
  detalles: IDetallePagoFormData[];
}

// ==========================================
// BALANCE (Item de balance por cliente)
// ==========================================
export interface IBalanceItem {
  pedidoId: ID;
  fecha: Date | string;
  paciente: string;
  productos: string; // Lista de productos del pedido
  montoTotal: number;
  montoPagado: number;
  montoPendiente: number;
  entregado: boolean;
}

export interface IClientBalance {
  cliente: IClient;
  pedidos: IBalanceItem[];
  totalGeneral: number;
  totalPagado: number;
  totalPendiente: number;
}

// ==========================================
// RECORDATORIOS
// ==========================================
export interface IRecordatorio {
  clienteId: ID;
  clienteNombre: string;
  telefono: string;
  email: string;
  pedidosVencidos: number;
  montoDeuda: number;
  diasVencido: number;
}

// ==========================================
// LEGACY (Para compatibilidad temporal)
// ==========================================
export type OrderStatus = "pending" | "delivered" | "paid";

// Alias para migración gradual
export type Client = IClient;
export type Order = IOrder;
export type Payment = IPago;