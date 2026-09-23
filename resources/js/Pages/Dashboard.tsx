/**
 * SI-JAGA — Dashboard.tsx (Migrasi dari App.tsx)
 * Root komponen untuk halaman Dashboard dengan Inertia.js
 */

import { useCallback, useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
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
  flash_on: false,
  stream_url: null,
  last_seen: new Date(0).toISOString(),
};

export default function Dashboard() {
  const { isDark } = useTheme();

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

  // ── Data State ─────────────────────────────────────────────
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [unpairedPhotos, setUnpairedPhotos] = useState<AccessPhoto[]>([]);
  const [motionEvents, setMotionEvents] = useState<MotionEvent[]>([]);
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>(EMPTY_DEVICE_STATUS);
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
        APIService.getDeviceStatus().then(setDeviceStatus),
        APIService.getPirModeLogs().then(setPirModeLogs),
      ];
      if (user.role === 'admin_pam') {
        requests.push(APIService.getUsersList().then(setUsersList));
      }
      await Promise.all(requests);
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
  // 15 detik dipilih senada dengan interval poll firmware (10 detik)
  // ditambah sedikit jeda untuk request itu sendiri.
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => refreshData(currentUser, true), 15000);
    return () => clearInterval(interval);
  }, [currentUser, refreshData]);

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

  // ── Ada motion event baru saat ARMED? (untuk AlertBanner) ──
  const latestMotion = motionEvents[0] ?? null;
  const hasActiveAlert =
    latestMotion !== null &&
    latestMotion.pir_mode === 'ON' &&
    now - new Date(latestMotion.created_at).getTime() < 10 * 60 * 1000; // 10 menit terakhir
  const [alertDismissed, setAlertDismissed] = useState(false);
  const showAlert = hasActiveAlert && !alertDismissed;

  // ── Aksi: Ubah mode PIR ────────────────────────────────────
  const handleSetPIRMode = async (mode: PIRMode, durationMinutes?: number) => {
    const prevStatus = deviceStatus;
    
    const autoArmAt = mode === 'OFF' && durationMinutes 
      ? new Date(Date.now() + durationMinutes * 60000).toISOString()
      : null;

    setDeviceStatus((prev) => ({ ...prev, pir_mode: mode, auto_arm_at: autoArmAt }));
    try {
      await APIService.setPIRMode(mode, durationMinutes);
      APIService.getPirModeLogs().then(setPirModeLogs);
    } catch (err) {
      setDeviceStatus(prevStatus);
    }
  };

  // ── Aksi: Nyalakan/matikan flash LED ESP32-CAM ─────────────
  const handleToggleFlash = async (on: boolean) => {
    const prevStatus = deviceStatus;
    setDeviceStatus((prev) => ({ ...prev, flash_on: on }));
    try {
      await APIService.setFlash(on);
    } catch (err) {
      setDeviceStatus(prevStatus);
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
  };

  // ── Aksi: Catat personel yang sidik jarinya sudah didaftarkan di Board A ──
  const handleCreatePersonnel = async (data: PersonnelInput) => {
    await APIService.createPersonnel(data);
    if (currentUser) await refreshData(currentUser);
  };

  // ── Aksi: Cabut akses personel ──────────────────────────────
  const handleDeactivatePersonnel = async (id: number) => {
    await APIService.deactivatePersonnel(id);
    if (currentUser) await refreshData(currentUser);
  };

  // ── Aksi: Update data personel ───────────────────────────────
  const handleUpdatePersonnel = async (id: number, data: PersonnelInput) => {
    await APIService.updatePersonnel(id, data);
    if (currentUser) await refreshData(currentUser);
  };

  // ── Aksi: Tambah akun piket baru (Admin PAM) ───────────────
  const handleAddPiketUser = async (data: { name: string; username: string; password: string }) => {
    await APIService.createPiketUser({ ...data, role: 'piket' });
    const updated = await APIService.getUsersList();
    setUsersList(updated);
  };

  // ── Aksi: Toggle status aktif akun piket ───────────────────
  const handleToggleUserActive = async (userId: number) => {
    const updated = await APIService.toggleUserActiveStatus(userId);
    setUsersList((prev) => prev.map((u) => (u.id === userId ? updated : u)));
  };

  // ── Aksi: Update akun piket ────────────────────────────────
  const handleUpdateUser = async (userId: number, data: Partial<User>) => {
    const updated = await APIService.updatePiketUser(userId, data);
    setUsersList((prev) => prev.map((u) => (u.id === userId ? updated : u)));
  };

  // ── Aksi: Hapus akun piket ─────────────────────────────────
  const handleDeleteUser = async (userId: number) => {
    await APIService.deleteUser(userId);
    setUsersList((prev) => prev.filter((u) => u.id !== userId));
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
          setActiveTab={setActiveTab} 
          userRole={currentUser.role} 
        />

        {/* Main Column */}
        <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <Topbar
          operatorName={currentUser.name}
          operatorRole={currentUser.role}
          deviceStatus={deviceStatus}
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
                latestEvent={latestMotion}
                onDismiss={() => setAlertDismissed(true)}
                onViewMotionLog={() => {
                  setAlertDismissed(true);
                  setActiveTab('motion-log');
                }}
              />
              <StatCards stats={stats} />
              <PIRControlPanel
                deviceStatus={deviceStatus}
                onSetMode={handleSetPIRMode}
              />
              <LiveCameraPanel
                deviceId={deviceStatus.device_id}
                status={deviceStatus.status}
                streamUrl={deviceStatus.stream_url}
                flashOn={deviceStatus.flash_on}
                onToggleFlash={handleToggleFlash}
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
            <AccessLogView logs={accessLogs} personnelList={personnelList} unpairedPhotos={unpairedPhotos} />
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
              onCreate={handleCreatePersonnel}
              onDeactivate={handleDeactivatePersonnel}
              onUpdate={handleUpdatePersonnel}
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
    </div>
  );
}
