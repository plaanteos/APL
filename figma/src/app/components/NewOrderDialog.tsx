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
import productoService from "../../services/producto.service";
import estadoService from "../../services/estado.service";
import { authService } from "../../services/auth.service";
import type { IClient } from "../types";
import type { IProducto, IEstado } from "../types";
import { Plus } from "lucide-react";

// Schema de validación con Zod
const orderSchema = z.object({
  clientId: z.string().min(1, "Debe seleccionar un cliente"),
  patientName: z.string().min(2, "El nombre del paciente debe tener al menos 2 caracteres"),
  description: z.string().optional(),
  productId: z.string().min(1, "Debe seleccionar un producto"),
  estadoId: z.string().min(1, "Debe seleccionar un estado"),
  quantity: z.string().refine((val) => {
    const num = Number(val);
    return !isNaN(num) && num > 0;
  }, "La cantidad debe ser mayor a 0"),
  unitPrice: z.string().refine((val) => {
    const num = Number(val);
    return !isNaN(num) && num > 0;
  }, "El precio debe ser mayor a 0"),
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
  const [productos, setProductos] = useState<IProducto[]>([]);
  const [estados, setEstados] = useState<IEstado[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(false);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    clientId: preselectedClientId || "",
    patientName: "",
    description: "",
    productId: "",
    estadoId: "",
    quantity: "1",
    unitPrice: "",
    dueDate: preselectedDate || "",
  });

  const [newClientData, setNewClientData] = useState({
    nombre: "",
    email: "",
    telefono: "",
  });

  // Fetch clients
  useEffect(() => {
    if (open) {
      fetchClients();
      fetchCatalogs();
    }
  }, [open]);

  const fetchClients = async () => {
    try {
      setIsLoadingClients(true);
      const data = await clientService.getAll();
      setClients(data);
    } catch (error) {
      console.error("Error al cargar clientes:", error);
      toast.error("Error al cargar la lista de clientes");
    } finally {
      setIsLoadingClients(false);
    }
  };

  const fetchCatalogs = async () => {
    try {
      setIsLoadingCatalogs(true);
      const [productosData, estadosData] = await Promise.all([
        productoService.getAll(),
        estadoService.getAll(),
      ]);
      setProductos(productosData);
      setEstados(estadosData);

      // Defaults útiles (evita formularios vacíos y reduce errores)
      setFormData((prev) => ({
        ...prev,
        productId: prev.productId || (productosData[0]?.id?.toString() ?? ""),
        estadoId: prev.estadoId || (estadosData[0]?.id?.toString() ?? ""),
      }));
    } catch (error) {
      console.error("Error al cargar catálogos:", error);
      toast.error("Error al cargar productos/estados");
    } finally {
      setIsLoadingCatalogs(false);
    }
  };

  const handleCreateClient = async () => {
    if (!newClientData.nombre || !newClientData.telefono || !newClientData.email) {
      toast.error("Por favor complete nombre, email y teléfono");
      return;
    }

    setIsSubmitting(true);
    try {
      const newClient = await clientService.create({
        nombre: newClientData.nombre,
        email: newClientData.email,
        telefono: newClientData.telefono,
      });
      toast.success("Cliente creado exitosamente");
      await fetchClients();
      setFormData({ ...formData, clientId: newClient.id.toString() });
      setShowNewClientForm(false);
      setNewClientData({
        nombre: "",
        email: "",
        telefono: "",
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
        const issues = (error as any).issues ?? (error as any).errors ?? [];
        const message = issues?.[0]?.message || 'Valor inválido';
        setErrors(prev => ({ ...prev, [field]: message }));
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
        const issues = (error as any).issues ?? (error as any).errors ?? [];
        issues.forEach((issue: any) => {
          if (issue?.path?.[0]) {
            fieldErrors[String(issue.path[0])] = issue.message;
          }
        });
        setErrors(fieldErrors);
        toast.error("Por favor corrige los errores en el formulario");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const storedUser = authService.getStoredUser();
      const adminId = storedUser?.id != null ? Number((storedUser as any).id) : NaN;
      if (!adminId || Number.isNaN(adminId)) {
        toast.error("No se pudo identificar el administrador (vuelve a iniciar sesión)");
        return;
      }

      await orderService.create({
        id_cliente: Number(formData.clientId),
        fecha_entrega: formData.dueDate,
        id_administrador: adminId,
        descripcion: formData.description?.trim() ? formData.description.trim() : undefined,
        detalles: [
          {
            id_producto: Number(formData.productId),
            cantidad: Number(formData.quantity),
            precio_unitario: Number(formData.unitPrice),
            paciente: formData.patientName,
            id_estado: Number(formData.estadoId),
          },
        ],
      });

      toast.success(`Pedido para ${formData.patientName} creado exitosamente`);
      onOpenChange(false);
      onOrderCreated?.();
      setFormData({
        clientId: "",
        patientName: "",
        description: "",
        productId: "",
        estadoId: "",
        quantity: "1",
        unitPrice: "",
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
                    name="newClientName"
                    type="text"
                    value={newClientData.nombre}
                    onChange={(e) =>
                      setNewClientData({ ...newClientData, nombre: e.target.value })
                    }
                    placeholder="Ej: Dr. Juan Pérez"
                  />
                </div>
                <div>
                  <Label htmlFor="newClientEmail">Email</Label>
                  <Input
                    id="newClientEmail"
                    name="newClientEmail"
                    type="email"
                    value={newClientData.email}
                    onChange={(e) =>
                      setNewClientData({ ...newClientData, email: e.target.value })
                    }
                    placeholder="Ej: cliente@ejemplo.com"
                  />
                </div>
                <div>
                  <Label htmlFor="newClientPhone">Teléfono</Label>
                  <Input
                    id="newClientPhone"
                    name="newClientPhone"
                    type="tel"
                    value={newClientData.telefono}
                    onChange={(e) =>
                      setNewClientData({ ...newClientData, telefono: e.target.value })
                    }
                    placeholder="Ej: +54 11 1234-5678"
                  />
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
                name="clientId"
                disabled={isLoadingClients || clients.length === 0}
              >
                <SelectTrigger id="client">
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.length > 0 ? (
                    clients.map((client) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.nombre}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__no_clients" disabled>
                      {isLoadingClients ? "Cargando clientes..." : "No hay clientes"}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          <div>
            <Label htmlFor="patientName">Nombre del Paciente *</Label>
            <Input
              id="patientName"
              name="patientName"
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
            <Label htmlFor="product">Producto *</Label>
            <Select
              value={formData.productId}
              onValueChange={(value) => {
                setFormData({ ...formData, productId: value });
                validateField("productId", value);
              }}
              name="productId"
              disabled={isLoadingCatalogs || productos.length === 0}
            >
              <SelectTrigger id="product" className={errors.productId ? "border-red-500" : ""}>
                <SelectValue placeholder="Seleccionar producto" />
              </SelectTrigger>
              <SelectContent>
                {productos.length > 0 ? (
                  productos.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()}>
                      {p.tipo}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="__no_products" disabled>
                    {isLoadingCatalogs ? "Cargando productos..." : "No hay productos"}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {errors.productId && (
              <p className="text-sm text-red-500 mt-1">{errors.productId}</p>
            )}
          </div>

          <div>
            <Label htmlFor="estado">Estado *</Label>
            <Select
              value={formData.estadoId}
              onValueChange={(value) => {
                setFormData({ ...formData, estadoId: value });
                validateField("estadoId", value);
              }}
              name="estadoId"
              disabled={isLoadingCatalogs || estados.length === 0}
            >
              <SelectTrigger id="estado" className={errors.estadoId ? "border-red-500" : ""}>
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent>
                {estados.length > 0 ? (
                  estados.map((e) => (
                    <SelectItem key={e.id} value={e.id.toString()}>
                      {e.descripcion}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="__no_states" disabled>
                    {isLoadingCatalogs ? "Cargando estados..." : "No hay estados"}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {errors.estadoId && (
              <p className="text-sm text-red-500 mt-1">{errors.estadoId}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              name="description"
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
                name="quantity"
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
                name="unitPrice"
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
              name="dueDate"
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