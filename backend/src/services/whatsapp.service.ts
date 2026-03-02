import logger from '../utils/logger';

type FetchFn = typeof fetch;

const getFetch = async (): Promise<FetchFn> => {
  const maybeFetch = (globalThis as any).fetch as FetchFn | undefined;
  if (typeof maybeFetch === 'function') return maybeFetch;

  // Fallback para runtimes Node sin `fetch` global.
  const undici = await import('undici');
  return undici.fetch as unknown as FetchFn;
};

interface WhatsAppTextMessageInput {
  /** Número destino en formato internacional. La API acepta solo dígitos (E.164 sin '+'). */
  to: string;
  body: string;
}

const normalizeWhatsAppTo = (raw: string): string => {
  // Meta WhatsApp Cloud API espera el número en formato internacional, solo dígitos.
  // Ej: +598991234567 -> 598991234567
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';

  const defaultCountryCode = (process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || '').replace(/\D/g, '');
  if (!defaultCountryCode) return digits;

  // Si ya viene con el prefijo país configurado, respetarlo.
  if (digits.startsWith(defaultCountryCode)) return digits;

  // Si es un número corto/local, prefijar. Ej: 099123456 -> 59899123456
  if (digits.length <= 10) {
    const withoutLeadingZeros = digits.replace(/^0+/, '');
    return `${defaultCountryCode}${withoutLeadingZeros || digits}`;
  }

  return digits;
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

    const fetchFn = await getFetch();

    const response = await fetchFn(url, {
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

    const raw = await response.text();
    let parsed: any = undefined;
    try {
      parsed = raw ? JSON.parse(raw) : undefined;
    } catch {
      parsed = undefined;
    }

    if (!response.ok) {
      const metaMessage = parsed?.error?.message;
      const metaCode = parsed?.error?.code;
      const metaType = parsed?.error?.type;

      logger.error(`❌ Error WhatsApp API (${response.status}): ${raw}`);

      const error = new Error(
        metaMessage
          ? `WhatsApp API: ${metaMessage}${metaCode ? ` (code ${metaCode}${metaType ? `, ${metaType}` : ''})` : ''}`
          : `WhatsApp API: error ${response.status}`
      ) as any;
      error.statusCode = response.status;
      throw error;
    }

    logger.info(`💬 WhatsApp enviado a ${to}`);
  }
}

export const whatsappService = new WhatsAppService();
