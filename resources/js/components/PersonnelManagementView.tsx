/**
 * SI-JAGA — PersonnelManagementView.tsx
 * Halaman Manajemen Akses Personel.
 * Menampilkan daftar personel dan form registrasi.
 * Sidik jari didaftarkan/dihapus langsung di Board A; halaman ini
 * mencatat pemilik tiap ID sidik jari.
 */

import React, { useState } from 'react';
import { Shield, Trash2, CheckCircle2, AlertTriangle, Edit2, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { Personnel, PersonnelInput, PersonnelStatus } from '../types';
import { PersonnelRegistrationCard } from './PersonnelRegistrationCard';
import { apiErrorMessage } from '../services/api';

interface PersonnelManagementViewProps {
  personnelList: Personnel[];
  keyboxStatus: DeviceStatus[];
  onCreate: (data: PersonnelInput) => Promise<void>;
  onDeactivate: (id: number) => Promise<void>;
  onUpdate: (id: number, data: PersonnelInput) => Promise<void>;
}

export const PersonnelManagementView: React.FC<PersonnelManagementViewProps> = ({
  personnelList,
  keyboxStatus,
  onCreate,
  onDeactivate,
  onUpdate,
}) => {
  const { isDark } = useTheme();
  const [personToRevoke, setPersonToRevoke] = useState<Personnel | null>(null);
  const [personToEdit, setPersonToEdit] = useState<Personnel | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', rank_nrp: '', fingerprint_id: '', notes: '' });
  const [editError, setEditError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRevokeConfirm = async () => {
    if (!personToRevoke) return;

    setIsProcessing(true);
    try {
      await onDeactivate(personToRevoke.id);
      setPersonToRevoke(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditClick = (person: Personnel) => {
    setPersonToEdit(person);
    setEditError(null);
    setEditFormData({
      name: person.name,
      rank_nrp: person.rank_nrp || '',
      fingerprint_id: person.fingerprint_id?.toString() ?? '',
      notes: person.notes || '',
    });
  };

  const handleUpdateConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personToEdit) return;

    setIsProcessing(true);
    setEditError(null);
    try {
      await onUpdate(personToEdit.id, {
        name: editFormData.name,
        rank_nrp: editFormData.rank_nrp || undefined,
        fingerprint_id: editFormData.fingerprint_id ? Number(editFormData.fingerprint_id) : null,
        notes: editFormData.notes || undefined,
      });
      setPersonToEdit(null);
    } catch (err) {
      setEditError(apiErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* ── Banner Status Perangkat Khusus Manajemen ── */}
      <div className="p-4 rounded-2xl border shadow-lg bg-white/5 backdrop-blur-md border-white/10 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg border bg-emerald-500/20 border-emerald-500/30 text-emerald-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold font-tactical text-white">
              Manajemen Akses Key Box
            </h2>
            <p className="text-xs font-mono mt-0.5 text-slate-400">
              {personnelList.filter((p) => p.status === 'active').length} personel aktif · ID sidik jari 1-127
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
        {/* Kolom Kiri: Form Registrasi */}
        <div className="xl:col-span-1">
          <PersonnelRegistrationCard
            personnelList={personnelList}
            keyboxStatus={keyboxStatus}
            onCreate={onCreate}
          />
        </div>

        {/* Kolom Kanan: Tabel Data */}
        <div className="xl:col-span-2 rounded-2xl border shadow-lg overflow-hidden bg-white/5 backdrop-blur-md border-white/10">
          <div className="px-5 py-4 border-b border-white/10">
            <h3 className="text-sm font-bold text-white">
              Daftar Personel Terdaftar
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[11px] font-mono border-b border-white/10 text-slate-400 bg-black/20">
                  <th className="py-3 px-4">Personel</th>
                  <th className="py-3 px-4">Fingerprint ID</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs divide-white/5">
                {personnelList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-sm font-mono text-slate-500">
                      Belum ada data personel.
                    </td>
                  </tr>
                ) : (
                  personnelList.map(p => {
                    const isActive = p.status === 'active';

                    return (
                      <tr key={p.id} className="transition-colors hover:bg-white/10">
                        {/* Personel */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-200">
                            {p.name}
                          </div>
                          <div className="text-[10px] font-mono mt-0.5 text-slate-400">
                            {p.rank_nrp || '-'}
                          </div>
                        </td>

                        {/* Fingerprint ID */}
                        <td className={`py-3 px-4 font-mono font-bold ${
                          p.fingerprint_id !== null 
                            ? 'text-emerald-400' 
                            : 'text-slate-500'
                        }`}>
                          {p.fingerprint_id !== null ? `#${p.fingerprint_id}` : '-'}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-4">
                          <StatusBadge status={p.status} />
                        </td>

                        {/* Aksi */}
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => handleEditClick(p)}
                            title="Edit data personel"
                            className="p-1.5 rounded transition-colors bg-white/5 hover:bg-white/10 border-white/10 text-slate-300"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setPersonToRevoke(p)}
                            disabled={!isActive}
                            title={!isActive ? 'Hanya personel aktif yang bisa dicabut' : 'Cabut akses'}
                            className={`p-1.5 rounded transition-colors ${
                              !isActive
                                ? 'text-slate-600 cursor-not-allowed bg-white/5 border border-white/5'
                                : 'text-red-400 hover:bg-red-500/20 hover:text-red-300 cursor-pointer bg-white/5 border border-white/10'
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Konfirmasi Revoke */}
      {personToRevoke && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPersonToRevoke(null)}>
          <div className={`rounded-xl border max-w-sm w-full p-5 shadow-2xl ${isDark ? 'bg-slate-900 border-red-500/40' : 'bg-white border-red-300'}`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-full ${isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'}`}>
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Cabut Akses Personel?</h3>
            </div>
            
            <p className={`text-sm mb-4 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Anda akan mencabut akses untuk <strong>{personToRevoke.name}</strong>.
              ID sidik jarinya dilepas dan riwayat aksesnya tetap tersimpan.
            </p>
            <div className={`p-3 rounded border text-xs font-mono mb-5 leading-relaxed ${isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
              <span className="font-bold">Info:</span> Template ID <span className="font-bold">#{personToRevoke.fingerprint_id}</span> akan otomatis dihapus dari sensor Board A.
              Kotak kunci akan menerima perintah hapus dalam maksimal 5 detik.
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setPersonToRevoke(null)}
                disabled={isProcessing}
                className={`px-4 py-2 rounded text-sm font-semibold transition-colors cursor-pointer border disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'}`}
              >
                Batal
              </button>
              <button
                onClick={handleRevokeConfirm}
                disabled={isProcessing}
                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors cursor-pointer shadow-sm shadow-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Memproses...' : 'Ya, Cabut Akses'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit Personel */}
      {personToEdit && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPersonToEdit(null)}>
          <div className={`rounded-xl border max-w-md w-full p-5 shadow-2xl ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                  <Edit2 className="w-5 h-5" />
                </div>
                <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Edit Personel</h3>
              </div>
              <button onClick={() => setPersonToEdit(null)} className={`p-1 rounded ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateConfirm} className="space-y-4">
              {editError && (
                <div className="p-3 rounded border flex gap-2 text-xs bg-red-500/10 border-red-500/30 text-red-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {editError}
                </div>
              )}

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className={`w-full px-3 py-2 rounded border text-sm ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white focus:border-blue-500' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                  } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Pangkat / NRP <span className="text-slate-500 font-normal">(Opsional)</span></label>
                <input
                  type="text"
                  value={editFormData.rank_nrp}
                  onChange={(e) => setEditFormData({ ...editFormData, rank_nrp: e.target.value })}
                  className={`w-full px-3 py-2 rounded border text-sm ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white focus:border-blue-500' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                  } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  ID Sidik Jari{' '}
                  <span className="text-slate-500 font-normal">
                    {personToEdit.status === 'active' ? '(sama dengan di Board A)' : '(isi untuk mengaktifkan lagi)'}
                  </span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={127}
                  required={personToEdit.status === 'active'}
                  value={editFormData.fingerprint_id}
                  onChange={(e) => setEditFormData({ ...editFormData, fingerprint_id: e.target.value })}
                  className={`w-full px-3 py-2 rounded border text-sm font-mono ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white focus:border-blue-500' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                  } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Catatan <span className="text-slate-500 font-normal">(Opsional)</span></label>
                <textarea
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  className={`w-full px-3 py-2 rounded border text-sm min-h-[80px] ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white focus:border-blue-500' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                  } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setPersonToEdit(null)}
                  disabled={isProcessing}
                  className={`px-4 py-2 rounded text-sm font-semibold transition-colors cursor-pointer border disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'}`}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors cursor-pointer shadow-sm shadow-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Helper Component: StatusBadge ---
function StatusBadge({ status }: { status: PersonnelStatus }) {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono font-semibold border bg-emerald-500/20 text-emerald-400 border-emerald-500/50">
        <CheckCircle2 className="w-3 h-3" />
        Aktif
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono font-semibold border bg-white/5 text-slate-400 border-white/10">
      Tidak Aktif
    </span>
  );
}
