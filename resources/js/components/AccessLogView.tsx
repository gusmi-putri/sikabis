/**
 * SI-JAGA — AccessLogView.tsx
 * Halaman penuh riwayat akses fingerprint key box dengan pagination sederhana.
 * Menggantikan FullDoorLogsView yang lama.
 */

import React, { useState } from 'react';
import { KeyRound, Search, ChevronLeft, ChevronRight, ImageOff, CameraOff } from 'lucide-react';
import { AccessLog, AccessPhoto, Personnel } from '../types';
import { useTheme } from '../context/ThemeContext';
import { ImageZoomModal } from './ImageZoomModal';
import { AccessLogMeta, MissingLogsRow, resolveDisplayName } from './AccessLogDetail';

interface AccessLogViewProps {
  logs: AccessLog[];
  personnelList: Personnel[];
  unpairedPhotos: AccessPhoto[];
}

interface ZoomTarget {
  imageUrl: string;
  title: string;
  subtitle: string;
}

export const AccessLogView: React.FC<AccessLogViewProps> = ({ logs, personnelList, unpairedPhotos }) => {
  const { isDark } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomTarget, setZoomTarget] = useState<ZoomTarget | null>(null);

  const openLogPhoto = (log: AccessLog) => {
    if (!log.image_path) return;
    setZoomTarget({
      imageUrl: log.image_path,
      title: resolveDisplayName(log, personnelList),
      subtitle: `${new Date(log.created_at).toLocaleString('id-ID')} · ID finger: ${log.fingerprint_id ?? '-'}`,
    });
  };

  const itemsPerPage = 10;

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    const name = resolveDisplayName(log, personnelList).toLowerCase();
    const idStr = log.fingerprint_id?.toString() ?? '';
    const search = searchTerm.toLowerCase();
    return name.includes(search) || idStr.includes(search);
  });

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border shadow-lg bg-white/5 backdrop-blur-md border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg border bg-emerald-500/20 border-emerald-500/30 text-emerald-400">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-tactical tracking-wide text-white">
              Access Log Key Box
            </h2>
            <p className="text-xs font-mono mt-0.5 text-slate-400">
              Riwayat lengkap akses fingerprint ke key box pos jaga
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama atau ID finger..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-colors bg-black/20 border-white/10 text-slate-200 placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Tabel */}
      <div className="rounded-2xl border shadow-lg overflow-hidden bg-white/5 backdrop-blur-md border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[11px] font-mono border-b border-white/10 text-slate-400 bg-black/20">
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Foto</th>
                <th className="py-3 px-4">Personel</th>
                <th className="py-3 px-4">Device ID</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm divide-white/5">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-sm font-mono text-slate-500">
                    Tidak ada log akses ditemukan.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  const isSuccess = log.result === 'success';
                  const displayName = resolveDisplayName(log, personnelList);
                  return (
                    <React.Fragment key={log.id}>
                    <tr className="transition-colors hover:bg-white/10">
                      {/* Waktu */}
                      <td className="py-3 px-4 font-mono whitespace-nowrap text-slate-300">
                        {new Date(log.created_at).toLocaleString('id-ID')} WIB
                      </td>

                      {/* Foto */}
                      <td className="py-3 px-4">
                        {log.image_path ? (
                          <button
                            onClick={() => openLogPhoto(log)}
                            className={`w-10 h-10 rounded border overflow-hidden cursor-pointer hover:opacity-90 transition-opacity ${
                              isSuccess ? 'border-emerald-500/40' : 'border-red-500/40'
                            }`}
                          >
                            <img src={log.image_path} alt="Foto scan" className="w-full h-full object-cover" />
                          </button>
                        ) : (
                          <div className="w-10 h-10 rounded border flex items-center justify-center bg-white/5 border-white/10 text-slate-500">
                            <ImageOff className="w-4 h-4" />
                          </div>
                        )}
                      </td>

                      {/* Personel */}
                      <td className="py-3 px-4 font-semibold text-slate-200">
                        {displayName}
                        <AccessLogMeta log={log} isDark={isDark} />
                      </td>

                      {/* Device */}
                      <td className="py-3 px-4 font-mono text-xs text-slate-400">
                        {log.device_id}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded text-xs font-semibold border ${
                          isSuccess
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                            : 'bg-red-500/20 text-red-400 border-red-500/50'
                        }`}>
                          {isSuccess ? 'Berhasil' : 'Gagal'}
                        </span>
                      </td>
                    </tr>
                    <MissingLogsRow log={log} colSpan={5} isDark={isDark} />
                    </React.Fragment>
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

      {/* Foto kamera key box yang tidak punya pasangan log */}
      {unpairedPhotos.length > 0 && (
        <div className="rounded-2xl border shadow-lg p-5 bg-amber-500/5 backdrop-blur-md border-amber-500/30">
          <div className="flex items-center gap-2 mb-1">
            <CameraOff className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-amber-300">
              Foto Tanpa Log ({unpairedPhotos.length})
            </h3>
          </div>
          <p className="text-[11px] font-mono mb-4 text-slate-400">
            Kamera memotret percobaan akses, tetapi log sidik jarinya tidak pernah sampai ke server.
          </p>
          <div className="flex flex-wrap gap-3">
            {unpairedPhotos.map((photo) => (
              <button
                key={photo.id}
                onClick={() => setZoomTarget({
                  imageUrl: photo.image_path,
                  title: 'Foto tanpa log',
                  subtitle: `${new Date(photo.created_at).toLocaleString('id-ID')} · pemicu #${photo.trigger_number}`,
                })}
                className="text-left cursor-pointer hover:opacity-90 transition-opacity"
              >
                <img
                  src={photo.image_path}
                  alt={`Pemicu #${photo.trigger_number}`}
                  className="w-24 h-18 rounded border object-cover border-amber-500/40"
                />
                <div className="text-[10px] font-mono mt-1 text-slate-400">
                  {new Date(photo.created_at).toLocaleString('id-ID')}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Modal zoom foto */}
      {zoomTarget && (
        <ImageZoomModal
          imageUrl={zoomTarget.imageUrl}
          title={zoomTarget.title}
          subtitle={zoomTarget.subtitle}
          onClose={() => setZoomTarget(null)}
        />
      )}
    </div>
  );
};
