import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { FileRecord } from '../../types';
import { X, FolderMinus, Calendar, User, FileText, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

interface PullOutModalProps {
  isOpen: boolean;
  preSelectedRef?: string;
  onClose: () => void;
  onSuccess: (info: { series: string; ref: string }) => void;
}

export const PullOutModal: React.FC<PullOutModalProps> = ({
  isOpen,
  preSelectedRef,
  onClose,
  onSuccess
}) => {
  const { files, submitBorrowRequest } = useApp();

  const [date, setDate] = useState('23/11/2026');
  const [selectedArmsRef, setSelectedArmsRef] = useState(preSelectedRef || '');
  const [familyName, setFamilyName] = useState('Villanueva');
  const [givenName, setGivenName] = useState('Clarissa');
  const [designation, setDesignation] = useState('Quality Assurance Specialist');
  const [purpose, setPurpose] = useState('Nestle Internal Audit');

  if (!isOpen) return null;

  // Available files that can be requested (or current if preselected)
  const availableFiles = files.filter(f => f.status === 'Available');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArmsRef) return;

    const result = await submitBorrowRequest({
      armsRef: selectedArmsRef,
      familyName,
      givenName,
      designation,
      purpose,
      date
    });

    onSuccess({
      series: result.transactionSeries,
      ref: result.armsRef
    });
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

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-5 pb-3 border-b border-slate-100">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center flex-shrink-0">
            <FolderMinus className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-heading text-2xl font-bold uppercase tracking-wide text-slate-900 leading-none">
              Pull Out Form (File Requisition)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Submit requisition to borrow physical record from the archive room
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Select Date & ARMS Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#0A5C1D]" />
                <span>Select Date (DD/MM/YYYY)</span>
              </label>
              <input
                type="text"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                placeholder="23/11/2026"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A5C1D]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                ARMS Reference <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={selectedArmsRef || (availableFiles[0]?.armsRef ?? '')}
                onChange={e => setSelectedArmsRef(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-semibold text-[#0A5C1D] focus:outline-none focus:ring-2 focus:ring-[#0A5C1D]"
              >
                <option value="">-- Choose File --</option>
                {availableFiles.map(f => (
                  <option key={f.id} value={f.armsRef}>
                    {f.armsRef} · {f.location.code} ({f.transactionType})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Borrower Name: Given Name & Family Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Given Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={givenName}
                onChange={e => setGivenName(e.target.value)}
                placeholder="e.g. Clarissa"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A5C1D]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Family Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={familyName}
                onChange={e => setFamilyName(e.target.value)}
                placeholder="e.g. Villanueva"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A5C1D]"
              />
            </div>
          </div>

          {/* Designation */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Designation / Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={designation}
              onChange={e => setDesignation(e.target.value)}
              placeholder="e.g. Lead QA Compliance Inspector"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A5C1D]"
            />
          </div>

          {/* Purpose dropdown */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Purpose <span className="text-rose-500">*</span>
            </label>
            <select
              value={purpose}
              onChange={e => setPurpose(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0A5C1D]"
            >
              <option value="Nestle Internal Audit">Nestle Internal Audit</option>
              <option value="Incident Investigation">Incident Investigation</option>
              <option value="Internal Market SHE Audit">Internal Market SHE Audit</option>
              <option value="Halal Audit">Halal Audit</option>
              <option value="Nestle Customer Audit">Nestle Customer Audit</option>
            </select>
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p>
              Requisition requires Operations Management approval. A Transaction Series will be assigned and broadcasted immediately to Notifications.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-1/2 py-2.5 rounded-lg bg-[#222222] hover:bg-black text-white text-sm font-semibold flex items-center justify-center space-x-2 transition-colors shadow-sm"
            >
              <span>Submit Requisition</span>
              <ArrowRight className="w-4 h-4 text-[#A8E0A8]" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
