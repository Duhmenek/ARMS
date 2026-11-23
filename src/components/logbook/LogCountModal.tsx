import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Calendar, ClipboardList, CheckCircle2 } from 'lucide-react';

interface LogCountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogCountModal: React.FC<LogCountModalProps> = ({ isOpen, onClose }) => {
  const { addDailyLog } = useApp();

  const [date, setDate] = useState('23/11/2026');
  const [inbound, setInbound] = useState<number>(24);
  const [outbound, setOutbound] = useState<number>(31);
  const [scrap, setScrap] = useState<number>(4);
  const [inventory, setInventory] = useState<number>(9);
  const [rhTemp, setRhTemp] = useState<number>(24);
  const [rackInspections, setRackInspections] = useState<number>(8);
  const [mhePreOps, setMhePreOps] = useState<number>(12);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addDailyLog({
      date,
      inbound: Number(inbound) || 0,
      outbound: Number(outbound) || 0,
      scrap: Number(scrap) || 0,
      inventory: Number(inventory) || 0,
      rhTemp: Number(rhTemp) || 0,
      rackInspections: Number(rackInspections) || 0,
      mhePreOps: Number(mhePreOps) || 0,
      submittedBy: ''
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-7 border border-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-5 pb-3 border-b border-slate-100">
          <div className="w-11 h-11 rounded-xl bg-[#0A5C1D]/10 text-[#0A5C1D] flex items-center justify-center flex-shrink-0">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-heading text-2xl font-bold uppercase tracking-wide text-slate-900 leading-none">
              Daily Shift Log Count
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Record physical shift document tallies to update Pending for Log counts
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Select Date input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#0A5C1D]" />
              <span>Select Date (DD / MM / YYYY)</span>
            </label>
            <input
              type="text"
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              placeholder="23/11/2026"
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0A5C1D] focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5 pt-1">
            {/* Inbound */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Inbound Transactions
              </label>
              <input
                type="number"
                min="0"
                required
                value={inbound}
                onChange={e => setInbound(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A5C1D]"
              />
            </div>

            {/* Outbound */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Outbound Transactions
              </label>
              <input
                type="number"
                min="0"
                required
                value={outbound}
                onChange={e => setOutbound(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A5C1D]"
              />
            </div>

            {/* Scrap Management */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Scrap Management
              </label>
              <input
                type="number"
                min="0"
                required
                value={scrap}
                onChange={e => setScrap(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A5C1D]"
              />
            </div>

            {/* Inventory Count Sheets */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Inventory Count Sheets
              </label>
              <input
                type="number"
                min="0"
                required
                value={inventory}
                onChange={e => setInventory(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A5C1D]"
              />
            </div>

            {/* RH/Temperature Monitoring */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                RH / Temp Monitoring
              </label>
              <input
                type="number"
                min="0"
                required
                value={rhTemp}
                onChange={e => setRhTemp(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A5C1D]"
              />
            </div>

            {/* Rack Inspections */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rack Inspections
              </label>
              <input
                type="number"
                min="0"
                required
                value={rackInspections}
                onChange={e => setRackInspections(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A5C1D]"
              />
            </div>
          </div>

          {/* MHE Pre-Ops */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              MHE Pre-Ops Inspection Sheets
            </label>
            <input
              type="number"
              min="0"
              required
              value={mhePreOps}
              onChange={e => setMhePreOps(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A5C1D]"
            />
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
              className="w-1/2 py-2.5 rounded-lg bg-[#222222] hover:bg-black text-white text-sm font-semibold transition-colors shadow-sm"
            >
              Submit Daily Counts
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
