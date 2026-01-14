import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { FileText, Users, DollarSign, Clock, Loader2 } from "lucide-react";
import { orderService, Order } from "../../services/order.service";
import { clientService, Client } from "../../services/client.service";
import { CalendarWidget } from "./CalendarWidget";

type View = "dashboard" | "orders" | "clients" | "balance";

interface DashboardProps {
  onNavigateToBalance: (clientId: string) => void;
  onNavigateTo: (view: View, clientId?: string, filter?: string) => void;
}

interface DashboardStats {
  totalOrders: number;
  totalClients: number;
  totalRevenue: number;
  pendingOrders: number;
}

export function Dashboard({ onNavigateToBalance, onNavigateTo }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    totalClients: 0,
    totalRevenue: 0,
    pendingOrders: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Cargar pedidos y clientes en paralelo
        const [ordersResponse, clientsResponse] = await Promise.all([
          orderService.getAllOrders(),
          clientService.getAllClients()
        ]);

        // Procesar pedidos
        const orders: Order[] = Array.isArray(ordersResponse) 
          ? ordersResponse 
          : ordersResponse.items;
        
        // Procesar clientes
        const clients: Client[] = Array.isArray(clientsResponse) 
          ? clientsResponse 
          : clientsResponse.items;

        // Calcular estadísticas
        const totalRevenue = orders.reduce((sum, order) => sum + order.montoTotal, 0);
        const pendingCount = orders.filter(o => 
          o.estado === "PENDIENTE" || o.estado === "EN_PROCESO"
        ).length;

        setStats({
          totalOrders: orders.length,
          totalClients: clients.length,
          totalRevenue: totalRevenue,
          pendingOrders: pendingCount,
        });
      } catch (err: any) {
        console.error('Error loading dashboard data:', err);
        setError(err.response?.data?.error || 'Error al cargar datos del dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center h-96">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card 
          className="p-4 cursor-pointer hover:shadow-md transition-shadow active:scale-95 transition-transform"
          onClick={() => onNavigateTo("orders")}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#033f63]/10 rounded-full flex items-center justify-center">
              <FileText size={20} className="text-[#033f63]" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Pedidos</p>
              <p className="text-2xl">{stats.totalOrders}</p>
            </div>
          </div>
        </Card>

        <Card 
          className="p-4 cursor-pointer hover:shadow-md transition-shadow active:scale-95 transition-transform"
          onClick={() => onNavigateTo("clients")}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#7c9885]/20 rounded-full flex items-center justify-center">
              <Users size={20} className="text-[#28666e]" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Clientes</p>
              <p className="text-2xl">{stats.totalClients}</p>
            </div>
          </div>
        </Card>

        <Card 
          className="p-4 cursor-pointer hover:shadow-md transition-shadow active:scale-95 transition-transform"
          onClick={() => onNavigateTo("balance")}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#28666e]/20 rounded-full flex items-center justify-center">
              <DollarSign size={20} className="text-[#28666e]" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Ingresos Total</p>
              <p className="text-2xl">${(stats.totalRevenue / 1000).toFixed(0)}k</p>
            </div>
          </div>
        </Card>

        <Card 
          className="p-4 cursor-pointer hover:shadow-md transition-shadow active:scale-95 transition-transform"
          onClick={() => onNavigateTo("orders", undefined, "pending")}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#fedc97]/50 rounded-full flex items-center justify-center">
              <Clock size={20} className="text-[#b5b682]" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pendientes</p>
              <p className="text-2xl">{stats.pendingOrders}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Calendar Widget - Replaces Recent Orders */}
      <CalendarWidget onNavigateToBalance={onNavigateToBalance} />
    </div>
  );
}