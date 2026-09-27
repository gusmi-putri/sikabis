/**
 * SI-JAGA — LoginPage.tsx
 * Halaman login untuk operator jaga.
 * Disesuaikan untuk memvalidasi berdasarkan usersList mock
 * dan mengecek is_active.
 */

import React, { useState } from 'react';
import { Shield, Lock, User as UserIcon, Eye, EyeOff, LogIn, AlertTriangle } from 'lucide-react';
import { User } from '../types';
import { APIService } from '../services/api';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Username dan password wajib diisi.');
      return;
    }

    setIsLoading(true);

    try {
      const { user, token } = await APIService.login(username.trim(), password);

      if (token) {
        localStorage.setItem('sijaga_auth_token', token);
        localStorage.setItem('sijaga_auth_user', JSON.stringify(user));
      }

      onLogin(user);
    } catch (err: any) {
      const message: string =
        err?.response?.data?.errors?.username?.[0] ||
        err?.response?.data?.message ||
        (err?.message === 'Network Error' ? 'Koneksi ke server gagal (CORS/Network Error).' : 'Username atau password salah.');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 transition-colors duration-200 bg-gradient-to-b from-[#1a3644] to-[#0a192f]"
    >
      {/* Background subtle grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage: `linear-gradient(#10b981 1px, transparent 1px), linear-gradient(90deg, #10b981 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />

      <div className="w-full max-w-sm relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-900/40 mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            SI-JAGA
          </h1>
          <p className="text-xs font-mono mt-1 tracking-widest uppercase text-slate-400">
            Sistem Info Jaga Gudang
          </p>
        </div>

        {/* Card Login */}
        <div
          className="rounded-3xl border p-6 shadow-2xl bg-white/5 backdrop-blur-md border-white/10"
        >
          <div className="text-center mb-6 pb-5 border-b border-white/10">
            <h2 className="text-sm font-semibold text-slate-200">
              Login Sistem
            </h2>
            <p className="text-xs mt-0.5 text-slate-400">
              Gunakan akun admin atau piket Anda
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label
                htmlFor="login-username"
                className="block text-xs font-medium mb-1.5 text-slate-300"
              >
                Username
              </label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin atau piket"
                  className="w-full pl-11 pr-4 py-2.5 rounded-full border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/40 bg-transparent border-white/30 text-white placeholder:text-slate-500 focus:border-white"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-medium mb-1.5 text-slate-300"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-2.5 rounded-full border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/40 bg-transparent border-white/30 text-white placeholder:text-slate-500 focus:border-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-white"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className={`p-3 rounded-xl border text-xs font-semibold flex items-start gap-2 ${error.includes('dinonaktifkan')
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}>
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              id="btn-login-submit"
              type="submit"
              disabled={isLoading}
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-full text-sm font-semibold transition-all cursor-pointer mt-4 border ${isLoading
                  ? 'bg-transparent border-slate-500 text-slate-400 cursor-not-allowed'
                  : 'bg-transparent border-white text-white hover:bg-white hover:text-[#0a192f] active:scale-[0.98]'
                }`}
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-emerald-300 border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {isLoading ? 'Memverifikasi...' : 'Masuk'}
            </button>
          </form>
        </div>

        {/* Footer Copyright */}
        <div className="mt-12 text-center">
          <p className="text-[10px] font-mono tracking-widest uppercase text-slate-400/60">
            &copy; 2026 BENGPUSKOMLEKAD <span className="opacity-70">x UNHAN RI</span>
          </p>
        </div>
      </div>
    </div>
  );
};
