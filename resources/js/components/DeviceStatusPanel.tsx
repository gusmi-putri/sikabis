/**
 * SI-JAGA — DeviceStatusPanel.tsx (kini: Kontrol Kotak Kunci)
 * Sama seperti PIRControlPanel: badge status di header, badan panel
 * cuma berisi tombol kontrol. Menyatukan Board A (sidik jari) dan
 * Board B (kameranya) dalam satu panel karena keduanya satu subsistem.
 */

import React from 'react';
import { KeyRound, Camera, Wifi, WifiOff, BellOff, Lock, Volume2, Aperture, RotateCcw } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { DeviceStatus } from '../types';

export type KeyboxCommand = 'MUTE_ALARM' | 'FORCE_LOCK' | 'TEST_BUZZER' | 'TEST_TRIGGER' | 'RESET_SENSOR';

interface DeviceStatusPanelProps {
  title: string;
  description: string;
  devices: DeviceStatus[];
  onKeyboxCommand?: (command: KeyboxCommand) => void;
}

// Perintah yang aman dikirim lewat jaringan -- SENGAJA tidak ada perintah
// buka solenoid, itu keputusan keamanan (lihat KeyBoxController::command()).
const KEYBOX_COMMANDS: { command: KeyboxCommand; label: string; title: string; icon: React.ElementType; hoverClass: string }[] = [
  { command: 'MUTE_ALARM', label: 'Mute Alarm', title: 'Matikan alarm buzzer yang sedang berbunyi', icon: BellOff, hoverClass: 'hover:bg-amber-500/20 hover:border-amber-500 hover:text-amber-400' },
  { command: 'FORCE_LOCK', label: 'Paksa Kunci', title: 'Paksa kunci solenoid sekarang', icon: Lock, hoverClass: 'hover:bg-red-500/20 hover:border-red-500 hover:text-red-400' },
  { command: 'TEST_BUZZER', label: 'Uji Buzzer', title: 'Bunyikan buzzer 3 kali sebagai tes', icon: Volume2, hoverClass: 'hover:bg-blue-500/20 hover:border-blue-500 hover:text-blue-400' },
  { command: 'TEST_TRIGGER', label: 'Uji Kamera', title: 'Kirim pulsa pemicu ke kamera (Board B) sebagai tes', icon: Aperture, hoverClass: 'hover:bg-purple-500/20 hover:border-purple-500 hover:text-purple-400' },
  { command: 'RESET_SENSOR', label: 'Reset Sensor', title: 'Deteksi ulang sensor sidik jari tanpa upload ulang firmware', icon: RotateCcw, hoverClass: 'hover:bg-emerald-500/20 hover:border-emerald-500 hover:text-emerald-400' },
];

const StatusBadge: React.FC<{ label: string; icon: React.ElementType; isOnline: boolean; isDark: boolean }> = ({
  label,
  icon: Icon,
  isOnline,
  isDark,
}) => (
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

export const DeviceStatusPanel: React.FC<DeviceStatusPanelProps> = ({
  title,
  description,
  devices,
  onKeyboxCommand,
}) => {
  const { isDark } = useTheme();

  const boardA = devices.find((d) => d.device_id === 'kotak-kunci-01') ?? null;
  const boardB = devices.find((d) => d.device_id === 'kotak-kunci-cam-01') ?? null;
  const isBoardAOnline = boardA?.status === 'online';

  return (
    <div
      className={`rounded-2xl border p-5 transition-all h-full ${
        isDark ? 'bg-white/5 backdrop-blur-md border-white/10 shadow-lg' : 'bg-white border-slate-200 shadow-sm'
      }`}
    >
      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
        <div>
          <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{title}</h3>
          <p className={`text-[11px] font-mono mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{description}</p>
        </div>

        <div className="flex items-center gap-2">
          {boardA && (
            <StatusBadge label="Board A" icon={KeyRound} isOnline={boardA.status === 'online'} isDark={isDark} />
          )}
          {boardB && (
            <StatusBadge label="Board B" icon={Camera} isOnline={boardB.status === 'online'} isDark={isDark} />
          )}
        </div>
      </div>

      {/* Tombol Kontrol */}
      {onKeyboxCommand && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {KEYBOX_COMMANDS.map(({ command, label, title: btnTitle, icon: CmdIcon, hoverClass }) => (
            <button
              key={command}
              id={`btn-keybox-${command.toLowerCase()}`}
              onClick={() => onKeyboxCommand(command)}
              disabled={!isBoardAOnline}
              title={btnTitle}
              className={`flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-lg border text-[11px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                isDark ? `bg-white/5 border-white/10 text-slate-300 ${hoverClass}` : `bg-white border-slate-200 text-slate-600 ${hoverClass}`
              }`}
            >
              <CmdIcon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Pendaftaran sidik jari pindah ke tab Manajemen Akses */}
      <div className={`mt-3 pt-3 border-t text-center ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
        <p className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Pendaftaran personel baru dilakukan melalui tab <strong>Manajemen Akses</strong>.
        </p>
      </div>


      {!isBoardAOnline && (
        <p className={`text-[11px] font-mono mt-3 text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          Kontrol nonaktif — Board A offline
        </p>
      )}
    </div>
  );
};
