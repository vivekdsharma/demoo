import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sender, SlackStatus } from '../types';
import {
  Clock,
  Send,
  ChevronDown,
  Layers,
  LogOut,
  ExternalLink,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface SidebarProps {
  activeTab: 'scheduled' | 'sent';
  onTabChange: (tab: 'scheduled' | 'sent') => void;
  onComposeClick: () => void;
  scheduledCount: number;
  sentCount: number;
  slackStatus: SlackStatus | null;
  onOpenSlack: () => void;
  senders: Sender[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onComposeClick,
  scheduledCount,
  sentCount,
  slackStatus,
  onOpenSlack,
}) => {
  const { user, logout } = useAuth();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  return (
    <aside className="w-64 bg-white border-r border-slate-100 flex flex-col h-screen select-none sticky top-0">
      {/* Top Brand Logo */}
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-2xl font-black tracking-tighter text-slate-900 font-mono">
          ONB
        </h1>
      </div>

      {/* User Card */}
      <div className="px-5 mb-5 relative">
        <div
          onClick={() => setUserDropdownOpen(!userDropdownOpen)}
          className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition border border-transparent hover:border-slate-100"
        >
          <div className="flex items-center space-x-2.5 min-w-0">
            <img
              src={
                user?.avatar ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
              }
              alt={user?.name || 'Oliver Brown'}
              className="w-9 h-9 rounded-full object-cover bg-slate-200 border border-slate-100 flex-shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://api.dicebear.com/7.x/initials/svg?seed=Oliver';
              }}
            />
            <div className="min-w-0 flex-1 text-left">
              <p className="text-xs font-semibold text-slate-900 truncate">
                {user?.name || 'Oliver Brown'}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {user?.email || 'oliver.brown@domain.io'}
              </p>
            </div>
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
              userDropdownOpen ? 'rotate-180' : ''
            }`}
          />
        </div>

        {/* User dropdown menu */}
        {userDropdownOpen && (
          <div className="absolute left-5 right-5 top-full mt-1 bg-white border border-slate-100 rounded-xl shadow-lg p-1.5 z-50 text-xs animate-fadeIn">
            <button
              onClick={() => {
                onOpenSlack();
                setUserDropdownOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-700 transition"
            >
              <span className="flex items-center space-x-2">
                <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                <span>Slack Settings</span>
              </span>
              {slackStatus?.connected ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              )}
            </button>

            <a
              href="http://localhost:5000/admin/queues"
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-700 transition"
            >
              <span className="flex items-center space-x-2">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>BullMQ Queue</span>
              </span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>

            <div className="my-1 border-t border-slate-100" />

            <button
              onClick={() => {
                logout();
                setUserDropdownOpen(false);
              }}
              className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-rose-50 text-rose-600 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log out</span>
            </button>
          </div>
        )}
      </div>

      {/* Compose Button */}
      <div className="px-5 mb-6">
        <button
          onClick={onComposeClick}
          className="w-full py-2.5 px-4 rounded-full bg-white hover:bg-[#eaf5ee] text-[#00a859] border border-[#00a859] font-medium text-xs transition shadow-sm text-center"
        >
          Compose
        </button>
      </div>

      {/* CORE Navigation Menu */}
      <div className="px-4 flex-1">
        <p className="px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          CORE
        </p>

        <nav className="space-y-1">
          {/* Scheduled */}
          <button
            onClick={() => onTabChange('scheduled')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
              activeTab === 'scheduled'
                ? 'bg-[#eaf5ee] text-[#00a859]'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Clock
                className={`w-4 h-4 ${
                  activeTab === 'scheduled' ? 'text-[#00a859]' : 'text-slate-400'
                }`}
              />
              <span className="font-semibold">Scheduled</span>
            </div>
            <span className="text-[11px] font-normal text-slate-400">
              {scheduledCount}
            </span>
          </button>

          {/* Sent */}
          <button
            onClick={() => onTabChange('sent')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
              activeTab === 'sent'
                ? 'bg-[#eaf5ee] text-[#00a859]'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              <Send
                className={`w-4 h-4 ${
                  activeTab === 'sent' ? 'text-[#00a859]' : 'text-slate-400'
                }`}
              />
              <span>Sent</span>
            </div>
            <span className="text-[11px] font-normal text-slate-400">
              {sentCount}
            </span>
          </button>
        </nav>
      </div>

      {/* Footer Slack Status Badge */}
      <div className="p-4 border-t border-slate-100">
        <div
          onClick={onOpenSlack}
          className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer transition text-[11px]"
        >
          <span className="text-slate-600 flex items-center space-x-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                slackStatus?.connected ? 'bg-emerald-500' : 'bg-amber-400'
              }`}
            />
            <span>Slack {slackStatus?.connected ? 'Active' : 'Offline'}</span>
          </span>
          <span className="text-indigo-600 font-medium hover:underline">
            {slackStatus?.connected ? 'Config' : 'Connect'}
          </span>
        </div>
      </div>
    </aside>
  );
};
