import React from 'react';
import { EmailItem } from '../types';
import { format } from 'date-fns';
import { Search, Filter, RefreshCw, Star, Clock } from 'lucide-react';

interface EmailListViewProps {
  type: 'scheduled' | 'sent';
  emails: EmailItem[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRefresh: () => void;
  onSelectEmail: (email: EmailItem) => void;
}

export const EmailListView: React.FC<EmailListViewProps> = ({
  type,
  emails,
  loading,
  searchQuery,
  onSearchChange,
  onRefresh,
  onSelectEmail,
}) => {
  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Top Search & Toolbar */}
      <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-xl">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-[#f4f5f7] border-0 rounded-full pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00a859]"
          />
        </div>

        <div className="flex items-center space-x-3 text-slate-400">
          <button
            type="button"
            className="p-1.5 hover:text-slate-600 transition"
            title="Filter"
          >
            <Filter className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onRefresh}
            className="p-1.5 hover:text-slate-600 transition"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Email List Rows */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {loading ? (
          <div className="p-8 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse flex items-center space-x-4">
                <div className="h-4 bg-slate-100 rounded w-28" />
                <div className="h-4 bg-slate-100 rounded w-24" />
                <div className="h-4 bg-slate-100 rounded flex-1" />
                <div className="h-4 bg-slate-100 rounded w-4" />
              </div>
            ))}
          </div>
        ) : emails.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <p className="text-sm font-medium">No {type} emails</p>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery
                ? 'No matching results found.'
                : `Your ${type} messages will be listed here.`}
            </p>
          </div>
        ) : (
          emails.map((email) => {
            const schedDate = new Date(email.scheduledAt);

            // Clean snippet
            const cleanBody = email.body.replace(/<[^>]*>?/gm, '').trim();
            const recipientLabel = email.recipient.split('@')[0];

            return (
              <div
                key={email.id}
                onClick={() => onSelectEmail(email)}
                className="px-8 py-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition text-xs group"
              >
                <div className="flex items-center space-x-4 min-w-0 flex-1 pr-6">
                  {/* Recipient */}
                  <span className="font-semibold text-slate-900 w-32 truncate flex-shrink-0">
                    To: {recipientLabel}
                  </span>

                  {/* Status Pill Badge */}
                  {type === 'scheduled' ? (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#fff3e0] text-[#e65100] flex-shrink-0">
                      <Clock className="w-3 h-3 text-[#e65100]" />
                      <span>{format(schedDate, 'EEE h:mm:ss a')}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#f1f5f9] text-slate-600 flex-shrink-0">
                      Sent
                    </span>
                  )}

                  {/* Subject and Preview Text */}
                  <div className="truncate min-w-0">
                    <span className="font-semibold text-slate-900">
                      {email.subject}
                    </span>
                    {type === 'scheduled' && (
                      <span className="text-slate-500 font-medium"> - Scheduled</span>
                    )}
                    <span className="text-slate-400 font-normal"> - {cleanBody}</span>
                  </div>
                </div>

                {/* Right Star Action */}
                <div className="flex-shrink-0 text-slate-300 group-hover:text-slate-400">
                  <Star className="w-4 h-4 hover:text-amber-400 transition" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
