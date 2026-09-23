<?php

namespace App\Http\Middleware;

use App\Models\DeviceStatus;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Autentikasi perangkat IoT (ESP32) memakai header X-Device-Key,
 * terpisah dari Sanctum yang dipakai operator/admin di web SPA.
 *
 * Firmware kotak kunci dua board mengirim identitasnya lewat field
 * `perangkat` dan kuncinya lewat `Authorization: Bearer`, jadi kedua
 * format itu juga diterima.
 */
class EnsureValidDeviceKey
{
    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $deviceId = $request->input('device_id') ?? $request->input('perangkat');
        $key = $request->header('X-Device-Key') ?? $request->bearerToken();

        if (! $deviceId || ! $key) {
            abort(401, 'device_id/perangkat dan X-Device-Key/Bearer token wajib disertakan.');
        }

        $device = DeviceStatus::where('device_id', $deviceId)
            ->where('api_key', $key)
            ->first();

        if (! $device) {
            abort(401, 'Device tidak dikenal atau API key salah.');
        }

        $request->attributes->set('device', $device);

        return $next($request);
    }
}
