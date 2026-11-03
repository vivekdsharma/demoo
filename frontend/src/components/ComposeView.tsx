import React, { useState, useRef, useEffect } from 'react';
import { Sender, ScheduleEmailPayload, EmailAttachment } from '../types';
import { uploadLeadsFileApi, scheduleEmailsApi } from '../api/client';
import {
  ArrowLeft,
  Paperclip,
  Clock,
  Upload,
  Undo,
  Redo,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  List,
  ListOrdered,
  Quote,
  Link2,
  X,
  Plus,
  Image as ImageIcon,
  AlertCircle,
} from 'lucide-react';

interface ComposeViewProps {
  onBack: () => void;
  senders: Sender[];
  onScheduledSuccess: () => void;
}

export const ComposeView: React.FC<ComposeViewProps> = ({
  onBack,
  senders,
  onScheduledSuccess,
}) => {
  const [selectedSenderId, setSelectedSenderId] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [manualEmailInput, setManualEmailInput] = useState<string>('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [delaySeconds, setDelaySeconds] = useState<number>(2);
  const [hourlyLimit, setHourlyLimit] = useState<number>(50);
  const [startTime, setStartTime] = useState<string>('');
  const [showSchedulePicker, setShowSchedulePicker] = useState<boolean>(false);
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);

  const [uploading, setUploading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageAttachmentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (senders.length > 0 && !selectedSenderId) {
      setSelectedSenderId(senders[0].id);
      setHourlyLimit(senders[0].hourlyLimit);
      setDelaySeconds(senders[0].delaySeconds);
    }

    // Default start time: now + 5 seconds (immediate demo)
    const now = new Date(Date.now() + 5000);
    const tzOffset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now.getTime() - tzOffset)
      .toISOString()
      .slice(0, 16);
    setStartTime(localISOTime);
  }, [senders, selectedSenderId]);

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

    try {
      const res = await uploadLeadsFileApi(file);
      const combined = Array.from(new Set([...recipients, ...res.emails]));
      setRecipients(combined);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || 'Failed parsing leads file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImageAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const content = uploadEvent.target?.result as string;
        if (content) {
          setAttachments((prev) => [
            ...prev,
            {
              filename: file.name,
              content,
              contentType: file.type || 'image/png',
              size: file.size,
            },
          ]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (imageAttachmentInputRef.current) {
      imageAttachmentInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (indexToRemove: number) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Helper to commit whatever email is typed into recipients array
  const commitManualEmail = (inputVal = manualEmailInput): string[] => {
    if (!inputVal.trim()) return recipients;
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const found = inputVal.match(emailRegex) || [];

    let updated = [...recipients];
    if (found.length > 0) {
      updated = Array.from(new Set([...updated, ...found.map((e) => e.toLowerCase().trim())]));
      setRecipients(updated);
      setManualEmailInput('');
      setErrorMessage(null);
    } else if (inputVal.includes('@')) {
      updated = Array.from(new Set([...updated, inputVal.toLowerCase().trim()]));
      setRecipients(updated);
      setManualEmailInput('');
      setErrorMessage(null);
    }
    return updated;
  };

  const handleRemoveRecipient = (email: string) => {
    setRecipients((prev) => prev.filter((r) => r !== email));
  };

  const handleScheduleSubmit = async () => {
    setErrorMessage(null);

    // Automatically commit any pending input
    const finalRecipients = commitManualEmail();

    if (finalRecipients.length === 0) {
      setErrorMessage('Please enter at least one valid recipient email address.');
      return;
    }

    if (!subject.trim()) {
      setErrorMessage('Subject line cannot be blank.');
      return;
    }

    if (!body.trim()) {
      setErrorMessage('Email message body cannot be blank.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: ScheduleEmailPayload = {
        senderId: selectedSenderId,
        recipients: finalRecipients,
        subject: subject.trim(),
        body: body.trim(),
        startTime: new Date(startTime).toISOString(),
        delayBetweenEmailsSeconds: delaySeconds,
        hourlyLimit,
        attachments: attachments.length > 0 ? attachments : undefined,
      };

      await scheduleEmailsApi(payload);
      onScheduledSuccess();
      onBack();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || 'Failed to schedule campaign');
    } finally {
      setSubmitting(false);
    }
  };

  const visibleChips = recipients.slice(0, 3);
  const extraCount = recipients.length - 3;

  return (
    <div className="flex-1 flex flex-col bg-white overflow-y-auto">
      {/* Top Header */}
      <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-sm z-20">
        <div className="flex items-center space-x-2.5">
          <button
            onClick={onBack}
            className="p-1 -ml-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-50 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-sm font-semibold text-slate-900">
            Compose New Email
          </h2>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-4">
          {/* Hidden image attachment picker */}
          <input
            ref={imageAttachmentInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx"
            multiple
            onChange={handleImageAttachmentUpload}
            className="hidden"
            id="image-file-attachment"
          />

          {/* Paperclip icon triggering user file upload */}
          <label
            htmlFor="image-file-attachment"
            className="relative text-slate-400 hover:text-slate-600 cursor-pointer p-1"
            title="Attach Photo or Document"
          >
            <Paperclip className={`w-4 h-4 ${attachments.length > 0 ? 'text-[#00a859]' : 'text-slate-400'}`} />
            {attachments.length > 0 && (
              <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 bg-[#00a859] text-white rounded-full text-[9px] flex items-center justify-center font-bold">
                {attachments.length}
              </span>
            )}
          </label>

          {/* Clock icon to toggle start time */}
          <button
            onClick={() => setShowSchedulePicker(!showSchedulePicker)}
            className={`p-1 rounded-md transition ${
              showSchedulePicker
                ? 'bg-[#eaf5ee] text-[#00a859]'
                : 'text-slate-400 hover:text-slate-600'
            }`}
            title="Set Scheduled Start Time"
          >
            <Clock className="w-4 h-4" />
          </button>

          {/* Send Later / Schedule button */}
          <button
            onClick={handleScheduleSubmit}
            disabled={submitting}
            className="px-5 py-2 rounded-full border border-[#00a859] text-[#00a859] hover:bg-[#eaf5ee] text-xs font-semibold transition flex items-center space-x-1.5 shadow-sm active:scale-98 disabled:opacity-50"
          >
            {submitting ? (
              <span>Scheduling...</span>
            ) : (
              <span>Send Later</span>
            )}
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="mx-8 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-100 flex items-center space-x-2 text-rose-700 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Start Time schedule popup banner if toggled */}
      {showSchedulePicker && (
        <div className="mx-8 mt-4 p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2.5 text-xs text-slate-700">
            <Clock className="w-4 h-4 text-[#00a859]" />
            <span className="font-semibold text-slate-900">Schedule Start Time:</span>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#00a859]"
            />
          </div>
          <button
            onClick={() => setShowSchedulePicker(false)}
            className="text-xs text-[#00a859] font-medium hover:underline"
          >
            Save Time
          </button>
        </div>
      )}

      {/* Form Fields Container */}
      <div className="p-8 space-y-4 max-w-4xl">
        {/* From Row */}
        <div className="flex items-center space-x-4 text-xs">
          <span className="w-16 text-slate-400 font-medium">From</span>
          <div className="relative">
            <select
              value={selectedSenderId}
              onChange={handleSenderChange}
              className="appearance-none bg-slate-50 border border-slate-200/80 rounded-lg px-3.5 py-1.5 pr-8 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-[#00a859] cursor-pointer"
            >
              {senders.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.email}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* To Row (Chips + Input + Upload List) */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            <span className="w-16 text-slate-400 font-medium flex-shrink-0">To</span>

            <div className="flex items-center flex-wrap gap-1.5 flex-1 min-w-0">
              {visibleChips.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#eaf5ee] text-[#00a859] text-xs font-medium border border-[#cbe8d4]"
                >
                  <span>{email}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveRecipient(email)}
                    className="hover:text-rose-600 transition ml-0.5 font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}

              {extraCount > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#eaf5ee] text-[#00a859] text-xs font-semibold">
                  +{extraCount}
                </span>
              )}

              <input
                type="text"
                placeholder={recipients.length === 0 ? "recipients@example.com (Type email, or Upload List)" : "add more..."}
                value={manualEmailInput}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.includes(',') || val.includes(';') || val.endsWith(' ')) {
                    commitManualEmail(val);
                  } else {
                    setManualEmailInput(val);
                  }
                }}
                onBlur={() => commitManualEmail()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitManualEmail();
                  }
                }}
                className="border-0 p-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none flex-1 min-w-[200px]"
              />
            </div>
          </div>

          {/* Upload List CTA */}
          <div className="flex-shrink-0 pl-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
              id="upload-leads-input"
            />
            <label
              htmlFor="upload-leads-input"
              className="cursor-pointer inline-flex items-center space-x-1.5 text-xs text-[#00a859] hover:text-[#008f4c] font-medium transition"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{uploading ? 'Parsing...' : 'Upload List'}</span>
            </label>
          </div>
        </div>

        {/* Subject Row */}
        <div className="flex items-center space-x-4 border-t border-slate-100 pt-3 text-xs">
          <span className="w-16 text-slate-400 font-medium flex-shrink-0">Subject</span>
          <input
            type="text"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full border-0 p-0 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-0 font-medium"
          />
        </div>

        {/* Throttling & Rate Limiting Controls Row */}
        <div className="flex items-center space-x-8 border-t border-slate-100 pt-3 text-xs text-slate-600">
          <div className="flex items-center space-x-2">
            <span>Delay between 2 emails</span>
            <input
              type="number"
              min="0"
              value={delaySeconds}
              onChange={(e) => setDelaySeconds(parseInt(e.target.value) || 0)}
              className="w-14 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-center text-xs text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-[#00a859]"
            />
            <span className="text-[11px] text-slate-400">sec</span>
          </div>

          <div className="flex items-center space-x-2">
            <span>Hourly Limit</span>
            <input
              type="number"
              min="1"
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(parseInt(e.target.value) || 1)}
              className="w-14 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-center text-xs text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-[#00a859]"
            />
            <span className="text-[11px] text-slate-400">/hr</span>
          </div>
        </div>

        {/* Rich Text Editor Box */}
        <div className="border border-slate-100 rounded-2xl bg-white shadow-sm mt-4 overflow-hidden">
          {/* Formatting Toolbar */}
          <div className="px-4 py-2.5 border-b border-slate-100 bg-[#fafafa] flex items-center space-x-3 text-slate-400 text-xs">
            <button type="button" className="hover:text-slate-700 transition" title="Undo">
              <Undo className="w-3.5 h-3.5" />
            </button>
            <button type="button" className="hover:text-slate-700 transition" title="Redo">
              <Redo className="w-3.5 h-3.5" />
            </button>
            <span className="text-slate-300 font-mono">|</span>
            <span className="font-semibold text-xs hover:text-slate-700 cursor-pointer">
              Tt
            </span>
            <button type="button" className="hover:text-slate-700 transition" title="Bold">
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button type="button" className="hover:text-slate-700 transition" title="Italic">
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button type="button" className="hover:text-slate-700 transition" title="Underline">
              <Underline className="w-3.5 h-3.5" />
            </button>
            <span className="text-slate-300 font-mono">|</span>
            <button type="button" className="hover:text-slate-700 transition" title="Align Left">
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button type="button" className="hover:text-slate-700 transition" title="Numbered List">
              <ListOrdered className="w-3.5 h-3.5" />
            </button>
            <button type="button" className="hover:text-slate-700 transition" title="Bulleted List">
              <List className="w-3.5 h-3.5" />
            </button>
            <button type="button" className="hover:text-slate-700 transition" title="Quote">
              <Quote className="w-3.5 h-3.5" />
            </button>
            <button type="button" className="hover:text-slate-700 transition" title="Insert Link">
              <Link2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Text Area */}
          <textarea
            rows={7}
            placeholder="Type Your Reply..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full p-4 border-0 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-0 resize-none leading-relaxed font-sans"
          />

          {/* User-Uploaded Attachments Preview Area (Dynamic, NOT Hardcoded!) */}
          <div className="px-4 pb-4 border-t border-slate-50 pt-3">
            {attachments.length > 0 ? (
              <div className="flex flex-wrap gap-3 items-center">
                {attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="relative group w-28 h-20 rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50"
                  >
                    {att.contentType?.startsWith('image/') || att.content.startsWith('data:image/') ? (
                      <img
                        src={att.content}
                        alt={att.filename}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-2 text-slate-500">
                        <ImageIcon className="w-6 h-6 text-slate-400 mb-1" />
                        <span className="text-[10px] truncate w-full text-center">{att.filename}</span>
                      </div>
                    )}

                    {/* Remove attachment button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(idx)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 hover:bg-rose-600 text-white flex items-center justify-center text-xs transition"
                      title="Remove attachment"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {/* Add more button */}
                <label
                  htmlFor="image-file-attachment"
                  className="w-20 h-20 rounded-xl border border-dashed border-slate-300 hover:border-[#00a859] flex flex-col items-center justify-center text-slate-400 hover:text-[#00a859] cursor-pointer transition text-[10px]"
                >
                  <Plus className="w-4 h-4 mb-0.5" />
                  <span>Add Photo</span>
                </label>
              </div>
            ) : (
              <label
                htmlFor="image-file-attachment"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-dashed border-slate-200 hover:border-[#00a859] text-slate-400 hover:text-[#00a859] text-xs cursor-pointer transition"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>+ Attach Photo / Image</span>
              </label>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
