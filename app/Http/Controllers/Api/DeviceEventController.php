<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MotionEvent;
use App\Models\PirModeLog;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
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

        $device->update(['status' => 'online', 'last_seen' => now()]);

        return response()->json([
            'pir_mode' => $device->pir_mode,
            'flash_on' => (bool) $device->flash_on,
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
            'captured_at' => ['nullable', 'date'],
        ]);

        $device = $request->attributes->get('device');
        $path = $request->file('photo')->store('motion-events', 'public');

        $event = new MotionEvent([
            'image_path' => Storage::disk('public')->url($path),
            'pir_mode' => $data['pir_mode'],
            'device_id' => $device->device_id,
        ]);

        // Firmware menyimpan foto di antrean saat server tidak terjangkau,
        // jadi upload bisa tiba jauh setelah gerakannya. captured_at (jam
        // NTP alat) dipakai sebagai waktu kejadian, selama masuk akal:
        // tidak di masa depan dan tidak lebih tua dari 7 hari.
        if (! empty($data['captured_at'])) {
            $capturedAt = Carbon::parse($data['captured_at'])->setTimezone(config('app.timezone'));

            if ($capturedAt->lte(now()->addMinutes(2)) && $capturedAt->gte(now()->subDays(7))) {
                $event->created_at = $capturedAt;
            }
        }

        $event->save();

        $device->update(['status' => 'online', 'last_seen' => now()]);

        return response()->json(['id' => $event->id], 201);
    }
}
