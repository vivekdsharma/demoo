import React from 'react';
import { EmailItem } from '../types';
import { format } from 'date-fns';
import {
  Clock,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Search,
  Calendar,
} from 'lucide-react';

interface ScheduledTableProps {
  emails: EmailItem[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onCancelEmail: (id: string) => Promise<void>;
  onRefresh: () => void;
  searchSource?: string;
}

export const ScheduledTable: React.FC<ScheduledTableProps> = ({
  emails,
  loading,
  searchQuery,
  onSearchChange,
  onCancelEmail,
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
              placeholder="Search scheduled emails (Elasticsearch)..."
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
              <th className="py-3 px-4">Scheduled For</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
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
                  <td className="py-4 px-4 text-right"><div className="h-4 bg-slate-800 rounded w-8 ml-auto" /></td>
                </tr>
              ))
            ) : emails.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={6} className="py-12 text-center">
                  <div className="max-w-xs mx-auto flex flex-col items-center justify-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-200">No scheduled emails</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {searchQuery ? 'No results matched your search.' : 'Compose your first email campaign above.'}
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              emails.map((email) => {
                const schedDate = new Date(email.scheduledAt);
                const isOverdue = schedDate.getTime() < Date.now();

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
                      <div className="flex items-center space-x-1.5 text-xs">
                        <Clock className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                        <span>
                          {format(schedDate, 'MMM d, yyyy h:mm:ss a')}
                        </span>
                      </div>
                      {isOverdue && email.status === 'SCHEDULED' && (
                        <span className="text-[10px] text-amber-400 mt-0.5 block">
                          Executing queue cycle...
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {email.status === 'RATE_LIMITED' ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                          <span>Rate Limited (Retrying)</span>
                        </span>
                      ) : email.status === 'PROCESSING' ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                          <span>Sending Now</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          <span>Scheduled</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onCancelEmail(email.id)}
                        className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition opacity-80 group-hover:opacity-100"
                        title="Cancel this scheduled send"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
