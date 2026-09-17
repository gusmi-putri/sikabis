/**
 * SI-JAGA — PersonnelManagementView.tsx
 * Halaman Manajemen Akses Personel.
 * Menampilkan daftar personel dan form registrasi.
 * Mendukung command pending dan konfirmasi cabut akses.
 */

import React, { useState } from 'react';
import { Shield, Trash2, CheckCircle2, AlertTriangle, Fingerprint, RefreshCw, Edit2, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { Personnel, DeviceStatus, PersonnelStatus } from '../types';
import { PersonnelRegistrationCard } from './PersonnelRegistrationCard';

interface PersonnelManagementViewProps {
  personnelList: Personnel[];
  deviceStatus: DeviceStatus;
  onEnroll: (data: { name: string; rank_nrp?: string; notes?: string }) => Promise<void>;
  onRevoke: (fingerprintId: number) => Promise<void>;
  onUpdate: (id: number, data: { name: string; rank_nrp?: string; notes?: string }) => Promise<void>;
  onCancelPending: () => Promise<void>;
}

export const PersonnelManagementView: React.FC<PersonnelManagementViewProps> = ({
  personnelList,
  deviceStatus,
  onEnroll,
  onRevoke,
  onUpdate,
  onCancelPending,
}) => {
  const { isDark } = useTheme();
  const [personToRevoke, setPersonToRevoke] = useState<Personnel | null>(null);
  const [personToEdit, setPersonToEdit] = useState<Personnel | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', rank_nrp: '', notes: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  const isDeviceOnline = deviceStatus.status === 'online';
  const hasPending = deviceStatus.pending_command !== 'NONE';

  const handleRevokeConfirm = async () => {
    if (!personToRevoke || personToRevoke.fingerprint_id === null) return;

    setIsProcessing(true);
    try {
      // Kirim perintah DELETE ke key box fisik lewat backend Laravel.
      await onRevoke(personToRevoke.fingerprint_id);
      setPersonToRevoke(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditClick = (person: Personnel) => {
    setPersonToEdit(person);
    setEditFormData({
      name: person.name,
      rank_nrp: person.rank_nrp || '',
      notes: person.notes || '',
    });
  };

  const handleUpdateConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personToEdit) return;

    setIsProcessing(true);
    try {
      await onUpdate(personToEdit.id, {
        name: editFormData.name,
        rank_nrp: editFormData.rank_nrp || undefined,
        notes: editFormData.notes || undefined,
      });
      setPersonToEdit(null);
    } finally {
      setIsProcessing(false);
    }
  };

  // Aksi khusus (Demo/Admin): Batalkan pending command
  const handleCancelPendingCommand = async () => {
    setIsProcessing(true);
    try {
      await onCancelPending();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* ── Banner Status Perangkat Khusus Manajemen ── */}
      <div className={`p-4 rounded-lg border shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg border ${
            hasPending
              ? isDark ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 animate-pulse' : 'bg-amber-100 border-amber-300 text-amber-700 animate-pulse'
              : isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}>
            {hasPending ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
          </div>
          <div>
            <h2 className={`text-sm font-bold font-tactical ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Manajemen Akses Key Box
            </h2>
            <p className={`text-xs font-mono mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Status Key Box: <span className={isDeviceOnline ? 'text-emerald-500' : 'text-red-500 font-bold'}>{isDeviceOnline ? 'Online & Terhubung' : 'Offline'}</span>
            </p>
          </div>
        </div>

        {hasPending && (
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-mono px-3 py-1 rounded border font-semibold ${
              isDark ? 'bg-amber-950/40 border-amber-500/50 text-amber-300' : 'bg-amber-50 border-amber-400 text-amber-800'
            }`}>
              Memproses {deviceStatus.pending_command}... (Menunggu device)
            </span>
            <button
              onClick={handleCancelPendingCommand}
              disabled={isProcessing}
              className={`text-[10px] px-2 py-1 rounded border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isDark ? 'bg-slate-800 hover:bg-red-900/40 hover:text-red-400 hover:border-red-500 border-slate-700 text-slate-300' : 'bg-white hover:bg-red-50 hover:text-red-600 hover:border-red-400 border-slate-300 text-slate-600'
              }`}
            >
              Batalkan
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
        {/* Kolom Kiri: Form Registrasi */}
        <div className="xl:col-span-1">
          <PersonnelRegistrationCard
            deviceStatus={deviceStatus}
            onEnroll={onEnroll}
          />
        </div>

        {/* Kolom Kanan: Tabel Data */}
        <div className={`xl:col-span-2 rounded-xl border shadow-sm overflow-hidden ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className={`px-5 py-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Daftar Personel Terdaftar
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`text-[11px] font-mono border-b ${
                  isDark ? 'border-slate-800 text-slate-400 bg-slate-950/40' : 'border-slate-200 text-slate-600 bg-slate-50'
                }`}>
                  <th className="py-3 px-4">Personel</th>
                  <th className="py-3 px-4">Fingerprint ID</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-xs ${isDark ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
                {personnelList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className={`py-12 text-center text-sm font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      Belum ada data personel.
                    </td>
                  </tr>
                ) : (
                  personnelList.map(p => {
                    const isActive = p.status === 'active';
                    const isPending = p.status.includes('pending');

                    return (
                      <tr key={p.id} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                        {/* Personel */}
                        <td className="py-3 px-4">
                          <div className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                            {p.name}
                          </div>
                          <div className={`text-[10px] font-mono mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                            {p.rank_nrp || '-'}
                          </div>
                        </td>

                        {/* Fingerprint ID */}
                        <td className={`py-3 px-4 font-mono font-bold ${
                          p.fingerprint_id !== null 
                            ? isDark ? 'text-emerald-400' : 'text-emerald-700' 
                            : isDark ? 'text-slate-600' : 'text-slate-400'
                        }`}>
                          {p.fingerprint_id !== null ? `#${p.fingerprint_id}` : 'Belum Ada'}
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
                            className={`p-1.5 rounded transition-colors ${
                              isDark ? 'text-slate-400 hover:bg-slate-700/50 hover:text-white' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-900'
                            }`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setPersonToRevoke(p)}
                            disabled={!isActive || !isDeviceOnline || hasPending}
                            title={!isActive ? 'Hanya personel aktif yang bisa dicabut' : hasPending ? 'Menunggu command pending selesai' : 'Cabut akses (Delete dari sensor)'}
                            className={`p-1.5 rounded transition-colors ${
                              !isActive || !isDeviceOnline || hasPending
                                ? isDark ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 cursor-not-allowed'
                                : isDark ? 'text-red-400 hover:bg-red-900/40 hover:text-red-300 cursor-pointer' : 'text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer'
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
              Sistem akan mengirim perintah DELETE ke sensor key box fisik.
            </p>
            <div className={`p-3 rounded border text-xs font-mono mb-5 ${isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
              Finger ID: <span className="font-bold">{personToRevoke.fingerprint_id}</span>
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
  const { isDark } = useTheme();
  let color = '';
  let label = '';
  let Icon = null;

  switch (status) {
    case 'active':
      color = isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-300';
      label = 'Aktif';
      Icon = CheckCircle2;
      break;
    case 'pending_enroll':
      color = isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-300';
      label = 'Pending Enroll';
      Icon = RefreshCw;
      break;
    case 'pending_revoke':
      color = isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-300';
      label = 'Pending Revoke';
      Icon = RefreshCw;
      break;
    case 'inactive':
      color = isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-300';
      label = 'Tidak Aktif';
      break;
    case 'failed':
      color = isDark ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-red-50 text-red-700 border-red-300';
      label = 'Gagal / Dibatalkan';
      Icon = AlertTriangle;
      break;
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono font-semibold border ${color}`}>
      {Icon && <Icon className={`w-3 h-3 ${status.includes('pending') ? 'animate-spin' : ''}`} />}
      {label}
    </span>
  );
}
