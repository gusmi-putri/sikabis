<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DeviceStatus;
use App\Models\Personnel;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

/**
 * Pengelolaan template sidik jari yang tersimpan di sensor AS608 (Board A).
 * Hanya Admin PAM. Hasil pindai dari Board A disimpan di cache, bukan di
 * tabel, supaya tidak perlu migrasi baru.
 */
class KeyBoxTemplateController extends Controller
{
    public const CACHE_KEY = 'keybox:templates';

    public function index(): JsonResponse
    {
        $snapshot = Cache::get(self::CACHE_KEY, ['ids' => [], 'at' => null]);
        $activeIds = Personnel::where('status', 'active')
            ->whereNotNull('fingerprint_id')
            ->pluck('fingerprint_id')
            ->all();

        return response()->json(['data' => [
            'scanned_at' => $snapshot['at'],
            'sensor_ids' => $snapshot['ids'],
            'orphan_ids' => array_values(array_diff($snapshot['ids'], $activeIds)),
        ]]);
    }

    public function scan(): JsonResponse
    {
        $this->device()->update([
            'keybox_command' => 'SCAN',
            'keybox_command_at' => now(),
            'keybox_command_target' => null,
        ]);

        return response()->json(['ok' => true], 202);
    }

    public function destroy(int $fingerprintId): JsonResponse
    {
        abort_if($fingerprintId < 1 || $fingerprintId > 127, 422, 'ID sidik jari harus 1 sampai 127.');
        abort_if(
            Personnel::where('status', 'active')->where('fingerprint_id', $fingerprintId)->exists(),
            422,
            'ID ini masih dipakai personel aktif. Nonaktifkan personelnya dulu.'
        );

        $this->device()->update([
            'keybox_command' => 'DELETE',
            'keybox_command_at' => now(),
            'keybox_command_target' => $fingerprintId,
        ]);

        $snapshot = Cache::get(self::CACHE_KEY);
        if ($snapshot) {
            $snapshot['ids'] = array_values(array_diff($snapshot['ids'], [$fingerprintId]));
            Cache::put(self::CACHE_KEY, $snapshot, now()->addDay());
        }

        return response()->json(null, 202);
    }

    private function device(): DeviceStatus
    {
        return DeviceStatus::where('device_id', 'kotak-kunci-01')->firstOrFail();
    }
}
