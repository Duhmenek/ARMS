import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

export const LoginView: React.FC = () => {
  const { login, resetPassword, authLoading, authError, clearAuthError } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);

  React.useEffect(() => {
    fetch('/api/health', { credentials: 'same-origin' })
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (data) setSetupRequired(Boolean(data.setupRequired)); })
      .catch(() => setSetupRequired(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsSubmitting(true);
    clearAuthError();
    try {
      await login(email, password);
    } catch {
      // Error handled in AppContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotStatus('Contact your ARMS administrator to reset a local account password.');
  };

  return (
    <div className="min-h-screen w-full bg-[#F8F9FA] relative flex flex-col justify-between select-none">
      {/* Top-Left: Bold lowercase green `arms.` logo */}
      <header className="p-8 sm:p-10 w-full flex items-center">
        <div className="font-sans font-black text-4xl sm:text-5xl tracking-tight text-[#0A5C1D] leading-none select-none">
          arms<span className="text-[#1B8A2F]">.</span>
        </div>
      </header>

      {/* Centered Minimalist White Card */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 -mt-12">
        <div className="w-full max-w-[420px] bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.06)] border border-slate-200/80 p-8 sm:p-10">
          {setupRequired && (
            <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
              First-time setup: on the host computer, run <code className="font-bold">npm run setup:users</code> in a terminal to create the local Management and Custodian accounts.
            </div>
          )}
          {authError && (
            <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 leading-snug">
              {authError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Label Email Address + input */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2"
              >
                Local Username
              </label>
              <input
                id="email"
                type="text"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="management or custodian"
                autoComplete="email"
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0A5C1D] focus:border-transparent transition-all"
              />
            </div>

            {/* Label Password + password input */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0A5C1D] focus:border-transparent transition-all"
              />
            </div>

            {/* Full-width dark charcoal button (`#1E1E1E`) `Log In` */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || authLoading}
                className="w-full py-3.5 px-4 rounded-lg bg-[#1E1E1E] hover:bg-black text-white font-heading text-base font-bold uppercase tracking-wider transition-all shadow-sm active:scale-[0.99] disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting || authLoading ? 'Signing In...' : 'Log In'}
              </button>
            </div>

            {/* Centered muted link `Forgot password?` below button */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setShowForgotModal(true);
                }}
                className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Discreet footer spacing to keep center aligned */}
      <footer className="h-10" />

      {/* Minimal Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 border border-slate-200">
            <h3 className="font-heading text-xl font-bold uppercase text-slate-900 mb-2">
              Reset Password
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Local account passwords are reset by the ARMS administrator on the host computer.
            </p>

            {forgotStatus ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 rounded-lg mb-4">
                {forgotStatus}
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Local Username
                  </label>
                  <input
                    type="text"
                    required
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    placeholder="Local account username"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0A5C1D]"
                  />
                </div>
                <div className="flex items-center space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="w-1/2 py-2 text-xs font-semibold text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 py-2 text-xs font-bold uppercase tracking-wider text-white bg-[#1E1E1E] rounded-lg hover:bg-black"
                  >
                    Contact Admin
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
