/**
 * SI-JAGA — AccessLogDetail.tsx
 * Potongan tampilan bersama untuk baris log akses key box: nama yang
 * ditampilkan, alasan gagal dari firmware kotak kunci, dan penanda log
 * yang hilang di antara dua kejadian.
 */

import React from 'react';
import { AlertTriangle, BellRing, RotateCcw } from 'lucide-react';
import { AccessLog, AccessReason, Personnel } from '../types';

const REASON_LABELS: Record<AccessReason, string> = {
  cocok: 'Sidik jari cocok',
  tidak_cocok: 'Sidik jari tidak terdaftar',
  tidak_terbaca: 'Jari tidak terbaca',
  keyakinan_rendah: 'Skor kecocokan di bawah ambang',
};

export function resolveDisplayName(log: AccessLog, personnelList: Personnel[]): string {
  if (log.personnel_name) return log.personnel_name;
  if (log.fingerprint_id === null) return 'Tidak dikenal';
  const found = personnelList.find((p) => p.fingerprint_id === log.fingerprint_id);
  return found ? found.name : `Fingerprint #${log.fingerprint_id}`;
}

/** Baris keterangan di bawah nama: ID finger, alasan, skor, dan alarm. */
export const AccessLogMeta: React.FC<{ log: AccessLog; isDark: boolean }> = ({ log, isDark }) => (
  <div className={`text-[10px] font-mono font-normal mt-0.5 space-y-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
    <div>
      {log.fingerprint_id !== null ? `ID finger: ${log.fingerprint_id}` : 'ID finger: -'}
      {log.event_number != null && ` · kejadian #${log.event_number}`}
    </div>
    {log.reason && (
      <div className={log.result === 'success' ? '' : isDark ? 'text-red-400' : 'text-red-600'}>
        {REASON_LABELS[log.reason]}
        {log.confidence ? ` · skor ${log.confidence}` : ''}
        {log.result === 'failed' && log.failed_streak ? ` · gagal ke-${log.failed_streak}` : ''}
      </div>
    )}
    {log.alarm && (
      <div className={`inline-flex items-center gap-1 font-semibold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
        <BellRing className="w-3 h-3" /> Alarm berbunyi
      </div>
    )}
  </div>
);

/**
 * Baris peringatan di bawah log (daftar urut terbaru dulu), menandai log
 * yang tidak pernah sampai ke server sebelum kejadian ini. Log yang hilang
 * harus terlihat sebagai lubang, bukan sebagai ketiadaan.
 */
export const MissingLogsRow: React.FC<{ log: AccessLog; colSpan: number; isDark: boolean }> = ({ log, colSpan, isDark }) => {
  const missing = log.missing_before ?? 0;
  if (missing <= 0 && !log.device_restarted) return null;

  return (
    <tr className={isDark ? 'bg-amber-500/10' : 'bg-amber-50'}>
      <td colSpan={colSpan} className={`py-1.5 px-4 text-[11px] font-mono ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {log.device_restarted && (
            <span className="inline-flex items-center gap-1">
              <RotateCcw className="w-3 h-3" /> Perangkat {log.device_id} menyala ulang sebelum kejadian ini
            </span>
          )}
          {missing > 0 && (
            <span className="inline-flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {missing} log hilang sebelum kejadian #{log.event_number}
            </span>
          )}
        </div>
      </td>
    </tr>
  );
};
