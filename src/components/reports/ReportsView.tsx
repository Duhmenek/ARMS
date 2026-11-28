import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ReportType } from '../../types';
import { api } from '../../services/api';
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
  const { files, borrowRequests, dailyLogs, currentUser, showToast } = useApp();

  const [activeReport, setActiveReport] = useState<ReportType>('borrow');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Report 1: Borrow Reports Data
  const borrowRecords = useMemo(() => {
    return borrowRequests;
  }, [borrowRequests]);

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
  const [complianceData, setComplianceData] = useState<{metric:string;target:string;actual:string;status:string}[]>([]);
  const [storageReport, setStorageReport] = useState<{locations:{zone:string;shelf:string;folder:string;max_capacity:number;occupied:number}[];shelves:{zone:string;shelf:string;capacity:number;occupied:number;occupancy:number;expansionAlert:boolean}[];totalCapacity:number;occupied:number;occupancy:number;expansionAlert:boolean;recommendations:(typeof files[number]&{recommendationReason?:string})[]} | null>(null);
  const [storageForm, setStorageForm] = useState({zone:'',shelf:'',folder:'',maxCapacity:25});
  useEffect(() => {
    api<{encoder:string;day:string;entries:number}[]>('/private/encoding-compliance')
      .then(rows => setComplianceData(rows.map(row=>({metric:row.encoder||'Unassigned',target:row.day,actual:`${row.entries} records`,status:'Tracked'}))))
      .catch(error=>console.error('Could not load encoding compliance:',error));
    api<typeof storageReport>('/private/storage-utilization').then(setStorageReport)
      .catch(error=>console.error('Could not load storage utilization:',error));
  }, [files]);
  const addStorageLocation = async (event:React.FormEvent) => {
    event.preventDefault();
    await api('/private/storage-locations',{method:'POST',headers:{'Content-Type':'application/json','X-ARMS-Request':'1'},body:JSON.stringify(storageForm)});
    setStorageForm({zone:'',shelf:'',folder:'',maxCapacity:25});
    setStorageReport(await api('/private/storage-utilization'));
    showToast('Storage location capacity saved');
  };

  // Report 4: Document Master Inventory Data
  const masterRecords = useMemo(() => {
    return files;
  }, [files]);

  const inDateRange = (value: string) => {
    if (!value) return !startDate && !endDate;
    const normalized = value.includes('/')
      ? value.split('/').reverse().join('-')
      : value.slice(0, 10);
    return (!startDate || normalized >= startDate) && (!endDate || normalized <= endDate);
  };
  const filteredBorrowRecords = useMemo(() => borrowRecords.filter(record => inDateRange(record.requestDate)), [borrowRecords, startDate, endDate]);
  const filteredRetentionRecords = useMemo(() => retentionRecords.filter(record => inDateRange(record.grDate)), [retentionRecords, startDate, endDate]);
  const filteredComplianceData = useMemo(() => complianceData.filter(row => inDateRange(row.target)), [complianceData, startDate, endDate]);
  const filteredMasterRecords = useMemo(() => masterRecords.filter(record => inDateRange(record.grDate)), [masterRecords, startDate, endDate]);

  // CSV Generator function
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = `ARMS_${activeReport.toUpperCase()}_REPORT_${new Date().toISOString().slice(0, 10)}.csv`;

    if (activeReport === 'borrow') {
      headers = ['ARMS Reference', 'Location Code', 'Transaction Series', 'Borrower Name', 'Designation', 'Audit Purpose', 'Request Date', 'Status'];
      rows = filteredBorrowRecords.map(f => [
        `"${f.armsRef}"`, `"${f.fileId}"`, `"${f.transactionSeries}"`,
        `"${f.givenName} ${f.familyName}"`, `"${f.designation}"`, `"${f.purpose}"`,
        `"${f.requestDate}"`, `"${f.status}"`
      ]);
    } else if (activeReport === 'retention') {
      headers = ['ARMS Reference', 'Location Code', 'Transaction Type', 'GR Date', 'Retention / Disposal Due', 'Retention Lifecycle Status', 'Custodian'];
      rows = filteredRetentionRecords.map(r => [
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
      rows = filteredComplianceData.map(c => [
        `"${c.metric}"`,
        `"${c.target}"`,
        `"${c.actual}"`,
        `"${c.status}"`
      ]);
    } else if (activeReport === 'storage') {
      headers = ['Zone','Shelf','Folder','Capacity','Occupied','Occupancy'];
      rows = (storageReport?.locations || []).map(location=>[
        `"${location.zone}"`,`"${location.shelf}"`,`"${location.folder}"`,`"${location.max_capacity}"`,`"${location.occupied}"`,
        `"${location.max_capacity ? Math.round(location.occupied/location.max_capacity*100) : 0}%"`
      ]);
    } else {
      headers = ['ARMS Reference', 'Location Code', 'Zone', 'Transaction Type', 'Material Doc', 'PO/DO', 'GR Date', 'Material Number', 'Packages', 'Status', 'Custodian'];
      rows = filteredMasterRecords.map(m => [
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
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-20 bg-transparent text-slate-800 font-semibold focus:outline-none text-center"
            />
            <span className="text-slate-400 font-bold">to</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
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
                {files.filter(f => f.status === 'Borrowed').length} active
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Total History</span>
              <span className="font-heading font-black text-slate-900 text-base">
                {filteredBorrowRecords.length} records in range
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Audit Inquiries</span>
              <span className="font-heading font-black text-[#0A5C1D] text-base">{filteredBorrowRecords.length} logged</span>
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
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Encoder / Day Rows</span>
              <span className="font-heading font-black text-[#0A5C1D] text-base">{filteredComplianceData.length}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Records Encoded</span>
              <span className="font-heading font-black text-slate-900 text-base">{files.length}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Shift Count Logs</span>
              <span className="font-heading font-black text-emerald-700 text-base">{dailyLogs.length}</span>
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
              <span className="font-heading font-black text-slate-900 text-base">{new Set(files.map(file => file.location.code)).size} locations</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Physical Sync</span>
              <span className="font-heading font-black text-[#0A5C1D] text-base">{files.length} records</span>
            </div>
          </div>
        </div>

        <div onClick={() => setActiveReport('storage')} className={`p-5 rounded-xl border cursor-pointer transition-all ${activeReport === 'storage' ? 'bg-white border-[#0A5C1D] ring-2 ring-[#0A5C1D]/20 shadow-md' : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'}`}>
          <div className="flex items-center space-x-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${activeReport === 'storage' ? 'bg-[#0A5C1D] text-[#A8E0A8]' : 'bg-amber-50 text-amber-700'}`}><Layers className="w-6 h-6" /></div>
            <div><h3 className="font-heading text-lg font-bold uppercase tracking-wider text-slate-900">STORAGE UTILIZATION</h3><p className="text-xs text-slate-500">Shelf capacity, occupancy, expansion alerts, and retention actions</p></div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-xs">
            <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Occupied</span><span className="font-heading font-black text-slate-900 text-base">{storageReport?.occupied || 0}</span></div>
            <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Capacity</span><span className="font-heading font-black text-slate-900 text-base">{storageReport?.totalCapacity || 0}</span></div>
            <div><span className="text-slate-400 block text-[10px] uppercase font-bold">Utilization</span><span className="font-heading font-black text-amber-700 text-base">{storageReport?.occupancy || 0}%</span></div>
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
                {filteredBorrowRecords.map((f, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-bold text-[#0A5C1D]">{f.armsRef}</td>
                    <td className="px-3 py-2 font-mono">{f.transactionSeries}</td>
                    <td className="px-3 py-2 font-semibold text-slate-800">{f.givenName} {f.familyName}</td>
                    <td className="px-3 py-2 text-slate-600">{f.designation}</td>
                    <td className="px-3 py-2 text-slate-700">{f.purpose}</td>
                    <td className="px-3 py-2 font-mono text-slate-500">{f.requestDate}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        f.status === 'Approved' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
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
                {filteredRetentionRecords.map((r, i) => (
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
                {filteredComplianceData.map((c, i) => (
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
                {filteredMasterRecords.slice(0, 10).map((m, i) => (
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

          {activeReport === 'storage' && (
            <div className="space-y-6">
              {currentUser?.role === 'management' && <form onSubmit={addStorageLocation} className="grid grid-cols-1 sm:grid-cols-5 gap-3 rounded-lg border border-slate-200 p-4"><input required placeholder="Zone" value={storageForm.zone} onChange={e=>setStorageForm({...storageForm,zone:e.target.value})} className="rounded-md border border-slate-300 px-3 py-2 text-sm" /><input required placeholder="Shelf" value={storageForm.shelf} onChange={e=>setStorageForm({...storageForm,shelf:e.target.value})} className="rounded-md border border-slate-300 px-3 py-2 text-sm" /><input required placeholder="Folder" value={storageForm.folder} onChange={e=>setStorageForm({...storageForm,folder:e.target.value})} className="rounded-md border border-slate-300 px-3 py-2 text-sm" /><input required type="number" min="1" aria-label="Folder capacity" value={storageForm.maxCapacity} onChange={e=>setStorageForm({...storageForm,maxCapacity:Number(e.target.value)||1})} className="rounded-md border border-slate-300 px-3 py-2 text-sm" /><button className="rounded-md bg-[#0A5C1D] px-3 py-2 text-sm font-bold text-white">Configure Location</button></form>}
              {storageReport?.expansionAlert && <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900">Overall archive storage exceeds the 85% expansion threshold.</div>}
              {!!storageReport?.shelves.some(shelf=>shelf.expansionAlert) && <div className="space-y-2">{storageReport.shelves.filter(shelf=>shelf.expansionAlert).map(shelf=><div key={`${shelf.zone}-${shelf.shelf}`} className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Expansion alert: {shelf.zone} / {shelf.shelf} is {shelf.occupancy}% full ({shelf.occupied}/{shelf.capacity}).</div>)}</div>}
              <div className="overflow-x-auto"><table className="w-full text-xs text-left"><thead className="bg-slate-50 text-slate-700 uppercase font-bold"><tr><th className="px-3 py-2.5">Zone</th><th className="px-3 py-2.5">Shelf</th><th className="px-3 py-2.5">Folder</th><th className="px-3 py-2.5">Capacity</th><th className="px-3 py-2.5">Occupied</th><th className="px-3 py-2.5">Occupancy</th></tr></thead><tbody className="divide-y divide-slate-100">{(storageReport?.locations||[]).map((location,index)=><tr key={`${location.zone}-${location.shelf}-${location.folder}-${index}`}><td className="px-3 py-2">{location.zone}</td><td className="px-3 py-2">{location.shelf}</td><td className="px-3 py-2">{location.folder}</td><td className="px-3 py-2">{location.max_capacity}</td><td className="px-3 py-2">{location.occupied}</td><td className="px-3 py-2">{location.max_capacity?Math.round(location.occupied/location.max_capacity*100):0}%</td></tr>)}</tbody></table></div>
              <div><h4 className="mb-2 font-bold uppercase tracking-wide text-slate-800">Retention reduction recommendations</h4><p className="mb-3 text-xs text-slate-500">Review oldest semi-active and near-expiry files for retention reduction or approved disposal.</p><div className="overflow-x-auto"><table className="w-full text-xs text-left"><thead className="bg-slate-50 text-slate-700 uppercase font-bold"><tr><th className="px-3 py-2">ARMS Ref.</th><th className="px-3 py-2">Location</th><th className="px-3 py-2">GR Date</th><th className="px-3 py-2">Review Reason</th><th className="px-3 py-2">Assigned Custodian</th></tr></thead><tbody className="divide-y divide-slate-100">{(storageReport?.recommendations||[]).map(record=><tr key={record.id}><td className="px-3 py-2 font-bold text-[#0A5C1D]">{record.armsRef}</td><td className="px-3 py-2">{record.location.zone} / {record.location.shelf} / {record.location.folder}</td><td className="px-3 py-2">{record.grDate}</td><td className="px-3 py-2">{record.recommendationReason}</td><td className="px-3 py-2">{record.assignedCustodian||record.custodian}</td></tr>)}</tbody></table></div></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
