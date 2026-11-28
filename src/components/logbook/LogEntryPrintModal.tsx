import React, { useEffect, useState } from 'react';
import { LogEntry, LogEntryBatchRow, LogEntryBreakdown, LogEntryCompletionInput } from '../../types';
import { Printer, X, Pencil, Save, Ban } from 'lucide-react';

interface LogEntryPrintModalProps {
  entry: LogEntry | null;
  onClose: () => void;
  onSaveArchive: (id: string, completion: LogEntryCompletionInput) => Promise<LogEntry>;
}

type Side = 'left' | 'right';
type InspectionField = 'materialCondition' | 'truckCvCondition' | 'noInfestation' | 'truckCvOdor' | 'truckCvSeal';
type BatchField = keyof LogEntryBatchRow;
type BreakdownField = keyof LogEntryBreakdown;

const inspections: { label: string; field: InspectionField }[] = [
  { label: 'MATERIAL CONDITION', field: 'materialCondition' },
  { label: 'TRUCK/CV CONDITION', field: 'truckCvCondition' },
  { label: 'NO INFESTATION', field: 'noInfestation' },
  { label: 'TRUCK/CV ODOR', field: 'truckCvOdor' },
  { label: 'TRUCK/CV SEAL', field: 'truckCvSeal' },
];
const blankBatch = (): LogEntryBatchRow => ({ batchCode: '', mfgDate: '', sap: '', plCoi: '', sledExp: '' });
const blankBreakdown = (): LogEntryBreakdown => ({ bagsPerPallet: '', palletsUsed: '', weightPerBag: '', totalQuantity: '' });
const defaultCompletion = (): LogEntryCompletionInput => ({
  materialCondition: '', truckCvCondition: '', noInfestation: '', truckCvOdor: '', truckCvSeal: '',
  gateIn: '', unloadingStart: '', unloadingEnd: '',
  batchDetails: { left: Array.from({ length: 3 }, blankBatch), right: Array.from({ length: 3 }, blankBatch) },
  breakdown: { left: blankBreakdown(), right: blankBreakdown() }, remarks: '',
});
const completionFromEntry = (entry: LogEntry): LogEntryCompletionInput => ({
  materialCondition: entry.materialCondition || '', truckCvCondition: entry.truckCvCondition || '',
  noInfestation: entry.noInfestation || '', truckCvOdor: entry.truckCvOdor || '', truckCvSeal: entry.truckCvSeal || '',
  gateIn: entry.gateIn || '', unloadingStart: entry.unloadingStart || '', unloadingEnd: entry.unloadingEnd || '',
  batchDetails: {
    left: Array.from({ length: 3 }, (_, index) => ({ ...blankBatch(), ...entry.batchDetails?.left?.[index] })),
    right: Array.from({ length: 3 }, (_, index) => ({ ...blankBatch(), ...entry.batchDetails?.right?.[index] })),
  },
  breakdown: { left: { ...blankBreakdown(), ...entry.breakdown?.left }, right: { ...blankBreakdown(), ...entry.breakdown?.right } },
  remarks: entry.remarks || '',
});

const display = (value?: string | null) => value?.trim() || '—';
const timestamp = (value: string) => {
  const parsed = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
};
const duration = (minutes: number | null) => {
  if (minutes === null || minutes === undefined) return '';
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours} hr ${remainder} min` : `${remainder} min`;
};
const dwellForTimes = (gateIn: string, unloadingEnd: string) => {
  if (!gateIn || !unloadingEnd) return null;
  const toMinutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
  let minutes = toMinutes(unloadingEnd) - toMinutes(gateIn);
  if (minutes < 0) minutes += 1440;
  return minutes;
};

const fieldCell = 'log-entry-print-cell box-border min-h-[42px] min-w-0 w-full border-b border-r border-slate-800 px-2.5 py-1.5';
const rowLabel = 'text-[8px] font-extrabold uppercase tracking-[0.08em] text-slate-600';

const CharacterBoxes: React.FC<{
  count: number; value: string; editable: boolean; label: string; parentGrid?: boolean; onChange?: (index: number, value: string) => void;
}> = ({ count, value, editable, label, parentGrid = false, onChange }) => (
  <span className={`log-entry-character-row ${parentGrid ? 'is-parent-grid' : `grid ${count === 10 ? 'grid-cols-10' : 'grid-cols-6'}`} min-w-0 w-full gap-[2px]`} aria-label={label}>
    {Array.from({ length: count }, (_, index) => editable ? (
      <input key={index} type="text" maxLength={1} value={value[index] || ''} aria-label={`${label}, character ${index + 1}`}
        onChange={event => onChange?.(index, event.target.value.slice(-1))} className="log-entry-char-input box-border min-w-0 w-full" />
    ) : <span key={index} className="log-entry-char-display">{value[index] || ''}</span>)}
  </span>
);

interface ManualBatchBlockProps {
  side: Side;
  rows: LogEntryBatchRow[];
  breakdown: LogEntryBreakdown;
  editable: boolean;
  onBatchChange: (side: Side, row: number, field: BatchField, index: number, value: string) => void;
  onBreakdownChange: (side: Side, field: BreakdownField, value: string) => void;
}

const ManualBatchBlock: React.FC<ManualBatchBlockProps> = ({ side, rows, breakdown, editable, onBatchChange, onBreakdownChange }) => {
  const sideTitle = side === 'left' ? 'LEFT' : 'RIGHT';
  const characterField = (rowIndex: number, field: BatchField, count: number, label: string) => (
    <CharacterBoxes count={count} value={rows[rowIndex]?.[field] || ''} editable={editable} label={`${sideTitle} ${label} row ${rowIndex + 1}`}
      onChange={(index, value) => onBatchChange(side, rowIndex, field, index, value)} />
  );

  return (
    <div className="box-border min-w-0 w-full overflow-hidden border-r border-slate-800 last:border-r-0">
      <h3 className="border-b border-slate-800 bg-slate-100 px-2 py-1.5 text-center text-[9px] font-extrabold uppercase tracking-[0.12em]">BATCH · {sideTitle}</h3>
      <div className="divide-y divide-slate-800">
        {rows.map((_, row) => <div key={`batch-${row}`} className="log-entry-manual-row box-border min-h-[30px] min-w-0 w-full overflow-hidden px-1">
          {characterField(row, 'batchCode', 10, 'Batch')}
        </div>)}
      </div>

      <h4 className="border-y border-slate-800 bg-slate-100 px-1.5 py-1 text-center text-[7px] font-extrabold uppercase leading-tight">MFG DATE (DD-MM-YY) / SAP / PL/COI</h4>
      <div className="divide-y divide-slate-800">
        {([
          ['MFG DATE', 'mfgDate'], ['SAP', 'sap'], ['PL/COI', 'plCoi'],
        ] as [string, BatchField][]).map(([label, field], row) => <div key={`mfg-${row}`} className="log-entry-manual-row box-border grid min-h-[30px] min-w-0 w-full grid-cols-[72px_repeat(6,minmax(0,1fr))] items-center gap-1 overflow-hidden px-1.5">
          <span className="min-w-0 text-[7px] font-bold leading-tight">{label}</span><CharacterBoxes count={6} value={rows[row]?.[field] || ''} editable={editable} parentGrid label={`${sideTitle} ${label} row ${row + 1}`} onChange={(index, value) => onBatchChange(side, row, field, index, value)} />
        </div>)}
      </div>

      <h4 className="border-y border-slate-800 bg-slate-100 px-1.5 py-1 text-center text-[7px] font-extrabold uppercase leading-tight">SLED/EXP (DD-MM-YY)</h4>
      <div className="divide-y divide-slate-800">
        {rows.map((_, row) => <div key={`sled-${row}`} className="log-entry-manual-row box-border min-h-[30px] min-w-0 w-full overflow-hidden px-1.5">
          {characterField(row, 'sledExp', 6, 'SLED/EXP')}
        </div>)}
      </div>

      <div className="box-border min-w-0 w-full overflow-hidden border-t border-slate-800 px-1.5 py-1.5">
        <h4 className="mb-1 text-center text-[7px] font-extrabold uppercase tracking-wide">Breakdown Quantity</h4>
        <div className="box-border grid min-w-0 w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-1 overflow-hidden">
          <CalculationField label="No. of Bags / Pallet" field="bagsPerPallet" value={breakdown.bagsPerPallet} editable={editable} onChange={value => onBreakdownChange(side,'bagsPerPallet',value)} />
          <span className="pb-3 text-[10px] font-black">×</span>
          <CalculationField label="No. of Pallets Used" field="palletsUsed" value={breakdown.palletsUsed} editable={editable} onChange={value => onBreakdownChange(side,'palletsUsed',value)} />
          <span className="pb-3 text-[10px] font-black">×</span>
          <CalculationField label="Weight / Bag (kg)" field="weightPerBag" value={breakdown.weightPerBag} editable={editable} onChange={value => onBreakdownChange(side,'weightPerBag',value)} />
          <span className="pb-3 text-[10px] font-black">=</span>
          <CalculationField label="Total Quantity (kg)" field="totalQuantity" value={breakdown.totalQuantity} editable={editable} onChange={value => onBreakdownChange(side,'totalQuantity',value)} />
        </div>
      </div>
    </div>
  );
};

const CalculationField: React.FC<{
  label: string; field: string; value: string; editable: boolean; onChange: (value: string) => void;
}> = ({ label, field, value, editable, onChange }) => (
  <div className="box-border min-w-0 w-full">
    <label htmlFor={`breakdown-${field}`} className="block min-h-[22px] text-center text-[6px] font-extrabold uppercase leading-tight">{label}</label>
    {editable ? <input id={`breakdown-${field}`} type="number" min="0" step="any" value={value} onChange={event => onChange(event.target.value)} className="log-entry-calculation-box box-border min-h-[38px] min-w-0 w-full border border-slate-800 bg-white px-1 text-center text-[9px]" />
      : <div className="log-entry-calculation-box min-h-[38px] border border-slate-800 px-1 text-center text-[9px] font-bold leading-[38px]">{value}</div>}
  </div>
);

export const LogEntryPrintModal: React.FC<LogEntryPrintModalProps> = ({ entry, onClose, onSaveArchive }) => {
  const [displayEntry, setDisplayEntry] = useState<LogEntry | null>(entry);
  const [draft, setDraft] = useState<LogEntryCompletionInput>(defaultCompletion);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setDisplayEntry(entry);
    setDraft(entry ? completionFromEntry(entry) : defaultCompletion());
    setEditing(false);
    setError('');
  }, [entry?.id]);

  const currentEntry = displayEntry?.id === entry?.id ? displayEntry : entry;
  const dwellMinutes = dwellForTimes(draft.gateIn, draft.unloadingEnd);
  if (!currentEntry) return null;

  const field = (label: string, value: string, className = '') => (
    <div className={`${fieldCell} ${className}`}>
      <p className={rowLabel}>{label}</p>
      <p className="mt-1 min-h-4 break-words text-[11px] font-bold text-slate-900">{display(value)}</p>
    </div>
  );
  const blankField = (label: string, value: string, editable: boolean, className = '', onChange?: (value: string) => void) => (
    <div className={`${fieldCell} ${className}`}>
      <p className={rowLabel}>{label}</p>
      {editable ? <input aria-label={label} type={label === 'Dwell time' ? 'text' : 'time'} value={label === 'Dwell time' ? duration(dwellMinutes) : value} readOnly={label === 'Dwell time'} onChange={event => onChange?.(event.target.value)} className="box-border mt-1 min-h-4 min-w-0 w-full bg-transparent text-[10px] font-bold text-slate-900 outline-none" />
        : <p className="mt-1 min-h-4 text-[10px] font-bold text-slate-900">{display(label === 'Dwell time' ? duration(currentEntry.dwellMinutes) : value)}</p>}
    </div>
  );

  const setInspection = (fieldName: InspectionField, value: 'OK' | 'NOT OK') => setDraft(current => ({ ...current, [fieldName]: value }));
  const setDelivery = (fieldName: 'gateIn' | 'unloadingStart' | 'unloadingEnd', value: string) => setDraft(current => ({ ...current, [fieldName]: value }));
  const setBatchCharacter = (side: Side, row: number, fieldName: BatchField, index: number, char: string) => {
    setDraft(current => {
      const rows = current.batchDetails[side].map(item => ({ ...item }));
      const oldValue = rows[row][fieldName];
      const chars = Array.from({ length: fieldName === 'batchCode' ? 10 : 6 }, (_, i) => oldValue[i] || '');
      chars[index] = char;
      rows[row][fieldName] = chars.join('').replace(/\s+$/,'');
      return { ...current, batchDetails: { ...current.batchDetails, [side]: rows } };
    });
  };
  const setBreakdown = (side: Side, fieldName: BreakdownField, value: string) => {
    setDraft(current => {
      const nextSide = { ...current.breakdown[side], [fieldName]: value };
      if (fieldName !== 'totalQuantity') {
        const factors = [nextSide.bagsPerPallet,nextSide.palletsUsed,nextSide.weightPerBag];
        nextSide.totalQuantity = factors.every(factor => factor !== '')
          ? String(Number(nextSide.bagsPerPallet)*Number(nextSide.palletsUsed)*Number(nextSide.weightPerBag)) : '';
      }
      return { ...current, breakdown: { ...current.breakdown, [side]: nextSide } };
    });
  };

  const startEditing = () => {
    setDraft(completionFromEntry(currentEntry));
    setError('');
    setEditing(true);
  };
  const cancelEditing = () => {
    setDraft(completionFromEntry(currentEntry));
    setError('');
    setEditing(false);
  };
  const saveAndArchive = async () => {
    setSaving(true);
    setError('');
    try {
      const saved = await onSaveArchive(currentEntry.id, draft);
      setDisplayEntry(saved);
      setDraft(completionFromEntry(saved));
      setEditing(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not archive this form.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="log-entry-print-modal fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:p-5">
      <div className="log-entry-print-panel my-auto w-full max-w-4xl rounded-xl bg-white shadow-2xl">
        <div className="log-entry-screen-only flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
          <div><h3 className="font-heading text-lg font-bold uppercase text-slate-900">Pre-Print Form Preview</h3><p className="text-xs text-slate-500">Saved as {currentEntry.uniqueCode}{currentEntry.status === 'Archived' ? ' · Archived' : ''}</p></div>
          <div className="flex flex-wrap gap-2">
            {!editing && currentEntry.status !== 'Archived' && <button type="button" onClick={startEditing} className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Pencil className="h-4 w-4" />Edit</button>}
            {editing && <>
              <button type="button" disabled={saving} onClick={saveAndArchive} className="flex items-center gap-2 rounded-lg bg-[#0A5C1D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#084917] disabled:opacity-60"><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save & Archive'}</button>
              <button type="button" disabled={saving} onClick={cancelEditing} className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"><Ban className="h-4 w-4" />Cancel</button>
            </>}
            <button type="button" onClick={() => window.print()} className="flex items-center gap-2 rounded-lg bg-[#222222] px-4 py-2 text-sm font-semibold text-white hover:bg-black"><Printer className="h-4 w-4" />Print Now</button>
            <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
          </div>
        </div>
        {error && <p role="alert" className="log-entry-screen-only mx-5 mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

        <article id="log-entry-print" className="m-4 border border-slate-800 bg-white text-slate-900 sm:m-7">
          <header className="flex items-center justify-between gap-4 border-b border-slate-800 bg-[#0A5C1D] px-5 py-3 text-white print:bg-[#0A5C1D]">
            <div><p className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/80">ARMS · Authority to Receive</p><h1 className="mt-1 font-heading text-lg font-extrabold uppercase tracking-wide">AUTHORITY TO RECEIVE</h1></div>
            <div className="shrink-0 text-right"><p className="text-[8px] font-bold uppercase tracking-[0.15em] text-white/80">Unique Code</p><p className="mt-1 font-mono text-lg font-black tracking-wider">{currentEntry.uniqueCode}</p></div>
          </header>

          <div className="border-b border-slate-800 px-3 py-1.5"><p className={rowLabel}>Select Transaction</p><p className="mt-0.5 text-[11px] font-bold">{currentEntry.transactionType}</p></div>

          <section className="grid grid-cols-2 border-l border-slate-800">
            {field('MATERIAL No.', currentEntry.materialNumber, 'col-span-2 border-r-0')}
            {field('MATERIAL DESCRIPTION', currentEntry.materialDescription, 'col-span-2 border-r-0')}
            {field('DATE', currentEntry.date)}{field('PO / OBD No.', currentEntry.po, 'border-r-0')}
            {field('DR/INV No.', currentEntry.drInvNumber)}{field('PRO No. (PRD No.)', currentEntry.proNumber, 'border-r-0')}
            {field('VAM No.', currentEntry.vamNumber)}{field('PL/CV No.', currentEntry.plateNumber, 'border-r-0')}
            {field('Operator', currentEntry.operator, 'col-span-2 border-r-0')}
          </section>

          <section className="border-b border-slate-800">
            <h2 className="border-y border-slate-800 bg-slate-100 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em]">Inspection Checklist</h2>
            <table className="w-full border-collapse text-xs">
              <thead><tr className="bg-slate-50 text-[8px] font-extrabold uppercase tracking-wider"><th className="border-b border-r border-slate-800 px-3 py-1 text-left">Condition</th><th className="w-16 border-b border-r border-slate-800 px-2 py-1 text-center">OK</th><th className="w-20 border-b border-slate-800 px-2 py-1 text-center">NOT OK</th></tr></thead>
              <tbody>{inspections.map(item => <tr key={item.field}>
                <th scope="row" className="border-b border-r border-slate-800 px-3 py-1 text-left text-[8px] font-bold uppercase tracking-wide">{item.label}</th>
                {(['OK','NOT OK'] as const).map(value => <td key={value} className="h-5 border-b border-r border-slate-800 px-2 py-1 text-center text-sm font-black last:border-r-0">
                  {editing ? <label className="flex h-full min-w-0 items-center justify-center"><input type="radio" name={`inspection-${item.field}`} checked={draft[item.field]===value} onChange={()=>setInspection(item.field,value)} className="box-border min-w-0 h-3 w-3 accent-[#0A5C1D]" /></label>
                    : currentEntry[item.field]===value ? '✓' : ''}
                </td>)}
              </tr>)}</tbody>
            </table>
          </section>

          <section className="border-b border-slate-800">
            <h2 className="border-b border-slate-800 bg-slate-100 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em]">Delivery truck</h2>
            <div className="grid grid-cols-4">
              {blankField('Gate In',editing?draft.gateIn:(currentEntry.gateIn||''),editing,'',value=>setDelivery('gateIn',value))}
              {blankField('Unloading Start',editing?draft.unloadingStart:(currentEntry.unloadingStart||''),editing,'',value=>setDelivery('unloadingStart',value))}
              {blankField('Unloading End',editing?draft.unloadingEnd:(currentEntry.unloadingEnd||''),editing,'',value=>setDelivery('unloadingEnd',value))}
              {blankField('Dwell time','',editing,'border-r-0')}
            </div>
          </section>

          <div className="flex justify-between gap-2 px-2 py-1 text-[7px] text-slate-500"><p>Created: {timestamp(currentEntry.createdAt)}</p><p>Prepared by: {display(currentEntry.createdBy)}</p></div>

          <section className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] overflow-hidden border-b border-slate-800">
            {(['left','right'] as const).map(side => <ManualBatchBlock key={side} side={side} rows={draft.batchDetails[side]} breakdown={draft.breakdown[side]} editable={editing} onBatchChange={setBatchCharacter} onBreakdownChange={setBreakdown} />)}
          </section>

          <section className="border-b border-slate-800">
            <h2 className="px-2 py-1 text-[8px] font-extrabold uppercase tracking-[0.12em]">REMARKS</h2>
            {editing ? <textarea value={draft.remarks} onChange={event=>setDraft(current=>({...current,remarks:event.target.value}))} aria-label="Remarks" className="log-entry-remarks h-[54px] w-full resize-y border-t border-slate-800 px-2 py-1 text-[10px] outline-none" />
              : <div className="log-entry-remarks min-h-[54px] border-t border-slate-800 px-2 py-1 text-[10px] whitespace-pre-wrap">{currentEntry.remarks}</div>}
          </section>

          <section className="grid grid-cols-5 border-t border-slate-800">
            {[
              ['TEST WEIGHT', ''], ['MATERIAL DOC', ''],
              ['DELIVERY BY', 'TRUCKERS REPRESENTATIVE / SIGNATURE OVER PRINTED NAME'],
              ['CHECKED BY', 'SIGNATURE OVER PRINTED NAME'], ['POSTED BY', 'SIGNATURE OVER PRINTED NAME'],
            ].map(([label, sublabel]) => <div key={label} className="log-entry-signature-box flex min-h-[75px] flex-col border-r border-slate-800 px-1.5 py-1.5 text-center last:border-r-0">
              <span className="text-[7px] font-extrabold uppercase tracking-wide">{label}</span><span className="flex-1" />
              {sublabel && <span className="text-[5px] font-semibold uppercase leading-tight">{sublabel}</span>}
            </div>)}
          </section>
        </article>
      </div>
    </div>
  );
};
