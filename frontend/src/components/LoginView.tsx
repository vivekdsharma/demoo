import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

declare global {
  interface Window {
    google: any;
  }
}

export const LoginView: React.FC = () => {
  const { loginWithGoogleCredential, loginDemo, loading } = useAuth();
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  useEffect(() => {
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
        theme: 'outline',
        size: 'large',
        shape: 'rectangular',
        width: 320,
      });
    }
  }, [googleClientId]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const userEmail = email.trim() || 'oliver.brown@domain.io';
    const userName = name.trim() || (email.trim() ? email.split('@')[0] : 'Oliver Brown');
    await loginDemo(userEmail, userName);
  };

  const handleGoogleClick = async () => {
    await loginDemo('oliver.brown@domain.io', 'Oliver Brown');
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-[420px] bg-white border border-slate-100 rounded-2xl p-8 sm:p-10 shadow-[0_4px_25px_rgba(0,0,0,0.04)]">
        {/* Title */}
        <h1 className="text-2xl font-bold text-slate-900 text-center mb-7">
          {isSignUp ? 'Create an Account' : 'Login'}
        </h1>

        {/* Google Login Button */}
        <div className="mb-6 flex flex-col items-center">
          <div ref={googleBtnRef} className="w-full flex justify-center" />

          {(!googleClientId || !window.google) && (
            <button
              onClick={handleGoogleClick}
              disabled={loading}
              type="button"
              className="w-full flex items-center justify-center space-x-2.5 py-3 px-4 rounded-xl bg-[#eaf5ee] hover:bg-[#dcf0e2] text-slate-800 text-xs font-medium border border-[#cbe8d4] transition active:scale-98"
            >
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
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
              <span>{isSignUp ? 'Sign up with Google' : 'Login with Google'}</span>
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-slate-100" />
          <span className="px-3 text-[11px] text-slate-400 font-normal">
            {isSignUp ? 'or register with email' : 'or continue with email'}
          </span>
          <div className="flex-1 border-t border-slate-100" />
        </div>

        {/* Email Form */}
        <form onSubmit={handleEmailAuth} className="space-y-3.5">
          {isSignUp && (
            <div>
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#f4f5f7] border-0 rounded-xl px-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00a859]"
              />
            </div>
          )}

          <div>
            <input
              type="text"
              placeholder="Email ID"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#f4f5f7] border-0 rounded-xl px-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00a859]"
            />
          </div>

          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#f4f5f7] border-0 rounded-xl px-4 py-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00a859]"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-[#00a859] hover:bg-[#00924c] text-white font-medium text-xs shadow-sm transition active:scale-98"
            >
              {loading
                ? isSignUp
                  ? 'Creating Account...'
                  : 'Logging in...'
                : isSignUp
                ? 'Create Account'
                : 'Login'}
            </button>
          </div>
        </form>

        {/* Switch between Login and Sign Up */}
        <div className="mt-6 text-center text-xs text-slate-500">
          {isSignUp ? (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setIsSignUp(false)}
                className="text-[#00a859] font-semibold hover:underline"
              >
                Login
              </button>
            </span>
          ) : (
            <span>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setIsSignUp(true)}
                className="text-[#00a859] font-semibold hover:underline"
              >
                Sign Up
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
