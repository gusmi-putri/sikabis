/**
 * SI-JAGA — PIRControlPanel.tsx
 * Panel kontrol mode PIR (ARMED / ACTIVITY) + status device ESP32.
 * ARMED    = Gerakan memicu foto + notifikasi Telegram.
 * ACTIVITY = PIR aktif secara fisik, tapi foto & notifikasi dimatikan
 *            (dipakai saat ada kegiatan resmi di gudang).
 */

import React from 'react';
import { Shield, ShieldOff, Wifi, WifiOff, Clock, Radio } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { DeviceStatus, PIRMode } from '../types';

interface PIRControlPanelProps {
  deviceStatus: DeviceStatus;
  onSetMode: (mode: PIRMode) => void;
}

export const PIRControlPanel: React.FC<PIRControlPanelProps> = ({
  deviceStatus,
  onSetMode,
}) => {
  const { isDark } = useTheme();
  const isOnline = deviceStatus.status === 'online';
  const isArmed = deviceStatus.pir_mode === 'ARMED';
  const hasPending = deviceStatus.pending_command !== 'NONE';

  const lastSeenStr = new Date(deviceStatus.last_seen).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div
      id="panel-kontrol-pir"
      className={`rounded-lg border p-5 shadow-sm transition-all ${isDark
          ? 'bg-slate-900 border-slate-800'
          : 'bg-white border-slate-200'
        }`}
    >
      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg border ${isArmed
              ? isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-amber-50 border-amber-300 text-amber-700'
              : isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-600'
            }`}>
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Kontrol Sensor PIR Gudang
            </h3>
            <p className={`text-[11px] font-mono mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              Ubah mode deteksi gerakan secara manual
            </p>
          </div>
        </div>

        {/* Status Device */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono ${isOnline
            ? isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-300 text-emerald-700'
            : isDark ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-red-50 border-red-300 text-red-700'
          }`}>
          {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          <span className="font-semibold">{deviceStatus.device_id}</span>
          <span className={isDark ? 'text-slate-500' : 'text-slate-500'}>•</span>
          <span>{isOnline ? 'Online' : 'Offline'}</span>
          {isOnline && (
            <>
              <span className={isDark ? 'text-slate-600' : 'text-slate-400'}>•</span>
              <Clock className="w-3 h-3" />
              <span className={isDark ? 'text-slate-500' : 'text-slate-500'}>{lastSeenStr}</span>
            </>
          )}
        </div>
      </div>

      {/* Status Saat Ini */}
      <div className={`my-4 flex items-center gap-3 p-3 rounded-lg border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
        <div className={`w-3 h-3 rounded-full shrink-0 ${isArmed ? 'bg-amber-400 animate-pulse' : 'bg-slate-400'}`} />
        <div>
          <span className={`text-[10px] font-mono uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
            Status Sensor PIR
          </span>
          <div className={`text-base font-bold font-mono tracking-wider mt-0.5 ${isArmed
              ? isDark ? 'text-amber-400' : 'text-amber-700'
              : isDark ? 'text-slate-300' : 'text-slate-700'
            }`}>
            {isArmed ? 'AKTIF' : 'MATI'}
          </div>
        </div>
      </div>

      {/* Tombol Kontrol */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Nyalakan Sensor */}
        <button
          id="btn-set-armed"
          onClick={() => onSetMode('ARMED')}
          disabled={isArmed || !isOnline || hasPending}
          title="Nyalakan sensor PIR: gerakan memicu foto + notifikasi Telegram"
          className={`flex flex-col items-start px-4 py-3 rounded-lg border text-sm font-semibold transition-all cursor-pointer ${isArmed
              ? isDark
                ? 'bg-amber-500/15 border-amber-500/50 text-amber-400 cursor-default ring-1 ring-amber-500/30'
                : 'bg-amber-50 border-amber-400 text-amber-700 cursor-default ring-1 ring-amber-300'
              : !isOnline || hasPending
                ? isDark
                  ? 'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed'
                  : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                : isDark
                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-amber-900/20 hover:border-amber-600 hover:text-amber-400'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-amber-50 hover:border-amber-400 hover:text-amber-700'
            }`}
        >
          <div className="flex items-center gap-2 w-full">
            <Shield className="w-4 h-4 shrink-0" />
            <span>Nyalakan Sensor</span>
            {isArmed && (
              <span className={`ml-auto text-[9px] font-mono px-1.5 py-0.5 rounded ${isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                AKTIF
              </span>
            )}
          </div>
          <p className={`text-[10px] font-normal font-mono mt-1.5 leading-relaxed ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
            Gerakan memicu foto otomatis dan notifikasi
          </p>
        </button>

        {/* Matikan Sensor */}
        <button
          id="btn-set-activity"
          onClick={() => onSetMode('ACTIVITY')}
          disabled={!isArmed || !isOnline || hasPending}
          title="Matikan sensor PIR: tidak ada foto maupun notifikasi sampai dinyalakan kembali"
          className={`flex flex-col items-start px-4 py-3 rounded-lg border text-sm font-semibold transition-all cursor-pointer ${!isArmed
              ? isDark
                ? 'bg-slate-700/40 border-slate-600 text-slate-300 cursor-default ring-1 ring-slate-500/30'
                : 'bg-slate-100 border-slate-400 text-slate-600 cursor-default ring-1 ring-slate-300'
              : !isOnline || hasPending
                ? isDark
                  ? 'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed'
                  : 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                : isDark
                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:border-slate-500'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400'
            }`}
        >
          <div className="flex items-center gap-2 w-full">
            <ShieldOff className="w-4 h-4 shrink-0" />
            <span>Matikan Sensor</span>
            {!isArmed && (
              <span className={`ml-auto text-[9px] font-mono px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>
                AKTIF
              </span>
            )}
          </div>
          <p className={`text-[10px] font-normal font-mono mt-1.5 leading-relaxed ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
            Tidak ada foto maupun notifikasi sampai dinyalakan lagi
          </p>
        </button>
      </div>

      {/* Peringatan jika offline atau ada pending */}
      {(!isOnline || hasPending) && (
        <p className={`text-[11px] font-mono mt-3 text-center ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
          {!isOnline
            ? 'Kontrol nonaktif — perangkat offline'
            : `Kontrol nonaktif — ada command pending: ${deviceStatus.pending_command}`}
        </p>
      )}
    </div>
  );
};
