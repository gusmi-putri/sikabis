/**
 * SI-JAGA — API Services Layer
 * Mengatur seluruh komunikasi HTTP antara Frontend React dan Backend Laravel.
 */

import axios from 'axios';
import {
  AccessLog,
  MotionEvent,
  DeviceStatus,
  Personnel,
  User,
  PIRMode,
  PirModeLog
} from '../types';

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
   * Batalkan command pending (ENROLL/DELETE) yang belum direspon key box.
   */
  cancelPendingCommand: async (): Promise<void> => {
    await api.post('/device/cancel-pending');
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
   * Mendaftarkan personel baru, memicu command ENROLL ke Key Box.
   */
  enrollPersonnel: async (data: { name: string; rank_nrp?: string; notes?: string }): Promise<Personnel> => {
    const response = await api.post('/personnel/enroll', data);
    return response.data.data || response.data;
  },

  /**
   * Mencabut akses personel, memicu command DELETE ke Key Box.
   */
  revokePersonnel: async (fingerprintId: number): Promise<void> => {
    await api.post('/personnel/revoke', { fingerprint_id: fingerprintId });
  },

  /**
   * Memperbarui data personel (nama, pangkat/NRP, catatan).
   */
  updatePersonnel: async (id: number, data: { name: string; rank_nrp?: string; notes?: string }): Promise<Personnel> => {
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
