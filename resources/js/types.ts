// ============================================================
// SI-JAGA — Tipe Data Sesuai Struktur Backend Laravel + MySQL
// ============================================================

// ---- Enumerasi & Literal Types ----

export type AccessResult = 'success' | 'failed';

export type PIRMode = 'ARMED' | 'ACTIVITY';

export type PendingCommand = 'NONE' | 'ENROLL' | 'DELETE';

export type PersonnelStatus =
  | 'pending_enroll'
  | 'active'
  | 'pending_revoke'
  | 'inactive'
  | 'failed';

export type DeviceOnlineStatus = 'online' | 'offline';

export type UserRole = 'piket' | 'admin_pam';

// ---- Model: users (Akun Sistem) ----
export interface User {
  id: number;
  name: string;
  username: string;
  password?: string; // Di frontend hanya sebagai mock, aslinya hashing di backend
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

// ---- Model: access_logs ----
// Setiap kali seseorang scan jari di key box (berhasil ATAU gagal),
// kamera memotret dan data ini dicatat di backend.
export interface AccessLog {
  id: number;
  fingerprint_id: number;           // ID finger yang ter-scan di sensor
  result: AccessResult;             // 'success' | 'failed'
  image_path: string | null;        // path foto dari kamera key box (nullable)
  device_id: string;
  created_at: string;               // ISO 8601 string

  // Field yang di-resolve di frontend (bukan dari DB langsung):
  // Dicari berdasarkan fingerprint_id → personnel.fingerprint_id
  personnel_name?: string;          // Nama personel, atau undefined jika tidak ketemu
}

// ---- Model: motion_events ----
// Setiap kali PIR di gudang mendeteksi gerakan, ESP32-CAM memotret.
export interface MotionEvent {
  id: number;
  image_path: string | null;        // path foto dari ESP32-CAM (nullable)
  pir_mode: PIRMode;                // Mode PIR saat event terjadi
  device_id: string;
  created_at: string;               // ISO 8601 string
}

// ---- Model: device_status ----
// Status live dari perangkat IoT (key box + ESP32 gudang).
export interface DeviceStatus {
  device_id: string;
  status: DeviceOnlineStatus;       // 'online' | 'offline'
  pir_mode: PIRMode;                // Mode PIR aktif saat ini
  flash_on: boolean;                // Status LED flash ESP32-CAM (tersinkron dua arah dgn Telegram)
  stream_url: string | null;        // URL MJPEG live stream, dilaporkan device sendiri via heartbeat
  last_seen: string;                // ISO 8601 string
  pending_command: PendingCommand;  // Perintah pending ke device
  pending_target: number | null;    // fingerprint_id target (untuk DELETE)
  pending_since: string | null;     // ISO 8601 string, kapan command dikirim
}

// ---- Model: personnel ----
// Data personel yang terdaftar di sistem.
// PENTING: fingerprint_id bisa null (belum terdaftar / gagal enroll).
export interface Personnel {
  id: number;
  name: string;
  rank_nrp: string | null;          // Pangkat / NRP (opsional)
  fingerprint_id: number | null;    // ID di sensor fisik (null sampai enroll berhasil)
  status: PersonnelStatus;
  notes: string | null;
  created_at: string;               // ISO 8601 string
}

// ---- Model: pir_mode_logs ----
// Riwayat nyala/mati sensor PIR, dari web (Admin PAM) maupun Telegram.
export interface PirModeLog {
  id: number;
  device_id: string;
  pir_mode: PIRMode;                // 'ARMED' (nyala) | 'ACTIVITY' (mati)
  source: 'web' | 'telegram';
  changed_by: string | null;        // nama user, null kalau dari Telegram
  created_at: string;               // ISO 8601 string
}

// ---- Statistik Dashboard (dihitung di frontend dari data log) ----
export interface DashboardStats {
  accessSuccess24h: number;         // Akses berhasil 24 jam terakhir
  accessFailed24h: number;          // Akses gagal 24 jam terakhir
  motionEvents24h: number;          // Motion event 24 jam terakhir
}
