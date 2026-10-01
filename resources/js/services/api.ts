/**
 * SI-JAGA — API Services Layer
 * Mengatur seluruh komunikasi HTTP antara Frontend React dan Backend Laravel.
 */

import axios from 'axios';
import {
  AccessLog,
  AccessPhoto,
  MotionEvent,
  DeviceStatus,
  Personnel,
  PersonnelInput,
  User,
  PIRMode,
  PirModeLog
} from '../types';

/**
 * Pesan yang layak ditampilkan dari error request: pesan validasi
 * pertama dari Laravel (422), atau pesan umum.
 */
export function apiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const errors = err.response?.data?.errors as Record<string, string[]> | undefined;
    const first = errors && Object.values(errors)[0]?.[0];
    return first || err.response?.data?.message || 'Gagal menghubungi server.';
  }
  return 'Terjadi kesalahan.';
}

// Konfigurasi dasar Axios
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  // Izinkan pengiriman cookie jika menggunakan Laravel Sanctum (SPA Authentication)
  withCredentials: true 
});

// Interceptor untuk menyisipkan Bearer Token (jika menggunakan JWT/Token Based auth)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sijaga_auth_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor untuk merespon error global (misal: Token expired / 401 Unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Force logout jika token kadaluarsa
      localStorage.removeItem('sijaga_auth_token');
      localStorage.removeItem('sijaga_auth_user');
      window.location.reload(); 
    }
    return Promise.reject(error);
  }
);

export const APIService = {
  // ── 1. AUTHENTICATION ──────────────────────────────────────────

  /**
   * Login pengguna (Admin PAM / Piket Jaga).
   * Dalam implementasi asli Laravel Sanctum, pastikan Anda memanggil
   * '/sanctum/csrf-cookie' terlebih dahulu sebelum '/api/login'
   * jika menggunakan cookie-based session.
   */
  login: async (username: string, password: string): Promise<{ user: User; token?: string }> => {
    const response = await api.post('/login', { username, password });
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/logout');
    localStorage.removeItem('sijaga_auth_token');
    localStorage.removeItem('sijaga_auth_user');
  },

  // ── 2. LOGS & DATA FETCHING (DASHBOARD) ─────────────────────────

  getAccessLogs: async (): Promise<AccessLog[]> => {
    const response = await api.get('/access-logs');
    return response.data.data || response.data;
  },

  getUnpairedAccessPhotos: async (): Promise<AccessPhoto[]> => {
    const response = await api.get('/access-photos/unpaired');
    return response.data.data || response.data;
  },

  // Khusus Admin PAM: buang foto tanpa log yang tidak berguna.
  deleteUnpairedAccessPhoto: async (id: number): Promise<void> => {
    await api.delete(`/access-photos/${id}`);
  },

  deleteAllUnpairedAccessPhotos: async (): Promise<void> => {
    await api.delete('/access-photos/unpaired');
  },

  getMotionEvents: async (): Promise<MotionEvent[]> => {
    const response = await api.get('/motion-events');
    return response.data.data || response.data;
  },

  getPersonnelList: async (): Promise<Personnel[]> => {
    const response = await api.get('/personnel');
    return response.data.data || response.data;
  },

  // Khusus Admin PAM
  getUsersList: async (): Promise<User[]> => {
    const response = await api.get('/users');
    return response.data.data || response.data;
  },

  // ── 3. DEVICE STATUS & CONTROL (ESP32) ──────────────────────────

  getDeviceStatus: async (): Promise<DeviceStatus> => {
    const response = await api.get('/device-status');
    return response.data.data || response.data;
  },

  /**
   * Status online/offline kotak kunci (Board A) dan kameranya (Board B).
   */
  getKeyboxStatus: async (): Promise<DeviceStatus[]> => {
    const response = await api.get('/keybox-status');
    return response.data.data || response.data;
  },

  /**
   * Kirim perintah ke kotak kunci (Board A): mute alarm atau paksa kunci.
   * TIDAK ADA perintah buka solenoid dari jarak jauh, itu keputusan
   * keamanan yang disengaja.
   */
  sendKeyboxCommand: async (
    command: 'MUTE_ALARM' | 'FORCE_LOCK' | 'TEST_BUZZER' | 'TEST_TRIGGER' | 'RESET_SENSOR'
  ): Promise<void> => {
    await api.post('/keybox/command', { command });
  },

  /**
   * Mulai mode daftar sidik jari baru di Board A untuk ID tertentu.
   * Device tetap butuh sentuhan fisik dua kali ke sensor untuk
   * menyelesaikannya -- ini cuma menghilangkan keharusan buka Serial
   * Monitor untuk mengetik nomor ID-nya.
   */
  enrollFingerprint: async (id: number): Promise<void> => {
    await api.post('/keybox/command', { command: 'ENROLL', target: id });
  },

  setPIRMode: async (mode: PIRMode, duration_minutes?: number): Promise<void> => {
    await api.post('/device/pir-mode', { mode, duration_minutes });
  },

  /**
   * Nyalakan/matikan flash LED ESP32-CAM. Firmware mengambil perubahan
   * ini lewat polling /device/command (mekanisme sama seperti pir_mode).
   */
  setFlash: async (on: boolean): Promise<void> => {
    await api.post('/device/flash', { on });
  },

  /**
   * Riwayat nyala/mati sensor PIR, dari web maupun Telegram.
   */
  getPirModeLogs: async (): Promise<PirModeLog[]> => {
    const response = await api.get('/device/pir-mode-logs');
    return response.data.data || response.data;
  },

  // ── 4. MANAJEMEN AKSES KEY BOX (FISIK) ──────────────────────────

  /**
   * Mencatat personel yang sidik jarinya sudah didaftarkan di Board A.
   */
  createPersonnel: async (data: PersonnelInput): Promise<Personnel> => {
    const response = await api.post('/personnel', data);
    return response.data.data || response.data;
  },

  /**
   * Mencabut akses personel dan melepas ID sidik jarinya.
   */
  deactivatePersonnel: async (id: number): Promise<void> => {
    await api.post(`/personnel/${id}/deactivate`);
  },

  /**
   * Memperbarui data personel (nama, pangkat/NRP, ID sidik jari, catatan).
   */
  updatePersonnel: async (id: number, data: PersonnelInput): Promise<Personnel> => {
    const response = await api.put(`/personnel/${id}`, data);
    return response.data.data || response.data;
  },

  // ── 5. MANAJEMEN USER (AKUN PIKET) ───────────────────────────────

  createPiketUser: async (data: Partial<User>): Promise<User> => {
    const response = await api.post('/users', data);
    return response.data.data || response.data;
  },

  toggleUserActiveStatus: async (userId: number): Promise<User> => {
    const response = await api.patch(`/users/${userId}/toggle-active`);
    return response.data.data || response.data;
  },

  updatePiketUser: async (userId: number, data: Partial<User>): Promise<User> => {
    const response = await api.put(`/users/${userId}`, data);
    return response.data.data || response.data;
  },

  deleteUser: async (userId: number): Promise<void> => {
    await api.delete(`/users/${userId}`);
  }
};
