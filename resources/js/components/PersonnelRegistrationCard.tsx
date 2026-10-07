/**
 * SI-JAGA — PersonnelRegistrationCard.tsx
 * Form pencatatan personel kotak kunci.
 * Sidik jari didaftarkan langsung di Board A lewat Serial Monitor
 * (perintah `D`, lalu ketik nomor ID 1-127). Form ini hanya mencatat
 * siapa pemilik nomor ID tersebut — perangkat pintu sengaja tidak
 * bisa diperintah dari jaringan.
 */

import React, { useState, useEffect } from 'react';
import { UserPlus, Fingerprint, Save, AlertTriangle, Loader2 } from 'lucide-react';
import { Personnel, PersonnelInput, DeviceStatus } from '../types';
import { APIService } from '../services/api';
import { apiErrorMessage } from '../services/api';

interface PersonnelRegistrationCardProps {
  personnelList: Personnel[];
  keyboxStatus: DeviceStatus[];
  onCreate: (data: PersonnelInput) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
}

const EMPTY_FORM = { name: '', rank_nrp: '', notes: '' };

export const PersonnelRegistrationCard: React.FC<PersonnelRegistrationCardProps> = ({
  personnelList: _personnelList,
  keyboxStatus,
  onCreate,
  onDirtyChange,
}) => {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState<string | null>(null);

  const isDirty = formData.name !== '' || formData.rank_nrp !== '' || formData.notes !== '';

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const boardA = keyboxStatus.find((d) => d.device_id === 'kotak-kunci-01') ?? null;
  
  useEffect(() => {
    if (boardA?.enroll_message) {
      setLiveMessage(boardA.enroll_message);
    }
  }, [boardA?.enroll_message]);

  const enrollMessage = liveMessage || boardA?.enroll_message;
  const isEnrolling = enrollMessage && !enrollMessage.startsWith('Berhasil') && !enrollMessage.startsWith('Gagal');

  useEffect(() => {
    if (!isEnrolling) return;
    
    const interval = setInterval(async () => {
      try {
        const statuses = await APIService.getKeyboxStatus();
        const a = statuses.find(s => s.device_id === 'kotak-kunci-01');
        if (a?.enroll_message) {
          setLiveMessage(a.enroll_message);
        }
      } catch (err) {
        // Abaikan error jaringan saat polling
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isEnrolling]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await onCreate({
        name: formData.name,
        rank_nrp: formData.rank_nrp || undefined,
        notes: formData.notes || undefined,
      });
      setLiveMessage('Menunggu pendaftaran sidik jari di alat...');
      setFormData(EMPTY_FORM);
      onDirtyChange?.(false);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 bg-black/20 border-white/10 text-slate-200';

  return (
    <div className="rounded-2xl border shadow-lg overflow-hidden bg-white/5 backdrop-blur-md border-white/10">
      <div className="p-5 border-b flex items-center gap-3 border-white/10">
        <div className="p-2.5 rounded-lg border bg-emerald-500/20 border-emerald-500/30 text-emerald-400">
          <UserPlus className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold font-tactical text-white">
            Registrasi Personel
          </h3>
          <p className="text-[11px] font-mono mt-0.5 text-slate-400">
            Catat pemilik ID sidik jari di kotak kunci
          </p>
        </div>
      </div>

      <div className="p-5">
        {enrollMessage ? (
          <div className={`mb-5 p-4 rounded-xl border flex flex-col items-center justify-center text-center gap-3 ${
            enrollMessage.startsWith('Berhasil')
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : enrollMessage.startsWith('Gagal')
              ? 'bg-red-500/10 border-red-500/30 text-red-400'
              : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
          }`}>
            {isEnrolling ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : enrollMessage.startsWith('Berhasil') ? (
              <Fingerprint className="w-8 h-8" />
            ) : (
              <AlertTriangle className="w-8 h-8" />
            )}
            <div>
              <p className="font-mono text-sm font-bold">{enrollMessage}</p>
              {isEnrolling && (
                <p className="text-[11px] mt-1 opacity-80 font-mono">
                  Perhatikan instruksi di atas dan lakukan pada sensor Kotak Kunci.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="mb-5 p-3 rounded-lg border flex gap-3 bg-white/5 border-white/10">
            <Fingerprint className="w-5 h-5 shrink-0 text-emerald-500" />
            <ol className="text-[10px] font-mono leading-relaxed text-slate-400 list-decimal pl-3 space-y-0.5">
              <li>Isi nama dan pangkat personel baru di form ini, lalu klik Simpan.</li>
              <li>Alat Kotak Kunci akan otomatis berbunyi dan masuk ke mode pendaftaran.</li>
              <li>Personel diminta menempelkan jari yang sama sebanyak dua kali ke sensor.</li>
            </ol>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-lg border flex gap-2 text-xs bg-red-500/10 border-red-500/30 text-red-300">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5 text-slate-400">
              Nama Lengkap <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              disabled={isEnrolling || isSubmitting}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Contoh: Budi Santoso"
              className={`${inputClass} disabled:opacity-50`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5 text-slate-400">
              Pangkat / NRP <span className="font-normal text-slate-500">(Opsional)</span>
            </label>
            <input
              type="text"
              disabled={isEnrolling || isSubmitting}
              value={formData.rank_nrp}
              onChange={(e) => setFormData({ ...formData, rank_nrp: e.target.value })}
              placeholder="Contoh: Praka Inf / 312..."
              className={`${inputClass} disabled:opacity-50`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5 text-slate-400">
              Catatan <span className="font-normal text-slate-500">(Opsional)</span>
            </label>
            <textarea
              rows={2}
              disabled={isEnrolling || isSubmitting}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Keterangan tambahan..."
              className={`${inputClass} disabled:opacity-50`}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-2.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 ${
              isSubmitting
                ? 'bg-white/5 text-slate-500 border border-white/10 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-sm border border-emerald-500/60'
            }`}
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Menyimpan...' : 'Simpan Personel'}
          </button>
        </form>
      </div>
    </div>
  );
};
