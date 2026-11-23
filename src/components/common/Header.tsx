import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Menu, Bell, LogOut, ChevronDown, User as UserIcon } from 'lucide-react';

interface HeaderProps {
  pageTitle: string;
}

export const Header: React.FC<HeaderProps> = ({ pageTitle }) => {
  const {
    currentUser,
    logout,
    unreadCount,
    setActiveTab,
    setSidebarOpen
  } = useApp();

  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 h-16 bg-gradient-to-r from-[#0A5C1D] via-[#116823] to-[#1B8A2F] text-white shadow-md px-4 sm:px-6 flex items-center justify-between transition-all select-none">
      {/* Left: Mobile hamburger & Uppercase Page Title */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        <button
          onClick={() => setSidebarOpen(prev => !prev)}
          className="p-2 rounded-lg hover:bg-white/10 active:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-[#A8E0A8]"
          title="Toggle Navigation Sidebar"
          aria-label="Toggle Navigation Sidebar"
        >
          <Menu className="w-5 h-5 text-white" />
        </button>

        <div className="flex items-baseline space-x-2">
          <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-wider uppercase drop-shadow-sm">
            {pageTitle}
          </h1>
          <span className="hidden md:inline-block text-xs uppercase tracking-widest text-[#A8E0A8] font-semibold opacity-90">
            ARMS · Adsia Logistics
          </span>
        </div>
      </div>

      {/* Right: Notification bell, authenticated user identity & logout */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Notification Bell */}
        <button
          onClick={() => setActiveTab('notifications')}
          className="relative p-2 rounded-lg hover:bg-white/10 active:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-[#A8E0A8]"
          title="View Notifications"
        >
          <Bell className="w-5 h-5 text-white" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 text-[11px] font-bold bg-[#A8E0A8] text-[#0A5C1D] rounded-full flex items-center justify-center animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Real Authenticated User Identity */}
        {currentUser && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen(prev => !prev)}
              className="flex items-center space-x-2 sm:space-x-3 bg-black/20 hover:bg-black/30 border border-white/15 rounded-lg px-2.5 py-1.5 text-left transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden bg-white/20 ring-2 ring-[#A8E0A8] flex items-center justify-center flex-shrink-0 text-white font-bold text-xs uppercase">
                {currentUser.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{currentUser.name.slice(0, 2)}</span>
                )}
              </div>

              <div className="hidden sm:block text-left">
                <div className="text-xs text-white/80 leading-none">Signed In:</div>
                <div className="text-sm font-semibold text-white leading-tight truncate max-w-[140px]">
                  {currentUser.name}
                </div>
              </div>

              <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-[#A8E0A8] text-[#0A5C1D]">
                {currentUser.role === 'admin' ? 'MANAGEMENT ADMIN' : currentUser.role.toUpperCase()}
              </span>

              <ChevronDown className="w-4 h-4 text-white/70" />
            </button>

            {/* User Dropdown with Logout */}
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 text-slate-800 py-2 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <div className="font-bold text-xs text-slate-900 leading-tight">
                      {currentUser.name}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      {currentUser.email}
                    </div>
                    <div className="text-[10px] font-semibold text-[#0A5C1D] uppercase tracking-wider mt-1">
                      {currentUser.roleTitle}
                    </div>
                  </div>

                  <div className="p-1">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
