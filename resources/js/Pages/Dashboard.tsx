/**
 * SI-JAGA — Dashboard.tsx (Migrasi dari App.tsx)
 * Root komponen untuk halaman Dashboard dengan Inertia.js
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { APIService } from '../services/api';

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
  PirModeLog,
  PersonnelInput,
} from '../types';
export type NavTab = 'dashboard' | 'access-log' | 'motion-log' | 'manajemen-akses' | 'manajemen-user';

const EMPTY_DEVICE_STATUS: DeviceStatus = {
  device_id: '—',
  status: 'offline',
  pir_mode: 'ON',
  auto_arm_at: null,
  flash_on: false,
  stream_url: null,
  last_seen: new Date(0).toISOString(),
};

// Durasi idle sebelum session otomatis berakhir (milidetik)
const IDLE_TIMEOUT_MS   = 15 * 60 * 1000;   // 15 menit
const IDLE_WARNING_MS   = 14 * 60 * 1000;   // peringatan di menit ke-14

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

  const handleSetActiveTab = useCallback((tab: NavTab) => {
    if (hasUnsavedForm && tab !== activeTab) {
      setPendingTab(tab);
    } else {
      setActiveTab(tab);
    }
  }, [hasUnsavedForm, activeTab]);

  // ── Idle session timeout ────────────────────────────────────
  const lastActivityRef = useRef(Date.now());
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const [idleCountdown, setIdleCountdown] = useState(60);

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

  // ── Ambil data dari backend Laravel setelah login ──────────
  // silent=true dipakai untuk polling berkala di latar belakang, supaya
  // teks "Memuat data..." tidak berkedip tiap 15 detik.
  const refreshData = useCallback(async (user: User, silent = false) => {
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

  // Poll berkala supaya perubahan dari luar tab ini (device fisik lewat
  // Telegram, atau operator lain) ikut muncul tanpa perlu reload manual.
  // Diubah ke 2 detik agar status (lampu, sensor PIR) lebih update secara real-time.
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => refreshData(currentUser, true), 2000);
    return () => clearInterval(interval);
  }, [currentUser, refreshData]);

  // ── Idle session timeout ────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;

    const resetIdle = () => { lastActivityRef.current = Date.now(); };
    window.addEventListener('mousemove', resetIdle, { passive: true });
    window.addEventListener('keydown',   resetIdle, { passive: true });
    window.addEventListener('click',     resetIdle, { passive: true });
    window.addEventListener('touchstart',resetIdle, { passive: true });

    const check = setInterval(() => {
      const idle = Date.now() - lastActivityRef.current;
      if (idle >= IDLE_TIMEOUT_MS) {
        toast('Sesi berakhir karena tidak aktif.', 'warning');
        handleLogout();
      } else if (idle >= IDLE_WARNING_MS) {
        const remaining = Math.ceil((IDLE_TIMEOUT_MS - idle) / 1000);
        setIdleCountdown(remaining);
        setShowIdleWarning(true);
      } else {
        setShowIdleWarning(false);
      }
    }, 5000);

    return () => {
      clearInterval(check);
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('keydown',   resetIdle);
      window.removeEventListener('click',     resetIdle);
      window.removeEventListener('touchstart',resetIdle);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

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

  // ── Ada motion event baru saat ARMED? atau Alarm Fingerprint? (untuk AlertBanner) ──
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

  // ── Aksi: Ubah mode PIR ────────────────────────────────────
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
      const label = command === 'mute_alarm' ? 'Alarm dimatikan.' : 'Perintah kunci terkirim.';
      toast(label, 'success');
    } catch {
      toast('Perintah gagal terkirim ke kotak kunci.', 'error');
    }
  };

  // Fungsi enroll jari dihapus (sudah otomatis lewat form Manajemen Personel)

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

  // ── Aksi: Tambah akun piket baru (Admin PAM) ───────────────
  const handleAddPiketUser = async (data: { name: string; username: string; password: string }) => {
    await APIService.createPiketUser({ ...data, role: 'piket' });
    const updated = await APIService.getUsersList();
    setUsersList(updated);
    toast('Akun piket berhasil dibuat.', 'success');
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
  if (currentUser.role === 'piket' && (activeTab === 'manajemen-akses' || activeTab === 'manajemen-user')) {
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
          deviceStatus={deviceStatus}
          lastRefreshed={lastRefreshed}
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
                <PIRControlPanel
                  deviceStatus={deviceStatus}
                  onSetMode={handleSetPIRMode}
                />
                <DeviceStatusPanel
                  title="Status Kotak Kunci"
                  description="Sidik jari (Board A) + kameranya (Board B)"
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
              onToggleFlash={handleToggleFlash}
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
              isAdminPam={currentUser.role === 'admin_pam'}
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
        </main>
      </div>
      </div>
      {/* Modal: Peringatan idle akan logout */}
      {showIdleWarning && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`rounded-xl border max-w-sm w-full p-5 shadow-2xl ${
            isDark ? 'bg-slate-900 border-amber-500/40' : 'bg-white border-amber-300'
          }`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-full ${isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600'}`}>
                <span className="text-lg">⏱</span>
              </div>
              <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Sesi akan berakhir
              </h3>
            </div>
            <p className={`text-sm leading-relaxed mb-5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Tidak ada aktivitas terdeteksi. Anda akan otomatis keluar dalam{' '}
              <span className="font-bold text-amber-400">{idleCountdown} detik</span>.
            </p>
            <button
              onClick={() => {
                lastActivityRef.current = Date.now();
                setShowIdleWarning(false);
              }}
              className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              Saya masih di sini
            </button>
          </div>
        </div>
      )}

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
