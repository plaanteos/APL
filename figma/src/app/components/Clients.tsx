import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Plus, Mail, Phone, MessageCircle, User, Loader2, Pencil, Trash2 } from "lucide-react";
import clientService from "../../services/client.service";
import type { IClient } from "../types";
import { NewClientDialog } from "./NewClientDialog";
import { SendMessageDialog } from "./SendMessageDialog";
import { EditClientDialog } from "./EditClientDialog";
import { WhatsAppConnectionNotice } from "./WhatsAppConnectionNotice";
import { useAuth } from "../../hooks/useAuth";
import { useWhatsAppConnectionStatus } from "../../hooks/useWhatsAppConnectionStatus";

interface ClientsProps {
  onNavigateToBalance: (clientId: number) => void;
}

export function Clients({ onNavigateToBalance }: ClientsProps) {
  const { user } = useAuth();
  const isWhatsAppConnected = useWhatsAppConnectionStatus(user?.id);
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  const [clients, setClients] = useState<IClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editDialog, setEditDialog] = useState<{ open: boolean; client: IClient | null }>({
    open: false,
    client: null,
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
    refreshClients(true);
  }, []);

  const refreshClients = async (withLoading: boolean = false) => {
    try {
      if (withLoading) setIsLoading(true);
      setError(null);
      const response = await clientService.getAll();
      setClients(response);
    } catch (err: any) {
      console.error('Error fetching clients:', err);
      setError(err.response?.data?.error || 'Error al cargar clientes');
    } finally {
      if (withLoading) setIsLoading(false);
    }
  };

  const handleClientCreated = () => {
    refreshClients(false);
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

  const handleOpenEdit = (client: IClient, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditDialog({ open: true, client });
  };

  const handleDeleteQuick = async (client: IClient, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = window.confirm(`¿Eliminar al cliente "${client.nombre}"?`);
    if (!ok) return;
    try {
      await clientService.delete(client.id);
      await refreshClients(false);
    } catch (err: any) {
      console.error('Error deleting client:', err);
    }
  };

  type ClientKind = 'odontologo' | 'clinica' | 'otro';

  const getClientKind = (name: string): ClientKind => {
    const n = String(name ?? '').trim().toLowerCase();
    if (n.startsWith('dr.') || n.startsWith('dr ')) return 'odontologo';
    if (n.startsWith('clinica') || n.startsWith('clínica')) return 'clinica';
    return 'otro';
  };

  const formatClientDisplayName = (rawName: string, kind: ClientKind) => {
    const name = String(rawName ?? '').trim();
    if (!name) return '';

    const lowered = name.toLowerCase();
    const stripped = lowered.startsWith('dr.')
      ? name.replace(/^\s*dr\.?\s*/i, '')
      : lowered.startsWith('clinica')
        ? name.replace(/^\s*clinica\s*/i, '')
        : lowered.startsWith('clínica')
          ? name.replace(/^\s*clínica\s*/i, '')
          : name;

    const base = String(stripped ?? '').trim();
    if (!base) return '';

    if (kind === 'odontologo') return `Dr. ${base}`;
    if (kind === 'clinica') return `Clínica ${base}`;
    return base;
  };

  const getTypePillClasses = (kind: ClientKind) => {
    switch (kind) {
      case 'odontologo':
        return 'bg-[#033f63]/10 text-[#033f63] border border-[#033f63]/20';
      case 'clinica':
        return 'bg-[#7c9885]/25 text-[#033f63] border border-[#7c9885]/50';
      default:
        return 'bg-gray-100 text-gray-700 border border-gray-200';
    }
  };

  const getAvatarClasses = (kind: ClientKind) => {
    switch (kind) {
      case 'odontologo':
        return { wrap: 'bg-[#033f63]/10', icon: 'text-[#033f63]' };
      case 'clinica':
        return { wrap: 'bg-[#7c9885]/25', icon: 'text-[#7c9885]' };
      default:
        return { wrap: 'bg-gray-100', icon: 'text-gray-600' };
    }
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

      {isWhatsAppConnected === false && <WhatsAppConnectionNotice />}

      {/* Clients List */}
      <div className="space-y-3">
        {clients.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay clientes registrados
          </div>
        ) : (
          clients.map((client) => (
            (() => {
              const kind = getClientKind(client.nombre);
              const displayName = formatClientDisplayName(client.nombre, kind);
              const avatar = getAvatarClasses(kind);
              const kindLabel = kind === 'odontologo' ? 'Odontólogo' : kind === 'clinica' ? 'Clínica' : 'Cliente';

              return (
            <Card 
              key={client.id} 
              className="p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onNavigateToBalance(client.id)}
            >
              <div className="flex items-start gap-3">
                <div className={`w-12 h-12 ${avatar.wrap} rounded-full flex items-center justify-center flex-shrink-0`}>
                  <User size={24} className={avatar.icon} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="truncate">{displayName}</h3>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${getTypePillClasses(kind)}`}>
                        {kindLabel}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleOpenEdit(client, e)}
                        className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                        aria-label="Editar cliente"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteQuick(client, e)}
                        className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-red-700"
                        aria-label="Eliminar cliente"
                      >
                        <Trash2 size={16} />
                      </button>
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
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone size={14} />
                      <span className="truncate">{client.telefono}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
              );
            })()
          ))
        )}
      </div>

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

      <EditClientDialog
        open={editDialog.open}
        onOpenChange={(open) => setEditDialog({ open, client: open ? editDialog.client : null })}
        client={editDialog.client}
        onClientUpdated={() => refreshClients(false)}
        onClientDeleted={() => refreshClients(false)}
      />
    </div>
  );
}