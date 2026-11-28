import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { FileRecord, RecordStatus } from '../../types';
import { PullOutModal } from './PullOutModal';
import { RecordDetailDrawer } from './RecordDetailDrawer';
import {
  Search,
  FolderMinus,
  Filter,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertCircle,
  FileText,
  RotateCcw
} from 'lucide-react';

export const FindFileView: React.FC = () => {
  const { files, setActiveTab } = useApp();

  // Controls State
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | RecordStatus>('ALL');
  const [filterRetention, setFilterRetention] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Modals & Drawers
  const [isPullOutOpen, setIsPullOutOpen] = useState(false);
  const [preSelectedRef, setPreSelectedRef] = useState<string | undefined>(undefined);
  const [selectedRecord, setSelectedRecord] = useState<FileRecord | null>(null);

  // Success Pop-up modal after Pull Out form submission
  const [pendingApprovalInfo, setPendingApprovalInfo] = useState<{ series: string; ref: string } | null>(null);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(searchQuery.trim());
    setCurrentPage(1);
  };

  // Filtered files calculation
  const filteredFiles = useMemo(() => {
    return files.filter(item => {
      // Search matching (armsRef, location code, material doc, PO, custodian, operator, material number)
      const query = appliedSearch.toLowerCase();
      const matchSearch =
        !query ||
        item.armsRef.toLowerCase().includes(query) ||
        item.location.code.toLowerCase().includes(query) ||
        item.location.shelf.toLowerCase().includes(query) ||
        item.location.folder.toLowerCase().includes(query) ||
        item.location.zone.toLowerCase().includes(query) ||
        item.materialDoc.toLowerCase().includes(query) ||
        item.deliveryPo.toLowerCase().includes(query) ||
        item.custodian.toLowerCase().includes(query) ||
        (item.assignedCustodian || '').toLowerCase().includes(query) ||
        item.materialNumber.toLowerCase().includes(query) ||
        item.transactionType.toLowerCase().includes(query);

      // Filter by Transaction Type
      const matchType =
        filterType === 'ALL' ||
        item.transactionType.toLowerCase().includes(filterType.toLowerCase());

      // Filter by Status
      const matchStatus =
        filterStatus === 'ALL' || item.status === filterStatus;

      // Filter by Retention Status
      const matchRetention =
        filterRetention === 'ALL' || item.retentionStatus === filterRetention;

      const dateValue = item.grDate.includes('/') ? item.grDate.split('/').reverse().join('-') : item.grDate;
      const matchDate = (!fromDate || dateValue >= fromDate) && (!toDate || dateValue <= toDate);

      return matchSearch && matchType && matchStatus && matchRetention && matchDate;
    });
  }, [files, appliedSearch, filterType, filterStatus, filterRetention, fromDate, toDate]);

  // Pagination
  const totalPages = Math.ceil(filteredFiles.length / pageSize) || 1;
  const paginatedFiles = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredFiles.slice(start, start + pageSize);
  }, [filteredFiles, currentPage, pageSize]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-bold uppercase tracking-wider text-slate-900">
            FIND A FILE & INVENTORY REPOSITORY
          </h2>
          <p className="text-xs text-slate-500">
            Search physical storage locations, review chain-of-custody, and submit requisition pull-out slips
          </p>
        </div>

        {/* "+ Pull Out Form" Button (dark charcoal button) */}
        <div>
          <button
            onClick={() => {
              setPreSelectedRef(undefined);
              setIsPullOutOpen(true);
            }}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-[#222222] hover:bg-black text-white font-heading text-sm font-bold uppercase tracking-wider flex items-center justify-center space-x-2 transition-colors shadow-sm"
          >
            <FolderMinus className="w-4 h-4 text-[#A8E0A8]" />
            <span>+ Pull Out Form</span>
          </button>
        </div>
      </div>

      {/* Top Control Bar: "Show entries", Search Input + Button, Filters */}
      <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Show [5/10/25/50] entries dropdown */}
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#0A5C1D]"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>entries</span>
            <span className="text-slate-400 pl-2">
              (Total: {filteredFiles.length} files found)
            </span>
          </div>

          {/* Search bar + "Search" button */}
          <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search ARMS Ref, location, PO, or document number"
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0A5C1D]"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#222222] hover:bg-black text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-xs"
            >
              Search
            </button>
            {appliedSearch && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setAppliedSearch('');
                  setCurrentPage(1);
                }}
                className="px-2 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Clear
              </button>
            )}
          </form>
        </div>

        {/* Filter bar: Transaction Type, Status, Retention */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center space-x-1.5 text-slate-500 font-semibold mr-1">
            <Filter className="w-3.5 h-3.5 text-[#0A5C1D]" />
            <span>Filters:</span>
          </div>

          {/* Transaction Type Filter */}
          <select
            value={filterType}
            onChange={e => {
              setFilterType(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0A5C1D]"
          >
            <option value="ALL">All Transaction Types</option>
            <option value="Inbound">Inbound</option>
            <option value="IFT">Receiving of IFT</option>
            <option value="Outbound">Outbound</option>
            <option value="resupply">Dispatch of resupply</option>
            <option value="Scrap">Scrap Management</option>
            <option value="cycle">Daily Cycle Count</option>
          </select>

          <label className="flex items-center gap-1.5 text-slate-600">From <input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1.5" /></label>
          <label className="flex items-center gap-1.5 text-slate-600">To <input type="date" value={toDate} onChange={e=>setToDate(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1.5" /></label>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={e => {
              setFilterStatus(e.target.value as any);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0A5C1D]"
          >
            <option value="ALL">All Statuses (Available/Borrowed/Pending)</option>
            <option value="Available">Available Only</option>
            <option value="Borrowed">Borrowed Only</option>
            <option value="Pending">Pending Approval Only</option>
          </select>

          {/* Retention Expiry Filter */}
          <select
            value={filterRetention}
            onChange={e => {
              setFilterRetention(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0A5C1D]"
          >
            <option value="ALL">All Retention Cycles</option>
            <option value="Active">Active Retention</option>
            <option value="Semi-Active">Semi-Active</option>
            <option value="Near Expiry">Near Expiry Alert</option>
            <option value="Disposal Due">Disposal Due</option>
          </select>
        </div>
      </div>

      {/* Data Table Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#0A5C1D]/5 text-slate-700 uppercase font-heading font-bold tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5">ARMS Ref.</th>
                <th className="px-4 py-3.5">Location (Zone/Shelf/Folder)</th>
                <th className="px-4 py-3.5">Transaction Type</th>
                <th className="px-4 py-3.5">Record Date</th>
                <th className="px-4 py-3.5">Custodian</th>
                <th className="px-4 py-3.5">Retention Alert</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedFiles.length > 0 ? (
                paginatedFiles.map(file => {
                  return (
                    <tr
                      key={file.id}
                      onClick={() => setSelectedRecord(file)}
                      className="hover:bg-emerald-50/40 cursor-pointer transition-colors group"
                    >
                      {/* ARMS Ref */}
                      <td className="px-4 py-3 font-heading font-black text-sm text-[#0A5C1D] group-hover:underline">
                        {file.armsRef}
                      </td>

                      {/* Location: Zone / Shelf / Folder */}
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-1.5">
                          <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-slate-100 border border-slate-300 text-slate-800">
                            {file.location.code}
                          </span>
                          <span className="text-slate-600 text-[11px]">
                            {file.location.zone} · {file.location.shelf} ({file.location.folder})
                          </span>
                        </div>
                      </td>

                      {/* Transaction Type */}
                      <td className="px-4 py-3 font-medium text-slate-800 max-w-[160px] truncate">
                        {file.transactionType}
                      </td>

                      {/* Record Date */}
                      <td className="px-4 py-3 text-slate-600 font-mono">
                        {file.grDate}
                      </td>

                      {/* Custodian */}
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {file.custodian}
                      </td>

                      {/* Retention / Expiry Alert badge */}
                      <td className="px-4 py-3">
                        {file.retentionStatus === 'Active' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Active (Due {file.retentionDate})
                          </span>
                        )}
                        {file.retentionStatus === 'Semi-Active' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            Semi-Active
                          </span>
                        )}
                        {file.retentionStatus === 'Near Expiry' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                            Near Expiry
                          </span>
                        )}
                        {file.retentionStatus === 'Disposal Due' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            Disposal Due
                          </span>
                        )}
                      </td>

                      {/* Status ("Available" dark text, "Borrowed" red text, "Pending" in amber) */}
                      <td className="px-4 py-3 text-center">
                        {file.status === 'Available' && (
                          <span className="font-heading font-black text-xs uppercase tracking-wider text-[#222222]">
                            Available
                          </span>
                        )}
                        {file.status === 'Borrowed' && (
                          <span className="font-heading font-black text-xs uppercase tracking-wider text-rose-600 animate-pulse">
                            Borrowed
                          </span>
                        )}
                        {file.status === 'Pending' && (
                          <span className="font-heading font-black text-xs uppercase tracking-wider text-amber-600">
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedRecord(file);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#0A5C1D] hover:bg-slate-100 transition-colors"
                          title="View Record Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium text-slate-600">No archive documents match your filter query</p>
                    <p className="text-xs text-slate-400 mt-1">Try resetting the search keywords or filters</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="text-slate-500 font-medium">
            Showing{' '}
            <span className="font-bold text-slate-900">
              {filteredFiles.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
            </span>{' '}
            to{' '}
            <span className="font-bold text-slate-900">
              {Math.min(currentPage * pageSize, filteredFiles.length)}
            </span>{' '}
            of <span className="font-bold text-slate-900">{filteredFiles.length}</span> records
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-bold text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Pull Out Modal */}
      <PullOutModal
        isOpen={isPullOutOpen}
        preSelectedRef={preSelectedRef}
        onClose={() => setIsPullOutOpen(false)}
        onSuccess={info => {
          setIsPullOutOpen(false);
          setPendingApprovalInfo(info);
        }}
      />

      {/* Record Inspection Drawer */}
      <RecordDetailDrawer
        record={selectedRecord}
        onClose={() => setSelectedRecord(null)}
        onRequestBorrow={file => {
          setPreSelectedRef(file.armsRef);
          setIsPullOutOpen(true);
        }}
      />

      {/* Requisition "Pending Approval: Check notifications for status update" Popup Modal */}
      {pendingApprovalInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-7 border border-slate-100 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 mx-auto flex items-center justify-center mb-4 ring-8 ring-amber-50">
              <Clock className="w-8 h-8" />
            </div>

            <div className="text-[11px] font-bold uppercase tracking-widest text-amber-600 mb-1">
              {pendingApprovalInfo.series}
            </div>

            <h3 className="font-heading text-2xl font-bold uppercase tracking-wide text-slate-900 mb-2">
              Pending Approval
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Your requisition for <span className="font-bold text-slate-900">{pendingApprovalInfo.ref}</span> has been logged under{' '}
              <span className="font-mono font-bold text-[#0A5C1D]">{pendingApprovalInfo.series}</span>. Check notifications for live status updates from Operations Management.
            </p>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setPendingApprovalInfo(null)}
                className="w-1/2 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setPendingApprovalInfo(null);
                  setActiveTab('notifications');
                }}
                className="w-1/2 py-2.5 rounded-lg bg-[#222222] hover:bg-black text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
              >
                Go to Notifications
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
