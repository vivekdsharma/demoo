import React from 'react';
import { EmailItem } from '../types';
import { format } from 'date-fns';
import {
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
  Search,
  MailCheck,
} from 'lucide-react';

interface SentTableProps {
  emails: EmailItem[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onRefresh: () => void;
  searchSource?: string;
}

export const SentTable: React.FC<SentTableProps> = ({
  emails,
  loading,
  searchQuery,
  onSearchChange,
  onRefresh,
  searchSource,
}) => {
  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/90">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search sent emails (Elasticsearch)..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {searchSource && (
            <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hidden md:inline-block">
              Via {searchSource}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2 self-end sm:self-auto">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
            title="Refresh table"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/50 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Recipient</th>
              <th className="py-3 px-4">Subject</th>
              <th className="py-3 px-4">Sender</th>
              <th className="py-3 px-4">Dispatched At</th>
              <th className="py-3 px-4">Delivery Status</th>
              <th className="py-3 px-4 text-right">Ethereal Preview</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {loading ? (
              // Loading Skeleton
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-4 px-4"><div className="h-4 bg-slate-800 rounded w-36" /></td>
                  <td className="py-4 px-4"><div className="h-4 bg-slate-800 rounded w-48" /></td>
                  <td className="py-4 px-4"><div className="h-4 bg-slate-800 rounded w-28" /></td>
                  <td className="py-4 px-4"><div className="h-4 bg-slate-800 rounded w-32" /></td>
                  <td className="py-4 px-4"><div className="h-4 bg-slate-800 rounded w-20" /></td>
                  <td className="py-4 px-4 text-right"><div className="h-4 bg-slate-800 rounded w-24 ml-auto" /></td>
                </tr>
              ))
            ) : emails.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={6} className="py-12 text-center">
                  <div className="max-w-xs mx-auto flex flex-col items-center justify-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                      <MailCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-200">No sent emails yet</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {searchQuery ? 'No results matched your search.' : 'Dispatched emails will appear here with live preview links.'}
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              emails.map((email) => {
                const sentDate = email.sentAt ? new Date(email.sentAt) : new Date(email.createdAt);

                return (
                  <tr
                    key={email.id}
                    className="hover:bg-slate-800/40 transition group"
                  >
                    <td className="py-3.5 px-4 font-medium text-slate-200">
                      <div className="truncate max-w-[200px]" title={email.recipient}>
                        {email.recipient}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-300">
                      <div className="truncate max-w-[240px]" title={email.subject}>
                        {email.subject}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-400">
                      <span className="text-[11px] truncate max-w-[150px] block" title={email.sender?.email}>
                        {email.sender?.name || email.sender?.email || 'Default Sender'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-300">
                      <span>{format(sentDate, 'MMM d, yyyy h:mm:ss a')}</span>
                    </td>

                    <td className="py-3.5 px-4">
                      {email.status === 'SENT' ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Sent</span>
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20"
                          title={email.failedReason || 'Failed to send'}
                        >
                          <XCircle className="w-3 h-3 text-rose-400" />
                          <span>Failed</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {email.etherealPreviewUrl ? (
                        <a
                          href={email.etherealPreviewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-indigo-200 border border-indigo-500/20 transition text-xs font-medium"
                          title="Open fake SMTP preview in Ethereal"
                        >
                          <span>Preview</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-500">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
