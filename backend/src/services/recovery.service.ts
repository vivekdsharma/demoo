import { prisma } from '../config/prisma.js';
import { emailQueue, addEmailJob } from '../queues/email.queue.js';

export async function reconcileScheduledJobsOnBoot(): Promise<void> {
  console.log('[Recovery] Checking for pending/scheduled emails in database...');

  try {
    const pendingEmails = await prisma.email.findMany({
      where: {
        status: { in: ['SCHEDULED', 'PENDING', 'RATE_LIMITED'] },
        sentAt: null,
      },
      include: {
        sender: true,
      },
    });

    if (pendingEmails.length === 0) {
      console.log('[Recovery] No orphaned or pending jobs found. Queue in sync.');
      return;
    }

    let restoredCount = 0;
    const now = Date.now();

    for (const email of pendingEmails) {
      const existingJob = await emailQueue.getJob(email.id);

      if (!existingJob) {
        const remainingDelay = Math.max(0, email.scheduledAt.getTime() - now);

        await addEmailJob(
          {
            emailId: email.id,
            senderId: email.senderId,
            senderEmail: email.sender.email,
            senderName: email.sender.name,
            recipient: email.recipient,
            subject: email.subject,
            body: email.body,
            scheduledAt: email.scheduledAt.toISOString(),
            retryCount: email.retryCount,
            batchId: email.batchId || undefined,
          },
          remainingDelay
        );

        restoredCount++;
      }
    }

    console.log(`[Recovery] Reconciliation complete: ${restoredCount} jobs confirmed/restored in BullMQ`);
  } catch (err) {
    console.error('[Recovery] Job reconciliation failed:', err);
  }
}
