import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Info, MessageSquare, Smartphone } from "lucide-react";
import { getWhatsAppConnectionGuidance } from "../../services/whatsapp.service";
import { requestAppNavigation } from "../navigation";

interface WhatsAppConnectionNoticeProps {
  className?: string;
}

export function WhatsAppConnectionNotice({ className = "" }: WhatsAppConnectionNoticeProps) {
  const guidance = getWhatsAppConnectionGuidance();

  return (
    <Card className={`border border-amber-200 bg-amber-50/80 p-4 ${className}`.trim()}>
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-amber-100 p-2 text-amber-700">
          <Smartphone className="h-4 w-4" />
        </div>
        <div className="flex-1 space-y-3 text-sm text-amber-950">
          <div className="flex items-center gap-2 font-semibold">
            <Info className="h-4 w-4 text-amber-700" />
            <span>{guidance.title}</span>
          </div>
          <p className="leading-6 text-amber-900/90">{guidance.description}</p>
          <Button
            type="button"
            onClick={() => requestAppNavigation("whatsapp")}
            className="bg-[#033f63] hover:bg-[#28666e]"
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Ir a vincular WhatsApp
          </Button>
        </div>
      </div>
    </Card>
  );
}
