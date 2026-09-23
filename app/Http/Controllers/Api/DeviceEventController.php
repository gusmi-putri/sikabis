<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MotionEvent;
use App\Models\PirModeLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * Endpoint khusus perangkat IoT (ESP32-CAM gudang), diautentikasi lewat
 * middleware EnsureValidDeviceKey — bukan Sanctum, karena yang memanggil
 * bukan browser/operator melainkan firmware.
 */
class DeviceEventController extends Controller
{
    /**
     * Dipanggil berkala oleh ESP32 supaya dashboard tahu perangkat online
     * dan mode PIR fisiknya saat ini.
     */
    public function heartbeat(Request $request)
    {
        $data = $request->validate([
            'pir_mode' => ['nullable', 'in:ON,OFF'],
            'stream_url' => ['nullable', 'url', 'max:255'],
            'flash_on' => ['nullable', 'boolean'],
        ]);

        $device = $request->attributes->get('device');

        // Firmware hanya menyertakan pir_mode di heartbeat tepat setelah
        // command /piron atau /piroff dari Telegram -- jadi kalau nilainya
        // berubah di sini, sumbernya pasti Telegram (bukan web, yang
        // punya jalurnya sendiri lewat setPirMode()).
        if (isset($data['pir_mode']) && $data['pir_mode'] !== $device->pir_mode) {
            PirModeLog::create([
                'device_id' => $device->device_id,
                'pir_mode' => $data['pir_mode'],
                'source' => 'telegram',
                'changed_by' => null,
            ]);
        }

        $device->update([
            'status' => 'online',
            'last_seen' => now(),
            ...(isset($data['pir_mode']) ? ['pir_mode' => $data['pir_mode']] : []),
            // stream_url dikirim di SETIAP heartbeat (bukan cuma saat
            // berubah) supaya web selalu tahu IP terbaru walau DHCP
            // mengganti alamat device tanpa pemberitahuan.
            ...(isset($data['stream_url']) ? ['stream_url' => $data['stream_url']] : []),
            // flash_on juga dikirim setiap heartbeat, sumbernya command
            // /flash dari Telegram -- supaya tombol flash di web selalu
            // menampilkan kondisi fisik LED yang sebenarnya.
            ...(isset($data['flash_on']) ? ['flash_on' => $data['flash_on']] : []),
        ]);

        return response()->json(null, 204);
    }

    /**
     * Dipoll berkala oleh ESP32 untuk menyinkronkan mode PIR yang diset
     * Admin PAM dari dashboard web (PIRControlPanel -> /device/pir-mode).
     */
    public function command(Request $request)
    {
        $device = $request->attributes->get('device');

        return response()->json([
            'pir_mode' => $device->pir_mode,
            'flash_on' => (bool) $device->flash_on,
            'pending_command' => $device->pending_command,
            'pending_target' => $device->pending_target,
        ]);
    }

    /**
     * Terima foto dari ESP32-CAM saat PIR mendeteksi gerakan, simpan ke
     * storage publik, dan catat sebagai motion_events supaya muncul di
     * dashboard (MotionEventPanel / MotionLogView).
     */
    public function motionEvent(Request $request)
    {
        $data = $request->validate([
            'pir_mode' => ['required', 'in:ON,OFF'],
            'photo' => ['required', 'image', 'max:5120'],
        ]);

        $device = $request->attributes->get('device');
        $path = $request->file('photo')->store('motion-events', 'public');

        $event = MotionEvent::create([
            'image_path' => Storage::disk('public')->url($path),
            'pir_mode' => $data['pir_mode'],
            'device_id' => $device->device_id,
        ]);

        $device->update(['status' => 'online', 'last_seen' => now()]);

        return response()->json(['id' => $event->id], 201);
    }

    /**
     * Dipanggil oleh Key Box setelah mencoba menjalankan perintah ENROLL atau DELETE.
     */
    public function ackCommand(Request $request)
    {
        $data = $request->validate([
            'command' => ['required', 'in:ENROLL,DELETE'],
            'target' => ['nullable', 'integer'], // Untuk ENROLL, ini adalah ID yang baru di-assign. Untuk DELETE, ini ID yang dihapus.
            'success' => ['required', 'boolean'],
        ]);

        $device = $request->attributes->get('device');

        if ($data['command'] === 'ENROLL') {
            $personnel = \App\Models\Personnel::where('status', 'pending_enroll')->first();
            if ($personnel) {
                if ($data['success'] && $data['target'] !== null) {
                    $personnel->update([
                        'status' => 'active',
                        'fingerprint_id' => $data['target']
                    ]);
                } else {
                    $personnel->update(['status' => 'failed']);
                }
            }
        } elseif ($data['command'] === 'DELETE') {
            $personnel = \App\Models\Personnel::where('fingerprint_id', $data['target'])
                ->where('status', 'pending_revoke')
                ->first();
            if ($personnel) {
                if ($data['success']) {
                    $personnel->update([
                        'status' => 'inactive',
                        'fingerprint_id' => null // Lepaskan ID agar bisa dipakai orang lain
                    ]);
                } else {
                    $personnel->update(['status' => 'active']);
                }
            }
        }

        // Bersihkan pending_command di device status
        $device->update([
            'pending_command' => 'NONE',
            'pending_target' => null,
            'pending_since' => null,
            'status' => 'online',
            'last_seen' => now()
        ]);

        return response()->json(null, 204);
    }

    /**
     * Dipanggil oleh Key Box setiap kali seseorang menscan sidik jari.
     */
    public function accessLog(Request $request)
    {
        $data = $request->validate([
            'fingerprint_id' => ['required', 'integer'],
            'result' => ['required', 'in:success,failed'],
            'photo' => ['nullable', 'image', 'max:5120'],
        ]);

        $device = $request->attributes->get('device');
        
        $imagePath = null;
        if ($request->hasFile('photo')) {
            $path = $request->file('photo')->store('access-logs', 'public');
            $imagePath = Storage::disk('public')->url($path);
        }

        $log = \App\Models\AccessLog::create([
            'fingerprint_id' => $data['fingerprint_id'],
            'result' => $data['result'],
            'image_path' => $imagePath,
            'device_id' => $device->device_id,
        ]);

        $device->update(['status' => 'online', 'last_seen' => now()]);

        return response()->json(['id' => $log->id], 201);
    }
}
