import React, { useState } from 'react';
import { CheckCircle2, Copy, Check, X, FileText, ArrowRight } from 'lucide-react';
import { FileRecord } from '../../types';

interface PublishConfirmationModalProps {
  isOpen: boolean;
  record: FileRecord | null;
  onClose: () => void;
  onViewInFindFile: () => void;
}

export const PublishConfirmationModal: React.FC<PublishConfirmationModalProps> = ({
  isOpen,
  record,
  onClose,
  onViewInFindFile
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !record) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(record.armsRef);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-8 border border-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#0A5C1D]/10 text-[#0A5C1D] mx-auto flex items-center justify-center mb-4 ring-8 ring-[#A8E0A8]/30">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <h3 className="font-heading text-2xl sm:text-3xl font-extrabold uppercase text-slate-900 tracking-wide">
            Record Successfully Published
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
            The archive document has been verified and registered into the Adsia Logistics ARMS vault.
          </p>

          {/* Generated ARMS Reference Display */}
          <div className="my-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Generated ARMS Reference ID
            </div>
            <div className="flex items-center justify-center space-x-3">
              <span className="font-heading text-2xl sm:text-3xl font-black text-[#0A5C1D] tracking-wider select-all">
                {record.armsRef}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 hover:border-slate-400 transition-colors shadow-xs"
                title="Copy Reference ID"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-200/80 grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Storage Location</span>
                <span className="font-bold text-slate-800">{record.location.code} ({record.location.zone})</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Transaction</span>
                <span className="font-semibold text-slate-800 truncate block">{record.transactionType}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Retention Due</span>
                <span className="font-semibold text-slate-800">{record.retentionDate}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons: Close / View in Find File */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="w-1/2 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              Close / New Form
            </button>
            <button
              onClick={() => {
                onClose();
                onViewInFindFile();
              }}
              className="w-1/2 py-2.5 rounded-lg bg-[#222222] text-white text-sm font-semibold hover:bg-black flex items-center justify-center space-x-2 transition-colors shadow-sm"
            >
              <span>View in Find File</span>
              <ArrowRight className="w-4 h-4 text-[#A8E0A8]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
