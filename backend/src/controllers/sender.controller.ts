import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { redisClient } from '../config/redis.js';
import { getCurrentHourWindow } from '../services/rateLimiter.service.js';
import { z } from 'zod';

const createSenderSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid sender email is required'),
  hourlyLimit: z.number().min(1).default(50),
  delaySeconds: z.number().min(0).default(2),
});

export async function getSenders(_req: Request, res: Response): Promise<void> {
  try {
    const senders = await prisma.sender.findMany({
      orderBy: { createdAt: 'asc' },
    });

    const { windowKey } = getCurrentHourWindow();

    // Fetch current hourly usage counters from Redis for all senders
    const sendersWithStats = await Promise.all(
      senders.map(async (sender) => {
        const redisKey = `ratelimit:sender:${sender.id}:${windowKey}`;
        const countStr = await redisClient.get(redisKey);
        const currentHourSent = countStr ? parseInt(countStr, 10) : 0;

        return {
          ...sender,
          currentHourSent,
          remainingHourlyQuota: Math.max(0, sender.hourlyLimit - currentHourSent),
        };
      })
    );

    res.json({ data: sendersWithStats });
  } catch (error) {
    console.error('[SenderController] Error getting senders:', error);
    res.status(500).json({ error: 'Failed to retrieve senders' });
  }
}

export async function createSender(req: Request, res: Response): Promise<void> {
  try {
    const parsed = createSenderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { name, email, hourlyLimit, delaySeconds } = parsed.data;

    const existing = await prisma.sender.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existing) {
      res.status(409).json({ error: 'A sender with this email already exists' });
      return;
    }

    const sender = await prisma.sender.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        hourlyLimit,
        delaySeconds,
      },
    });

    res.status(201).json({ data: sender });
  } catch (error: any) {
    console.error('[SenderController] Error creating sender:', error);
    res.status(500).json({ error: 'Failed to create sender', details: error.message });
  }
}

export async function updateSender(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { name, hourlyLimit, delaySeconds } = req.body;

    const sender = await prisma.sender.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        hourlyLimit: hourlyLimit !== undefined ? Number(hourlyLimit) : undefined,
        delaySeconds: delaySeconds !== undefined ? Number(delaySeconds) : undefined,
      },
    });

    res.json({ data: sender });
  } catch (error: any) {
    console.error('[SenderController] Error updating sender:', error);
    res.status(500).json({ error: 'Failed to update sender' });
  }
}
