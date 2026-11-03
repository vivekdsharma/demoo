import Redis, { RedisOptions } from 'ioredis';
import { config } from './env.js';

export const redisConnectionOptions: RedisOptions = process.env.REDIS_URL
  ? {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    }
  : {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password || undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };

export const redisClient = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, redisConnectionOptions)
  : new Redis(redisConnectionOptions);

redisClient.on('connect', () => {
  console.log('[Redis] Connected successfully');
});

redisClient.on('error', (err) => {
  console.error('[Redis] Connection error:', err.message);
});
