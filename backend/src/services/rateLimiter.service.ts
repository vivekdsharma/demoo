import { redisClient } from '../config/redis.js';
import { prisma } from '../config/prisma.js';
import { sendSlackRateLimitAlert } from './slack.service.js';

export interface RateLimitCheckResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  retryAfterMs?: number;
  nextWindowTime?: Date;
}

export function getCurrentHourWindow(date: Date = new Date()): { windowKey: string; nextWindowTime: Date; msUntilNextWindow: number } {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');
  const windowKey = `${year}-${month}-${day}-${hour}`;

  const nextWindowTime = new Date(date);
  nextWindowTime.setUTCHours(nextWindowTime.getUTCHours() + 1, 0, 0, 0);
  const msUntilNextWindow = Math.max(1000, nextWindowTime.getTime() - date.getTime() + 1000);

  return { windowKey, nextWindowTime, msUntilNextWindow };
}

export async function checkAndConsumeRateLimit(
  senderId: string,
  senderEmail: string,
  senderName: string,
  limit: number,
  userId?: string | null
): Promise<RateLimitCheckResult> {
  const { windowKey, nextWindowTime, msUntilNextWindow } = getCurrentHourWindow();
  const redisKey = `ratelimit:sender:${senderId}:${windowKey}`;

  // Atomic Lua script to check limit and increment if allowed
  const luaScript = `
    local key = KEYS[1]
    local limit = tonumber(ARGV[1])
    local ttl = tonumber(ARGV[2])
    local current = tonumber(redis.call('GET', key) or "0")
    if current >= limit then
      return {0, current}
    end
    current = redis.call('INCR', key)
    if current == 1 then
      redis.call('EXPIRE', key, ttl)
    end
    return {1, current}
  `;

  const ttlSeconds = 7200; // 2 hours TTL for window keys
  const result = (await redisClient.eval(
    luaScript,
    1,
    redisKey,
    limit,
    ttlSeconds
  )) as [number, number];

  const allowed = result[0] === 1;
  const currentCount = result[1];

  if (!allowed) {
    // Record rate limit hit in database
    try {
      const event = await prisma.rateLimitEvent.upsert({
        where: {
          senderId_hourWindow: {
            senderId,
            hourWindow: windowKey,
          },
        },
        create: {
          senderId,
          hourWindow: windowKey,
          emailCount: currentCount,
          hourlyLimit: limit,
          slackNotified: false,
        },
        update: {
          emailCount: currentCount,
        },
      });

      // Send live Slack alert if not yet sent for this hour window
      if (!event.slackNotified) {
        const notified = await sendSlackRateLimitAlert({
          senderEmail,
          senderName,
          hourlyLimit: limit,
          currentCount,
          nextWindowTime,
          userId,
        });

        if (notified) {
          await prisma.rateLimitEvent.update({
            where: { id: event.id },
            data: { slackNotified: true },
          });
        }
      }
    } catch (err) {
      console.warn('[RateLimiter] Error logging rate limit event:', err);
    }

    return {
      allowed: false,
      currentCount,
      limit,
      retryAfterMs: msUntilNextWindow,
      nextWindowTime,
    };
  }

  return {
    allowed: true,
    currentCount,
    limit,
  };
}

export async function enforcePerSenderDelay(senderId: string, minDelayMs: number): Promise<void> {
  if (minDelayMs <= 0) return;

  const key = `delay:last_sent:${senderId}`;
  const now = Date.now();
  const lastSentStr = await redisClient.get(key);

  if (lastSentStr) {
    const lastSent = parseInt(lastSentStr, 10);
    const elapsed = now - lastSent;
    if (elapsed < minDelayMs) {
      const waitTime = minDelayMs - elapsed;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  await redisClient.set(key, Date.now().toString(), 'PX', minDelayMs * 5);
}
