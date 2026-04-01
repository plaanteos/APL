import { useEffect, useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import clientService from "../../services/client.service";
import type { IClient, IClientFormData } from "../types";
import { toast } from "sonner";
import { formatPhoneInput } from "../../utils/whatsappPhone";

const clientSchema = z.object({
  nombre: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre es demasiado largo"),
  email: z.string().email("Email inválido").min(1, "El email es requerido"),
  telefono: z
    .string()
    .min(7, "Teléfono debe tener al menos 7 dígitos")
    .max(20, "Teléfono demasiado largo")
    .regex(
      /^[0-9+\-\s()]+$/,
      "Teléfono debe contener solo números y caracteres válidos",
    ),
});

type ClientKind = "odontologo" | "clinica";

const phoneHelperText = 'Formato sugerido: +54 9 11 3756 75. Primero el codigo de pais, luego el 9, despues el codigo de area y al final el numero.';

const normalizePrefix = (value: string) => String(value ?? "").trim().toLowerCase();

const inferClientKind = (rawName: string): ClientKind => {
  const n = normalizePrefix(rawName);
  if (n.startsWith("clinica") || n.startsWith("clínica")) return "clinica";
  return "odontologo";
};

const stripKnownPrefixes = (rawName: string) => {
  const name = String(rawName ?? "").trim();
  const lowered = normalizePrefix(name);
  if (lowered.startsWith("dr.")) return name.replace(/^\s*dr\.?\s*/i, "").trim();
  if (lowered.startsWith("clinica")) return name.replace(/^\s*clinica\s*/i, "").trim();
  if (lowered.startsWith("clínica")) return name.replace(/^\s*clínica\s*/i, "").trim();
  return name;
};

const formatClientDisplayName = (rawName: string, kind: ClientKind) => {
  const base = stripKnownPrefixes(rawName);
  if (!base) return "";
  if (kind === "odontologo") return base.match(/^dr\.?\s/i) ? base : `Dr. ${base}`;
  return base.match(/^(cl[ií]nica)\s/i) ? base : `Clínica ${base}`;
};

interface EditClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: IClient | null;
  onClientUpdated?: () => void;
  onClientDeleted?: () => void;
}

export function EditClientDialog({
  open,
  onOpenChange,
  client,
  onClientUpdated,
  onClientDeleted,
}: EditClientDialogProps) {
  const initialKind = useMemo(() => inferClientKind(client?.nombre ?? ""), [client?.nombre]);
  const [clientKind, setClientKind] = useState<ClientKind>(initialKind);
  const [formData, setFormData] = useState<IClientFormData>({
    nombre: "",
    email: "",
    telefono: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (!client) return;

    setClientKind(inferClientKind(client.nombre));
    setFormData({
      nombre: stripKnownPrefixes(client.nombre),
      email: client.email ?? "",
      telefono: client.telefono ?? "",
    });
    setErrors({});
  }, [open, client]);

  const validateField = (field: keyof IClientFormData, value: any) => {
    try {
      clientSchema.shape[field].parse(value);
      setErrors((prev) => ({ ...prev, [field]: "" }));
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = (error as any).issues ?? (error as any).errors ?? [];
        const message = issues?.[0]?.message || "Valor inválido";
        setErrors((prev) => ({ ...prev, [field]: message }));
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;

    try {
      clientSchema.parse(formData);
      setErrors({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        const issues = (error as any).issues ?? (error as any).errors ?? [];
        issues.forEach((issue: any) => {
          const key = issue?.path?.[0];
          if (key) fieldErrors[String(key)] = issue.message;
        });
        setErrors(fieldErrors);
        toast.error("Por favor corrige los errores en el formulario");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const nombre = formatClientDisplayName(formData.nombre, clientKind);
      await clientService.update(client.id, {
        ...formData,
        nombre,
      });
      toast.success("Cliente actualizado");
      onOpenChange(false);
      onClientUpdated?.();
    } catch (err: any) {
      console.error("Error updating client:", err);
      toast.error(err?.response?.data?.error || "Error al actualizar cliente");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!client) return;

    setIsSubmitting(true);
    try {
      await clientService.delete(client.id);
      toast.success("Cliente eliminado");
      onOpenChange(false);
      onClientDeleted?.();
    } catch (err: any) {
      console.error("Error deleting client:", err);
      toast.error(err?.response?.data?.error || "No se pudo eliminar el cliente");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
          <DialogDescription className="sr-only">
            Formulario para editar un cliente
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="editClientKind">Tipo de cliente *</Label>
            <Select value={clientKind} onValueChange={(v) => setClientKind(v as ClientKind)}>
              <SelectTrigger id="editClientKind">
                <SelectValue placeholder="Seleccionar tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="odontologo">Odontólogo</SelectItem>
                <SelectItem value="clinica">Clínica</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="editNombre">Nombre *</Label>
            <Input
              id="editNombre"
              name="nombre"
              autoComplete="name"
              value={formData.nombre}
              onChange={(e) => {
                setFormData({ ...formData, nombre: e.target.value });
                validateField("nombre", e.target.value);
              }}
              className={errors.nombre ? "border-red-500" : ""}
            />
            {errors.nombre && <p className="text-sm text-red-500 mt-1">{errors.nombre}</p>}
          </div>

          <div>
            <Label htmlFor="editEmail">Email *</Label>
            <Input
              id="editEmail"
              name="email"
              type="email"
              autoComplete="email"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                validateField("email", e.target.value);
              }}
              className={errors.email ? "border-red-500" : ""}
            />
            {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
          </div>

          <div>
            <Label htmlFor="editTelefono">Teléfono *</Label>
            <Input
              id="editTelefono"
              name="telefono"
              type="tel"
              autoComplete="tel"
              value={formData.telefono}
              onChange={(e) => {
                const formattedPhone = formatPhoneInput(e.target.value);
                setFormData({ ...formData, telefono: formattedPhone });
                validateField("telefono", formattedPhone);
              }}
              placeholder="+54 9 11 3756 75"
              className={errors.telefono ? "border-red-500" : ""}
            />
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {phoneHelperText}
            </p>
            {errors.telefono && <p className="text-sm text-red-500 mt-1">{errors.telefono}</p>}
          </div>

          <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              Eliminar
            </Button>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
