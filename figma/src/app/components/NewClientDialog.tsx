import { useState } from "react";
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
import clientService from "../../services/client.service";
import { IClientFormData } from "../types";
import { toast } from "sonner";

// Schema de validación con Zod
const clientSchema = z.object({
  nombre: z.string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre es demasiado largo"),
  email: z.string()
    .email("Email inválido")
    .min(1, "El email es requerido"),
  telefono: z.string()
    .min(7, "Teléfono debe tener al menos 7 dígitos")
    .max(20, "Teléfono demasiado largo")
    .regex(/^[0-9+\-\s()]+$/, "Teléfono debe contener solo números y caracteres válidos"),
});

interface NewClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientCreated?: () => void;
}

export function NewClientDialog({ open, onOpenChange, onClientCreated }: NewClientDialogProps) {
  const [formData, setFormData] = useState<IClientFormData>({
    nombre: "",
    email: "",
    telefono: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = (field: keyof IClientFormData, value: any) => {
    try {
      clientSchema.shape[field].parse(value);
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
      clientSchema.parse(formData);
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
      const newClient = await clientService.create(formData);
      toast.success(`Cliente ${newClient.nombre} creado exitosamente`);
      onOpenChange(false);
      onClientCreated?.();
      // Reset form
      setFormData({
        nombre: "",
        email: "",
        telefono: "",
      });
      setErrors({});
    } catch (error: any) {
      console.error("Error creating client:", error);
      const errorMessage = error.response?.data?.error || "Error al crear cliente";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Cliente</DialogTitle>
          <DialogDescription className="sr-only">
            Formulario para crear un nuevo cliente
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              value={formData.nombre}
              onChange={(e) => {
                setFormData({ ...formData, nombre: e.target.value });
                validateField("nombre", e.target.value);
              }}
              placeholder="Nombre del cliente"
              className={errors.nombre ? "border-red-500" : ""}
            />
            {errors.nombre && (
              <p className="text-sm text-red-500 mt-1">{errors.nombre}</p>
            )}
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                validateField("email", e.target.value);
              }}
              placeholder="email@ejemplo.com"
              className={errors.email ? "border-red-500" : ""}
            />
            {errors.email && (
              <p className="text-sm text-red-500 mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <Label htmlFor="phone">Teléfono *</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.telefono}
              onChange={(e) => {
                setFormData({ ...formData, telefono: e.target.value });
                validateField("telefono", e.target.value);
              }}
              placeholder="+598 99 123 456"
              className={errors.telefono ? "border-red-500" : ""}
            />
            {errors.telefono && (
              <p className="text-sm text-red-500 mt-1">{errors.telefono}</p>
            )}
          </div>

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
              {isSubmitting ? "Creando..." : "Crear Cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}