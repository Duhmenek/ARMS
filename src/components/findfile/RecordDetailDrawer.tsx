import React from 'react';
import { useApp } from '../../context/AppContext';
import { FileRecord, LogEntry } from '../../types';
import {
  X,
  MapPin,
  Calendar,
  User,
  ShieldCheck,
  FolderMinus,
  RotateCcw,
  CheckCircle2,
  Clock,
  Truck,
  Hash,
  AlertTriangle,
  Printer
} from 'lucide-react';

interface RecordDetailDrawerProps {
  record: FileRecord | null;
  onClose: () => void;
  onRequestBorrow: (record: FileRecord) => void;
  onOpenArchivedForm: (entry: LogEntry) => void;
}

export const RecordDetailDrawer: React.FC<RecordDetailDrawerProps> = ({
  record,
  onClose,
  onRequestBorrow,
  onOpenArchivedForm
}) => {
  const { returnBorrowedFile, currentUser } = useApp();

  if (!record) return null;

  const isBorrowed = record.status === 'Borrowed';
  const isPending = record.status === 'Pending';

  const handleReturn = () => {
    returnBorrowedFile(record.armsRef);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-xl h-full shadow-2xl overflow-y-auto flex flex-col justify-between border-l border-slate-200">
        <div>
          {/* Top Bar with Status Header */}
          <div className="p-6 bg-[#0A5C1D] text-white flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-[#A8E0A8]">
                ARCHIVE RECORD INSPECTION
              </div>
              <h2 className="font-heading text-3xl font-black tracking-wider uppercase text-white mt-0.5">
                {record.armsRef}
              </h2>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-black/20 hover:bg-black/40 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Tag Bar */}
          <div className="px-6 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-500 uppercase">Storage Location:</span>
              <span className="px-2.5 py-0.5 rounded font-heading font-black text-sm bg-white border border-slate-300 text-[#0A5C1D]">
                {record.location.code} · {record.location.zone}
              </span>
            </div>

            {/* Status Badge */}
            <div>
              {record.status === 'Available' && (
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-slate-200 text-slate-800">
                  Available
                </span>
              )}
              {record.status === 'Borrowed' && (
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-rose-100 text-rose-700 animate-pulse">
                  Borrowed
                </span>
              )}
              {record.status === 'Pending' && (
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-amber-100 text-amber-800">
                  Pending Approval
                </span>
              )}
            </div>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-6 text-sm">
            {record.archivedLogEntry && (
              <button
                type="button"
                onClick={() => onOpenArchivedForm(record.archivedLogEntry!)}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0A5C1D] px-4 py-3 text-sm font-bold text-white hover:bg-[#084917]"
              >
                <Printer className="h-4 w-4" /> View / Print Authority to Receive
              </button>
            )}
            {/* If Borrowed: Active Custody Alert Card */}
            {isBorrowed && record.borrowInfo && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-3">
                <div className="flex items-center justify-between text-rose-800">
                  <div className="flex items-center space-x-2 font-bold text-xs uppercase tracking-wider">
                    <FolderMinus className="w-4 h-4" />
                    <span>Physical File in Circulation</span>
                  </div>
                  <span className="font-heading font-bold text-xs">
                    {record.borrowInfo.transactionSeries}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-rose-900 pt-1">
                  <div>
                    <span className="text-rose-600 block text-[10px] uppercase font-bold">Borrower</span>
                    <span className="font-semibold">{record.borrowInfo.borrowerName}</span>
                  </div>
                  <div>
                    <span className="text-rose-600 block text-[10px] uppercase font-bold">Designation</span>
                    <span>{record.borrowInfo.designation}</span>
                  </div>
                  <div>
                    <span className="text-rose-600 block text-[10px] uppercase font-bold">Purpose</span>
                    <span className="font-semibold">{record.borrowInfo.purpose}</span>
                  </div>
                  <div>
                    <span className="text-rose-600 block text-[10px] uppercase font-bold">Approved On</span>
                    <span>{record.borrowInfo.approvedDate || record.borrowInfo.requestDate}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Document Attributes Grid */}
            <div>
              <h4 className="font-heading text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
                General Record Metadata
              </h4>
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Transaction Type</span>
                  <span className="font-bold text-slate-800">{record.transactionType}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">GR Date</span>
                  <span className="font-semibold text-slate-800">{record.grDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Material Document</span>
                  <span className="font-semibold text-slate-800">{record.materialDoc}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Delivery / PO</span>
                  <span className="font-semibold text-slate-800">{record.deliveryPo}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Material Number</span>
                  <span className="font-semibold text-slate-800">{record.materialNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Vendor Site</span>
                  <span className="font-semibold text-slate-800">{record.vendorSiteNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">VAM Number</span>
                  <span className="font-semibold text-slate-800">{record.vamNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Freight Order</span>
                  <span className="font-semibold text-slate-800">{record.freightOrder}</span>
                </div>
              </div>
            </div>

            {/* Operations Staff & Logistics */}
            <div>
              <h4 className="font-heading text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
                Warehouse Handlers & Storage Grid
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Custodian</span>
                  <span className="font-semibold text-slate-800">{record.custodian}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Encoder</span>
                  <span className="font-semibold text-slate-800">{record.encoder}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Checker</span>
                  <span className="font-semibold text-slate-800">{record.checker}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Operator</span>
                  <span className="font-semibold text-slate-800">{record.operator}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Plate Number</span>
                  <span className="font-semibold text-slate-800">{record.plateNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Disposal Date</span>
                  <span className="font-semibold text-slate-800">{record.retentionDate}</span>
                </div>
              </div>
            </div>

            {/* Line items table */}
            <div>
              <h4 className="font-heading text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
                Line Items & Batch Verifications ({record.lineItems?.length || 0})
              </h4>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="px-3 py-2">Batch Code</th>
                      <th className="px-3 py-2">Prod Date</th>
                      <th className="px-3 py-2">Exp Date/SLED</th>
                      <th className="px-3 py-2 text-right">Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {record.lineItems?.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono font-bold text-slate-800">{item.batchCode}</td>
                        <td className="px-3 py-2 text-slate-600">{item.prodDate}</td>
                        <td className="px-3 py-2 text-slate-600">{item.expDate}</td>
                        <td className="px-3 py-2 text-right font-semibold text-slate-800">{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Remarks */}
            {record.remarks && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 text-xs">
                <span className="font-bold text-[#0A5C1D] uppercase text-[10px] block mb-1">
                  Deviation & Custody Remarks:
                </span>
                <p className="text-slate-700 leading-relaxed">{record.remarks}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100"
          >
            Close
          </button>

          {/* Action based on status */}
          {isBorrowed ? (
            <button
              onClick={handleReturn}
              className="px-5 py-2.5 rounded-lg bg-[#0A5C1D] hover:bg-[#147426] text-white text-xs font-bold uppercase tracking-wider flex items-center space-x-2 transition-colors shadow-sm"
            >
              <RotateCcw className="w-4 h-4 text-[#A8E0A8]" />
              <span>Check-In / Return File</span>
            </button>
          ) : isPending ? (
            <span className="text-xs text-amber-700 font-semibold px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
              Pending Management Review
            </span>
          ) : (
            <button
              onClick={() => {
                onClose();
                onRequestBorrow(record);
              }}
              className="px-5 py-2.5 rounded-lg bg-[#222222] hover:bg-black text-white text-xs font-bold uppercase tracking-wider flex items-center space-x-2 transition-colors shadow-sm"
            >
              <FolderMinus className="w-4 h-4 text-[#A8E0A8]" />
              <span>+ Requisition / Pull Out</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
