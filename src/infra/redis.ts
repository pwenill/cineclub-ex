import Redis, { RedisOptions } from 'ioredis';

let redisClient: Redis | null = null;

function buildRedisOptions(): RedisOptions {
  const password = process.env.REDIS_PASS?.trim();

  return {
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: password === '' ? undefined : password,
    lazyConnect: true,
    connectTimeout: 2_000,
    maxRetriesPerRequest: 3,
  };
}

export function getRedis(): Redis {
  if (redisClient) {
    return redisClient;
  }

  redisClient = new Redis(buildRedisOptions());

  redisClient.on('error', (error: Error) => {
    // eslint-disable-next-line no-console
    console.error('[redis] Erreur :', error.message);
  });

  redisClient.on('connect', () => {
    // eslint-disable-next-line no-console
    console.log('[redis] Connexion OK');
  });

  return redisClient;
}

export async function closeRedis(): Promise<void> {
  if (!redisClient) {
    return;
  }

  redisClient.disconnect();
  redisClient = null;
  // eslint-disable-next-line no-console
  console.log('[redis] Connexion fermee.');
}
