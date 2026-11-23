import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  BookOpen,
  Search,
  Bell,
  DownloadCloud,
  Layers,
  Database,
  Building2,
  Clock,
  ShieldCheck,
  X
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    unreadCount,
    currentUser,
    sidebarOpen,
    setSidebarOpen,
    files
  } = useApp();

  const navItems = [
    {
      id: 'dashboard',
      label: 'DASHBOARD',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'logbook',
      label: 'LOG BOOK',
      icon: BookOpen,
      badge: null
    },
    {
      id: 'findfile',
      label: 'FIND FILE',
      icon: Search,
      badge: `${files.length}`
    },
    {
      id: 'notifications',
      label: 'NOTIFICATIONS',
      icon: Bell,
      badge: unreadCount > 0 ? `${unreadCount}` : null,
      badgeColor: 'bg-[#A8E0A8] text-[#0A5C1D]'
    },
    {
      id: 'reports',
      label: 'DOWNLOAD / REPORTS',
      icon: DownloadCloud,
      badge: null
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-[#0A5C1D] text-white flex flex-col justify-between shadow-xl transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Company Title & Close on Mobile */}
        <div>
          <div className="h-16 px-5 flex items-center justify-between border-b border-emerald-900/60 bg-[#084917]">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#A8E0A8] text-[#0A5C1D] font-black text-sm flex items-center justify-center tracking-tighter shadow-sm">
                AL
              </div>
              <div className="leading-tight">
                <div className="font-heading font-bold text-sm tracking-wider uppercase text-white">
                  ADSIA LOGISTICS, INC.
                </div>
                <div className="text-[10px] text-[#A8E0A8] tracking-widest uppercase font-semibold">
                  Warehouse Archive System
                </div>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-md hover:bg-white/10 text-white/80 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Quick Role Card in Sidebar */}
          <div className="mx-3 my-3 p-3 rounded-xl bg-black/25 border border-white/10 text-xs">
            <div className="flex items-center justify-between text-white/70 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider">Active Role</span>
              <span className="flex items-center text-[10px] text-[#A8E0A8] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#A8E0A8] inline-block mr-1 animate-pulse" />
                Live Sync
              </span>
            </div>
            <div className="font-bold text-white tracking-wide truncate">
              {currentUser?.name || 'Staff User'}
            </div>
            <div className="text-[11px] text-[#A8E0A8] font-medium truncate">
              {currentUser?.roleTitle || 'Archive Personnel'}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 py-2 space-y-1.5">
            <div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-[#A8E0A8]/80">
              Main Navigation
            </div>

            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (window.innerWidth < 1024) {
                      setSidebarOpen(false);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-full font-heading font-bold text-sm tracking-wide transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-[#0A5C1D] shadow-md translate-x-1'
                      : 'text-white/90 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? 'text-[#0A5C1D]' : 'text-[#A8E0A8]'
                      }`}
                    />
                    <span className="uppercase">{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight ${
                        isActive
                          ? 'bg-[#0A5C1D] text-white'
                          : item.badgeColor || 'bg-black/30 text-[#A8E0A8]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Retention & Compliance Quick Summary */}
          <div className="mx-3 mt-4 p-3 rounded-xl bg-white/5 border border-white/10 text-xs hidden sm:block">
            <div className="flex items-center space-x-2 text-[#A8E0A8] font-bold text-[11px] uppercase tracking-wider mb-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Retention Compliance</span>
            </div>
            <div className="flex justify-between items-center text-white/80 py-0.5">
              <span>Active Retention:</span>
              <span className="font-bold text-white">
                {files.filter(f => f.retentionStatus === 'Active').length} files
              </span>
            </div>
            <div className="flex justify-between items-center text-white/80 py-0.5">
              <span>Near Expiry/Audit:</span>
              <span className="font-bold text-amber-300">
                {files.filter(f => f.retentionStatus === 'Near Expiry' || f.retentionStatus === 'Disposal Due').length} files
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Section: Brand Mark `arms.` */}
        <div className="p-4 border-t border-emerald-900/60 bg-[#084917]/70">
          <div className="flex items-end justify-between">
            <div>
              {/* Brand mark: lowercase bold `arms.` */}
              <div className="font-sans font-black text-3xl tracking-tight text-white leading-none">
                arms<span className="text-[#A8E0A8]">.</span>
              </div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-[#A8E0A8] mt-1">
                Archive Room Management System
              </div>
            </div>

            <div className="text-right text-[10px] text-white/50 leading-tight">
              <div>V 2.6.4</div>
              <div className="text-emerald-400 font-semibold">ADSIA · 2026</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
