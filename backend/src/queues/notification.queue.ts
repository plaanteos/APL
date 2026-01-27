import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import logger from '../utils/logger';
import { emailService } from '../services/email.service';
import { whatsappService } from '../services/whatsapp.service';
import { buildBasicEmailHtml } from '../utils/notificationTemplates';

export type NotificationJobData = {
  channel: 'email' | 'whatsapp';
  to: string;
  subject?: string;
  message: string;
};

const QUEUE_NAME = 'apl:notifications';

let redis: IORedis | null = null;
let queue: Queue<NotificationJobData> | null = null;
let worker: Worker<NotificationJobData> | null = null;

const isEnabledByEnv = () => {
  if (process.env.NOTIFICATION_QUEUE_ENABLED === 'false') return false;
  return Boolean(process.env.REDIS_URL);
};

const getRedis = () => {
  if (redis) return redis;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('REDIS_URL no está configurado');
  }

  redis = new IORedis(redisUrl, {
    // BullMQ recomienda deshabilitar esto para evitar errores con pipelines/long running.
    maxRetriesPerRequest: null,
    // Para rediss:// (TLS)
    tls: redisUrl.startsWith('rediss://') ? {} : undefined,
  });

  redis.on('error', (err) => logger.error('❌ Redis error:', err));
  redis.on('connect', () => logger.info('✅ Redis connected (job queue)'));

  return redis;
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
      const { channel, to, subject, message } = job.data;

      if (channel === 'email') {
        const finalSubject = subject || 'Mensaje desde APL';
        await emailService.sendEmail({
          to,
          subject: finalSubject,
          html: buildBasicEmailHtml(finalSubject, message),
        });
        return;
      }

      await whatsappService.sendTextMessage({ to, body: message });
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
  if (redis) {
    await redis.quit();
  }

  worker = null;
  queue = null;
  redis = null;
};
