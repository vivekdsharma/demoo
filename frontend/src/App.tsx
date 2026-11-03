import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import { LoginView } from './components/LoginView';
import { Header } from './components/Header';
import { StatsCards } from './components/StatsCards';
import { ScheduledTable } from './components/ScheduledTable';
import { SentTable } from './components/SentTable';
import { ComposeModal } from './components/ComposeModal';
import { SlackModal } from './components/SlackModal';
import {
  EmailItem,
  Sender,
  DashboardStats,
  SlackStatus,
} from './types';
import {
  fetchScheduledEmails,
  fetchSentEmails,
  fetchSenders,
  fetchDashboardStats,
  fetchSlackStatus,
  cancelEmailApi,
} from './api/client';
import { Calendar, CheckCircle2 } from 'lucide-react';

export const App: React.FC = () => {
  const { user, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [scheduledEmails, setScheduledEmails] = useState<EmailItem[]>([]);
  const [sentEmails, setSentEmails] = useState<EmailItem[]>([]);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [slackStatus, setSlackStatus] = useState<SlackStatus | null>(null);

  const [loadingScheduled, setLoadingScheduled] = useState<boolean>(true);
  const [loadingSent, setLoadingSent] = useState<boolean>(true);

  const [scheduledSearch, setScheduledSearch] = useState<string>('');
  const [sentSearch, setSentSearch] = useState<string>('');
  const [scheduledSource, setScheduledSource] = useState<string | undefined>();
  const [sentSource, setSentSource] = useState<string | undefined>();

  const [isComposeOpen, setIsComposeOpen] = useState<boolean>(false);
  const [isSlackOpen, setIsSlackOpen] = useState<boolean>(false);

  // Load stats & slack status
  const loadStatsAndSlack = useCallback(async () => {
    try {
      const [sData, slackData, sendersData] = await Promise.all([
        fetchDashboardStats(),
        fetchSlackStatus(),
        fetchSenders(),
      ]);
      setStats(sData);
      setSlackStatus(slackData);
      setSenders(sendersData);
    } catch (err) {
      console.warn('[App] Error loading system stats:', err);
    }
  }, []);

  // Load scheduled emails
  const loadScheduled = useCallback(async (q = scheduledSearch) => {
    setLoadingScheduled(true);
    try {
      const res = await fetchScheduledEmails(1, 100, q);
      setScheduledEmails(res.data);
      setScheduledSource(res.source);
    } catch (err) {
      console.error('[App] Error loading scheduled emails:', err);
    } finally {
      setLoadingScheduled(false);
    }
  }, [scheduledSearch]);

  // Load sent emails
  const loadSent = useCallback(async (q = sentSearch) => {
    setLoadingSent(true);
    try {
      const res = await fetchSentEmails(1, 100, q);
      setSentEmails(res.data);
      setSentSource(res.source);
    } catch (err) {
      console.error('[App] Error loading sent emails:', err);
    } finally {
      setLoadingSent(false);
    }
  }, [sentSearch]);

  // Refresh all
  const refreshAll = useCallback(() => {
    loadStatsAndSlack();
    if (activeTab === 'scheduled') {
      loadScheduled();
    } else {
      loadSent();
    }
  }, [activeTab, loadStatsAndSlack, loadScheduled, loadSent]);

  // Initial and reactive loads
  useEffect(() => {
    if (user) {
      loadStatsAndSlack();
      loadScheduled();
      loadSent();

      // Poll periodically every 5 seconds to observe live queue dispatch
      const interval = setInterval(() => {
        loadStatsAndSlack();
        if (activeTab === 'scheduled') {
          loadScheduled();
        } else {
          loadSent();
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [user, activeTab, loadStatsAndSlack, loadScheduled, loadSent]);

  const handleScheduledSearch = (q: string) => {
    setScheduledSearch(q);
    loadScheduled(q);
  };

  const handleSentSearch = (q: string) => {
    setSentSearch(q);
    loadSent(q);
  };

  const handleCancelEmail = async (id: string) => {
    if (confirm('Are you sure you want to cancel this scheduled email?')) {
      try {
        await cancelEmailApi(id);
        refreshAll();
      } catch (err) {
        alert('Failed to cancel email');
      }
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        slackStatus={slackStatus}
        onOpenSlackModal={() => setIsSlackOpen(true)}
        onOpenCompose={() => setIsComposeOpen(true)}
      />

      {/* Main Dashboard Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Metric Summary Cards */}
        <StatsCards stats={stats} />

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-2 border-b border-slate-800 mb-6">
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`flex items-center space-x-2 pb-3 px-3 text-xs font-semibold border-b-2 transition relative ${
              activeTab === 'scheduled'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Scheduled Emails</span>
            {stats && (
              <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                {stats.database.scheduled}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('sent')}
            className={`flex items-center space-x-2 pb-3 px-3 text-xs font-semibold border-b-2 transition relative ${
              activeTab === 'sent'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Sent Emails</span>
            {stats && (
              <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                {stats.database.sent}
              </span>
            )}
          </button>
        </div>

        {/* Tab Views */}
        {activeTab === 'scheduled' ? (
          <ScheduledTable
            emails={scheduledEmails}
            loading={loadingScheduled}
            searchQuery={scheduledSearch}
            onSearchChange={handleScheduledSearch}
            onCancelEmail={handleCancelEmail}
            onRefresh={refreshAll}
            searchSource={scheduledSource}
          />
        ) : (
          <SentTable
            emails={sentEmails}
            loading={loadingSent}
            searchQuery={sentSearch}
            onSearchChange={handleSentSearch}
            onRefresh={refreshAll}
            searchSource={sentSource}
          />
        )}
      </main>

      {/* Modals */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        senders={senders}
        onScheduledSuccess={() => {
          refreshAll();
          setActiveTab('scheduled');
        }}
      />

      <SlackModal
        isOpen={isSlackOpen}
        onClose={() => setIsSlackOpen(false)}
        status={slackStatus}
        onStatusUpdated={loadStatsAndSlack}
      />
    </div>
  );
};
