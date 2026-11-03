import axios from 'axios';
import {
  EmailItem,
  Sender,
  DashboardStats,
  ScheduleEmailPayload,
  SlackStatus,
  User,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function fetchScheduledEmails(page = 1, limit = 50, q = ''): Promise<{ data: EmailItem[]; total: number; source?: string }> {
  const res = await apiClient.get('/emails/scheduled', {
    params: { page, limit, q: q.trim() || undefined },
  });
  return res.data;
}

export async function fetchSentEmails(page = 1, limit = 50, q = ''): Promise<{ data: EmailItem[]; total: number; source?: string }> {
  const res = await apiClient.get('/emails/sent', {
    params: { page, limit, q: q.trim() || undefined },
  });
  return res.data;
}

export async function scheduleEmailsApi(payload: ScheduleEmailPayload): Promise<{ message: string; count: number; batchId: string }> {
  const res = await apiClient.post('/emails/schedule', payload);
  return res.data;
}

export async function uploadLeadsFileApi(file: File): Promise<{ count: number; emails: string[] }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await apiClient.post('/emails/upload-leads', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function cancelEmailApi(id: string): Promise<void> {
  await apiClient.delete(`/emails/${id}`);
}

export async function fetchSenders(): Promise<Sender[]> {
  const res = await apiClient.get('/senders');
  return res.data.data;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await apiClient.get('/stats');
  return res.data;
}

export async function fetchSlackStatus(): Promise<SlackStatus> {
  const res = await apiClient.get('/slack/status');
  return res.data;
}

export async function saveSlackWebhookApi(webhookUrl: string): Promise<void> {
  await apiClient.post('/slack/webhook', { webhookUrl });
}

export async function disconnectSlackApi(): Promise<void> {
  await apiClient.delete('/slack/disconnect');
}

export async function testSlackAlertApi(): Promise<void> {
  await apiClient.post('/slack/test');
}

export async function googleLoginApi(credential?: string, email?: string, name?: string, avatar?: string): Promise<User> {
  const res = await apiClient.post('/auth/google', { credential, email, name, avatar });
  return res.data.user;
}

export async function fetchCurrentUser(): Promise<User> {
  const res = await apiClient.get('/auth/me');
  return res.data.user;
}
