import React, { useEffect, useState } from 'react';
import { X, ClipboardPenLine } from 'lucide-react';
import { LogEntry, TransactionType } from '../../types';

type LogEntryInput = Omit<LogEntry, 'id' | 'uniqueCode' | 'createdBy' | 'createdAt' | 'dwellMinutes'>;
type ConditionField = 'materialCondition' | 'truckCvCondition' | 'noInfestation' | 'truckCvOdor' | 'truckCvSeal';

interface LogEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: LogEntryInput) => Promise<LogEntry>;
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

const conditions: { label: string; field: ConditionField }[] = [
  { label: 'MATERIAL CONDITION', field: 'materialCondition' },
  { label: 'TRUCK/CV CONDITION', field: 'truckCvCondition' },
  { label: 'NO INFESTATION', field: 'noInfestation' },
  { label: 'TRUCK/CV ODOR', field: 'truckCvOdor' },
  { label: 'TRUCK/CV SEAL', field: 'truckCvSeal' },
];

const today = () => new Date().toISOString().slice(0, 10);
const emptyEntry = (): LogEntryInput => ({
  transactionType: 'Receiving of local deliveries',
  materialNumber: '', materialDescription: '', date: today(), po: '', drInvNumber: '', proNumber: '',
  vamNumber: '', plateNumber: '', operator: '', materialCondition: '', truckCvCondition: '',
  noInfestation: '', truckCvOdor: '', truckCvSeal: '', gateIn: '', unloadingStart: '', unloadingEnd: '',
});

const fieldClass = 'w-full rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A5C1D]';
const labelClass = 'block text-[11px] font-bold uppercase tracking-wider text-slate-700';

function calculateDwell(gateIn: string, unloadingEnd: string): number | null {
  if (!gateIn || !unloadingEnd) return null;
  const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
  let duration = toMinutes(unloadingEnd) - toMinutes(gateIn);
  if (duration < 0) duration += 24 * 60;
  return duration;
}

function formatDuration(minutes: number | null) {
  if (minutes === null) return 'Enter Gate In and Unloading End';
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours} hr ${remainder} min` : `${remainder} min`;
}

export const LogEntryModal: React.FC<LogEntryModalProps> = ({ isOpen, onClose, onSave, onSaved }) => {
  const [form, setForm] = useState<LogEntryInput>(emptyEntry);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dwellMinutes = calculateDwell(form.gateIn, form.unloadingEnd);

  useEffect(() => {
    if (isOpen) { setForm(emptyEntry()); setError(''); }
  }, [isOpen]);

  if (!isOpen) return null;

  const setField = <K extends keyof LogEntryInput,>(field: K, value: LogEntryInput[K]) => {
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
            <div><h3 className="font-heading text-xl font-bold uppercase tracking-wide text-slate-900">Receiving / Delivery Inspection</h3><p className="mt-1 text-xs text-slate-500">Complete identification, condition, and truck time details.</p></div>
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
              <label className={`${labelClass} sm:col-span-2`}>MATERIAL No.<input value={form.materialNumber} onChange={event => setField('materialNumber', event.target.value)} className={`${fieldClass} mt-1.5 font-normal normal-case tracking-normal`} /></label>
              <label className={`${labelClass} sm:col-span-2`}>MATERIAL DESCRIPTION<input value={form.materialDescription} onChange={event => setField('materialDescription', event.target.value)} className={`${fieldClass} mt-1.5 font-normal normal-case tracking-normal`} /></label>
              <label className={labelClass}>DATE<input type="date" value={form.date} onChange={event => setField('date', event.target.value)} className={`${fieldClass} mt-1.5 font-normal normal-case tracking-normal`} /></label>
              <label className={labelClass}>PO / OBD No.<input value={form.po} onChange={event => setField('po', event.target.value)} className={`${fieldClass} mt-1.5 font-normal normal-case tracking-normal`} /></label>
              <label className={labelClass}>DR/INV No.<input value={form.drInvNumber} onChange={event => setField('drInvNumber', event.target.value)} className={`${fieldClass} mt-1.5 font-normal normal-case tracking-normal`} /></label>
              <label className={labelClass}>PRO No.<input value={form.proNumber} onChange={event => setField('proNumber', event.target.value)} className={`${fieldClass} mt-1.5 font-normal normal-case tracking-normal`} /></label>
              <label className={labelClass}>VAM No.<input value={form.vamNumber} onChange={event => setField('vamNumber', event.target.value)} className={`${fieldClass} mt-1.5 font-normal normal-case tracking-normal`} /></label>
              <label className={labelClass}>PL/CV No.<input value={form.plateNumber} onChange={event => setField('plateNumber', event.target.value)} className={`${fieldClass} mt-1.5 font-normal normal-case tracking-normal`} /></label>
              <label className={`${labelClass} sm:col-span-2`}>Operator<input value={form.operator} onChange={event => setField('operator', event.target.value)} className={`${fieldClass} mt-1.5 font-normal normal-case tracking-normal`} /></label>
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-slate-300">
            <h4 className="border-b border-slate-300 bg-slate-100 px-4 py-3 text-xs font-extrabold uppercase tracking-[0.16em] text-slate-800">Condition Checklist</h4>
            <div className="divide-y divide-slate-200">
              {conditions.map(condition => (
                <fieldset key={condition.field} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-3">
                  <legend className="sr-only">{condition.label}</legend>
                  <span className="text-[11px] font-bold uppercase tracking-wide text-slate-700">{condition.label}</span>
                  {(['OK', 'NOT OK'] as const).map(value => (
                    <label key={value} className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <input required type="radio" name={condition.field} value={value} checked={form[condition.field] === value} onChange={() => setField(condition.field, value)} className="h-4 w-4 accent-[#0A5C1D]" />{value}
                    </label>
                  ))}
                </fieldset>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-300 p-4 sm:p-5">
            <h4 className="mb-4 border-b border-slate-200 pb-2 text-xs font-extrabold uppercase tracking-[0.16em] text-slate-800">Delivery Truck Time Log</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <label className={labelClass}>Gate In<input type="time" value={form.gateIn} onChange={event => setField('gateIn', event.target.value)} className={`${fieldClass} mt-1.5 font-normal normal-case tracking-normal`} /></label>
              <label className={labelClass}>Unloading Start<input type="time" value={form.unloadingStart} onChange={event => setField('unloadingStart', event.target.value)} className={`${fieldClass} mt-1.5 font-normal normal-case tracking-normal`} /></label>
              <label className={labelClass}>Unloading End<input type="time" value={form.unloadingEnd} onChange={event => setField('unloadingEnd', event.target.value)} className={`${fieldClass} mt-1.5 font-normal normal-case tracking-normal`} /></label>
            </div>
            <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3">
              <p className={labelClass}>Dwell time · Gate In to Unloading End</p>
              <p className="mt-1 text-sm font-bold text-[#0A5C1D]">{formatDuration(dwellMinutes)}</p>
            </div>
          </section>

          {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-[#222222] px-5 py-2.5 text-sm font-bold text-white hover:bg-black disabled:cursor-wait disabled:opacity-60">{saving ? 'Saving…' : 'Save & Open Pre-Print'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
