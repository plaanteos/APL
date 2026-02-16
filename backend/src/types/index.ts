// ============================================
// TIPOS DEL MODELO OFICIAL APL
// ============================================

// Administrador
export interface Administrador {
  id: number;
  nombre: string;
  telefono: string;
  email: string;
  usuario: string;
  super_usuario: boolean;
  password: string;
  activo: boolean;
  refreshToken: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdministradorDTO {
  id: number;
  nombre: string;
  telefono: string;
  email: string;
  usuario: string;
  super_usuario: boolean;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Cliente
export interface Cliente {
  id: number;
  nombre: string;
  telefono: string;
  email: string;
  id_administrador: number;
  administrador?: Administrador;
  pedidos?: Pedido[];
}

export interface ClienteDTO {
  id: number;
  nombre: string;
  telefono: string;
  email: string;
  id_administrador: number;
  totalPedidos?: number;
  montoTotal?: number;
  montoPagado?: number;
  montoPendiente?: number;
}

// Estado (catálogo)
export interface Estado {
  id: number;
  descripcion: string;
  fecha_insert: Date;
  fecha_delete: Date | null;
}

export interface EstadoDTO {
  id: number;
  descripcion: string;
}

// Producto
export interface Producto {
  id: number;
  tipo: string;
  valor: number;
  id_administrador: number;
  administrador?: Administrador;
}

export interface ProductoDTO {
  id: number;
  tipo: string;
  valor: number;
  id_administrador: number;
}

// Pedido
export interface Pedido {
  id: number;
  id_cliente: number;
  fecha_pedido: Date;
  fecha_entrega: Date;
  fecha_delete: Date | null;
  id_administrador: number;
  descripcion?: string | null;
  cliente?: Cliente;
  administrador?: Administrador;
  detalles?: DetallePedido[];
  detallesPago?: DetallePago[];
}

export interface PedidoDTO {
  id: number;
  id_cliente: number;
  nombreCliente: string;
  fecha_pedido: Date;
  fecha_entrega: Date;
  id_administrador: number;
  descripcion?: string;
  detalles: DetallePedidoDTO[];
  montoTotal: number;
  montoPagado: number;
  montoPendiente: number;
}

// Detalle de Pedido
export interface DetallePedido {
  id: number;
  id_pedido: number;
  id_producto: number;
  cantidad: number;
  precio_unitario: number;
  paciente: string;
  id_estado: number;
  pedido?: Pedido;
  producto?: Producto;
  estado?: Estado;
}

export interface DetallePedidoDTO {
  id: number;
  id_pedido: number;
  id_producto: number;
  tipoProducto: string;
  cantidad: number;
  precio_unitario: number;
  paciente: string;
  id_estado: number;
  estadoDescripcion: string;
  subtotal: number;
}

// Pago
export interface Pago {
  id: number;
  valor: number;
  id_administrador: number;
  administrador?: Administrador;
  detalles?: DetallePago[];
}

export interface PagoDTO {
  id: number;
  valor: number;
  id_administrador: number;
  fecha_pago: Date;
  pedidos: {
    id_pedido: number;
    valor: number;
  }[];
}

// Detalle de Pago (N:M entre Pago y Pedido)
export interface DetallePago {
  id: number;
  id_pago: number;
  id_pedido: number;
  valor: number;
  fecha_pago: Date;
  pago?: Pago;
  pedido?: Pedido;
}

export interface DetallePagoDTO {
  id: number;
  id_pago: number;
  id_pedido: number;
  valor: number;
  fecha_pago: Date;
}

// Auditoría (sin relaciones)
export interface Auditoria {
  id: number;
  usuario: string;
  fecha_accion: Date;
  accion: string;
}

export interface AuditoriaDTO {
  id: number;
  usuario: string;
  fecha_accion: Date;
  accion: string;
}

// ============================================
// TIPOS DE AUTENTICACIÓN
// ============================================

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  refreshToken?: string;
  user?: AdministradorDTO;
  message?: string;
}

// ============================================
// TIPOS DE RESPUESTAS API
// ============================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}