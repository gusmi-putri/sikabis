// ============================================================
// SI-JAGA — Mock Data (digunakan sampai API backend tersambung)
// ============================================================
import {
  AccessLog,
  MotionEvent,
  DeviceStatus,
  Personnel,
  User,
} from '../types';

// Helpers
const ago = (minutes: number) =>
  new Date(Date.now() - minutes * 60 * 1000).toISOString();

// ---- Users (Akun Login) ----
export const INITIAL_USERS: User[] = [
  {
    id: 1,
    name: 'Letkol Admin PAM',
    username: 'admin',
    password: '123',
    role: 'admin_pam',
    is_active: true,
    created_at: ago(100000),
  },
  {
    id: 2,
    name: 'Kopda Piket Jaga 1',
    username: 'piket',
    password: '123',
    role: 'piket',
    is_active: true,
    created_at: ago(50000),
  },
  {
    id: 3,
    name: 'Praka Piket Jaga 2',
    username: 'piket2',
    password: '123',
    role: 'piket',
    is_active: false, // Akun dinonaktifkan
    created_at: ago(10000),
  }
];

// ---- Personnel ----
export const INITIAL_PERSONNEL: Personnel[] = [
  {
    id: 1,
    name: 'Letkol Inf Hendra Gunawan',
    rank_nrp: 'Letkol Inf / 11020011220675',
    fingerprint_id: 1,
    status: 'active',
    notes: null,
    created_at: ago(14400),
  },
  {
    id: 2,
    name: 'Kapten Chb Bambang Suryanto',
    rank_nrp: 'Kapten Chb / 11090023410788',
    fingerprint_id: 2,
    status: 'active',
    notes: null,
    created_at: ago(10000),
  },
  {
    id: 3,
    name: 'Serma Cpl Dedi Prasetyo',
    rank_nrp: 'Serma Cpl / 21120045610892',
    fingerprint_id: 3,
    status: 'active',
    notes: 'Teknisi gudang shift malam',
    created_at: ago(7200),
  },
  {
    id: 4,
    name: 'Sertu Inf Agus Wijayanto',
    rank_nrp: 'Sertu Inf / 31140089210995',
    fingerprint_id: 4,
    status: 'active',
    notes: null,
    created_at: ago(5000),
  },
  {
    id: 5,
    name: 'Kopda Chb Rian Saputra',
    rank_nrp: 'Kopda Chb / 31180091221001',
    fingerprint_id: 5,
    status: 'active',
    notes: 'Operator jaga pos 1',
    created_at: ago(2000),
  },
  {
    id: 6,
    name: 'Praka Inf Budi Santoso',
    rank_nrp: 'Praka Inf / 41200099221012',
    fingerprint_id: null,
    status: 'pending_enroll',
    notes: 'Personel baru, menunggu enroll fingerprint',
    created_at: ago(30),
  },
  {
    id: 7,
    name: 'Serda Chb Wahyu Nugroho',
    rank_nrp: 'Serda Chb / 31190094221008',
    fingerprint_id: 7,
    status: 'inactive',
    notes: 'Mutasi ke satuan lain',
    created_at: ago(20000),
  },
];

// ---- Access Logs ----
// Simulasi log fingerprint key box (berhasil & gagal)
export const INITIAL_ACCESS_LOGS: AccessLog[] = [
  {
    id: 4,
    fingerprint_id: 2,
    result: 'success',
    image_path: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
    device_id: 'KEYBOX-01',
    created_at: ago(5),
    personnel_name: 'Kapten Chb Bambang Suryanto',
  },
  {
    id: 3,
    fingerprint_id: 3,
    result: 'success',
    image_path: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
    device_id: 'KEYBOX-01',
    created_at: ago(18),
    personnel_name: 'Serma Cpl Dedi Prasetyo',
  },
  {
    id: 2,
    fingerprint_id: 99,
    result: 'failed',
    image_path: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80',
    device_id: 'KEYBOX-01',
    created_at: ago(42),
    personnel_name: undefined, // fingerprint_id tidak ketemu di data personel
  },
  {
    id: 1,
    fingerprint_id: 5,
    result: 'success',
    image_path: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80',
    device_id: 'KEYBOX-01',
    created_at: ago(65),
    personnel_name: 'Kopda Chb Rian Saputra',
  },
  {
    id: 0,
    fingerprint_id: 1,
    result: 'success',
    image_path: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&auto=format&fit=crop&q=80',
    device_id: 'KEYBOX-01',
    created_at: ago(130),
    personnel_name: 'Letkol Inf Hendra Gunawan',
  },
];

// ---- Motion Events ----
// Simulasi log deteksi PIR di gudang
export const INITIAL_MOTION_EVENTS: MotionEvent[] = [
  {
    id: 3,
    image_path: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&auto=format&fit=crop&q=80',
    pir_mode: 'ARMED',
    device_id: 'ESP32-GUDANG-01',
    created_at: ago(8),
  },
  {
    id: 2,
    image_path: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=400&auto=format&fit=crop&q=80',
    pir_mode: 'ACTIVITY',
    device_id: 'ESP32-GUDANG-01',
    created_at: ago(55),
  },
  {
    id: 1,
    image_path: null, // tidak ada foto (kamera gagal capture)
    pir_mode: 'ARMED',
    device_id: 'ESP32-GUDANG-01',
    created_at: ago(180),
  },
];

// ---- Device Status ----
export const INITIAL_DEVICE_STATUS: DeviceStatus = {
  device_id: 'ESP32-GUDANG-01',
  status: 'online',
  pir_mode: 'ARMED',
  flash_on: false,
  stream_url: null,
  last_seen: ago(0.5),
  pending_command: 'NONE',
  pending_target: null,
  pending_since: null,
};

// ---- Helper: Resolve nama personel dari fingerprint_id ----
export function resolvePersonnelName(
  fingerprintId: number,
  personnelList: Personnel[]
): string {
  const found = personnelList.find((p) => p.fingerprint_id === fingerprintId);
  return found ? found.name : `Fingerprint #${fingerprintId}`;
}
