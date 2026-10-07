<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AccessLog;
use App\Models\AccessPhoto;
use App\Models\DeviceStatus;
use App\Models\Personnel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Endpoint untuk firmware kotak kunci dua board (lihat
 * Spesifikasi_Integrasi_ESP32_ke_Server.md):
 *
 * - Board A (sidik jari) mengirim satu log JSON per percobaan ke /device/keybox/log.
 * - Board B (ESP32-CAM) mengirim satu foto per percobaan ke /device/keybox/foto.
 *
 * Kedua board tidak berbagi nomor atau jam. Masing-masing mengirim
 * `umur_ms` (sudah berapa lama kejadiannya saat dikirim), sehingga server
 * bisa menghitung waktu kejadian sebenarnya walau kiriman tertahan di
 * antrean. Foto dipasangkan dengan log yang waktu kejadiannya paling dekat.
 */
class KeyBoxController extends Controller
{
    /**
     * Selisih waktu kejadian maksimum (detik) antara foto dan log agar
     * masih bisa dipasangkan, ke arah mana pun.
     *
     * Dengan `umur_ms`, selisih sebenarnya hanya 0-2 detik (foto diambil
     * saat jari menempel, log dicatat begitu pencocokan selesai). Jendela
     * lebar ini untuk firmware lama tanpa `umur_ms`, yang waktunya jam
     * tiba: log cocok baru tiba 5-8 detik setelah fotonya (ditahan sampai
     * solenoid terkunci), foto percobaan gagal tiba beberapa detik setelah
     * lognya. Kalau ada beberapa kandidat, yang paling dekat yang dipilih.
     */
    public const PAIRING_WINDOW_SECONDS = 10;

    /**
     * Selisih `waktu_ms` maksimum (milidetik) agar foto dengan nomor pemicu
     * yang sama dianggap kiriman ulang, bukan pemotretan baru.
     *
     * Board B mengulang kiriman saat balasan server tidak datang dalam
     * TIMEOUT_HTTP, padahal kiriman pertama sering sudah tersimpan.
     * Firmware lama menghitung ulang `waktu_ms` di tiap percobaan
     * (selisih ~5,4 detik); firmware baru mengirim jam potret yang sama
     * (selisih 0).
     */
    public const PHOTO_RETRY_TOLERANCE_MS = 30000;

    /** Batas `umur_ms` yang masih dipercaya (7 hari). */
    private const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

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
            'umur_ms' => ['nullable', 'integer', 'min:0'],
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

            $occurredAt = $this->eventTime($data['umur_ms'] ?? null);
            $photo = $this->findPhotoFor($device, $occurredAt);
            $isMatch = $data['hasil'] === 'cocok';
            $fingerprintId = $isMatch && $data['id_sidik_jari'] > 0 ? $data['id_sidik_jari'] : null;

            $log = new AccessLog([
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
            $log->created_at = $occurredAt;
            $log->save();

            $photo?->update(['access_log_id' => $log->id]);

            return $log;
        });

        $device->update(['status' => 'online', 'last_seen' => now()]);

        return response()->json(['ok' => true, 'id' => $log->id], $log->wasRecentlyCreated ? 201 : 200);
    }

    /**
     * Terima satu foto dari Board B.
     *
     * Urutan tibanya foto dan log tidak tetap. Untuk PERCOBAAN COCOK, log
     * dari Board A ditahan sampai solenoid terkunci lagi, jadi foto tiba
     * lebih dulu dan nanti diklaim findPhotoFor() saat log tiba. Untuk
     * PERCOBAAN GAGAL, log sering sudah lebih dulu sampai, jadi foto yang
     * menyusul mencari lognya di sini. Tanpa pemasangan mundur ini, foto
     * percobaan gagal selamanya jadi yatim -- padahal itu justru bukti
     * yang paling penting untuk dicatat.
     *
     * Board B mengulang kiriman yang tidak dibalas; kiriman ulang dibalas
     * 200 dengan id foto yang sudah ada tanpa disimpan lagi.
     */
    public function photo(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nomor_pemicu' => ['required', 'integer', 'min:1'],
            'waktu_ms' => ['required', 'integer', 'min:0'],
            'foto' => ['required', 'image', 'max:5120'],
            'umur_ms' => ['nullable', 'integer', 'min:0'],
        ]);

        /** @var DeviceStatus $device */
        $device = $request->attributes->get('device');
        $capturedAt = $this->eventTime($data['umur_ms'] ?? null);

        $retried = AccessPhoto::retryOf($device->device_id, $data['nomor_pemicu'], $data['waktu_ms'], $capturedAt)->first();

        if ($retried) {
            $device->update(['status' => 'online', 'last_seen' => now()]);

            return response()->json(['ok' => true, 'id' => $retried->id]);
        }

        $path = $request->file('foto')->store('access-photos', 'public');

        $photo = DB::transaction(function () use ($data, $device, $path, $capturedAt) {
            $photo = new AccessPhoto([
                'device_id' => $device->device_id,
                'trigger_number' => $data['nomor_pemicu'],
                'device_uptime_ms' => $data['waktu_ms'],
                'image_path' => Storage::disk('public')->url($path),
            ]);
            $photo->created_at = $capturedAt;
            $photo->save();

            $fingerprintBoard = DeviceStatus::where('camera_device_id', $device->device_id)->first();

            if ($fingerprintBoard) {
                $orphanLog = $this->closestTo($capturedAt, AccessLog::where('device_id', $fingerprintBoard->device_id)
                    ->whereNull('image_path')
                    ->whereBetween('created_at', $this->pairingRange($capturedAt))
                    ->lockForUpdate()
                    ->get());

                if ($orphanLog) {
                    $orphanLog->update(['image_path' => $photo->image_path]);
                    $photo->update(['access_log_id' => $orphanLog->id]);
                }
            }

            return $photo;
        });

        $device->update(['status' => 'online', 'last_seen' => now()]);

        return response()->json(['ok' => true, 'id' => $photo->id], 201);
    }

    /**
     * Dipoll berkala oleh Board A untuk menerima perintah dari dashboard
     * web (mute alarm / paksa kunci). SENGAJA tidak ada perintah untuk
     * membuka solenoid dari jarak jauh -- itu tetap hanya bisa dipicu
     * fisik oleh sidik jari yang cocok, demi keamanan.
     *
     * Sekali diambil, perintah langsung direset ke NONE (fire-and-forget,
     * tidak ada acknowledgement karena kedua aksi aman diulang).
     */
    public function command(Request $request): JsonResponse
    {
        /** @var DeviceStatus $device */
        $device = $request->attributes->get('device');

        $command = $device->keybox_command;
        $target = $device->keybox_command_target;

        if ($command !== 'NONE') {
            $device->update(['keybox_command' => 'NONE', 'keybox_command_at' => null, 'keybox_command_target' => null]);
        }

        $device->update(['status' => 'online', 'last_seen' => now()]);

        return response()->json(['command' => $command, 'target' => $target]);
    }

    /**
     * Board A melaporkan ID yang terisi di sensor setelah perintah SCAN.
     */
    public function templates(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids' => ['present', 'array', 'max:127'],
            'ids.*' => ['integer', 'between:1,127'],
        ]);

        /** @var DeviceStatus $device */
        $device = $request->attributes->get('device');

        Cache::put(KeyBoxTemplateController::CACHE_KEY, [
            'ids' => array_values(array_unique($data['ids'])),
            'at' => now()->toIso8601String(),
        ], now()->addDay());

        $device->update(['status' => 'online', 'last_seen' => now()]);

        return response()->json(null, 204);
    }

    /**
     * Dipanggil Board A di tiap tahap proses enroll/delete sidik jari
     * ("Tempelkan jari", "Angkat jari...", "Berhasil disimpan", dst).
     * Operator melihat pesan ini live di dashboard web, jadi tidak perlu
     * buka Serial Monitor untuk tahu kapan harus menyentuh sensor.
     */
    public function enrollStatus(Request $request): JsonResponse
    {
        $data = $request->validate([
            'message' => ['required', 'string', 'max:255'],
        ]);

        /** @var DeviceStatus $device */
        $device = $request->attributes->get('device');
        $device->update([
            'keybox_enroll_message' => $data['message'],
            'keybox_enroll_message_at' => now(),
            'status' => 'online',
            'last_seen' => now(),
        ]);

        return response()->json(null, 204);
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
     * Foto dari kamera pasangan yang belum punya log dan waktu potretnya
     * paling dekat dengan waktu kejadian log.
     */
    private function findPhotoFor(DeviceStatus $device, Carbon $occurredAt): ?AccessPhoto
    {
        if (! $device->camera_device_id) {
            return null;
        }

        return $this->closestTo($occurredAt, AccessPhoto::where('device_id', $device->camera_device_id)
            ->whereNull('access_log_id')
            ->whereBetween('created_at', $this->pairingRange($occurredAt))
            ->lockForUpdate()
            ->get());
    }

    /**
     * Waktu kejadian menurut jam server: jam tiba dikurangi umur kiriman.
     * Tanpa `umur_ms` (firmware lama) atau dengan umur yang tidak masuk
     * akal, jam tiba yang dipakai.
     */
    private function eventTime(?int $ageMs): Carbon
    {
        if ($ageMs === null || $ageMs > self::MAX_AGE_MS) {
            return now();
        }

        return now()->subMilliseconds($ageMs);
    }

    /**
     * @return array{0: Carbon, 1: Carbon}
     */
    private function pairingRange(Carbon $time): array
    {
        return [
            $time->copy()->subSeconds(self::PAIRING_WINDOW_SECONDS),
            $time->copy()->addSeconds(self::PAIRING_WINDOW_SECONDS),
        ];
    }

    /**
     * @template TModel of AccessLog|AccessPhoto
     *
     * @param  Collection<int, TModel>  $candidates
     * @return TModel|null
     */
    private function closestTo(Carbon $time, Collection $candidates): AccessLog|AccessPhoto|null
    {
        return $candidates->sortBy(fn (AccessLog|AccessPhoto $candidate) => abs($candidate->created_at->diffInMilliseconds($time)))->first();
    }
}
