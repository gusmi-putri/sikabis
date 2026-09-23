<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AccessLog;
use App\Models\AccessPhoto;
use App\Models\DeviceStatus;
use App\Models\Personnel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Endpoint untuk firmware kotak kunci dua board (lihat
 * Spesifikasi_Integrasi_ESP32_ke_Server.md):
 *
 * - Board A (sidik jari) mengirim satu log JSON per percobaan ke /device/keybox/log.
 * - Board B (ESP32-CAM) mengirim satu foto per percobaan ke /device/keybox/foto.
 *
 * Kedua board tidak berbagi nomor atau jam, jadi foto dipasangkan dengan
 * log berdasarkan jam server saat log diterima.
 */
class KeyBoxController extends Controller
{
    /**
     * Seberapa jauh ke belakang (detik) sebuah log mencari foto pasangannya.
     *
     * Spesifikasi menyarankan 3 detik, tapi itu hanya berlaku untuk percobaan
     * gagal. Untuk percobaan cocok, Board A menahan lognya sampai solenoid
     * terkunci lagi (5 detik, pengaman keras 8 detik), sehingga log baru
     * tiba 5-8 detik setelah fotonya.
     */
    public const PAIRING_WINDOW_SECONDS = 10;

    /**
     * Terima satu log percobaan akses dari Board A.
     *
     * Board A mengulang kiriman yang gagal (kode >= 400 atau timeout),
     * jadi log yang sudah tersimpan dibalas 200 tanpa disimpan ulang.
     */
    public function log(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nomor_kejadian' => ['required', 'integer', 'min:1'],
            'waktu_ms' => ['required', 'integer', 'min:0'],
            'hasil' => ['required', 'in:cocok,tidak_cocok,tidak_terbaca,keyakinan_rendah'],
            'id_sidik_jari' => ['required', 'integer'],
            'keyakinan' => ['required', 'integer', 'min:0'],
            'gagal_beruntun' => ['required', 'integer', 'min:0'],
            'alarm' => ['required', 'boolean'],
        ]);

        /** @var DeviceStatus $device */
        $device = $request->attributes->get('device');

        $log = DB::transaction(function () use ($data, $device) {
            $duplicate = AccessLog::where('device_id', $device->device_id)
                ->where('event_number', $data['nomor_kejadian'])
                ->where('device_uptime_ms', $data['waktu_ms'])
                ->first();

            if ($duplicate) {
                return $duplicate;
            }

            $previous = AccessLog::where('device_id', $device->device_id)
                ->whereNotNull('event_number')
                ->latest('id')
                ->lockForUpdate()
                ->first();

            [$missingBefore, $restarted] = $this->detectGap($previous, $data['nomor_kejadian'], $data['waktu_ms']);

            $photo = $this->findPhotoFor($device);
            $isMatch = $data['hasil'] === 'cocok';
            $fingerprintId = $isMatch && $data['id_sidik_jari'] > 0 ? $data['id_sidik_jari'] : null;

            $log = AccessLog::create([
                'fingerprint_id' => $fingerprintId,
                'personnel_id' => $fingerprintId
                    ? Personnel::where('fingerprint_id', $fingerprintId)->where('status', 'active')->value('id')
                    : null,
                'result' => $isMatch ? 'success' : 'failed',
                'reason' => $data['hasil'],
                'confidence' => $data['keyakinan'],
                'failed_streak' => $data['gagal_beruntun'],
                'alarm' => $data['alarm'],
                'image_path' => $photo?->image_path,
                'device_id' => $device->device_id,
                'event_number' => $data['nomor_kejadian'],
                'device_uptime_ms' => $data['waktu_ms'],
                'missing_before' => $missingBefore,
                'device_restarted' => $restarted,
            ]);

            $photo?->update(['access_log_id' => $log->id]);

            return $log;
        });

        $device->update(['status' => 'online', 'last_seen' => now()]);

        return response()->json(['ok' => true, 'id' => $log->id], $log->wasRecentlyCreated ? 201 : 200);
    }

    /**
     * Terima satu foto dari Board B. Foto disimpan tanpa pasangan dulu;
     * log dari Board A yang tiba sesudahnya yang akan mengklaimnya.
     */
    public function photo(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nomor_pemicu' => ['required', 'integer', 'min:1'],
            'waktu_ms' => ['required', 'integer', 'min:0'],
            'foto' => ['required', 'image', 'max:5120'],
        ]);

        /** @var DeviceStatus $device */
        $device = $request->attributes->get('device');
        $path = $request->file('foto')->store('access-photos', 'public');

        $photo = AccessPhoto::create([
            'device_id' => $device->device_id,
            'trigger_number' => $data['nomor_pemicu'],
            'device_uptime_ms' => $data['waktu_ms'],
            'image_path' => Storage::disk('public')->url($path),
        ]);

        $device->update(['status' => 'online', 'last_seen' => now()]);

        return response()->json(['ok' => true, 'id' => $photo->id], 201);
    }

    /**
     * Bandingkan nomor kejadian dengan log sebelumnya dari device yang sama.
     *
     * `waktu_ms` yang mundur berarti perangkat menyala ulang; nomor kejadian
     * lalu mulai lagi dari 1, sehingga nomor di bawahnya yang tidak sampai
     * ikut dihitung hilang.
     *
     * @return array{0: int, 1: bool} [jumlah log yang hilang, perangkat restart]
     */
    private function detectGap(?AccessLog $previous, int $eventNumber, int $uptimeMs): array
    {
        if (! $previous) {
            return [0, false];
        }

        $restarted = $uptimeMs < $previous->device_uptime_ms || $eventNumber <= $previous->event_number;

        if ($restarted) {
            return [$eventNumber - 1, true];
        }

        return [$eventNumber - $previous->event_number - 1, false];
    }

    /**
     * Foto terbaru dari kamera pasangan yang belum punya log dan tiba
     * dalam jendela pemasangan.
     */
    private function findPhotoFor(DeviceStatus $device): ?AccessPhoto
    {
        if (! $device->camera_device_id) {
            return null;
        }

        return AccessPhoto::where('device_id', $device->camera_device_id)
            ->whereNull('access_log_id')
            ->where('created_at', '>=', now()->subSeconds(self::PAIRING_WINDOW_SECONDS))
            ->latest('id')
            ->lockForUpdate()
            ->first();
    }
}
