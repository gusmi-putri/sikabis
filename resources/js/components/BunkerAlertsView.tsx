import React, { useState } from 'react';
import { 
  AlertOctagon, 
  Radio, 
  ShieldAlert, 
  MapPin, 
  Video, 
  Zap, 
  Flame, 
  Activity,
  CheckCircle2,
  RefreshCw,
  Eye,
  Camera,
  Maximize2,
  X,
  Filter,
  Sliders,
  Cpu,
  Clock,
  Download,
  FileText,
  AlertTriangle,
  Layers,
  Thermometer,
  Sparkles,
  Wifi
} from 'lucide-react';
import { BunkerSensor, BunkerIntrusionLog } from '../types';
import { INITIAL_BUNKER_SENSORS } from '../data/mockData';
import { useTheme } from '../context/ThemeContext';

interface BunkerAlertsViewProps {
  alarmActive: boolean;
  intrusionLogs: BunkerIntrusionLog[];
  onAcknowledge: () => void;
  onTriggerAlarm: () => void;
  onUpdateIntrusionLogs?: (logs: BunkerIntrusionLog[]) => void;
}

export const BunkerAlertsView: React.FC<BunkerAlertsViewProps> = ({
  alarmActive,
  intrusionLogs,
  onAcknowledge,
  onTriggerAlarm,
  onUpdateIntrusionLogs
}) => {
  const { isDark } = useTheme();
  const [sensors] = useState<BunkerSensor[]>(INITIAL_BUNKER_SENSORS);
  const [activeSubTab, setActiveSubTab] = useState<'log-intrusi' | 'peta-taktis' | 'kamera-esp32'>('log-intrusi');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedPhoto, setSelectedPhoto] = useState<BunkerIntrusionLog | null>(null);
  const [photoFilterMode, setPhotoFilterMode] = useState<'NORMAL' | 'THERMAL' | 'EDGE'>('NORMAL');
  
  // IoT Camera Switcher State
  const [selectedCamera, setSelectedCamera] = useState<string>('CAM-02');
  const [isCapturingLive, setIsCapturingLive] = useState<boolean>(false);
  const [nightVision, setNightVision] = useState<boolean>(true);

  // Selected Tactical Zone for Deep Telemetry Inspection
  const [selectedZone, setSelectedZone] = useState<string>('R-02');

  const cameras = [
    { id: 'CAM-01', name: 'ESP32-CAM 01: Pintu Gerbang Utama A1', ip: '192.168.10.41', fps: '30 FPS', res: 'UXGA 1600x1200', img: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=600&auto=format&fit=crop&q=80', status: 'Online' },
    { id: 'CAM-02', name: 'ESP32-CAM 02: Lorong Bunker Alfa-3 (Underground)', ip: '192.168.10.42', fps: '25 FPS', res: 'UXGA 1600x1200', img: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=600&auto=format&fit=crop&q=80', status: 'Online' },
    { id: 'CAM-03', name: 'ESP32-CAM 03: Gudang Amunisi Khusus (Delta)', ip: '192.168.10.43', fps: '30 FPS', res: 'HD 1080p', img: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80', status: 'Online' },
    { id: 'CAM-04', name: 'ESP32-CAM 04: Lab Perakitan & Kalibrasi', ip: '192.168.10.44', fps: '30 FPS', res: 'HD 1080p', img: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&auto=format&fit=crop&q=80', status: 'Online' }
  ];

  const currentCam = cameras.find(c => c.id === selectedCamera) || cameras[1];

  const filteredLogs = intrusionLogs.filter(log => {
    if (statusFilter === 'ALL') return true;
    return log.status === statusFilter;
  });

  const handleResolveIncident = (logId: string) => {
    if (onUpdateIntrusionLogs) {
      const updated = intrusionLogs.map(log => {
        if (log.id === logId) {
          return { ...log, status: 'TERSELESAIKAN' as const, keterangan: log.keterangan + ' [Diverifikasi & Diselesaikan oleh Provos Jaga]' };
        }
        return log;
      });
      onUpdateIntrusionLogs(updated);
    }
  };

  const handleSnapLiveCamera = () => {
    setIsCapturingLive(true);
    setTimeout(() => {
      setIsCapturingLive(false);
      onTriggerAlarm();
    }, 1200);
  };

  return (
    <div id="view-peringatan-bunker-detail" className="space-y-6">
      {/* Header Banner Sub Menu */}
      <div className={`rounded-xl border p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl relative overflow-hidden ${
        isDark ? 'bg-slate-900 border-red-500/40 shadow-red-950/20' : 'bg-white border-red-300 shadow-md'
      }`}>
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        <div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border flex items-center gap-1.5 ${
              isDark ? 'text-red-400 bg-red-500/20 border-red-500/30' : 'text-red-700 bg-red-100 border-red-300'
            }`}>
              <ShieldAlert className="w-3.5 h-3.5" />
              SISTEM PERINGATAN DINI BUNKER & IOT ESP32-CAM
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
              isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-300'
            }`}>
              5 Sensor PIR Terpasang
            </span>
          </div>
          <h2 className={`text-2xl font-tactical font-bold mt-1.5 ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
            Log Intrusi & Dokumentasi Sensor PIR (Bunker Bawah Tanah)
          </h2>
          <p className={`text-xs font-mono mt-1 max-w-2xl ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>
            Pusat telemetri komprehensif Bengpuskomlekad yang mengintegrasikan jepretan otomatis IoT ESP32-CAM, sensor PIR inframerah pasif, mikrofon getaran seismik, dan sensor suhu termal amunisi.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {alarmActive ? (
            <button
              id="btn-pulihkan-alarm-bunker-view"
              onClick={onAcknowledge}
              className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer border border-emerald-400/40"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Redam & Pulihkan Sirine</span>
            </button>
          ) : (
            <button
              id="btn-tes-sensor-pir-bunker-view"
              onClick={onTriggerAlarm}
              className="px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold transition-all shadow-lg flex items-center gap-2 animate-pulse cursor-pointer border border-red-400/40"
            >
              <Camera className="w-4 h-4" />
              <span>Tes Sensor PIR & Snapshot IoT</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Sub Tabs for Deeper Capabilities */}
      <div className={`flex flex-wrap items-center justify-between gap-3 border-b pb-3 ${
        isDark ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('log-intrusi')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'log-intrusi'
                ? 'bg-red-600 text-white shadow-md'
                : isDark ? 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800' : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Riwayat Log Intrusi & Dokumentasi ({intrusionLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('peta-taktis')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'peta-taktis'
                ? 'bg-red-600 text-white shadow-md'
                : isDark ? 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800' : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>Peta Taktis & Sensor Telemetri</span>
          </button>

          <button
            onClick={() => setActiveSubTab('kamera-esp32')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'kamera-esp32'
                ? 'bg-red-600 text-white shadow-md'
                : isDark ? 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800' : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>Live Feed Jaringan ESP32-CAM</span>
          </button>
        </div>

        {/* Live System Signal Indicator */}
        <div className={`flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-lg border ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600'
        }`}>
          <Wifi className="w-3.5 h-3.5 text-emerald-500" />
          <span>Protokol IoT:</span>
          <span className="text-emerald-500 font-bold">MQTT TLS (24ms)</span>
        </div>
      </div>

      {/* SUB-VIEW 1: Detailed Intrusion Logs & Documentation */}
      {activeSubTab === 'log-intrusi' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className={`flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border text-xs font-mono ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Filter Status Kejadian:</span>
              <div className="flex gap-1.5">
                {['ALL', 'TERDETEKSI', 'TERVERIFIKASI', 'TERSELESAIKAN'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded transition cursor-pointer border ${
                      statusFilter === st 
                        ? isDark ? 'bg-red-500/20 text-red-300 border-red-500/50 font-bold' : 'bg-red-100 text-red-800 border-red-300 font-bold'
                        : isDark ? 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800' : 'bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-300'
                    }`}
                  >
                    {st === 'ALL' ? 'Semua Kejadian' : st}
                  </button>
                ))}
              </div>
            </div>

            <div className={isDark ? 'text-slate-400' : 'text-slate-600'}>
              Menampilkan <strong className={isDark ? 'text-white' : 'text-slate-900'}>{filteredLogs.length}</strong> log rekaman ESP32-CAM
            </div>
          </div>

          {/* Detailed Log Cards */}
          <div className="grid grid-cols-1 gap-4">
            {filteredLogs.map((log) => {
              const isAlert = log.status === 'TERDETEKSI';
              return (
                <div
                  key={log.id}
                  className={`p-5 rounded-xl border transition-all ${
                    isAlert && alarmActive
                      ? isDark ? 'bg-red-950/40 border-red-500 shadow-lg shadow-red-950/40' : 'bg-red-50 border-red-400 shadow-md'
                      : isDark ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row gap-5 items-start">
                    
                    {/* High-res photo container with zoom and thermal buttons */}
                    <div className="relative w-full lg:w-56 h-36 rounded-lg overflow-hidden border border-red-500/40 bg-black shrink-0 group">
                      <img 
                        src={log.fotoDokumentasi} 
                        alt="Snapshot Dokumen"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                      
                      <div className="absolute top-2 left-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono text-red-400 font-bold border border-red-500/30 flex items-center gap-1">
                        <Camera className="w-3 h-3" />
                        <span>ESP32-CAM AUTO</span>
                      </div>

                      <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono text-slate-300">
                        PIR SHUTTER
                      </div>

                      <button
                        onClick={() => setSelectedPhoto(log)}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer text-white"
                        title="Periksa Foto Resolusi Penuh & Analisis Termal"
                      >
                        <div className="bg-red-600 px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 shadow">
                          <Maximize2 className="w-3.5 h-3.5" />
                          <span>Inspeksi Gambar</span>
                        </div>
                      </button>
                    </div>

                    {/* Detailed Metadata & Operational Details */}
                    <div className="flex-1 space-y-2.5 min-w-0">
                      <div className={`flex flex-wrap items-center justify-between gap-2 pb-2 border-b ${
                        isDark ? 'border-slate-800' : 'border-slate-200'
                      }`}>
                        <div className="flex items-center gap-2.5">
                          <Clock className="w-4 h-4 text-red-500" />
                          <span className={`font-mono text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {log.waktu}
                          </span>
                          <span className={`text-xs font-mono px-2 py-0.5 rounded border ${
                            isDark ? 'text-slate-400 bg-slate-950 border-slate-800' : 'text-slate-600 bg-slate-100 border-slate-300'
                          }`}>
                            {log.id}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded border ${
                            log.status === 'TERDETEKSI'
                              ? isDark ? 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse' : 'bg-red-100 text-red-700 border-red-300'
                              : log.status === 'TERVERIFIKASI'
                                ? isDark ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-amber-100 text-amber-700 border-amber-300'
                                : isDark ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-emerald-100 text-emerald-700 border-emerald-300'
                          }`}>
                            {log.status}
                          </span>

                          {log.status !== 'TERSELESAIKAN' && (
                            <button
                              onClick={() => handleResolveIncident(log.id)}
                              className={`px-3 py-1 rounded text-xs font-mono font-semibold transition cursor-pointer border ${
                                isDark 
                                  ? 'bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white border-slate-700 hover:border-emerald-500' 
                                  : 'bg-slate-100 hover:bg-emerald-600 text-slate-700 hover:text-white border-slate-300 hover:border-emerald-500'
                              }`}
                            >
                              Tandai Terselesaikan
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                        <div className={`flex items-center gap-2 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                          <MapPin className="w-4 h-4 text-red-500 shrink-0" />
                          <span className="font-bold">{log.zona}</span>
                        </div>
                        <div className={`flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          <Cpu className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-cyan-600'} shrink-0`} />
                          <span>{log.sensor}</span>
                        </div>
                      </div>

                      <div className={`p-3 rounded-lg border text-xs font-mono ${
                        isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}>
                        <span className={`font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Hasil Analisis IoT ESP32-CAM: </span>
                        {log.keterangan}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono pt-1">
                        <span className="text-red-500 font-bold">Kekuatan Sinyal PIR: {log.levelSinyal}</span>
                        <span className={isDark ? 'text-slate-500' : 'text-slate-500'}>Disimpan ke Penyimpanan Kodal Bengpuskomlekad</span>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: Tactical 2D Floorplan & Deep Sensor Telemetry */}
      {activeSubTab === 'peta-taktis' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Tactical Canvas (7 Cols) */}
          <div className={`lg:col-span-7 rounded-xl border p-5 space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-500" />
                <h3 className={`font-tactical font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Peta Denah Bunker & Titik Sensor (Level Underground -2)
                </h3>
              </div>
              <span className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                GRID: BENGPUS-SEC-01
              </span>
            </div>

            {/* Interactive Tactical Canvas */}
            <div className={`relative w-full h-96 rounded-xl border overflow-hidden p-4 ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-900 border-slate-300'
            }`}>
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:24px_24px] opacity-30" />

              <div className="relative w-full h-full grid grid-cols-3 grid-rows-2 gap-3">
                {[
                  { id: 'R-01', name: 'PINTU UTAMA A1', type: 'AI Face Cam', status: 'AMAN', temp: '22.1°C', seismic: '0.01G' },
                  { id: 'R-02', name: 'LORONG ALFA-3', type: 'PIR + ESP32-CAM', status: alarmActive ? 'INTRUSI' : 'AMAN', temp: '21.8°C', seismic: alarmActive ? '0.42G' : '0.02G' },
                  { id: 'R-03', name: 'SENJATA BERAT', type: 'Vibration Sensor', status: 'AMAN', temp: '20.5°C', seismic: '0.01G' },
                  { id: 'R-04', name: 'AMUNISI KHUSUS', type: 'Thermal Sensor', status: 'AMAN', temp: '19.4°C', seismic: '0.00G' },
                  { id: 'R-05', name: 'LAB KALIBRASI', type: 'Magnetic Contact', status: 'AMAN', temp: '21.0°C', seismic: '0.01G' },
                  { id: 'R-06', name: 'SERVER BIOMETRIK', type: 'Tamper Alarm', status: 'AMAN', temp: '18.2°C', seismic: '0.00G' }
                ].map((room) => {
                  const isSelected = selectedZone === room.id;
                  const isAlarmZone = room.id === 'R-02' && alarmActive;

                  return (
                    <div
                      key={room.id}
                      onClick={() => setSelectedZone(room.id)}
                      className={`border rounded-lg p-3 relative flex flex-col justify-between cursor-pointer transition-all ${
                        isAlarmZone
                          ? 'border-red-500 bg-red-950/50 shadow-[inset_0_0_20px_rgba(239,68,68,0.5)]'
                          : isSelected
                            ? 'border-emerald-500 bg-emerald-950/40'
                            : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-slate-200">
                          [{room.id}] {room.name}
                        </span>
                        <div className={`w-2.5 h-2.5 rounded-full ${
                          isAlarmZone ? 'bg-red-500 animate-ping' : 'bg-emerald-400'
                        }`} />
                      </div>

                      <div className="text-[9px] font-mono text-slate-400">
                        {room.type}
                      </div>

                      <div className="flex items-center justify-between text-[9px] font-mono pt-1 border-t border-slate-800">
                        <span className="text-amber-400">{room.temp}</span>
                        <span className={isAlarmZone ? 'text-red-400 font-bold' : 'text-slate-400'}>
                          {isAlarmZone ? 'ALARM GERAKAN' : room.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Scanline */}
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-emerald-500/10 to-transparent h-12 w-full animate-scanline" />
            </div>
          </div>

          {/* Telemetry Detail Sidebar for Selected Zone (5 Cols) */}
          <div className={`lg:col-span-5 rounded-xl border p-5 space-y-4 text-xs font-mono ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div className="flex items-center gap-2">
                <Sliders className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                <h4 className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Inspeksi Sensor Sektor [{selectedZone}]</h4>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded border ${
                isDark ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : 'text-emerald-700 bg-emerald-50 border-emerald-200 font-semibold'
              }`}>
                Status: Aktif 24/7
              </span>
            </div>

            <div className="space-y-3">
              <div className={`p-3 rounded-lg border space-y-1.5 ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className={isDark ? 'text-slate-400' : 'text-slate-500'}>Nama Ruangan & Zona:</div>
                <div className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {selectedZone === 'R-02' ? 'Lorong Bunker Alfa-3 (Zona Hotspot)' : `Ruang Sektor [${selectedZone}] Gudang Bengpuskomlekad`}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className={`p-3 rounded-lg border space-y-1 ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className={`flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    <Thermometer className="w-3.5 h-3.5 text-amber-500" />
                    <span>Suhu Ruangan</span>
                  </div>
                  <div className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>21.8 °C</div>
                  <div className={`text-[10px] ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>Normal (Limit: 26°C)</div>
                </div>

                <div className={`p-3 rounded-lg border space-y-1 ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className={`flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    <Activity className={`w-3.5 h-3.5 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                    <span>Seismik / Getaran</span>
                  </div>
                  <div className={`font-bold text-base ${
                    selectedZone === 'R-02' && alarmActive ? 'text-red-500' : isDark ? 'text-white' : 'text-slate-900'
                  }`}>
                    {selectedZone === 'R-02' && alarmActive ? '0.42 G (High)' : '0.02 G'}
                  </div>
                  <div className="text-[10px] text-slate-500">Ambang Batas: 0.20G</div>
                </div>
              </div>

              <div className={`p-3 rounded-lg border space-y-2 ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className={`font-bold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>Modul Kamera Pengawas Terkait:</div>
                <div className={`flex items-center justify-between ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                  <span>ESP32-CAM Sub-Unit 02</span>
                  <span className="text-emerald-500 font-bold">Online (192.168.10.42)</span>
                </div>
                <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Mode: Otomatis Jepret Foto saat sinyal sensor PIR mendeteksi perubahan gelombang inframerah di atas 70%.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: Live Feed ESP32-CAM Network Matrix */}
      {activeSubTab === 'kamera-esp32' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Selected Stream (8 Cols) */}
          <div className={`lg:col-span-8 rounded-xl border p-5 space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`font-tactical font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {currentCam.name}
                </h3>
                <p className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  IP: {currentCam.ip} • {currentCam.res} • {currentCam.fps}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setNightVision(!nightVision)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer border ${
                    nightVision 
                      ? isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-300'
                  }`}
                >
                  {nightVision ? 'IR Night Vision: ON' : 'IR Night Vision: OFF'}
                </button>

                <button
                  onClick={handleSnapLiveCamera}
                  disabled={isCapturingLive}
                  className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold transition cursor-pointer flex items-center gap-1.5 shadow"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{isCapturingLive ? 'Menjepret...' : 'Jepret Snapshot'}</span>
                </button>
              </div>
            </div>

            {/* Video Canvas Container */}
            <div className={`relative rounded-xl overflow-hidden border-2 aspect-video bg-black flex items-center justify-center ${
              nightVision ? 'border-emerald-500/50' : 'border-slate-700'
            }`}>
              <img 
                src={currentCam.img} 
                alt="Stream Feed"
                className={`w-full h-full object-cover ${nightVision ? 'filter grayscale contrast-125 brightness-110' : ''}`}
                referrerPolicy="no-referrer"
              />

              {/* Tactical Overlays */}
              <div className="absolute top-3 left-3 bg-black/80 px-2.5 py-1 rounded text-xs font-mono text-emerald-400 border border-emerald-500/40 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span>LIVE FEED • {currentCam.id}</span>
              </div>

              <div className="absolute bottom-3 left-3 bg-black/80 px-2.5 py-1 rounded text-xs font-mono text-white border border-slate-700">
                PIR TRIGGER: SIAGA (STANDBY)
              </div>

              <div className="absolute bottom-3 right-3 bg-black/80 px-2.5 py-1 rounded text-xs font-mono text-emerald-400 border border-emerald-500/40">
                128-BIT AES ENCRYPTED STREAM
              </div>

              {/* Reticle Overlay */}
              <div className="absolute inset-0 border border-emerald-500/20 m-6 pointer-events-none flex items-center justify-center">
                <div className="w-8 h-8 border-t-2 border-b-2 border-emerald-500/60" />
                <div className="h-8 w-8 border-l-2 border-r-2 border-emerald-500/60 absolute" />
              </div>
            </div>
          </div>

          {/* Camera Grid Selector (4 Cols) */}
          <div className={`lg:col-span-4 rounded-xl border p-5 space-y-3 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <h4 className={`font-tactical font-bold text-sm pb-2 border-b ${
              isDark ? 'border-slate-800 text-white' : 'border-slate-200 text-slate-900'
            }`}>
              Pilih Kamera Pengawas ESP32-CAM
            </h4>

            <div className="space-y-2.5">
              {cameras.map((cam) => {
                const isSelected = selectedCamera === cam.id;
                return (
                  <div
                    key={cam.id}
                    onClick={() => setSelectedCamera(cam.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? isDark ? 'bg-red-500/10 border-red-500/60 shadow-sm' : 'bg-red-50 border-red-300'
                        : isDark ? 'bg-slate-950 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono mb-1">
                      <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{cam.id}</span>
                      <span className="text-emerald-500 text-[10px] font-semibold">{cam.status}</span>
                    </div>
                    <div className={`text-[11px] font-mono truncate ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {cam.name}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 mt-1">
                      {cam.ip} • {cam.fps}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal Zoom & Thermal Inspector for Intrusion Photo */}
      {selectedPhoto && (
        <div 
          id="modal-detail-inspeksi-foto-bunker"
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div 
            className={`border rounded-xl max-w-3xl w-full p-6 space-y-4 shadow-2xl ${
              isDark ? 'bg-slate-900 border-red-500/60 text-slate-200' : 'bg-white border-red-400 text-slate-800'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between border-b pb-3 ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div>
                <span className="text-xs font-mono text-red-500 uppercase font-bold tracking-wider">
                  BERKAS DOKUMENTASI GERAKAN SENSOR PIR ESP32-CAM
                </span>
                <h4 className={`text-lg font-bold font-tactical ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {selectedPhoto.zona}
                </h4>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className={`p-1.5 rounded-lg cursor-pointer ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Photo Filter Mode Switcher */}
            <div className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-mono ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Mode Analisis Lensa:</span>
              <div className="flex gap-2">
                {(['NORMAL', 'THERMAL', 'EDGE'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setPhotoFilterMode(mode)}
                    className={`px-3 py-1 rounded transition cursor-pointer border ${
                      photoFilterMode === mode 
                        ? 'bg-red-600 text-white font-bold border-red-600' 
                        : isDark ? 'bg-slate-800 text-slate-400 hover:text-white border-slate-700' : 'bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-300'
                    }`}
                  >
                    {mode === 'NORMAL' ? 'Visual Asli' : mode === 'THERMAL' ? 'Spektrum Termal IR' : 'Deteksi Tepi (Edge)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Display Image Container */}
            <div className="relative rounded-xl overflow-hidden border-2 border-red-500 aspect-video bg-black flex items-center justify-center">
              <img 
                src={selectedPhoto.fotoDokumentasi} 
                alt="Detailed Document"
                className={`w-full h-full object-cover ${
                  photoFilterMode === 'THERMAL'
                    ? 'filter hue-rotate-180 saturate-200 contrast-150'
                    : photoFilterMode === 'EDGE'
                      ? 'filter invert contrast-200 grayscale'
                      : ''
                }`}
                referrerPolicy="no-referrer"
              />

              <div className="absolute top-3 left-3 bg-black/80 px-3 py-1 rounded text-xs font-mono text-red-400 border border-red-500/40">
                WAKTU JEPRET: {selectedPhoto.waktu}
              </div>

              <div className="absolute bottom-3 right-3 bg-black/80 px-3 py-1 rounded text-xs font-mono text-emerald-400 border border-emerald-500/40">
                RESOLUSI: 1600 x 1200 UXGA
              </div>
            </div>

            <div className={`p-3.5 rounded-lg border text-xs font-mono space-y-1.5 ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Keterangan Jepretan & Laporan Provos:</div>
              <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>{selectedPhoto.keterangan}</p>
              <div className="text-[11px] text-slate-500 pt-1">
                Sensor: {selectedPhoto.sensor} • Status: {selectedPhoto.status} • ID Kejadian: {selectedPhoto.id}
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <div className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Bengpuskomlekad Security Audit Hash: <code>SHA256-b9a8e74f...</code>
              </div>
              <button
                onClick={() => setSelectedPhoto(null)}
                className={`px-5 py-2 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                }`}
              >
                Tutup Jendela
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
