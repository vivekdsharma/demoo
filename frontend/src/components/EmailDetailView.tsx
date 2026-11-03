import React from 'react';
import { EmailItem } from '../types';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Star,
  Archive,
  Trash2,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';

interface EmailDetailViewProps {
  email: EmailItem;
  onBack: () => void;
  onDelete: (id: string) => void;
}

export const EmailDetailView: React.FC<EmailDetailViewProps> = ({
  email,
  onBack,
  onDelete,
}) => {
  const schedOrSentDate = email.sentAt
    ? new Date(email.sentAt)
    : new Date(email.scheduledAt);

  const senderInitial = (email.sender?.name || email.sender?.email || 'A')[0].toUpperCase();

  return (
    <div className="flex-1 flex flex-col bg-white overflow-y-auto">
      {/* Top Action Header */}
      <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center space-x-3 min-w-0">
          <button
            onClick={onBack}
            className="p-1.5 -ml-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-50 transition"
            title="Back to list"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-base font-semibold text-slate-900 truncate">
            {email.subject}
          </h2>
        </div>

        <div className="flex items-center space-x-4 text-slate-400">
          <button type="button" className="hover:text-amber-400 transition" title="Star">
            <Star className="w-4 h-4" />
          </button>
          <button type="button" className="hover:text-slate-600 transition" title="Archive">
            <Archive className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(email.id)}
            className="hover:text-rose-500 transition"
            title="Delete email"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Email Content Container */}
      <div className="p-8 max-w-4xl">
        {/* Sender Info Row */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-full bg-[#00a859] text-white font-bold flex items-center justify-center text-sm shadow-sm">
              {senderInitial}
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-sm font-semibold text-slate-900">
                  {email.sender?.name || 'Amanda Clark'}
                </span>
                <span className="text-xs text-slate-400">
                  &lt;{email.sender?.email || 'sender@example.com'}&gt;
                </span>
              </div>
              <div className="flex items-center space-x-1 text-xs text-slate-400 mt-0.5">
                <span>to {email.recipient}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-400 font-normal">
            {format(schedOrSentDate, 'MMM d, h:mm a')}
          </div>
        </div>

        {/* Ethereal Fake SMTP Preview Banner if Sent */}
        {email.etherealPreviewUrl && (
          <div className="mb-6 p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
            <span className="text-xs text-emerald-800 font-medium">
              Fake SMTP Ethereal preview is available for this email.
            </span>
            <a
              href={email.etherealPreviewUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-[#00a859] hover:bg-[#00924c] text-white text-xs font-semibold shadow-sm transition"
            >
              <span>View Ethereal Preview</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Email Body */}
        <div
          className="text-slate-800 text-xs sm:text-sm leading-relaxed prose max-w-none mb-10"
          dangerouslySetInnerHTML={{ __html: email.body }}
        />

        {/* Attachments / Thumbnails Preview (matching Figma screenshot) */}
        <div className="border-t border-slate-100 pt-6">
          <p className="text-xs font-semibold text-slate-500 mb-3">Attachments</p>
          <div className="flex flex-wrap gap-4">
            <div className="w-48 bg-slate-50 border border-slate-100 rounded-xl p-2.5">
              <div className="w-full h-24 bg-slate-200 rounded-lg overflow-hidden mb-2 relative">
                <img
                  src="https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=300"
                  alt="Tennis Coach Profile"
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-xs font-medium text-slate-800 truncate">Tennis_Coach_Profile.png</p>
              <p className="text-[10px] text-slate-400">1.2 MB</p>
            </div>

            <div className="w-48 bg-slate-50 border border-slate-100 rounded-xl p-2.5">
              <div className="w-full h-24 bg-slate-200 rounded-lg overflow-hidden mb-2 relative">
                <img
                  src="https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300"
                  alt="Tennis Coach Profile 2"
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-xs font-medium text-slate-800 truncate">Tennis_Coach_Profile2.png</p>
              <p className="text-[10px] text-slate-400">1.2 MB</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
