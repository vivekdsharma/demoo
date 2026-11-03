import { WebClient } from '@slack/web-api';
import { prisma } from '../config/prisma.js';
import { config } from '../config/env.js';

export interface SlackNotificationPayload {
  senderEmail: string;
  senderName: string;
  hourlyLimit: number;
  currentCount: number;
  nextWindowTime: Date;
  userId?: string | null;
}

export async function sendSlackRateLimitAlert(data: SlackNotificationPayload): Promise<boolean> {
  const user = data.userId
    ? await prisma.user.findUnique({ where: { id: data.userId } })
    : await prisma.user.findFirst({
        where: {
          OR: [
            { slackWebhookUrl: { not: null } },
            { slackAccessToken: { not: null } },
          ],
        },
      });

  const webhookUrl = user?.slackWebhookUrl || config.slack.defaultWebhook;
  const accessToken = user?.slackAccessToken;
  const channel = user?.slackChannel;

  if (!webhookUrl && !accessToken) {
    return false;
  }

  const messageText = `⚠️ Rate limit reached for sender ${data.senderEmail}! Cap of ${data.hourlyLimit} emails/hour reached. Next batch scheduled at ${data.nextWindowTime.toLocaleTimeString()}.`;

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '🚨 Sender Hourly Rate Limit Exceeded',
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Sender:*\n${data.senderName} (${data.senderEmail})`,
        },
        {
          type: 'mrkdwn',
          text: `*Hourly Cap:*\n${data.hourlyLimit} emails / hour`,
        },
        {
          type: 'mrkdwn',
          text: `*Current Window Sent:*\n${data.currentCount} emails`,
        },
        {
          type: 'mrkdwn',
          text: `*Next Sending Window:*\n${data.nextWindowTime.toLocaleTimeString()} (${data.nextWindowTime.toLocaleDateString()})`,
        },
      ],
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: '🔄 Remaining jobs are safely postponed to the next window. No emails are dropped.',
        },
      ],
    },
  ];

  try {
    if (webhookUrl) {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: messageText,
          blocks,
        }),
      });

      if (!response.ok) {
        console.warn(`[Slack] Webhook returned status ${response.status}`);
        return false;
      }
      console.log(`[Slack] Rate limit alert sent via webhook for ${data.senderEmail}`);
      return true;
    }

    if (accessToken && channel) {
      const client = new WebClient(accessToken);
      await client.chat.postMessage({
        channel,
        text: messageText,
        blocks,
      });
      console.log(`[Slack] Rate limit alert sent via Web API for ${data.senderEmail}`);
      return true;
    }
  } catch (error) {
    console.error('[Slack] Failed to dispatch Slack alert:', error);
    return false;
  }

  return false;
}

export async function sendSlackTestMessage(targetWebhookUrl?: string, targetToken?: string, targetChannel?: string): Promise<boolean> {
  const webhookUrl = targetWebhookUrl || config.slack.defaultWebhook;

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: ' ReachInbox Email Scheduler Connected!',
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'This is a test notification confirming your Slack connection is active. You will receive live alerts whenever an email sender hits their configured hourly quota.',
      },
    },
  ];

  try {
    if (webhookUrl) {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'ReachInbox Slack integration active.',
          blocks,
        }),
      });
      return response.ok;
    }

    if (targetToken && targetChannel) {
      const client = new WebClient(targetToken);
      await client.chat.postMessage({
        channel: targetChannel,
        text: 'ReachInbox Slack integration active.',
        blocks,
      });
      return true;
    }
  } catch (err) {
    console.error('[Slack] Test notification error:', err);
    throw err;
  }

  throw new Error('No Slack webhook or credentials provided');
}
