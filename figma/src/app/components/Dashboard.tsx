import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { FileText, Users, DollarSign, Clock } from "lucide-react";
import { CalendarWidget } from "./CalendarWidget";
import { orderService } from "../../services/order.service";
import { clientService } from "../../services/client.service";

type View = "dashboard" | "orders" | "clients" | "balance";

interface DashboardProps {
  onNavigateToBalance: (clientId: string) => void;
  onNavigateTo: (view: View, clientId?: string, filter?: string) => void;
}

export function Dashboard({ onNavigateToBalance, onNavigateTo }: DashboardProps) {
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalClients, setTotalClients] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [orders, clients] = await Promise.all([
          orderService.getAllOrders(),
          clientService.getAllClients(),
        ]);

        setTotalOrders(orders.length);
        setTotalClients(clients.length);
        setTotalRevenue(orders.reduce((sum, order) => sum + order.total, 0));
        setPendingOrders(orders.filter((o) => o.estado === "PENDIENTE").length);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="p-4 space-y-4">
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#033f63]"></div>
        </div>
      ) : (
        <>
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
              <p className="text-2xl">{totalOrders}</p>
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
              <p className="text-2xl">{totalClients}</p>
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
              <p className="text-2xl">${(totalRevenue / 1000).toFixed(0)}k</p>
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
              <p className="text-2xl">{pendingOrders}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Calendar Widget - Replaces Recent Orders */}
      <CalendarWidget onNavigateToBalance={onNavigateToBalance} />
        </>
      )}
    </div>
  );
}