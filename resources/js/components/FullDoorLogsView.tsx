import React, { useState } from 'react';
import { 
  DoorClosed, 
  Search, 
  Filter, 
  Download, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ScanFace,
  Calendar,
  Maximize2
} from 'lucide-react';
import { AccessLog } from '../types';
import { PersonnelDrilldownModal } from './PersonnelDrilldownModal';
import { useTheme } from '../context/ThemeContext';

interface FullDoorLogsViewProps {
  logs: AccessLog[];
}

export const FullDoorLogsView: React.FC<FullDoorLogsViewProps> = ({ logs }) => {
  const { isDark } = useTheme();
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'DITERIMA' | 'DITOLAK'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<AccessLog | null>(null);

  const filteredLogs = logs.filter(log => {
    const matchesStatus = filterStatus === 'ALL' || log.status === filterStatus;
    const matchesSearch = log.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          log.nrp.includes(searchQuery) ||
                          log.pintu.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          log.keterangan.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleExportCSV = () => {
    const headers = "ID,Waktu,Nama,Pangkat,NRP,Kesatuan,Status,SkorBiometrik,Pintu,Keterangan\n";
    const csvContent = "data:text/csv;charset=utf-8," + headers + logs.map(l => 
      `"${l.id}","${l.waktu}","${l.nama}","${l.pangkat}","${l.nrp}","${l.kesatuan}","${l.status}","${l.biometricScore}%","${l.pintu}","${l.keterangan}"`
    ).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `LOG-AKSES-BENGPUSKOMLEKAD-${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="view-log-pintu-lengkap" className="space-y-6">
      {/* Header */}
      <div className={`rounded-xl border p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-xs uppercase tracking-wider font-semibold ${
              isDark ? 'text-emerald-400' : 'text-emerald-700'
            }`}>
              Arsip & Telemetri Akses Pintu
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
              isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-300'
            }`}>
              {logs.length} Catatan Masuk
            </span>
          </div>
          <h2 className={`text-2xl font-tactical font-bold mt-1 ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
            Log Pintu Utama & Riwayat Akses Biometrik
          </h2>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Rekam jejak setiap personel atau pihak luar yang mencoba membuka pintu baja interlock gudang amunisi & senjata.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className={`px-4 py-2.5 rounded-lg border text-xs font-bold font-mono transition-all shadow-md flex items-center justify-center gap-2 shrink-0 cursor-pointer ${
            isDark 
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700' 
              : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
          }`}
        >
          <Download className="w-4 h-4 text-emerald-500" />
          <span>Ekspor Laporan (.CSV)</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari log berdasarkan nama, NRP, keterangan, atau lokasi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2.5 rounded-lg border text-xs font-mono focus:outline-none focus:border-emerald-500 transition ${
              isDark 
                ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500' 
                : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
            }`}
          />
        </div>

        {/* Status Filters */}
        <div className={`flex items-center gap-1.5 p-1 rounded-lg border text-xs font-mono w-full sm:w-auto ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              filterStatus === 'ALL' 
                ? isDark ? 'bg-slate-800 text-white font-bold' : 'bg-slate-200 text-slate-900 font-bold' 
                : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua ({logs.length})
          </button>
          <button
            onClick={() => setFilterStatus('DITERIMA')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              filterStatus === 'DITERIMA' 
                ? isDark ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50 font-bold' : 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold' 
                : isDark ? 'text-slate-400 hover:text-emerald-400' : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            Diterima
          </button>
          <button
            onClick={() => setFilterStatus('DITOLAK')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              filterStatus === 'DITOLAK' 
                ? isDark ? 'bg-red-950 text-red-300 border border-red-500/50 font-bold' : 'bg-red-100 text-red-800 border border-red-300 font-bold' 
                : isDark ? 'text-slate-400 hover:text-red-400' : 'text-slate-600 hover:text-red-700'
            }`}
          >
            Ditolak
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className={`rounded-xl border overflow-hidden shadow-xl ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`border-b text-[11px] font-mono uppercase tracking-wider ${
                isDark ? 'border-slate-800 bg-slate-950/80 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
              }`}>
                <th className="py-3.5 px-6">ID & Waktu</th>
                <th className="py-3.5 px-4">Foto Wajah</th>
                <th className="py-3.5 px-4">Nama Personel & Pangkat</th>
                <th className="py-3.5 px-4">Ruang Akses</th>
                <th className="py-3.5 px-4">Hasil Biometrik</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Detail</th>
              </tr>
            </thead>
            <tbody className={`divide-y text-xs font-mono ${
              isDark ? 'divide-slate-800/60' : 'divide-slate-200'
            }`}>
              {filteredLogs.map((log) => {
                const isSuccess = log.status === 'DITERIMA';
                return (
                  <tr 
                    key={log.id} 
                    onClick={() => setSelectedLog(log)}
                    className={`cursor-pointer transition-colors group ${
                      isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3.5 px-6 whitespace-nowrap">
                      <div className={`font-bold transition-colors ${
                        isDark ? 'text-white group-hover:text-emerald-400' : 'text-slate-900 group-hover:text-emerald-700'
                      }`}>
                        {log.waktu}
                      </div>
                      <div className="text-[10px] text-slate-500">{log.id}</div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className={`w-10 h-10 rounded overflow-hidden border ${
                        isDark ? 'border-slate-700 bg-slate-950' : 'border-slate-300 bg-slate-100'
                      }`}>
                        <img 
                          src={log.foto} 
                          alt={log.nama}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className={`font-sans font-semibold text-sm transition-colors ${
                        isDark ? 'text-white group-hover:text-emerald-300' : 'text-slate-900 group-hover:text-emerald-700'
                      }`}>
                        {log.nama}
                      </div>
                      <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        NRP: {log.nrp} • {log.kesatuan}
                      </div>
                    </td>

                    <td className={`py-3.5 px-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      <div>{log.pintu}</div>
                      <div className="text-[10px] text-slate-500">{log.ruangAkses}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold ${
                          isSuccess 
                            ? isDark ? 'text-emerald-400' : 'text-emerald-700' 
                            : isDark ? 'text-red-400' : 'text-red-600'
                        }`}>
                          {log.biometricScore}% Match
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[200px]">
                        {log.keterangan}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {isSuccess ? (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold border ${
                          isDark ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Diterima
                        </span>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold border ${
                          isDark ? 'bg-red-500/20 text-red-400 border-red-500/40' : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          <XCircle className="w-3.5 h-3.5" />
                          Ditolak
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        className={`p-1.5 rounded transition-colors cursor-pointer border ${
                          isDark 
                            ? 'bg-slate-800 group-hover:bg-slate-700 text-slate-400 group-hover:text-emerald-400 border-slate-700' 
                            : 'bg-slate-100 group-hover:bg-slate-200 text-slate-600 group-hover:text-emerald-700 border-slate-300'
                        }`}
                        title="Lihat Detail Biometrik"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drill-Down Biometric Modal */}
      {selectedLog && (
        <PersonnelDrilldownModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
};
