/**
 * SI-JAGA — PirModeLogPanel.tsx
 * Riwayat nyala/mati sensor PIR, dari web (Admin PAM) maupun Telegram,
 * supaya operator/admin bisa memantau kapan & oleh siapa diubah.
 */

import React from 'react';
import { History, Globe, Send } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { PirModeLog } from '../types';

interface PirModeLogPanelProps {
  logs: PirModeLog[];
}

function waktuLengkap(isoStr: string): string {
  return new Date(isoStr).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }) + ' WIB';
}

export const PirModeLogPanel: React.FC<PirModeLogPanelProps> = ({ logs }) => {
  const { isDark } = useTheme();

  return (
    <div
      id="panel-pir-mode-log"
      className={`rounded-2xl border shadow-lg overflow-hidden backdrop-blur-md ${isDark ? 'bg-white/5 border-white/10' : 'bg-white/60 border-slate-200'}`}
    >
      <div className={`flex items-center gap-3 px-5 py-4 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
        <div className={`p-2 rounded-lg border ${isDark ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
          <History className="w-4 h-4" />
        </div>
        <div>
          <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Riwayat Nyala/Mati Sensor PIR
          </h3>
          <p className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Termasuk perubahan lewat Telegram
          </p>
        </div>
      </div>

      <div className="max-h-72 overflow-y-auto">
        {logs.length === 0 ? (
          <div className={`py-10 text-center text-xs font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Belum ada riwayat perubahan.
          </div>
        ) : (
          <ul className={`divide-y text-xs ${isDark ? 'divide-white/5' : 'divide-slate-200'}`}>
            {logs.map((log) => {
              const nyala = log.pir_mode === 'ON';
              return (
                <li key={log.id} className="flex items-center gap-3 px-5 py-3">
                  <span
                    className={`shrink-0 w-2 h-2 rounded-full ${
                      nyala ? 'bg-emerald-400' : 'bg-slate-400'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                      Sensor {nyala ? 'dinyalakan' : 'dimatikan'}
                      {log.changed_by ? ` oleh ${log.changed_by}` : ''}
                    </div>
                    <div className={`text-[10px] font-mono mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {waktuLengkap(log.created_at)}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono font-semibold border ${
                      log.source === 'web'
                        ? isDark ? 'bg-sky-500/20 text-sky-400 border-sky-500/50' : 'bg-sky-100 text-sky-700 border-sky-300'
                        : isDark ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' : 'bg-cyan-100 text-cyan-700 border-cyan-300'
                    }`}
                  >
                    {log.source === 'web' ? <Globe className="w-3 h-3" /> : <Send className="w-3 h-3" />}
                    {log.source === 'web' ? 'Web' : 'Telegram'}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
