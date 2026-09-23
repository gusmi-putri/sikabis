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
    private const OFFLINE_THRESHOLD_SECONDS = 90;

    public function show()
    {
        $gudang = DeviceStatus::where('device_id', 'GUDANG-01')->first();
        $keybox = DeviceStatus::where('device_id', 'ESP32-KEYBOX-01')->first();

        if ($gudang && $gudang->status === 'online' && (! $gudang->last_seen || $gudang->last_seen->lt(now()->subSeconds(self::OFFLINE_THRESHOLD_SECONDS)))) {
            $gudang->update(['status' => 'offline']);
        }

        if ($keybox && $keybox->status === 'online' && (! $keybox->last_seen || $keybox->last_seen->lt(now()->subSeconds(self::OFFLINE_THRESHOLD_SECONDS)))) {
            $keybox->update(['status' => 'offline']);
        }

        // Merge keybox pending state into gudang state so frontend only needs 1 object
        if ($gudang && $keybox) {
            $gudang->pending_command = $keybox->pending_command;
            $gudang->pending_target = $keybox->pending_target;
            $gudang->pending_since = $keybox->pending_since;
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
            if ($data['mode'] === 'OFF' && !empty($data['duration_minutes'])) {
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

    public function cancelPending()
    {
        Personnel::where('status', 'pending_enroll')->update(['status' => 'failed']);
        Personnel::where('status', 'pending_revoke')->update(['status' => 'active']);

        DeviceStatus::where('device_id', 'ESP32-KEYBOX-01')->first()?->update([
            'pending_command' => 'NONE',
            'pending_target' => null,
            'pending_since' => null,
        ]);

        return response()->json(null, 204);
    }
}
