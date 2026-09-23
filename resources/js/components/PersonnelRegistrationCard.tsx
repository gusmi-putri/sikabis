/**
 * SI-JAGA — PersonnelRegistrationCard.tsx
 * Form pencatatan personel kotak kunci.
 * Sidik jari didaftarkan langsung di Board A lewat Serial Monitor
 * (perintah `D`, lalu ketik nomor ID 1-127). Form ini hanya mencatat
 * siapa pemilik nomor ID tersebut — perangkat pintu sengaja tidak
 * bisa diperintah dari jaringan.
 */

import React, { useState } from 'react';
import { UserPlus, Fingerprint, Save, AlertTriangle } from 'lucide-react';
import { Personnel, PersonnelInput } from '../types';
import { apiErrorMessage } from '../services/api';

interface PersonnelRegistrationCardProps {
  personnelList: Personnel[];
  onCreate: (data: PersonnelInput) => Promise<void>;
}

const EMPTY_FORM = { name: '', rank_nrp: '', fingerprint_id: '', notes: '' };

export const PersonnelRegistrationCard: React.FC<PersonnelRegistrationCardProps> = ({
  personnelList,
  onCreate,
}) => {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usedIds = new Set(personnelList.map((p) => p.fingerprint_id).filter((id): id is number => id !== null));
  const nextFreeId = Array.from({ length: 127 }, (_, i) => i + 1).find((id) => !usedIds.has(id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await onCreate({
        name: formData.name,
        rank_nrp: formData.rank_nrp || undefined,
        fingerprint_id: Number(formData.fingerprint_id),
        notes: formData.notes || undefined,
      });
      setFormData(EMPTY_FORM);
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
        <div className="mb-5 p-3 rounded-lg border flex gap-3 bg-white/5 border-white/10">
          <Fingerprint className="w-5 h-5 shrink-0 text-emerald-500" />
          <ol className="text-[10px] font-mono leading-relaxed text-slate-400 list-decimal pl-3 space-y-0.5">
            <li>Buka Serial Monitor Board A, kirim <span className="text-emerald-400">D</span>.</li>
            <li>
              Ketik nomor ID
              {nextFreeId && <> (kosong: <span className="text-emerald-400">{nextFreeId}</span>)</>}
              , lalu tempel jari yang sama dua kali.
            </li>
            <li>Setelah muncul "Tersimpan sebagai ID …", isi form ini dengan nomor yang sama.</li>
          </ol>
        </div>

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
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Contoh: Budi Santoso"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5 text-slate-400">
              Pangkat / NRP <span className="font-normal text-slate-500">(Opsional)</span>
            </label>
            <input
              type="text"
              value={formData.rank_nrp}
              onChange={(e) => setFormData({ ...formData, rank_nrp: e.target.value })}
              placeholder="Contoh: Praka Inf / 312..."
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5 text-slate-400">
              ID Sidik Jari di Sensor <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              min={1}
              max={127}
              value={formData.fingerprint_id}
              onChange={(e) => setFormData({ ...formData, fingerprint_id: e.target.value })}
              placeholder={nextFreeId ? `Contoh: ${nextFreeId}` : '1 - 127'}
              className={`${inputClass} font-mono`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5 text-slate-400">
              Catatan <span className="font-normal text-slate-500">(Opsional)</span>
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Keterangan tambahan..."
              className={inputClass}
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
