import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';

declare global {
  interface Window {
    google: any;
  }
}

export const LoginView: React.FC = () => {
  const { loginWithGoogleCredential, loginDemo, loading } = useAuth();
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [showDirectInput, setShowDirectInput] = useState(false);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  useEffect(() => {
    // Initialize Google Identity Services if client ID is configured
    if (window.google?.accounts?.id && googleClientId && googleBtnRef.current) {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response: any) => {
          if (response.credential) {
            loginWithGoogleCredential(response.credential);
          }
        },
      });

      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'filled_black',
        size: 'large',
        shape: 'pill',
        width: 320,
      });
    }
  }, [googleClientId]);

  const handleQuickDemoLogin = (email: string, name: string) => {
    loginDemo(email, name);
  };

  const handleCustomLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim()) return;
    loginDemo(customEmail.trim(), customName.trim() || customEmail.split('@')[0]);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10 backdrop-blur-xl">
        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-xl shadow-indigo-600/30 mb-4 border border-indigo-400/20">
            <Mail className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">ReachInbox Scheduler</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            High-throughput cold outreach engine with BullMQ, Redis concurrency & Ethereal SMTP
          </p>
        </div>

        {/* Real Google OAuth Button container */}
        <div className="flex flex-col items-center space-y-4">
          <div ref={googleBtnRef} className="min-h-[44px] flex items-center justify-center" />

          {/* Fallback button if Google GIS script is blocked or client ID not filled */}
          {(!googleClientId || !window.google) && (
            <button
              onClick={() => handleQuickDemoLogin('alex.miller@reachinbox.ai', 'Alex Miller')}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-3 py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs shadow-md transition transform active:scale-98"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google (Demo Session)</span>
            </button>
          )}

          <div className="w-full flex items-center my-2">
            <div className="flex-1 border-t border-slate-800" />
            <span className="px-3 text-[10px] uppercase tracking-wider text-slate-500 font-medium">Or enter email</span>
            <div className="flex-1 border-t border-slate-800" />
          </div>

          {!showDirectInput ? (
            <button
              onClick={() => setShowDirectInput(true)}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition"
            >
              Sign in with custom email address →
            </button>
          ) : (
            <form onSubmit={handleCustomLogin} className="w-full space-y-3 animate-fadeIn">
              <input
                type="text"
                placeholder="Your Full Name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <input
                type="email"
                required
                placeholder="name@company.com"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={loading || !customEmail.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition flex items-center justify-center space-x-2"
              >
                <span>Access Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>

        {/* Feature Highlights */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span>BullMQ Persistence</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
            <span>Elasticsearch Search</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span>Hourly Rate Limits</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
            <span>Live Slack Alerts</span>
          </div>
        </div>
      </div>
    </div>
  );
};
