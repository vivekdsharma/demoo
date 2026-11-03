import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { addEmailJob, emailQueue } from '../queues/email.queue.js';
import { indexEmailInElasticsearch, searchEmails } from '../services/elasticsearch.service.js';
import { z } from 'zod';
import fs from 'fs';
import readline from 'readline';

const scheduleSchema = z.object({
  senderId: z.string().min(1, 'Sender ID is required'),
  recipients: z.array(z.string().email('Invalid email')).min(1, 'At least one recipient required'),
  subject: z.string().min(1, 'Subject cannot be empty'),
  body: z.string().min(1, 'Email body cannot be empty'),
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)), 'Valid start time required'),
  delayBetweenEmailsSeconds: z.number().min(0).optional(),
  hourlyLimit: z.number().min(1).optional(),
  userId: z.string().optional(),
  attachments: z
    .array(
      z.object({
        filename: z.string(),
        content: z.string(),
        contentType: z.string().optional(),
        size: z.number().optional(),
      })
    )
    .optional(),
});

export async function scheduleEmails(req: Request, res: Response): Promise<void> {
  try {
    const parseResult = scheduleSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: parseResult.error.flatten() });
      return;
    }

    const {
      senderId,
      recipients,
      subject,
      body,
      startTime,
      delayBetweenEmailsSeconds,
      hourlyLimit,
      userId,
      attachments,
    } = parseResult.data;

    const sender = await prisma.sender.findUnique({
      where: { id: senderId },
    });

    if (!sender) {
      res.status(404).json({ error: 'Sender not found' });
      return;
    }

    // Optionally update sender defaults if explicitly customized for this run
    if (hourlyLimit !== undefined || delayBetweenEmailsSeconds !== undefined) {
      await prisma.sender.update({
        where: { id: senderId },
        data: {
          hourlyLimit: hourlyLimit ?? sender.hourlyLimit,
          delaySeconds: delayBetweenEmailsSeconds ?? sender.delaySeconds,
        },
      });
    }

    const startTimestamp = new Date(startTime).getTime();
    const staggerIntervalMs = (delayBetweenEmailsSeconds ?? sender.delaySeconds) * 1000;
    const batchId = `batch_${Date.now()}`;
    const scheduledRecords = [];

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i].trim().toLowerCase();
      // Stagger each lead in batch according to delay setting
      const scheduledTime = new Date(startTimestamp + i * staggerIntervalMs);
      const delayMs = Math.max(0, scheduledTime.getTime() - Date.now());

      const emailRecord = await prisma.email.create({
        data: {
          recipient,
          subject,
          body,
          senderId,
          userId: userId || undefined,
          status: 'SCHEDULED',
          scheduledAt: scheduledTime,
          batchId,
          attachments: attachments ? (attachments as any) : undefined,
        },
      });

      // Index in Elasticsearch
      await indexEmailInElasticsearch({
        id: emailRecord.id,
        recipient,
        senderEmail: sender.email,
        subject,
        body,
        status: 'SCHEDULED',
        scheduledAt: scheduledTime,
        createdAt: emailRecord.createdAt,
      });

      // Add to BullMQ with strict emailRecord.id jobId
      const jobId = await addEmailJob(
        {
          emailId: emailRecord.id,
          senderId,
          senderEmail: sender.email,
          senderName: sender.name,
          recipient,
          subject,
          body,
          scheduledAt: scheduledTime.toISOString(),
          batchId,
          attachments,
        },
        delayMs
      );

      await prisma.email.update({
        where: { id: emailRecord.id },
        data: { jobId },
      });

      scheduledRecords.push(emailRecord);
    }

    res.status(201).json({
      message: `Successfully scheduled ${scheduledRecords.length} email(s)`,
      batchId,
      count: scheduledRecords.length,
      firstRunAt: new Date(startTimestamp).toISOString(),
    });
  } catch (error: any) {
    console.error('[EmailController] Scheduling error:', error);
    res.status(500).json({ error: 'Failed to schedule emails', details: error.message });
  }
}

export async function uploadLeadsFile(req: Request, res: Response): Promise<void> {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const foundEmails = new Set<string>();

    const fileStream = fs.createReadStream(file.path, { encoding: 'utf-8' });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      const matches = line.match(emailRegex);
      if (matches) {
        matches.forEach((email) => foundEmails.add(email.toLowerCase().trim()));
      }
    }

    // Clean up temporary upload file
    try {
      fs.unlinkSync(file.path);
    } catch {
      // Ignore temporary file unlink failure
    }

    const emails = Array.from(foundEmails);
    res.json({
      count: emails.length,
      emails,
    });
  } catch (error: any) {
    console.error('[EmailController] File parse error:', error);
    res.status(500).json({ error: 'Failed to parse file', details: error.message });
  }
}

export async function getScheduledEmails(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = (req.query.q as string) || '';
    const offset = (page - 1) * limit;

    if (search.trim()) {
      const searchRes = await searchEmails({
        query: search,
        limit,
        offset,
      });
      res.json({
        data: searchRes.emails.filter((e) => ['SCHEDULED', 'PENDING', 'PROCESSING', 'RATE_LIMITED'].includes(e.status)),
        total: searchRes.total,
        page,
        limit,
        source: searchRes.source,
      });
      return;
    }

    const where = {
      status: { in: ['SCHEDULED' as const, 'PENDING' as const, 'PROCESSING' as const, 'RATE_LIMITED' as const] },
    };

    const [total, emails] = await Promise.all([
      prisma.email.count({ where }),
      prisma.email.findMany({
        where,
        include: { sender: true },
        orderBy: { scheduledAt: 'asc' },
        skip: offset,
        take: limit,
      }),
    ]);

    res.json({
      data: emails,
      total,
      page,
      limit,
    });
  } catch (error: any) {
    console.error('[EmailController] Error getting scheduled emails:', error);
    res.status(500).json({ error: 'Failed to retrieve scheduled emails' });
  }
}

export async function getSentEmails(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = (req.query.q as string) || '';
    const offset = (page - 1) * limit;

    if (search.trim()) {
      const searchRes = await searchEmails({
        query: search,
        limit,
        offset,
      });
      res.json({
        data: searchRes.emails.filter((e) => ['SENT', 'FAILED'].includes(e.status)),
        total: searchRes.total,
        page,
        limit,
        source: searchRes.source,
      });
      return;
    }

    const where = {
      status: { in: ['SENT' as const, 'FAILED' as const] },
    };

    const [total, emails] = await Promise.all([
      prisma.email.count({ where }),
      prisma.email.findMany({
        where,
        include: { sender: true },
        orderBy: { sentAt: 'desc' },
        skip: offset,
        take: limit,
      }),
    ]);

    res.json({
      data: emails,
      total,
      page,
      limit,
    });
  } catch (error: any) {
    console.error('[EmailController] Error getting sent emails:', error);
    res.status(500).json({ error: 'Failed to retrieve sent emails' });
  }
}

export async function searchAllEmails(req: Request, res: Response): Promise<void> {
  try {
    const q = (req.query.q as string) || '';
    const status = req.query.status as any;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const results = await searchEmails({
      query: q,
      status,
      limit,
      offset,
    });

    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: 'Search failed', details: err.message });
  }
}

export async function cancelEmail(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;

    const email = await prisma.email.findUnique({
      where: { id },
    });

    if (!email) {
      res.status(404).json({ error: 'Email record not found' });
      return;
    }

    if (email.status === 'SENT') {
      res.status(400).json({ error: 'Cannot cancel an email that is already sent' });
      return;
    }

    // Remove from BullMQ queue
    if (email.jobId) {
      const job = await emailQueue.getJob(email.jobId);
      if (job) {
        await job.remove();
      }
    }

    await prisma.email.delete({
      where: { id },
    });

    res.json({ message: 'Scheduled email cancelled and deleted' });
  } catch (error: any) {
    console.error('[EmailController] Cancel error:', error);
    res.status(500).json({ error: 'Failed to cancel email' });
  }
}
