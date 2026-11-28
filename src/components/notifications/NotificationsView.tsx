import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { NotificationItem } from '../../types';
import {
  Bell,
  Star,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  CheckCheck,
  Filter,
  ShieldCheck,
  UserCheck,
  ArrowRight,
  ExternalLink,
  Trash2
} from 'lucide-react';

export const NotificationsView: React.FC = () => {
  const {
    notifications,
    currentUser,
    markNotificationRead,
    markAllNotificationsRead,
    toggleStarNotification,
    deleteNotification,
    approveBorrowRequest,
    rejectBorrowRequest,
    setActiveTab
  } = useApp();

  // Selected for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterTab, setFilterTab] = useState<'All' | 'Pending' | 'Approved' | 'Starred'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  // Only Admin (role === 'management') has permission to approve or reject borrow requests
  const canApprove = currentUser?.role === 'management' || currentUser?.role === 'admin';

  // Search submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(searchQuery.trim().toLowerCase());
  };

  // Filtered notifications
  const filteredNotifs = useMemo(() => {
    return notifications.filter(item => {
      // Filter tab
      if (filterTab === 'Pending' && item.status !== 'Pending') return false;
      if (filterTab === 'Approved' && item.status !== 'Approved') return false;
      if (filterTab === 'Starred' && !item.isStarred) return false;

      // Search match
      if (appliedSearch) {
        const match =
          item.message.toLowerCase().includes(appliedSearch) ||
          item.transactionSeries.toLowerCase().includes(appliedSearch) ||
          item.armsRef.toLowerCase().includes(appliedSearch) ||
          item.title.toLowerCase().includes(appliedSearch) ||
          (item.borrowerName && item.borrowerName.toLowerCase().includes(appliedSearch));
        if (!match) return false;
      }

      return true;
    });
  }, [notifications, filterTab, appliedSearch]);

  // Select all toggle
  const isAllSelected =
    filteredNotifs.length > 0 && selectedIds.length === filteredNotifs.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredNotifs.map(n => n.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Bulk mark as read
  const handleBulkMarkRead = () => {
    if (selectedIds.length === 0) {
      markAllNotificationsRead();
    } else {
      selectedIds.forEach(id => markNotificationRead(id));
      setSelectedIds([]);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Role Notice */}
      <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-bold uppercase tracking-wider text-slate-900">
            NOTIFICATIONS & APPROVAL WORKFLOW
          </h2>
          <p className="text-xs text-slate-500">
            Manage file requisition approvals, circulation chain-of-custody, and transaction series logs
          </p>
        </div>

        {/* Real User Role Badge */}
        {currentUser && (
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <span className="font-bold text-slate-700">Authenticated Role:</span>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-[#0A5C1D]">
              {currentUser.roleTitle}
            </span>
          </div>
        )}
      </div>

      {/* Control Bar: Checkbox select-all, "Mark as read / unread", Search bar + button, Filter tabs */}
      <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Actions: Select all & Mark as read */}
          <div className="flex items-center space-x-3 text-xs">
            <label className="flex items-center space-x-2 font-semibold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={handleSelectAll}
                className="w-4 h-4 rounded text-[#0A5C1D] focus:ring-[#0A5C1D] border-slate-300 cursor-pointer"
              />
              <span>Select All</span>
            </label>

            <button
              type="button"
              onClick={handleBulkMarkRead}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5 text-[#0A5C1D]" />
              <span>Mark as read</span>
            </button>
          </div>

          {/* Search bar + "Search" button */}
          <form onSubmit={handleSearch} className="flex items-center space-x-2 flex-1 max-w-sm">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search transaction series, reference, or borrower"
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#0A5C1D]"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-lg bg-[#222222] hover:bg-black text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Search
            </button>
            {appliedSearch && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setAppliedSearch('');
                }}
                className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Clear
              </button>
            )}
          </form>
        </div>

        {/* Filter Tabs (All, Pending Approval, Approved, Starred) */}
        <div className="flex items-center space-x-2 pt-2 border-t border-slate-100 text-xs font-bold uppercase tracking-wider">
          <button
            onClick={() => setFilterTab('All')}
            className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
              filterTab === 'All'
                ? 'bg-[#0A5C1D] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilterTab('Pending')}
            className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
              filterTab === 'Pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Pending Approval ({notifications.filter(n => n.status === 'Pending').length})
          </button>
          <button
            onClick={() => setFilterTab('Approved')}
            className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
              filterTab === 'Approved'
                ? 'bg-[#0A5C1D] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Approved ({notifications.filter(n => n.status === 'Approved').length})
          </button>
          <button
            onClick={() => setFilterTab('Starred')}
            className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
              filterTab === 'Starred'
                ? 'bg-[#222222] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Starred ({notifications.filter(n => n.isStarred).length})
          </button>
        </div>
      </div>

      {/* Notification Feed List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden divide-y divide-slate-100">
        {filteredNotifs.length > 0 ? (
          filteredNotifs.map(notif => {
            const isSelected = selectedIds.includes(notif.id);
            const isPending = notif.status === 'Pending';
            const isApproved = notif.status === 'Approved';

            return (
              <div
                key={notif.id}
                className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                  !notif.isRead ? 'bg-emerald-50/25' : 'bg-white hover:bg-slate-50/70'
                }`}
              >
                {/* Left: Checkbox + Star + Content */}
                <div className="flex items-start space-x-3.5 flex-1 min-w-0">
                  {/* Checkbox */}
                  <div className="pt-0.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectOne(notif.id)}
                      className="w-4 h-4 rounded text-[#0A5C1D] focus:ring-[#0A5C1D] border-slate-300 cursor-pointer"
                    />
                  </div>

                  {/* Star Icon */}
                  <button
                    onClick={() => toggleStarNotification(notif.id)}
                    className="pt-0.5 text-slate-300 hover:text-amber-400 transition-colors cursor-pointer"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        notif.isStarred ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                      }`}
                    />
                  </button>

                  {/* Text details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      {/* Bold status title */}
                      <span
                        className={`font-heading font-black text-sm uppercase tracking-wider ${
                          isPending
                            ? 'text-amber-700'
                            : isApproved
                            ? 'text-[#0A5C1D]'
                            : notif.status === 'Rejected'
                            ? 'text-rose-600'
                            : 'text-slate-800'
                        }`}
                      >
                        {notif.title}
                      </span>

                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full bg-[#0A5C1D]" />
                      )}

                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Message */}
                    <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                      {notif.message}
                    </p>

                    {/* Sub details if available */}
                    {notif.borrowerName && (
                      <div className="flex items-center space-x-3 mt-1.5 text-[11px] text-slate-500">
                        <span>
                          Requisitioner:{' '}
                          <span className="font-semibold text-slate-800">
                            {notif.borrowerName}
                          </span>
                        </span>
                        <span>•</span>
                        <span>
                          Purpose:{' '}
                          <span className="font-semibold text-slate-800">
                            {notif.purpose}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Transaction Series + Actions */}
                <div className="flex flex-row sm:flex-col sm:items-end justify-between items-center space-y-0 sm:space-y-2 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  {/* Right-aligned transaction series */}
                  <div className="font-heading font-black text-xs uppercase tracking-wider text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                    {notif.transactionSeries}
                  </div>

                  {/* Management Action: Approve / Reject buttons */}
                  {isPending && (
                    <div className="flex items-center space-x-2">
                      {canApprove ? (
                        <>
                          <button
                            onClick={() => approveBorrowRequest(notif.id)}
                            className="px-3 py-1.5 rounded-lg bg-[#0A5C1D] hover:bg-[#147426] text-white text-xs font-bold uppercase tracking-wider flex items-center space-x-1 shadow-xs transition-colors cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5 text-[#A8E0A8]" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => rejectBorrowRequest(notif.id)}
                            className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold uppercase tracking-wider flex items-center space-x-1 transition-colors cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5 text-rose-500" />
                            <span>Reject</span>
                          </button>
                        </>
                      ) : (
                        <div className="text-[11px] text-slate-400 italic">
                          Awaiting Management Approval
                        </div>
                      )}
                    </div>
                  )}

                  {isApproved && (
                    <div className="flex items-center space-x-1.5 text-xs text-[#0A5C1D] font-bold">
                      <CheckCircle className="w-3.5 h-3.5 text-[#0A5C1D]" />
                      <span>Approved & In Circulation</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-12 text-center text-slate-400">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="font-medium text-slate-600">No notifications found</p>
            <p className="text-xs text-slate-400 mt-1">
              {filterTab !== 'All' ? `Try switching from '${filterTab}' tab` : 'All clear!'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
