/**
 * SI-JAGA — PIRControlPanel.tsx
 * Panel kontrol mode PIR (ARMED / ACTIVITY) + status device ESP32.
 * ARMED    = Gerakan memicu foto + notifikasi Telegram.
 * ACTIVITY = PIR aktif secara fisik, tapi foto & notifikasi dimatikan
 *            (dipakai saat ada kegiatan resmi di gudang).
 */

import React, { useState, useEffect } from 'react';
import { Shield, ShieldOff, Wifi, WifiOff, Clock, Radio, Timer } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { DeviceStatus, PIRMode } from '../types';

interface PIRControlPanelProps {
  deviceStatus: DeviceStatus;
  onSetMode: (mode: PIRMode, durationMinutes?: number) => void;
}

export const PIRControlPanel: React.FC<PIRControlPanelProps> = ({
  deviceStatus,
  onSetMode,
}) => {
  const { isDark } = useTheme();
  const [showTimerOptions, setShowTimerOptions] = useState(false);
  const [timeLeftStr, setTimeLeftStr] = useState('');

  const isOnline = deviceStatus.status === 'online';
  const isArmed = deviceStatus.pir_mode === 'ON';

  const lastSeenStr = new Date(deviceStatus.last_seen).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // Countdown timer effect
  useEffect(() => {
    if (!deviceStatus.auto_arm_at) {
      setTimeLeftStr('');
      return;
    }
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(deviceStatus.auto_arm_at!).getTime();
      const diff = target - now;
      
      if (diff <= 0) {
        setTimeLeftStr('Mengaktifkan...');
      } else {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        if (h > 0) {
            setTimeLeftStr(`${h}j ${m}m lagi`);
        } else {
            setTimeLeftStr(`${m}m ${s}s lagi`);
        }
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [deviceStatus.auto_arm_at]);

  return (
    <div
      id="panel-kontrol-pir"
      className={`rounded-2xl border p-5 transition-all relative ${
        isDark ? 'bg-white/5 backdrop-blur-md border-white/10 shadow-lg' : 'bg-white border-slate-200 shadow-sm'
      }`}
    >
      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg border ${isArmed
              ? isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-amber-50 border-amber-300 text-amber-700'
              : isDark ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-red-50 border-red-300 text-red-700'
            }`}>
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Kontrol Sensor PIR Gudang
            </h3>
            <p className={`text-[11px] font-mono mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
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
      <div className={`my-4 flex items-center gap-3 p-3 rounded-lg border ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
        <div className={`w-3 h-3 rounded-full shrink-0 ${isArmed ? 'bg-amber-400 animate-pulse' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`} />
        <div className="flex-1 flex items-center justify-between">
          <div>
              <span className={`text-[10px] font-mono uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Status Sensor PIR
              </span>
              <div className={`text-base font-bold font-mono tracking-wider mt-0.5 ${isArmed
                  ? isDark ? 'text-amber-400' : 'text-amber-700'
                  : isDark ? 'text-red-400' : 'text-red-600'
                }`}>
                {isArmed ? 'AKTIF' : 'MATI'}
              </div>
          </div>
          
          {!isArmed && deviceStatus.auto_arm_at && (
             <div className="flex items-center gap-1.5 text-[11px] font-bold font-mono bg-red-500/10 text-red-500 border border-red-500/30 px-3 py-1.5 rounded-lg shadow-sm">
               <Timer className="w-4 h-4 animate-pulse" />
               Otomatis aktif dalam: {timeLeftStr}
             </div>
          )}
        </div>
      </div>

      {/* Tombol Kontrol */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
        {/* Nyalakan Sensor */}
        <button
          id="btn-set-armed"
          onClick={() => {
              onSetMode('ON');
              setShowTimerOptions(false);
          }}
          disabled={isArmed}
          title="Nyalakan sensor PIR: gerakan memicu foto + notifikasi Telegram"
          className={`flex flex-col items-start px-4 py-3 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${isArmed
                ? isDark ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 cursor-default ring-1 ring-amber-500/30' : 'bg-amber-500 text-white cursor-default border-amber-600 shadow-md ring-2 ring-amber-200'
              : isDark ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-amber-500/20 hover:border-amber-500 hover:text-amber-400' : 'bg-white border-slate-200 text-slate-600 hover:bg-amber-50 hover:border-amber-400 hover:text-amber-600 shadow-sm'
            }`}
        >
          <div className="flex items-center gap-2 w-full">
            <Shield className="w-4 h-4 shrink-0" />
            <span>Nyalakan Sensor</span>
            {isArmed && (
              <span className={`ml-auto text-[9px] font-mono px-1.5 py-0.5 rounded ${isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-white/30 text-white border border-white/50'}`}>
                AKTIF
              </span>
            )}
          </div>
          <p className={`text-[10px] font-normal font-mono mt-1.5 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Gerakan memicu foto otomatis dan notifikasi
          </p>
        </button>

        {/* Matikan Sensor */}
        <div className="relative">
            {showTimerOptions ? (
                <div className={`absolute bottom-full mb-2 right-0 left-0 z-10 p-2 rounded-lg border shadow-xl animate-in slide-in-from-bottom-2 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <p className={`text-[10px] font-mono mb-2 px-1 text-center font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Pilih Durasi Nonaktif:</p>
                  <div className="space-y-1">
                    {[30, 60, 120].map(mins => (
                      <button 
                        key={mins}
                        onClick={() => { onSetMode('OFF', mins); setShowTimerOptions(false); }}
                        className={`w-full text-left px-3 py-2 rounded text-xs font-semibold hover:bg-red-500 hover:text-white transition-colors ${isDark ? 'bg-slate-900 text-slate-300' : 'bg-slate-100 text-slate-700'}`}
                      >
                        <Timer className="w-3.5 h-3.5 inline mr-2 opacity-70" />
                        {mins === 60 ? '1 Jam' : mins === 120 ? '2 Jam' : `${mins} Menit`}
                      </button>
                    ))}
                    <button 
                      onClick={() => { onSetMode('OFF'); setShowTimerOptions(false); }}
                      className={`w-full text-left px-3 py-2 rounded text-xs font-semibold hover:bg-red-500 hover:text-white transition-colors ${isDark ? 'bg-slate-900 text-slate-300' : 'bg-slate-100 text-slate-700'}`}
                    >
                      <ShieldOff className="w-3.5 h-3.5 inline mr-2 opacity-70" />
                      Manual (Tanpa Timer)
                    </button>
                  </div>
                  <button 
                    onClick={() => setShowTimerOptions(false)}
                    className={`w-full mt-2 text-center px-3 py-1.5 rounded-md text-[10px] font-mono border transition-colors ${isDark ? 'border-slate-700 text-slate-400 hover:bg-slate-700' : 'border-slate-300 text-slate-500 hover:bg-slate-100'}`}
                  >
                    Batal
                  </button>
                </div>
            ) : null}
            
            <button
              id="btn-set-activity"
              onClick={() => setShowTimerOptions(true)}
              disabled={!isArmed}
              title="Matikan sensor PIR: tidak ada foto maupun notifikasi sampai dinyalakan kembali"
              className={`w-full flex flex-col items-start px-4 py-3 rounded-xl border text-sm font-semibold transition-all cursor-pointer h-full ${!isArmed
                    ? isDark ? 'bg-red-500/20 border-red-500/50 text-red-400 cursor-default ring-1 ring-red-500/30' : 'bg-red-500 text-white cursor-default border-red-600 shadow-md ring-2 ring-red-200'
                  : isDark ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-red-500/20 hover:border-red-500 hover:text-red-400' : 'bg-white border-slate-200 text-slate-600 hover:bg-red-50 hover:border-red-400 hover:text-red-600 shadow-sm'
                }`}
            >
              <div className="flex items-center gap-2 w-full">
                <ShieldOff className="w-4 h-4 shrink-0" />
                <span>Matikan Sensor</span>
                {!isArmed && (
                  <span className={`ml-auto text-[9px] font-mono px-1.5 py-0.5 rounded ${isDark ? 'bg-red-500/20 text-red-400' : 'bg-white/30 text-white border border-white/50'}`}>
                    MATI
                  </span>
                )}
              </div>
              <p className={`text-[10px] font-normal font-mono mt-1.5 leading-relaxed text-left ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Tidak ada peringatan, gunakan timer agar tidak lupa
              </p>
            </button>
        </div>
      </div>

      {/* Peringatan jika offline */}
      {!isOnline && (
        <p className={`text-[11px] font-mono mt-3 text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          Kontrol nonaktif — perangkat offline
        </p>
      )}
    </div>
  );
};
