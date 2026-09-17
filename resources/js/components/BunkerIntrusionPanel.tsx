import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Radio, 
  Camera, 
  Clock, 
  Activity, 
  AlertTriangle, 
  Maximize2, 
  X, 
  CheckCircle2, 
  RefreshCw, 
  Sparkles,
  Layers,
  MapPin,
  Cpu
} from 'lucide-react';
import { BunkerIntrusionLog } from '../types';
import { useTheme } from '../context/ThemeContext';

interface BunkerIntrusionPanelProps {
  intrusionLogs: BunkerIntrusionLog[];
  alarmActive: boolean;
  onSimulatePIRTrigger: () => void;
  onAcknowledgeAlarm?: () => void;
}

export const BunkerIntrusionPanel: React.FC<BunkerIntrusionPanelProps> = ({
  intrusionLogs,
  alarmActive,
  onSimulatePIRTrigger,
  onAcknowledgeAlarm
}) => {
  const { isDark } = useTheme();
  const [selectedPhoto, setSelectedPhoto] = useState<BunkerIntrusionLog | null>(null);

  return (
    <div 
      id="panel-log-intrusi-bunker-modul-2"
      className={`rounded-xl border p-5 shadow-lg space-y-4 relative overflow-hidden ${
        isDark 
          ? 'bg-slate-900 border-red-500/40 shadow-red-950/20' 
          : 'bg-white border-red-300 shadow-md'
      }`}
    >
      {/* Red ambient tactical glow accent */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Panel */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b ${
        isDark ? 'border-red-500/30' : 'border-red-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg border ${
            alarmActive 
              ? isDark 
                ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse' 
                : 'bg-red-100 border-red-300 text-red-600 animate-pulse'
              : isDark 
                ? 'bg-red-950/40 border-red-500/30 text-red-400' 
                : 'bg-red-50 border-red-200 text-red-600'
          }`}>
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                isDark ? 'bg-red-500/20 text-red-300 border-red-500/40' : 'bg-red-100 text-red-800 border-red-300'
              }`}>
                MODUL 2
              </span>
              <h3 className={`text-base font-tactical font-bold tracking-wide ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                Log Intrusi Bunker (Sensor PIR Dalam)
              </h3>
            </div>
            <p className={`text-xs font-mono mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Peringatan & Dokumentasi Otomatis IoT ESP32-CAM Sektor Bawah Tanah
            </p>
          </div>
        </div>

        {/* Quick Action Button to Simulate PIR Trigger */}
        <div className="flex items-center gap-2">
          <button
            id="btn-simulasi-pir-esp32"
            onClick={onSimulatePIRTrigger}
            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 border border-red-400/40"
            title="Simulasikan sensor PIR mendeteksi gerakan dan ESP32-CAM menjepret foto"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Tes Trigger PIR & Foto</span>
          </button>
        </div>
      </div>

      {/* Alert Status Callout if Motion is Currently Active */}
      {alarmActive && (
        <div className={`p-3 border rounded-lg flex items-center justify-between gap-3 animate-pulse text-xs font-mono ${
          isDark ? 'bg-red-950/60 border-red-500/60 text-red-200' : 'bg-red-50 border-red-300 text-red-800'
        }`}>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="font-bold">STATUS KRITIS: Gerakan Aktif Terdeteksi di Lorong Bunker Alfa-3!</span>
          </div>
          {onAcknowledgeAlarm && (
            <button
              onClick={onAcknowledgeAlarm}
              className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold transition cursor-pointer border border-red-400"
            >
              Pulihkan Alarm
            </button>
          )}
        </div>
      )}

      {/* Intrusion Log Cards List */}
      <div className="space-y-3">
        {intrusionLogs.map((log) => {
          const isTriggered = log.status === 'TERDETEKSI';
          return (
            <div 
              key={log.id}
              id={`log-intrusi-item-${log.id}`}
              className={`p-3.5 rounded-lg border transition-all ${
                isTriggered && alarmActive
                  ? isDark 
                    ? 'bg-red-950/40 border-red-500/60 shadow-sm shadow-red-950/50' 
                    : 'bg-red-50/80 border-red-400 shadow-sm'
                  : isDark 
                    ? 'bg-slate-950 border-slate-800 hover:border-slate-700' 
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                
                {/* 1. ESP32-CAM Photo Thumbnail with Corner HUD and Zoom Button */}
                <div className="relative w-full sm:w-36 h-24 rounded-lg overflow-hidden border border-red-500/40 bg-slate-900 shrink-0 group">
                  <img 
                    src={log.fotoDokumentasi} 
                    alt={`Dokumentasi ${log.zona}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                  {/* Photo Overlay Tag */}
                  <div className="absolute top-1 left-1 bg-black/80 px-1.5 py-0.5 rounded text-[8px] font-mono text-red-400 font-bold border border-red-500/30 flex items-center gap-1">
                    <Camera className="w-2.5 h-2.5" />
                    <span>ESP32-CAM</span>
                  </div>
                  
                  {/* Click to Zoom Inspect Button */}
                  <button
                    onClick={() => setSelectedPhoto(log)}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer text-white"
                    title="Perbesar Foto Dokumentasi"
                  >
                    <div className="bg-red-600/90 p-1.5 rounded-full shadow">
                      <Maximize2 className="w-4 h-4" />
                    </div>
                  </button>

                  <div className="absolute bottom-1 right-1 bg-black/80 px-1 rounded text-[8px] font-mono text-slate-300">
                    IR NIGHT
                  </div>
                </div>

                {/* 2. Intrusion Details */}
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-red-500" />
                      <span className={`font-mono text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {log.waktu}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        ({log.id})
                      </span>
                    </div>

                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                      log.status === 'TERDETEKSI' 
                        ? isDark ? 'bg-red-500/20 text-red-400 border-red-500/50 animate-pulse' : 'bg-red-100 text-red-700 border-red-300'
                        : log.status === 'TERVERIFIKASI'
                          ? isDark ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-amber-100 text-amber-700 border-amber-300'
                          : isDark ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-emerald-100 text-emerald-700 border-emerald-300'
                    }`}>
                      {log.status}
                    </span>
                  </div>

                  <div className={`text-xs font-medium flex items-center gap-1.5 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span className="truncate">{log.zona}</span>
                  </div>

                  <p className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {log.keterangan}
                  </p>

                  <div className={`flex flex-wrap items-center gap-3 text-[10px] font-mono pt-1 border-t ${
                    isDark ? 'text-slate-500 border-slate-800/60' : 'text-slate-500 border-slate-200'
                  }`}>
                    <span className={`flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                      <Cpu className={`w-3 h-3 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                      {log.sensor}
                    </span>
                    <span>•</span>
                    <span className="text-red-500 font-semibold">{log.levelSinyal}</span>
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Zoom Preview Dokumentasi ESP32-CAM */}
      {selectedPhoto && (
        <div 
          id="modal-zoom-foto-esp32"
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div 
            className={`border rounded-xl max-w-2xl w-full p-5 space-y-4 shadow-2xl ${
              isDark ? 'bg-slate-900 border-red-500/50 text-slate-200' : 'bg-white border-red-400 text-slate-800'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between border-b pb-3 ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div>
                <span className="text-[10px] font-mono text-red-500 uppercase tracking-wider font-bold">
                  DOKUMENTASI FOTO SENSOR GERAKAN PIR
                </span>
                <h4 className={`text-base font-bold font-tactical ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {selectedPhoto.zona} • {selectedPhoto.waktu}
                </h4>
              </div>
              <button
                onClick={() => setSelectedPhoto(null)}
                className={`p-1 rounded-lg cursor-pointer ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Large High-Res Image View */}
            <div className="relative rounded-lg overflow-hidden border-2 border-red-500/60 aspect-video bg-black">
              <img 
                src={selectedPhoto.fotoDokumentasi} 
                alt="Zoom Snapshot"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-3 left-3 bg-black/80 px-2.5 py-1 rounded text-xs font-mono text-red-400 border border-red-500/40">
                ESP32-CAM AUTO-CAPTURE • 1600x1200 UXGA
              </div>
              <div className="absolute bottom-3 right-3 bg-black/80 px-2.5 py-1 rounded text-xs font-mono text-emerald-400 border border-slate-700">
                SENSOR: HC-SR501 PIR INFRAMERAH
              </div>
            </div>

            <div className={`p-3 rounded-lg border text-xs font-mono space-y-1 ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className={`font-bold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>Deskripsi Hasil Jepretan Sensor:</div>
              <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>{selectedPhoto.keterangan}</p>
              <div className="text-slate-500 text-[10px] pt-1">
                ID Log: {selectedPhoto.id} • Modul IoT ESP32-CAM Bengpuskomlekad
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedPhoto(null)}
                className={`px-4 py-2 rounded text-xs font-mono transition cursor-pointer ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                }`}
              >
                Tutup Dokumentasi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
