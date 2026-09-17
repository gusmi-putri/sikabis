/**
 * SI-JAGA — LiveCameraPanel.tsx
 * Live feed MJPEG dari ESP32-CAM, diambil langsung dari stream_url yang
 * dilaporkan device sendiri lewat heartbeat (bukan diisi manual), supaya
 * tetap akurat walau IP berubah karena DHCP.
 */

import React, { useState } from 'react';
import { Camera, Settings2, RefreshCw, WifiOff, Zap, ZapOff } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { DeviceOnlineStatus } from '../types';

interface LiveCameraPanelProps {
  deviceId: string;
  status: DeviceOnlineStatus;
  streamUrl: string | null;
  flashOn: boolean;
  onToggleFlash: (on: boolean) => Promise<void>;
}

export const LiveCameraPanel: React.FC<LiveCameraPanelProps> = ({
  deviceId,
  status,
  streamUrl,
  flashOn,
  onToggleFlash,
}) => {
  const { isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [manualUrl, setManualUrl] = useState<string | null>(null);
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [isTogglingFlash, setIsTogglingFlash] = useState(false);

  const isOnline = status === 'online';

  const handleToggleFlash = async () => {
    setIsTogglingFlash(true);
    try {
      await onToggleFlash(!flashOn);
    } finally {
      setIsTogglingFlash(false);
    }
  };

  const effectiveUrl = manualUrl ?? streamUrl;
  const displayUrl = effectiveUrl ? `${effectiveUrl}${effectiveUrl.includes('?') ? '&' : '?'}t=${reloadToken}` : null;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`w-full flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed transition-colors text-xs font-mono font-semibold ${
          isDark
            ? 'bg-slate-900/50 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500 hover:bg-slate-800'
            : 'bg-slate-50 border-slate-300 text-slate-600 hover:text-slate-800 hover:border-slate-400 hover:bg-slate-100'
        }`}
      >
        <Camera className="w-4 h-4" />
        Buka Live Camera ESP32
      </button>
    );
  }

  return (
    <div className={`rounded-lg border shadow-sm overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-3 w-3">
            {status === 'online' && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            )}
            <span className={`relative inline-flex rounded-full h-3 w-3 ${status === 'online' ? 'bg-red-500' : 'bg-slate-500'}`} />
          </div>
          <h3 className={`text-sm font-bold font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
            LIVE FEED: {deviceId}
          </h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className={`text-[11px] font-semibold px-2.5 py-1 rounded border transition-colors ${
            isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
          }`}
        >
          Tutup
        </button>
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Stream Area (Col span 3) */}
        <div className="md:col-span-3">
          <div className={`relative aspect-video rounded-lg overflow-hidden border-2 bg-black flex items-center justify-center ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            {displayUrl && !imageFailed ? (
              <img
                key={displayUrl}
                src={displayUrl}
                alt="Live Stream"
                className="w-full h-full object-contain"
                onError={() => setImageFailed(true)}
                onLoad={() => setImageFailed(false)}
              />
            ) : (
              <div className="text-center text-slate-500 font-mono text-sm px-4">
                <WifiOff className="w-6 h-6 mx-auto mb-2" />
                {!effectiveUrl
                  ? 'Stream URL belum tersedia (menunggu heartbeat pertama dari device)'
                  : 'STREAM OFFLINE / URL SALAH'}
                <span className="text-[10px] mt-2 block">Pastikan perangkat terhubung jaringan</span>
              </div>
            )}
          </div>
        </div>

        {/* Info & Kontrol (Col span 1) */}
        <div className="space-y-4">
          {/* Status Perangkat */}
          <div className={`p-3 rounded-lg border ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <h4 className={`text-xs font-semibold mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Status Perangkat</h4>
            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-mono font-semibold border ${
              isOnline
                ? isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : isDark ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-red-50 text-red-700 border-red-300'
            }`}>
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>

          {/* Kontrol Flash */}
          <div className={`p-3 rounded-lg border ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <h4 className={`text-xs font-semibold mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Kontrol Perangkat</h4>
            <button
              onClick={handleToggleFlash}
              disabled={!isOnline || isTogglingFlash}
              title="Perintah dikirim ke ESP32 lewat polling /device/command (maks. 10 detik)"
              className={`w-full flex items-center justify-center gap-2 py-2 rounded border text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                flashOn
                  ? 'bg-amber-400 hover:bg-amber-500 border-amber-500 text-amber-950 shadow-[0_0_15px_rgba(251,191,36,0.4)]'
                  : isDark
                    ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                    : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
              }`}
            >
              {flashOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
              {isTogglingFlash ? 'Mengirim...' : flashOn ? 'Flash Menyala' : 'Nyalakan Flash'}
            </button>
          </div>

          {/* Stream Settings */}
          <div className={`p-3 rounded-lg border ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <h4 className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Stream URL</h4>
              <button
                onClick={() => setIsEditingUrl(!isEditingUrl)}
                title="Timpa sementara kalau deteksi otomatis salah (tidak disimpan ke server)"
                className={isDark ? 'text-emerald-400' : 'text-emerald-600'}
              >
                <Settings2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {isEditingUrl ? (
              <input
                type="text"
                value={manualUrl ?? streamUrl ?? ''}
                onChange={(e) => setManualUrl(e.target.value)}
                className={`w-full px-2 py-1.5 text-xs font-mono rounded border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-300 text-slate-700'
                }`}
                placeholder="http://ip/stream"
              />
            ) : (
              <div className={`text-[10px] font-mono truncate px-2 py-1.5 rounded border ${isDark ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-white border-slate-200 text-slate-500'}`}>
                {effectiveUrl || 'Belum ada URL'}
              </div>
            )}
            {manualUrl && (
              <p className={`text-[9px] font-mono mt-1 ${isDark ? 'text-amber-500' : 'text-amber-600'}`}>
                Ditimpa manual, bukan dari device.{' '}
                <button onClick={() => setManualUrl(null)} className="underline">
                  Pakai deteksi otomatis
                </button>
              </p>
            )}

            <button
              onClick={() => {
                setImageFailed(false);
                setReloadToken(Date.now());
              }}
              className={`w-full flex items-center justify-center gap-1.5 mt-2 py-1.5 rounded border text-[11px] transition-colors ${
                isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
              }`}
            >
              <RefreshCw className="w-3 h-3" />
              Refresh Stream
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
