import { Request, Response } from 'express';
import { z } from 'zod';
import logger from '../utils/logger';
import { emailService } from '../services/email.service';
import { whatsappService } from '../services/whatsapp.service';
import { buildBasicEmailHtml } from '../utils/notificationTemplates';
import { enqueueNotification, isNotificationQueueEnabled } from '../queues/notification.queue';
import { prisma } from '../utils/prisma';
import { BALANCE_XLSX_MIME, loadBalanceExcelForClient } from '../utils/balanceExcelAttachment';

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

      const adminId = (req as any).user?.id as number | undefined;
      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Acceso denegado. Usuario no autenticado.',
        });
      }

      const shouldAttachBalanceExcel =
        attachBalanceExcel === true && (channel === 'email' || channel === 'whatsapp');
      if (shouldAttachBalanceExcel && !balanceClientId) {
        return res.status(400).json({ success: false, error: 'balanceClientId es requerido para adjuntar el Excel de balance' });
      }

      if (shouldAttachBalanceExcel && balanceClientId) {
        const client = await prisma.cliente.findFirst({
          where: { id: balanceClientId, id_administrador: adminId },
          select: { id: true },
        });
        if (!client) {
          return res.status(404).json({
            success: false,
            error: 'Cliente no encontrado',
          });
        }
      }

      // Si hay Redis configurado, encolar el envío para hacerlo asíncrono y con reintentos.
      if (isNotificationQueueEnabled()) {
        try {
          const job = await enqueueNotification({
            adminId,
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
          const { buffer, filename } = await loadBalanceExcelForClient(balanceClientId!, balanceClientName);
          attachments = [{ filename, content: buffer, contentType: BALANCE_XLSX_MIME }];
        }
        await emailService.sendEmail({
          to,
          subject: finalSubject,
          html: buildBasicEmailHtml(finalSubject, message),
          ...(attachments ? { attachments } : {}),
        });

        return res.json({ success: true, queued: false, message: 'Email enviado' });
      }

      let waDocument: { buffer: Buffer; fileName: string; mimetype: string } | undefined;
      if (shouldAttachBalanceExcel) {
        const { buffer, filename } = await loadBalanceExcelForClient(balanceClientId!, balanceClientName);
        waDocument = { buffer, fileName: filename, mimetype: BALANCE_XLSX_MIME };
      }

      await whatsappService.sendTextMessage({
        to,
        body: message,
        userId: adminId,
        ...(waDocument ? { document: waDocument } : {}),
      });
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
