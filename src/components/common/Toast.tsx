import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, X } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toastMessage } = useApp();

  if (!toastMessage) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-md bg-[#222222] text-white px-4 py-3 rounded-xl shadow-2xl border border-emerald-500/30 flex items-center space-x-3 animate-in slide-in-from-bottom-5 duration-200">
      <div className="w-8 h-8 rounded-full bg-[#0A5C1D] text-[#A8E0A8] flex items-center justify-center flex-shrink-0">
        <CheckCircle2 className="w-5 h-5" />
      </div>
      <div className="text-sm font-medium pr-2 text-slate-100">
        {toastMessage}
      </div>
    </div>
  );
};
