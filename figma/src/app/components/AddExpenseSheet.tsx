import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { toast } from "sonner";
import { Package, Truck } from "lucide-react";
import expenseService, { IExpenseFormData } from "../../services/expense.service";

interface AddExpenseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExpenseAdded: () => void;
}

export function AddExpenseSheet({
  open,
  onOpenChange,
  onExpenseAdded,
}: AddExpenseSheetProps) {
  const [tipo, setTipo] = useState<"supplies" | "delivery">("supplies");
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!descripcion.trim() || !monto) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      toast.error("El monto debe ser un número positivo");
      return;
    }

    try {
      setIsLoading(true);
      const data: IExpenseFormData = { tipo, descripcion: descripcion.trim(), monto: montoNum };
      await expenseService.create(data);
      toast.success("Gasto agregado exitosamente");

      // Reset form
      setTipo("supplies");
      setDescripcion("");
      setMonto("");
      onOpenChange(false);
      onExpenseAdded();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Error al guardar el gasto");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-[#033f63]">
            Agregar Otros Gastos
          </SheetTitle>
          <SheetDescription>
            Registra insumos y gastos de cadetería generales
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6 px-1">
          {/* Tipo de Gasto */}
          <div className="space-y-2">
            <Label htmlFor="expTipo" className="text-[#033f63]">
              Tipo de Gasto
            </Label>
            <Select
              value={tipo}
              onValueChange={(value: "supplies" | "delivery") => setTipo(value)}
            >
              <SelectTrigger
                id="expTipo"
                className="border-[#033f63]/20 focus:border-[#033f63]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="supplies">
                  <div className="flex items-center gap-2">
                    <Package size={16} className="text-[#033f63]" />
                    <span>Insumos</span>
                  </div>
                </SelectItem>
                <SelectItem value="delivery">
                  <div className="flex items-center gap-2">
                    <Truck size={16} className="text-[#28666e]" />
                    <span>Cadetería</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="expDesc" className="text-[#033f63]">
              Descripción
            </Label>
            <Textarea
              id="expDesc"
              placeholder="Describe el gasto..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={4}
              className="border-[#033f63]/20 focus:border-[#033f63]"
            />
          </div>

          {/* Monto */}
          <div className="space-y-2">
            <Label htmlFor="expMonto" className="text-[#033f63]">
              Monto ($)
            </Label>
            <Input
              id="expMonto"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="border-[#033f63]/20 focus:border-[#033f63]"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4 pb-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-[#033f63]/30 text-[#033f63] hover:bg-[#033f63]/10"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-[#033f63] hover:bg-[#28666e]"
              disabled={isLoading}
            >
              {isLoading ? "Guardando..." : "Guardar Gasto"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
