/**
 * SI-JAGA — Topbar.tsx
 * Header: brand, live clock, status device, nama operator, role, logout, theme toggle.
 */

import React, { useState, useEffect } from 'react';
import { Clock, Sun, Moon, LogOut, Wifi, WifiOff, User } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { DeviceStatus, UserRole } from '../types';

interface TopbarProps {
  operatorName: string;
  operatorRole: UserRole;
  deviceStatus: DeviceStatus;
  onLogout: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  operatorName,
  operatorRole,
  deviceStatus,
  onLogout,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const timeStr = currentTime.toLocaleTimeString('id-ID', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const dateStr = currentTime.toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const isOnline = deviceStatus.status === 'online';

  const roleLabel = operatorRole === 'admin_pam' ? 'Admin PAM' : 'Piket Jaga';
  const roleColorClass = operatorRole === 'admin_pam'
    ? isDark ? 'text-amber-400' : 'text-amber-600'
    : isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <header
      id="topbar-header"
      className={`px-4 sm:px-6 py-3 flex items-center justify-between gap-4 sticky top-0 z-20 transition-colors duration-200 border-b ${
        isDark ? 'bg-white/5 backdrop-blur-xl border-white/10' : 'bg-white border-slate-200 shadow-sm'
      }`}
    >
      {/* Kiri: Brand + Clock */}
      <div className="flex items-center gap-4 min-w-0">

        {/* Live Clock */}
        <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-inner ${
          isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
        }`}>
          <Clock className={`w-3.5 h-3.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
          <span className={`font-mono text-sm font-bold tracking-wider ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
            {timeStr}
          </span>
          <span className={`hidden lg:inline text-[10px] font-mono border-l pl-2 ${
            isDark ? 'text-slate-400 border-slate-600' : 'text-slate-500 border-slate-300'
          }`}>
            WIB · {dateStr}
          </span>
        </div>
      </div>

      {/* Kanan: Status device + Operator + Actions */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">

        {/* Status ESP32 / PIR Device */}
        <div
          id="status-device-esp32"
          title={`Last seen: ${new Date(deviceStatus.last_seen).toLocaleTimeString('id-ID')}`}
          className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-mono font-semibold shadow-md ${
            isOnline
                ? isDark ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-emerald-100 border-emerald-300 text-emerald-700'
                : isDark ? 'bg-red-500/20 border-red-500/50 text-red-300' : 'bg-red-100 border-red-300 text-red-700'
          }`}
        >
          {isOnline
            ? <Wifi className="w-3.5 h-3.5" />
            : <WifiOff className="w-3.5 h-3.5" />
          }
          <span>Gudang: {isOnline ? 'Online' : 'Offline'}</span>
        </div>

        {/* Theme Toggle */}
        <button
          id="btn-toggle-theme"
          onClick={toggleTheme}
          title={isDark ? 'Mode Terang' : 'Mode Gelap'}
          className={`p-1.5 rounded-md border transition-all cursor-pointer ${
            isDark
              ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-amber-400'
              : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
          }`}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Operator info + Logout */}
        <div className={`flex items-center gap-3 pl-3 border-l ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
          <div className="hidden xl:flex flex-col text-right">
            <span className={`text-[11px] font-semibold leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {operatorName}
            </span>
            <span className={`text-[9px] font-mono ${roleColorClass}`}>
              {roleLabel}
            </span>
          </div>

          <div className={`w-8 h-8 rounded-full flex items-center justify-center border shadow-sm ${
            isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-slate-200 border-slate-300 text-slate-700'
          }`}>
            <User className="w-4 h-4" />
          </div>

          <button
            id="btn-logout"
            onClick={onLogout}
            title="Keluar"
            className={`p-2 rounded-full border transition-all cursor-pointer shadow-sm ${
              isDark
                ? 'bg-white/5 hover:bg-red-500/20 hover:border-red-500 border-white/10 text-slate-300 hover:text-red-400'
                : 'bg-white hover:bg-red-50 hover:border-red-500 border-slate-200 text-slate-600 hover:text-red-600'
            }`}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
