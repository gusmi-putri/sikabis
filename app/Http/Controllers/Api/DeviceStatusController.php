<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\DeviceStatusResource;
use App\Http\Resources\PirModeLogResource;
use App\Models\DeviceStatus;
use App\Models\PirModeLog;
use Illuminate\Http\Request;

class DeviceStatusController extends Controller
{
    private const OFFLINE_THRESHOLD_SECONDS = 90;

    public function show()
    {
        $gudang = DeviceStatus::where('device_id', 'GUDANG-01')->first();

        if ($gudang && $gudang->status === 'online' && (! $gudang->last_seen || $gudang->last_seen->lt(now()->subSeconds(self::OFFLINE_THRESHOLD_SECONDS)))) {
            $gudang->update(['status' => 'offline']);
        }

        return new DeviceStatusResource($gudang ?: DeviceStatus::first());
    }

    public function setPirMode(Request $request)
    {
        $data = $request->validate([
            'mode' => ['required', 'in:ON,OFF'],
            'duration_minutes' => ['nullable', 'integer', 'min:1'],
        ]);

        $device = DeviceStatus::where('device_id', 'GUDANG-01')->first();
        if ($device && $device->pir_mode !== $data['mode']) {
            $autoArmAt = null;
            if ($data['mode'] === 'OFF' && ! empty($data['duration_minutes'])) {
                $autoArmAt = now()->addMinutes($data['duration_minutes']);
            }

            $device->update([
                'pir_mode' => $data['mode'],
                'auto_arm_at' => $autoArmAt,
            ]);

            PirModeLog::create([
                'device_id' => $device->device_id,
                'pir_mode' => $data['mode'],
                'source' => 'web',
                'changed_by' => $request->user()->name,
            ]);
        }

        return response()->json(null, 204);
    }

    public function setFlash(Request $request)
    {
        $data = $request->validate([
            'on' => ['required', 'boolean'],
        ]);

        DeviceStatus::where('device_id', 'GUDANG-01')->first()?->update(['flash_on' => $data['on']]);

        return response()->json(null, 204);
    }

    public function pirModeLogs()
    {
        return PirModeLogResource::collection(
            PirModeLog::latest()->limit(100)->get()
        );
    }

    /**
     * Status online/offline kotak kunci (Board A) dan kameranya (Board B).
     * Sama seperti show(), device dianggap offline kalau tidak lapor
     * (log/foto) selama lebih dari OFFLINE_THRESHOLD_SECONDS.
     */
    public function keyboxStatus()
    {
        $devices = DeviceStatus::whereIn('device_id', ['kotak-kunci-01', 'kotak-kunci-cam-01'])->get();

        foreach ($devices as $device) {
            if ($device->status === 'online' && (! $device->last_seen || $device->last_seen->lt(now()->subSeconds(self::OFFLINE_THRESHOLD_SECONDS)))) {
                $device->update(['status' => 'offline']);
            }
        }

        return DeviceStatusResource::collection($devices);
    }

    /**
     * Kirim perintah dari dashboard ke kotak kunci (Board A): mute alarm
     * atau paksa kunci. Diambil Board A lewat polling GET /device/keybox/command.
     * TIDAK ADA perintah buka solenoid dari jarak jauh -- itu keputusan
     * keamanan yang disengaja, bukan keterbatasan teknis.
     */
    public function sendKeyboxCommand(Request $request)
    {
        $data = $request->validate([
            'command' => ['required', 'in:MUTE_ALARM,FORCE_LOCK,TEST_BUZZER,TEST_TRIGGER,RESET_SENSOR,ENROLL'],
            'target' => ['required_if:command,ENROLL', 'integer', 'min:1', 'max:127'],
        ]);

        $device = DeviceStatus::where('device_id', 'kotak-kunci-01')->first();

        if ($device) {
            $device->update([
                'keybox_command' => $data['command'],
                'keybox_command_at' => now(),
                'keybox_command_target' => $data['command'] === 'ENROLL' ? $data['target'] : null,
                'keybox_enroll_message' => $data['command'] === 'ENROLL' ? 'Menunggu Board A menerima perintah...' : null,
                'keybox_enroll_message_at' => $data['command'] === 'ENROLL' ? now() : null,
            ]);
        }

        return response()->json(null, 204);
    }
}
