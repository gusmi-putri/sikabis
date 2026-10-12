import React from 'react';
import { Radio, KeyRound, Camera, Wifi, WifiOff, ShieldCheck } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { DeviceStatus } from '../types';

interface ExecutiveHardwareSummaryProps {
  deviceStatus: DeviceStatus;
  keyboxStatus: DeviceStatus[];
}

export const ExecutiveHardwareSummary: React.FC<ExecutiveHardwareSummaryProps> = ({
  deviceStatus,
  keyboxStatus,
}) => {
  const { isDark } = useTheme();

  const boardA = keyboxStatus.find(
    (d) => !d.device_id.toLowerCase().includes('cam')
  );
  const boardB = keyboxStatus.find(
    (d) => d.device_id.toLowerCase().includes('cam')
  );

  const isCamOnline = deviceStatus.status === 'online';
  const isPirArmed = deviceStatus.pir_mode === 'ON';
  const isBoardAOnline = boardA?.status === 'online';
  const isBoardBOnline = boardB?.status === 'online';

  return (
    <div
      className={`p-4 sm:p-5 rounded-2xl border shadow-md backdrop-blur-md transition-colors ${
        isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'
      }`}
    >
      {/* Header Ringkas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className={`text-sm font-bold font-mono ${isDark ? 'text-white' : 'text-slate-800'}`}>
              STATUS KOMPONEN & SENSOR IOT
            </h3>
            <p className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Pemantauan kesehatan perangkat keras secara ringkas (Real-Time)
            </p>
          </div>
        </div>
        <span className="self-start sm:self-auto text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-sky-500/15 border border-sky-500/30 text-sky-400">
          MODE EKSEKUTIF
        </span>
      </div>

      {/* Grid 3 Kartu Komponen Ringkas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 1. ESP32-CAM & Sensor PIR */}
        <div
          className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 ${
            isDark ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className={`w-4 h-4 ${isCamOnline ? 'text-amber-400' : 'text-slate-500'}`} />
              <span className={`text-xs font-bold font-mono ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                Sensor PIR Gudang
              </span>
            </div>
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border ${
                isCamOnline
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/15 border-red-500/30 text-red-400'
              }`}
            >
              {isCamOnline ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
              {isCamOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] font-mono">
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Deteksi Gerak:</span>
            <span
              className={`font-bold ${
                isPirArmed
                  ? isDark
                    ? 'text-amber-400'
                    : 'text-amber-600'
                  : isDark
                  ? 'text-red-400'
                  : 'text-red-600'
              }`}
            >
              {isPirArmed ? 'AKTIF (SIAGA)' : 'NONAKTIF'}
            </span>
          </div>
        </div>

        {/* 2. Board A - Kotak Kunci */}
        <div
          className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 ${
            isDark ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className={`w-4 h-4 ${isBoardAOnline ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span className={`text-xs font-bold font-mono ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                Board A (Sidik Jari)
              </span>
            </div>
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border ${
                isBoardAOnline
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/15 border-red-500/30 text-red-400'
              }`}
            >
              {isBoardAOnline ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
              {isBoardAOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] font-mono">
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Solenoid Pintu:</span>
            <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Terkunci Otomatis
            </span>
          </div>
        </div>

        {/* 3. Board B - Kamera Kotak Kunci */}
        <div
          className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 ${
            isDark ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-200/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className={`w-4 h-4 ${isBoardBOnline ? 'text-sky-400' : 'text-slate-500'}`} />
              <span className={`text-xs font-bold font-mono ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                Board B (Kamera Kotak)
              </span>
            </div>
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border ${
                isBoardBOnline
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-red-500/15 border-red-500/30 text-red-400'
              }`}
            >
              {isBoardBOnline ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
              {isBoardBOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] font-mono">
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Foto Akses:</span>
            <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Auto Snapshot Jari
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
