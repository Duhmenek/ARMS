import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { TransactionType, LineItem, FileRecord } from '../../types';
import { PublishConfirmationModal } from './PublishConfirmationModal';
import { LogCountModal } from './LogCountModal';
import {
  Plus,
  Trash2,
  Calendar,
  Layers,
  MapPin,
  CheckCircle,
  FileText,
  ClipboardList,
  Sparkles,
  Info
} from 'lucide-react';

export const LogBookView: React.FC = () => {
  const { addFileRecord, currentUser, setActiveTab } = useApp();

  // Modals state
  const [isLogCountOpen, setIsLogCountOpen] = useState(false);
  const [publishedRecord, setPublishedRecord] = useState<FileRecord | null>(null);

  // Form State
  const [transactionType, setTransactionType] = useState<TransactionType>('Receiving of IFT deliveries');
  const [materialDoc, setMaterialDoc] = useState('');
  const [deliveryPo, setDeliveryPo] = useState('');
  const [grDate, setGrDate] = useState('23/11/26');
  const [materialNumber, setMaterialNumber] = useState('');
  const [vendorSiteNumber, setVendorSiteNumber] = useState('');
  const [vamNumber, setVamNumber] = useState('');
  const [freightOrder, setFreightOrder] = useState('');
  const [numPackages, setNumPackages] = useState<number | string>(40);
  const [operator, setOperator] = useState('Ramon Castillo');
  const [encoder, setEncoder] = useState(currentUser?.name || '');
  const [checker, setChecker] = useState('Shift Quality Checker');
  const [plateNumber, setPlateNumber] = useState('');

  // Storage Location Mapping: Zone -> Shelf -> Folder -> Code
  const [zone, setZone] = useState('Zone A');
  const [shelf, setShelf] = useState('Shelf 01');
  const [folder, setFolder] = useState('Folder 04');

  // Retention Period / Disposal Date
  const [retentionDate, setRetentionDate] = useState('23/11/31');
  const [remarks, setRemarks] = useState('');

  // Dynamic Repeatable Line Items
  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      id: 'li-default-1',
      batchCode: 'BCH-26-940A',
      prodDate: '15/11/26',
      expDate: '15/11/27',
      quantity: '25,000 kg'
    }
  ]);

  // Derived Location Code: e.g. Zone A + Shelf 01 => A01
  const locationCode = `${zone.replace('Zone ', '')}${shelf.replace('Shelf ', '')}`;

  // Add line item row
  const addLineItem = () => {
    const newItem: LineItem = {
      id: `li-${Date.now()}-${Math.random()}`,
      batchCode: '',
      prodDate: '23/11/26',
      expDate: '23/11/27',
      quantity: ''
    };
    setLineItems(prev => [...prev, newItem]);
  };

  // Remove line item row
  const removeLineItem = (id: string) => {
    if (lineItems.length === 1) return;
    setLineItems(prev => prev.filter(item => item.id !== id));
  };

  // Update line item field
  const updateLineItem = (id: string, field: keyof LineItem, val: string) => {
    setLineItems(prev =>
      prev.map(item => (item.id === id ? { ...item, [field]: val } : item))
    );
  };

  // Quick fill demo realistic data
  const handleAutoFillDemo = () => {
    setTransactionType('Receiving of IFT deliveries');
    setMaterialDoc('5001930211');
    setDeliveryPo('PO-88291580');
    setGrDate('23/11/26');
    setMaterialNumber('MAT-NES-00740');
    setVendorSiteNumber('VEND-4019-LIP');
    setVamNumber('VAM-2026-0960');
    setFreightOrder('FO-9910488');
    setNumPackages(48);
    setOperator('Ramon Castillo');
    setEncoder(currentUser?.name || 'Lead Encoder');
    setChecker('Shift Quality Checker');
    setPlateNumber('NAE-9042');
    setZone('Zone A');
    setShelf('Shelf 01');
    setFolder('Folder 08');
    setRetentionDate('23/11/31');
    setRemarks('Nestle Lipa Coffee granules delivery. 100% temperature logs verified intact.');
    setLineItems([
      {
        id: 'li-1',
        batchCode: 'BCH-26-9601A',
        prodDate: '18/11/26',
        expDate: '18/11/28',
        quantity: '24,000 kg'
      },
      {
        id: 'li-2',
        batchCode: 'BCH-26-9601B',
        prodDate: '19/11/26',
        expDate: '19/11/28',
        quantity: '24,000 kg'
      }
    ]);
  };

  // Submit and Publish Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    const recordData = {
      transactionType,
      materialDoc: materialDoc || 'DOC-GEN-' + Math.floor(100000 + Math.random() * 900000),
      deliveryPo: deliveryPo || 'PO-GEN-' + Math.floor(100000 + Math.random() * 900000),
      grDate,
      materialNumber: materialNumber || 'MAT-GEN-001',
      vendorSiteNumber: vendorSiteNumber || 'VEND-SITE-01',
      vamNumber: vamNumber || 'VAM-2026-GEN',
      freightOrder: freightOrder || 'FO-GEN-01',
      numPackages: Number(numPackages) || 1,
      operator,
      encoder,
      checker,
      plateNumber: plateNumber || 'TBD-999',
      location: {
        zone,
        shelf,
        folder,
        code: locationCode
      },
      retentionDate,
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

        {/* Action Buttons: Log Count & Publish Form (Dark Charcoal Buttons) */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handleAutoFillDemo}
            className="px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold uppercase tracking-wider hover:bg-slate-50 flex items-center space-x-1.5 transition-colors"
            title="Auto-fill with sample Nestle / IFT shipment data"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#0A5C1D]" />
            <span className="hidden md:inline">Auto-Fill Sample</span>
          </button>

          {/* "Log Count" (dark button) */}
          <button
            type="button"
            onClick={() => setIsLogCountOpen(true)}
            className="px-4 py-2.5 rounded-lg bg-[#222222] hover:bg-black text-white font-heading text-sm font-bold uppercase tracking-wider flex items-center space-x-2 transition-colors shadow-sm"
          >
            <ClipboardList className="w-4 h-4 text-[#A8E0A8]" />
            <span>Log Count</span>
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
                placeholder="e.g. 5001928374"
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
                placeholder="e.g. PO-88291039 or DO-7718"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A5C1D]"
              />
            </div>
          </div>

          {/* Grid row 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                GR Date (DD/MM/YY)
              </label>
              <input
                type="text"
                value={grDate}
                onChange={e => setGrDate(e.target.value)}
                placeholder="23/11/26"
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
                placeholder="e.g. MAT-NES-00192"
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
                placeholder="e.g. VEND-4019-LIP"
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
                placeholder="e.g. VAM-2026-0881"
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
                placeholder="e.g. FO-9910283"
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
                placeholder="e.g. NBT-8921"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A5C1D]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Retention / Disposal Date (DD/MM/YY)
              </label>
              <input
                type="text"
                value={retentionDate}
                onChange={e => setRetentionDate(e.target.value)}
                placeholder="23/11/31"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A5C1D]"
              />
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
                placeholder="e.g. Ramon Castillo"
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
                placeholder="e.g. Maria Clara"
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
                placeholder="e.g. Emilio Aguinaldo"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A5C1D]"
              />
            </div>
          </div>
        </div>

        {/* 2. Storage Location Mapping: Zone -> Shelf -> Folder (e.g. A01) */}
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Zone Area
              </label>
              <select
                value={zone}
                onChange={e => setZone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A5C1D]"
              >
                <option value="Zone A">Zone A (IFT & Bulk Inbound)</option>
                <option value="Zone B">Zone B (Local Outbound & Dispatch)</option>
                <option value="Zone C">Zone C (Scrap & Salvage)</option>
                <option value="Zone D">Zone D (Inventory Cycle Counts)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Shelf Rack Number
              </label>
              <select
                value={shelf}
                onChange={e => setShelf(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A5C1D]"
              >
                <option value="Shelf 01">Shelf 01 (Upper Level)</option>
                <option value="Shelf 02">Shelf 02 (Mid Level)</option>
                <option value="Shelf 03">Shelf 03 (Standard Rack)</option>
                <option value="Shelf 04">Shelf 04 (Heavy Storage)</option>
                <option value="Shelf 05">Shelf 05 (Overflow)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Folder / Bin Binder
              </label>
              <input
                type="text"
                value={folder}
                onChange={e => setFolder(e.target.value)}
                placeholder="Folder 04"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0A5C1D]"
              />
            </div>
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
                    placeholder="e.g. BCH-26-881A"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#0A5C1D]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                    Prod Date (DD/MM/YY)
                  </label>
                  <input
                    type="text"
                    value={item.prodDate}
                    onChange={e => updateLineItem(item.id, 'prodDate', e.target.value)}
                    placeholder="15/11/26"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-[#0A5C1D]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                    Exp Date / SLED
                  </label>
                  <input
                    type="text"
                    value={item.expDate}
                    onChange={e => updateLineItem(item.id, 'expDate', e.target.value)}
                    placeholder="15/11/27"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-[#0A5C1D]"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                    Quantity (e.g. 25 kg)
                  </label>
                  <input
                    type="text"
                    value={item.quantity}
                    onChange={e => updateLineItem(item.id, 'quantity', e.target.value)}
                    placeholder="e.g. 24,000 kg"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#0A5C1D]"
                  />
                </div>

                {/* Green trash delete icon button */}
                <div className="sm:col-span-1 flex justify-center pt-3 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => removeLineItem(item.id)}
                    disabled={lineItems.length === 1}
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
              placeholder="Record any physical seal discrepancies, temperature deviations, audit notices, or handling remarks..."
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
    </div>
  );
};
