/**
 * SI-JAGA — UserManagementView.tsx
 * Halaman khusus Admin PAM untuk mengelola akun Piket Jaga.
 * Mendukung penambahan akun piket baru dan toggle (non)aktif akun.
 */

import React, { useState } from 'react';
import { UserCog, UserPlus, Power, AlertTriangle, ShieldCheck, Edit2, Trash2, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { User } from '../types';

interface UserManagementViewProps {
  usersList: User[];
  onAddPiket: (data: { name: string; username: string; password: string }) => Promise<void>;
  onToggleActive: (userId: number) => Promise<void>;
  onUpdateUser: (userId: number, data: Partial<User>) => Promise<void>;
  onDeleteUser: (userId: number) => Promise<void>;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  usersList,
  onAddPiket,
  onToggleActive,
  onUpdateUser,
  onDeleteUser,
}) => {
  const { isDark } = useTheme();

  // State untuk form tambah piket
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // State untuk modal Edit & Delete
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', username: '', password: '' });
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Filter hanya akun piket (Admin tidak bisa edit Admin lain)
  const piketUsers = usersList.filter((u) => u.role === 'piket');

  const handleAddPiket = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!formData.name || !formData.username || !formData.password) return;

    setIsSubmitting(true);
    try {
      // Validasi & hashing password dilakukan di backend Laravel.
      await onAddPiket(formData);
      setFormData({ name: '', username: '', password: '' });
    } catch (err: any) {
      setFormError(
        err?.response?.data?.errors?.username?.[0] ||
          err?.response?.data?.message ||
          'Gagal membuat akun. Periksa kembali data yang dimasukkan.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleUserActive = (userId: number) => {
    onToggleActive(userId);
  };

  const handleEditClick = (u: User) => {
    setUserToEdit(u);
    setEditFormData({
      name: u.name,
      username: u.username,
      password: '', // Kosongkan password agar tidak diubah jika tidak diisi
    });
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEdit) return;

    setIsProcessingAction(true);
    try {
      const dataToUpdate: Partial<User> = {
        name: editFormData.name,
        username: editFormData.username,
      };
      if (editFormData.password) {
        dataToUpdate.password = editFormData.password;
      }
      
      await onUpdateUser(userToEdit.id, dataToUpdate);
      setUserToEdit(null);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Gagal mengubah data user.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsProcessingAction(true);
    try {
      await onDeleteUser(userToDelete.id);
      setUserToDelete(null);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Gagal menghapus user.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Halaman */}
      <div className={`p-4 rounded-lg border shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg border ${
            isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-amber-50 border-amber-300 text-amber-700'
          }`}>
            <UserCog className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`text-sm font-bold font-tactical ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Manajemen Akun Piket
            </h2>
            <p className={`text-xs font-mono mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Halaman eksklusif Admin PAM
            </p>
          </div>
        </div>
        <div className={`px-3 py-1.5 rounded border text-[11px] font-semibold flex items-center gap-1.5 ${
          isDark ? 'bg-amber-950/40 border-amber-500/50 text-amber-400' : 'bg-amber-50 border-amber-300 text-amber-700'
        }`}>
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Akses Terbatas</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
        {/* Kolom Kiri: Form Tambah Piket */}
        <div className={`xl:col-span-1 rounded-xl border shadow-sm overflow-hidden ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className={`p-5 border-b flex items-center justify-between ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded border ${isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                <UserPlus className="w-4 h-4" />
              </div>
              <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Tambah Akun Piket
              </h3>
            </div>
          </div>

          <div className="p-5">
            <form onSubmit={handleAddPiket} className="space-y-4">
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Praka Budi"
                  className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                    isDark ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Username Login <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="username (tanpa spasi)"
                  className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                    isDark ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                    isDark ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className={`mt-2 p-3 rounded-lg border flex gap-3 ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <AlertTriangle className={`w-4 h-4 shrink-0 ${isDark ? 'text-amber-500' : 'text-amber-600'}`} />
                <div className={`text-[10px] font-mono leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Akun yang dibuat di sini hanya berlaku untuk role <strong>Piket Jaga</strong>. Akun piket tidak memiliki akses ke halaman manajemen ini.
                </div>
              </div>

              {formError && (
                <div className={`p-3 rounded-lg border text-xs font-semibold ${
                  isDark ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-red-50 border-red-300 text-red-700'
                }`}>
                  {formError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-2.5 mt-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm border disabled:opacity-60 disabled:cursor-not-allowed ${
                  isDark ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500' : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                {isSubmitting ? 'Membuat Akun...' : 'Buat Akun Piket'}
              </button>
            </form>
          </div>
        </div>

        {/* Kolom Kanan: Tabel User Piket */}
        <div className={`xl:col-span-2 rounded-xl border shadow-sm overflow-hidden ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className={`px-5 py-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Daftar Akun Piket Jaga
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`text-[11px] font-mono border-b ${
                  isDark ? 'border-slate-800 text-slate-400 bg-slate-950/40' : 'border-slate-200 text-slate-600 bg-slate-50'
                }`}>
                  <th className="py-3 px-4">Nama Personel</th>
                  <th className="py-3 px-4">Username Login</th>
                  <th className="py-3 px-4">Status Akun</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-xs ${isDark ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
                {piketUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className={`py-12 text-center text-sm font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      Belum ada akun piket.
                    </td>
                  </tr>
                ) : (
                  piketUsers.map(u => (
                    <tr key={u.id} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                      {/* Nama */}
                      <td className="py-3 px-4">
                        <div className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                          {u.name}
                        </div>
                        <div className={`text-[10px] font-mono mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                          Dibuat: {new Date(u.created_at).toLocaleDateString('id-ID')}
                        </div>
                      </td>

                      {/* Username */}
                      <td className={`py-3 px-4 font-mono font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        @{u.username}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono font-semibold border ${
                          u.is_active
                            ? isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : isDark ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-red-50 text-red-700 border-red-300'
                        }`}>
                          {u.is_active ? 'AKTIF' : 'NONAKTIF'}
                        </span>
                      </td>

                      {/* Aksi Toggle & Edit & Delete */}
                      <td className="py-3 px-4 text-right space-x-2 flex justify-end items-center h-full">
                        <button
                          onClick={() => handleEditClick(u)}
                          title="Edit User"
                          className={`p-1.5 rounded border transition-colors cursor-pointer flex items-center justify-center ${
                            isDark
                              ? 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border-slate-700'
                              : 'bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-900 border-slate-300'
                          }`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        
                        <button
                          onClick={() => toggleUserActive(u.id)}
                          title={u.is_active ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                          className={`p-1.5 rounded border transition-colors cursor-pointer flex items-center justify-center ${
                            u.is_active
                              ? isDark
                                ? 'bg-slate-800 hover:bg-amber-900/40 text-amber-400 border-slate-700 hover:border-amber-500'
                                : 'bg-white hover:bg-amber-50 text-amber-600 border-slate-300 hover:border-amber-300'
                              : isDark
                                ? 'bg-slate-800 hover:bg-emerald-900/40 text-emerald-400 border-slate-700 hover:border-emerald-500'
                                : 'bg-white hover:bg-emerald-50 text-emerald-600 border-slate-300 hover:border-emerald-300'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setUserToDelete(u)}
                          title="Hapus User"
                          className={`p-1.5 rounded border transition-colors cursor-pointer flex items-center justify-center ${
                            isDark
                              ? 'bg-slate-800 hover:bg-red-900/40 text-red-400 border-slate-700 hover:border-red-500'
                              : 'bg-white hover:bg-red-50 text-red-600 border-slate-300 hover:border-red-300'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Edit User */}
      {userToEdit && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setUserToEdit(null)}>
          <div className={`rounded-xl border max-w-md w-full p-5 shadow-2xl ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                  <Edit2 className="w-5 h-5" />
                </div>
                <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Edit Akun Piket</h3>
              </div>
              <button onClick={() => setUserToEdit(null)} className={`p-1 rounded ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateUser} className="space-y-4">
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
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Username Login</label>
                <input
                  type="text"
                  required
                  value={editFormData.username}
                  onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                  className={`w-full px-3 py-2 rounded border text-sm ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white focus:border-blue-500' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                  } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Password Baru <span className="text-slate-500 font-normal">(Kosongkan jika tidak ingin mengubah)</span></label>
                <input
                  type="password"
                  value={editFormData.password}
                  onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                  placeholder="••••••••"
                  className={`w-full px-3 py-2 rounded border text-sm ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white focus:border-blue-500' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                  } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setUserToEdit(null)}
                  disabled={isProcessingAction}
                  className={`px-4 py-2 rounded text-sm font-semibold transition-colors cursor-pointer border disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'}`}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isProcessingAction}
                  className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors cursor-pointer shadow-sm shadow-blue-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessingAction ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Hapus User */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setUserToDelete(null)}>
          <div className={`rounded-xl border max-w-sm w-full p-5 shadow-2xl ${isDark ? 'bg-slate-900 border-red-500/40' : 'bg-white border-red-300'}`} onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-full ${isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'}`}>
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Hapus Akun?</h3>
            </div>
            
            <p className={`text-sm mb-5 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Apakah Anda yakin ingin menghapus akun <strong>{userToDelete.name}</strong> (@{userToDelete.username})? Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setUserToDelete(null)}
                disabled={isProcessingAction}
                className={`px-4 py-2 rounded text-sm font-semibold transition-colors cursor-pointer border disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'}`}
              >
                Batal
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={isProcessingAction}
                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors cursor-pointer shadow-sm shadow-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessingAction ? 'Menghapus...' : 'Ya, Hapus Akun'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
