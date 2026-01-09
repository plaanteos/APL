import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Plus, Mail, Phone, MessageCircle, Building, User } from "lucide-react";
import { NewClientDialog } from "./NewClientDialog";
import { SendMessageDialog } from "./SendMessageDialog";
import { clientService, Client } from "../../services/client.service";
import { orderService } from "../../services/order.service";
import { toast } from "sonner";

interface ClientsProps {
  onNavigateToBalance: (clientId: string) => void;
}

export function Clients({ onNavigateToBalance }: ClientsProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientStats, setClientStats] = useState<Record<string, { active: number; completed: number }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  const [messageDialog, setMessageDialog] = useState<{
    open: boolean;
    type: "email" | "whatsapp";
    clientName: string;
    contactInfo: string;
  }>({
    open: false,
    type: "email",
    clientName: "",
    contactInfo: "",
  });

  const fetchClients = async () => {
    try {
      setIsLoading(true);
      const fetchedClients = await clientService.getAllClients();
      setClients(fetchedClients);

      // Fetch stats for each client
      const statsPromises = fetchedClients.map(async (client) => {
        const orders = await orderService.getOrdersByClient(client.id);
        return {
          id: client.id,
          active: orders.filter(o => ['PENDIENTE', 'EN_PROCESO'].includes(o.estado)).length,
          completed: orders.filter(o => ['COMPLETADO', 'ENTREGADO', 'PAGADO'].includes(o.estado)).length,
        };
      });
      const stats = await Promise.all(statsPromises);
      const statsMap = stats.reduce((acc, stat) => {
        acc[stat.id] = { active: stat.active, completed: stat.completed };
        return acc;
      }, {} as Record<string, { active: number; completed: number }>);
      setClientStats(statsMap);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast.error("Error al cargar clientes");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleOpenMessage = (
    type: "email" | "whatsapp",
    clientName: string,
    contactInfo: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    setMessageDialog({
      open: true,
      type,
      clientName,
      contactInfo,
    });
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2>Clientes</h2>
        <Button
          onClick={() => setShowNewClientDialog(true)}
          className="bg-blue-600 hover:bg-blue-700"
          size="sm"
        >
          <Plus size={16} className="mr-1" />
          Nuevo
        </Button>
      </div>

      {/* Clients List */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#033f63]"></div>
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No hay clientes registrados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map((client) => {
            const stats = clientStats[client.id] || { active: 0, completed: 0 };
            return (
              <Card 
                key={client.id} 
                className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onNavigateToBalance(client.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    {client.tipo === "CLINICA" ? (
                      <Building size={24} className="text-blue-600" />
                    ) : (
                      <User size={24} className="text-blue-600" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="truncate">{client.nombre}</h3>
                        <p className="text-sm text-gray-500 capitalize">
                          {client.tipo === "CLINICA" ? "Clínica" : client.tipo === "DENTISTA" ? "Odontólogo" : "Particular"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <button
                        onClick={(e) =>
                          handleOpenMessage("email", client.nombre, client.email, e)
                        }
                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors w-full text-left"
                      >
                        <Mail size={14} />
                        <span className="truncate underline">{client.email}</span>
                      </button>
                      <button
                        onClick={(e) =>
                          handleOpenMessage("whatsapp", client.nombre, client.telefono, e)
                        }
                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-green-600 transition-colors w-full text-left"
                      >
                        <MessageCircle size={14} />
                        <span className="truncate underline">{client.telefono}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                      <span>{stats.active} pedidos activos</span>
                      <span>•</span>
                      <span>{stats.completed} completados</span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <NewClientDialog
        open={showNewClientDialog}
        onOpenChange={setShowNewClientDialog}
        onClientCreated={fetchClients}
      />

      <SendMessageDialog
        open={messageDialog.open}
        onOpenChange={(open) =>
          setMessageDialog({ ...messageDialog, open })
        }
        type={messageDialog.type}
        clientName={messageDialog.clientName}
        contactInfo={messageDialog.contactInfo}
      />
    </div>
  );
}