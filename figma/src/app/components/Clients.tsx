import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Plus, Mail, Phone, MessageCircle, Building, User, Loader2 } from "lucide-react";
import { clientService, Client } from "../../services/client.service";
import { NewClientDialog } from "./NewClientDialog";
import { SendMessageDialog } from "./SendMessageDialog";

interface ClientsProps {
  onNavigateToBalance: (clientId: string) => void;
}

export function Clients({ onNavigateToBalance }: ClientsProps) {
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
  });
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

  // Fetch clients
  useEffect(() => {
    const fetchClients = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await clientService.getAllClients(page, 20);
        
        // Manejar respuesta con o sin paginación
        if (Array.isArray(response)) {
          setClients(response);
        } else {
          setClients(response.items);
          setPagination(response.pagination);
        }
      } catch (err: any) {
        console.error('Error fetching clients:', err);
        setError(err.response?.data?.error || 'Error al cargar clientes');
      } finally {
        setIsLoading(false);
      }
    };

    fetchClients();
  }, [page]);

  const handleClientCreated = () => {
    // Refrescar datos después de crear cliente
    setPage(1);
    const fetchClients = async () => {
      try {
        const response = await clientService.getAllClients(1, 20);
        if (Array.isArray(response)) {
          setClients(response);
        } else {
          setClients(response.items);
          setPagination(response.pagination);
        }
      } catch (err) {
        console.error('Error refreshing clients:', err);
      }
    };
    fetchClients();
  };

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
        {clients.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay clientes registrados
          </div>
        ) : (
          clients.map((client) => (
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
                    {!client.activo && (
                      <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded-full flex-shrink-0">
                        Inactivo
                      </span>
                    )}
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
                        handleOpenMessage("whatsapp", client.nombre, client.whatsapp || client.telefono, e)
                      }
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-green-600 transition-colors w-full text-left"
                    >
                      <MessageCircle size={14} />
                      <span className="truncate underline">{client.whatsapp || client.telefono}</span>
                    </button>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone size={14} />
                      <span className="truncate">{client.telefono}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Anterior
          </Button>
          <span className="text-sm text-gray-600">
            Página {page} de {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
            disabled={page === pagination.totalPages}
          >
            Siguiente
          </Button>
        </div>
      )}

      <NewClientDialog
        open={showNewClientDialog}
        onOpenChange={setShowNewClientDialog}
        onClientCreated={handleClientCreated}
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