import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { emailQueue } from '../queues/email.queue.js';
import { isElasticsearchAvailable } from '../config/elasticsearch.js';

export async function getStats(_req: Request, res: Response): Promise<void> {
  try {
    const [scheduledCount, sentCount, failedCount, rateLimitedCount, sendersCount] =
      await Promise.all([
        prisma.email.count({ where: { status: 'SCHEDULED' } }),
        prisma.email.count({ where: { status: 'SENT' } }),
        prisma.email.count({ where: { status: 'FAILED' } }),
        prisma.email.count({ where: { status: 'RATE_LIMITED' } }),
        prisma.sender.count(),
      ]);

    // Query BullMQ queue metrics
    const [waiting, active, delayed, completed, failed] = await Promise.all([
      emailQueue.getWaitingCount(),
      emailQueue.getActiveCount(),
      emailQueue.getDelayedCount(),
      emailQueue.getCompletedCount(),
      emailQueue.getFailedCount(),
    ]);

    res.json({
      database: {
        scheduled: scheduledCount,
        sent: sentCount,
        failed: failedCount,
        rateLimited: rateLimitedCount,
        totalSenders: sendersCount,
      },
      queue: {
        waiting,
        active,
        delayed,
        completed,
        failed,
      },
      elasticsearch: {
        connected: isElasticsearchAvailable(),
      },
    });
  } catch (error: any) {
    console.error('[StatsController] Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to retrieve stats' });
  }
}
