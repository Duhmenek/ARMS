import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileText,
  Clock,
  FolderMinus,
  Users,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  CornerDownRight,
  ShieldCheck,
  Calendar,
  LogIn,
  LogOut,
  Radio
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { kpiMetrics, activities, activeUsers, files, borrowRequests, setActiveTab, currentUser } = useApp();
  const categoryColors = ['#0A5C1D', '#1B8A2F', '#2FA848', '#A8E0A8', '#222222'];
  const categoryCounts = new Map<string, number>();
  files.forEach(file => categoryCounts.set(file.transactionType, (categoryCounts.get(file.transactionType) || 0) + 1));
  const categoryBreakdown = Array.from(categoryCounts, ([name, count], index) => ({
    name, count, percentage: files.length ? Math.round(count / files.length * 100) : 0, color: categoryColors[index % categoryColors.length]
  }));
  const transactionCounts = new Map<string, number>();
  files.forEach(file => transactionCounts.set(file.transactionType, (transactionCounts.get(file.transactionType) || 0) + 1));
  const maxTransactionCount = Math.max(1, ...transactionCounts.values());
  const transactionMetrics = Array.from(transactionCounts, ([label, count]) => ({ label, count, percent: Math.round(count / maxTransactionCount * 100) }));
  const activityByDay: { day: string; uploads: number; borrows: number; label: string }[] = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(); date.setDate(date.getDate() - (6 - offset));
    const dateKey = date.toISOString().slice(0, 10);
    const uploads = files.filter(file => file.createdAt?.slice(0, 10) === dateKey).length;
    const borrows = borrowRequests.filter(request => {
      const parsedDate = new Date(request.requestDate);
      return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === dateKey;
    }).length;
    return { day: date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }), uploads, borrows, label: `${uploads} uploads · ${borrows} borrows` };
  });
  const [hoveredDay, setHoveredDay] = useState<(typeof activityByDay)[number] | null>(null);
  const [hoveredSlice, setHoveredSlice] = useState<(typeof categoryBreakdown)[number] | null>(null);

  // SVG dimensions for 7-day chart
  const chartHeight = 180;
  const chartWidth = 500;
  const maxVal = Math.max(1, ...activityByDay.map(day => day.uploads));

  // Compute SVG line points for borrows
  const points = activityByDay.map((d, i) => {
    const x = 35 + i * ((chartWidth - 70) / Math.max(1, activityByDay.length - 1));
    const y = chartHeight - 30 - (d.borrows / 15) * (chartHeight - 60);
    return `${x},${y}`;
  }).join(' ');

  // Compute Donut Slices
  let cumulativePercent = 0;
  const donutRadius = 60;
  const donutCircumference = 2 * Math.PI * donutRadius;

  return (
    <div className="space-y-6 pb-10">
      {/* 1. Top 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        {/* KPI 1: Transactions */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-heading text-xs font-bold uppercase tracking-wider text-slate-500">
                TRANSACTIONS
              </div>
              <div className="text-3xl font-heading font-black tracking-tight text-slate-900 mt-1">
                {kpiMetrics.transactions.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Active files in scope
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#0A5C1D]/10 text-[#0A5C1D] flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full font-semibold text-emerald-700 bg-emerald-50">
              <TrendingUp className="w-3.5 h-3.5 mr-1" />
              {kpiMetrics.transactionsDelta}
            </span>
            <span className="text-[11px] text-slate-400">vs last cycle</span>
          </div>
        </div>

        {/* KPI 2: Pending for Log */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-heading text-xs font-bold uppercase tracking-wider text-slate-500">
                PENDING FOR LOG
              </div>
              <div className="text-3xl font-heading font-black tracking-tight text-slate-900 mt-1">
                {kpiMetrics.pendingForLog}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Requires organization
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full font-semibold text-emerald-700 bg-emerald-50">
              <TrendingDown className="w-3.5 h-3.5 mr-1" />
              {kpiMetrics.pendingForLogDelta}
            </span>
            <span className="text-[11px] text-slate-400">organization speed</span>
          </div>
        </div>

        {/* KPI 3: Borrowed */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-heading text-xs font-bold uppercase tracking-wider text-slate-500">
                BORROWED
              </div>
              <div className="text-3xl font-heading font-black tracking-tight text-slate-900 mt-1">
                {kpiMetrics.borrowed}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Files requested for borrow
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center flex-shrink-0">
              <FolderMinus className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full font-semibold text-rose-700 bg-rose-50">
              <TrendingUp className="w-3.5 h-3.5 mr-1" />
              {kpiMetrics.borrowedDelta}
            </span>
            <span className="text-[11px] text-slate-400">audit requisitions</span>
          </div>
        </div>

        {/* KPI 4: Active Local Sessions */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-heading text-xs font-bold uppercase tracking-wider text-slate-500">
                ACTIVE USERS
              </div>
              <div className="text-3xl font-heading font-black tracking-tight text-slate-900 mt-1">
                {kpiMetrics.activeUsers}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Staff in live session
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#1B8A2F]/10 text-[#1B8A2F] flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full font-semibold text-emerald-800 bg-emerald-50">
              <Radio className="w-3 h-3 mr-1 text-emerald-600 animate-pulse" />
              {kpiMetrics.activeUsersDelta}
            </span>
            <span className="text-[11px] text-slate-400">Local sessions</span>
          </div>
        </div>
      </div>

      {/* 2. Middle Row Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: 7-Day Activity Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 pb-3 border-b border-slate-100 gap-2">
            <div>
              <h2 className="font-heading text-lg font-bold uppercase tracking-wider text-slate-900">
                ACTIVITY (7 DAYS)
              </h2>
              <p className="text-xs text-slate-500">
                Daily warehouse document uploads vs borrow pull-out requisitions
              </p>
            </div>

            {/* Chart Legend */}
            <div className="flex items-center space-x-4 text-xs">
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#0A5C1D] inline-block" />
                <span className="font-medium text-slate-600">Uploads (Bars)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-1 rounded-full bg-rose-500 inline-block" />
                <span className="font-medium text-slate-600">Borrows (Line)</span>
              </div>
            </div>
          </div>

          {/* Interactive SVG Chart */}
          <div className="relative w-full overflow-hidden">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-56 select-none"
            >
              {/* Background horizontal grid lines */}
              {[0, 20, 40, 60, 80].map((val, idx) => {
                const y = chartHeight - 30 - (val / maxVal) * (chartHeight - 60);
                return (
                  <g key={idx}>
                    <line
                      x1="30"
                      y1={y}
                      x2={chartWidth - 20}
                      y2={y}
                      stroke="#f1f5f9"
                      strokeDasharray="3 3"
                    />
                    <text
                      x="10"
                      y={y + 3}
                      fill="#94a3b8"
                      fontSize="9"
                      fontFamily="Inter"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Grouped Bars: Uploads */}
              {activityByDay.map((d, i) => {
                const barWidth = 24;
                const x = 35 + i * ((chartWidth - 70) / Math.max(1, activityByDay.length - 1)) - barWidth / 2;
                const barHeight = (d.uploads / maxVal) * (chartHeight - 60);
                const y = chartHeight - 30 - barHeight;
                const isHovered = hoveredDay?.day === d.day;

                return (
                  <g
                    key={i}
                    className="cursor-pointer transition-all"
                    onMouseEnter={() => setHoveredDay(d)}
                    onMouseLeave={() => setHoveredDay(null)}
                  >
                    {/* Hover column background highlight */}
                    {isHovered && (
                      <rect
                        x={x - 8}
                        y="10"
                        width={barWidth + 16}
                        height={chartHeight - 40}
                        fill="#0A5C1D"
                        opacity="0.05"
                        rx="4"
                      />
                    )}

                    {/* Bar */}
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      rx="3"
                      fill={isHovered ? '#147426' : '#0A5C1D'}
                      className="transition-all duration-150"
                    />

                    {/* X-axis day label */}
                    <text
                      x={x + barWidth / 2}
                      y={chartHeight - 12}
                      textAnchor="middle"
                      fill={isHovered ? '#0A5C1D' : '#64748b'}
                      fontSize="10"
                      fontWeight={isHovered ? 'bold' : 'normal'}
                      fontFamily="Inter"
                    >
                      {d.day}
                    </text>
                  </g>
                );
              })}

              {/* Line & Dots: Borrows */}
              <polyline
                fill="none"
                stroke="#e11d48"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
              />

              {activityByDay.map((d, i) => {
                const x = 35 + i * ((chartWidth - 70) / Math.max(1, activityByDay.length - 1));
                const y = chartHeight - 30 - (d.borrows / 15) * (chartHeight - 60);
                const isHovered = hoveredDay?.day === d.day;

                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r={isHovered ? 5.5 : 4}
                    fill="#ffffff"
                    stroke="#e11d48"
                    strokeWidth={isHovered ? 3 : 2}
                    className="transition-all"
                  />
                );
              })}
            </svg>

            {/* Interactive Tooltip Callout */}
            <div className="h-8 flex items-center justify-between text-xs mt-1 bg-slate-50 px-3 rounded-lg border border-slate-100">
              <div className="text-slate-500">
                {hoveredDay ? (
                  <span className="font-semibold text-slate-800">
                    {hoveredDay.day}: <span className="text-[#0A5C1D]">{hoveredDay.label}</span>
                  </span>
                ) : (
                  <span>Hover over any day column for detailed breakdown</span>
                )}
              </div>
              <div className="font-semibold text-[#0A5C1D]">
                {activityByDay.some(day => day.uploads || day.borrows) ? `Peak: ${activityByDay.reduce((peak, day) => day.uploads > peak.uploads ? day : peak).day}` : 'No activity data'}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Documents by Category (Donut Chart) */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <h2 className="font-heading text-lg font-bold uppercase tracking-wider text-slate-900 mb-1">
              DOCUMENTS BY CATEGORY
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Breakdown across archive record types
            </p>

            {/* SVG Donut */}
            <div className="relative flex items-center justify-center my-2">
              <svg viewBox="0 0 160 160" className="w-40 h-40 transform -rotate-90">
                {categoryBreakdown.map((cat, i) => {
                  const strokeDasharray = `${(cat.percentage / 100) * donutCircumference} ${donutCircumference}`;
                  const strokeDashoffset = -((cumulativePercent / 100) * donutCircumference);
                  cumulativePercent += cat.percentage;
                  const isHovered = hoveredSlice?.name === cat.name;

                  return (
                    <circle
                      key={i}
                      cx="80"
                      cy="80"
                      r={donutRadius}
                      fill="transparent"
                      stroke={cat.color}
                      strokeWidth={isHovered ? 26 : 22}
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      className="cursor-pointer transition-all duration-200"
                      onMouseEnter={() => setHoveredSlice(cat)}
                      onMouseLeave={() => setHoveredSlice(null)}
                    />
                  );
                })}
              </svg>

              {/* Center Stat */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <div className="text-2xl font-heading font-black text-slate-900">
                  {hoveredSlice ? `${hoveredSlice.percentage}%` : files.length.toLocaleString()}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {hoveredSlice ? hoveredSlice.name : 'TOTAL FILES'}
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown Legend */}
          <div className="mt-4 space-y-1.5 pt-3 border-t border-slate-100">
            {categoryBreakdown.map((item, idx) => (
              <div
                key={idx}
                onMouseEnter={() => setHoveredSlice(item)}
                onMouseLeave={() => setHoveredSlice(null)}
                className={`flex items-center justify-between text-xs p-1 rounded-md cursor-pointer transition-colors ${
                  hoveredSlice?.name === item.name ? 'bg-slate-50 font-bold' : 'text-slate-600'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span>{item.name}</span>
                </div>
                <div className="font-semibold text-slate-800">
                  {item.percentage}%{' '}
                  <span className="text-[11px] text-slate-400 font-normal">
                    ({item.count})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Bottom Row Widgets: Documents By Transaction, Recent Activity, Active Users */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Documents by Transaction (Horizontal Progress Bars) */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div>
              <h2 className="font-heading text-lg font-bold uppercase tracking-wider text-slate-900">
                DOCUMENTS BY TRANSACTION
              </h2>
              <p className="text-xs text-slate-500">
                Volume metrics per operational flow
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {transactionMetrics.map((item, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-slate-700 truncate pr-2">
                    {item.label}
                  </span>
                  <span className="font-bold text-slate-900 flex-shrink-0">
                    {item.count}{' '}
                    <span className="text-[10px] text-slate-400 font-normal">
                      ({item.percent}%)
                    </span>
                  </span>
                </div>
                {/* Green accent progress bar (`#A8E0A8` to `#0A5C1D`) */}
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${item.percent}%`,
                      background: 'linear-gradient(90deg, #A8E0A8 0%, #1B8A2F 60%, #0A5C1D 100%)'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center: Recent Activity Feed (Populated ONLY from real authenticated user actions) */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div>
              <h2 className="font-heading text-lg font-bold uppercase tracking-wider text-slate-900">
                RECENT ACTIVITY
              </h2>
              <p className="text-xs text-slate-500">
                Real-time user actions & system events
              </p>
            </div>
            {activities.length > 0 && (
              <button
                onClick={() => setActiveTab('notifications')}
                className="text-xs font-semibold text-[#0A5C1D] hover:underline"
              >
                View All
              </button>
            )}
          </div>

          {activities.length > 0 ? (
            <div className="space-y-3.5">
              {activities.slice(0, 5).map(act => (
                <div
                  key={act.id}
                  className="flex items-start space-x-3 text-xs pb-3 border-b border-slate-50 last:border-0 last:pb-0"
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      act.type === 'upload'
                        ? 'bg-emerald-100 text-emerald-800'
                        : act.type === 'borrow'
                        ? 'bg-amber-100 text-amber-800'
                        : act.type === 'approval'
                        ? 'bg-[#0A5C1D]/15 text-[#0A5C1D]'
                        : act.type === 'login'
                        ? 'bg-emerald-100 text-[#0A5C1D]'
                        : act.type === 'logout'
                        ? 'bg-slate-100 text-slate-500'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {act.type === 'upload' && <FileSpreadsheet className="w-3.5 h-3.5" />}
                    {act.type === 'borrow' && <FolderMinus className="w-3.5 h-3.5" />}
                    {act.type === 'approval' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {act.type === 'return' && <ShieldCheck className="w-3.5 h-3.5" />}
                    {act.type === 'log_count' && <Calendar className="w-3.5 h-3.5" />}
                    {act.type === 'login' && <LogIn className="w-3.5 h-3.5" />}
                    {act.type === 'logout' && <LogOut className="w-3.5 h-3.5" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 truncate">
                        {act.title}
                      </span>
                      <span className="text-[10px] text-slate-400 flex-shrink-0">
                        {act.timestamp}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-0.5 leading-snug line-clamp-2">
                      {act.description}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-[10px] text-slate-500 font-medium">
                        By {act.user}
                      </span>
                      {act.statusBadge && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                          {act.statusBadge}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#0A5C1D]" />
              <p className="text-xs font-semibold text-slate-600">No activity logs recorded yet</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Recent actions are saved locally and refresh automatically.
              </p>
            </div>
          )}
        </div>

        {/* Right: Active Users Widget (Populated ONLY from real authenticated user logins & presence) */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div>
              <h2 className="font-heading text-lg font-bold uppercase tracking-wider text-slate-900">
                ACTIVE USERS
              </h2>
              <p className="text-xs text-slate-500">
                Staff in active session
              </p>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#A8E0A8] text-[#0A5C1D] flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0A5C1D] inline-block animate-ping mr-1" />
              <span>{activeUsers.length > 0 ? `${activeUsers.length} Online` : (currentUser ? '1 Online' : '0 Online')}</span>
            </span>
          </div>

          {activeUsers.length > 0 ? (
            <div className="space-y-3">
              {activeUsers.map(usr => (
                <div
                  key={usr.userId}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-[#0A5C1D] text-white text-xs font-bold flex items-center justify-center uppercase">
                        {usr.name.slice(0, 2)}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white bg-emerald-500" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 leading-tight">
                        {usr.name}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {usr.role}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] font-semibold text-emerald-700">
                      Online
                    </div>
                    <div className="text-[9px] text-slate-400">
                      Active now
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : currentUser ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/40 border border-emerald-100">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-[#0A5C1D] text-white text-xs font-bold flex items-center justify-center uppercase">
                      {currentUser.name.slice(0, 2)}
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white bg-emerald-500" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 leading-tight">
                      {currentUser.name}
                    </div>
                    <div className="text-[10px] text-[#0A5C1D] font-medium">
                      {currentUser.roleTitle}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-semibold text-emerald-700">
                    Online
                  </div>
                  <div className="text-[9px] text-slate-400">
                    Active now
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
              <p className="text-xs font-semibold text-slate-600">No active users</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Authenticated users in other tabs or browsers will appear here live.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
