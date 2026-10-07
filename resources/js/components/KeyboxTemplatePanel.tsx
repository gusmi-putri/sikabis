/**
 * SI-JAGA — KeyboxTemplatePanel.tsx
 * Pemeriksaan template sidik jari di sensor Board A. Menandai ID yang
 * masih tersimpan di sensor tapi tidak punya pemilik aktif di tabel
 * personel, lalu memungkinkan admin menghapusnya. Hanya Admin PAM.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Fingerprint, RefreshCw, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { APIService, KeyboxTemplateState, apiErrorMessage } from '../services/api';

const TUNGGU_PINDAI_MS = 60000;
const INTERVAL_CEK_MS = 1500;

export const KeyboxTemplatePanel: React.FC = () => {
  const { isDark } = useTheme();
  const { toast } = useToast();
  const [state, setState] = useState<KeyboxTemplateState | null>(null);
  const [scanning, setScanning] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scanStartedRef = useRef<number>(0);
  const scannedAtBeforeRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      setState(await APIService.getKeyboxTemplates());
      setError(null);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!scanning) return;
    const timer = setInterval(async () => {
      try {
        const next = await APIService.getKeyboxTemplates();
        setState(next);
        if (next.scanned_at !== scannedAtBeforeRef.current) {
          setScanning(false);
          toast(`Pindai selesai: ${next.sensor_ids.length} template terisi di sensor.`, 'success');
        } else if (Date.now() - scanStartedRef.current > TUNGGU_PINDAI_MS) {
          setScanning(false);
          toast('Board A belum melapor. Pastikan alat online lalu coba lagi.', 'warning');
        }
      } catch {
        // Abaikan error sesaat saat polling
      }
    }, INTERVAL_CEK_MS);
    return () => clearInterval(timer);
  }, [scanning, toast]);

  const handleScan = async () => {
    scannedAtBeforeRef.current = state?.scanned_at ?? null;
    scanStartedRef.current = Date.now();
    try {
      await APIService.scanKeyboxTemplates();
      setScanning(true);
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
    }
  };

  const handleDelete = async (id: number) => {
    setBusyId(id);
    try {
      await APIService.deleteKeyboxTemplate(id);
      setState((prev) => prev && {
        ...prev,
        sensor_ids: prev.sensor_ids.filter((x) => x !== id),
        orphan_ids: prev.orphan_ids.filter((x) => x !== id),
      });
      toast(`Perintah hapus ID ${id} dikirim ke alat.`, 'success');
    } catch (err) {
      toast(apiErrorMessage(err), 'error');
    } finally {
      setBusyId(null);
      setConfirmId(null);
    }
  };

  const cardClass = isDark ? 'bg-white/5 backdrop-blur-md border-white/10' : 'bg-white border-slate-200';
  const mutedClass = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`rounded-2xl border shadow-lg overflow-hidden ${cardClass}`}>
      <div className="p-5 border-b border-white/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg border bg-cyan-500/20 border-cyan-500/30 text-cyan-400">
            <Fingerprint className="w-5 h-5" />
          </div>
          <div>
            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Template di Sensor</h3>
            <p className={`text-[11px] font-mono mt-0.5 ${mutedClass}`}>
              {state?.scanned_at
                ? `Terakhir dipindai ${new Date(state.scanned_at).toLocaleString('id-ID')}`
                : 'Belum pernah dipindai'}
            </p>
          </div>
        </div>
        <button
          onClick={handleScan}
          disabled={scanning}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-700 text-white disabled:opacity-60"
        >
          {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {scanning ? 'Memindai...' : 'Pindai sensor'}
        </button>
      </div>

      <div className="p-5 space-y-3">
        {error && <p className="text-xs text-red-400">{error}</p>}

        {state && (
          <p className={`text-xs font-mono ${mutedClass}`}>
            {state.sensor_ids.length} template di sensor · {state.orphan_ids.length} tanpa pemilik aktif
          </p>
        )}

        {state && state.orphan_ids.length > 0 && (
          <div className={`rounded-lg border p-3 space-y-2 ${isDark ? 'border-amber-500/30 bg-amber-500/10' : 'border-amber-300 bg-amber-50'}`}>
            <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-500">
              <AlertTriangle className="w-3.5 h-3.5" />
              Template ini bisa membuka kotak tapi tidak punya pemilik:
            </p>
            {state.orphan_ids.map((id) => (
              <div key={id} className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono">ID {id}</span>
                {confirmId === id ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(id)}
                      disabled={busyId === id}
                      className="px-2.5 py-1 rounded text-[11px] font-semibold bg-red-600 hover:bg-red-700 text-white disabled:opacity-60"
                    >
                      {busyId === id ? 'Mengirim...' : 'Ya, hapus'}
                    </button>
                    <button
                      onClick={() => setConfirmId(null)}
                      className={`px-2.5 py-1 rounded text-[11px] border ${isDark ? 'border-white/10' : 'border-slate-300'}`}
                    >
                      Batal
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmId(id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold text-red-400 border border-red-500/40 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-3 h-3" />
                    Hapus dari sensor
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
