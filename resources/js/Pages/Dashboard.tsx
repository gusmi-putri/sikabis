/**
 * SI-JAGA — Dashboard.tsx
 * Komponen utama halaman Dashboard SI-JAGA.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { APIService, SyncState } from '../services/api';
import { useAlertSound } from '../hooks/useAlertSound';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { ActivityLogView } from '../components/ActivityLogView';
import { resolveDisplayName } from '../components/AccessLogDetail';

// Layout
import { Sidebar } from '../components/Sidebar';
import { Topbar } from '../components/Topbar';

// Halaman & Komponen
import { LoginPage } from '../components/LoginPage';
import { StatCards } from '../components/StatCards';
import { AlertBanner } from '../components/AlertBanner';
import { PIRControlPanel } from '../components/PIRControlPanel';
import { LiveAccessTable } from '../components/LiveAccessTable';
import { MotionEventPanel } from '../components/MotionEventPanel';
import { AccessLogView } from '../components/AccessLogView';
import { MotionLogView } from '../components/MotionLogView';
import { PersonnelManagementView } from '../components/PersonnelManagementView';
import { UserManagementView } from '../components/UserManagementView';
import { PirModeLogPanel } from '../components/PirModeLogPanel';
import { LiveCameraPanel } from '../components/LiveCameraPanel';
import { DeviceStatusPanel, KeyboxCommand } from '../components/DeviceStatusPanel';
import { ExecutiveHardwareSummary } from '../components/ExecutiveHardwareSummary';

// Tipe & Data
import {
  AccessLog,
  AccessPhoto,
  MotionEvent,
  DeviceStatus,
  Personnel,
  PIRMode,
  DashboardStats,
  User,
  UserRole,
  PirModeLog,
  PersonnelInput,
} from '../types';
const FULL_REFRESH_MS = 60 * 1000;

export type NavTab = 'dashboard' | 'access-log' | 'motion-log' | 'manajemen-akses' | 'manajemen-user' | 'log-aktivitas';

const EMPTY_DEVICE_STATUS: DeviceStatus = {
  device_id: '—',
  status: 'offline',
  pir_mode: 'ON',
  sensor_label: 'Nyala',
  auto_arm_at: null,
  flash_on: false,
  stream_url: null,
  last_seen: new Date(0).toISOString(),
};

// Durasi idle sebelum session otomatis berakhir (milidetik)

export default function Dashboard() {
  const { isDark } = useTheme();
  const { toast } = useToast();

  // ── Auth & Role ─────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('sijaga_auth_user');
    const token = localStorage.getItem('sijaga_auth_token');
    return savedUser && token ? JSON.parse(savedUser) : null;
  });

  // ── Users Data (khusus Admin PAM) ───────────────────────────
  const [usersList, setUsersList] = useState<User[]>([]);

  // ── Navigasi ───────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  // ── Unsaved changes guard (form Registrasi Personel) ────────
  const [hasUnsavedForm, setHasUnsavedForm] = useState(false);
  const [pendingTab, setPendingTab] = useState<NavTab | null>(null);
  useEscapeKey(pendingTab !== null, () => setPendingTab(null));

  // Peringatan bawaan browser kalau tab ditutup/di-refresh saat form belum tersimpan.
  useEffect(() => {
    if (!hasUnsavedForm) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasUnsavedForm]);

  const handleSetActiveTab = useCallback((tab: NavTab) => {
    if (hasUnsavedForm && tab !== activeTab) {
      setPendingTab(tab);
    } else {
      setActiveTab(tab);
    }
  }, [hasUnsavedForm, activeTab]);

  // ── Data State ─────────────────────────────────────────────
  // Ref ini mencegah polling overwrite device status saat perintah PIR/flash
  // sedang dalam penerbangan ke server. Tanpa ini, optimistic update langsung
  // ditimpa balik oleh polling 2-detik sebelum server sempat diupdate.
  const deviceCmdPendingRef = useRef(false);

  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [unpairedPhotos, setUnpairedPhotos] = useState<AccessPhoto[]>([]);
  const [motionEvents, setMotionEvents] = useState<MotionEvent[]>([]);
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>(EMPTY_DEVICE_STATUS);
  const [keyboxStatus, setKeyboxStatus] = useState<DeviceStatus[]>([]);
  const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
  const [pirModeLogs, setPirModeLogs] = useState<PirModeLog[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Sidik jari perubahan terakhir yang sudah dimuat, dan kapan refresh penuh
  // terakhir -- dipakai polling hemat di bawah.
  const syncRef = useRef<Partial<Record<keyof SyncState, string | null>>>({});
  const lastFullRefreshRef = useRef(0);

  // ── Ambil data dari backend Laravel setelah login ──────────
  // silent=true dipakai untuk polling berkala di latar belakang, supaya
  // teks "Memuat data..." tidak berkedip tiap 15 detik.
  const refreshData = useCallback(async (user: User, silent = false) => {
    lastFullRefreshRef.current = Date.now();
    if (!silent) setIsLoadingData(true);
    setLoadError(null);
    try {
      const requests: Promise<void>[] = [
        APIService.getAccessLogs().then(setAccessLogs),
        APIService.getUnpairedAccessPhotos().then(setUnpairedPhotos),
        APIService.getMotionEvents().then(setMotionEvents),
        APIService.getPersonnelList().then(setPersonnelList),
        // Cek flag DI DALAM .then(), bukan di luar. Kalau cek di luar,
        // request yang sudah terlanjur dikirim sebelum klik tetap akan
        // memanggil setDeviceStatus saat responsnya tiba, meskipun flag
        // sudah diset true. Dengan cek di .then(), respons itu dibuang.
        APIService.getDeviceStatus().then((status) => {
          if (!deviceCmdPendingRef.current) setDeviceStatus(status);
        }),
        APIService.getKeyboxStatus().then(setKeyboxStatus),
        APIService.getPirModeLogs().then(setPirModeLogs),
      ];
      if (user.role === 'admin_pam') {
        requests.push(APIService.getUsersList().then(setUsersList));
      }
      await Promise.all(requests);
      setLastRefreshed(new Date());
    } catch (err) {
      if (!silent) setLoadError('Gagal memuat data dari server. Periksa koneksi ke backend Laravel.');
    } finally {
      if (!silent) setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      refreshData(currentUser);
    }
  }, [currentUser, refreshData]);

  // Polling hemat: tiap 2 detik hanya status perangkat dan sidik jari
  // perubahan (murah) yang diambil. Daftar log/foto/personel baru diunduh
  // ulang kalau sidik jarinya berubah. Refresh penuh tiap 60 detik menjadi
  // jaring pengaman kalau ada perubahan yang terlewat.
  const pollData = useCallback(async (user: User) => {
    if (Date.now() - lastFullRefreshRef.current > FULL_REFRESH_MS) {
      await refreshData(user, true);
      return;
    }
    try {
      await Promise.all([
        APIService.getDeviceStatus().then((status) => {
          if (!deviceCmdPendingRef.current) setDeviceStatus(status);
        }),
        APIService.getKeyboxStatus().then(setKeyboxStatus),
        APIService.getSyncState().then((sync) => {
          const known = syncRef.current;
          const tasks: Promise<void>[] = [];
          const whenChanged = (key: keyof SyncState, load: () => Promise<void>) => {
            if (known[key] === sync[key]) return;
            // Sidik jari baru dicatat setelah unduhan berhasil, jadi yang gagal dicoba lagi.
            tasks.push(load().then(() => { known[key] = sync[key]; }));
          };
          whenChanged('access_logs', () => APIService.getAccessLogs().then(setAccessLogs));
          whenChanged('access_photos', () => APIService.getUnpairedAccessPhotos().then(setUnpairedPhotos));
          whenChanged('motion_events', () => APIService.getMotionEvents().then(setMotionEvents));
          whenChanged('personnel', () => APIService.getPersonnelList().then(setPersonnelList));
          whenChanged('pir_mode_logs', () => APIService.getPirModeLogs().then(setPirModeLogs));
          if (user.role === 'admin_pam' && sync.users !== null) {
            whenChanged('users', () => APIService.getUsersList().then(setUsersList));
          }
          return Promise.all(tasks).then(() => undefined);
        }),
      ]);
      setLastRefreshed(new Date());
    } catch {
      // Endpoint ringan gagal (misal server lama): kembali ke pengambilan penuh.
      await refreshData(user, true);
    }
  }, [refreshData]);

  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => pollData(currentUser), 2000);
    return () => clearInterval(interval);
  }, [currentUser, pollData]);

  // ── Peringatan kejadian baru (toast + bunyi) ───────────────
  // ID terbesar yang sudah dilihat; kejadian dengan ID lebih besar dianggap
  // baru. Pemuatan pertama hanya mencatat, tidak memberi peringatan.
  const seenEventsRef = useRef<{ access: number; motion: number } | null>(null);
  const { enabled: soundEnabled, toggle: toggleSound, play: playSound } = useAlertSound();

  useEffect(() => {
    if (!lastRefreshed) return;
    const maxAccess = accessLogs.reduce((max, log) => Math.max(max, log.id), 0);
    const maxMotion = motionEvents.reduce((max, event) => Math.max(max, event.id), 0);
    const seen = seenEventsRef.current;
    seenEventsRef.current = { access: maxAccess, motion: maxMotion };
    if (!seen) return;

    // Dibatasi 3 per siklus supaya tidak membanjiri layar setelah koneksi pulih.
    const newLogs = accessLogs.filter((log) => log.id > seen.access).slice(0, 3);
    const newMotion = motionEvents.filter((event) => event.id > seen.motion).slice(0, 3);

    for (const log of newLogs) {
      const name = resolveDisplayName(log, personnelList);
      if (log.alarm) {
        toast(`ALARM: percobaan akses gagal berulang (${name}).`, 'error');
        playSound('alarm');
      } else if (log.result === 'failed') {
        toast(`Percobaan akses gagal: ${name}.`, 'warning');
        playSound('warning');
      } else {
        toast(`Akses berhasil: ${name}.`, 'info');
      }
    }
    for (const event of newMotion) {
      if (event.pir_mode === 'ON') {
        toast('Gerakan terdeteksi di gudang.', 'warning');
        playSound('warning');
      } else {
        toast('Gerakan terekam saat sensor mati.', 'info');
      }
    }
  }, [accessLogs, motionEvents, lastRefreshed, personnelList, toast, playSound]);

  // ── Statistik (dihitung dari log 24 jam terakhir) ──────────
  const now = Date.now();
  const h24 = 24 * 60 * 60 * 1000;
  const stats: DashboardStats = {
    accessSuccess24h: accessLogs.filter(
      (l) => l.result === 'success' && now - new Date(l.created_at).getTime() < h24
    ).length,
    accessFailed24h: accessLogs.filter(
      (l) => l.result === 'failed' && now - new Date(l.created_at).getTime() < h24
    ).length,
    motionEvents24h: motionEvents.filter(
      (e) => now - new Date(e.created_at).getTime() < h24
    ).length,
  };

  // ── Ada motion event baru saat sensor Nyala? atau Alarm Fingerprint? (untuk AlertBanner) ──
  const latestMotion = motionEvents[0] ?? null;
  const hasMotionAlert =
    latestMotion !== null &&
    latestMotion.pir_mode === 'ON' &&
    now - new Date(latestMotion.created_at).getTime() < 10 * 60 * 1000; // 10 menit terakhir

  const latestFailedAccess = accessLogs.find(l => l.alarm) ?? null;
  const hasFingerprintAlert = 
    latestFailedAccess !== null &&
    now - new Date(latestFailedAccess.created_at).getTime() < 10 * 60 * 1000;

  const [alertDismissed, setAlertDismissed] = useState(false);
  
  let activeAlertType: 'motion' | 'fingerprint' | null = null;
  if (!alertDismissed) {
    if (hasFingerprintAlert && hasMotionAlert) {
      // Prioritaskan yang paling baru
      activeAlertType = new Date(latestFailedAccess!.created_at).getTime() > new Date(latestMotion!.created_at).getTime()
        ? 'fingerprint'
        : 'motion';
    } else if (hasFingerprintAlert) {
      activeAlertType = 'fingerprint';
    } else if (hasMotionAlert) {
      activeAlertType = 'motion';
    }
  }

  const showAlert = activeAlertType !== null;

  // ── Kamera kotak kunci (Board B), dipakai panel live feed-nya ──
  const keyboxCam = keyboxStatus.find((d) => d.device_id === 'kotak-kunci-cam-01') ?? null;

  // ── Aksi: Ubah status sensor PIR ────────────────────────────
  const handleSetPIRMode = async (mode: PIRMode, durationMinutes?: number) => {
    const prevStatus = deviceStatus;

    const autoArmAt = mode === 'OFF' && durationMinutes
      ? new Date(Date.now() + durationMinutes * 60000).toISOString()
      : null;

    setDeviceStatus((prev) => ({ ...prev, pir_mode: mode, auto_arm_at: autoArmAt }));
    deviceCmdPendingRef.current = true;
    try {
      await APIService.setPIRMode(mode, durationMinutes);
      // Fetch status segar setelah server konfirmasi — jangan tunggu polling
      const fresh = await APIService.getDeviceStatus();
      setDeviceStatus(fresh);
      APIService.getPirModeLogs().then(setPirModeLogs);
      toast(mode === 'ON' ? 'Sensor PIR diaktifkan.' : 'Sensor PIR dimatikan.', 'success');
    } catch {
      setDeviceStatus(prevStatus);
      toast('Gagal mengubah mode PIR. Coba lagi.', 'error');
    } finally {
      deviceCmdPendingRef.current = false;
    }
  };

  // ── Aksi: Nyalakan/matikan flash LED ESP32-CAM ─────────────
  const handleToggleFlash = async (on: boolean) => {
    const prevStatus = deviceStatus;
    setDeviceStatus((prev) => ({ ...prev, flash_on: on }));
    deviceCmdPendingRef.current = true;
    try {
      await APIService.setFlash(on);
      const fresh = await APIService.getDeviceStatus();
      setDeviceStatus(fresh);
      toast(on ? 'Flash LED dinyalakan.' : 'Flash LED dimatikan.', 'success');
    } catch {
      setDeviceStatus(prevStatus);
      toast('Gagal mengubah flash. Coba lagi.', 'error');
    } finally {
      deviceCmdPendingRef.current = false;
    }
  };

  // ── Aksi: Kirim perintah ke kotak kunci (mute alarm / paksa kunci) ──
  const handleKeyboxCommand = async (command: KeyboxCommand) => {
    try {
      await APIService.sendKeyboxCommand(command);
      const labels: Record<KeyboxCommand, string> = {
        MUTE_ALARM: 'Alarm dimatikan.',
        FORCE_LOCK: 'Perintah paksa kunci terkirim.',
        TEST_BUZZER: 'Perintah uji buzzer terkirim.',
        TEST_TRIGGER: 'Perintah uji kamera terkirim.',
        RESET_SENSOR: 'Perintah reset sensor terkirim.',
      };
      toast(labels[command], 'success');
    } catch {
      toast('Perintah gagal terkirim ke kotak kunci.', 'error');
    }
  };

  // ── Aksi: Logout ───────────────────────────────────────────
  const handleLogout = async () => {
    try {
      await APIService.logout();
    } catch (err) {
      // Token mungkin sudah kadaluarsa; lanjutkan logout di sisi client.
    }
    setCurrentUser(null);
    setActiveTab('dashboard');
    setAccessLogs([]);
    setUnpairedPhotos([]);
    setMotionEvents([]);
    setPersonnelList([]);
    setUsersList([]);
    setPirModeLogs([]);
    setDeviceStatus(EMPTY_DEVICE_STATUS);
    setKeyboxStatus([]);
    setLastRefreshed(null);
    syncRef.current = {};
    seenEventsRef.current = null;
  };

  // ── Aksi: Buang foto kotak kunci yang tidak punya log ──────
  const handleDeleteUnpairedPhoto = async (id: number) => {
    await APIService.deleteUnpairedAccessPhoto(id);
    setUnpairedPhotos((photos) => photos.filter((photo) => photo.id !== id));
  };

  const handleDeleteAllUnpairedPhotos = async () => {
    await APIService.deleteAllUnpairedAccessPhotos();
    setUnpairedPhotos([]);
  };

  // ── Aksi: Catat personel yang sidik jarinya sudah didaftarkan di Board A ──
  const handleCreatePersonnel = async (data: PersonnelInput) => {
    await APIService.createPersonnel(data);
    if (currentUser) await refreshData(currentUser);
    toast('Personel berhasil didaftarkan.', 'success');
  };

  // ── Aksi: Cabut akses personel ──────────────────────────────
  const handleDeactivatePersonnel = async (id: number) => {
    await APIService.deactivatePersonnel(id);
    if (currentUser) await refreshData(currentUser);
    toast('Akses personel berhasil dicabut.', 'success');
  };

  // ── Aksi: Update data personel ───────────────────────────────
  const handleUpdatePersonnel = async (id: number, data: PersonnelInput) => {
    await APIService.updatePersonnel(id, data);
    if (currentUser) await refreshData(currentUser);
    toast('Data personel berhasil diperbarui.', 'success');
  };

  // ── Aksi: Tambah akun baru (Admin PAM) ───────────────
  const handleAddPiketUser = async (data: { name: string; username: string; password: string; role?: UserRole }) => {
    await APIService.createPiketUser({ ...data, role: data.role || 'piket' });
    const updated = await APIService.getUsersList();
    setUsersList(updated);
    toast(`Akun ${data.role === 'pimpinan' ? 'pimpinan' : 'piket'} berhasil dibuat.`, 'success');
  };

  // ── Aksi: Toggle status aktif akun piket ───────────────────
  const handleToggleUserActive = async (userId: number) => {
    const updated = await APIService.toggleUserActiveStatus(userId);
    setUsersList((prev) => prev.map((u) => (u.id === userId ? updated : u)));
    toast(updated.is_active ? 'Akun diaktifkan.' : 'Akun dinonaktifkan.', 'info');
  };

  // ── Aksi: Update akun piket ────────────────────────────────
  const handleUpdateUser = async (userId: number, data: Partial<User>) => {
    const updated = await APIService.updatePiketUser(userId, data);
    setUsersList((prev) => prev.map((u) => (u.id === userId ? updated : u)));
    toast('Data akun berhasil diperbarui.', 'success');
  };

  // ── Aksi: Hapus akun piket ─────────────────────────────────
  const handleDeleteUser = async (userId: number) => {
    await APIService.deleteUser(userId);
    setUsersList((prev) => prev.filter((u) => u.id !== userId));
    toast('Akun berhasil dihapus.', 'success');
  };

  // ── Render ─────────────────────────────────────────────────
  if (!currentUser) {
    return <LoginPage onLogin={(user) => setCurrentUser(user)} />;
  }

  // RBAC Check for rendering tabs
  if (
    currentUser.role !== 'admin_pam' &&
    (activeTab === 'manajemen-akses' || activeTab === 'manajemen-user' || activeTab === 'log-aktivitas')
  ) {
    setActiveTab('dashboard');
  }

  return (
    <div
      className={`min-h-screen font-sans transition-colors duration-300 relative ${
        isDark ? 'bg-[#020617] text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Ambient Sci-Fi Glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {isDark ? (
          <>
            <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] bg-blue-600/20" />
            <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] bg-cyan-500/15" />
            <div className="absolute top-[40%] left-[20%] w-[30%] h-[30%] rounded-full blur-[100px] bg-indigo-500/10" />
          </>
        ) : (
          <>
            <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] bg-emerald-500/15" />
            <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px] bg-sky-500/15" />
            <div className="absolute top-[40%] left-[20%] w-[30%] h-[30%] rounded-full blur-[100px] bg-indigo-500/10" />
          </>
        )}
      </div>

      {/* Kontainer Utama */}
      <div className="relative z-10 flex flex-row w-full min-h-screen">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleSetActiveTab}
          userRole={currentUser.role}
        />

        {/* Main Column */}
        <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <Topbar
          operatorName={currentUser.name}
          operatorRole={currentUser.role}
          lastRefreshed={lastRefreshed}
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
          onLogout={handleLogout}
        />

        {/* Konten Utama */}
        <main className="p-4 sm:p-6 space-y-5 max-w-7xl w-full mx-auto">

          {isLoadingData && (
            <div className="text-[11px] font-mono text-slate-500">Memuat data dari server…</div>
          )}

          {loadError && (
            <div className="p-3 rounded-lg border text-xs font-semibold bg-red-500/10 border-red-500/30 text-red-400">
              {loadError}
            </div>
          )}

          {/* ── DASHBOARD ──────────────────────────────────── */}
          {activeTab === 'dashboard' && (
            <div className="space-y-5">
              <AlertBanner
                isVisible={showAlert}
                alertType={activeAlertType}
                latestEvent={latestMotion}
                latestAccess={latestFailedAccess}
                onDismiss={() => setAlertDismissed(true)}
                onViewLog={() => {
                  setAlertDismissed(true);
                  setActiveTab(activeAlertType === 'motion' ? 'motion-log' : 'access-log');
                }}
              />
              <StatCards stats={stats} />
              {currentUser.role === 'pimpinan' ? (
                <ExecutiveHardwareSummary
                  deviceStatus={deviceStatus}
                  keyboxStatus={keyboxStatus}
                />
              ) : (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
                    <PIRControlPanel
                      deviceStatus={deviceStatus}
                      onSetMode={handleSetPIRMode}
                    />
                    <DeviceStatusPanel
                      title="Status Kotak Kunci"
                      description="Sidik jari dan kamera"
                      devices={keyboxStatus}
                      onKeyboxCommand={handleKeyboxCommand}
                    />
                  </div>
                  <LiveCameraPanel
                    deviceId={deviceStatus.device_id}
                    status={deviceStatus.status}
                    streamUrl={deviceStatus.stream_url}
                    flashOn={deviceStatus.flash_on}
                    onToggleFlash={handleToggleFlash}
                  />
                  <LiveCameraPanel
                    deviceId={keyboxCam?.device_id ?? 'kotak-kunci-cam-01'}
                    status={keyboxCam?.status ?? 'offline'}
                    streamUrl={keyboxCam?.stream_url ?? null}
                  />
                </>
              )}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <LiveAccessTable
                  logs={accessLogs.slice(0, 5)}
                  personnelList={personnelList}
                />
                <MotionEventPanel
                  events={motionEvents.slice(0, 5)}
                />
              </div>
              <PirModeLogPanel logs={pirModeLogs} />
            </div>
          )}

          {/* ── ACCESS LOG ─────────────────────────────────── */}
          {activeTab === 'access-log' && (
            <AccessLogView
              logs={accessLogs}
              personnelList={personnelList}
              unpairedPhotos={unpairedPhotos}
              onDeleteUnpairedPhoto={currentUser.role === 'admin_pam' ? handleDeleteUnpairedPhoto : undefined}
              onDeleteAllUnpairedPhotos={currentUser.role === 'admin_pam' ? handleDeleteAllUnpairedPhotos : undefined}
            />
          )}

          {/* ── MOTION LOG ─────────────────────────────────── */}
          {activeTab === 'motion-log' && (
            <MotionLogView 
              events={motionEvents} 
              deviceStatus={deviceStatus}
              onToggleFlash={currentUser.role === 'pimpinan' ? async () => {} : handleToggleFlash}
              showLiveCamera={currentUser.role !== 'pimpinan'}
            />
          )}

          {/* ── MANAJEMEN AKSES (Khusus Admin) ─────────────── */}
          {activeTab === 'manajemen-akses' && currentUser.role === 'admin_pam' && (
            <PersonnelManagementView
              personnelList={personnelList}
              keyboxStatus={keyboxStatus}
              onCreate={handleCreatePersonnel}
              onDeactivate={handleDeactivatePersonnel}
              onUpdate={handleUpdatePersonnel}
              onDirtyChange={setHasUnsavedForm}
            />
          )}
          
          {/* ── MANAJEMEN USER (Khusus Admin) ──────────────── */}
          {activeTab === 'manajemen-user' && currentUser.role === 'admin_pam' && (
            <UserManagementView
              currentUser={currentUser}
              usersList={usersList}
              onAddPiket={handleAddPiketUser}
              onToggleActive={handleToggleUserActive}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
            />
          )}

          {/* ── LOG AKTIVITAS (Khusus Admin) ───────────────── */}
          {activeTab === 'log-aktivitas' && currentUser.role === 'admin_pam' && <ActivityLogView />}
        </main>
      </div>
      </div>

      {/* Modal: Konfirmasi navigasi dengan form belum tersimpan */}
      {pendingTab !== null && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`rounded-xl border max-w-sm w-full p-5 shadow-2xl ${
            isDark ? 'bg-slate-900 border-amber-500/40' : 'bg-white border-amber-300'
          }`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-full ${isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600'}`}>
                <span className="text-lg">⚠️</span>
              </div>
              <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Form belum disimpan
              </h3>
            </div>
            <p className={`text-sm leading-relaxed mb-5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Ada data yang belum disimpan di form registrasi personel. Yakin ingin meninggalkan halaman ini?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setPendingTab(null)}
                className={`px-4 py-2 rounded text-sm font-semibold transition-colors cursor-pointer border ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                    : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700'
                }`}
              >
                Kembali ke Form
              </button>
              <button
                onClick={() => {
                  setHasUnsavedForm(false);
                  setActiveTab(pendingTab!);
                  setPendingTab(null);
                }}
                className="px-4 py-2 rounded bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                Tinggalkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
