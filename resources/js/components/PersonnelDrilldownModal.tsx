import React, { useState, useEffect } from 'react';
import { 
  X, 
  ScanFace, 
  ShieldCheck, 
  ShieldAlert, 
  UserCheck, 
  UserX, 
  Cpu, 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Radio, 
  Fingerprint, 
  Flame, 
  Printer, 
  Flag, 
  Lock, 
  Unlock, 
  KeyRound, 
  Eye, 
  AlertTriangle,
  FileBadge,
  Sparkles,
  Layers,
  Thermometer,
  Hash
} from 'lucide-react';
import { AccessLog } from '../types';
import { useTheme } from '../context/ThemeContext';

interface PersonnelDrilldownModalProps {
  log: AccessLog | null;
  onClose: () => void;
  onManualUnlock?: () => void;
}

export const PersonnelDrilldownModal: React.FC<PersonnelDrilldownModalProps> = ({
  log,
  onClose,
  onManualUnlock
}) => {
  const { isDark } = useTheme();
  const [activeViewMode, setActiveViewMode] = useState<'VISUAL' | 'THERMAL' | 'FACEMESH'>('VISUAL');
  const [isFlagged, setIsFlagged] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!log) return null;

  const isAuthorized = log.status === 'DITERIMA';
  const confidenceScore = log.biometricScore;

  // Sub-scores derived realistically from the biometric score
  const vectorScore = isAuthorized 
    ? Math.min(99.9, Number((confidenceScore * 1.008).toFixed(1))) 
    : Math.max(12.0, Number((confidenceScore * 0.95).toFixed(1)));
    
  const livenessScore = isAuthorized 
    ? Math.min(99.5, Number((confidenceScore * 1.002).toFixed(1))) 
    : Math.max(18.5, Number((confidenceScore * 0.88).toFixed(1)));

  const irisScore = isAuthorized 
    ? Math.min(98.9, Number((confidenceScore * 0.995).toFixed(1))) 
    : Math.max(22.0, Number((confidenceScore * 0.91).toFixed(1)));

  const handlePrint = () => {
    window.print();
  };

  const handleFlagIncident = () => {
    setIsFlagged(!isFlagged);
    setCopiedNotification(isFlagged ? 'Bendera investigasi dicabut' : 'Insiden telah ditandai ke Regu Provost');
    setTimeout(() => setCopiedNotification(null), 3000);
  };

  const handleCopyHash = () => {
    const hash = `SHA256-${log.id}-${log.nrp || 'UNK'}-${Date.now()}`;
    navigator.clipboard?.writeText?.(hash);
    setCopiedNotification('Hash audit berhasil disalin ke clipboard');
    setTimeout(() => setCopiedNotification(null), 3000);
  };

  return (
    <div 
      id="modal-drilldown-personel-biometrik"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className={`border rounded-xl max-w-4xl w-full my-auto shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
          isDark 
            ? 'bg-slate-900 border-slate-700/80 text-slate-200' 
            : 'bg-white border-slate-300 text-slate-800'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDark ? 'border-slate-800 bg-slate-950/70' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg border ${
              isAuthorized 
                ? isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : isDark ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              {isAuthorized ? <UserCheck className="w-5 h-5" /> : <UserX className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono uppercase tracking-widest font-bold ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  REKAM AUDIT BIOMETRIK TINGKAT TINGGI
                </span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                  isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-200 text-slate-700 border-slate-300'
                }`}>
                  {log.id}
                </span>
              </div>
              <h3 className={`text-base sm:text-lg font-tactical font-bold tracking-wide ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                Dossier Verifikasi Biometrik & Profil Personel
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-modal-print"
              onClick={handlePrint}
              title="Cetak Berita Acara Biometrik"
              className={`p-2 rounded-lg border transition cursor-pointer text-xs font-mono flex items-center gap-1.5 ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700' 
                  : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border-slate-300'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Cetak</span>
            </button>
            
            <button
              id="btn-modal-close"
              onClick={onClose}
              className={`p-2 rounded-lg border transition cursor-pointer ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border-slate-700' 
                  : 'bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-900 border-slate-300'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notification Toast if active */}
        {copiedNotification && (
          <div className={`border-b text-xs font-mono py-2 px-6 flex items-center justify-between animate-in slide-in-from-top-2 ${
            isDark ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300' : 'bg-emerald-50 border-emerald-300 text-emerald-800'
          }`}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>{copiedNotification}</span>
            </div>
          </div>
        )}

        {/* Main Content Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Top Section: High-Res Photo & Biometric HUD + Core Dossier */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left: High-Res Biometric Scanner View (5 cols) */}
            <div className={`lg:col-span-5 rounded-lg border p-4 space-y-3 ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className={`flex items-center gap-1.5 font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                  <ScanFace className="w-3.5 h-3.5" />
                  OPTICAL SENSOR FEED
                </span>
                <span className="text-[10px] text-slate-500">4K 60FPS NIR</span>
              </div>

              {/* High-Resolution Photo Container with HUD Reticle */}
              <div className="relative aspect-square w-full rounded-lg overflow-hidden border border-slate-700 bg-slate-900 group">
                <img 
                  src={log.foto} 
                  alt={log.nama}
                  className={`w-full h-full object-cover transition-all duration-300 ${
                    activeViewMode === 'THERMAL' 
                      ? 'filter hue-rotate-180 invert contrast-150 saturate-200' 
                      : activeViewMode === 'FACEMESH' 
                        ? 'filter contrast-125 brightness-75'
                        : ''
                  }`}
                  referrerPolicy="no-referrer"
                />

                {/* Tactical Target Reticle Overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Corner brackets */}
                  <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-emerald-400/80" />
                  <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-emerald-400/80" />
                  <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-emerald-400/80" />
                  <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-emerald-400/80" />

                  {/* Face Mesh Dots Simulation */}
                  {activeViewMode === 'FACEMESH' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-36 h-48 border border-cyan-400/60 rounded-full flex flex-col items-center justify-around py-4">
                        <div className="flex justify-around w-full px-6">
                          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                        </div>
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-300" />
                        <div className="w-8 h-1 bg-cyan-400/80 rounded" />
                        <div className="text-[9px] font-mono text-cyan-300 bg-black/70 px-2 py-0.5 rounded">
                          128 VEC MATCHED
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Center Scanning Bar */}
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-emerald-400/40 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />

                  {/* Top HUD Stats */}
                  <div className="absolute top-2 left-2 text-[9px] font-mono bg-black/80 px-2 py-0.5 rounded text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <Activity className="w-2.5 h-2.5" />
                    <span>LIVENESS: {isAuthorized ? 'LIVE PERSON' : 'SPOOF DETECTED'}</span>
                  </div>

                  {/* Bottom HUD Stats */}
                  <div className="absolute bottom-2 inset-x-2 flex items-center justify-between text-[9px] font-mono bg-black/80 px-2 py-1 rounded text-slate-300 border border-slate-700/60">
                    <span>PUPIL: 3.4mm</span>
                    <span className="text-emerald-400 font-bold">MATCH: {confidenceScore}%</span>
                    <span>TEMP: 36.6°C</span>
                  </div>
                </div>
              </div>

              {/* View Mode Switcher Pills */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveViewMode('VISUAL')}
                  className={`py-1.5 px-2 rounded text-[11px] font-mono font-medium transition cursor-pointer flex items-center justify-center gap-1 ${
                    activeViewMode === 'VISUAL' 
                      ? 'bg-emerald-600 text-white shadow-sm' 
                      : isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-400' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  <span>Visual</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveViewMode('FACEMESH')}
                  className={`py-1.5 px-2 rounded text-[11px] font-mono font-medium transition cursor-pointer flex items-center justify-center gap-1 ${
                    activeViewMode === 'FACEMESH' 
                      ? 'bg-cyan-600 text-white shadow-sm' 
                      : isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-400' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  <span>Mesh 3D</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveViewMode('THERMAL')}
                  className={`py-1.5 px-2 rounded text-[11px] font-mono font-medium transition cursor-pointer flex items-center justify-center gap-1 ${
                    activeViewMode === 'THERMAL' 
                      ? 'bg-amber-600 text-white shadow-sm' 
                      : isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-400' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                  }`}
                >
                  <Thermometer className="w-3 h-3" />
                  <span>Termal IR</span>
                </button>
              </div>
            </div>

            {/* Right: Personnel Info & Clearance Details (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              
              {/* Primary Identity Card */}
              <div className={`rounded-lg border p-4 space-y-3 ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-semibold">
                      Nama Lengkap Personel
                    </span>
                    <h2 className={`text-lg font-bold font-sans ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {log.nama}
                    </h2>
                    <div className="flex items-center gap-2 text-xs font-mono mt-0.5">
                      <span className={`font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>{log.pangkat}</span>
                      <span className="text-slate-400">•</span>
                      <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>NRP: <strong className={isDark ? 'text-slate-200' : 'text-slate-900'}>{log.nrp}</strong></span>
                    </div>
                  </div>

                  {/* Verdict Badge */}
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-slate-500 block mb-0.5">Keputusan AI</span>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold font-mono border ${
                      isAuthorized 
                        ? isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : isDark ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-red-100 text-red-800 border-red-300'
                    }`}>
                      {isAuthorized ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      <span>{isAuthorized ? 'AKSES DITERIMA' : 'AKSES DITOLAK'}</span>
                    </span>
                  </div>
                </div>

                <div className={`grid grid-cols-2 gap-2.5 pt-2 border-t text-xs font-mono ${
                  isDark ? 'border-slate-800/80' : 'border-slate-200'
                }`}>
                  <div className={`p-2.5 rounded border ${
                    isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <span className="text-slate-500 text-[10px] block">Satuan / Unit Kerja</span>
                    <span className={`font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{log.kesatuan}</span>
                  </div>
                  <div className={`p-2.5 rounded border ${
                    isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <span className="text-slate-500 text-[10px] block">Zona Izin Operasional</span>
                    <span className={`font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{log.ruangAkses || 'Bunker Utama A1'}</span>
                  </div>
                  <div className={`p-2.5 rounded border ${
                    isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <span className="text-slate-500 text-[10px] block">Titik Portal & Pintu</span>
                    <span className={`font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{log.pintu}</span>
                  </div>
                  <div className={`p-2.5 rounded border ${
                    isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <span className="text-slate-500 text-[10px] block">Sensor Pemindai</span>
                    <span className={`font-medium truncate block ${isDark ? 'text-slate-200' : 'text-slate-800'}`} title={log.sensorTrigger}>
                      {log.sensorTrigger}
                    </span>
                  </div>
                </div>
              </div>

              {/* Security Clearance & RFID Token Card */}
              <div className={`rounded-lg border p-4 space-y-3 text-xs font-mono ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`font-medium flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                    <FileBadge className="w-4 h-4 text-emerald-500" />
                    Kredensial Keamanan Militer
                  </span>
                  <span className="text-[10px] text-slate-500">ENKRIPSI AES-256</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className={`p-2.5 rounded border flex items-center justify-between ${
                    isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Tingkat Izin (Clearance)</span>
                      <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        {log.pangkat.includes('Kapten') || log.pangkat.includes('Letkol') 
                          ? 'LEVEL 3 - AMUNISI & SENJATA BERAT' 
                          : isAuthorized 
                            ? 'LEVEL 2 - SENJATA RINGAN' 
                            : 'LEVEL 0 - TIDAK ADA IZIN'}
                      </span>
                    </div>
                  </div>

                  <div className={`p-2.5 rounded border flex items-center justify-between ${
                    isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Smartcard RFID Token</span>
                      <span className={`font-semibold ${
                        isAuthorized 
                          ? isDark ? 'text-emerald-400' : 'text-emerald-700' 
                          : 'text-red-500'
                      }`}>
                        {isAuthorized ? `RFID-MIL-${log.nrp.slice(0, 6) || '8920'}-AUTH` : 'TOKEN NOT FOUND'}
                      </span>
                    </div>
                    <Fingerprint className={`w-4 h-4 ${isAuthorized ? 'text-emerald-500' : 'text-red-500'}`} />
                  </div>
                </div>
              </div>

              {/* Tactical Explanation Box */}
              <div className={`p-3.5 rounded-lg border text-xs font-mono ${
                isAuthorized 
                  ? isDark ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : isDark ? 'bg-red-950/30 border-red-500/30 text-red-200' : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                <div className="flex items-start gap-2">
                  {isAuthorized ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold block uppercase tracking-wider text-[10px]">
                      Catatan Log Analitik Sistem:
                    </span>
                    <p className={`mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {log.keterangan}
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Biometric Confidence Scores Breakdown Section */}
          <div className={`rounded-lg border p-5 space-y-4 ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div>
                <h4 className={`text-sm font-bold font-tactical tracking-wide flex items-center gap-2 ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  <Activity className="w-4 h-4 text-emerald-500" />
                  Rincian Skor Akurasi & Tingkat Keyakinan Biometrik (Confidence Scores)
                </h4>
                <p className="text-xs text-slate-500 font-mono">
                  Dihitung secara paralel oleh AI Multi-Modal Face & Liveness Neural Engine
                </p>
              </div>

              {/* Overall Score Highlight */}
              <div className="flex items-center gap-2">
                <span className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Total Confidence:</span>
                <span className={`text-lg font-bold font-mono px-3 py-1 rounded border ${
                  isAuthorized 
                    ? isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : isDark ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-red-100 text-red-800 border-red-300'
                }`}>
                  {confidenceScore}%
                </span>
              </div>
            </div>

            {/* Grid of Multi-modal Metrics with Progress Bars */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              
              {/* 1. Facial Vector Similarity */}
              <div className={`p-3.5 rounded border space-y-2 ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className="flex justify-between items-center">
                  <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>1. Cosine Similarity Vector (128-D)</span>
                  <span className={`font-bold ${
                    isAuthorized 
                      ? isDark ? 'text-emerald-400' : 'text-emerald-700' 
                      : 'text-red-500'
                  }`}>
                    {vectorScore}%
                  </span>
                </div>
                <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      isAuthorized ? 'bg-emerald-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${vectorScore}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Threshold Minimal: 85.0%</span>
                  <span>{vectorScore >= 85.0 ? 'Valid / Terverifikasi' : 'Gagal / Di Bawah Ambang'}</span>
                </div>
              </div>

              {/* 2. Infrared Dual-Spectrum Liveness */}
              <div className={`p-3.5 rounded border space-y-2 ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className="flex justify-between items-center">
                  <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>2. Uji Anti-Spoofing & Liveness IR</span>
                  <span className={`font-bold ${
                    isAuthorized 
                      ? isDark ? 'text-emerald-400' : 'text-emerald-700' 
                      : 'text-red-500'
                  }`}>
                    {livenessScore}%
                  </span>
                </div>
                <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      isAuthorized ? 'bg-cyan-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${livenessScore}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Deteksi Foto/Topeng 3D: Lolos</span>
                  <span>{isAuthorized ? 'Subjek Manusia Hidup' : 'Anomali Tekstur Kulit'}</span>
                </div>
              </div>

              {/* 3. Iris & Pupil Ratio Consistency */}
              <div className={`p-3.5 rounded border space-y-2 ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className="flex justify-between items-center">
                  <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>3. Iris & Pupil Ratio Consistency</span>
                  <span className={`font-bold ${
                    isAuthorized 
                      ? isDark ? 'text-emerald-400' : 'text-emerald-700' 
                      : 'text-red-500'
                  }`}>
                    {irisScore}%
                  </span>
                </div>
                <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      isAuthorized ? 'bg-emerald-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${irisScore}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Dual Iris Pupil Constriction: Normal</span>
                  <span>Jarak Fokus: 1.2m</span>
                </div>
              </div>

              {/* 4. RFID Cryptographic Integrity */}
              <div className={`p-3.5 rounded border space-y-2 ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <div className="flex justify-between items-center">
                  <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>4. Sinkronisasi Kartu Fisik RFID</span>
                  <span className={`font-bold ${
                    isAuthorized 
                      ? isDark ? 'text-emerald-400' : 'text-emerald-700' 
                      : 'text-red-500'
                  }`}>
                    {isAuthorized ? '100% MATCH' : '0% MISMATCH'}
                  </span>
                </div>
                <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      isAuthorized ? 'bg-emerald-500' : 'bg-red-500'
                    }`}
                    style={{ width: isAuthorized ? '100%' : '0%' }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Protokol: ISO/IEC 14443 Type A</span>
                  <span>Enkripsi: AES-256 GCM</span>
                </div>
              </div>

            </div>
          </div>

          {/* Audit Verification Trail */}
          <div className={`p-3 rounded border flex flex-col sm:flex-row items-center justify-between text-[10px] font-mono gap-2 ${
            isDark ? 'bg-slate-950 border-slate-800 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-600'
          }`}>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Waktu Presisi: <strong>{log.waktu}</strong></span>
              <span>•</span>
              <span className="truncate max-w-[250px]">KODAL SHA256: 0x{log.id.replace(/[^0-9]/g, '')}F9A7B3C</span>
            </div>
            
            <button
              onClick={handleCopyHash}
              className={`flex items-center gap-1 hover:underline cursor-pointer font-semibold ${
                isDark ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-700 hover:text-emerald-800'
              }`}
            >
              <Hash className="w-3 h-3" />
              <span>Salin Hash Audit</span>
            </button>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className={`px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 ${
          isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              id="btn-flag-investigation"
              onClick={handleFlagIncident}
              className={`flex-1 sm:flex-none px-3.5 py-2 rounded text-xs font-mono transition cursor-pointer flex items-center justify-center gap-1.5 border ${
                isFlagged 
                  ? 'bg-red-900/60 border-red-500 text-red-200' 
                  : isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
              }`}
            >
              <Flag className="w-3.5 h-3.5 text-amber-500" />
              <span>{isFlagged ? 'Insiden Ditandai (Provost)' : 'Tandai Investigasi Provost'}</span>
            </button>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {onManualUnlock && (
              <button
                id="btn-modal-manual-unlock"
                onClick={() => {
                  onManualUnlock();
                  onClose();
                }}
                className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-mono px-4 py-2 rounded transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Otorisasi Buka Pintu (15s)</span>
              </button>
            )}

            <button
              id="btn-modal-close-bottom"
              onClick={onClose}
              className={`flex-1 sm:flex-none text-xs font-mono px-4 py-2 rounded border transition cursor-pointer ${
                isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              Tutup Dossier
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
