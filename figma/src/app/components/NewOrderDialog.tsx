import { useState, useEffect } from "react";
import { z } from "zod";
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
import clientService from "../../services/client.service";
import orderService from "../../services/order.service";
import type { IClient } from "../types";
import { Plus } from "lucide-react";

// Schema de validación con Zod
const orderSchema = z.object({
  clientId: z.string().min(1, "Debe seleccionar un cliente"),
  patientName: z.string().min(2, "El nombre del paciente debe tener al menos 2 caracteres"),
  description: z.string().optional(),
  type: z.string().min(1, "Debe seleccionar un tipo de trabajo"),
  quantity: z.string().refine((val) => {
    const num = Number(val);
    return !isNaN(num) && num > 0;
  }, "La cantidad debe ser mayor a 0"),
  unitPrice: z.string().refine((val) => {
    const num = Number(val);
    return !isNaN(num) && num > 0;
  }, "El precio debe ser mayor a 0"),
  status: z.string(),
  dueDate: z.string().refine((val) => {
    if (!val) return false;
    const selectedDate = new Date(val);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDate >= today;
  }, "La fecha de entrega debe ser hoy o posterior"),
});

type OrderFormData = z.infer<typeof orderSchema>;

interface NewOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedClientId?: string;
  preselectedDate?: string;
  onOrderCreated?: () => void;
}

export function NewOrderDialog({ 
  open, 
  onOpenChange, 
  preselectedClientId, 
  preselectedDate,
  onOrderCreated 
}: NewOrderDialogProps) {
  const [clients, setClients] = useState<IClient[]>([]);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    clientId: preselectedClientId || "",
    patientName: "",
    description: "",
    type: "",
    quantity: "1",
    unitPrice: "",
    status: "PENDIENTE",
    dueDate: preselectedDate || "",
  });

  const [newClientData, setNewClientData] = useState({
    nombre: "",
    telefono: "",
    tipo: "PARTICULAR" as "CLINICA" | "ODONTOLOGO" | "PARTICULAR",
  });

  // Fetch clients
  useEffect(() => {
    if (open) {
      fetchClients();
    }
  }, [open]);

  const fetchClients = async () => {
    try {
      const data = await clientService.getAllClients();
      setClients(data);
    } catch (error) {
      console.error("Error al cargar clientes:", error);
      toast.error("Error al cargar la lista de clientes");
    }
  };

  const handleCreateClient = async () => {
    if (!newClientData.nombre || !newClientData.telefono) {
      toast.error("Por favor complete nombre y teléfono");
      return;
    }

    setIsSubmitting(true);
    try {
      const newClient = await clientService.createClient(newClientData);
      toast.success("Cliente creado exitosamente");
      await fetchClients();
      setFormData({ ...formData, clientId: newClient.id.toString() });
      setShowNewClientForm(false);
      setNewClientData({
        nombre: "",
        telefono: "",
        tipo: "PARTICULAR",
      });
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Error al crear cliente");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update clientId when preselectedClientId changes
  useEffect(() => {
    if (preselectedClientId) {
      setFormData(prev => ({ ...prev, clientId: preselectedClientId }));
    }
  }, [preselectedClientId]);

  // Update dueDate when preselectedDate changes
  useEffect(() => {
    if (preselectedDate) {
      setFormData(prev => ({ ...prev, dueDate: preselectedDate }));
    }
  }, [preselectedDate]);

  const validateField = (field: keyof OrderFormData, value: any) => {
    try {
      orderSchema.shape[field].parse(value);
      setErrors(prev => ({ ...prev, [field]: "" }));
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors(prev => ({ ...prev, [field]: error.errors[0].message }));
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar todo el formulario
    try {
      orderSchema.parse(formData);
      setErrors({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
        toast.error("Por favor corrige los errores en el formulario");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const newOrder = await orderService.createOrder({
        clienteId: Number(formData.clientId),
        paciente: formData.patientName,
        descripcion: formData.description,
        tipoPedido: formData.type,
        cantidad: Number(formData.quantity),
        precioUnitario: Number(formData.unitPrice),
        estado: formData.status as any,
        fechaVencimiento: formData.dueDate,
      });
      
      toast.success(`Pedido para ${newOrder.paciente} creado exitosamente`);
      onOpenChange(false);
      onOrderCreated?.();
      setFormData({
        clientId: "",
        patientName: "",
        description: "",
        type: "",
        quantity: "1",
        unitPrice: "",
        status: "PENDIENTE",
        dueDate: "",
      });
      setErrors({});
    } catch (error: any) {
      console.error("Error creating order:", error);
      const errorMessage = error.response?.data?.error || "Error al crear pedido";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const total =
    Number(formData.quantity) * Number(formData.unitPrice) || 0;

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
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="client">Cliente</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowNewClientForm(!showNewClientForm)}
                className="h-8 text-xs"
              >
                <Plus className="w-4 h-4 mr-1" />
                {showNewClientForm ? "Cancelar" : "Nuevo Cliente"}
              </Button>
            </div>

            {showNewClientForm ? (
              <div className="space-y-3 p-4 border rounded-lg bg-gray-50">
                <div>
                  <Label htmlFor="newClientName">Nombre</Label>
                  <Input
                    id="newClientName"
                    type="text"
                    value={newClientData.nombre}
                    onChange={(e) =>
                      setNewClientData({ ...newClientData, nombre: e.target.value })
                    }
                    placeholder="Ej: Dr. Juan Pérez"
                  />
                </div>
                <div>
                  <Label htmlFor="newClientPhone">Teléfono</Label>
                  <Input
                    id="newClientPhone"
                    type="tel"
                    value={newClientData.telefono}
                    onChange={(e) =>
                      setNewClientData({ ...newClientData, telefono: e.target.value })
                    }
                    placeholder="Ej: +54 11 1234-5678"
                  />
                </div>
                <div>
                  <Label htmlFor="newClientType">Tipo</Label>
                  <Select
                    value={newClientData.tipo}
                    onValueChange={(value: any) =>
                      setNewClientData({ ...newClientData, tipo: value })
                    }
                  >
                    <SelectTrigger id="newClientType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CLINICA">Clínica</SelectItem>
                      <SelectItem value="ODONTOLOGO">Odontólogo</SelectItem>
                      <SelectItem value="PARTICULAR">Particular</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  onClick={handleCreateClient}
                  disabled={isSubmitting}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? "Creando..." : "Crear Cliente"}
                </Button>
              </div>
            ) : (
              <Select
                value={formData.clientId}
                onValueChange={(value) =>
                  setFormData({ ...formData, clientId: value })
                }
              >
                <SelectTrigger id="client">
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div>
            <Label htmlFor="patientName">Nombre del Paciente *</Label>
            <Input
              id="patientName"
              type="text"
              value={formData.patientName}
              onChange={(e) => {
                setFormData({ ...formData, patientName: e.target.value });
                validateField("patientName", e.target.value);
              }}
              placeholder="Ej: María Rodríguez"
              className={errors.patientName ? "border-red-500" : ""}
            />
            {errors.patientName && (
              <p className="text-sm text-red-500 mt-1">{errors.patientName}</p>
            )}
          </div>

          <div>
            <Label htmlFor="type">Tipo de Trabajo</Label>
            <Select
              value={formData.type}
              onValueChange={(value) =>
                setFormData({ ...formData, type: value })
              }
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
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Ej: Corona de porcelana sobre metal"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="quantity">Cantidad *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => {
                  setFormData({ ...formData, quantity: e.target.value });
                  validateField("quantity", e.target.value);
                }}
                className={errors.quantity ? "border-red-500" : ""}
              />
              {errors.quantity && (
                <p className="text-sm text-red-500 mt-1">{errors.quantity}</p>
              )}
            </div>
            <div>
              <Label htmlFor="unitPrice">Precio Unitario *</Label>
              <Input
                id="unitPrice"
                type="number"
                min="0"
                step="0.01"
                value={formData.unitPrice}
                onChange={(e) => {
                  setFormData({ ...formData, unitPrice: e.target.value });
                  validateField("unitPrice", e.target.value);
                }}
                placeholder="$"
                className={errors.unitPrice ? "border-red-500" : ""}
              />
              {errors.unitPrice && (
                <p className="text-sm text-red-500 mt-1">{errors.unitPrice}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="dueDate">Fecha de Entrega *</Label>
            <Input
              id="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={(e) => {
                setFormData({ ...formData, dueDate: e.target.value });
                validateField("dueDate", e.target.value);
              }}
              className={errors.dueDate ? "border-red-500" : ""}
            />
            {errors.dueDate && (
              <p className="text-sm text-red-500 mt-1">{errors.dueDate}</p>
            )}
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