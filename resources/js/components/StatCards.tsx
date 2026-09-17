/**
 * SI-JAGA — StatCards.tsx
 * Tiga kartu statistik: Akses Berhasil, Akses Gagal, Motion Event (24 jam).
 */

import React from 'react';
import { KeyRound, ShieldAlert, Radio } from 'lucide-react';
import { DashboardStats } from '../types';
import { useTheme } from '../context/ThemeContext';

interface StatCardsProps {
  stats: DashboardStats;
}

export const StatCards: React.FC<StatCardsProps> = ({ stats }) => {
  const { isDark } = useTheme();

  const cards = [
    {
      id: 'stat-access-success',
      label: 'Akses Berhasil',
      sublabel: '24 jam terakhir',
      value: stats.accessSuccess24h,
      icon: KeyRound,
      colorClass: isDark
        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
        : 'text-emerald-700 bg-emerald-50 border-emerald-200',
      valueClass: isDark ? 'text-emerald-400' : 'text-emerald-700',
    },
    {
      id: 'stat-access-failed',
      label: 'Akses Gagal',
      sublabel: '24 jam terakhir',
      value: stats.accessFailed24h,
      icon: ShieldAlert,
      colorClass:
        stats.accessFailed24h > 0
          ? isDark
            ? 'text-red-400 bg-red-500/10 border-red-500/20'
            : 'text-red-700 bg-red-50 border-red-200'
          : isDark
            ? 'text-slate-400 bg-slate-800 border-slate-700'
            : 'text-slate-600 bg-slate-100 border-slate-200',
      valueClass:
        stats.accessFailed24h > 0
          ? isDark ? 'text-red-400' : 'text-red-600'
          : isDark ? 'text-slate-300' : 'text-slate-700',
    },
    {
      id: 'stat-motion-events',
      label: 'Motion Event',
      sublabel: '24 jam terakhir',
      value: stats.motionEvents24h,
      icon: Radio,
      colorClass: isDark
        ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
        : 'text-amber-700 bg-amber-50 border-amber-200',
      valueClass: isDark ? 'text-amber-400' : 'text-amber-700',
    },
  ];

  return (
    <div id="quick-statistics-cards" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map(({ id, label, sublabel, value, icon: Icon, colorClass, valueClass }) => (
        <div
          key={id}
          id={id}
          className={`rounded-lg p-5 border shadow-sm transition-all ${
            isDark
              ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {label}
            </span>
            <div className={`p-2 rounded-lg border ${colorClass}`}>
              <Icon className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-3xl font-bold font-mono mt-3 ${valueClass}`}>
            {value}
          </div>
          <div className={`text-[11px] font-mono mt-1 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
            {sublabel}
          </div>
        </div>
      ))}
    </div>
  );
};
