import { Worker, Job } from 'bullmq';
import { redisClient } from '../config/redis.js';
import { prisma } from '../config/prisma.js';
import { config } from '../config/env.js';
import { EMAIL_QUEUE_NAME, emailQueue } from '../queues/email.queue.js';
import { EmailJobData } from '../types/index.js';
import { checkAndConsumeRateLimit, enforcePerSenderDelay } from '../services/rateLimiter.service.js';
import { sendEmail } from '../services/ethereal.service.js';
import { updateEmailStatusInElasticsearch } from '../services/elasticsearch.service.js';

export function createEmailWorker(): Worker<EmailJobData> {
  const worker = new Worker<EmailJobData>(
    EMAIL_QUEUE_NAME,
    async (job: Job<EmailJobData>) => {
      const { emailId, senderId, senderEmail, senderName, recipient, subject, body } = job.data;

      // 1. Fetch sender specific limits and settings
      const sender = await prisma.sender.findUnique({
        where: { id: senderId },
      });

      const hourlyLimit = sender?.hourlyLimit || config.worker.maxEmailsPerHour;
      const minDelayMs = (sender?.delaySeconds ? sender.delaySeconds * 1000 : config.worker.minDelayBetweenSendsMs);

      // 2. Fetch current email record to verify it hasn't been cancelled
      const emailRecord = await prisma.email.findUnique({
        where: { id: emailId },
      });

      if (!emailRecord) {
        console.warn(`[Worker] Job cancelled or not found for email ${emailId}`);
        return;
      }

      if (emailRecord.status === 'SENT') {
        console.log(`[Worker] Email ${emailId} already marked as SENT. Skipping duplicate execution.`);
        return;
      }

      // 3. Check Hourly Rate Limit
      const rateLimitCheck = await checkAndConsumeRateLimit(
        senderId,
        senderEmail,
        senderName,
        hourlyLimit,
        emailRecord.userId
      );

      if (!rateLimitCheck.allowed) {
        const rescheduleDelay = rateLimitCheck.retryAfterMs || 3600000;
        console.warn(
          `[Worker] Hourly limit reached for sender ${senderEmail} (${rateLimitCheck.currentCount}/${hourlyLimit}). Rescheduling email ${emailId} with delay of ${Math.round(rescheduleDelay / 1000)}s`
        );

        // Update DB status to RATE_LIMITED
        await prisma.email.update({
          where: { id: emailId },
          data: {
            status: 'RATE_LIMITED',
            retryCount: { increment: 1 },
          },
        });

        await updateEmailStatusInElasticsearch(emailId, 'RATE_LIMITED');

        // Reschedule job to next window using BullMQ delayed job without failing
        await emailQueue.add('send-email', job.data, {
          jobId: `${emailId}-retry-${Date.now()}`,
          delay: rescheduleDelay,
        });

        return { status: 'rate_limited', retryAfterMs: rescheduleDelay };
      }

      // 4. Enforce provider throttling delay between sends for this sender
      await enforcePerSenderDelay(senderId, minDelayMs);

      // 5. Update status to PROCESSING
      await prisma.email.update({
        where: { id: emailId },
        data: { status: 'PROCESSING' },
      });

      try {
        // 6. Send email via fake SMTP (Ethereal)
        const sendResult = await sendEmail({
          from: `"${senderName}" <${senderEmail}>`,
          to: recipient,
          subject,
          html: body,
          attachments: (emailRecord?.attachments as any) || job.data.attachments,
        });

        const sentTime = new Date();
        const previewUrl = sendResult.previewUrl || undefined;

        // 7. Update status to SENT and persist Ethereal message & preview details
        await prisma.email.update({
          where: { id: emailId },
          data: {
            status: 'SENT',
            sentAt: sentTime,
            etherealMessageId: sendResult.messageId,
            etherealPreviewUrl: previewUrl,
          },
        });

        await updateEmailStatusInElasticsearch(emailId, 'SENT', sentTime);

        console.log(`[Worker] Successfully sent email to ${recipient}. Preview: ${previewUrl || 'N/A'}`);
        return { status: 'sent', messageId: sendResult.messageId, previewUrl };
      } catch (sendError: any) {
        console.error(`[Worker] Failed sending email ${emailId}:`, sendError);

        await prisma.email.update({
          where: { id: emailId },
          data: {
            status: 'FAILED',
            failedReason: sendError?.message || 'SMTP dispatch error',
          },
        });

        await updateEmailStatusInElasticsearch(emailId, 'FAILED');
        throw sendError;
      }
    },
    {
      connection: redisClient as any,
      concurrency: config.worker.concurrency,
      limiter: {
        max: 50,
        duration: 1000,
      },
    }
  );

  worker.on('ready', () => {
    console.log(`[Worker] Email worker started with concurrency ${config.worker.concurrency}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed with error:`, err.message);
  });

  return worker;
}
