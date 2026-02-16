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
import { toast } from "sonner";
import paymentService from "../../services/payment.service";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedidoId: number | null;
  paciente: string;
  montoTotal: number;
  montoPagado: number;
  onPaymentCreated?: () => void;
}

export function PaymentDialog({
  open,
  onOpenChange,
  pedidoId,
  paciente,
  montoTotal,
  montoPagado,
  onPaymentCreated,
}: PaymentDialogProps) {
  const safeTotal = Number(montoTotal ?? 0);
  const safeAmountPaid = Number(montoPagado ?? 0);
  const remaining = useMemo(() => Math.max(0, safeTotal - safeAmountPaid), [safeTotal, safeAmountPaid]);
  const formatMoney = (value: unknown) => Number(value ?? 0).toLocaleString();

  const [paymentAmount, setPaymentAmount] = useState("0");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setPaymentAmount(String(remaining || 0));
      setError("");
    }
  }, [open, remaining]);

  const paymentSchema = z.object({
    amount: z.string()
      .refine((val) => {
        const num = Number(val);
        return !isNaN(num) && num > 0;
      }, "El monto debe ser mayor a 0")
      .refine((val) => {
        const num = Number(val);
        return num <= remaining;
      }, `El monto no puede ser mayor a $${remaining.toLocaleString()}`),
  });

  const validateAmount = (value: string) => {
    try {
      paymentSchema.parse({ amount: value });
      setError("");
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pedidoId) {
      toast.error("Selecciona un pedido para pagar");
      return;
    }

    if (!validateAmount(paymentAmount)) {
      toast.error(error || "Por favor ingresa un monto válido");
      return;
    }

    const amount = Number(paymentAmount);
    setIsSubmitting(true);

    const createPromise = paymentService.create({
      valor: amount,
      detalles: [{ id_pedido: pedidoId, valor: amount }],
    });

    toast.promise(createPromise, {
      loading: "Registrando pago...",
      success: "Pago registrado",
      error: (e: any) => e?.response?.data?.error || e?.message || "Error al registrar pago",
    });

    try {
      await createPromise;
      onOpenChange(false);
      onPaymentCreated?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Pago</DialogTitle>
          <DialogDescription className="sr-only">
            Formulario para registrar un pago parcial o total
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-[#033f63]/5 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Paciente:</span>
              <span className="text-[#033f63] font-medium">{paciente}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total del trabajo:</span>
              <span className="text-[#033f63] font-medium">
                ${formatMoney(safeTotal)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Ya pagado:</span>
              <span className="text-[#7c9885] font-medium">
                ${formatMoney(safeAmountPaid)}
              </span>
            </div>
            <div className="flex justify-between border-t border-[#033f63]/20 pt-2">
              <span className="text-[#033f63] font-semibold">Falta pagar:</span>
              <span className="text-[#b5b682] font-bold text-lg">
                ${formatMoney(remaining)}
              </span>
            </div>
          </div>

          <div>
            <Label htmlFor="paymentAmount">Monto a registrar *</Label>
            <Input
              id="paymentAmount"
              type="number"
              min="0"
              max={remaining}
              step="0.01"
              value={paymentAmount}
              onChange={(e) => {
                setPaymentAmount(e.target.value);
                validateAmount(e.target.value);
              }}
              placeholder="Ingrese el monto"
              className={`text-lg ${error ? "border-red-500" : ""}`}
            />
            {error ? (
              <p className="text-sm text-red-500 mt-1">{error}</p>
            ) : (
              <p className="text-xs text-gray-500 mt-1">
                Máximo: ${formatMoney(remaining)}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-[#033f63] hover:bg-[#28666e]"
              disabled={
                isSubmitting ||
                !paymentAmount ||
                Number(paymentAmount) <= 0 ||
                Number(paymentAmount) > remaining
              }
            >
              {isSubmitting ? "Registrando..." : "Registrar Pago"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
