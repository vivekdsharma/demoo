import React, { useState, useRef, useEffect } from 'react';
import { Sender, ScheduleEmailPayload } from '../types';
import { uploadLeadsFileApi, scheduleEmailsApi } from '../api/client';
import {
  X,
  Upload,
  Clock,
  Gauge,
  Send,
  FileText,
  AlertCircle,
  CheckCircle2,
  Trash2,
} from 'lucide-react';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  senders: Sender[];
  onScheduledSuccess: () => void;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  senders,
  onScheduledSuccess,
}) => {
  const [selectedSenderId, setSelectedSenderId] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [manualEmailInput, setManualEmailInput] = useState<string>('');
  const [detectedEmails, setDetectedEmails] = useState<string[]>([]);
  const [startTime, setStartTime] = useState<string>('');
  const [delaySeconds, setDelaySeconds] = useState<number>(2);
  const [hourlyLimit, setHourlyLimit] = useState<number>(50);

  const [uploading, setUploading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize defaults
  useEffect(() => {
    if (senders.length > 0 && !selectedSenderId) {
      setSelectedSenderId(senders[0].id);
      setHourlyLimit(senders[0].hourlyLimit);
      setDelaySeconds(senders[0].delaySeconds);
    }

    // Default start time: 1 minute from now
    const nextMinute = new Date(Date.now() + 60000);
    // Format to datetime-local string YYYY-MM-DDTHH:mm
    const tzOffset = nextMinute.getTimezoneOffset() * 60000;
    const localISOTime = new Date(nextMinute.getTime() - tzOffset).toISOString().slice(0, 16);
    setStartTime(localISOTime);
  }, [senders, selectedSenderId, isOpen]);

  if (!isOpen) return null;

  const handleSenderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedSenderId(id);
    const chosen = senders.find((s) => s.id === id);
    if (chosen) {
      setHourlyLimit(chosen.hourlyLimit);
      setDelaySeconds(chosen.delaySeconds);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrorMessage(null);
    setFileName(file.name);

    try {
      const res = await uploadLeadsFileApi(file);
      // Merge with existing
      const combined = Array.from(new Set([...detectedEmails, ...res.emails]));
      setDetectedEmails(combined);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || 'Failed parsing leads file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddManualEmail = () => {
    if (!manualEmailInput.trim()) return;

    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const found = manualEmailInput.match(emailRegex) || [];

    if (found.length === 0) {
      setErrorMessage('Please enter valid email address(es)');
      return;
    }

    const combined = Array.from(new Set([...detectedEmails, ...found.map((e) => e.toLowerCase())]));
    setDetectedEmails(combined);
    setManualEmailInput('');
    setErrorMessage(null);
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setDetectedEmails((prev) => prev.filter((e) => e !== emailToRemove));
  };

  const handleClearAllLeads = () => {
    setDetectedEmails([]);
    setFileName(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (detectedEmails.length === 0) {
      setErrorMessage('Please upload a file or add at least one recipient email.');
      return;
    }

    if (!subject.trim()) {
      setErrorMessage('Please enter an email subject.');
      return;
    }

    if (!body.trim()) {
      setErrorMessage('Please enter an email body.');
      return;
    }

    if (!selectedSenderId) {
      setErrorMessage('Please choose a sender.');
      return;
    }

    setSubmitting(true);

    try {
      const payload: ScheduleEmailPayload = {
        senderId: selectedSenderId,
        recipients: detectedEmails,
        subject: subject.trim(),
        body: body.trim(),
        startTime: new Date(startTime).toISOString(),
        delayBetweenEmailsSeconds: delaySeconds,
        hourlyLimit,
      };

      await scheduleEmailsApi(payload);
      onScheduledSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || err.message || 'Scheduling failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Compose & Schedule Email</h2>
              <p className="text-xs text-slate-400">Distribute cold outreach with BullMQ rate limits</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center space-x-2 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Sender Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Sender Account (Multi-Sender Support)
            </label>
            <select
              value={selectedSenderId}
              onChange={handleSenderChange}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            >
              {senders.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.email}) — Hourly Cap: {s.hourlyLimit}/hr, Delay: {s.delaySeconds}s
                </option>
              ))}
            </select>
          </div>

          {/* Lead Upload & Detection */}
          <div className="border border-dashed border-slate-700 rounded-xl p-4 bg-slate-950/40">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>Upload Leads (CSV / TXT)</span>
              </label>

              {detectedEmails.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllLeads}
                  className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center space-x-1 transition"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear All</span>
                </button>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
                id="leads-file-upload"
              />
              <label
                htmlFor="leads-file-upload"
                className="cursor-pointer inline-flex items-center space-x-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 transition"
              >
                <Upload className="w-3.5 h-3.5 text-indigo-400" />
                <span>{uploading ? 'Parsing File...' : 'Choose CSV or Text File'}</span>
              </label>

              {fileName && (
                <span className="text-xs text-slate-400 truncate max-w-xs">{fileName}</span>
              )}
            </div>

            {/* Quick manual input */}
            <div className="mt-3 flex space-x-2">
              <input
                type="text"
                placeholder="Or paste email address(es) separated by commas..."
                value={manualEmailInput}
                onChange={(e) => setManualEmailInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddManualEmail();
                  }
                }}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddManualEmail}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-medium rounded-lg border border-slate-700 transition"
              >
                Add
              </button>
            </div>

            {/* Detected count badge & preview pills */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-400">Detected Recipients:</span>
                <span
                  className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                    detectedEmails.length > 0
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {detectedEmails.length} email{detectedEmails.length === 1 ? '' : 's'} detected
                </span>
              </div>

              {detectedEmails.length > 0 && (
                <div className="max-h-24 overflow-y-auto flex flex-wrap gap-1.5 p-2 bg-slate-900/60 rounded-lg border border-slate-800/80">
                  {detectedEmails.map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-800 text-[11px] text-slate-300 border border-slate-700/60"
                    >
                      <span className="truncate max-w-[180px]">{email}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveEmail(email)}
                        className="hover:text-rose-400 transition"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Subject Line */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Subject Line
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Quick question regarding your cold email pipeline"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>

          {/* Email Body */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Message Body (HTML or Plain Text)
            </label>
            <textarea
              required
              rows={4}
              placeholder="Write your email copy here... HTML formatting supported."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none font-mono"
            />
          </div>

          {/* Scheduling & Rate Limiting Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
            {/* Start Time */}
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1 flex items-center space-x-1">
                <Clock className="w-3 h-3 text-indigo-400" />
                <span>Start Time</span>
              </label>
              <input
                type="datetime-local"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Delay between each email */}
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1 flex items-center space-x-1">
                <Gauge className="w-3 h-3 text-indigo-400" />
                <span>Delay Between Sends</span>
              </label>
              <div className="flex items-center space-x-1.5">
                <input
                  type="number"
                  min="0"
                  max="300"
                  value={delaySeconds}
                  onChange={(e) => setDelaySeconds(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-[11px] text-slate-400">sec</span>
              </div>
            </div>

            {/* Hourly Rate Limit */}
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1 flex items-center space-x-1">
                <Gauge className="w-3 h-3 text-amber-400" />
                <span>Hourly Limit</span>
              </label>
              <div className="flex items-center space-x-1.5">
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={hourlyLimit}
                  onChange={(e) => setHourlyLimit(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-[11px] text-slate-400">/hr</span>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            {detectedEmails.length > 0 && (
              <span>
                Total campaign duration: ~
                {Math.round((detectedEmails.length * delaySeconds) / 60)} min
              </span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || detectedEmails.length === 0}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition transform active:scale-95"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Scheduling Jobs...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Schedule {detectedEmails.length} Email{detectedEmails.length === 1 ? '' : 's'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
