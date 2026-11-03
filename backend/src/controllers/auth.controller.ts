import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';

export async function googleLogin(req: Request, res: Response): Promise<void> {
  try {
    const { email, name, avatar, googleId, credential } = req.body;

    let userEmail = email;
    let userName = name;
    let userAvatar = avatar;
    let userGoogleId = googleId;

    // Decode Google JWT if credential provided directly from GIS button
    if (credential) {
      try {
        const payloadBase64 = credential.split('.')[1];
        const decodedJson = Buffer.from(payloadBase64, 'base64').toString('utf-8');
        const payload = JSON.parse(decodedJson);

        userEmail = payload.email;
        userName = payload.name;
        userAvatar = payload.picture;
        userGoogleId = payload.sub;
      } catch (err) {
        console.warn('[AuthController] Failed parsing credential token:', err);
      }
    }

    if (!userEmail) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const user = await prisma.user.upsert({
      where: { email: userEmail.toLowerCase().trim() },
      create: {
        email: userEmail.toLowerCase().trim(),
        name: userName || 'ReachInbox User',
        avatar: userAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userName || userEmail)}`,
        googleId: userGoogleId || `google_${Date.now()}`,
      },
      update: {
        name: userName || undefined,
        avatar: userAvatar || undefined,
        googleId: userGoogleId || undefined,
      },
    });

    res.json({
      message: 'Authentication successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        hasSlack: Boolean(user.slackWebhookUrl || user.slackAccessToken),
      },
    });
  } catch (error: any) {
    console.error('[AuthController] Google login error:', error);
    res.status(500).json({ error: 'Authentication failed', details: error.message });
  }
}

export async function getCurrentUser(_req: Request, res: Response): Promise<void> {
  try {
    const user = await prisma.user.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    if (!user) {
      res.status(404).json({ error: 'No active session' });
      return;
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        hasSlack: Boolean(user.slackWebhookUrl || user.slackAccessToken),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
}
