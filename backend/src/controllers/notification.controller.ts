import { Request, Response } from 'express';
import { z } from 'zod';
import logger from '../utils/logger';
import { emailService } from '../services/email.service';
import { whatsappService } from '../services/whatsapp.service';
import { buildBasicEmailHtml } from '../utils/notificationTemplates';
import { enqueueNotification, isNotificationQueueEnabled } from '../queues/notification.queue';

const sendSchema = z.object({
  channel: z.enum(['email', 'whatsapp']),
  to: z.string().min(1, 'Destino requerido'),
  subject: z.string().min(1).optional(),
  message: z.string().min(1, 'Mensaje requerido'),
});

export class NotificationController {
  // POST /api/notifications/send
  static async send(req: Request, res: Response) {
    try {
      const { channel, to, subject, message } = sendSchema.parse(req.body);

      // Si hay Redis configurado, encolar el envío para hacerlo asíncrono y con reintentos.
      if (isNotificationQueueEnabled()) {
        try {
          const job = await enqueueNotification({ channel, to, subject, message });
          if (job) {
            return res.json({
              success: true,
              queued: true,
              jobId: job.id,
              message: 'Notificación encolada',
            });
          }
        } catch (queueError) {
          logger.warn('⚠️ Cola de notificaciones falló; usando envío directo:', queueError);
        }
      }

      if (channel === 'email') {
        const finalSubject = subject || 'Mensaje desde APL';
        await emailService.sendEmail({
          to,
          subject: finalSubject,
          html: buildBasicEmailHtml(finalSubject, message),
        });

        return res.json({ success: true, queued: false, message: 'Email enviado' });
      }

      await whatsappService.sendTextMessage({ to, body: message });
      return res.json({ success: true, queued: false, message: 'WhatsApp enviado' });
    } catch (error: any) {
      logger.error('Notification send error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: error.issues[0].message });
      }

      return res.status(500).json({ success: false, error: error?.message || 'Error al enviar notificación' });
    }
  }
}
