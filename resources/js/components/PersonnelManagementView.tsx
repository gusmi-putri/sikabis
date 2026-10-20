/**
 * SI-JAGA — PersonnelManagementView.tsx
 * Halaman Manajemen Akses Personel Key Box.
 * Menampilkan daftar personel yang memiliki hak akses dan form registrasi.
 * Ketika hak akses dihapus/dicabut, data dan template sidik jari langsung dihapus
 * dari sensor Board A dan namanya langsung hilang dari dashboard tanpa kotak sampah.
 */

import React, { useMemo, useState } from 'react';
import {
  Shield,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Edit2,
  X,
  Users,
  Search,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { Personnel, PersonnelInput, DeviceStatus } from '../types';
import { PersonnelRegistrationCard } from './PersonnelRegistrationCard';
import { apiErrorMessage } from '../services/api';
import { useEscapeKey } from '../hooks/useEscapeKey';

interface PersonnelManagementViewProps {
  personnelList: Personnel[];
  keyboxStatus: DeviceStatus[];
  onCreate: (data: PersonnelInput) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onUpdate: (id: number, data: PersonnelInput) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
}

export const PersonnelManagementView: React.FC<PersonnelManagementViewProps> = ({
  personnelList,
  keyboxStatus,
  onCreate,
  onDelete,
  onUpdate,
  onDirtyChange,
}) => {
  const { isDark } = useTheme();

  const [searchTerm, setSearchTerm] = useState('');
  const [personToDelete, setPersonToDelete] = useState<Personnel | null>(null);
  const [personToEdit, setPersonToEdit] = useState<Personnel | null>(null);

  const [editFormData, setEditFormData] = useState({ name: '', rank_nrp: '', fingerprint_id: '', notes: '' });
  const [editError, setEditError] = useState<string | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Keyboard accessibility
  useEscapeKey(personToDelete !== null && !isProcessing, () => setPersonToDelete(null));
  useEscapeKey(personToEdit !== null && !isProcessing, () => setPersonToEdit(null));

  // Filter pencarian
  const displayedList = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return personnelList;
    return personnelList.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        (p.rank_nrp && p.rank_nrp.toLowerCase().includes(term)) ||
        (p.fingerprint_id !== null && String(p.fingerprint_id).includes(term)) ||
        (p.notes && p.notes.toLowerCase().includes(term))
    );
  }, [personnelList, searchTerm]);

  // ── Aksi: Hapus / Cabut Akses Langsung ───────────────────────
  const handleDeleteConfirm = async () => {
    if (!personToDelete) return;
    setIsProcessing(true);
    setActionError(null);
    try {
      await onDelete(personToDelete.id);
      setPersonToDelete(null);
    } catch (err) {
      setActionError(apiErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Aksi: Edit Data Personel ────────────────────────────────
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
      {/* ── Banner Status Manajemen ── */}
      <div
        className={`p-4 rounded-2xl border shadow-lg backdrop-blur-md flex flex-col md:flex-row gap-4 items-center justify-between ${
          isDark ? 'bg-white/5 border-white/10' : 'bg-white/70 border-slate-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg border bg-emerald-500/20 border-emerald-500/30 text-emerald-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`text-sm font-bold font-tactical ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Manajemen Akses Key Box
            </h2>
            <p className={`text-xs font-mono mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {personnelList.length} personel memiliki akses · ID sidik jari 1-127
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border ${
              isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            {personnelList.length} Terdaftar
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
        {/* Kolom Kiri: Form Registrasi Personel Baru */}
        <div className="xl:col-span-1">
          <PersonnelRegistrationCard
            personnelList={personnelList}
            keyboxStatus={keyboxStatus}
            onCreate={onCreate}
            onDirtyChange={onDirtyChange}
          />
        </div>

        {/* Kolom Kanan: Tabel Data Personel */}
        <div
          className={`xl:col-span-2 rounded-2xl border shadow-lg overflow-hidden backdrop-blur-md ${
            isDark ? 'bg-white/5 border-white/10' : 'bg-white/80 border-slate-200'
          }`}
        >
          {/* Header Tabel */}
          <div
            className={`px-5 py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isDark ? 'border-white/10' : 'border-slate-200'
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Daftar Personel Terdaftar
                </h3>
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                    isDark
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  }`}
                >
                  {displayedList.length} orang
                </span>
              </div>
              <p className={`text-[11px] font-mono mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Personel yang memiliki hak akses aktif ke kotak kunci gudang.
              </p>
            </div>

            {/* Kotak Pencarian */}
            <div className="relative">
              <Search
                className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              />
              <input
                type="text"
                placeholder="Cari nama / NRP / ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`pl-8 pr-3 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                  isDark
                    ? 'bg-black/30 border-white/10 text-white placeholder-slate-500'
                    : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                }`}
              />
            </div>
          </div>

          {actionError && (
            <div className="p-3 mx-4 my-3 rounded-lg border flex gap-2 text-xs bg-red-500/10 border-red-500/30 text-red-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {actionError}
            </div>
          )}

          {/* Tabel Konten */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr
                  className={`text-[11px] font-mono border-b ${
                    isDark
                      ? 'border-white/10 text-slate-400 bg-black/20'
                      : 'border-slate-200 text-slate-600 bg-slate-50'
                  }`}
                >
                  <th className="py-3 px-4">Personel</th>
                  <th className="py-3 px-4">Fingerprint ID</th>
                  <th className="py-3 px-4">Status Akses</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-xs ${isDark ? 'divide-white/5' : 'divide-slate-200'}`}>
                {displayedList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-sm font-mono text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Users className="w-8 h-8 text-slate-600" />
                        <span>
                          {searchTerm
                            ? 'Tidak ada personel yang sesuai dengan pencarian.'
                            : 'Belum ada data personel terdaftar.'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayedList.map((p) => {
                    return (
                      <tr
                        key={p.id}
                        className={`transition-colors ${
                          isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'
                        }`}
                      >
                        {/* Kolom 1: Personel */}
                        <td className="py-3 px-4">
                          <div className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                            {p.name}
                          </div>
                          <div className={`text-[10px] font-mono mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {p.rank_nrp || '-'}
                            {p.notes && <span className="ml-2 italic text-slate-400">({p.notes})</span>}
                          </div>
                        </td>

                        {/* Kolom 2: Fingerprint ID */}
                        <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                          {p.fingerprint_id !== null ? `#${p.fingerprint_id}` : '-'}
                        </td>

                        {/* Kolom 3: Status Badge */}
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold border bg-emerald-500/20 text-emerald-400 border-emerald-500/50">
                            <CheckCircle2 className="w-3 h-3" />
                            Aktif
                          </span>
                        </td>

                        {/* Kolom 4: Aksi */}
                        <td className="py-3 px-4 text-right space-x-2">
                          {/* Edit Data */}
                          <button
                            type="button"
                            onClick={() => handleEditClick(p)}
                            title="Edit data personel"
                            className={`p-1.5 rounded transition-colors border cursor-pointer ${
                              isDark
                                ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                                : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                            }`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Hapus / Cabut Akses Langsung */}
                          <button
                            type="button"
                            onClick={() => setPersonToDelete(p)}
                            title="Hapus / cabut hak akses personel"
                            className="p-1.5 rounded transition-colors text-red-400 hover:bg-red-500/20 hover:text-red-300 cursor-pointer bg-white/5 border border-white/10"
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

      {/* ── Modal Konfirmasi: Hapus / Cabut Hak Akses ── */}
      {personToDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPersonToDelete(null)}
        >
          <div
            className={`rounded-xl border max-w-sm w-full p-5 shadow-2xl ${
              isDark ? 'bg-slate-900 border-red-500/40' : 'bg-white border-red-300'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`p-2 rounded-full ${
                  isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'
                }`}
              >
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Hapus Hak Akses?
              </h3>
            </div>

            <p className={`text-sm mb-4 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Anda akan mencabut dan menghapus data akses untuk <strong>{personToDelete.name}</strong>. Namanya akan{' '}
              <strong>langsung hilang dari dashboard</strong>.
            </p>

            <div
              className={`p-3 rounded border text-xs font-mono mb-5 leading-relaxed ${
                isDark
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              <span className="font-bold">Info Perangkat:</span> Template ID sidik jari{' '}
              <span className="font-bold">#{personToDelete.fingerprint_id}</span> akan otomatis dihapus dari sensor key
              box, dan nomor ID ini dapat digunakan untuk pendaftaran personel lain.
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setPersonToDelete(null)}
                disabled={isProcessing}
                className={`px-4 py-2 rounded text-sm font-semibold transition-colors cursor-pointer border disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                    : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'
                }`}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isProcessing}
                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors cursor-pointer shadow-sm shadow-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {isProcessing ? 'Menghapus...' : 'Ya, Hapus Akses'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Edit Personel ── */}
      {personToEdit && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPersonToEdit(null)}
        >
          <div
            className={`rounded-xl border max-w-md w-full p-5 shadow-2xl ${
              isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-full ${
                    isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                  }`}
                >
                  <Edit2 className="w-5 h-5" />
                </div>
                <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Edit Personel
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPersonToEdit(null)}
                className={`p-1 rounded cursor-pointer ${
                  isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                }`}
              >
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
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className={`w-full px-3 py-2 rounded border text-sm ${
                    isDark
                      ? 'bg-slate-950 border-slate-700 text-white focus:border-blue-500'
                      : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                  } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Pangkat / NRP <span className="text-slate-500 font-normal">(Opsional)</span>
                </label>
                <input
                  type="text"
                  value={editFormData.rank_nrp}
                  onChange={(e) => setEditFormData({ ...editFormData, rank_nrp: e.target.value })}
                  className={`w-full px-3 py-2 rounded border text-sm ${
                    isDark
                      ? 'bg-slate-950 border-slate-700 text-white focus:border-blue-500'
                      : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                  } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  ID Sidik Jari <span className="text-slate-500 font-normal">(sama dengan di sensor key box)</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={127}
                  required
                  value={editFormData.fingerprint_id}
                  onChange={(e) => setEditFormData({ ...editFormData, fingerprint_id: e.target.value })}
                  className={`w-full px-3 py-2 rounded border text-sm font-mono ${
                    isDark
                      ? 'bg-slate-950 border-slate-700 text-white focus:border-blue-500'
                      : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                  } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Catatan <span className="text-slate-500 font-normal">(Opsional)</span>
                </label>
                <textarea
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  className={`w-full px-3 py-2 rounded border text-sm min-h-[80px] ${
                    isDark
                      ? 'bg-slate-950 border-slate-700 text-white focus:border-blue-500'
                      : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                  } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setPersonToEdit(null)}
                  disabled={isProcessing}
                  className={`px-4 py-2 rounded text-sm font-semibold transition-colors cursor-pointer border disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDark
                      ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                      : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'
                  }`}
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
