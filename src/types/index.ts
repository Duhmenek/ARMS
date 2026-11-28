export type UserRole = 'management' | 'custodian' | 'encoder' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roleTitle: string;
  avatar?: string;
  department?: string;
}

export interface ActiveUserPresence {
  userId: string;
  name: string;
  email: string;
  role: string;
  onlineAt: string;
}

export type TransactionType =
  | 'Inbound'
  | 'Outbound'
  | 'Scrap Management'
  | 'Inventory Count'
  | 'Dispatch of local resupply'
  | 'Receiving of IFT deliveries'
  | 'Receiving of local deliveries'
  | 'Dispatch of scraps'
  | 'Daily cycle count'
  | 'Other';

export type RecordStatus = 'Available' | 'Borrowed' | 'Pending';

export type RetentionStatus = 'Active' | 'Semi-Active' | 'Near Expiry' | 'Disposal Due';

export interface LineItem {
  id: string;
  batchCode: string;
  prodDate: string; // DD/MM/YY
  expDate: string;  // DD/MM/YY
  quantity: string;
}

export interface FileRecord {
  id: string;
  armsRef: string;
  transactionType: TransactionType;
  materialDoc: string;
  deliveryPo: string;
  grDate: string;
  materialNumber: string;
  vendorSiteNumber: string;
  vamNumber: string;
  freightOrder: string;
  numPackages: number;
  operator: string;
  encoder: string;
  checker: string;
  plateNumber: string;
  location: {
    zone: string;
    shelf: string;
    folder: string;
    code: string;
  };
  retentionDate: string;
  retentionStatus: RetentionStatus;
  remarks: string;
  lineItems: LineItem[];
  status: RecordStatus;
  borrowInfo?: {
    borrowerName: string;
    familyName: string;
    givenName: string;
    designation: string;
    purpose: string;
    requestDate: string;
    approvedDate?: string;
    transactionSeries: string;
    approvedBy?: string;
  };
  createdAt: string;
  updatedAt: string;
  custodian: string;
  assignedCustodian?: string;
}

export interface BorrowRequest {
  id: string;
  transactionSeries: string;
  armsRef: string;
  fileId: string;
  familyName: string;
  givenName: string;
  designation: string;
  purpose: string;
  requestDate: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Returned';
  approvedBy?: string;
  approvedDate?: string;
  notes?: string;
}

export interface NotificationItem {
  id: string;
  title: string; // "Pending Approval" or "Request Approved" or "Request Rejected"
  message: string;
  transactionSeries: string;
  armsRef: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'System';
  isRead: boolean;
  isStarred: boolean;
  createdAt: string;
  borrowRequestId?: string;
  borrowerName?: string;
  designation?: string;
  purpose?: string;
}

export interface DailyLogCount {
  id: string;
  date: string; // DD/MM/YYYY
  inbound: number;
  outbound: number;
  scrap: number;
  inventory: number;
  rhTemp: number;
  rackInspections: number;
  mhePreOps: number;
  submittedBy: string;
  submittedAt: string;
}

export interface LogEntry {
  id: string;
  uniqueCode: string;
  transactionType: TransactionType;
  materialNumber: string;
  materialDescription: string;
  date: string;
  po: string;
  drInvNumber: string;
  proNumber: string;
  vamNumber: string;
  plateNumber: string;
  operator: string;
  materialCondition: 'OK' | 'NOT OK' | '';
  truckCvCondition: 'OK' | 'NOT OK' | '';
  noInfestation: 'OK' | 'NOT OK' | '';
  truckCvOdor: 'OK' | 'NOT OK' | '';
  truckCvSeal: 'OK' | 'NOT OK' | '';
  gateIn: string;
  unloadingStart: string;
  unloadingEnd: string;
  dwellMinutes: number | null;
  createdBy: string;
  createdAt: string;
}

export interface ActivityItem {
  id: string;
  type: 'upload' | 'borrow' | 'approval' | 'return' | 'log_count' | 'log_entry' | 'reject' | 'login' | 'logout';
  title: string;
  description: string;
  armsRef?: string;
  user: string;
  timestamp: string;
  statusBadge?: string;
}

export type ReportType = 'borrow' | 'retention' | 'compliance' | 'documents' | 'storage';
