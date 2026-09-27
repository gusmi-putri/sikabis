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
import { NavTab } from '../Pages/Dashboard';
import { UserRole } from '../types';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  userRole: UserRole;
}

const allMenuItems: { id: NavTab; label: string; icon: React.ElementType; adminOnly: boolean; ringColor: string }[] = [
  { id: 'dashboard',        label: 'Dashboard',        icon: Activity, adminOnly: false, ringColor: 'border-blue-400/50 text-blue-400 bg-blue-500/10' },
  { id: 'access-log',       label: 'Access Log',       icon: KeyRound, adminOnly: false, ringColor: 'border-green-400/50 text-green-400 bg-green-500/10' },
  { id: 'motion-log',       label: 'Motion Log',       icon: Radio,    adminOnly: false, ringColor: 'border-purple-400/50 text-purple-400 bg-purple-500/10' },
  { id: 'manajemen-akses',  label: 'Manajemen Akses',  icon: Users,    adminOnly: true,  ringColor: 'border-yellow-400/50 text-yellow-400 bg-yellow-500/10' },
  { id: 'manajemen-user',   label: 'Manajemen User',   icon: UserCog,  adminOnly: true,  ringColor: 'border-red-400/50 text-red-400 bg-red-500/10' },
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
      className={`w-56 flex flex-col shrink-0 h-screen sticky top-0 z-30 select-none transition-colors duration-200 border-r ${
        isDark ? 'bg-white/5 backdrop-blur-xl border-white/10' : 'bg-white border-slate-200 shadow-sm'
      }`}
    >
      {/* ── Brand ─────────────────────────────────── */}
      <div className={`p-5 border-b ${isDark ? 'border-white/5' : 'border-slate-200'}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 flex items-center justify-center rounded text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h1 className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              SI-JAGA
            </h1>
            <p className={`text-[9px] font-mono uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Sistem Info Jaga
            </p>
          </div>
        </div>
      </div>

      {/* ── Navigasi ──────────────────────────────── */}
      <nav className="flex-1 p-3 space-y-2">
        <p className={`text-[10px] font-mono uppercase tracking-widest px-2 py-2 font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Menu
        </p>
        {menuItems.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              id={`menu-item-${id}`}
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 cursor-pointer border ${
                isActive
                  ? isDark 
                    ? 'bg-blue-500/10 border-blue-500/30 text-white shadow-[0_0_15px_rgba(59,130,246,0.15)]' 
                    : 'bg-blue-600 border-blue-600 text-white shadow-md'
                  : isDark
                    ? 'bg-transparent border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    : 'bg-transparent border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className={`flex items-center justify-center w-7 h-7 rounded ${
                isActive 
                  ? isDark ? 'bg-blue-500/20 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'bg-white/20 text-white'
                  : isDark ? 'text-slate-500' : 'text-slate-400'
              }`}>
                <Icon className="w-4 h-4 shrink-0" />
              </div>
              <span className="text-[13px] tracking-wide font-semibold">{label}</span>
            </button>
          );
        })}
      </nav>

      {/* ── Footer ────────────────────────────────── */}
      <div className={`p-4 border-t ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
        <div className={`text-[10px] font-mono text-center mb-1 uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          &copy; 2026 SI-JAGA
        </div>
        <div className={`text-[9px] font-mono text-center ${isDark ? 'text-slate-600' : 'text-slate-500'}`}>
          v2.0.0 — Glassmorphism Build
        </div>
      </div>
    </aside>
  );
};
