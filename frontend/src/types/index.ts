export type EmailStatus =
  | 'PENDING'
  | 'SCHEDULED'
  | 'PROCESSING'
  | 'SENT'
  | 'FAILED'
  | 'RATE_LIMITED';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string;
  hasSlack: boolean;
}

export interface Sender {
  id: string;
  name: string;
  email: string;
  hourlyLimit: number;
  delaySeconds: number;
  currentHourSent: number;
  remainingHourlyQuota: number;
}

export interface EmailItem {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  status: EmailStatus;
  scheduledAt: string;
  sentAt?: string | null;
  failedReason?: string | null;
  etherealMessageId?: string | null;
  etherealPreviewUrl?: string | null;
  jobId?: string | null;
  retryCount: number;
  batchId?: string | null;
  senderId: string;
  sender?: Sender;
  createdAt: string;
}

export interface DashboardStats {
  database: {
    scheduled: number;
    sent: number;
    failed: number;
    rateLimited: number;
    totalSenders: number;
  };
  queue: {
    waiting: number;
    active: number;
    delayed: number;
    completed: number;
    failed: number;
  };
  elasticsearch: {
    connected: boolean;
  };
}

export interface ScheduleEmailPayload {
  senderId: string;
  recipients: string[];
  subject: string;
  body: string;
  startTime: string;
  delayBetweenEmailsSeconds: number;
  hourlyLimit: number;
  userId?: string;
}

export interface SlackStatus {
  connected: boolean;
  channel: string;
  hasWebhook: boolean;
  hasOAuth: boolean;
}
