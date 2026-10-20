/**
 * SI-JAGA — StatusBadge.tsx
 * Badge status perangkat di header panel kontrol (nama + ikon Wi-Fi).
 * Dipakai bersama oleh panel sensor PIR dan panel kotak kunci supaya
 * tampilannya selalu sama.
 */

import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';

interface StatusBadgeProps {
  label: string;
  icon: React.ElementType;
  isOnline: boolean;
  isDark: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ label, icon: Icon, isOnline, isDark }) => (
  <div
    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono ${
      isOnline
        ? isDark
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          : 'bg-emerald-50 border-emerald-300 text-emerald-700'
        : isDark
        ? 'bg-red-500/10 border-red-500/30 text-red-400'
        : 'bg-red-50 border-red-300 text-red-700'
    }`}
  >
    <Icon className="w-3 h-3" />
    <span className="font-semibold">{label}</span>
    <span className={isDark ? 'text-slate-500' : 'text-slate-500'}>•</span>
    {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
  </div>
);
