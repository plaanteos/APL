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
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Mail, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { notificationService } from "../../services/notification.service";

interface SendMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "email" | "whatsapp";
  clientName: string;
  contactInfo: string;
}

export function SendMessageDialog({
  open,
  onOpenChange,
  type,
  clientName,
  contactInfo,
}: SendMessageDialogProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const normalizePhone = (raw: string) => {
    const s = String(raw ?? '').trim();
    if (!s) return '';
    // Mantener solo dígitos y '+' inicial.
    const plus = s.startsWith('+') ? '+' : '';
    const digits = s.replace(/[^0-9]/g, '');
    return plus ? `+${digits}` : digits;
  };

  const openFallback = (finalMessage: string) => {
    try {
      const normalized = normalizePhone(contactInfo);
      const waDigits = normalized.replace(/[^0-9]/g, '');
      if (!waDigits) return;
      const url = `https://wa.me/${waDigits}?text=${encodeURIComponent(finalMessage)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      // no-op
    }
  };

  const handleSend = async () => {
    const finalMessage = message.trim();
    if (!finalMessage) {
      toast.error('Escribe un mensaje');
      return;
    }

    try {
      setIsSending(true);

      await notificationService.send({
        channel: type,
        to: type === 'whatsapp' ? normalizePhone(contactInfo) : contactInfo,
        subject: type === "email" ? "Mensaje desde Laboratorio Dental" : undefined,
        message: finalMessage,
      });

      toast.success(type === "whatsapp" ? "WhatsApp enviado" : "Email enviado", {
        description: `Enviado a ${clientName}`,
      });

      setMessage("");
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error sending notification:", err);

      // Fallback: abrir WhatsApp Web si falla el endpoint.
      if (type === 'whatsapp') openFallback(finalMessage);

      toast.error("No se pudo enviar desde el sistema", {
        description:
          err?.response?.data?.error ||
          err?.message ||
          "Se abrió el canal externo como alternativa",
      });
    } finally {
      setIsSending(false);
    }
  };

  const isWhatsApp = type === "whatsapp";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isWhatsApp ? (
              <>
                <MessageCircle size={20} className="text-green-600" />
                Enviar WhatsApp
              </>
            ) : (
              <>
                <Mail size={20} className="text-blue-600" />
                Enviar Email
              </>
            )}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {isWhatsApp
              ? "Enviar un mensaje de WhatsApp al cliente"
              : "Enviar un email al cliente"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Para:</p>
            <p className="font-medium">{clientName}</p>
            <p className="text-sm text-gray-500">{contactInfo}</p>
          </div>

          <div>
            <Label htmlFor="message">Mensaje</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                isWhatsApp
                  ? "Escribe tu mensaje de WhatsApp..."
                  : "Escribe tu email..."
              }
              rows={6}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setMessage("");
              onOpenChange(false);
            }}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSend}
            disabled={!message.trim() || isSending}
            className={
              isWhatsApp
                ? "bg-green-600 hover:bg-green-700"
                : "bg-blue-600 hover:bg-blue-700"
            }
          >
            {isWhatsApp ? (
              <>
                <MessageCircle size={16} className="mr-2" />
                {isSending ? "Enviando..." : "Enviar WhatsApp"}
              </>
            ) : (
              <>
                <Mail size={16} className="mr-2" />
                {isSending ? "Enviando..." : "Enviar Email"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}