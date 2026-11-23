import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { ReportType } from '../../types';
import {
  DownloadCloud,
  Calendar,
  FileSpreadsheet,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FolderMinus,
  Layers,
  ArrowRight
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { files, notifications, dailyLogs, showToast } = useApp();

  const [activeReport, setActiveReport] = useState<ReportType>('borrow');
  const [startDate, setStartDate] = useState('01 11 2026');
  const [endDate, setEndDate] = useState('23 11 2026');

  // Report 1: Borrow Reports Data
  const borrowRecords = useMemo(() => {
    return files.filter(f => f.status === 'Borrowed' || f.borrowInfo !== undefined);
  }, [files]);

  // Report 2: Retention Reports Data
  const retentionRecords = useMemo(() => {
    return files.map(f => ({
      armsRef: f.armsRef,
      location: f.location.code,
      transactionType: f.transactionType,
      grDate: f.grDate,
      retentionDate: f.retentionDate,
      retentionStatus: f.retentionStatus,
      custodian: f.custodian
    }));
  }, [files]);

  // Report 3: On-Time Encoding Compliance Data
  const complianceData = [
    { metric: 'IFT Deliveries Encoding (Within 2 hrs)', target: '98.0%', actual: '99.2%', status: 'Compliant' },
    { metric: 'Local Resupply Dispatch Documentation', target: '95.0%', actual: '96.8%', status: 'Compliant' },
    { metric: 'Scrap Certificate & Manifest Filing', target: '100.0%', actual: '100.0%', status: 'Compliant' },
    { metric: 'Daily Shift Log Count Closure', target: '100.0%', actual: '97.5%', status: 'Compliant' },
    { metric: 'Physical Grid Indexing Accuracy (A01-D04)', target: '99.5%', actual: '99.8%', status: 'Compliant' },
    { metric: 'Requisition Chain-of-Custody Turnaround', target: '< 4 hrs', actual: '1.8 hrs', status: 'Optimal' }
  ];

  // Report 4: Document Master Inventory Data
  const masterRecords = useMemo(() => {
    return files;
  }, [files]);

  // CSV Generator function
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = `ARMS_${activeReport.toUpperCase()}_REPORT_${new Date().toISOString().slice(0, 10)}.csv`;

    if (activeReport === 'borrow') {
      headers = ['ARMS Reference', 'Location Code', 'Transaction Series', 'Borrower Name', 'Designation', 'Audit Purpose', 'Request Date', 'Status'];
      rows = borrowRecords.map(f => [
        `"${f.armsRef}"`,
        `"${f.location.code}"`,
        `"${f.borrowInfo?.transactionSeries || 'N/A'}"`,
        `"${f.borrowInfo?.borrowerName || 'N/A'}"`,
        `"${f.borrowInfo?.designation || 'N/A'}"`,
        `"${f.borrowInfo?.purpose || 'N/A'}"`,
        `"${f.borrowInfo?.requestDate || f.grDate}"`,
        `"${f.status}"`
      ]);
    } else if (activeReport === 'retention') {
      headers = ['ARMS Reference', 'Location Code', 'Transaction Type', 'GR Date', 'Retention / Disposal Due', 'Retention Lifecycle Status', 'Custodian'];
      rows = retentionRecords.map(r => [
        `"${r.armsRef}"`,
        `"${r.location}"`,
        `"${r.transactionType}"`,
        `"${r.grDate}"`,
        `"${r.retentionDate}"`,
        `"${r.retentionStatus}"`,
        `"${r.custodian}"`
      ]);
    } else if (activeReport === 'compliance') {
      headers = ['Encoding SLA / Compliance Metric', 'SLA Target', 'Actual Performance', 'Status'];
      rows = complianceData.map(c => [
        `"${c.metric}"`,
        `"${c.target}"`,
        `"${c.actual}"`,
        `"${c.status}"`
      ]);
    } else {
      headers = ['ARMS Reference', 'Location Code', 'Zone', 'Transaction Type', 'Material Doc', 'PO/DO', 'GR Date', 'Material Number', 'Packages', 'Status', 'Custodian'];
      rows = masterRecords.map(m => [
        `"${m.armsRef}"`,
        `"${m.location.code}"`,
        `"${m.location.zone}"`,
        `"${m.transactionType}"`,
        `"${m.materialDoc}"`,
        `"${m.deliveryPo}"`,
        `"${m.grDate}"`,
        `"${m.materialNumber}"`,
        `"${m.numPackages}"`,
        `"${m.status}"`,
        `"${m.custodian}"`
      ]);
    }

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${filename} successfully!`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Bar: "Export" button and Date Range inputs (`DD MM YYYY` to `DD MM YYYY`) */}
      <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-bold uppercase tracking-wider text-slate-900">
            DOWNLOAD REPORTS & LIFECYCLE COMPLIANCE
          </h2>
          <p className="text-xs text-slate-500">
            Generate and export official audit trails, circulation logs, and retention schedules
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Range inputs (`DD MM YYYY` to `DD MM YYYY`) */}
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs">
            <Calendar className="w-4 h-4 text-[#0A5C1D]" />
            <input
              type="text"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              placeholder="01 11 2026"
              className="w-20 bg-transparent text-slate-800 font-semibold focus:outline-none text-center"
            />
            <span className="text-slate-400 font-bold">to</span>
            <input
              type="text"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              placeholder="23 11 2026"
              className="w-20 bg-transparent text-slate-800 font-semibold focus:outline-none text-center"
            />
          </div>

          {/* "Export" Button (Dark button) */}
          <button
            onClick={handleExportCSV}
            className="px-5 py-2 rounded-lg bg-[#222222] hover:bg-black text-white font-heading text-sm font-bold uppercase tracking-wider flex items-center space-x-2 transition-colors shadow-sm"
          >
            <DownloadCloud className="w-4 h-4 text-[#A8E0A8]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 2x2 Report Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {/* Card 1: BORROW REPORTS */}
        <div
          onClick={() => setActiveReport('borrow')}
          className={`p-5 rounded-xl border cursor-pointer transition-all ${
            activeReport === 'borrow'
              ? 'bg-white border-[#0A5C1D] ring-2 ring-[#0A5C1D]/20 shadow-md'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                activeReport === 'borrow' ? 'bg-[#0A5C1D] text-[#A8E0A8]' : 'bg-rose-50 text-rose-600'
              }`}>
                <FolderMinus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold uppercase tracking-wider text-slate-900">
                  BORROW REPORTS
                </h3>
                <p className="text-xs text-slate-500">
                  Circulation logs, borrower history, overdue items
                </p>
              </div>
            </div>
            {activeReport === 'borrow' && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#0A5C1D] text-white">
                Active Preview
              </span>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Circulating Files</span>
              <span className="font-heading font-black text-slate-900 text-base">
                {borrowRecords.filter(f => f.status === 'Borrowed').length} active
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Total History</span>
              <span className="font-heading font-black text-slate-900 text-base">
                {borrowRecords.length} records
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Audit Inquiries</span>
              <span className="font-heading font-black text-[#0A5C1D] text-base">100% Logged</span>
            </div>
          </div>
        </div>

        {/* Card 2: RETENTION REPORTS */}
        <div
          onClick={() => setActiveReport('retention')}
          className={`p-5 rounded-xl border cursor-pointer transition-all ${
            activeReport === 'retention'
              ? 'bg-white border-[#0A5C1D] ring-2 ring-[#0A5C1D]/20 shadow-md'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                activeReport === 'retention' ? 'bg-[#0A5C1D] text-[#A8E0A8]' : 'bg-emerald-50 text-emerald-700'
              }`}>
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold uppercase tracking-wider text-slate-900">
                  RETENTION REPORTS
                </h3>
                <p className="text-xs text-slate-500">
                  Active vs semi-active records, upcoming disposal/expiry alerts
                </p>
              </div>
            </div>
            {activeReport === 'retention' && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#0A5C1D] text-white">
                Active Preview
              </span>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Active Records</span>
              <span className="font-heading font-black text-slate-900 text-base">
                {files.filter(f => f.retentionStatus === 'Active').length} files
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Near Expiry</span>
              <span className="font-heading font-black text-amber-600 text-base">
                {files.filter(f => f.retentionStatus === 'Near Expiry').length} alerts
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Disposal Due</span>
              <span className="font-heading font-black text-rose-600 text-base">
                {files.filter(f => f.retentionStatus === 'Disposal Due').length} pending
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: ON-TIME ENCODING COMPLIANCE */}
        <div
          onClick={() => setActiveReport('compliance')}
          className={`p-5 rounded-xl border cursor-pointer transition-all ${
            activeReport === 'compliance'
              ? 'bg-white border-[#0A5C1D] ring-2 ring-[#0A5C1D]/20 shadow-md'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                activeReport === 'compliance' ? 'bg-[#0A5C1D] text-[#A8E0A8]' : 'bg-blue-50 text-blue-700'
              }`}>
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold uppercase tracking-wider text-slate-900">
                  ON-TIME ENCODING COMPLIANCE
                </h3>
                <p className="text-xs text-slate-500">
                  Encoding turnaround metrics vs target SLAs
                </p>
              </div>
            </div>
            {activeReport === 'compliance' && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#0A5C1D] text-white">
                Active Preview
              </span>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">IFT Encoding Rate</span>
              <span className="font-heading font-black text-[#0A5C1D] text-base">99.2%</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Avg Turnaround</span>
              <span className="font-heading font-black text-slate-900 text-base">1.8 hrs</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">SLA Performance</span>
              <span className="font-heading font-black text-emerald-700 text-base">Above Target</span>
            </div>
          </div>
        </div>

        {/* Card 4: DOCUMENT REPORTS */}
        <div
          onClick={() => setActiveReport('documents')}
          className={`p-5 rounded-xl border cursor-pointer transition-all ${
            activeReport === 'documents'
              ? 'bg-white border-[#0A5C1D] ring-2 ring-[#0A5C1D]/20 shadow-md'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                activeReport === 'documents' ? 'bg-[#0A5C1D] text-[#A8E0A8]' : 'bg-slate-100 text-slate-800'
              }`}>
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold uppercase tracking-wider text-slate-900">
                  DOCUMENT REPORTS
                </h3>
                <p className="text-xs text-slate-500">
                  Full master inventory by category, location, and transaction
                </p>
              </div>
            </div>
            {activeReport === 'documents' && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#0A5C1D] text-white">
                Active Preview
              </span>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Master Records</span>
              <span className="font-heading font-black text-slate-900 text-base">{files.length} indexed</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Storage Grids</span>
              <span className="font-heading font-black text-slate-900 text-base">A01 - D04</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Physical Sync</span>
              <span className="font-heading font-black text-[#0A5C1D] text-base">100% Clean</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Preview Table of the Selected Report */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0A5C1D]" />
            <h3 className="font-heading text-lg font-bold uppercase tracking-wider text-slate-900">
              Live Report Preview: {activeReport.toUpperCase()}
            </h3>
          </div>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-1.5 rounded-lg bg-[#0A5C1D] hover:bg-[#147426] text-white text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-colors"
          >
            <DownloadCloud className="w-3.5 h-3.5 text-[#A8E0A8]" />
            <span>Download CSV</span>
          </button>
        </div>

        {/* Dynamic Table for selected report */}
        <div className="overflow-x-auto">
          {activeReport === 'borrow' && (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-700 uppercase font-bold">
                <tr>
                  <th className="px-3 py-2.5">ARMS Ref.</th>
                  <th className="px-3 py-2.5">Series #</th>
                  <th className="px-3 py-2.5">Borrower Name</th>
                  <th className="px-3 py-2.5">Designation</th>
                  <th className="px-3 py-2.5">Purpose</th>
                  <th className="px-3 py-2.5">Date</th>
                  <th className="px-3 py-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {borrowRecords.map((f, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-bold text-[#0A5C1D]">{f.armsRef}</td>
                    <td className="px-3 py-2 font-mono">{f.borrowInfo?.transactionSeries || 'Series 2026-PRE'}</td>
                    <td className="px-3 py-2 font-semibold text-slate-800">{f.borrowInfo?.borrowerName || 'Staff Requisition'}</td>
                    <td className="px-3 py-2 text-slate-600">{f.borrowInfo?.designation || 'Auditor'}</td>
                    <td className="px-3 py-2 text-slate-700">{f.borrowInfo?.purpose || 'Audit Review'}</td>
                    <td className="px-3 py-2 font-mono text-slate-500">{f.borrowInfo?.requestDate || f.grDate}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        f.status === 'Borrowed' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {f.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeReport === 'retention' && (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-700 uppercase font-bold">
                <tr>
                  <th className="px-3 py-2.5">ARMS Ref.</th>
                  <th className="px-3 py-2.5">Location</th>
                  <th className="px-3 py-2.5">Transaction</th>
                  <th className="px-3 py-2.5">GR Date</th>
                  <th className="px-3 py-2.5">Retention / Disposal Date</th>
                  <th className="px-3 py-2.5">Custodian</th>
                  <th className="px-3 py-2.5 text-right">Lifecycle Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {retentionRecords.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-bold text-[#0A5C1D]">{r.armsRef}</td>
                    <td className="px-3 py-2 font-mono font-bold">{r.location}</td>
                    <td className="px-3 py-2 text-slate-700">{r.transactionType}</td>
                    <td className="px-3 py-2 font-mono text-slate-600">{r.grDate}</td>
                    <td className="px-3 py-2 font-mono font-bold text-slate-900">{r.retentionDate}</td>
                    <td className="px-3 py-2 text-slate-800">{r.custodian}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        r.retentionStatus === 'Active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : r.retentionStatus === 'Near Expiry'
                          ? 'bg-amber-100 text-amber-800'
                          : r.retentionStatus === 'Disposal Due'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {r.retentionStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeReport === 'compliance' && (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-700 uppercase font-bold">
                <tr>
                  <th className="px-3 py-2.5">Compliance & Encoding Standard</th>
                  <th className="px-3 py-2.5">Target SLA</th>
                  <th className="px-3 py-2.5">Current Shift Performance</th>
                  <th className="px-3 py-2.5 text-right">Audit Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {complianceData.map((c, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 font-semibold text-slate-900">{c.metric}</td>
                    <td className="px-3 py-2.5 font-mono text-slate-600">{c.target}</td>
                    <td className="px-3 py-2.5 font-mono font-bold text-[#0A5C1D]">{c.actual}</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeReport === 'documents' && (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-700 uppercase font-bold">
                <tr>
                  <th className="px-3 py-2.5">ARMS Ref.</th>
                  <th className="px-3 py-2.5">Location</th>
                  <th className="px-3 py-2.5">Transaction Type</th>
                  <th className="px-3 py-2.5">Mat Doc</th>
                  <th className="px-3 py-2.5">PO / DO</th>
                  <th className="px-3 py-2.5">GR Date</th>
                  <th className="px-3 py-2.5">Packages</th>
                  <th className="px-3 py-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {masterRecords.slice(0, 10).map((m, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-bold text-[#0A5C1D]">{m.armsRef}</td>
                    <td className="px-3 py-2 font-mono font-bold">{m.location.code}</td>
                    <td className="px-3 py-2 text-slate-700">{m.transactionType}</td>
                    <td className="px-3 py-2 font-mono text-slate-600">{m.materialDoc}</td>
                    <td className="px-3 py-2 font-mono text-slate-600">{m.deliveryPo}</td>
                    <td className="px-3 py-2 font-mono">{m.grDate}</td>
                    <td className="px-3 py-2 font-bold text-slate-800">{m.numPackages}</td>
                    <td className="px-3 py-2 text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-800">
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
