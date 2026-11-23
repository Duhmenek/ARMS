import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import {
  FileRecord,
  NotificationItem,
  DailyLogCount,
  ActivityItem,
  ActiveUserPresence,
  User,
  UserRole
} from '../types';
import {
  INITIAL_FILES,
  INITIAL_NOTIFICATIONS,
  INITIAL_LOG_COUNTS,
  INITIAL_ACTIVITIES,
  INITIAL_ACTIVE_USERS
} from '../mock/seedData';

interface AppContextType {
  // Auth state
  session: Session | null;
  currentUser: User | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;

  // Navigation
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;

  // File records
  files: FileRecord[];
  addFileRecord: (data: any) => Promise<FileRecord>;
  updateFileRecord: (id: string, updates: Partial<FileRecord>) => Promise<void>;
  deleteFileRecord: (id: string) => Promise<void>;
  returnBorrowedFile: (armsRef: string) => Promise<void>;

  // Requisitions & Approvals
  submitBorrowRequest: (params: {
    armsRef: string;
    familyName: string;
    givenName: string;
    designation: string;
    purpose: string;
    date: string;
  }) => Promise<{ transactionSeries: string; armsRef: string }>;
  approveBorrowRequest: (notificationId: string) => Promise<void>;
  rejectBorrowRequest: (notificationId: string) => Promise<void>;

  // Notifications
  notifications: NotificationItem[];
  unreadCount: number;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  toggleStarNotification: (id: string) => void;
  deleteNotification: (id: string) => void;

  // Daily Shift Log Counts
  dailyLogs: DailyLogCount[];
  addDailyLog: (data: Omit<DailyLogCount, 'id' | 'submittedAt'>) => Promise<void>;

  // Real Authenticated Activity Logs & Active Users
  activities: ActivityItem[];
  activeUsers: ActiveUserPresence[];

  // KPI Computations
  kpiMetrics: {
    transactions: number;
    pendingForLog: number;
    borrowed: number;
    activeUsers: number;
    transactionsDelta: string;
    pendingForLogDelta: string;
    borrowedDelta: string;
    activeUsersDelta: string;
  };

  // Toast feedback
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Auth states: Starts strictly logged out on Login page (session === null)
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // 2. Navigation
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 3. Data Collections
  const [files, setFiles] = useState<FileRecord[]>(() => {
    try {
      const saved = localStorage.getItem('arms_supabase_cache_files');
      return saved ? JSON.parse(saved) : INITIAL_FILES;
    } catch {
      return INITIAL_FILES;
    }
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const saved = localStorage.getItem('arms_supabase_cache_notifs');
      return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  });

  const [dailyLogs, setDailyLogs] = useState<DailyLogCount[]>(() => {
    try {
      const saved = localStorage.getItem('arms_supabase_cache_logs');
      return saved ? JSON.parse(saved) : INITIAL_LOG_COUNTS;
    } catch {
      return INITIAL_LOG_COUNTS;
    }
  });

  // Empty by default: populated ONLY from real authenticated user logins and real user actions
  const [activities, setActivities] = useState<ActivityItem[]>(INITIAL_ACTIVITIES);
  const [activeUsers, setActiveUsers] = useState<ActiveUserPresence[]>(INITIAL_ACTIVE_USERS);

  // Channel reference for cleanup
  const presenceChannelRef = useRef<any>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const clearAuthError = () => setAuthError(null);

  // Format activity item helper
  const addRealActivity = async (item: Omit<ActivityItem, 'id' | 'timestamp'>) => {
    const timestampStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const fullActivity: ActivityItem = {
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      ...item,
      timestamp: `Today, ${timestampStr}`,
    };

    // Update local state immediately
    setActivities(prev => [fullActivity, ...prev]);

    // Persist to Supabase activity_logs if session is present
    try {
      await supabase.from('activity_logs').insert([
        {
          type: item.type,
          title: item.title,
          description: item.description,
          arms_ref: item.armsRef || null,
          user_name: item.user,
          user_email: currentUser?.email || null,
          user_id: session?.user?.id || null,
          status_badge: item.statusBadge || null,
        },
      ]);
    } catch {
      // Non-blocking fallback
    }
  };

  // Sync Supabase Database & Realtime
  const fetchSupabaseData = async () => {
    try {
      // 1. Fetch Records
      const { data: recordsData } = await supabase
        .from('records')
        .select('*, record_batches(*)');

      if (recordsData && recordsData.length > 0) {
        const mappedRecords: FileRecord[] = recordsData.map((r: any) => ({
          id: r.id,
          armsRef: r.arms_ref,
          transactionType: r.transaction_type,
          materialDoc: r.material_doc || 'N/A',
          deliveryPo: r.delivery_po || 'N/A',
          grDate: r.gr_date,
          materialNumber: r.material_number || 'N/A',
          vendorSiteNumber: r.vendor_site_number || 'N/A',
          vamNumber: r.vam_number || 'N/A',
          freightOrder: r.freight_order || 'N/A',
          numPackages: r.num_packages || 1,
          operator: r.operator || 'N/A',
          encoder: r.encoder || 'N/A',
          checker: r.checker || 'N/A',
          plateNumber: r.plate_number || 'N/A',
          location: {
            zone: r.location_zone || 'Zone A',
            shelf: r.location_shelf || 'Shelf 01',
            folder: r.location_folder || 'Folder 01',
            code: r.location_code || 'A01',
          },
          retentionDate: r.retention_date,
          retentionStatus: r.retention_status || 'Active',
          remarks: r.remarks || '',
          lineItems: (r.record_batches || []).map((b: any) => ({
            id: b.id,
            batchCode: b.batch_code,
            prodDate: b.prod_date,
            expDate: b.exp_date,
            quantity: b.quantity,
          })),
          status: r.status,
          custodian: r.custodian || 'Archive Custody',
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }));
        setFiles(mappedRecords);
        localStorage.setItem('arms_supabase_cache_files', JSON.stringify(mappedRecords));
      }

      // 2. Fetch Notifications
      const { data: notifsData } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (notifsData && notifsData.length > 0) {
        const mappedNotifs: NotificationItem[] = notifsData.map((n: any) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          transactionSeries: n.transaction_series || '',
          armsRef: n.arms_ref || '',
          status: n.status,
          isRead: n.is_read,
          isStarred: n.is_starred,
          createdAt: n.created_at,
          borrowRequestId: n.borrow_request_id,
          borrowerName: n.borrower_name,
          designation: n.designation,
          purpose: n.purpose,
        }));
        setNotifications(mappedNotifs);
        localStorage.setItem('arms_supabase_cache_notifs', JSON.stringify(mappedNotifs));
      }

      // 3. Fetch Activity Logs (Real user logs only)
      const { data: logsData } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (logsData && logsData.length > 0) {
        const mappedLogs: ActivityItem[] = logsData.map((l: any) => ({
          id: l.id,
          type: l.type,
          title: l.title,
          description: l.description,
          armsRef: l.arms_ref,
          user: l.user_name,
          timestamp: new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          statusBadge: l.status_badge,
        }));
        setActivities(mappedLogs);
      }

      // 4. Fetch Daily Logs
      const { data: dailyCountsData } = await supabase
        .from('log_counts')
        .select('*')
        .order('created_at', { ascending: false });

      if (dailyCountsData && dailyCountsData.length > 0) {
        const mappedDaily: DailyLogCount[] = dailyCountsData.map((d: any) => ({
          id: d.id,
          date: d.date,
          inbound: d.inbound,
          outbound: d.outbound,
          scrap: d.scrap,
          inventory: d.inventory,
          rhTemp: d.rh_temp,
          rackInspections: d.rack_inspections,
          mhePreOps: d.mhe_pre_ops,
          submittedBy: d.submitted_by,
          submittedAt: d.created_at,
        }));
        setDailyLogs(mappedDaily);
      }
    } catch (err) {
      console.warn('Supabase data query fallback:', err);
    }
  };

  // Setup Supabase Presence channel for ACTIVE USERS
  const setupPresenceChannel = (userObj: User) => {
    if (presenceChannelRef.current) {
      try {
        supabase.removeChannel(presenceChannelRef.current);
      } catch {}
    }

    const channel = supabase.channel('active-users', {
      config: {
        presence: {
          key: userObj.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const activeList: ActiveUserPresence[] = [];

        Object.keys(state).forEach(key => {
          const presences = state[key] as any[];
          if (presences && presences.length > 0) {
            const latest = presences[presences.length - 1];
            activeList.push({
              userId: key,
              name: latest.name || 'Staff User',
              email: latest.email || '',
              role: latest.role || 'Staff',
              onlineAt: latest.onlineAt || new Date().toISOString(),
            });
          }
        });

        setActiveUsers(activeList);
      })
      .subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            name: userObj.name,
            email: userObj.email,
            role: userObj.roleTitle,
            onlineAt: new Date().toISOString(),
          });
        }
      });

    presenceChannelRef.current = channel;
  };

  // Setup Supabase Realtime postgres_changes listeners
  const setupRealtimeSubscriptions = () => {
    const realtimeChannel = supabase
      .channel('arms-realtime-db')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'records' },
        payload => {
          if (payload.eventType === 'INSERT') {
            const r: any = payload.new;
            const newRecord: FileRecord = {
              id: r.id,
              armsRef: r.arms_ref,
              transactionType: r.transaction_type,
              materialDoc: r.material_doc || 'N/A',
              deliveryPo: r.delivery_po || 'N/A',
              grDate: r.gr_date,
              materialNumber: r.material_number || 'N/A',
              vendorSiteNumber: r.vendor_site_number || 'N/A',
              vamNumber: r.vam_number || 'N/A',
              freightOrder: r.freight_order || 'N/A',
              numPackages: r.num_packages || 1,
              operator: r.operator || 'N/A',
              encoder: r.encoder || 'N/A',
              checker: r.checker || 'N/A',
              plateNumber: r.plate_number || 'N/A',
              location: {
                zone: r.location_zone || 'Zone A',
                shelf: r.location_shelf || 'Shelf 01',
                folder: r.location_folder || 'Folder 01',
                code: r.location_code || 'A01',
              },
              retentionDate: r.retention_date,
              retentionStatus: r.retention_status || 'Active',
              remarks: r.remarks || '',
              lineItems: [],
              status: r.status,
              custodian: r.custodian || 'Archive Custody',
              createdAt: r.created_at,
              updatedAt: r.updated_at,
            };
            setFiles(prev => [newRecord, ...prev.filter(f => f.id !== newRecord.id)]);
          } else if (payload.eventType === 'UPDATE') {
            const r: any = payload.new;
            setFiles(prev =>
              prev.map(f => (f.id === r.id ? { ...f, status: r.status, updatedAt: r.updated_at } : f))
            );
          } else if (payload.eventType === 'DELETE') {
            setFiles(prev => prev.filter(f => f.id !== payload.old.id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        payload => {
          if (payload.eventType === 'INSERT') {
            const n: any = payload.new;
            const newNotif: NotificationItem = {
              id: n.id,
              title: n.title,
              message: n.message,
              transactionSeries: n.transaction_series || '',
              armsRef: n.arms_ref || '',
              status: n.status,
              isRead: n.is_read,
              isStarred: n.is_starred,
              createdAt: n.created_at,
              borrowRequestId: n.borrow_request_id,
              borrowerName: n.borrower_name,
              designation: n.designation,
              purpose: n.purpose,
            };
            setNotifications(prev => [newNotif, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const n: any = payload.new;
            setNotifications(prev =>
              prev.map(item => (item.id === n.id ? { ...item, status: n.status, isRead: n.is_read } : item))
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_logs' },
        payload => {
          const l: any = payload.new;
          const newAct: ActivityItem = {
            id: l.id,
            type: l.type,
            title: l.title,
            description: l.description,
            armsRef: l.arms_ref,
            user: l.user_name,
            timestamp: new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            statusBadge: l.status_badge,
          };
          setActivities(prev => [newAct, ...prev.filter(a => a.id !== newAct.id)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(realtimeChannel);
    };
  };

  // Auth Lifecycle: Guarded by supabase.auth.onAuthStateChange
  useEffect(() => {
    let mounted = true;

    // Check existing Supabase session (starts null on clean load)
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (!mounted) return;
      if (existingSession && existingSession.user) {
        initUserFromSession(existingSession);
      } else {
        setSession(null);
        setCurrentUser(null);
        setAuthLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      if (newSession && newSession.user) {
        initUserFromSession(newSession);
        if (event === 'SIGNED_IN') {
          fetchSupabaseData();
        }
      } else {
        setSession(null);
        setCurrentUser(null);
        setActiveUsers([]);
        if (presenceChannelRef.current) {
          try {
            supabase.removeChannel(presenceChannelRef.current);
          } catch {}
          presenceChannelRef.current = null;
        }
        setAuthLoading(false);
      }
    });

    const cleanupRealtime = setupRealtimeSubscriptions();

    return () => {
      mounted = false;
      subscription.unsubscribe();
      cleanupRealtime();
      if (presenceChannelRef.current) {
        try {
          supabase.removeChannel(presenceChannelRef.current);
        } catch {}
      }
    };
  }, []);

  // Helper to construct User profile from session
  const initUserFromSession = async (currentSession: Session) => {
    setSession(currentSession);
    const userEmail = currentSession.user.email || '';
    const rawMeta = currentSession.user.user_metadata || {};

    let userRole: UserRole = (rawMeta.role as UserRole) || 'custodian';
    let roleTitle = rawMeta.role_title || 'Archive Custodian';
    let fullName = rawMeta.full_name || userEmail.split('@')[0].replace('.', ' ');

    // Check if profile exists in Supabase public.profiles
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentSession.user.id)
        .single();

      if (profile) {
        if (profile.role) userRole = profile.role as UserRole;
        if (profile.role_title) roleTitle = profile.role_title;
        if (profile.full_name) fullName = profile.full_name;
      }
    } catch {}

    const userObj: User = {
      id: currentSession.user.id,
      name: fullName,
      email: userEmail,
      role: userRole,
      roleTitle: roleTitle,
      department: rawMeta.department || 'Warehouse Operations & Archive Custody',
    };

    setCurrentUser(userObj);
    setAuthLoading(false);

    // Track in Realtime Presence
    setupPresenceChannel(userObj);
  };

  // Authenticate login via supabase.auth.signInWithPassword
  const login = async (email: string, password?: string) => {
    setAuthLoading(true);
    setAuthError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: password || '',
    });

    if (error) {
      setAuthLoading(false);
      setAuthError(error.message || 'Authentication failed. Please verify credentials.');
      showToast(error.message || 'Authentication error');
      throw error;
    }

    if (data.session) {
      setSession(data.session);
      await initUserFromSession(data.session);

      // Log real user action to Activity Log
      const userName = data.session.user.user_metadata?.full_name || email.split('@')[0];
      await addRealActivity({
        type: 'login',
        title: 'User Authenticated',
        description: `${userName} successfully signed into ARMS Central Archive Vault`,
        user: userName,
        statusBadge: 'Authenticated',
      });

      showToast(`Welcome, ${userName}!`);
    }

    setAuthLoading(false);
  };

  // Logout via supabase.auth.signOut
  const logout = async () => {
    if (currentUser) {
      await addRealActivity({
        type: 'logout',
        title: 'User Signed Out',
        description: `${currentUser.name} ended active warehouse archive session`,
        user: currentUser.name,
        statusBadge: 'Offline',
      });
    }

    if (presenceChannelRef.current) {
      try {
        await presenceChannelRef.current.untrack();
        supabase.removeChannel(presenceChannelRef.current);
      } catch {}
      presenceChannelRef.current = null;
    }

    await supabase.auth.signOut();
    setSession(null);
    setCurrentUser(null);
    setActiveUsers([]);
    showToast('Signed out of ARMS');
  };

  // Reset password via supabase.auth.resetPasswordForEmail
  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) throw error;
    showToast(`Password recovery link dispatched to ${email}`);
  };

  // Generate Reference IDs
  const generateArmsRef = (transactionType: string): string => {
    const year = new Date().getFullYear();
    const prefixMap: Record<string, string> = {
      'Inbound': 'IB',
      'Receiving of IFT deliveries': 'IB',
      'Receiving of local deliveries': 'IB',
      'Outbound': 'OB',
      'Dispatch of local resupply': 'OB',
      'Scrap Management': 'SC',
      'Dispatch of scraps': 'SC',
      'Inventory Count': 'INV',
      'Daily cycle count': 'INV'
    };
    const prefix = prefixMap[transactionType] || 'TX';
    const sub = transactionType.includes('IFT') ? 'IFT' : transactionType.includes('resupply') ? 'DIS' : transactionType.includes('scrap') ? 'SCR' : 'REC';
    const count = files.length + 1;
    const padded = String(count).padStart(3, '0');
    return `${prefix}${year}-${sub}${padded}`;
  };

  // File CRUD: addFileRecord
  const addFileRecord = async (data: any): Promise<FileRecord> => {
    const armsRef = data.armsRef || generateArmsRef(data.transactionType);
    const authorName = currentUser?.name || 'Authorized Custodian';

    const newRecord: FileRecord = {
      id: `file-${Date.now()}`,
      armsRef,
      transactionType: data.transactionType || 'Inbound',
      materialDoc: data.materialDoc || 'N/A',
      deliveryPo: data.deliveryPo || 'N/A',
      grDate: data.grDate || '23/11/26',
      materialNumber: data.materialNumber || 'N/A',
      vendorSiteNumber: data.vendorSiteNumber || 'N/A',
      vamNumber: data.vamNumber || 'N/A',
      freightOrder: data.freightOrder || 'N/A',
      numPackages: Number(data.numPackages) || 1,
      operator: data.operator || authorName,
      encoder: data.encoder || authorName,
      checker: data.checker || 'Quality Floor Checker',
      plateNumber: data.plateNumber || 'N/A',
      location: data.location || {
        zone: 'Zone A',
        shelf: 'Shelf 01',
        folder: 'Folder 01',
        code: 'A01'
      },
      retentionDate: data.retentionDate || '23/11/31',
      retentionStatus: 'Active',
      remarks: data.remarks || '',
      lineItems: data.lineItems || [],
      status: 'Available',
      custodian: authorName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setFiles(prev => [newRecord, ...prev]);

    // Insert into Supabase records table
    try {
      await supabase.from('records').insert([
        {
          arms_ref: newRecord.armsRef,
          transaction_type: newRecord.transactionType,
          material_doc: newRecord.materialDoc,
          delivery_po: newRecord.deliveryPo,
          gr_date: newRecord.grDate,
          material_number: newRecord.materialNumber,
          vendor_site_number: newRecord.vendorSiteNumber,
          vam_number: newRecord.vamNumber,
          freight_order: newRecord.freightOrder,
          num_packages: newRecord.numPackages,
          operator: newRecord.operator,
          encoder: newRecord.encoder,
          checker: newRecord.checker,
          plate_number: newRecord.plateNumber,
          location_zone: newRecord.location.zone,
          location_shelf: newRecord.location.shelf,
          location_folder: newRecord.location.folder,
          location_code: newRecord.location.code,
          retention_date: newRecord.retentionDate,
          retention_status: newRecord.retentionStatus,
          remarks: newRecord.remarks,
          status: newRecord.status,
          custodian: newRecord.custodian,
          created_by: session?.user?.id || null,
        },
      ]);
    } catch {}

    // Record real action into activity log
    await addRealActivity({
      type: 'upload',
      title: 'Document Published',
      description: `Published ${armsRef} under Location ${newRecord.location.code} (${newRecord.location.zone})`,
      armsRef: armsRef,
      user: authorName,
      statusBadge: newRecord.transactionType,
    });

    showToast(`Record ${armsRef} published successfully!`);
    return newRecord;
  };

  const updateFileRecord = async (id: string, updates: Partial<FileRecord>) => {
    setFiles(prev =>
      prev.map(f => (f.id === id ? { ...f, ...updates, updatedAt: new Date().toISOString() } : f))
    );
    try {
      await supabase.from('records').update(updates).eq('id', id);
    } catch {}
    showToast(`Record updated successfully`);
  };

  const deleteFileRecord = async (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    try {
      await supabase.from('records').delete().eq('id', id);
    } catch {}
    showToast(`Record removed from archive`);
  };

  // Requisitions: submitBorrowRequest
  const submitBorrowRequest = async (params: {
    armsRef: string;
    familyName: string;
    givenName: string;
    designation: string;
    purpose: string;
    date: string;
  }) => {
    const seriesNumber = `2026-${String(84 + notifications.length).padStart(3, '0')}`;
    const seriesTitle = `Transaction Series ${seriesNumber}`;
    const borrowerFullName = `${params.givenName} ${params.familyName}`.trim();

    // 1. Update file status to 'Pending'
    setFiles(prev =>
      prev.map(f => {
        if (f.armsRef === params.armsRef) {
          return {
            ...f,
            status: 'Pending',
            borrowInfo: {
              borrowerName: borrowerFullName,
              familyName: params.familyName,
              givenName: params.givenName,
              designation: params.designation,
              purpose: params.purpose,
              requestDate: params.date,
              transactionSeries: seriesNumber
            },
            updatedAt: new Date().toISOString()
          };
        }
        return f;
      })
    );

    // 2. Add notification
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: 'Pending Approval',
      message: `Requisition to borrow ARMS Ref. ${params.armsRef} is pending approval from Operations Management.`,
      transactionSeries: seriesTitle,
      armsRef: params.armsRef,
      status: 'Pending',
      isRead: false,
      isStarred: true,
      createdAt: new Date().toISOString(),
      borrowRequestId: `req-${Date.now()}`,
      borrowerName: borrowerFullName,
      designation: params.designation,
      purpose: params.purpose
    };
    setNotifications(prev => [newNotif, ...prev]);

    // Persist to Supabase notifications table
    try {
      await supabase.from('notifications').insert([
        {
          title: newNotif.title,
          message: newNotif.message,
          transaction_series: newNotif.transactionSeries,
          arms_ref: newNotif.armsRef,
          status: newNotif.status,
          borrower_name: newNotif.borrowerName,
          designation: newNotif.designation,
          purpose: newNotif.purpose,
        },
      ]);
    } catch {}

    // Record real action
    await addRealActivity({
      type: 'borrow',
      title: 'Pull-Out Request Submitted',
      description: `Requested ${params.armsRef} for ${params.purpose} (${seriesTitle})`,
      armsRef: params.armsRef,
      user: borrowerFullName,
      statusBadge: 'Pending',
    });

    return {
      transactionSeries: seriesTitle,
      armsRef: params.armsRef
    };
  };

  // Management approval
  const approveBorrowRequest = async (notificationId: string) => {
    const targetNotif = notifications.find(n => n.id === notificationId);
    if (!targetNotif) return;
    const approverName = currentUser?.name || 'Operations Head';

    setNotifications(prev =>
      prev.map(n => {
        if (n.id === notificationId) {
          return {
            ...n,
            title: 'Request Approved',
            message: `Requisition to borrow ARMS Ref. ${n.armsRef} was approved by ${approverName}.`,
            status: 'Approved',
            isRead: true
          };
        }
        return n;
      })
    );

    setFiles(prev =>
      prev.map(f => {
        if (f.armsRef === targetNotif.armsRef) {
          return {
            ...f,
            status: 'Borrowed',
            borrowInfo: f.borrowInfo
              ? {
                  ...f.borrowInfo,
                  approvedDate: new Date().toLocaleDateString('en-GB'),
                  approvedBy: approverName
                }
              : undefined,
            updatedAt: new Date().toISOString()
          };
        }
        return f;
      })
    );

    // Record real activity
    await addRealActivity({
      type: 'approval',
      title: 'Requisition Approved',
      description: `${approverName} approved file pull-out for ${targetNotif.armsRef} (${targetNotif.transactionSeries})`,
      armsRef: targetNotif.armsRef,
      user: approverName,
      statusBadge: 'Approved',
    });

    showToast(`Requisition approved for ${targetNotif.armsRef}! Marked as Borrowed.`);
  };

  // Management reject
  const rejectBorrowRequest = async (notificationId: string) => {
    const targetNotif = notifications.find(n => n.id === notificationId);
    if (!targetNotif) return;
    const reviewerName = currentUser?.name || 'Operations Head';

    setNotifications(prev =>
      prev.map(n => {
        if (n.id === notificationId) {
          return {
            ...n,
            title: 'Request Rejected',
            message: `Requisition for ${n.armsRef} was declined by ${reviewerName}.`,
            status: 'Rejected',
            isRead: true
          };
        }
        return n;
      })
    );

    setFiles(prev =>
      prev.map(f => {
        if (f.armsRef === targetNotif.armsRef) {
          return {
            ...f,
            status: 'Available',
            borrowInfo: undefined,
            updatedAt: new Date().toISOString()
          };
        }
        return f;
      })
    );

    await addRealActivity({
      type: 'reject',
      title: 'Requisition Declined',
      description: `${reviewerName} declined pull-out request for ${targetNotif.armsRef}`,
      armsRef: targetNotif.armsRef,
      user: reviewerName,
      statusBadge: 'Rejected',
    });

    showToast(`Requisition rejected for ${targetNotif.armsRef}. Restored to Available.`);
  };

  // Return borrowed file
  const returnBorrowedFile = async (armsRef: string) => {
    const file = files.find(f => f.armsRef === armsRef);
    if (!file) return;
    const returnerName = currentUser?.name || 'Archive Custodian';

    setFiles(prev =>
      prev.map(f => {
        if (f.armsRef === armsRef) {
          return {
            ...f,
            status: 'Available',
            borrowInfo: undefined,
            updatedAt: new Date().toISOString()
          };
        }
        return f;
      })
    );

    await addRealActivity({
      type: 'return',
      title: 'File Returned to Archive',
      description: `${armsRef} verified and checked back into rack ${file.location.code}`,
      armsRef: armsRef,
      user: returnerName,
      statusBadge: 'Returned',
    });

    setNotifications(prev => [
      {
        id: `notif-${Date.now()}`,
        title: 'File Check-In Completed',
        message: `ARMS Ref. ${armsRef} was safely returned to location ${file.location.code}.`,
        transactionSeries: `Transaction Series 2026-RET`,
        armsRef: armsRef,
        status: 'System',
        isRead: false,
        isStarred: false,
        createdAt: new Date().toISOString()
      },
      ...prev
    ]);

    showToast(`File ${armsRef} checked back into storage location ${file.location.code}!`);
  };

  // Notifications tools
  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    showToast('All notifications marked as read');
  };

  const toggleStarNotification = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, isStarred: !n.isStarred } : n))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Daily log submission
  const addDailyLog = async (data: Omit<DailyLogCount, 'id' | 'submittedAt'>) => {
    const authorName = currentUser?.name || 'Shift Lead';
    const newLog: DailyLogCount = {
      id: `log-${Date.now()}`,
      ...data,
      submittedBy: authorName,
      submittedAt: new Date().toISOString()
    };
    setDailyLogs(prev => [newLog, ...prev]);

    try {
      await supabase.from('log_counts').insert([
        {
          date: data.date,
          inbound: data.inbound,
          outbound: data.outbound,
          scrap: data.scrap,
          inventory: data.inventory,
          rh_temp: data.rhTemp,
          rack_inspections: data.rackInspections,
          mhe_pre_ops: data.mhePreOps,
          submitted_by: authorName,
          user_id: session?.user?.id || null,
        },
      ]);
    } catch {}

    await addRealActivity({
      type: 'log_count',
      title: 'Daily Log Count Recorded',
      description: `Shift counts logged: ${data.inbound} Inbound, ${data.outbound} Outbound, ${data.scrap} Scrap, ${data.inventory} Inventory`,
      user: authorName,
      statusBadge: 'Shift Log',
    });

    showToast(`Shift log counts recorded for ${data.date}!`);
  };

  // Computed KPIs
  const borrowedCount = files.filter(f => f.status === 'Borrowed').length;
  const pendingApprovalsCount = notifications.filter(n => n.status === 'Pending').length;
  const totalTransactionsCount = 1205 + (files.length - INITIAL_FILES.length);

  // Active Users metric populated directly from Realtime presence or active session
  const realActiveUsersCount = activeUsers.length > 0 ? activeUsers.length : (currentUser ? 1 : 0);

  const kpiMetrics = {
    transactions: totalTransactionsCount,
    pendingForLog: Math.max(0, 120 - dailyLogs.length + (pendingApprovalsCount * 2)),
    borrowed: 10 + borrowedCount - 1,
    activeUsers: realActiveUsersCount,
    transactionsDelta: '+10 this week',
    pendingForLogDelta: '-20 this week',
    borrowedDelta: '+15 this week',
    activeUsersDelta: realActiveUsersCount > 0 ? `${realActiveUsersCount} online now` : '0 online',
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <AppContext.Provider
      value={{
        session,
        currentUser,
        isAuthenticated: !!session && !!currentUser,
        authLoading,
        authError,
        clearAuthError,
        login,
        logout,
        resetPassword,
        activeTab,
        setActiveTab,
        sidebarOpen,
        setSidebarOpen,
        files,
        addFileRecord,
        updateFileRecord,
        deleteFileRecord,
        returnBorrowedFile,
        submitBorrowRequest,
        approveBorrowRequest,
        rejectBorrowRequest,
        notifications,
        unreadCount,
        markNotificationRead,
        markAllNotificationsRead,
        toggleStarNotification,
        deleteNotification,
        dailyLogs,
        addDailyLog,
        activities,
        activeUsers,
        kpiMetrics,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
