import IORedis from 'ioredis';
import logger from './logger';

let redis: IORedis | null = null;

export const isRedisEnabled = () => Boolean(process.env.REDIS_URL);

export const getRedisClient = () => {
  if (redis) return redis;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('REDIS_URL no está configurado');
  }

  redis = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    tls: redisUrl.startsWith('rediss://') ? {} : undefined,
  });

  redis.on('error', (err) => logger.error('❌ Redis error:', err));
  redis.on('connect', () => logger.info('✅ Redis connected'));

  return redis;
};

export const closeRedisClient = async () => {
  if (!redis) return;
  const toClose = redis;
  redis = null;
  await toClose.quit();
};
