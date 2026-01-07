import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Plus, Mail, Phone, MessageCircle, Building, User } from "lucide-react";
import { mockClients } from "../data/mockData";
import { NewClientDialog } from "./NewClientDialog";
import { SendMessageDialog } from "./SendMessageDialog";

interface ClientsProps {
  onNavigateToBalance: (clientId: string) => void;
}

export function Clients({ onNavigateToBalance }: ClientsProps) {
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
      <div className="space-y-3">
        {mockClients.map((client) => (
          <Card 
            key={client.id} 
            className="p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onNavigateToBalance(client.id)}
          >
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                {client.type === "clinic" ? (
                  <Building size={24} className="text-blue-600" />
                ) : (
                  <User size={24} className="text-blue-600" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="truncate">{client.name}</h3>
                    <p className="text-sm text-gray-500 capitalize">
                      {client.type === "clinic" ? "Clínica" : "Odontólogo"}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm text-gray-500">Total</p>
                    <p className="text-blue-600">
                      ${client.totalOrders.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={(e) =>
                      handleOpenMessage("email", client.name, client.email, e)
                    }
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors w-full text-left"
                  >
                    <Mail size={14} />
                    <span className="truncate underline">{client.email}</span>
                  </button>
                  <button
                    onClick={(e) =>
                      handleOpenMessage("whatsapp", client.name, client.phone, e)
                    }
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-green-600 transition-colors w-full text-left"
                  >
                    <MessageCircle size={14} />
                    <span className="truncate underline">{client.phone}</span>
                  </button>
                </div>

                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                  <span>{client.activeOrders} pedidos activos</span>
                  <span>•</span>
                  <span>{client.completedOrders} completados</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <NewClientDialog
        open={showNewClientDialog}
        onOpenChange={setShowNewClientDialog}
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