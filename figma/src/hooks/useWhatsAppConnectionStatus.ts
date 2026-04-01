import { useEffect, useState } from "react";
import whatsappService from "../services/whatsapp.service";

export function useWhatsAppConnectionStatus(userId?: number | null) {
  const [isWhatsAppConnected, setIsWhatsAppConnected] = useState<boolean | null>(null);

  useEffect(() => {
    if (!userId) {
      setIsWhatsAppConnected(null);
      return;
    }

    let cancelled = false;

    const fetchWhatsAppStatus = async () => {
      try {
        const response = await whatsappService.getStatus(userId);
        if (!cancelled) {
          setIsWhatsAppConnected(Boolean(response?.connected));
        }
      } catch {
        if (!cancelled) {
          setIsWhatsAppConnected(null);
        }
      }
    };

    fetchWhatsAppStatus();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return isWhatsAppConnected;
}
