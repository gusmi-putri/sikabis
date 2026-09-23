/**
 * SI-JAGA — MotionLogView.tsx
 * Halaman penuh riwayat deteksi gerakan (Motion Event) gudang.
 * Termasuk panel live camera ESP32 dan pagination tabel event.
 * Menggantikan BunkerAlertsView yang lama.
 */

import React, { useState } from 'react';
import { Radio, ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import { MotionEvent } from '../types';
import { useTheme } from '../context/ThemeContext';
import { ImageZoomModal } from './ImageZoomModal';
import { LiveCameraPanel } from './LiveCameraPanel';

import { DeviceStatus } from '../types';

interface MotionLogViewProps {
  events: MotionEvent[];
  deviceStatus: DeviceStatus;
  onToggleFlash: (on: boolean) => Promise<void>;
}

export const MotionLogView: React.FC<MotionLogViewProps> = ({ events, deviceStatus, onToggleFlash }) => {
  const { isDark } = useTheme();
  const [filterMode, setFilterMode] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomEvent, setZoomEvent] = useState<MotionEvent | null>(null);

  const itemsPerPage = 10;

  // Filter events
  const filteredEvents = events.filter((e) => {
    if (filterMode === 'ALL') return true;
    return e.pir_mode === filterMode;
  });

  // Pagination
  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const paginatedEvents = filteredEvents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-5">
      {/* 1. Komponen Panel Live Camera Opsional */}
      <LiveCameraPanel 
        deviceId={deviceStatus.device_id}
        status={deviceStatus.status}
        streamUrl={deviceStatus.stream_url}
        flashOn={deviceStatus.flash_on}
        onToggleFlash={onToggleFlash}
      />

      {/* 2. Header & Filter Log */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border shadow-lg bg-white/5 backdrop-blur-md border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg border bg-amber-500/20 border-amber-500/30 text-amber-400">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-tactical tracking-wide text-white">
              Motion Log Gudang
            </h2>
            <p className="text-xs font-mono mt-0.5 text-slate-400">
              Riwayat deteksi sensor gerak (PIR) dan jepretan otomatis
            </p>
          </div>
        </div>

        {/* Filter Mode */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-semibold text-slate-400">
            Filter Mode:
          </span>
          <select
            value={filterMode}
            onChange={(e) => {
              setFilterMode(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 rounded-lg border text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-colors bg-black/20 border-white/10 text-slate-200"
          >
            <option value="ALL">Semua Status</option>
            <option value="ON">Saat Sensor Nyala</option>
            <option value="OFF">Saat Sensor Mati</option>
          </select>
        </div>
      </div>

      {/* 3. Tabel Log */}
      <div className="rounded-2xl border shadow-lg overflow-hidden bg-white/5 backdrop-blur-md border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[11px] font-mono border-b border-white/10 text-slate-400 bg-black/20">
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Foto Dokumentasi</th>
                <th className="py-3 px-4">Device ID</th>
                <th className="py-3 px-4 text-center">Status Sensor</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm divide-white/5">
              {paginatedEvents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-sm font-mono text-slate-500">
                    Tidak ada motion event ditemukan.
                  </td>
                </tr>
              ) : (
                paginatedEvents.map((event) => {
                  const isArmed = event.pir_mode === 'ON';
                  return (
                    <tr key={event.id} className="transition-colors hover:bg-white/10">
                      {/* Waktu */}
                      <td className="py-3 px-4 font-mono whitespace-nowrap text-slate-300">
                        {new Date(event.created_at).toLocaleString('id-ID')} WIB
                      </td>

                      {/* Foto */}
                      <td className="py-3 px-4">
                        {event.image_path ? (
                          <button
                            onClick={() => setZoomEvent(event)}
                            className={`w-16 h-10 rounded border overflow-hidden cursor-pointer hover:opacity-90 transition-opacity ${
                              isArmed ? 'border-amber-500/40' : 'border-slate-500/30'
                            }`}
                          >
                            <img src={event.image_path} alt="Foto motion" className="w-full h-full object-cover" />
                          </button>
                        ) : (
                          <div className="w-16 h-10 rounded border flex items-center justify-center bg-white/5 border-white/10 text-slate-500">
                            <ImageOff className="w-4 h-4" />
                          </div>
                        )}
                      </td>

                      {/* Device */}
                      <td className="py-3 px-4 font-mono text-xs text-slate-400">
                        {event.device_id}
                      </td>

                      {/* Mode PIR */}
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold font-mono border ${
                          isArmed
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                            : 'bg-white/5 text-slate-400 border-white/10'
                        }`}>
                          {isArmed && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
                          {isArmed ? 'NYALA' : 'MATI'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/10">
            <span className="text-xs font-mono text-slate-400">
              Halaman {currentPage} dari {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`p-1.5 rounded border transition-colors ${
                  currentPage === 1
                    ? 'bg-white/5 border-white/5 text-slate-600 cursor-not-allowed'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={`p-1.5 rounded border transition-colors ${
                  currentPage === totalPages
                    ? 'bg-white/5 border-white/5 text-slate-600 cursor-not-allowed'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Modal Zoom Foto */}
      {zoomEvent && zoomEvent.image_path && (
        <ImageZoomModal
          imageUrl={zoomEvent.image_path}
          title={`Deteksi Gerakan (${zoomEvent.pir_mode === 'ON' ? 'Bahaya' : 'Aktivitas'})`}
          subtitle={`${new Date(zoomEvent.created_at).toLocaleString('id-ID')} WIB · ${zoomEvent.device_id}`}
          onClose={() => setZoomEvent(null)}
        />
      )}
    </div>
  );
};
