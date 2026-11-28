import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TransactionType, LineItem, FileRecord, LogEntry } from '../../types';
import { PublishConfirmationModal } from './PublishConfirmationModal';
import { LogCountModal } from './LogCountModal';
import { LogEntryModal } from './LogEntryModal';
import { LogEntryPrintModal } from './LogEntryPrintModal';
import {
  Plus,
  Trash2,
  Calendar,
  Layers,
  MapPin,
  CheckCircle,
  FileText,
  ClipboardList,
  Info,
  Printer,
  Search,
  X
} from 'lucide-react';

export const LogBookView: React.FC = () => {
  const { addFileRecord, currentUser, setActiveTab, logEntries, createLogEntry } = useApp();

  // Modals state
  const [isLogCountOpen, setIsLogCountOpen] = useState(false);
  const [isLogEntryOpen, setIsLogEntryOpen] = useState(false);
  const [prePrintEntry, setPrePrintEntry] = useState<LogEntry | null>(null);
  const [savedEntryPendingPrint, setSavedEntryPendingPrint] = useState<LogEntry | null>(null);
  const [entrySearch, setEntrySearch] = useState('');
  const [entryFilter, setEntryFilter] = useState('');
  const [publishedRecord, setPublishedRecord] = useState<FileRecord | null>(null);

  // Form State
  const [transactionType, setTransactionType] = useState<TransactionType>('Other');
  const [materialDoc, setMaterialDoc] = useState('');
  const [deliveryPo, setDeliveryPo] = useState('');
  const [grDate, setGrDate] = useState('');
  const [materialNumber, setMaterialNumber] = useState('');
  const [vendorSiteNumber, setVendorSiteNumber] = useState('');
  const [vamNumber, setVamNumber] = useState('');
  const [freightOrder, setFreightOrder] = useState('');
  const [numPackages, setNumPackages] = useState<number | string>(0);
  const [operator, setOperator] = useState('');
  const [encoder, setEncoder] = useState(currentUser?.name || '');
  const [assignedCustodian, setAssignedCustodian] = useState(currentUser?.name || '');
  const [checker, setChecker] = useState('');
  const [plateNumber, setPlateNumber] = useState('');

  // Storage Location Mapping: Zone -> Shelf -> Folder -> Code
  const [zone, setZone] = useState('');
  const [shelf, setShelf] = useState('');
  const [folder, setFolder] = useState('');
  const [folderCapacity, setFolderCapacity] = useState(25);

  // Retention Period / Disposal Date
  const [retentionDate, setRetentionDate] = useState('');
  const [retentionStatus, setRetentionStatus] = useState<'Active'|'Semi-Active'|'Near Expiry'|'Disposal Due'>('Active');
  const [remarks, setRemarks] = useState('');

  // Dynamic Repeatable Line Items
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  // Compact storage location label derived from the configured hierarchy.
  const locationCode = zone && shelf ? `${zone.replace('Zone ', '')}${shelf.replace('Shelf ', '')}` : '';
  const filteredLogEntries = logEntries.filter(entry => {
    const query = entryFilter.trim().toLocaleLowerCase();
    if (!query) return true;
    const code = (entry.uniqueCode || '').toLocaleLowerCase();
    const lastFour = code.slice(-4);
    const drInvNumber = (entry.drInvNumber || '').toLocaleLowerCase();
    return code.includes(query) || lastFour.includes(query) || drInvNumber.includes(query);
  });

  const submitEntrySearch = (event: React.FormEvent) => {
    event.preventDefault();
    const query = entrySearch.trim();
    setEntrySearch(query);
    setEntryFilter(query);
  };

  const clearEntrySearch = () => {
    setEntrySearch('');
    setEntryFilter('');
  };

  // Add line item row
  const addLineItem = () => {
    const newItem: LineItem = {
      id: `li-${Date.now()}-${Math.random()}`,
      batchCode: '',
      prodDate: '',
      expDate: '',
      quantity: ''
    };
    setLineItems(prev => [...prev, newItem]);
  };

  // Remove line item row
  const removeLineItem = (id: string) => {
    setLineItems(prev => prev.filter(item => item.id !== id));
  };

  // Update line item field
  const updateLineItem = (id: string, field: keyof LineItem, val: string) => {
    setLineItems(prev =>
      prev.map(item => (item.id === id ? { ...item, [field]: val } : item))
    );
  };

  // Submit and Publish Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    const recordData = {
      transactionType,
      materialDoc,
      deliveryPo,
      grDate,
      materialNumber,
      vendorSiteNumber,
      vamNumber,
      freightOrder,
      numPackages: Number(numPackages) || 0,
      operator,
      encoder,
      assignedCustodian,
      checker,
      plateNumber,
      location: {
        zone,
        shelf,
        folder,
        code: locationCode
      },
      folderCapacity,
      retentionDate,
      retentionStatus,
      remarks,
      lineItems
    };

    const newRecord = await addFileRecord(recordData);
    setPublishedRecord(newRecord);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Action Bar */}
      <div className="bg-white rounded-xl p-4 sm:p-5 shadow-sm border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-bold uppercase tracking-wider text-slate-900">
            PUBLICATION LOG BOOK
          </h2>
          <p className="text-xs text-slate-500">
            Encode and index new physical warehouse records into the archive
          </p>
        </div>

        {/* Action Buttons: daily count, pre-print entry, and archive publication */}
        <div className="flex flex-wrap items-center gap-3">
          {/* "Log Count" (dark button) */}
          <button
            type="button"
            onClick={() => setIsLogCountOpen(true)}
            className="px-4 py-2.5 rounded-lg bg-[#222222] hover:bg-black text-white font-heading text-sm font-bold uppercase tracking-wider flex items-center space-x-2 transition-colors shadow-sm"
          >
            <ClipboardList className="w-4 h-4 text-[#A8E0A8]" />
            <span>Log Count</span>
          </button>

          <button
            type="button"
            onClick={() => setIsLogEntryOpen(true)}
            className="px-4 py-2.5 rounded-lg bg-[#0A5C1D] hover:bg-[#084917] text-white font-heading text-sm font-bold uppercase tracking-wider flex items-center space-x-2 transition-colors shadow-sm"
          >
            <FileText className="w-4 h-4 text-[#A8E0A8]" />
            <span>New Log Entry</span>
          </button>

          {/* "+ Publish Form" (dark button) */}
          <button
            type="button"
            onClick={handleSubmitForm}
            className="px-5 py-2.5 rounded-lg bg-[#222222] hover:bg-black text-white font-heading text-sm font-bold uppercase tracking-wider flex items-center space-x-2 transition-colors shadow-sm ring-2 ring-[#0A5C1D]/20"
          >
            <Plus className="w-4 h-4 text-[#A8E0A8]" />
            <span>+ Publish Form</span>
          </button>
        </div>
      </div>

      {/* Main Encoding Form Card */}
      <form onSubmit={handleSubmitForm} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-2.5">
              <span className="w-7 h-7 rounded-lg bg-[#0A5C1D]/10 text-[#0A5C1D] flex items-center justify-center font-bold text-xs">
                1
              </span>
              <h3 className="font-heading text-lg font-bold uppercase tracking-wider text-slate-900">
                Primary Transaction & Document Details
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              ARMS Reference will be auto-generated
            </span>
          </div>

          {/* Select Transaction dropdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Select Transaction <span className="text-rose-500">*</span>
              </label>
              <select
                value={transactionType}
                onChange={e => setTransactionType(e.target.value as TransactionType)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A5C1D]"
              >
                <option value="Receiving of IFT deliveries">Receiving of IFT deliveries</option>
                <option value="Inbound">Inbound (General)</option>
                <option value="Dispatch of local resupply">Dispatch of local resupply</option>
                <option value="Outbound">Outbound (General)</option>
                <option value="Receiving of local deliveries">Receiving of local deliveries</option>
                <option value="Dispatch of scraps">Dispatch of scraps</option>
                <option value="Scrap Management">Scrap Management</option>
                <option value="Daily cycle count">Daily cycle count</option>
                <option value="Inventory Count">Inventory Count</option>
                <option value="Other">Other Operational Form</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Material Document
              </label>
              <input
                type="text"
                value={materialDoc}
                onChange={e => setMaterialDoc(e.target.value)}
                placeholder="Material document"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A5C1D]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Outbound Delivery / Purchase Order
              </label>
              <input
                type="text"
                value={deliveryPo}
                onChange={e => setDeliveryPo(e.target.value)}
                placeholder="Purchase or delivery order"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A5C1D]"
              />
            </div>
          </div>

          {/* Grid row 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                GR Date
              </label>
              <input
                type="date"
                value={grDate}
                onChange={e => setGrDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A5C1D]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Material Number
              </label>
              <input
                type="text"
                value={materialNumber}
                onChange={e => setMaterialNumber(e.target.value)}
                placeholder="Material number"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A5C1D]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Vendor Site Number
              </label>
              <input
                type="text"
                value={vendorSiteNumber}
                onChange={e => setVendorSiteNumber(e.target.value)}
                placeholder="Vendor site number"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A5C1D]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                VAM Number
              </label>
              <input
                type="text"
                value={vamNumber}
                onChange={e => setVamNumber(e.target.value)}
                placeholder="VAM number"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A5C1D]"
              />
            </div>
          </div>

          {/* Grid row 3 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Freight Order
              </label>
              <input
                type="text"
                value={freightOrder}
                onChange={e => setFreightOrder(e.target.value)}
                placeholder="Freight order"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A5C1D]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                No. of Pallets / Packages
              </label>
              <input
                type="number"
                min="1"
                value={numPackages}
                onChange={e => setNumPackages(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A5C1D]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Plate Number
              </label>
              <input
                type="text"
                value={plateNumber}
                onChange={e => setPlateNumber(e.target.value)}
                placeholder="Plate number"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A5C1D]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Retention / Disposal Date
              </label>
              <input
                type="date"
                value={retentionDate}
                onChange={e => setRetentionDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A5C1D]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Retention Status</label>
              <select value={retentionStatus} onChange={e=>setRetentionStatus(e.target.value as typeof retentionStatus)} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm">
                <option value="Active">Active</option><option value="Semi-Active">Semi-Active</option><option value="Near Expiry">Near Expiry</option><option value="Disposal Due">Disposal Due</option>
              </select>
            </div>
          </div>

          {/* Personnel Row: Operator, Encoder, Checker */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Operator / MHE Driver
              </label>
              <input
                type="text"
                value={operator}
                onChange={e => setOperator(e.target.value)}
                placeholder="Operator name"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A5C1D]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Encoder
              </label>
              <input
                type="text"
                value={encoder}
                onChange={e => setEncoder(e.target.value)}
                placeholder="Encoder name"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A5C1D]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Checker / Floor Verifier
              </label>
              <input
                type="text"
                value={checker}
                onChange={e => setChecker(e.target.value)}
                placeholder="Checker name"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A5C1D]"
              />
            </div>
          </div>
        </div>

        {/* 2. Storage Location Mapping: Zone -> Shelf -> Folder */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-2.5">
              <span className="w-7 h-7 rounded-lg bg-[#0A5C1D]/10 text-[#0A5C1D] flex items-center justify-center font-bold text-xs">
                2
              </span>
              <h3 className="font-heading text-lg font-bold uppercase tracking-wider text-slate-900">
                Storage Location Mapping (Zone → Shelf → Folder)
              </h3>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-500 uppercase">Computed Tag:</span>
              <span className="px-2.5 py-1 rounded-md bg-[#0A5C1D] text-[#A8E0A8] font-heading font-black text-sm tracking-wider">
                {locationCode}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Zone Area
              </label>
              <input
                value={zone}
                onChange={e => setZone(e.target.value)}
                placeholder="Enter zone"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A5C1D]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Shelf Rack Number
              </label>
              <input
                value={shelf}
                onChange={e => setShelf(e.target.value)}
                placeholder="Enter shelf"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A5C1D]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Folder / Bin Binder
              </label>
              <input
                type="text"
                value={folder}
                onChange={e => setFolder(e.target.value)}
                placeholder="Folder identifier"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A5C1D]"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Maximum records in this folder</label><input type="number" min="1" value={folderCapacity} onChange={e=>setFolderCapacity(Number(e.target.value)||1)} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm" /></div>
            <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Assigned custodian</label><input value={assignedCustodian} onChange={e=>setAssignedCustodian(e.target.value)} placeholder="Custodian name" className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm" /></div>
          </div>
        </div>

        {/* 3. Dynamic Repeatable Line Items */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-2.5">
              <span className="w-7 h-7 rounded-lg bg-[#0A5C1D]/10 text-[#0A5C1D] flex items-center justify-center font-bold text-xs">
                3
              </span>
              <h3 className="font-heading text-lg font-bold uppercase tracking-wider text-slate-900">
                Dynamic Line Items (Batches, Dates & Quantity)
              </h3>
            </div>
            <button
              type="button"
              onClick={addLineItem}
              className="px-3 py-1.5 rounded-lg bg-[#0A5C1D] hover:bg-[#147426] text-white text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-[#A8E0A8]" />
              <span>+ Add Line Item</span>
            </button>
          </div>

          <div className="space-y-3">
            {lineItems.map((item, index) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
              >
                <div className="sm:col-span-1 text-center font-heading font-bold text-xs text-slate-400">
                  #{index + 1}
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                    Batch Code
                  </label>
                  <input
                    type="text"
                    value={item.batchCode}
                    onChange={e => updateLineItem(item.id, 'batchCode', e.target.value)}
                    placeholder="Batch code"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#0A5C1D]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                    Production Date
                  </label>
                  <input
                    type="date"
                    value={item.prodDate}
                    onChange={e => updateLineItem(item.id, 'prodDate', e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-[#0A5C1D]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                    Exp Date / SLED
                  </label>
                  <input
                    type="date"
                    value={item.expDate}
                    onChange={e => updateLineItem(item.id, 'expDate', e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-[#0A5C1D]"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                    Quantity
                  </label>
                  <input
                    type="text"
                    value={item.quantity}
                    onChange={e => updateLineItem(item.id, 'quantity', e.target.value)}
                    placeholder="Quantity and unit"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#0A5C1D]"
                  />
                </div>

                {/* Green trash delete icon button */}
                <div className="sm:col-span-1 flex justify-center pt-3 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => removeLineItem(item.id)}
                    className="p-1.5 rounded-lg text-[#0A5C1D] hover:bg-emerald-100 active:bg-emerald-200 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    title="Delete row"
                  >
                    <Trash2 className="w-4 h-4 text-[#0A5C1D]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Remarks */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-4">
          <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-3">
            <span className="w-7 h-7 rounded-lg bg-[#0A5C1D]/10 text-[#0A5C1D] flex items-center justify-center font-bold text-xs">
              4
            </span>
            <h3 className="font-heading text-lg font-bold uppercase tracking-wider text-slate-900">
              Remarks & Deviations (if found)
            </h3>
          </div>

          <div>
            <textarea
              rows={3}
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="Add record remarks"
              className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A5C1D]"
            />
          </div>

          {/* Form Bottom Publish Action (Dark button `#222222`) */}
          <div className="flex items-center justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              className="px-8 py-3 rounded-xl bg-[#222222] hover:bg-black text-white font-heading text-base font-bold uppercase tracking-wider flex items-center space-x-2 transition-all shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4 text-[#A8E0A8]" />
              <span>+ Publish Form to Archive</span>
            </button>
          </div>
        </div>
      </form>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="font-heading text-lg font-bold uppercase tracking-wider text-slate-900">Saved Pre-Print Entries</h3>
            <p className="text-xs text-slate-500">Open any saved unique code to view or print its form again.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:flex-1 lg:justify-end">
            <form onSubmit={submitEntrySearch} role="search" className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row lg:max-w-2xl">
              <input
                type="search"
                value={entrySearch}
                onChange={event => { setEntrySearch(event.target.value); setEntryFilter(event.target.value); }}
                placeholder="Search last 4 digits of Unique Code or DR/INV No..."
                aria-label="Search saved pre-print entries"
                className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0A5C1D] focus:outline-none focus:ring-2 focus:ring-[#0A5C1D]/20"
              />
              <button type="submit" className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#222222] px-4 py-2 text-sm font-semibold text-white hover:bg-black"><Search className="h-4 w-4" />Search</button>
              {entrySearch.length > 0 && <button type="button" onClick={clearEntrySearch} className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><X className="h-4 w-4" />Clear</button>}
            </form>
            <span className="w-fit shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {entryFilter.trim() ? `${filteredLogEntries.length} of ${logEntries.length} entries` : `${logEntries.length} entries`}
            </span>
          </div>
        </div>
        {logEntries.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">No pre-print log entries have been saved.</p>
        ) : filteredLogEntries.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">No matching pre-print entries found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                <tr><th className="px-5 py-3 font-bold">Unique Code</th><th className="px-5 py-3 font-bold">Transaction</th><th className="px-5 py-3 font-bold">DR/INV No.</th><th className="px-5 py-3 font-bold">Created</th><th className="px-5 py-3 text-right font-bold">Form</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogEntries.map(entry => (
                  <tr key={entry.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3"><button type="button" onClick={() => setPrePrintEntry(entry)} className="font-mono font-bold text-[#0A5C1D] hover:underline">{entry.uniqueCode}</button></td>
                    <td className="px-5 py-3 text-slate-700">{entry.transactionType}</td>
                    <td className="px-5 py-3 text-slate-600">{entry.drInvNumber || '—'}</td>
                    <td className="px-5 py-3 text-slate-500">{new Date(entry.createdAt.replace(' ', 'T') + 'Z').toLocaleString()}</td>
                    <td className="px-5 py-3 text-right"><button type="button" onClick={() => setPrePrintEntry(entry)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-[#0A5C1D] hover:text-[#0A5C1D]"><Printer className="h-3.5 w-3.5" />Open / Print</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {savedEntryPendingPrint && (
        <div role="status" className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-emerald-900">Log entry saved successfully</p>
            <p className="mt-1 text-xs text-emerald-800">Unique Code: <span className="font-mono font-bold">{savedEntryPendingPrint.uniqueCode}</span>. Open its preview before printing.</p>
          </div>
          <button type="button" onClick={() => setPrePrintEntry(savedEntryPendingPrint)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0A5C1D] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#084917]"><Printer className="h-4 w-4" />Print</button>
        </div>
      )}

      {/* Confirmation Modal */}
      <PublishConfirmationModal
        isOpen={!!publishedRecord}
        record={publishedRecord}
        onClose={() => setPublishedRecord(null)}
        onViewInFindFile={() => {
          setActiveTab('findfile');
        }}
      />

      {/* Log Count Modal */}
      <LogCountModal
        isOpen={isLogCountOpen}
        onClose={() => setIsLogCountOpen(false)}
      />
      <LogEntryModal
        isOpen={isLogEntryOpen}
        onClose={() => setIsLogEntryOpen(false)}
        onSave={createLogEntry}
        onSaved={entry => { setIsLogEntryOpen(false); setSavedEntryPendingPrint(entry); }}
      />
      <LogEntryPrintModal entry={prePrintEntry} onClose={() => setPrePrintEntry(null)} />
    </div>
  );
};
