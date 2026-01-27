import logger from './logger';
import { ttlCache } from './ttlCache';
import { getRedisClient, isRedisEnabled } from './redisClient';

const DEFAULT_PREFIX = 'apl:cache:';

const prefixKey = (key: string) => `${DEFAULT_PREFIX}${key}`;

export const cacheEnabled = () => isRedisEnabled();

export const cacheGet = async <T>(key: string): Promise<T | undefined> => {
  if (!cacheEnabled()) return ttlCache.get<T>(key);

  try {
    const raw = await getRedisClient().get(prefixKey(key));
    if (!raw) return undefined;
    return JSON.parse(raw) as T;
  } catch (err) {
    logger.warn('⚠️ Redis cache get falló; fallback a memoria:', err);
    return ttlCache.get<T>(key);
  }
};

export const cacheSet = async <T>(key: string, value: T, ttlMs: number): Promise<void> => {
  if (!cacheEnabled()) {
    ttlCache.set(key, value, ttlMs);
    return;
  }

  try {
    const ttlSeconds = Math.max(1, Math.ceil(ttlMs / 1000));
    await getRedisClient().set(prefixKey(key), JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    logger.warn('⚠️ Redis cache set falló; fallback a memoria:', err);
    ttlCache.set(key, value, ttlMs);
  }
};

export const cacheDel = async (key: string): Promise<void> => {
  ttlCache.delete(key);
  if (!cacheEnabled()) return;

  try {
    await getRedisClient().del(prefixKey(key));
  } catch (err) {
    logger.warn('⚠️ Redis cache del falló:', err);
  }
};

export const cacheDelByPrefix = async (prefix: string): Promise<void> => {
  ttlCache.deleteByPrefix(prefix);
  if (!cacheEnabled()) return;

  const redis = getRedisClient();
  const match = `${prefixKey(prefix)}*`;

  try {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', match, 'COUNT', 200);
      cursor = nextCursor;
      if (keys.length) await redis.del(...keys);
    } while (cursor !== '0');
  } catch (err) {
    logger.warn('⚠️ Redis cache deleteByPrefix falló:', err);
  }
};

export const cacheGetOrSet = async <T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> => {
  const cached = await cacheGet<T>(key);
  if (cached !== undefined) return cached;

  const value = await loader();
  await cacheSet<T>(key, value, ttlMs);
  return value;
};
