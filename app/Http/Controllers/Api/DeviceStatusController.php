<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\DeviceStatusResource;
use App\Http\Resources\PirModeLogResource;
use App\Models\DeviceStatus;
use App\Models\Personnel;
use App\Models\PirModeLog;
use Illuminate\Http\Request;

class DeviceStatusController extends Controller
{
    /**
     * Device dianggap offline kalau tidak ada heartbeat selama ini
     * (3x interval heartbeat firmware, yang mengirim tiap 30 detik).
     */
    private const OFFLINE_THRESHOLD_SECONDS = 90;

    public function show()
    {
        $device = DeviceStatus::first();

        if (
            $device
            && $device->status === 'online'
            && (! $device->last_seen || $device->last_seen->lt(now()->subSeconds(self::OFFLINE_THRESHOLD_SECONDS)))
        ) {
            $device->update(['status' => 'offline']);
        }

        return new DeviceStatusResource($device);
    }

    public function setPirMode(Request $request)
    {
        $data = $request->validate([
            'mode' => ['required', 'in:ARMED,ACTIVITY'],
        ]);

        $device = DeviceStatus::first();
        if ($device && $device->pir_mode !== $data['mode']) {
            $device->update(['pir_mode' => $data['mode']]);

            PirModeLog::create([
                'device_id' => $device->device_id,
                'pir_mode' => $data['mode'],
                'source' => 'web',
                'changed_by' => $request->user()->name,
            ]);
        }

        return response()->json(null, 204);
    }

    /**
     * Nyalakan/matikan flash LED ESP32-CAM. Perubahan disimpan di
     * database, lalu diambil firmware lewat polling /device/command
     * (mekanisme sama seperti sinkronisasi pir_mode).
     */
    public function setFlash(Request $request)
    {
        $data = $request->validate([
            'on' => ['required', 'boolean'],
        ]);

        DeviceStatus::first()?->update(['flash_on' => $data['on']]);

        return response()->json(null, 204);
    }

    /**
     * Riwayat perubahan status nyala/mati sensor PIR, dari web maupun
     * Telegram, supaya admin bisa memantau kapan & oleh siapa diubah.
     */
    public function pirModeLogs()
    {
        return PirModeLogResource::collection(
            PirModeLog::latest()->limit(100)->get()
        );
    }

    /**
     * Batalkan command pending (ENROLL/DELETE) yang belum direspon key box.
     * Personel pending_enroll dikembalikan ke 'failed', pending_revoke ke 'active'.
     */
    public function cancelPending()
    {
        Personnel::where('status', 'pending_enroll')->update(['status' => 'failed']);
        Personnel::where('status', 'pending_revoke')->update(['status' => 'active']);

        DeviceStatus::first()?->update([
            'pending_command' => 'NONE',
            'pending_target' => null,
            'pending_since' => null,
        ]);

        return response()->json(null, 204);
    }
}
