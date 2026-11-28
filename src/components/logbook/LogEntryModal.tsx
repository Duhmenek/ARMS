import React, { useEffect, useState } from 'react';
import { X, ClipboardPenLine } from 'lucide-react';
import { LogEntry, LogEntryCreateInput, TransactionType } from '../../types';

interface LogEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: LogEntryCreateInput) => Promise<LogEntry>;
  onSaved: (entry: LogEntry) => void;
}

const transactions: { value: TransactionType; label: string }[] = [
  { value: 'Receiving of IFT deliveries', label: 'Receiving of IFT deliveries' },
  { value: 'Inbound', label: 'Inbound (General)' },
  { value: 'Dispatch of local resupply', label: 'Dispatch of local resupply' },
  { value: 'Outbound', label: 'Outbound (General)' },
  { value: 'Receiving of local deliveries', label: 'Receiving of local deliveries' },
  { value: 'Dispatch of scraps', label: 'Dispatch of scraps' },
  { value: 'Scrap Management', label: 'Scrap Management' },
  { value: 'Daily cycle count', label: 'Daily cycle count' },
  { value: 'Inventory Count', label: 'Inventory Count' },
  { value: 'Other', label: 'Other Operational Form' },
];

const today = () => new Date().toISOString().slice(0, 10);
const emptyEntry = (): LogEntryCreateInput => ({
  transactionType: 'Receiving of local deliveries',
  materialNumber: '', materialDescription: '', date: today(), drInvNumber: '',
  vamNumber: '', operator: '', po: '', proNumber: '', plateNumber: '',
});

const fieldClass = 'w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A5C1D]';
const labelClass = 'block text-[11px] font-bold uppercase tracking-wider text-slate-700';

export const LogEntryModal: React.FC<LogEntryModalProps> = ({ isOpen, onClose, onSave, onSaved }) => {
  const [form, setForm] = useState<LogEntryCreateInput>(emptyEntry);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) { setForm(emptyEntry()); setError(''); }
  }, [isOpen]);

  if (!isOpen) return null;

  const setField = <K extends keyof LogEntryCreateInput,>(field: K, value: LogEntryCreateInput[K]) => {
    setForm(current => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const saved = await onSave(form);
      onSaved(saved);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save the log entry.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-5">
      <div className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-100 bg-white p-5 shadow-2xl sm:p-7">
        <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0A5C1D]/10 text-[#0A5C1D]"><ClipboardPenLine className="h-5 w-5" /></div>
            <div><h3 className="font-heading text-xl font-bold uppercase tracking-wide text-slate-900">New Log Entry</h3><p className="mt-1 text-xs text-slate-500">Enter the required identification details for this Authority to Receive form.</p></div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <label className={labelClass}>Select Transaction
            <select required value={form.transactionType} onChange={event => setField('transactionType', event.target.value as TransactionType)} className={`${fieldClass} mt-1.5 font-medium normal-case tracking-normal`}>
              {transactions.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>

          <section className="rounded-lg border border-slate-300 p-4 sm:p-5">
            <h4 className="mb-4 border-b border-slate-200 pb-2 text-xs font-extrabold uppercase tracking-[0.16em] text-slate-800">Header / Identification</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className={`${labelClass} sm:col-span-2`}>MATERIAL No.<input required value={form.materialNumber} onChange={event => setField('materialNumber', event.target.value)} className={`${fieldClass} mt-1.5 font-normal normal-case tracking-normal`} /></label>
              <label className={`${labelClass} sm:col-span-2`}>MATERIAL DESCRIPTION<input required value={form.materialDescription} onChange={event => setField('materialDescription', event.target.value)} className={`${fieldClass} mt-1.5 font-normal normal-case tracking-normal`} /></label>
              <label className={labelClass}>DATE<input required type="date" value={form.date} onChange={event => setField('date', event.target.value)} className={`${fieldClass} mt-1.5 font-normal normal-case tracking-normal`} /></label>
              <label className={labelClass}>PO / OBD No.<input required value={form.po} onChange={event => setField('po', event.target.value)} className={`${fieldClass} mt-1.5 font-normal normal-case tracking-normal`} /></label>
              <label className={labelClass}>DR/INV No.<input required value={form.drInvNumber} onChange={event => setField('drInvNumber', event.target.value)} className={`${fieldClass} mt-1.5 font-normal normal-case tracking-normal`} /></label>
              <label className={labelClass}>PRO No. (PRD No.)<input required value={form.proNumber} onChange={event => setField('proNumber', event.target.value)} className={`${fieldClass} mt-1.5 font-normal normal-case tracking-normal`} /></label>
              <label className={labelClass}>VAM No.<input required value={form.vamNumber} onChange={event => setField('vamNumber', event.target.value)} className={`${fieldClass} mt-1.5 font-normal normal-case tracking-normal`} /></label>
              <label className={labelClass}>PL/CV No.<input required value={form.plateNumber} onChange={event => setField('plateNumber', event.target.value)} className={`${fieldClass} mt-1.5 font-normal normal-case tracking-normal`} /></label>
              <label className={`${labelClass} sm:col-span-2`}>Operator<input required value={form.operator} onChange={event => setField('operator', event.target.value)} className={`${fieldClass} mt-1.5 font-normal normal-case tracking-normal`} /></label>
            </div>
          </section>

          {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-[#222222] px-5 py-2.5 text-sm font-bold text-white hover:bg-black disabled:cursor-wait disabled:opacity-60">{saving ? 'Saving…' : 'Save Log Entry'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
