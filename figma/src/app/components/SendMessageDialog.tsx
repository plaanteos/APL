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

  const handleSend = () => {
    if (type === "whatsapp") {
      // Remove non-numeric characters and format for WhatsApp
      const phoneNumber = contactInfo.replace(/\D/g, "");
      const encodedMessage = encodeURIComponent(message);
      window.open(
        `https://wa.me/${phoneNumber}?text=${encodedMessage}`,
        "_blank"
      );
    } else {
      // Email
      const subject = encodeURIComponent("Mensaje desde Laboratorio Dental");
      const body = encodeURIComponent(message);
      window.location.href = `mailto:${contactInfo}?subject=${subject}&body=${body}`;
    }
    
    setMessage("");
    onOpenChange(false);
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
            disabled={!message.trim()}
            className={
              isWhatsApp
                ? "bg-green-600 hover:bg-green-700"
                : "bg-blue-600 hover:bg-blue-700"
            }
          >
            {isWhatsApp ? (
              <>
                <MessageCircle size={16} className="mr-2" />
                Abrir WhatsApp
              </>
            ) : (
              <>
                <Mail size={16} className="mr-2" />
                Abrir Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}