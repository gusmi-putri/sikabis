/**
 * SI-JAGA — LiveAccessTable.tsx
 * Tabel "Akses Key Box Terbaru" untuk dashboard (5 baris terakhir).
 * Kolom: Waktu | Foto | Personel | Status
 *
 * Penting: nama personel di-resolve dari fingerprint_id.
 * Jika fingerprint_id tidak ketemu → tampilkan "Fingerprint #<id>",
 * jika null (percobaan gagal) → "Tidak dikenal".
 */

import React, { useState } from 'react';
import { CheckCircle2, XCircle, KeyRound, ImageOff } from 'lucide-react';
import { AccessLog, Personnel } from '../types';
import { useTheme } from '../context/ThemeContext';
import { ImageZoomModal } from './ImageZoomModal';
import { AccessLogMeta, MissingLogsRow, resolveDisplayName } from './AccessLogDetail';

interface LiveAccessTableProps {
  logs: AccessLog[];
  personnelList: Personnel[];
}

function timeAgo(isoStr: string): string {
  const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
  if (diff < 60) return `${diff} dtk lalu`;
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
  return new Date(isoStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
}

export const LiveAccessTable: React.FC<LiveAccessTableProps> = ({ logs, personnelList }) => {
  const { isDark } = useTheme();
  const [zoomPhoto, setZoomPhoto] = useState<AccessLog | null>(null);

  return (
    <div
      id="tabel-akses-keybox-terbaru"
      className={`rounded-2xl border shadow-lg overflow-hidden backdrop-blur-md ${isDark ? 'bg-white/5 border-white/10' : 'bg-white/60 border-slate-200'}`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg border bg-emerald-500/20 border-emerald-500/30 text-emerald-400">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Akses Key Box Terbaru
            </h3>
            <p className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              5 scan fingerprint terakhir
            </p>
          </div>
        </div>
        <span className={`text-[11px] font-mono px-2 py-1 rounded border ${isDark ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
          kotak-kunci-01
        </span>
      </div>

      {/* Tabel */}
      <div className="overflow-x-auto">
        <table id="tabel-akses-keybox" className="w-full text-left border-collapse">
          <thead>
            <tr className={`text-[11px] font-mono border-b ${isDark ? 'border-white/10 text-slate-300 bg-white/5' : 'border-slate-200 text-slate-600 bg-slate-50'}`}>
              <th className="py-2.5 px-4">Waktu</th>
              <th className="py-2.5 px-4">Foto</th>
              <th className="py-2.5 px-4">Personel</th>
              <th className="py-2.5 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className={`divide-y text-xs ${isDark ? 'divide-white/5' : 'divide-slate-200'}`}>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-xs font-mono text-slate-500">
                  Belum ada data akses
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const isSuccess = log.result === 'success';
                const displayName = resolveDisplayName(log, personnelList);
                return (
                  <React.Fragment key={log.id}>
                  <tr
                    id={`access-row-${log.id}`}
                    className={`transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-50'}`}
                  >
                    {/* Waktu */}
                    <td className={`py-3 px-4 font-mono whitespace-nowrap ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      <div className="text-xs font-semibold">
                        {new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                      <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {timeAgo(log.created_at)}
                      </div>
                    </td>

                    {/* Foto */}
                    <td className="py-3 px-4">
                      {log.image_path ? (
                        <button
                          onClick={() => setZoomPhoto(log)}
                          className={`w-10 h-10 rounded border overflow-hidden cursor-pointer hover:opacity-90 transition-opacity ${isSuccess ? 'border-emerald-500/40' : 'border-red-500/40'
                            }`}
                          title="Klik untuk lihat penuh"
                        >
                          <img
                            src={log.image_path}
                            alt="Foto scan"
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ) : (
                        <div className={`w-10 h-10 rounded border flex items-center justify-center ${isDark ? 'bg-white/5 border-white/10 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
                          <ImageOff className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </td>

                    {/* Personel */}
                    <td className="py-3 px-4">
                      <div className={`text-xs font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        {displayName}
                      </div>
                      <AccessLogMeta log={log} isDark={isDark} />
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      {isSuccess ? (
                        <span
                          id={`badge-access-${log.id}`}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold border ${isDark ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-emerald-100 text-emerald-700 border-emerald-300'}`}
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Berhasil
                        </span>
                      ) : (
                        <span
                          id={`badge-access-${log.id}`}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold border ${isDark ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-red-100 text-red-700 border-red-300'}`}
                        >
                          <XCircle className="w-3 h-3" />
                          Gagal
                        </span>
                      )}
                    </td>
                  </tr>
                  <MissingLogsRow log={log} colSpan={4} isDark={isDark} />
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal zoom foto */}
      {zoomPhoto && zoomPhoto.image_path && (
        <ImageZoomModal
          imageUrl={zoomPhoto.image_path}
          title={resolveDisplayName(zoomPhoto, personnelList)}
          subtitle={`${new Date(zoomPhoto.created_at).toLocaleString('id-ID')} · ID finger: ${zoomPhoto.fingerprint_id ?? '-'}`}
          onClose={() => setZoomPhoto(null)}
        />
      )}
    </div>
  );
};
