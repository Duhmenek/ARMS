import { FileRecord, NotificationItem, DailyLogCount, ActivityItem, ActiveUserPresence } from '../types';

// Empty default activity logs: populated ONLY from real authenticated user logins and real user actions
export const INITIAL_ACTIVITIES: ActivityItem[] = [];

// Empty default active users: populated ONLY from real authenticated user logins and presence channels
export const INITIAL_ACTIVE_USERS: ActiveUserPresence[] = [];

export const INITIAL_FILES: FileRecord[] = [
  {
    id: 'file-001',
    armsRef: 'IB2026-IFT001',
    transactionType: 'Receiving of IFT deliveries',
    materialDoc: '5001928374',
    deliveryPo: 'PO-88291039',
    grDate: '17/11/26',
    materialNumber: 'MAT-NES-00192',
    vendorSiteNumber: 'VEND-4019-LIP',
    vamNumber: 'VAM-2026-0881',
    freightOrder: 'FO-9910283',
    numPackages: 48,
    operator: 'Ramon Castillo',
    encoder: 'Central Receiving Desk',
    checker: 'Shift Quality Checker',
    plateNumber: 'NBT-8921',
    location: {
      zone: 'Zone A',
      shelf: 'Shelf 01',
      folder: 'Folder 04',
      code: 'A01'
    },
    retentionDate: '17/11/31',
    retentionStatus: 'Active',
    remarks: 'IFT Delivery from Nestle Lipa Factory. Complete with COA and temp-logger logs.',
    lineItems: [
      { id: 'li-1', batchCode: 'BCH-26-881A', prodDate: '10/11/26', expDate: '10/11/27', quantity: '24,000 kg' },
      { id: 'li-2', batchCode: 'BCH-26-881B', prodDate: '11/11/26', expDate: '11/11/27', quantity: '24,000 kg' }
    ],
    status: 'Available',
    custodian: 'Archive Custody',
    createdAt: '2026-11-17T08:30:00Z',
    updatedAt: '2026-11-17T08:30:00Z'
  },
  {
    id: 'file-002',
    armsRef: 'IB2026-IFT002',
    transactionType: 'Inbound',
    materialDoc: '5001928390',
    deliveryPo: 'PO-88291045',
    grDate: '18/11/26',
    materialNumber: 'MAT-NES-00204',
    vendorSiteNumber: 'VEND-4022-CAB',
    vamNumber: 'VAM-2026-0884',
    freightOrder: 'FO-9910290',
    numPackages: 36,
    operator: 'Danilo Santos',
    encoder: 'Central Receiving Desk',
    checker: 'Shift Quality Checker',
    plateNumber: 'CAR-4491',
    location: {
      zone: 'Zone A',
      shelf: 'Shelf 02',
      folder: 'Folder 11',
      code: 'A02'
    },
    retentionDate: '18/11/31',
    retentionStatus: 'Active',
    remarks: 'Standard palletized storage. Verified barcode scanning 100% match.',
    lineItems: [
      { id: 'li-3', batchCode: 'BCH-26-904X', prodDate: '12/11/26', expDate: '12/11/28', quantity: '18,500 kg' }
    ],
    status: 'Available',
    custodian: 'Archive Custody',
    createdAt: '2026-11-18T09:15:00Z',
    updatedAt: '2026-11-18T09:15:00Z'
  },
  {
    id: 'file-003',
    armsRef: 'OB2026-DIS014',
    transactionType: 'Dispatch of local resupply',
    materialDoc: '4900812938',
    deliveryPo: 'DO-77182901',
    grDate: '19/11/26',
    materialNumber: 'MAT-NES-00811',
    vendorSiteNumber: 'HUB-CEBU-01',
    vamNumber: 'VAM-2026-0902',
    freightOrder: 'FO-9910344',
    numPackages: 60,
    operator: 'Gilbert Mendoza',
    encoder: 'Outbound Dispatch Office',
    checker: 'Shift Quality Checker',
    plateNumber: 'NFS-7312',
    location: {
      zone: 'Zone B',
      shelf: 'Shelf 01',
      folder: 'Folder 03',
      code: 'B01'
    },
    retentionDate: '19/11/29',
    retentionStatus: 'Active',
    remarks: 'Resupply to Adsia Visayas Central DC. Clean bill of lading signed.',
    lineItems: [
      { id: 'li-4', batchCode: 'BCH-26-773K', prodDate: '01/10/26', expDate: '01/10/27', quantity: '30,000 cs' }
    ],
    status: 'Borrowed',
    borrowInfo: {
      borrowerName: 'Elena Villareal',
      familyName: 'Villareal',
      givenName: 'Elena',
      designation: 'Senior QA Compliance Auditor',
      purpose: 'Nestle Internal Audit',
      requestDate: '21/11/26',
      approvedDate: '21/11/26',
      transactionSeries: '2026-081',
      approvedBy: 'Operations Management'
    },
    custodian: 'Archive Custody',
    createdAt: '2026-11-19T11:00:00Z',
    updatedAt: '2026-11-21T14:20:00Z'
  },
  {
    id: 'file-004',
    armsRef: 'OB2026-DIS015',
    transactionType: 'Outbound',
    materialDoc: '4900812955',
    deliveryPo: 'DO-77182920',
    grDate: '20/11/26',
    materialNumber: 'MAT-NES-00910',
    vendorSiteNumber: 'HUB-DVO-02',
    vamNumber: 'VAM-2026-0915',
    freightOrder: 'FO-9910360',
    numPackages: 40,
    operator: 'Joel Bautista',
    encoder: 'Outbound Dispatch Office',
    checker: 'Shift Quality Checker',
    plateNumber: 'WQX-9102',
    location: {
      zone: 'Zone B',
      shelf: 'Shelf 03',
      folder: 'Folder 08',
      code: 'B03'
    },
    retentionDate: '20/11/29',
    retentionStatus: 'Active',
    remarks: 'Dispatched on time. Fast-track replenishment lane.',
    lineItems: [
      { id: 'li-5', batchCode: 'BCH-26-889M', prodDate: '15/10/26', expDate: '15/10/27', quantity: '15,000 cs' }
    ],
    status: 'Available',
    custodian: 'Archive Custody',
    createdAt: '2026-11-20T14:40:00Z',
    updatedAt: '2026-11-20T14:40:00Z'
  },
  {
    id: 'file-005',
    armsRef: 'SC2026-SCR007',
    transactionType: 'Dispatch of scraps',
    materialDoc: '6000291823',
    deliveryPo: 'SCR-9901823',
    grDate: '15/11/26',
    materialNumber: 'MAT-SCR-991',
    vendorSiteNumber: 'RECYCLE-CAL-04',
    vamNumber: 'VAM-2026-0850',
    freightOrder: 'FO-9910110',
    numPackages: 15,
    operator: 'Nestor Cruz',
    encoder: 'Environmental & Scrap Office',
    checker: 'Shift Quality Checker',
    plateNumber: 'TOY-1082',
    location: {
      zone: 'Zone C',
      shelf: 'Shelf 02',
      folder: 'Folder 01',
      code: 'C02'
    },
    retentionDate: '15/11/28',
    retentionStatus: 'Semi-Active',
    remarks: 'Damaged corrugated outer packaging scrap certificate verified by DENR accredited partner.',
    lineItems: [
      { id: 'li-6', batchCode: 'SCR-PKG-2601', prodDate: '01/09/26', expDate: '30/11/26', quantity: '4,250 kg' }
    ],
    status: 'Available',
    custodian: 'Archive Custody',
    createdAt: '2026-11-15T16:10:00Z',
    updatedAt: '2026-11-15T16:10:00Z'
  },
  {
    id: 'file-006',
    armsRef: 'INV2026-CYC03',
    transactionType: 'Daily cycle count',
    materialDoc: '7001928311',
    deliveryPo: 'CYC-2026-W47',
    grDate: '21/11/26',
    materialNumber: 'ALL-FMCG-Z01',
    vendorSiteNumber: 'INTERNAL-WHSE',
    vamNumber: 'VAM-2026-0920',
    freightOrder: 'N/A-INTERNAL',
    numPackages: 120,
    operator: 'Teodoro Alonzo',
    encoder: 'Inventory Control Team',
    checker: 'Shift Quality Checker',
    plateNumber: 'N/A-FLOOR',
    location: {
      zone: 'Zone D',
      shelf: 'Shelf 01',
      folder: 'Folder 09',
      code: 'D01'
    },
    retentionDate: '21/11/27',
    retentionStatus: 'Near Expiry',
    remarks: 'Weekly 100% variance-free wall-to-wall cycle count sheet for Ambient High Bay.',
    lineItems: [
      { id: 'li-7', batchCode: 'CNT-W47-01', prodDate: '21/11/26', expDate: '21/11/27', quantity: '1,200 loc' }
    ],
    status: 'Available',
    custodian: 'Archive Custody',
    createdAt: '2026-11-21T18:00:00Z',
    updatedAt: '2026-11-21T18:00:00Z'
  },
  {
    id: 'file-007',
    armsRef: 'IB2026-LOC029',
    transactionType: 'Receiving of local deliveries',
    materialDoc: '5001929001',
    deliveryPo: 'PO-88291100',
    grDate: '14/11/26',
    materialNumber: 'MAT-NES-00331',
    vendorSiteNumber: 'VEND-LOCAL-CAN',
    vamNumber: 'VAM-2026-0842',
    freightOrder: 'FO-9910080',
    numPackages: 24,
    operator: 'Benigno Aquino',
    encoder: 'Central Receiving Desk',
    checker: 'Shift Quality Checker',
    plateNumber: 'NDS-5521',
    location: {
      zone: 'Zone A',
      shelf: 'Shelf 04',
      folder: 'Folder 15',
      code: 'A04'
    },
    retentionDate: '14/11/31',
    retentionStatus: 'Active',
    remarks: 'Tin plate food cans delivery for packaging operations.',
    lineItems: [
      { id: 'li-8', batchCode: 'CAN-26-1102', prodDate: '05/11/26', expDate: '05/11/29', quantity: '50,000 pcs' }
    ],
    status: 'Pending',
    borrowInfo: {
      borrowerName: 'Carlos P. Garcia',
      familyName: 'Garcia',
      givenName: 'Carlos',
      designation: 'Safety & Environment Officer',
      purpose: 'Internal Market SHE Audit',
      requestDate: '22/11/26',
      transactionSeries: '2026-084'
    },
    custodian: 'Archive Custody',
    createdAt: '2026-11-14T10:20:00Z',
    updatedAt: '2026-11-22T08:50:00Z'
  },
  {
    id: 'file-008',
    armsRef: 'OB2026-DIS016',
    transactionType: 'Dispatch of local resupply',
    materialDoc: '4900813002',
    deliveryPo: 'DO-77182980',
    grDate: '22/11/26',
    materialNumber: 'MAT-NES-00192',
    vendorSiteNumber: 'HUB-ILO-03',
    vamNumber: 'VAM-2026-0941',
    freightOrder: 'FO-9910405',
    numPackages: 55,
    operator: 'Federico Perez',
    encoder: 'Outbound Dispatch Office',
    checker: 'Shift Quality Checker',
    plateNumber: 'TUV-8822',
    location: {
      zone: 'Zone B',
      shelf: 'Shelf 02',
      folder: 'Folder 05',
      code: 'B02'
    },
    retentionDate: '22/11/29',
    retentionStatus: 'Active',
    remarks: 'Direct store replenishment transfer order.',
    lineItems: [
      { id: 'li-9', batchCode: 'BCH-26-920L', prodDate: '18/11/26', expDate: '18/11/27', quantity: '22,000 kg' }
    ],
    status: 'Pending',
    borrowInfo: {
      borrowerName: 'Melchora Aquino',
      familyName: 'Aquino',
      givenName: 'Melchora',
      designation: 'External Quality Auditor',
      purpose: 'Halal Audit',
      requestDate: '22/11/26',
      transactionSeries: '2026-085'
    },
    custodian: 'Archive Custody',
    createdAt: '2026-11-22T13:00:00Z',
    updatedAt: '2026-11-22T16:15:00Z'
  }
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-001',
    title: 'Pending Approval',
    message: 'Requisition to borrow ARMS Ref. IB2026-LOC029 is pending for approval from Operations Management.',
    transactionSeries: 'Transaction Series 2026-084',
    armsRef: 'IB2026-LOC029',
    status: 'Pending',
    isRead: false,
    isStarred: true,
    createdAt: '2026-11-22T08:50:00Z',
    borrowRequestId: 'req-001',
    borrowerName: 'Carlos P. Garcia',
    designation: 'Safety & Environment Officer',
    purpose: 'Internal Market SHE Audit'
  },
  {
    id: 'notif-002',
    title: 'Pending Approval',
    message: 'Requisition to borrow ARMS Ref. OB2026-DIS016 is pending for approval from Operations Management.',
    transactionSeries: 'Transaction Series 2026-085',
    armsRef: 'OB2026-DIS016',
    status: 'Pending',
    isRead: false,
    isStarred: false,
    createdAt: '2026-11-22T16:15:00Z',
    borrowRequestId: 'req-002',
    borrowerName: 'Melchora Aquino',
    designation: 'External Quality Auditor',
    purpose: 'Halal Audit'
  },
  {
    id: 'notif-003',
    title: 'Request Approved',
    message: 'Requisition to borrow ARMS Ref. OB2026-DIS014 was approved by Operations Management.',
    transactionSeries: 'Transaction Series 2026-081',
    armsRef: 'OB2026-DIS014',
    status: 'Approved',
    isRead: true,
    isStarred: true,
    createdAt: '2026-11-21T14:20:00Z',
    borrowRequestId: 'req-000',
    borrowerName: 'Elena Villareal',
    designation: 'Senior QA Compliance Auditor',
    purpose: 'Nestle Internal Audit'
  }
];

export const INITIAL_LOG_COUNTS: DailyLogCount[] = [
  {
    id: 'log-001',
    date: '23/11/2026',
    inbound: 18,
    outbound: 24,
    scrap: 3,
    inventory: 6,
    rhTemp: 24,
    rackInspections: 8,
    mhePreOps: 12,
    submittedBy: 'Shift Supervisor',
    submittedAt: '2026-11-23T08:00:00Z'
  }
];

export const CATEGORY_BREAKDOWN = [
  { name: 'Outbound', percentage: 37, count: 445, color: '#0A5C1D' },
  { name: 'Inbound', percentage: 21, count: 253, color: '#1B8A2F' },
  { name: 'Scrap', percentage: 18, count: 216, color: '#2FA848' },
  { name: 'Inventory', percentage: 16, count: 193, color: '#A8E0A8' },
  { name: 'Others', percentage: 8, count: 98, color: '#222222' }
];

export const TRANSACTION_PROGRESS_METRICS = [
  { label: 'Dispatch of local resupply', count: 342, total: 500, percent: 68 },
  { label: 'Receiving of IFT deliveries', count: 288, total: 500, percent: 57 },
  { label: 'Receiving of local deliveries', count: 215, total: 500, percent: 43 },
  { label: 'Dispatch of scraps', count: 184, total: 500, percent: 36 },
  { label: 'Daily cycle count', count: 142, total: 500, percent: 28 },
  { label: 'Others', count: 34, total: 500, percent: 7 }
];

export const ACTIVITY_7DAYS = [
  { day: 'Mon 17', uploads: 45, borrows: 6, label: '45 transactions · 6 borrows' },
  { day: 'Tue 18', uploads: 58, borrows: 8, label: '58 transactions · 8 borrows' },
  { day: 'Wed 19', uploads: 62, borrows: 12, label: '62 transactions · 12 borrows' },
  { day: 'Thu 20', uploads: 54, borrows: 9, label: '54 transactions · 9 borrows' },
  { day: 'Fri 21', uploads: 72, borrows: 10, label: '72 transactions · 10 borrows' },
  { day: 'Sat 22', uploads: 38, borrows: 5, label: '38 transactions · 5 borrows' },
  { day: 'Sun 23', uploads: 24, borrows: 3, label: '24 transactions · 3 borrows' }
];
