import { Queue } from 'bullmq';
import { createBullBoard } from '@bull-board/api';
// @ts-ignore
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { redisClient } from '../config/redis.js';
import { EmailJobData } from '../types/index.js';

export const EMAIL_QUEUE_NAME = 'email-dispatch-queue';

export const emailQueue = new Queue<EmailJobData, any, string>(EMAIL_QUEUE_NAME, {
  connection: redisClient as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
    removeOnComplete: {
      count: 2000,
      age: 24 * 3600,
    },
    removeOnFail: {
      count: 5000,
    },
  },
});

export async function addEmailJob(data: EmailJobData, delayMs: number): Promise<string> {
  // Using emailId as BullMQ jobId guarantees strict idempotency across worker instances
  const job = await emailQueue.add('send-email', data, {
    jobId: data.emailId,
    delay: Math.max(0, delayMs),
  });

  return job.id!;
}

// Bull-Board UI adapter setup
export const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(emailQueue as any)],
  serverAdapter: serverAdapter,
});
