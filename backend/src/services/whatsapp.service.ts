import logger from '../utils/logger';

interface WhatsAppTextMessageInput {
  /** Número destino en formato internacional. La API acepta solo dígitos (E.164 sin '+'). */
  to: string;
  body: string;
}

const normalizeWhatsAppTo = (raw: string): string => {
  // Meta WhatsApp Cloud API espera el número en formato internacional, solo dígitos.
  // Ej: +598991234567 -> 598991234567
  return raw.replace(/\D/g, '');
};

class WhatsAppService {
  private getConfig() {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const apiVersion = process.env.WHATSAPP_API_VERSION || 'v19.0';

    if (!token || !phoneNumberId) {
      throw new Error('WhatsApp no está configurado (WHATSAPP_TOKEN/WHATSAPP_PHONE_NUMBER_ID)');
    }

    return { token, phoneNumberId, apiVersion };
  }

  async sendTextMessage(input: WhatsAppTextMessageInput): Promise<void> {
    const { token, phoneNumberId, apiVersion } = this.getConfig();

    const to = normalizeWhatsAppTo(input.to);
    if (!to) {
      throw new Error('Número de WhatsApp inválido');
    }

    if (!input.body?.trim()) {
      throw new Error('Mensaje vacío');
    }

    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: {
          preview_url: false,
          body: input.body,
        },
      }),
    });

    const text = await response.text();

    if (!response.ok) {
      logger.error(`❌ Error WhatsApp API (${response.status}): ${text}`);
      throw new Error('No se pudo enviar el WhatsApp');
    }

    logger.info(`💬 WhatsApp enviado a ${to}`);
  }
}

export const whatsappService = new WhatsAppService();
