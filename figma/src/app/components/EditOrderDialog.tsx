import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { toast } from "sonner";
import orderService from "../../services/order.service";
import type { IOrderWithCalculations } from "../types";

interface EditOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: IOrderWithCalculations | null;
  onOrderUpdated?: () => void;
}

const toDateInputValue = (value?: Date | string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function EditOrderDialog({
  open,
  onOpenChange,
  order,
  onOrderUpdated,
}: EditOrderDialogProps) {
  const [dueDate, setDueDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDueDate(toDateInputValue(order?.fecha_entrega));
    setError(null);
  }, [open, order]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    if (!dueDate) {
      setError("La fecha de entrega es requerida");
      return;
    }

    const parsed = new Date(`${dueDate}T12:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) {
      setError("Fecha de entrega inválida");
      return;
    }

    setIsSubmitting(true);
    try {
      await orderService.update(order.id, { fecha_entrega: dueDate });
      toast.success("Pedido actualizado");
      onOpenChange(false);
      onOrderUpdated?.();
    } catch (err: any) {
      console.error("Error updating order:", err);
      toast.error(err?.response?.data?.error || "No se pudo actualizar el pedido");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Pedido</DialogTitle>
          <DialogDescription className="sr-only">
            Formulario para editar la fecha de entrega del pedido
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="editOrderDueDate">Fecha de Entrega</Label>
            <Input
              id="editOrderDueDate"
              name="editOrderDueDate"
              type="date"
              value={dueDate}
              onChange={(e) => {
                setDueDate(e.target.value);
                if (error) setError(null);
              }}
              className={error ? "border-red-500" : ""}
            />
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
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
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}