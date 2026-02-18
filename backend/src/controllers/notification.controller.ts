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
  attachBalanceExcel: z.boolean().optional(),
  balanceClientId: z.number().int().positive().optional(),
  balanceClientName: z.string().min(1).optional(),
});

export class NotificationController {
  // POST /api/notifications/send
  static async send(req: Request, res: Response) {
    try {
      const { channel, to, subject, message, attachBalanceExcel, balanceClientId, balanceClientName } = sendSchema.parse(req.body);

      const shouldAttachBalanceExcel = channel === 'email' && attachBalanceExcel === true;
      if (shouldAttachBalanceExcel && !balanceClientId) {
        return res.status(400).json({ success: false, error: 'balanceClientId es requerido para adjuntar el Excel de balance' });
      }

      // Si hay Redis configurado, encolar el envío para hacerlo asíncrono y con reintentos.
      if (isNotificationQueueEnabled()) {
        try {
          const job = await enqueueNotification({
            channel,
            to,
            subject,
            message,
            ...(shouldAttachBalanceExcel
              ? {
                  attachBalanceExcel: true,
                  balanceClientId: balanceClientId!,
                  balanceClientName,
                }
              : {}),
          });
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
        let attachments: Array<{ filename: string; content: Buffer; contentType?: string }> | undefined;
        if (shouldAttachBalanceExcel) {
          const { ExcelService } = await import('../services/excel.service');
          const buffer = await ExcelService.generateBalanceExcel(balanceClientId!);
          const safeName = String(balanceClientName || `cliente_${balanceClientId}`)
            .trim()
            .replace(/\s+/g, '_')
            .replace(/[^a-zA-Z0-9_\-]/g, '');
          const date = new Date().toISOString().split('T')[0];
          const filename = `Balance_${safeName || `cliente_${balanceClientId}`}_${date}.xlsx`;
          attachments = [
            {
              filename,
              content: buffer,
              contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            },
          ];
        }
        await emailService.sendEmail({
          to,
          subject: finalSubject,
          html: buildBasicEmailHtml(finalSubject, message),
          ...(attachments ? { attachments } : {}),
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

      const statusCode = error?.statusCode || error?.status || 500;
      return res.status(statusCode).json({ success: false, error: error?.message || 'Error al enviar notificación' });
    }
  }
}
