import React, { useState } from 'react';
import { SlackStatus } from '../types';
import {
  saveSlackWebhookApi,
  disconnectSlackApi,
  testSlackAlertApi,
} from '../api/client';
import {
  X,
  Send,
  CheckCircle2,
  AlertCircle,
  Link,
  Unlink,
  MessageSquare,
} from 'lucide-react';

interface SlackModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: SlackStatus | null;
  onStatusUpdated: () => void;
}

export const SlackModal: React.FC<SlackModalProps> = ({
  isOpen,
  onClose,
  status,
  onStatusUpdated,
}) => {
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl.trim().startsWith('https://hooks.slack.com/')) {
      setFeedback({
        type: 'error',
        message: 'Please enter a valid Slack incoming webhook URL (https://hooks.slack.com/...)',
      });
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      await saveSlackWebhookApi(webhookUrl.trim());
      setFeedback({
        type: 'success',
        message: 'Slack webhook configured and verified successfully!',
      });
      setWebhookUrl('');
      onStatusUpdated();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || 'Failed saving webhook',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      await disconnectSlackApi();
      setFeedback({
        type: 'success',
        message: 'Slack disconnected successfully.',
      });
      onStatusUpdated();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: 'Failed to disconnect Slack',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestNotification = async () => {
    setTesting(true);
    setFeedback(null);
    try {
      await testSlackAlertApi();
      setFeedback({
        type: 'success',
        message: 'Test message sent to Slack channel!',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || 'Failed sending test alert',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Slack Notifications</h2>
              <p className="text-xs text-slate-400">Real-time alerts when hourly rate limits hit</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Status Badge */}
          <div className="flex items-center justify-between p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
            <div>
              <span className="text-xs text-slate-400">Connection Status:</span>
              <p className="text-sm font-semibold text-white flex items-center space-x-1.5 mt-0.5">
                {status?.connected ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-emerald-400">Active (Ready for alerts)</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-slate-500" />
                    <span className="text-slate-400">Not Connected</span>
                  </>
                )}
              </p>
            </div>

            {status?.connected && (
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleTestNotification}
                  disabled={testing}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center space-x-1 transition shadow-sm"
                >
                  <Send className="w-3 h-3" />
                  <span>{testing ? 'Sending...' : 'Test Alert'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={saving}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                  title="Disconnect Slack"
                >
                  <Unlink className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {feedback && (
            <div
              className={`p-3 rounded-xl flex items-center space-x-2 text-xs border ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Connect Form */}
          <form onSubmit={handleSaveWebhook} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Incoming Webhook URL
              </label>
              <input
                type="url"
                placeholder="https://hooks.slack.com/services/T.../B.../..."
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Paste your Slack App Incoming Webhook URL here to receive instant rate limit notifications.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <a
                href="https://api.slack.com/apps"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-indigo-400 hover:underline flex items-center space-x-1"
              >
                <Link className="w-3 h-3" />
                <span>Create Slack App & Webhook</span>
              </a>

              <button
                type="submit"
                disabled={saving || !webhookUrl.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md transition"
              >
                {saving ? 'Connecting...' : 'Save & Connect'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
