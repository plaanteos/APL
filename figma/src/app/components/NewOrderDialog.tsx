import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { toast } from "sonner";
import { clientService, Client } from "../../services/client.service";
import { orderService } from "../../services/order.service";

interface NewOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedClientId?: string;
  preselectedDate?: string;
  onOrderCreated?: () => void;
}

export function NewOrderDialog({ open, onOpenChange, preselectedClientId, preselectedDate, onOrderCreated }: NewOrderDialogProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    clienteId: preselectedClientId || "",
    nombrePaciente: "",
    descripcion: "",
    tipo: "",
    cantidad: "1",
    precioUnitario: "",
    fechaEntrega: preselectedDate || "",
  });

  useEffect(() => {
    if (open) {
      const fetchClients = async () => {
        setIsLoadingClients(true);
        try {
          const fetchedClients = await clientService.getAllClients();
          setClients(fetchedClients);
        } catch (error) {
          console.error("Error fetching clients:", error);
          toast.error("Error al cargar clientes");
        } finally {
          setIsLoadingClients(false);
        }
      };
      fetchClients();
    }
  }, [open]);

  // Update clientId when preselectedClientId changes
  useEffect(() => {
    if (preselectedClientId) {
      setFormData(prev => ({ ...prev, clienteId: preselectedClientId }));
    }
  }, [preselectedClientId]);

  // Update dueDate when preselectedDate changes
  useEffect(() => {
    if (preselectedDate) {
      setFormData(prev => ({ ...prev, fechaEntrega: preselectedDate }));
    }
  }, [preselectedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.clienteId) {
      toast.error("Debes seleccionar un cliente");
      return;
    }

    setIsSubmitting(true);
    try {
      await orderService.createOrder({
        clienteId: formData.clienteId,
        nombrePaciente: formData.nombrePaciente,
        descripcion: formData.descripcion,
        tipo: formData.tipo,
        cantidad: Number(formData.cantidad),
        precioUnitario: Number(formData.precioUnitario),
        fechaEntrega: formData.fechaEntrega || undefined,
      });
      
      toast.success("Pedido creado exitosamente");
      onOpenChange(false);
      setFormData({
        clienteId: "",
        nombrePaciente: "",
        descripcion: "",
        tipo: "",
        cantidad: "1",
        precioUnitario: "",
        fechaEntrega: "",
      });
      if (onOrderCreated) {
        onOrderCreated();
      }
    } catch (error: any) {
      console.error("Error creating order:", error);
      toast.error(error.response?.data?.error || "Error al crear pedido");
    } finally {
      setIsSubmitting(false);
    }
  };

  const total =
    Number(formData.cantidad) * Number(formData.precioUnitario) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Pedido</DialogTitle>
          <DialogDescription className="sr-only">
            Formulario para crear un nuevo pedido
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="client">Cliente</Label>
            <Select
              value={formData.clienteId}
              onValueChange={(value) =>
                setFormData({ ...formData, clienteId: value })
              }
              disabled={isSubmitting || isLoadingClients}
            >
              <SelectTrigger id="client">
                <SelectValue placeholder={isLoadingClients ? "Cargando..." : "Seleccionar cliente"} />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="patientName">Nombre del Paciente</Label>
            <Input
              id="patientName"
              type="text"
              value={formData.nombrePaciente}
              onChange={(e) =>
                setFormData({ ...formData, nombrePaciente: e.target.value })
              }
              placeholder="Ej: María Rodríguez"
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <Label htmlFor="type">Tipo de Trabajo</Label>
            <Select
              value={formData.tipo}
              onValueChange={(value) =>
                setFormData({ ...formData, tipo: value })
              }
              disabled={isSubmitting}
            >
              <SelectTrigger id="type">
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Corona">Corona</SelectItem>
                <SelectItem value="Puente">Puente</SelectItem>
                <SelectItem value="Prótesis">Prótesis</SelectItem>
                <SelectItem value="Carilla">Carilla</SelectItem>
                <SelectItem value="Incrustación">Incrustación</SelectItem>
                <SelectItem value="Placa">Placa de Descarga</SelectItem>
                <SelectItem value="Otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.descripcion}
              onChange={(e) =>
                setFormData({ ...formData, descripcion: e.target.value })
              }
              placeholder="Ej: Corona de porcelana sobre metal"
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="quantity">Cantidad</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.cantidad}
                onChange={(e) =>
                  setFormData({ ...formData, cantidad: e.target.value })
                }
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label htmlFor="unitPrice">Precio Unitario</Label>
              <Input
                id="unitPrice"
                type="number"
                min="0"
                step="0.01"
                value={formData.precioUnitario}
                onChange={(e) =>
                  setFormData({ ...formData, precioUnitario: e.target.value })
                }
                placeholder="$"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="dueDate">Fecha de Entrega</Label>
            <Input
              id="dueDate"
              type="date"
              value={formData.fechaEntrega}
              onChange={(e) =>
                setFormData({ ...formData, fechaEntrega: e.target.value })
              }
              disabled={isSubmitting}
            />
          </div>

          {total > 0 && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total:</span>
                <span className="text-lg">${total.toLocaleString()}</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creando..." : "Crear Pedido"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}