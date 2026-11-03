import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { config } from '../config/env.js';
import { sendSlackTestMessage } from '../services/slack.service.js';

export async function getSlackAuthUrl(_req: Request, res: Response): Promise<void> {
  const clientId = config.slack.clientId;
  const redirectUri = encodeURIComponent(config.slack.redirectUri);
  const scope = encodeURIComponent('chat:write,incoming-webhook');

  if (!clientId) {
    res.json({
      configured: false,
      message: 'Slack OAuth client credentials not set in .env. You can connect using an Incoming Webhook URL.',
    });
    return;
  }

  const url = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scope}&redirect_uri=${redirectUri}`;
  res.json({ configured: true, url });
}

export async function handleSlackCallback(req: Request, res: Response): Promise<void> {
  const code = req.query.code as string;

  if (!code) {
    res.redirect(`${config.frontendUrl}?slack_error=missing_code`);
    return;
  }

  try {
    const params = new URLSearchParams();
    params.append('client_id', config.slack.clientId);
    params.append('client_secret', config.slack.clientSecret);
    params.append('code', code);
    params.append('redirect_uri', config.slack.redirectUri);

    const tokenRes = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const data = (await tokenRes.json()) as any;

    if (!data.ok) {
      console.error('[SlackOAuth] Error exchanging code:', data.error);
      res.redirect(`${config.frontendUrl}?slack_error=${encodeURIComponent(data.error)}`);
      return;
    }

    // Save tokens to active user
    const user = await prisma.user.findFirst();
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          slackAccessToken: data.access_token,
          slackChannel: data.incoming_webhook?.channel || data.authed_user?.id,
          slackWebhookUrl: data.incoming_webhook?.url || null,
        },
      });
    }

    res.redirect(`${config.frontendUrl}?slack_connected=true`);
  } catch (error) {
    console.error('[SlackOAuth] Exception in OAuth callback:', error);
    res.redirect(`${config.frontendUrl}?slack_error=internal_error`);
  }
}

export async function saveSlackWebhook(req: Request, res: Response): Promise<void> {
  try {
    const { webhookUrl, userId } = req.body;

    if (!webhookUrl || !webhookUrl.startsWith('https://hooks.slack.com/')) {
      res.status(400).json({ error: 'Valid Slack Incoming Webhook URL required' });
      return;
    }

    const user = userId
      ? await prisma.user.findUnique({ where: { id: userId } })
      : await prisma.user.findFirst();

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          slackWebhookUrl: webhookUrl.trim(),
        },
      });
    }

    // Send instant test notification
    try {
      await sendSlackTestMessage(webhookUrl.trim());
    } catch {
      // Ignored if test message fails, webhook is still stored
    }

    res.json({ message: 'Slack webhook connected successfully', connected: true });
  } catch (error: any) {
    console.error('[SlackController] Error saving webhook:', error);
    res.status(500).json({ error: 'Failed to save Slack webhook' });
  }
}

export async function disconnectSlack(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.body;
    const user = userId
      ? await prisma.user.findUnique({ where: { id: userId } })
      : await prisma.user.findFirst();

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          slackWebhookUrl: null,
          slackAccessToken: null,
          slackChannel: null,
        },
      });
    }

    res.json({ message: 'Slack integration disconnected', connected: false });
  } catch (error) {
    console.error('[SlackController] Disconnect error:', error);
    res.status(500).json({ error: 'Failed to disconnect Slack' });
  }
}

export async function getSlackStatus(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.query.userId as string;
    const user = userId
      ? await prisma.user.findUnique({ where: { id: userId } })
      : await prisma.user.findFirst();

    const isConnected = Boolean(
      user?.slackWebhookUrl || user?.slackAccessToken || config.slack.defaultWebhook
    );

    res.json({
      connected: isConnected,
      channel: user?.slackChannel || 'Default Channel',
      hasWebhook: Boolean(user?.slackWebhookUrl || config.slack.defaultWebhook),
      hasOAuth: Boolean(user?.slackAccessToken),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve Slack status' });
  }
}

export async function testSlackAlert(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.body;
    const user = userId
      ? await prisma.user.findUnique({ where: { id: userId } })
      : await prisma.user.findFirst();

    const webhook = user?.slackWebhookUrl || config.slack.defaultWebhook;
    const token = user?.slackAccessToken || undefined;
    const channel = user?.slackChannel || undefined;

    if (!webhook && !token) {
      res.status(400).json({ error: 'No Slack connection found. Please connect Slack first.' });
      return;
    }

    await sendSlackTestMessage(webhook || undefined, token, channel);
    res.json({ message: 'Live Slack test notification successfully dispatched!' });
  } catch (err: any) {
    console.error('[SlackController] Test message failed:', err);
    res.status(500).json({ error: 'Failed sending test alert', details: err.message });
  }
}
