export type EmailStatus =
  | 'PENDING'
  | 'SCHEDULED'
  | 'PROCESSING'
  | 'SENT'
  | 'FAILED'
  | 'RATE_LIMITED';

export interface EmailAttachment {
  filename: string;
  content: string; // Base64 data URL
  contentType?: string;
  size?: number;
}

export interface EmailJobData {
  emailId: string;
  senderId: string;
  senderEmail: string;
  senderName: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  retryCount?: number;
  batchId?: string;
  attachments?: EmailAttachment[];
}

export interface ScheduleEmailPayload {
  senderId: string;
  recipients: string[];
  subject: string;
  body: string;
  startTime: string; // ISO string
  delayBetweenEmailsSeconds?: number;
  hourlyLimit?: number;
  userId?: string;
  attachments?: EmailAttachment[];
}

export interface EmailSearchQuery {
  q?: string;
  status?: EmailStatus;
  senderId?: string;
  page?: number;
  limit?: number;
}
