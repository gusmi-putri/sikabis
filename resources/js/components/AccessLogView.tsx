/**
 * SI-JAGA — AccessLogView.tsx
 * Halaman penuh riwayat akses fingerprint key box dengan pagination sederhana.
 * Menggantikan FullDoorLogsView yang lama.
 */

import React, { useState } from 'react';
import { KeyRound, Search, ChevronLeft, ChevronRight, ImageOff, X } from 'lucide-react';
import { AccessLog, Personnel } from '../types';
import { useTheme } from '../context/ThemeContext';

interface AccessLogViewProps {
  logs: AccessLog[];
  personnelList: Personnel[];
}

function resolveDisplayName(log: AccessLog, personnelList: Personnel[]): string {
  if (log.personnel_name) return log.personnel_name;
  const found = personnelList.find((p) => p.fingerprint_id === log.fingerprint_id);
  return found ? found.name : `Fingerprint #${log.fingerprint_id}`;
}

export const AccessLogView: React.FC<AccessLogViewProps> = ({ logs, personnelList }) => {
  const { isDark } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomPhoto, setZoomPhoto] = useState<AccessLog | null>(null);

  const itemsPerPage = 10;

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    const name = resolveDisplayName(log, personnelList).toLowerCase();
    const idStr = log.fingerprint_id.toString();
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
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-lg border shadow-sm ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg border ${
            isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-300 text-emerald-700'
          }`}>
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`text-lg font-bold font-tactical tracking-wide ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Access Log Key Box
            </h2>
            <p className={`text-xs font-mono mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              Riwayat lengkap akses fingerprint ke key box pos jaga
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
          <input
            type="text"
            placeholder="Cari nama atau ID finger..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className={`w-full pl-9 pr-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-colors ${
              isDark 
                ? 'bg-slate-950 border-slate-700 text-slate-200 placeholder:text-slate-600' 
                : 'bg-slate-50 border-slate-300 text-slate-800 placeholder:text-slate-400'
            }`}
          />
        </div>
      </div>

      {/* Tabel */}
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
                <th className="py-3 px-4">Foto</th>
                <th className="py-3 px-4">Personel</th>
                <th className="py-3 px-4">Device ID</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className={`divide-y text-sm ${isDark ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className={`py-12 text-center text-sm font-mono ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                    Tidak ada log akses ditemukan.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  const isSuccess = log.result === 'success';
                  const displayName = resolveDisplayName(log, personnelList);
                  return (
                    <tr key={log.id} className={`transition-colors ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}`}>
                      {/* Waktu */}
                      <td className={`py-3 px-4 font-mono whitespace-nowrap ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {new Date(log.created_at).toLocaleString('id-ID')} WIB
                      </td>

                      {/* Foto */}
                      <td className="py-3 px-4">
                        {log.image_path ? (
                          <button
                            onClick={() => setZoomPhoto(log)}
                            className={`w-10 h-10 rounded border overflow-hidden cursor-pointer hover:opacity-90 transition-opacity ${
                              isSuccess ? 'border-emerald-500/40' : 'border-red-500/40'
                            }`}
                          >
                            <img src={log.image_path} alt="Foto scan" className="w-full h-full object-cover" />
                          </button>
                        ) : (
                          <div className={`w-10 h-10 rounded border flex items-center justify-center ${
                            isDark ? 'bg-slate-800 border-slate-700 text-slate-600' : 'bg-slate-100 border-slate-200 text-slate-400'
                          }`}>
                            <ImageOff className="w-4 h-4" />
                          </div>
                        )}
                      </td>

                      {/* Personel */}
                      <td className={`py-3 px-4 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        {displayName}
                        <div className={`text-[10px] font-mono font-normal mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                          Finger ID: {log.fingerprint_id}
                        </div>
                      </td>

                      {/* Device */}
                      <td className={`py-3 px-4 font-mono text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {log.device_id}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded text-xs font-semibold border ${
                          isSuccess
                            ? isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isDark ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {isSuccess ? 'Berhasil' : 'Gagal'}
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

      {/* Modal Zoom */}
      {zoomPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setZoomPhoto(null)}>
          <div className={`rounded-xl border max-w-md w-full p-4 shadow-2xl ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`} onClick={e => e.stopPropagation()}>
            <div className={`flex items-center justify-between mb-3 pb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div>
                <div className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  {resolveDisplayName(zoomPhoto, personnelList)}
                </div>
                <div className={`text-xs font-mono mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                  {new Date(zoomPhoto.created_at).toLocaleString('id-ID')}
                </div>
              </div>
              <button onClick={() => setZoomPhoto(null)} className={`p-1.5 rounded-lg cursor-pointer ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className={`rounded-lg overflow-hidden border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <img src={zoomPhoto.image_path!} alt="Foto scan" className="w-full object-cover" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
