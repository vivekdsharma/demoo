import React from 'react';
import { DashboardStats } from '../types';
import { Calendar, CheckCircle, AlertTriangle, Cpu, Search } from 'lucide-react';

interface StatsCardsProps {
  stats: DashboardStats | null;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {/* Scheduled */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Scheduled / Pending</span>
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-white">
            {stats ? stats.database.scheduled : '—'}
          </span>
          <span className="text-[11px] text-slate-400">queued</span>
        </div>
      </div>

      {/* Sent */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Delivered (Sent)</span>
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <CheckCircle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-emerald-400">
            {stats ? stats.database.sent : '—'}
          </span>
          <span className="text-[11px] text-slate-400">via Ethereal</span>
        </div>
      </div>

      {/* Rate Limited */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Rate Limited & Delayed</span>
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-amber-400">
            {stats ? stats.database.rateLimited : '—'}
          </span>
          <span className="text-[11px] text-slate-400">next window</span>
        </div>
      </div>

      {/* BullMQ Worker Active Jobs */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">BullMQ In-Flight</span>
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
            <Cpu className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-cyan-400">
            {stats ? stats.queue.delayed + stats.queue.waiting : '—'}
          </span>
          <span className="text-[11px] text-slate-400">active jobs</span>
        </div>
      </div>
    </div>
  );
};
