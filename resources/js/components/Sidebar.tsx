/**
 * SI-JAGA — Sidebar.tsx
 * Menu navigasi kiri. Brand: SI-JAGA.
 * Menu akan disesuaikan dengan role:
 * - piket: Dashboard, Access Log, Motion Log
 * - admin_pam: + Manajemen Akses, + Manajemen User
 */

import React from 'react';
import { Activity, KeyRound, Radio, Users, Shield, UserCog } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { NavTab } from '../App';
import { UserRole } from '../types';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  userRole: UserRole;
}

const allMenuItems: { id: NavTab; label: string; icon: React.ElementType; adminOnly: boolean }[] = [
  { id: 'dashboard',        label: 'Dashboard',        icon: Activity, adminOnly: false },
  { id: 'access-log',       label: 'Access Log',       icon: KeyRound, adminOnly: false },
  { id: 'motion-log',       label: 'Motion Log',       icon: Radio,    adminOnly: false },
  { id: 'manajemen-akses',  label: 'Manajemen Akses',  icon: Users,    adminOnly: true },
  { id: 'manajemen-user',   label: 'Manajemen User',   icon: UserCog,  adminOnly: true },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, userRole }) => {
  const { isDark } = useTheme();

  // Filter menu berdasarkan role
  const menuItems = allMenuItems.filter(item => {
    if (userRole === 'piket' && item.adminOnly) return false;
    return true;
  });

  return (
    <aside
      id="sidebar-navigation"
      className={`w-56 flex flex-col shrink-0 h-screen sticky top-0 z-30 select-none transition-colors duration-200 ${
        isDark
          ? 'bg-slate-900 border-r border-slate-800'
          : 'bg-white border-r border-slate-200 shadow-sm'
      }`}
    >
      {/* ── Brand ─────────────────────────────────── */}
      <div className={`p-5 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-emerald-600 flex items-center justify-center rounded-lg text-white shadow-sm">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h1 className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              SI-JAGA
            </h1>
            <p className={`text-[9px] font-mono uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              Sistem Info Jaga Gudang
            </p>
          </div>
        </div>
      </div>

      {/* ── Navigasi ──────────────────────────────── */}
      <nav className="flex-1 p-3 space-y-1">
        <p className={`text-[10px] font-mono uppercase tracking-widest px-2 py-2 font-semibold ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
          Menu
        </p>
        {menuItems.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              id={`menu-item-${id}`}
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer ${
                isActive
                  ? isDark
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : isDark
                    ? 'text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive
                    ? isDark ? 'text-emerald-400' : 'text-emerald-700'
                    : isDark ? 'text-slate-500' : 'text-slate-400'
                }`}
              />
              <span className="text-xs tracking-wide">{label}</span>
            </button>
          );
        })}
      </nav>

      {/* ── Footer ────────────────────────────────── */}
      <div className={`p-4 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className={`text-[10px] font-mono text-center ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
          v1.0.0 — OJT Build
        </div>
      </div>
    </aside>
  );
};
