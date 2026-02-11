import { useState } from "react";
import { Home, FileText, Users, TrendingUp, ArrowLeft, LogOut } from "lucide-react";
import { Dashboard } from "./components/Dashboard";
import { Orders } from "./components/Orders";
import { Clients } from "./components/Clients";
import { Balance } from "./components/Balance";
import { Login } from "./components/Login";
import { useAuth } from "../hooks/useAuth";

type View = "dashboard" | "orders" | "clients" | "balance";

export default function App() {
  const { user, logout, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<View>("dashboard");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [orderFilter, setOrderFilter] = useState<string>("all");
  const [navigationHistory, setNavigationHistory] = useState<View[]>(["dashboard"]);

  const handleLogout = () => {
    logout();
    setCurrentView("dashboard");
    setSelectedClientId(null);
    setOrderFilter("all");
    setNavigationHistory(["dashboard"]);
  };

  const navigateTo = (view: View, clientId?: number, filter?: string) => {
    // Reset filter when not navigating to orders
    if (view !== "orders") {
      setOrderFilter("all");
    }
    
    setNavigationHistory([...navigationHistory, view]);
    setCurrentView(view);
    if (clientId !== undefined) setSelectedClientId(clientId);
    if (filter !== undefined) setOrderFilter(filter);
  };

  const navigateBack = () => {
    if (navigationHistory.length > 1) {
      const newHistory = [...navigationHistory];
      newHistory.pop(); // Remove current view
      const previousView = newHistory[newHistory.length - 1];
      setNavigationHistory(newHistory);
      setCurrentView(previousView);
      
      // Reset states when going back
      if (previousView !== "balance") {
        setSelectedClientId(null);
      }
      if (previousView !== "orders") {
        setOrderFilter("all");
      }
    }
  };

  const navigateToBalance = (clientId: number) => {
    setSelectedClientId(clientId);
    navigateTo("balance", clientId);
  };

  const renderView = () => {
    switch (currentView) {
      case "dashboard":
        return <Dashboard onNavigateToBalance={navigateToBalance} onNavigateTo={navigateTo} />;
      case "orders":
        return <Orders onNavigateToBalance={navigateToBalance} initialFilter={orderFilter} />;
      case "clients":
        return <Clients onNavigateToBalance={navigateToBalance} />;
      case "balance":
        return <Balance selectedClientId={selectedClientId} />;
      default:
        return <Dashboard onNavigateToBalance={navigateToBalance} onNavigateTo={navigateTo} />;
    }
  };

  const canGoBack = navigationHistory.length > 1 && currentView !== "dashboard";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#033f63] mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#033f63] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {canGoBack && (
              <button
                onClick={navigateBack}
                className="p-1 hover:bg-[#28666e] rounded-full transition-colors"
                aria-label="Volver atrás"
              >
                <ArrowLeft size={20} className="text-white" />
              </button>
            )}
            <div className="bg-white px-3 py-1.5 rounded-lg">
              <img
                src="/apl-logo.png"
                alt="APL Dental"
                className="h-7 w-auto"
              />
            </div>
          </div>
          <div className="flex items-center bg-white/10 rounded-full px-4 py-2">
            <span className="text-white text-base font-semibold whitespace-nowrap">
              Admin
            </span>
            <span className="mx-3 h-5 w-px bg-white/30" aria-hidden="true" />
            <button
              onClick={handleLogout}
              className="p-1 hover:bg-white/10 rounded-full transition-colors"
              aria-label="Cerrar sesión"
            >
              <LogOut size={20} className="text-white" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20">{renderView()}</main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="grid grid-cols-4 h-16">
          <button
            onClick={() => {
              setOrderFilter("all");
              navigateTo("dashboard");
            }}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              currentView === "dashboard"
                ? "text-[#033f63]"
                : "text-gray-500"
            }`}
          >
            <Home size={20} />
            <span className="text-xs">Inicio</span>
          </button>

          <button
            onClick={() => navigateTo("orders")}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              currentView === "orders"
                ? "text-[#033f63]"
                : "text-gray-500"
            }`}
          >
            <FileText size={20} />
            <span className="text-xs">Pedidos</span>
          </button>

          <button
            onClick={() => navigateTo("clients")}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              currentView === "clients"
                ? "text-[#033f63]"
                : "text-gray-500"
            }`}
          >
            <Users size={20} />
            <span className="text-xs">Clientes</span>
          </button>

          <button
            onClick={() => navigateTo("balance")}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${
              currentView === "balance"
                ? "text-[#033f63]"
                : "text-gray-500"
            }`}
          >
            <TrendingUp size={20} />
            <span className="text-xs">Balance</span>
          </button>
        </div>
      </nav>
    </div>
  );
}