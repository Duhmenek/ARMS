import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, json } from '../services/api';
import { FileRecord, NotificationItem, DailyLogCount, LogEntry, ActivityItem, ActiveUserPresence, User, BorrowRequest } from '../types';

interface AppContextType {
  currentUser: User | null; isAuthenticated: boolean; authLoading: boolean; authError: string | null;
  clearAuthError: () => void; login: (username: string, password?: string) => Promise<void>;
  logout: () => Promise<void>; resetPassword: (email: string) => Promise<void>;
  activeTab: string; setActiveTab: (tab: string) => void; sidebarOpen: boolean;
  setSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  files: FileRecord[]; borrowRequests: BorrowRequest[];
  addFileRecord: (data: any) => Promise<FileRecord>; updateFileRecord: (id: string, updates: Partial<FileRecord>) => Promise<void>;
  deleteFileRecord: (id: string) => Promise<void>; returnBorrowedFile: (armsRef: string) => Promise<void>;
  submitBorrowRequest: (params: {armsRef:string;familyName:string;givenName:string;designation:string;purpose:string;date:string}) => Promise<{transactionSeries:string;armsRef:string}>;
  logEntries: LogEntry[]; createLogEntry: (entry: Omit<LogEntry,'id'|'uniqueCode'|'createdBy'|'createdAt'|'dwellMinutes'>) => Promise<LogEntry>;
  approveBorrowRequest: (notificationId: string) => Promise<void>; rejectBorrowRequest: (notificationId: string) => Promise<void>;
  notifications: NotificationItem[]; unreadCount: number; markNotificationRead: (id:string)=>Promise<void>;
  markAllNotificationsRead: ()=>Promise<void>; toggleStarNotification: (id:string)=>Promise<void>; deleteNotification: (id:string)=>Promise<void>;
  dailyLogs: DailyLogCount[]; addDailyLog: (data: Omit<DailyLogCount,'id'|'submittedAt'>)=>Promise<void>;
  activities: ActivityItem[]; activeUsers: ActiveUserPresence[];
  kpiMetrics: {transactions:number;pendingForLog:number;borrowed:number;activeUsers:number;transactionsDelta:string;pendingForLogDelta:string;borrowedDelta:string;activeUsersDelta:string};
  toastMessage: string | null; showToast: (msg:string)=>void;
}
interface LocalData { user:User; records:FileRecord[]; requests:BorrowRequest[]; notifications:NotificationItem[]; dailyLogs:DailyLogCount[]; logEntries:LogEntry[]; activities:ActivityItem[]; activeUsers:ActiveUserPresence[] }
const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{children:React.ReactNode}> = ({children}) => {
  const [currentUser,setCurrentUser]=useState<User|null>(null);
  const [authLoading,setAuthLoading]=useState(true);
  const [authError,setAuthError]=useState<string|null>(null);
  const [activeTab,setActiveTab]=useState('dashboard');
  const [sidebarOpen,setSidebarOpen]=useState(true);
  const [toastMessage,setToastMessage]=useState<string|null>(null);
  const [files,setFiles]=useState<FileRecord[]>([]);
  const [borrowRequests,setBorrowRequests]=useState<BorrowRequest[]>([]);
  const [notifications,setNotifications]=useState<NotificationItem[]>([]);
  const [dailyLogs,setDailyLogs]=useState<DailyLogCount[]>([]);
  const [logEntries,setLogEntries]=useState<LogEntry[]>([]);
  const [activities,setActivities]=useState<ActivityItem[]>([]);
  const [activeUsers,setActiveUsers]=useState<ActiveUserPresence[]>([]);
  const clearAuthError=()=>setAuthError(null);
  const showToast=(message:string)=>{setToastMessage(message);window.setTimeout(()=>setToastMessage(null),4000);};

  const applyData=(data:LocalData)=>{
    setCurrentUser(data.user);setFiles(data.records||[]);setBorrowRequests(data.requests||[]);
    setNotifications(data.notifications||[]);setDailyLogs(data.dailyLogs||[]);setLogEntries(data.logEntries||[]);setActivities(data.activities||[]);setActiveUsers(data.activeUsers||[]);
  };
  const refreshData=useCallback(async()=>{
    const data=await api<LocalData>('/private/data'); applyData(data);
  },[]);

  useEffect(()=>{
    let mounted=true;
    api<{user:User}>('/session').then(data=>{if(mounted)setCurrentUser(data.user);}).catch(()=>{}).finally(()=>{if(mounted)setAuthLoading(false);});
    return ()=>{mounted=false;};
  },[]);
  useEffect(()=>{
    if(!currentUser)return;
    let active=true;
    const refresh=()=>refreshData().catch(error=>{if(active)console.error('Local ARMS refresh failed:',error);});
    refresh();
    const poll=window.setInterval(refresh,15000);
    const heartbeat=window.setInterval(()=>api('/private/heartbeat',json('POST')).catch(()=>{}),30000);
    return ()=>{active=false;window.clearInterval(poll);window.clearInterval(heartbeat);};
  },[currentUser?.id,refreshData]);

  const login=async(username:string,password='')=>{
    try{const data=await api<{user:User}>('/login',json('POST',{username,password}));setCurrentUser(data.user);setAuthError(null);await refreshData();}
    catch(error){const message=error instanceof Error?error.message:'Local sign in failed';setAuthError(message);throw error;}
  };
  const logout=async()=>{try{await api('/logout',json('POST'));}finally{setCurrentUser(null);setFiles([]);setBorrowRequests([]);setNotifications([]);setDailyLogs([]);setLogEntries([]);setActivities([]);setActiveUsers([]);}};
  const resetPassword=async(_email:string)=>{throw new Error('Password resets are managed locally by your ARMS administrator.');};
  const addFileRecord=async(data:any):Promise<FileRecord>=>{const record=await api<FileRecord>('/private/records',json('POST',data));await refreshData();showToast(`Record ${record.armsRef} published successfully`);return record;};
  const updateFileRecord=async(id:string,updates:Partial<FileRecord>)=>{const existing=files.find(file=>file.id===id);if(!existing)throw new Error('Record not found');await api(`/private/records/${encodeURIComponent(id)}`,json('PUT',{...existing,...updates}));await refreshData();};
  const deleteFileRecord=async(id:string)=>{await api(`/private/records/${encodeURIComponent(id)}`,json('DELETE'));await refreshData();};
  const submitBorrowRequest=async(params:{armsRef:string;familyName:string;givenName:string;designation:string;purpose:string;date:string})=>{const result=await api<{transactionSeries:string;armsRef:string}>('/private/borrow-requests',json('POST',params));await refreshData();return result;};
  const decision=async(notificationId:string,value:'approve'|'reject')=>{await api(`/private/notifications/${encodeURIComponent(notificationId)}/decision`,json('POST',{decision:value}));await refreshData();showToast(value==='approve'?'Borrow request approved':'Borrow request rejected');};
  const approveBorrowRequest=(id:string)=>decision(id,'approve');
  const rejectBorrowRequest=(id:string)=>decision(id,'reject');
  const returnBorrowedFile=async(armsRef:string)=>{await api(`/private/records/${encodeURIComponent(armsRef)}/return`,json('POST'));await refreshData();showToast(`File ${armsRef} checked in`);};
  const markNotificationRead=async(id:string)=>{await api(`/private/notifications/${encodeURIComponent(id)}`,json('PATCH',{isRead:true}));await refreshData();};
  const markAllNotificationsRead=async()=>{await Promise.all(notifications.filter(n=>!n.isRead).map(n=>api(`/private/notifications/${encodeURIComponent(n.id)}`,json('PATCH',{isRead:true}))));await refreshData();};
  const toggleStarNotification=async(id:string)=>{const item=notifications.find(n=>n.id===id);if(!item)return;await api(`/private/notifications/${encodeURIComponent(id)}`,json('PATCH',{isStarred:!item.isStarred}));await refreshData();};
  const deleteNotification=async(id:string)=>{await api(`/private/notifications/${encodeURIComponent(id)}`,json('DELETE'));await refreshData();};
  const addDailyLog=async(data:Omit<DailyLogCount,'id'|'submittedAt'>)=>{await api('/private/log-counts',json('POST',data));await refreshData();showToast(`Shift log counts recorded for ${data.date}`);};
  const createLogEntry=async(entry:Omit<LogEntry,'id'|'uniqueCode'|'createdBy'|'createdAt'|'dwellMinutes'>):Promise<LogEntry>=>{const saved=await api<LogEntry>('/private/log-entries',json('POST',entry));await refreshData();showToast(`Pre-Print Form ${saved.uniqueCode} saved`);return saved;};

  const borrowed=files.filter(file=>file.status==='Borrowed').length;
  const pendingForLog=dailyLogs[0]?dailyLogs[0].inbound+dailyLogs[0].outbound+dailyLogs[0].scrap+dailyLogs[0].inventory:0;
  const kpiMetrics={transactions:files.length,pendingForLog,borrowed,activeUsers:activeUsers.length,transactionsDelta:'Live local data',pendingForLogDelta:'Live local data',borrowedDelta:'Live local data',activeUsersDelta:`${activeUsers.length} online`};
  const value:AppContextType={currentUser,isAuthenticated:!!currentUser,authLoading,authError,clearAuthError,login,logout,resetPassword,activeTab,setActiveTab,sidebarOpen,setSidebarOpen,files,borrowRequests,addFileRecord,updateFileRecord,deleteFileRecord,returnBorrowedFile,submitBorrowRequest,approveBorrowRequest,rejectBorrowRequest,notifications,unreadCount:notifications.filter(n=>!n.isRead).length,markNotificationRead,markAllNotificationsRead,toggleStarNotification,logEntries,createLogEntry,deleteNotification,dailyLogs,addDailyLog,activities,activeUsers,kpiMetrics,toastMessage,showToast};
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
export const useApp=()=>{const context=useContext(AppContext);if(!context)throw new Error('useApp must be used within an AppProvider');return context;};
