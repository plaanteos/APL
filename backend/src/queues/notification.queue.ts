import { Queue, Worker } from 'bullmq';
import logger from '../utils/logger';
import { emailService } from '../services/email.service';
import { whatsappService } from '../services/whatsapp.service';
import { buildBasicEmailHtml } from '../utils/notificationTemplates';
import { closeRedisClient, getRedisClient } from '../utils/redisClient';
import { prisma } from '../utils/prisma';
import { BALANCE_XLSX_MIME, loadBalanceExcelForClient } from '../utils/balanceExcelAttachment';

export type NotificationJobData = {
  adminId?: number;
  channel: 'email' | 'whatsapp';
  to: string;
  subject?: string;
  message: string;
  attachBalanceExcel?: boolean;
  balanceClientId?: number;
  balanceClientName?: string;
};

const QUEUE_NAME = 'apl:notifications';

let queue: Queue<NotificationJobData> | null = null;
let worker: Worker<NotificationJobData> | null = null;

const isEnabledByEnv = () => {
  if (process.env.NOTIFICATION_QUEUE_ENABLED === 'false') return false;
  return Boolean(process.env.REDIS_URL);
};

const getRedis = () => {
  return getRedisClient();
};

export const isNotificationQueueEnabled = () => {
  try {
    return isEnabledByEnv();
  } catch {
    return false;
  }
};

const getQueue = () => {
  if (!isEnabledByEnv()) return null;
  if (queue) return queue;

  queue = new Queue<NotificationJobData>(QUEUE_NAME, {
    connection: getRedis(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: { age: 60 * 60, count: 1000 },
      removeOnFail: { age: 24 * 60 * 60, count: 1000 },
    },
  });

  return queue;
};

export const enqueueNotification = async (data: NotificationJobData) => {
  const q = getQueue();
  if (!q) return null;

  return q.add('send', data);
};

export const initNotificationWorker = () => {
  if (!isEnabledByEnv()) {
    logger.info('ℹ️ Notification queue deshabilitada (sin REDIS_URL o NOTIFICATION_QUEUE_ENABLED=false)');
    return;
  }

  if (worker) return;

  worker = new Worker<NotificationJobData>(
    QUEUE_NAME,
    async (job) => {
      const { adminId, channel, to, subject, message, attachBalanceExcel, balanceClientId, balanceClientName } = job.data;

      if (channel === 'email') {
        const finalSubject = subject || 'Mensaje desde APL';
        let attachments: Array<{ filename: string; content: Buffer; contentType?: string }> | undefined;
        if (attachBalanceExcel && balanceClientId) {
          if (!adminId) {
            throw new Error('adminId requerido para adjuntar Excel');
          }

          const client = await prisma.cliente.findFirst({
            where: { id: balanceClientId, id_administrador: adminId },
            select: { id: true },
          });
          if (!client) {
            throw new Error('Cliente no encontrado');
          }

          const { buffer, filename } = await loadBalanceExcelForClient(balanceClientId, balanceClientName);
          attachments = [{ filename, content: buffer, contentType: BALANCE_XLSX_MIME }];
        }
        await emailService.sendEmail({
          to,
          subject: finalSubject,
          html: buildBasicEmailHtml(finalSubject, message),
          ...(attachments ? { attachments } : {}),
        });
        return;
      }

      let waDocument: { buffer: Buffer; fileName: string; mimetype: string } | undefined;
      if (attachBalanceExcel && balanceClientId) {
        if (!adminId) {
          throw new Error('adminId requerido para adjuntar Excel');
        }
        const client = await prisma.cliente.findFirst({
          where: { id: balanceClientId, id_administrador: adminId },
          select: { id: true },
        });
        if (!client) {
          throw new Error('Cliente no encontrado');
        }
        const { buffer, filename } = await loadBalanceExcelForClient(balanceClientId, balanceClientName);
        waDocument = { buffer, fileName: filename, mimetype: BALANCE_XLSX_MIME };
      }

      await whatsappService.sendTextMessage({
        to,
        body: message,
        userId: adminId,
        ...(waDocument ? { document: waDocument } : {}),
      });
    },
    {
      connection: getRedis(),
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => {
    logger.info(`✅ Job completado ${job.id} (${job.name})`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`❌ Job falló ${job?.id} (${job?.name}):`, err);
  });

  logger.info('✅ Notification worker iniciado');
};

export const closeNotificationQueue = async () => {
  await worker?.close();
  await queue?.close();
  await closeRedisClient();

  worker = null;
  queue = null;
};
