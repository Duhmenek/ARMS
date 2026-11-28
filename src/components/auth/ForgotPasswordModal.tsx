import React, { useState } from 'react';
import { X, Mail, CheckCircle2, KeyRound } from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setEmail('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {!submitted ? (
          <div>
            <div className="w-12 h-12 rounded-xl bg-[#0A5C1D]/10 text-[#0A5C1D] flex items-center justify-center mb-4">
              <KeyRound className="w-6 h-6" />
            </div>

            <h3 className="font-heading text-2xl font-bold uppercase text-slate-900 tracking-wide mb-1">
              Reset Your Password
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              Enter your corporate Adsia Logistics email address and our security officer will issue a temporary recovery token.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Corporate Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Local account username"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A5C1D] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-1/2 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-lg bg-[#222222] text-white text-sm font-semibold hover:bg-black transition-colors"
                >
                  Send Reset Link
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="font-heading text-2xl font-bold uppercase text-slate-900 tracking-wide mb-2">
              Reset Instructions Dispatched
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              If an active ARMS account is associated with <span className="font-semibold text-slate-900">{email}</span>, you will receive password recovery instructions shortly.
            </p>
            <button
              onClick={handleReset}
              className="w-full py-2.5 rounded-lg bg-[#0A5C1D] text-white font-semibold text-sm hover:bg-[#147426] transition-colors"
            >
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
