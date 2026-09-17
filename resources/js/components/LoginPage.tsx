/**
 * SI-JAGA — LoginPage.tsx
 * Halaman login untuk operator jaga.
 * Disesuaikan untuk memvalidasi berdasarkan usersList mock
 * dan mengecek is_active.
 */

import React, { useState } from 'react';
import { Shield, Lock, User as UserIcon, Eye, EyeOff, LogIn, AlertTriangle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { User } from '../types';
import { APIService } from '../services/api';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const { isDark } = useTheme();
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
      }

      onLogin(user);
    } catch (err: any) {
      const message: string =
        err?.response?.data?.errors?.username?.[0] ||
        err?.response?.data?.message ||
        'Username atau password salah.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-200 ${
        isDark ? 'bg-slate-950' : 'bg-slate-100'
      }`}
    >
      {/* Background subtle grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(${isDark ? '#10b981' : '#047857'} 1px, transparent 1px), linear-gradient(90deg, ${isDark ? '#10b981' : '#047857'} 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />

      <div className="w-full max-w-sm relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-900/40 mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            SI-JAGA
          </h1>
          <p className={`text-xs font-mono mt-1 tracking-widest uppercase ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
            Sistem Info Jaga Gudang
          </p>
        </div>

        {/* Card Login */}
        <div
          className={`rounded-xl border p-6 shadow-xl ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className={`text-center mb-6 pb-5 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <h2 className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              Login Sistem
            </h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              Gunakan akun admin atau piket Anda
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label
                htmlFor="login-username"
                className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
              >
                Username
              </label>
              <div className="relative">
                <UserIcon className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                <input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin atau piket"
                  className={`w-full pl-9 pr-3 py-2.5 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                    isDark
                      ? 'bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-600 focus:border-emerald-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500'
                  }`}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="login-password"
                className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
              >
                Password
              </label>
              <div className="relative">
                <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full pl-9 pr-10 py-2.5 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                    isDark
                      ? 'bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-600 focus:border-emerald-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className={`p-3 rounded-lg border text-xs font-semibold flex items-start gap-2 ${
                error.includes('dinonaktifkan')
                  ? isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-amber-50 border-amber-300 text-amber-700'
                  : isDark ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-red-50 border-red-300 text-red-700'
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
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all cursor-pointer mt-1 ${
                isLoading
                  ? 'bg-emerald-700 text-emerald-200 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/30 active:scale-[0.98]'
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

        {/* Footer note */}
        <div className={`mt-5 text-center text-[10px] font-mono leading-relaxed ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
          <p>Admin PAM: <span className="font-bold">admin / 123</span></p>
          <p>Piket Jaga: <span className="font-bold">piket / 123</span></p>
          <p>Piket Nonaktif: <span className="font-bold">piket2 / 123</span></p>
        </div>
      </div>
    </div>
  );
};
