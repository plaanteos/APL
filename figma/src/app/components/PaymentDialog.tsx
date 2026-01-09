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

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  patientName: string;
  total: number;
  amountPaid: number;
  onPayment: (orderId: string, amount: number) => void;
}

export function PaymentDialog({
  open,
  onOpenChange,
  orderId,
  patientName,
  total,
  amountPaid,
  onPayment,
}: PaymentDialogProps) {
  const remaining = total - amountPaid;
  const [paymentAmount, setPaymentAmount] = useState(remaining.toString());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(paymentAmount);
    if (amount > 0 && amount <= remaining) {
      onPayment(orderId, amount);
      onOpenChange(false);
      setPaymentAmount("");
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
              <span className="text-[#033f63] font-medium">{patientName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total del trabajo:</span>
              <span className="text-[#033f63] font-medium">
                ${total.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Ya pagado:</span>
              <span className="text-[#7c9885] font-medium">
                ${amountPaid.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between border-t border-[#033f63]/20 pt-2">
              <span className="text-[#033f63] font-semibold">Falta pagar:</span>
              <span className="text-[#b5b682] font-bold text-lg">
                ${remaining.toLocaleString()}
              </span>
            </div>
          </div>

          <div>
            <Label htmlFor="paymentAmount">Monto a registrar</Label>
            <Input
              id="paymentAmount"
              type="number"
              min="0"
              max={remaining}
              step="0.01"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="Ingrese el monto"
              className="text-lg"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Máximo: ${remaining.toLocaleString()}
            </p>
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
                !paymentAmount ||
                Number(paymentAmount) <= 0 ||
                Number(paymentAmount) > remaining
              }
            >
              Registrar Pago
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
