/**
 * SI-JAGA — ActivityLogView.tsx
 * Log aktivitas operator (khusus Admin PAM): siapa melakukan apa dan kapan.
 * Memuat sendiri datanya dan menyegarkan tiap 10 detik selama tab terbuka.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Search } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { ActivityLogEntry } from '../types';
import { APIService } from '../services/api';

const REFRESH_MS = 10000;

function formatDetail(detail: ActivityLogEntry['detail']): string {
  if (!detail) return '';
  return Object.entries(detail)
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([key, value]) => {
      const text = typeof value === 'boolean' ? (value ? 'ya' : 'tidak') : String(value);
      return `${key.replace(/_/g, ' ')}: ${text}`;
    })
    .join(' · ');
}

export const ActivityLogView: React.FC = () => {
  const { isDark } = useTheme();
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await APIService.getActivityLogs();
        if (active) {
          setLogs(data);
          setError(null);
        }
      } catch {
        if (active) setError('Gagal memuat log aktivitas.');
      } finally {
        if (active) setLoaded(true);
      }
    };
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return logs;
    return logs.filter((log) =>
      [log.user_name, log.label, log.target, log.ip_address, formatDetail(log.detail)]
        .some((field) => field?.toLowerCase().includes(term))
    );
  }, [logs, search]);

  const muted = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div id="view-log-aktivitas" className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg border bg-sky-500/20 border-sky-500/30 text-sky-400">
          <ClipboardList className="w-5 h-5" />
        </div>
        <div>
          <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Log Aktivitas</h2>
          <p className={`text-xs font-mono mt-0.5 ${muted}`}>
            Jejak tindakan operator: login, kelola personel dan akun, kontrol perangkat
          </p>
        </div>
      </div>

      <div className={`rounded-2xl border shadow-lg overflow-hidden backdrop-blur-md ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
        <div className={`p-4 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
          <div className="relative max-w-sm">
            <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${muted}`} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari pelaku, tindakan, sasaran, atau IP..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40 bg-black/20 border-white/10 text-slate-200 placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`text-[11px] font-mono border-b ${isDark ? 'border-white/10 text-slate-400 bg-black/20' : 'border-slate-200 text-slate-600 bg-slate-50'}`}>
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Pelaku</th>
                <th className="py-3 px-4">Tindakan</th>
                <th className="py-3 px-4">Sasaran</th>
                <th className="py-3 px-4">Detail</th>
                <th className="py-3 px-4">IP</th>
              </tr>
            </thead>
            <tbody className={`divide-y text-xs ${isDark ? 'divide-white/5 text-slate-300' : 'divide-slate-200 text-slate-700'}`}>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className={`py-10 text-center font-mono ${muted}`}>
                    {error ?? (!loaded ? 'Memuat...' : search ? 'Tidak ada yang cocok.' : 'Belum ada aktivitas tercatat.')}
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id} className={isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'}>
                    <td className="py-2.5 px-4 font-mono whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('id-ID', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 px-4">{log.user_name ?? <span className={muted}>—</span>}</td>
                    <td className={`py-2.5 px-4 font-semibold ${log.action === 'auth.login_failed' ? 'text-red-400' : ''}`}>
                      {log.label}
                    </td>
                    <td className="py-2.5 px-4 font-mono">{log.target ?? ''}</td>
                    <td className={`py-2.5 px-4 font-mono ${muted}`}>{formatDetail(log.detail)}</td>
                    <td className={`py-2.5 px-4 font-mono ${muted}`}>{log.ip_address ?? ''}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
