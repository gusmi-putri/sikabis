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
  currentUser: User;
  usersList: User[];
  onAddPiket: (data: { name: string; username: string; password: string }) => Promise<void>;
  onToggleActive: (userId: number) => Promise<void>;
  onUpdateUser: (userId: number, data: Partial<User>) => Promise<void>;
  onDeleteUser: (userId: number) => Promise<void>;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  currentUser,
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
  const [editActionError, setEditActionError] = useState('');
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleteActionError, setDeleteActionError] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Admin bisa melihat semua user (termasuk dirinya sendiri)
  const displayUsers = usersList;

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
    setEditActionError('');
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
      setEditActionError(err?.response?.data?.message || 'Gagal mengubah data user.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsProcessingAction(true);
    setDeleteActionError('');
    try {
      await onDeleteUser(userToDelete.id);
      setUserToDelete(null);
    } catch (err: any) {
      setDeleteActionError(err?.response?.data?.message || 'Gagal menghapus user.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const openDeleteModal = (u: User) => {
    setDeleteActionError('');
    setUserToDelete(u);
  };

  return (
    <div className="space-y-5">
      {/* Header Halaman */}
      <div className="p-4 rounded-2xl border shadow-lg bg-white/5 backdrop-blur-md border-white/10 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg border bg-amber-500/20 border-amber-500/30 text-amber-400">
            <UserCog className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold font-tactical text-white">
              Manajemen Akun
            </h2>
            <p className="text-xs font-mono mt-0.5 text-slate-400">
              Halaman eksklusif Admin PAM
            </p>
          </div>
        </div>
        <div className="px-3 py-1.5 rounded border text-[11px] font-semibold flex items-center gap-1.5 bg-amber-950/40 border-amber-500/50 text-amber-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Akses Terbatas</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
        {/* Kolom Kiri: Form Tambah Piket */}
        <div className="xl:col-span-1 rounded-2xl border shadow-lg overflow-hidden bg-white/5 backdrop-blur-md border-white/10">
          <div className="p-5 border-b flex items-center justify-between border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded border bg-emerald-500/20 border-emerald-500/30 text-emerald-400">
                <UserPlus className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">
                Tambah Akun Piket
              </h3>
            </div>
          </div>

          <div className="p-5">
            <form onSubmit={handleAddPiket} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-slate-400">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Piket Jaga"
                  className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 bg-black/20 border-white/10 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 text-slate-400">
                  Username Login <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="username (tanpa spasi)"
                  className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 bg-black/20 border-white/10 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 text-slate-400">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 bg-black/20 border-white/10 text-slate-200"
                />
              </div>

              <div className="mt-2 p-3 rounded-lg border flex gap-3 bg-white/5 border-white/10">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                <div className="text-[10px] font-mono leading-relaxed text-slate-400">
                  Akun yang dibuat di sini hanya berlaku untuk role <strong>Piket Jaga</strong>. Akun piket tidak memiliki akses ke halaman manajemen ini.
                </div>
              </div>

              {formError && (
                <div className="p-3 rounded-lg border text-xs font-semibold bg-red-500/20 border-red-500/30 text-red-400">
                  {formError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 mt-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm border disabled:opacity-60 disabled:cursor-not-allowed bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500"
              >
                <UserPlus className="w-4 h-4" />
                {isSubmitting ? 'Membuat Akun...' : 'Buat Akun Piket'}
              </button>
            </form>
          </div>
        </div>

        {/* Kolom Kanan: Tabel User Piket */}
        <div className="xl:col-span-2 rounded-2xl border shadow-lg overflow-hidden bg-white/5 backdrop-blur-md border-white/10">
          <div className="px-5 py-4 border-b border-white/10">
            <h3 className="text-sm font-bold text-white">
              Daftar Semua Akun
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[11px] font-mono border-b border-white/10 text-slate-400 bg-black/20">
                  <th className="py-3 px-4">Nama Personel</th>
                  <th className="py-3 px-4">Username Login</th>
                  <th className="py-3 px-4">Status Akun</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs divide-white/5">
                {displayUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-sm font-mono text-slate-500">
                      Belum ada akun.
                    </td>
                  </tr>
                ) : (
                  displayUsers.map(u => (
                    <tr key={u.id} className="transition-colors hover:bg-white/10">
                      <td className="py-3 px-4">
                        <div className="font-semibold flex items-center gap-2 text-slate-200">
                          {u.name}
                          {u.id === currentUser.id && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-400">(Anda)</span>
                          )}
                          {u.role === 'admin_pam' && u.id !== currentUser.id && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-400">(Admin)</span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono mt-0.5 text-slate-400">
                          Dibuat: {new Date(u.created_at).toLocaleDateString('id-ID')}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-slate-300">
                        @{u.username}
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono font-semibold border ${
                          u.is_active
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                            : 'bg-red-500/20 text-red-400 border-red-500/50'
                        }`}>
                          {u.is_active ? 'AKTIF' : 'NONAKTIF'}
                        </span>
                      </td>

                      {/* Aksi Toggle & Edit & Delete */}
                      <td className="py-3 px-4 text-right space-x-2 flex justify-end items-center h-full">
                        <button
                          onClick={() => handleEditClick(u)}
                          title="Edit User"
                          className="p-1.5 rounded border transition-colors cursor-pointer flex items-center justify-center bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border-white/10"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        
                        <button
                          onClick={() => toggleUserActive(u.id)}
                          disabled={u.id === currentUser.id}
                          title={u.is_active ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                          className={`p-1.5 rounded border transition-colors flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed ${
                            u.is_active
                              ? 'bg-white/5 hover:bg-amber-500/20 text-amber-400 border-white/10 hover:border-amber-500'
                              : 'bg-white/5 hover:bg-emerald-500/20 text-emerald-400 border-white/10 hover:border-emerald-500'
                          } ${u.id !== currentUser.id ? 'cursor-pointer' : ''}`}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => openDeleteModal(u)}
                          disabled={u.id === currentUser.id}
                          title="Hapus User"
                          className={`p-1.5 rounded border transition-colors flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed bg-white/5 hover:bg-red-500/20 text-red-400 border-white/10 hover:border-red-500 ${u.id !== currentUser.id ? 'cursor-pointer' : ''}`}
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
                <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Edit Akun</h3>
              </div>
              <button onClick={() => setUserToEdit(null)} className={`p-1 rounded ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateUser} className="space-y-4">
              {editActionError && (
                <div className="p-3 rounded border flex gap-2 text-xs bg-red-500/10 border-red-500/30 text-red-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {editActionError}
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
            
            <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Apakah Anda yakin ingin menghapus akun <strong>{userToDelete.name}</strong> (@{userToDelete.username})? Tindakan ini tidak dapat dibatalkan.
            </p>
            {deleteActionError && (
              <p className="mt-3 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
                {deleteActionError}
              </p>
            )}

            <div className="flex gap-3 justify-end mt-5">
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
