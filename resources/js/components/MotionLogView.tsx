/**
 * SI-JAGA — MotionLogView.tsx
 * Halaman penuh riwayat deteksi gerakan (Motion Event) gudang.
 * Termasuk panel live camera ESP32 dan pagination tabel event.
 * Menggantikan BunkerAlertsView yang lama.
 */

import React, { useState } from 'react';
import { Radio, Search, ChevronLeft, ChevronRight, ImageOff, X, Camera } from 'lucide-react';
import { MotionEvent } from '../types';
import { useTheme } from '../context/ThemeContext';
import { LiveCameraPanel } from './LiveCameraPanel';

interface MotionLogViewProps {
  events: MotionEvent[];
}

export const MotionLogView: React.FC<MotionLogViewProps> = ({ events }) => {
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
      <LiveCameraPanel />

      {/* 2. Header & Filter Log */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-lg border shadow-sm ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg border ${
            isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-amber-50 border-amber-300 text-amber-700'
          }`}>
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`text-lg font-bold font-tactical tracking-wide ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Motion Log Gudang
            </h2>
            <p className={`text-xs font-mono mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              Riwayat deteksi sensor gerak (PIR) dan jepretan otomatis
            </p>
          </div>
        </div>

        {/* Filter Mode */}
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-mono font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Filter Mode:
          </span>
          <select
            value={filterMode}
            onChange={(e) => {
              setFilterMode(e.target.value);
              setCurrentPage(1);
            }}
            className={`px-3 py-2 rounded-lg border text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-colors ${
              isDark 
                ? 'bg-slate-950 border-slate-700 text-slate-200' 
                : 'bg-slate-50 border-slate-300 text-slate-800'
            }`}
          >
            <option value="ALL">Semua Status</option>
            <option value="ARMED">Saat Sensor Nyala</option>
            <option value="ACTIVITY">Saat Sensor Mati</option>
          </select>
        </div>
      </div>

      {/* 3. Tabel Log */}
      <div className={`rounded-lg border shadow-sm overflow-hidden ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`text-[11px] font-mono border-b ${
                isDark ? 'border-slate-800 text-slate-400 bg-slate-950/40' : 'border-slate-200 text-slate-600 bg-slate-50'
              }`}>
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Foto Dokumentasi</th>
                <th className="py-3 px-4">Device ID</th>
                <th className="py-3 px-4 text-center">Status Sensor</th>
              </tr>
            </thead>
            <tbody className={`divide-y text-sm ${isDark ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
              {paginatedEvents.length === 0 ? (
                <tr>
                  <td colSpan={4} className={`py-12 text-center text-sm font-mono ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                    Tidak ada motion event ditemukan.
                  </td>
                </tr>
              ) : (
                paginatedEvents.map((event) => {
                  const isArmed = event.pir_mode === 'ARMED';
                  return (
                    <tr key={event.id} className={`transition-colors ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}`}>
                      {/* Waktu */}
                      <td className={`py-3 px-4 font-mono whitespace-nowrap ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
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
                          <div className={`w-16 h-10 rounded border flex items-center justify-center ${
                            isDark ? 'bg-slate-800 border-slate-700 text-slate-600' : 'bg-slate-100 border-slate-200 text-slate-400'
                          }`}>
                            <ImageOff className="w-4 h-4" />
                          </div>
                        )}
                      </td>

                      {/* Device */}
                      <td className={`py-3 px-4 font-mono text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {event.device_id}
                      </td>

                      {/* Mode PIR */}
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold font-mono border ${
                          isArmed
                            ? isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200'
                            : isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200'
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
          <div className={`flex items-center justify-between px-4 py-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <span className={`text-xs font-mono ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              Halaman {currentPage} dari {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`p-1.5 rounded border transition-colors ${
                  currentPage === 1
                    ? isDark ? 'bg-slate-900 border-slate-800 text-slate-700 cursor-not-allowed' : 'bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed'
                    : isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={`p-1.5 rounded border transition-colors ${
                  currentPage === totalPages
                    ? isDark ? 'bg-slate-900 border-slate-800 text-slate-700 cursor-not-allowed' : 'bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed'
                    : isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Modal Zoom Foto */}
      {zoomEvent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setZoomEvent(null)}>
          <div className={`rounded-xl border max-w-lg w-full p-4 shadow-2xl ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`} onClick={e => e.stopPropagation()}>
            <div className={`flex items-center justify-between mb-3 pb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div>
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-amber-500" />
                  <div className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    Foto Dokumentasi PIR
                  </div>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    zoomEvent.pir_mode === 'ARMED'
                      ? isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'
                      : isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {zoomEvent.pir_mode === 'ARMED' ? 'NYALA' : 'MATI'}
                  </span>
                </div>
                <div className={`text-xs font-mono mt-1 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                  {new Date(zoomEvent.created_at).toLocaleString('id-ID')} · {zoomEvent.device_id}
                </div>
              </div>
              <button onClick={() => setZoomEvent(null)} className={`p-1.5 rounded-lg cursor-pointer ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className={`rounded-lg overflow-hidden border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <img src={zoomEvent.image_path!} alt="Foto motion" className="w-full object-cover" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
