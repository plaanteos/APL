export type OrderStatus = "pending" | "delivered" | "paid";

export interface Order {
  id: string;
  clientId: string;
  clientName: string;
  patientName: string;
  date: string;
  description: string;
  type: string;
  quantity: number;
  unitPrice: number;
  total: number;
  amountPaid: number;
  status: OrderStatus;
  dueDate: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  type: "clinic" | "dentist";
  totalOrders: number;
  totalAmount: number;
  pendingAmount: number;
}

export interface BalanceItem {
  orderId: string;
  date: string;
  description: string;
  amount: number;
  status: OrderStatus;
}