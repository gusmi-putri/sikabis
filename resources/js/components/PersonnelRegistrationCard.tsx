/**
 * SI-JAGA — PersonnelRegistrationCard.tsx
 * Form pendaftaran personel baru.
 * Saat disubmit, sistem hanya menyimpan data awal dan mengirim
 * command ENROLL ke key box. Proses pendaftaran sidik jari
 * terjadi secara FISIK di sensor, bukan diupload via web.
 */

import React, { useState } from 'react';
import { UserPlus, Fingerprint, Shield, AlertTriangle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { DeviceStatus } from '../types';

interface PersonnelRegistrationCardProps {
  deviceStatus: DeviceStatus;
  onEnroll: (data: { name: string; rank_nrp?: string; notes?: string }) => Promise<void>;
}

export const PersonnelRegistrationCard: React.FC<PersonnelRegistrationCardProps> = ({
  deviceStatus,
  onEnroll,
}) => {
  const { isDark } = useTheme();

  const [formData, setFormData] = useState({
    name: '',
    rank_nrp: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDeviceOnline = deviceStatus.status === 'online';
  const hasPending = deviceStatus.pending_command !== 'NONE';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    setIsSubmitting(true);
    try {
      // Kirim perintah ENROLL ke backend Laravel; status personel &
      // pending_command diproses di server, bukan dibuat client-side.
      await onEnroll({
        name: formData.name,
        rank_nrp: formData.rank_nrp || undefined,
        notes: formData.notes || undefined,
      });
      setFormData({ name: '', rank_nrp: '', notes: '' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border shadow-lg overflow-hidden bg-white/5 backdrop-blur-md border-white/10">
      <div className="p-5 border-b flex items-center justify-between border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg border bg-emerald-500/20 border-emerald-500/30 text-emerald-400">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold font-tactical text-white">
              Registrasi Personel
            </h3>
            <p className="text-[11px] font-mono mt-0.5 text-slate-400">
              Daftarkan akses key box fisik
            </p>
          </div>
        </div>
      </div>

      <div className="p-5">
        {hasPending && (
          <div className="mb-5 p-3 rounded-lg border flex gap-3 text-xs font-mono leading-relaxed bg-amber-500/20 border-amber-500/30 text-amber-200">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
            <div>
              <span className="font-bold">Aksi Diblokir:</span> Saat ini ada perintah <span className="font-bold text-amber-500">{deviceStatus.pending_command}</span> yang sedang menunggu respon dari key box. Registrasi baru ditangguhkan sampai perintah sebelumnya selesai.
            </div>
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
              disabled={!isDeviceOnline || hasPending}
              placeholder="Contoh: Budi Santoso"
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed bg-black/20 border-white/10 text-slate-200"
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
              disabled={!isDeviceOnline || hasPending}
              placeholder="Contoh: Praka Inf / 312..."
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed bg-black/20 border-white/10 text-slate-200"
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
              disabled={!isDeviceOnline || hasPending}
              placeholder="Keterangan tambahan..."
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed bg-black/20 border-white/10 text-slate-200"
            />
          </div>

          <div className="mt-5 p-3 rounded-lg border flex gap-3 bg-white/5 border-white/10">
            <Fingerprint className="w-5 h-5 shrink-0 text-emerald-500" />
            <div className="text-[10px] font-mono leading-relaxed text-slate-400">
              Setelah menekan "Kirim Perintah Enroll", status personel akan menjadi <span className="text-amber-400">pending_enroll</span>. Operator harus mengarahkan personel untuk menempelkan jari pada sensor fisik di key box.
            </div>
          </div>

          <button
            type="submit"
            disabled={!isDeviceOnline || hasPending || isSubmitting}
            className={`w-full py-2.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 ${
              !isDeviceOnline || hasPending || isSubmitting
                ? 'bg-white/5 text-slate-500 border border-white/10 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-sm border border-emerald-500/60'
            }`}
          >
            <Shield className="w-4 h-4" />
            {isSubmitting
              ? 'Mengirim Perintah...'
              : hasPending
              ? 'Menunggu Proses Selesai...'
              : 'Kirim Perintah Enroll ke Key Box'}
          </button>
        </form>
      </div>
    </div>
  );
};
