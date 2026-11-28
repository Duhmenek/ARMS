import React from 'react';
import { LogEntry } from '../../types';
import { Printer, X } from 'lucide-react';

interface LogEntryPrintModalProps {
  entry: LogEntry | null;
  onClose: () => void;
}

const display = (value?: string | null) => value?.trim() || '—';
const timestamp = (value: string) => {
  const parsed = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
};
const dwell = (minutes: number | null) => {
  if (minutes === null || minutes === undefined) return '—';
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? `${hours} hr ${remainder} min` : `${remainder} min`;
};

const fieldCell = 'log-entry-print-cell min-h-[42px] border-b border-r border-slate-800 px-2.5 py-1.5';
const rowLabel = 'text-[8px] font-extrabold uppercase tracking-[0.08em] text-slate-600';

const CharacterBoxes: React.FC<{ count: number }> = ({ count }) => (
  <span className="log-entry-character-row" aria-hidden="true">
    {Array.from({ length: count }, (_, index) => <i key={index} />)}
  </span>
);

const BlankQtyBox: React.FC = () => <span className="log-entry-qty-box" aria-hidden="true" />;

const ManualBatchBlock: React.FC = () => (
  <div className="min-w-0 border-r border-slate-800 last:border-r-0">
    <h3 className="border-b border-slate-800 bg-slate-100 px-2 py-1.5 text-center text-[9px] font-extrabold uppercase tracking-[0.12em]">BATCH</h3>
    <div className="divide-y divide-slate-800">
      {Array.from({ length: 3 }, (_, row) => <div key={`batch-${row}`} className="log-entry-manual-row flex min-h-[25px] items-center justify-center px-1"><CharacterBoxes count={10} /></div>)}
    </div>

    <div className="grid grid-cols-[1fr_auto] border-y border-slate-800 bg-slate-100 px-1.5 py-1 text-[7px] font-extrabold uppercase leading-tight">
      <span>MFG DATE (DD-MM-YY) / SAP / PL/COI</span><span className="text-center">BREAKDOWN QTY</span>
    </div>
    <div className="divide-y divide-slate-800">
      {['MFG DATE (DD-MM-YY)', 'SAP', 'PL/COI'].map((label, row) => <div key={`mfg-${row}`} className="log-entry-manual-row grid min-h-[25px] grid-cols-[1fr_auto] items-center gap-1 px-1.5">
        <div className="flex min-w-0 items-center gap-1"><span className="w-[33px] shrink-0 text-[6px] font-bold leading-none">{label}</span><CharacterBoxes count={6} /></div>
        <BlankQtyBox />
      </div>)}
    </div>

    <div className="grid grid-cols-[1fr_auto] border-y border-slate-800 bg-slate-100 px-1.5 py-1 text-[7px] font-extrabold uppercase leading-tight">
      <span>SLED/EXP (DD-MM-YY)</span><span className="text-center">TOTAL QTY</span>
    </div>
    <div className="divide-y divide-slate-800">
      {Array.from({ length: 3 }, (_, row) => <div key={`sled-${row}`} className="log-entry-manual-row grid min-h-[25px] grid-cols-[1fr_auto] items-center gap-1 px-1.5">
        <CharacterBoxes count={6} /><BlankQtyBox />
      </div>)}
    </div>
  </div>
);

export const LogEntryPrintModal: React.FC<LogEntryPrintModalProps> = ({ entry, onClose }) => {
  if (!entry) return null;

  const inspections: { label: string; value: 'OK' | 'NOT OK' | '' }[] = [
    { label: 'MATERIAL CONDITION', value: entry.materialCondition },
    { label: 'TRUCK/CV CONDITION', value: entry.truckCvCondition },
    { label: 'NO INFESTATION', value: entry.noInfestation },
    { label: 'TRUCK/CV ODOR', value: entry.truckCvOdor },
    { label: 'TRUCK/CV SEAL', value: entry.truckCvSeal },
  ];

  const field = (label: string, value: string, className = '') => (
    <div className={`${fieldCell} ${className}`}>
      <p className={rowLabel}>{label}</p>
      <p className="mt-1 min-h-4 break-words text-[11px] font-bold text-slate-900">{display(value)}</p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:p-5">
      <div className="my-auto w-full max-w-4xl rounded-xl bg-white shadow-2xl">
        <div className="log-entry-screen-only flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div><h3 className="font-heading text-lg font-bold uppercase text-slate-900">Pre-Print Form Preview</h3><p className="text-xs text-slate-500">Saved as {entry.uniqueCode}</p></div>
          <div className="flex gap-2">
            <button type="button" onClick={() => window.print()} className="flex items-center gap-2 rounded-lg bg-[#222222] px-4 py-2 text-sm font-semibold text-white hover:bg-black"><Printer className="h-4 w-4" />Print Now</button>
            <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
          </div>
        </div>

        <article id="log-entry-print" className="m-4 border border-slate-800 bg-white text-slate-900 sm:m-7">
          <header className="flex items-center justify-between gap-4 border-b border-slate-800 bg-[#0A5C1D] px-5 py-3 text-white print:bg-[#0A5C1D]">
            <div><p className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/80">ARMS · Authority to Receive</p><h1 className="mt-1 font-heading text-lg font-extrabold uppercase tracking-wide">AUTHORITY TO RECEIVE</h1></div>
            <div className="shrink-0 text-right"><p className="text-[8px] font-bold uppercase tracking-[0.15em] text-white/80">Unique Code</p><p className="mt-1 font-mono text-lg font-black tracking-wider">{entry.uniqueCode}</p></div>
          </header>

          <div className="border-b border-slate-800 px-3 py-1.5">
            <p className={rowLabel}>Select Transaction</p>
            <p className="mt-0.5 text-[11px] font-bold">{entry.transactionType}</p>
          </div>

          <section className="grid grid-cols-2 border-l border-slate-800">
            {field('MATERIAL No.', entry.materialNumber, 'col-span-2 border-r-0')}
            {field('MATERIAL DESCRIPTION', entry.materialDescription, 'col-span-2 border-r-0')}
            {field('DATE', entry.date)}
            {field('PO / OBD No.', entry.po, 'border-r-0')}
            {field('DR/INV No.', entry.drInvNumber)}
            {field('PRO No.', entry.proNumber, 'border-r-0')}
            {field('VAM No.', entry.vamNumber)}
            {field('PL/CV No.', entry.plateNumber, 'border-r-0')}
            {field('Operator', entry.operator, 'col-span-2 border-r-0')}
          </section>

          <section className="border-b border-slate-800">
            <h2 className="border-y border-slate-800 bg-slate-100 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em]">Inspection Checklist</h2>
            <table className="w-full border-collapse text-xs">
              <thead><tr className="bg-slate-50 text-[8px] font-extrabold uppercase tracking-wider"><th className="border-b border-r border-slate-800 px-3 py-1 text-left">Condition</th><th className="w-16 border-b border-r border-slate-800 px-2 py-1 text-center">OK</th><th className="w-20 border-b border-slate-800 px-2 py-1 text-center">NOT OK</th></tr></thead>
              <tbody>{inspections.map(item => <tr key={item.label}>
                <th scope="row" className="border-b border-r border-slate-800 px-3 py-1 text-left text-[8px] font-bold uppercase tracking-wide">{item.label}</th>
                <td className="border-b border-r border-slate-800 px-2 py-1 text-center text-sm font-black">{item.value === 'OK' ? '✓' : ''}</td>
                <td className="border-b border-slate-800 px-2 py-1 text-center text-sm font-black">{item.value === 'NOT OK' ? '✓' : ''}</td>
              </tr>)}</tbody>
            </table>
          </section>

          <section className="border-b border-slate-800">
            <h2 className="border-b border-slate-800 bg-slate-100 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em]">Delivery truck</h2>
            <div className="grid grid-cols-4">
              {field('Gate In', entry.gateIn)}
              {field('Unloading Start', entry.unloadingStart)}
              {field('Unloading End', entry.unloadingEnd)}
              {field('Dwell time', dwell(entry.dwellMinutes), 'border-r-0')}
            </div>
          </section>

          <div className="flex justify-between gap-2 px-2 py-1 text-[7px] text-slate-500">
            <p>Created: {timestamp(entry.createdAt)}</p><p>Prepared by: {display(entry.createdBy)}</p>
          </div>

          <section className="grid grid-cols-2 border-b border-slate-800">
            <ManualBatchBlock />
            <ManualBatchBlock />
          </section>

          <section className="border-b border-slate-800">
            <h2 className="px-2 py-1 text-[8px] font-extrabold uppercase tracking-[0.12em]">REMARKS</h2>
            <div className="log-entry-remarks h-[54px] border-t border-slate-800" />
          </section>

          <section className="grid grid-cols-5 border-t border-slate-800">
            {[
              ['TEST WEIGHT', ''],
              ['MATERIAL DOC', ''],
              ['DELIVERY BY', 'TRUCKERS REPRESENTATIVE / SIGNATURE OVER PRINTED NAME'],
              ['CHECKED BY', 'SIGNATURE OVER PRINTED NAME'],
              ['POSTED BY', 'SIGNATURE OVER PRINTED NAME'],
            ].map(([label, sublabel]) => <div key={label} className="log-entry-signature-box flex min-h-[75px] flex-col border-r border-slate-800 px-1.5 py-1.5 text-center last:border-r-0">
              <span className="text-[7px] font-extrabold uppercase tracking-wide">{label}</span>
              <span className="flex-1" />
              {sublabel && <span className="text-[5px] font-semibold uppercase leading-tight">{sublabel}</span>}
            </div>)}
          </section>
        </article>
      </div>
    </div>
  );
};
