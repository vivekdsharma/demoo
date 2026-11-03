import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import { LoginView } from './components/LoginView';
import { Sidebar } from './components/Sidebar';
import { EmailListView } from './components/EmailListView';
import { EmailDetailView } from './components/EmailDetailView';
import { ComposeView } from './components/ComposeView';
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

export const App: React.FC = () => {
  const { user, loading: authLoading } = useAuth();

  const [currentView, setCurrentView] = useState<'list' | 'detail' | 'compose'>('list');
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [selectedEmail, setSelectedEmail] = useState<EmailItem | null>(null);

  const [scheduledEmails, setScheduledEmails] = useState<EmailItem[]>([]);
  const [sentEmails, setSentEmails] = useState<EmailItem[]>([]);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [slackStatus, setSlackStatus] = useState<SlackStatus | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
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
  const loadScheduled = useCallback(async (q = searchQuery) => {
    setLoading(true);
    try {
      const res = await fetchScheduledEmails(1, 100, q);
      setScheduledEmails(res.data);
    } catch (err) {
      console.error('[App] Error loading scheduled emails:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  // Load sent emails
  const loadSent = useCallback(async (q = searchQuery) => {
    setLoading(true);
    try {
      const res = await fetchSentEmails(1, 100, q);
      setSentEmails(res.data);
    } catch (err) {
      console.error('[App] Error loading sent emails:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  // Refresh
  const refreshAll = useCallback(() => {
    loadStatsAndSlack();
    if (activeTab === 'scheduled') {
      loadScheduled();
    } else {
      loadSent();
    }
  }, [activeTab, loadStatsAndSlack, loadScheduled, loadSent]);

  useEffect(() => {
    if (user) {
      loadStatsAndSlack();
      if (activeTab === 'scheduled') {
        loadScheduled();
      } else {
        loadSent();
      }

      // Auto-poll every 5 seconds for live BullMQ email delivery
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

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    if (activeTab === 'scheduled') {
      loadScheduled(q);
    } else {
      loadSent(q);
    }
  };

  const handleTabChange = (tab: 'scheduled' | 'sent') => {
    setActiveTab(tab);
    setCurrentView('list');
    setSelectedEmail(null);
    setSearchQuery('');
  };

  const handleSelectEmail = (email: EmailItem) => {
    setSelectedEmail(email);
    setCurrentView('detail');
  };

  const handleDeleteEmail = async (id: string) => {
    if (confirm('Are you sure you want to delete this email?')) {
      try {
        await cancelEmailApi(id);
        setCurrentView('list');
        setSelectedEmail(null);
        refreshAll();
      } catch {
        alert('Failed to delete email');
      }
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00a859] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-white text-slate-800 flex overflow-hidden font-sans">
      {/* Fixed Left Sidebar (Image 2/3) */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onComposeClick={() => {
          setCurrentView('compose');
          setSelectedEmail(null);
        }}
        scheduledCount={stats?.database.scheduled || scheduledEmails.length}
        sentCount={stats?.database.sent || sentEmails.length}
        slackStatus={slackStatus}
        onOpenSlack={() => setIsSlackOpen(true)}
        senders={senders}
      />

      {/* Main Content Area */}
      {currentView === 'compose' ? (
        <ComposeView
          onBack={() => setCurrentView('list')}
          senders={senders}
          onScheduledSuccess={() => {
            refreshAll();
            setActiveTab('scheduled');
            setCurrentView('list');
          }}
        />
      ) : currentView === 'detail' && selectedEmail ? (
        <EmailDetailView
          email={selectedEmail}
          onBack={() => setCurrentView('list')}
          onDelete={handleDeleteEmail}
        />
      ) : (
        <EmailListView
          type={activeTab}
          emails={activeTab === 'scheduled' ? scheduledEmails : sentEmails}
          loading={loading}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onRefresh={refreshAll}
          onSelectEmail={handleSelectEmail}
        />
      )}

      {/* Slack Integration Modal */}
      <SlackModal
        isOpen={isSlackOpen}
        onClose={() => setIsSlackOpen(false)}
        status={slackStatus}
        onStatusUpdated={loadStatsAndSlack}
      />
    </div>
  );
};
