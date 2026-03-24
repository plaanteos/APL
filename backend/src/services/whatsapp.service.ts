import { whatsappSessionManager } from './whatsapp-session-manager.service';
import logger from '../utils/logger';

interface WhatsAppTextMessageInput {
  /** Número destino en formato internacional. */
  to: string;
  body: string;
  /** ID del usuario que envía el mensaje (requerido para SaaS multi-usuario). */
  userId?: number;
  /** Adjunto opcional (caption = body). */
  document?: { buffer: Buffer; fileName: string; mimetype: string };
}

/**
 * WhatsAppService - Proxy para el sistema multi-usuario de Baileys.
 * Reemplaza la antigua implementación de Meta Cloud API.
 */
class WhatsAppService {
  /**
   * Envía un mensaje de texto usando el gestor de sesiones de Baileys.
   */
  async sendTextMessage(input: WhatsAppTextMessageInput): Promise<void> {
    const { to, body, userId, document } = input;

    if (!userId) {
      logger.error('❌ Intento de envío de WhatsApp sin userId.');
      throw new Error('UNAUTHORIZED: Se requiere userId para enviar mensajes en el sistema multi-usuario.');
    }

    if (!to || !to.trim()) {
      throw new Error('Número de WhatsApp inválido');
    }

    if ((!body || !body.trim()) && !document?.buffer?.length) {
      throw new Error('Mensaje vacío');
    }

    const text = (body || '').trim() || ' ';

    try {
      await whatsappSessionManager.sendMessage(userId, userId, to, text, document);
      logger.info(`💬 WhatsApp enviado exitosamente por Usuario ${userId} a ${to}`);
    } catch (error: any) {
      logger.error(`❌ Error enviando WhatsApp (User ${userId}): ${error.message}`);
      
      // Traducir errores comunes para el frontend/controlador
      if (error.message === 'SESSION_NOT_FOUND') {
          throw new Error('WHATSAPP_SESSION_NOT_CONNECTED: Tu sesión de WhatsApp no está activa. Por favor, conéctate de nuevo.');
      }
      if (error.message === 'UNAUTHORIZED') {
          throw new Error('UNAUTHORIZED: No tienes permiso para usar esta sesión.');
      }
      
      throw error;
    }
  }
}

export const whatsappService = new WhatsAppService();
