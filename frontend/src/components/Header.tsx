import React from 'react';
import { useAuth } from '../context/AuthContext';
import { SlackStatus } from '../types';
import {
  LogOut,
  Mail,
  Activity,
  Layers,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

interface HeaderProps {
  slackStatus: SlackStatus | null;
  onOpenSlackModal: () => void;
  onOpenCompose: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  slackStatus,
  onOpenSlackModal,
  onOpenCompose,
}) => {
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-base tracking-tight text-white">ReachInbox</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Scheduler
                </span>
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-2 border-l border-slate-800 pl-4">
            <a
              href="http://localhost:5000/admin/queues"
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-800/80 transition"
              title="Open BullMQ real-time queues monitor"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>BullMQ Board</span>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </a>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-3">
          {/* Slack Connect Button */}
          <button
            onClick={onOpenSlackModal}
            className={`flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg font-medium border transition ${
              slackStatus?.connected
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60 hover:bg-emerald-950/70'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700/80'
            }`}
          >
            {slackStatus?.connected ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Slack Connected</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Connect Slack</span>
              </>
            )}
          </button>

          {/* Primary Compose Button */}
          <button
            onClick={onOpenCompose}
            className="flex items-center space-x-2 text-xs font-semibold px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition transform active:scale-95"
          >
            <span className="text-sm leading-none">+</span>
            <span>Compose Email</span>
          </button>

          {/* User Profile */}
          {user && (
            <div className="flex items-center space-x-3 border-l border-slate-800 pl-3">
              <div className="flex items-center space-x-2">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-8 h-8 rounded-full border border-slate-700 object-cover bg-slate-800"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-medium text-slate-200 leading-tight">{user.name}</p>
                  <p className="text-[10px] text-slate-400 leading-tight truncate max-w-[120px]">{user.email}</p>
                </div>
              </div>

              <button
                onClick={logout}
                className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
