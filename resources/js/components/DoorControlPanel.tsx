import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Unlock, 
  ShieldAlert, 
  KeyRound, 
  DoorOpen, 
  DoorClosed, 
  AlertTriangle, 
  Timer,
  Zap,
  CheckCircle,
  RotateCcw,
  ShieldCheck
} from 'lucide-react';
import { DoorState } from '../types';
import { useTheme } from '../context/ThemeContext';

interface DoorControlPanelProps {
  doorState: DoorState;
  onManualUnlock: () => void;
  onLockdownToggle: () => void;
  onNormaliseDoor: () => void;
}

export const DoorControlPanel: React.FC<DoorControlPanelProps> = ({
  doorState,
  onManualUnlock,
  onLockdownToggle,
  onNormaliseDoor
}) => {
  const { isDark } = useTheme();
  const [unlockCountdown, setUnlockCountdown] = useState<number>(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (doorState === 'UNLOCKED_MANUAL') {
      setUnlockCountdown(15);
      interval = setInterval(() => {
        setUnlockCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            onNormaliseDoor();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setUnlockCountdown(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [doorState]);

  return (
    <div 
      id="panel-kendali-pintu-utama"
      className={`border rounded-lg p-5 transition-all shadow-sm ${
        isDark ? 'bg-slate-900' : 'bg-white'
      } ${
        doorState === 'LOCKDOWN'
          ? 'border-red-500/80 ring-1 ring-red-500/30'
          : doorState === 'UNLOCKED_MANUAL'
            ? 'border-emerald-500/70 ring-1 ring-emerald-500/20'
            : isDark ? 'border-slate-800' : 'border-slate-200'
      }`}
    >
      {/* Top Header */}
      <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b pb-4 ${
        isDark ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-mono uppercase tracking-wider ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}>
              Aktuator IoT • Pintu Utama A1
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
              isDark 
                ? 'bg-slate-800 text-slate-300 border-slate-700' 
                : 'bg-slate-100 text-slate-700 border-slate-300'
            }`}>
              Interlock Baja Level 4
            </span>
          </div>
          <h3 className={`text-base font-tactical font-bold tracking-wide mt-1 ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
            Panel Kendali Pintu Gudang Senjata
          </h3>
        </div>

        {/* Real-time Magnetic Lock indicator */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className={`px-3 py-1 rounded border flex items-center gap-1.5 font-medium ${
            doorState === 'LOCKDOWN'
              ? isDark ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-red-50 border-red-300 text-red-700'
              : doorState === 'UNLOCKED_MANUAL'
                ? isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-300 text-emerald-700'
                : isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'
          }`}>
            <Zap className="w-3.5 h-3.5" />
            <span>
              {doorState === 'LOCKDOWN' 
                ? 'MAGLOCK: FORCE OVERRIDE (1500 LBS)' 
                : doorState === 'UNLOCKED_MANUAL' 
                  ? 'MAGLOCK: RELEASED' 
                  : 'MAGLOCK: ENGAGED (1200 LBS)'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Status Display Area */}
      <div className={`my-5 p-4 rounded-lg border flex flex-col md:flex-row items-center justify-between gap-4 ${
        isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
      }`}>
        {/* Left: Graphic status */}
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className={`w-12 h-12 rounded-lg border flex items-center justify-center transition-all ${
            doorState === 'LOCKDOWN'
              ? 'bg-red-500/20 border-red-500 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse'
              : doorState === 'UNLOCKED_MANUAL'
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-200 border-slate-300 text-slate-700'
          }`}>
            {doorState === 'LOCKDOWN' ? (
              <ShieldAlert className="w-6 h-6" />
            ) : doorState === 'UNLOCKED_MANUAL' ? (
              <DoorOpen className="w-6 h-6" />
            ) : (
              <DoorClosed className="w-6 h-6" />
            )}
          </div>

          <div>
            <div className={`text-xs font-mono ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              STATUS PINTU
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xl font-tactical font-bold tracking-wider ${
                doorState === 'LOCKDOWN' 
                  ? isDark ? 'text-red-400' : 'text-red-600' 
                  : doorState === 'UNLOCKED_MANUAL' 
                    ? isDark ? 'text-emerald-400' : 'text-emerald-700' 
                    : isDark ? 'text-slate-200' : 'text-slate-900'
              }`}>
                {doorState === 'LOCKDOWN' 
                  ? 'LOCKDOWN DARURAT' 
                  : doorState === 'UNLOCKED_MANUAL' 
                    ? 'TERBUKA (MANUAL OVERRIDE)' 
                    : 'TERKUNCI'}
              </span>

              {doorState === 'LOCKED' && (
                <span className={`flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border ${
                  isDark 
                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
                    : 'text-emerald-700 bg-emerald-50 border-emerald-200 font-semibold'
                }`}>
                  <ShieldCheck className="w-3 h-3" />
                  Aman
                </span>
              )}
            </div>

            <p className={`text-xs font-mono mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {doorState === 'LOCKDOWN' 
                ? 'Prosedur darurat aktif. Seluruh akses biometrik ditangguhkan.'
                : doorState === 'UNLOCKED_MANUAL'
                  ? `Solenoid terbuka. Pintu akan mengunci otomatis dalam ${unlockCountdown} detik.`
                  : 'Sistem siap. Pintu hanya terbuka saat otorisasi AI Face Recognition valid.'}
            </p>
          </div>
        </div>

        {/* Right: Countdown or Reset Button */}
        {doorState === 'UNLOCKED_MANUAL' && (
          <div className={`flex items-center gap-3 border px-4 py-2 rounded-lg font-mono ${
            isDark ? 'bg-emerald-950/40 border-emerald-500/30' : 'bg-emerald-50 border-emerald-300'
          }`}>
            <Timer className="w-4 h-4 text-emerald-500 animate-spin" />
            <div>
              <div className={`text-[10px] ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>AUTO-LOCK IN</div>
              <div className={`text-lg font-bold ${isDark ? 'text-emerald-200' : 'text-emerald-800'}`}>{unlockCountdown}s</div>
            </div>
          </div>
        )}

        {doorState === 'LOCKDOWN' && (
          <div className="flex items-center gap-2">
            <button
              id="btn-cancel-lockdown"
              onClick={onNormaliseDoor}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-mono font-semibold transition-all cursor-pointer ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                  : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-sm'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-emerald-500" />
              <span>PULIHKAN NORMAL</span>
            </button>
          </div>
        )}
      </div>

      {/* Prominent Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Tombol 1: Buka Pintu Manual */}
        <button
          id="btn-buka-pintu-manual"
          onClick={onManualUnlock}
          disabled={doorState === 'LOCKDOWN'}
          className={`flex items-center justify-center gap-2.5 px-5 py-3 rounded-lg text-xs font-semibold tracking-wider transition-all cursor-pointer shadow-sm ${
            doorState === 'LOCKDOWN'
              ? isDark ? 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed' : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed'
              : doorState === 'UNLOCKED_MANUAL'
                ? 'bg-emerald-700 border border-emerald-400 text-white shadow-emerald-900/40'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500/60 shadow-emerald-950/20'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <div className="text-left">
            <div className="font-bold">BUKA PINTU MANUAL</div>
            <div className="text-[10px] font-normal font-mono opacity-90">
              {doorState === 'UNLOCKED_MANUAL' ? 'Sedang Terbuka' : 'Otorisasi Manual Operator Pos 1'}
            </div>
          </div>
        </button>

        {/* Tombol 2: LOCKDOWN */}
        <button
          id="btn-lockdown-emergency"
          onClick={onLockdownToggle}
          className={`flex items-center justify-center gap-2.5 px-5 py-3 rounded-lg text-xs font-semibold tracking-wider transition-all cursor-pointer shadow-sm ${
            doorState === 'LOCKDOWN'
              ? 'bg-red-700 border border-white text-white shadow-red-900/80 animate-pulse'
              : 'bg-red-600 hover:bg-red-700 text-white border border-red-500/60 shadow-red-950/20'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <div className="text-left">
            <div className="font-bold">{doorState === 'LOCKDOWN' ? 'LOCKDOWN SEDANG AKTIF' : 'LOCKDOWN DARURAT'}</div>
            <div className="text-[10px] font-normal font-mono opacity-90">
              {doorState === 'LOCKDOWN' ? 'Klik untuk nonaktifkan' : 'Prosedur Darurat Segel Bunker'}
            </div>
          </div>
        </button>
      </div>

      {/* Safety Notice */}
      <div className={`mt-3.5 flex items-center justify-between text-[10px] font-mono ${
        isDark ? 'text-slate-500' : 'text-slate-500'
      }`}>
        <span className="flex items-center gap-1.5">
          <Lock className="w-3 h-3 text-slate-500" />
          Otoritas Kendali: Operator Jaga Pos 1
        </span>
        <span className="hidden sm:inline">
          Protokol Bengpuskomlekad
        </span>
      </div>
    </div>
  );
};
