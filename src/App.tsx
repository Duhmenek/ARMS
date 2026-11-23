import React from 'react';
import { useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { Toast } from './components/common/Toast';
import { LoginView } from './components/auth/LoginView';
import { DashboardView } from './components/dashboard/DashboardView';
import { LogBookView } from './components/logbook/LogBookView';
import { FindFileView } from './components/findfile/FindFileView';
import { NotificationsView } from './components/notifications/NotificationsView';
import { ReportsView } from './components/reports/ReportsView';

export const AppContent: React.FC = () => {
  const { isAuthenticated, authLoading, activeTab, sidebarOpen } = useApp();

  if (authLoading) {
    return (
      <div className="min-h-screen w-full bg-[#F8F9FA] flex flex-col items-center justify-center select-none">
        <div className="font-sans font-black text-4xl text-[#0A5C1D] mb-4">
          arms<span className="text-[#1B8A2F]">.</span>
        </div>
        <div className="w-8 h-8 border-2 border-[#0A5C1D]/20 border-t-[#0A5C1D] rounded-full animate-spin" />
      </div>
    );
  }

  // App starts strictly logged out on Login page (session === null)
  if (!isAuthenticated) {
    return <LoginView />;
  }

  // Determine uppercase page title for header
  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'DASHBOARD';
      case 'logbook':
        return 'LOG BOOK';
      case 'findfile':
        return 'FIND FILE';
      case 'notifications':
        return 'NOTIFICATIONS';
      case 'reports':
        return 'DOWNLOAD / REPORTS';
      default:
        return 'DASHBOARD';
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F5] flex">
      {/* Fixed Vertical Sidebar */}
      <Sidebar />

      {/* Main App Container */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
          sidebarOpen ? 'lg:pl-64' : 'lg:pl-0'
        }`}
      >
        {/* Top Header Banner */}
        <Header pageTitle={getPageTitle()} />

        {/* Dynamic Page Views */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'logbook' && <LogBookView />}
          {activeTab === 'findfile' && <FindFileView />}
          {activeTab === 'notifications' && <NotificationsView />}
          {activeTab === 'reports' && <ReportsView />}
        </main>
      </div>

      {/* Toast Feedback */}
      <Toast />
    </div>
  );
};

export default function App() {
  return <AppContent />;
}
