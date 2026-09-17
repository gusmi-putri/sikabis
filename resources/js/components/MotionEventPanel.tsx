/**
 * SI-JAGA — MotionEventPanel.tsx
 * Panel "Motion Event Terbaru" untuk dashboard (5 event terakhir).
 * Kolom: Waktu | Foto | Mode PIR saat event terjadi
 */

import React, { useState } from 'react';
import { Radio, ImageOff, X, Camera } from 'lucide-react';
import { MotionEvent } from '../types';
import { useTheme } from '../context/ThemeContext';

interface MotionEventPanelProps {
  events: MotionEvent[];
}

function timeAgo(isoStr: string): string {
  const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
  if (diff < 60) return `${diff} dtk lalu`;
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
  return new Date(isoStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
}

export const MotionEventPanel: React.FC<MotionEventPanelProps> = ({ events }) => {
  const { isDark } = useTheme();
  const [zoomEvent, setZoomEvent] = useState<MotionEvent | null>(null);

  return (
    <div
      id="panel-motion-event-terbaru"
      className={`rounded-lg border shadow-sm overflow-hidden ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg border ${isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Motion Event Terbaru
            </h3>
            <p className={`text-[11px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              5 deteksi PIR terakhir
            </p>
          </div>
        </div>
        <span className={`text-[11px] font-mono px-2 py-1 rounded border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
          ESP32-GUDANG-01
        </span>
      </div>

      {/* Tabel */}
      <div className="overflow-x-auto">
        <table id="tabel-motion-event" className="w-full text-left border-collapse">
          <thead>
            <tr className={`text-[11px] font-mono border-b ${isDark ? 'border-slate-800 text-slate-500 bg-slate-950/40' : 'border-slate-200 text-slate-500 bg-slate-50'}`}>
              <th className="py-2.5 px-4">Waktu</th>
              <th className="py-2.5 px-4">Foto</th>
              <th className="py-2.5 px-4">Mode PIR</th>
            </tr>
          </thead>
          <tbody className={`divide-y text-xs ${isDark ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
            {events.length === 0 ? (
              <tr>
                <td colSpan={3} className={`py-8 text-center text-xs font-mono ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                  Belum ada motion event
                </td>
              </tr>
            ) : (
              events.map((event) => {
                const isArmed = event.pir_mode === 'ARMED';
                return (
                  <tr
                    key={event.id}
                    id={`motion-row-${event.id}`}
                    className={`transition-colors ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}`}
                  >
                    {/* Waktu */}
                    <td className={`py-3 px-4 font-mono whitespace-nowrap ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      <div className="text-xs font-semibold">
                        {new Date(event.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                      <div className={`text-[10px] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                        {timeAgo(event.created_at)}
                      </div>
                    </td>

                    {/* Foto */}
                    <td className="py-3 px-4">
                      {event.image_path ? (
                        <button
                          onClick={() => setZoomEvent(event)}
                          className={`w-12 h-10 rounded border overflow-hidden cursor-pointer hover:opacity-90 transition-opacity ${isArmed ? 'border-amber-500/40' : 'border-slate-500/30'}`}
                          title="Klik untuk lihat penuh"
                        >
                          <img
                            src={event.image_path}
                            alt="Foto motion"
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ) : (
                        <div className={`w-12 h-10 rounded border flex items-center justify-center text-[9px] font-mono gap-1 flex-col ${isDark ? 'bg-slate-800 border-slate-700 text-slate-600' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                          <ImageOff className="w-3 h-3" />
                        </div>
                      )}
                    </td>

                    {/* Mode PIR */}
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono font-semibold border ${
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

      {/* Modal zoom foto */}
      {zoomEvent && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setZoomEvent(null)}
        >
          <div
            className={`rounded-xl border max-w-lg w-full p-4 shadow-2xl ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between mb-3 pb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div>
                <div className="flex items-center gap-2">
                  <Camera className="w-3.5 h-3.5 text-amber-500" />
                  <span className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    Foto Motion Event
                  </span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    zoomEvent.pir_mode === 'ARMED'
                      ? isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'
                      : isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {zoomEvent.pir_mode === 'ARMED' ? 'NYALA' : 'MATI'}
                  </span>
                </div>
                <div className={`text-[10px] font-mono mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                  {new Date(zoomEvent.created_at).toLocaleString('id-ID')} · {zoomEvent.device_id}
                </div>
              </div>
              <button onClick={() => setZoomEvent(null)} className={`p-1.5 rounded-lg cursor-pointer ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                <X className="w-4 h-4" />
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
