/**
 * SI-JAGA — AlertBanner.tsx
 * Slim notification bar yang muncul di atas dashboard saat ada
 * motion event baru (dalam 10 menit terakhir) saat mode ARMED.
 * Desain: satu baris, mencolok, tapi tidak memakan banyak ruang.
 */

import React from 'react';
import { AlertTriangle, X, ArrowRight, Fingerprint } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { MotionEvent, AccessLog } from '../types';

interface AlertBannerProps {
  isVisible: boolean;
  alertType: 'motion' | 'fingerprint' | null;
  latestEvent: MotionEvent | null;
  latestAccess: AccessLog | null;
  onDismiss: () => void;
  onViewLog: () => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  isVisible,
  alertType,
  latestEvent,
  latestAccess,
  onDismiss,
  onViewLog,
}) => {
  const { isDark } = useTheme();

  if (!isVisible || !alertType) return null;

  const targetDate = alertType === 'motion' 
    ? latestEvent?.created_at 
    : latestAccess?.created_at;

  if (!targetDate) return null;

  const timeStr = new Date(targetDate).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      id="banner-alert-motion"
      className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border text-xs font-mono ${
        isDark
          ? 'bg-red-950/50 border-red-500/60 text-red-200 shadow-[0_0_12px_rgba(239,68,68,0.15)]'
          : 'bg-red-50 border-red-400 text-red-800 shadow-sm'
      }`}
    >
      {/* Kiri: ikon + pesan */}
      <div className="flex items-center gap-2.5 min-w-0">
        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 animate-pulse" />
        <span className="font-bold text-red-500 shrink-0">PERINGATAN</span>
        <span className={`truncate ${isDark ? 'text-red-300' : 'text-red-700'}`}>
          {alertType === 'motion'
            ? `Gerakan terdeteksi saat sensor PIR nyala — ${timeStr} WIB`
            : `Sidik jari gagal beruntun (Alarm Kotak Kunci Menyala!) — ${timeStr} WIB`
          }
        </span>
      </div>

      {/* Kanan: aksi */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onViewLog}
          className={`flex items-center gap-1 px-2.5 py-1 rounded border text-[11px] font-semibold cursor-pointer transition-colors ${
            isDark
              ? 'bg-red-600 hover:bg-red-500 border-red-500 text-white'
              : 'bg-red-600 hover:bg-red-700 border-red-600 text-white'
          }`}
        >
          <span>Lihat Log</span>
          <ArrowRight className="w-3 h-3" />
        </button>
        <button
          onClick={onDismiss}
          className={`p-1 rounded cursor-pointer transition-colors ${
            isDark
              ? 'text-red-400 hover:text-red-200 hover:bg-red-900/40'
              : 'text-red-600 hover:text-red-900 hover:bg-red-100'
          }`}
          title="Tutup peringatan"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
