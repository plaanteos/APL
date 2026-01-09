import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { toast } from "sonner";
import { clientService } from "../../services/client.service";

interface NewClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientCreated?: () => void;
}

export function NewClientDialog({ open, onOpenChange, onClientCreated }: NewClientDialogProps) {
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    telefono: "",
    whatsapp: "",
    tipo: "" as "CLINICA" | "DENTISTA" | "PARTICULAR" | "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tipo) {
      toast.error("Debes seleccionar un tipo de cliente");
      return;
    }

    setIsSubmitting(true);
    try {
      await clientService.createClient({
        nombre: formData.nombre,
        email: formData.email,
        telefono: formData.telefono,
        whatsapp: formData.whatsapp,
        tipo: formData.tipo as "CLINICA" | "DENTISTA" | "PARTICULAR",
      });
      toast.success("Cliente creado exitosamente");
      onOpenChange(false);
      setFormData({
        nombre: "",
        email: "",
        telefono: "",
        whatsapp: "",
        tipo: "",
      });
      if (onClientCreated) {
        onClientCreated();
      }
    } catch (error: any) {
      console.error("Error creating client:", error);
      toast.error(error.response?.data?.error || "Error al crear cliente");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Cliente</DialogTitle>
          <DialogDescription className="sr-only">
            Formulario para crear un nuevo cliente
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              value={formData.nombre}
              onChange={(e) =>
                setFormData({ ...formData, nombre: e.target.value })
              }
              placeholder="Nombre del cliente o clínica"
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <Label htmlFor="type">Tipo</Label>
            <Select
              value={formData.tipo}
              onValueChange={(value: "CLINICA" | "DENTISTA" | "PARTICULAR") =>
                setFormData({ ...formData, tipo: value })
              }
              disabled={isSubmitting}
            >
              <SelectTrigger id="type">
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CLINICA">Clínica</SelectItem>
                <SelectItem value="DENTISTA">Odontólogo</SelectItem>
                <SelectItem value="PARTICULAR">Particular</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="email@ejemplo.com"
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.telefono}
              onChange={(e) =>
                setFormData({ ...formData, telefono: e.target.value })
              }
              placeholder="+598 99 123 456"
              required
              disabled={isSubmitting}
            />
          </div>

          <div>
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input
              id="whatsapp"
              type="tel"
              value={formData.whatsapp}
              onChange={(e) =>
                setFormData({ ...formData, whatsapp: e.target.value })
              }
              placeholder="+598991234567"
              disabled={isSubmitting}
            />
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