export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: 'admin' | 'user';
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  role?: 'admin' | 'user';
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: Omit<AuthUser, 'password'>;
  message?: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  whatsapp?: string;
  type: 'clinic' | 'dentist';
  totalOrders: number;
  totalAmount: number;
  pendingAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type OrderStatus = 'pending' | 'in_progress' | 'delivered' | 'paid';

export interface Order {
  id: string;
  clientId: string;
  clientName: string;
  patientName: string;
  date: Date;
  dueDate: Date;
  description: string;
  type: string;
  quantity: number;
  unitPrice: number;
  total: number;
  amountPaid: number;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderDetail {
  id: string;
  orderId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  paymentMethod: 'cash' | 'transfer' | 'card';
  paymentDate: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: any;
  newValues?: any;
  timestamp: Date;
  ipAddress?: string;
}

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