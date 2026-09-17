<?php

namespace App\Http\Middleware;

use App\Models\DeviceStatus;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Autentikasi perangkat IoT (ESP32) memakai header X-Device-Key,
 * terpisah dari Sanctum yang dipakai operator/admin di web SPA.
 */
class EnsureValidDeviceKey
{
    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $deviceId = $request->input('device_id');
        $key = $request->header('X-Device-Key');

        if (! $deviceId || ! $key) {
            abort(401, 'device_id dan X-Device-Key wajib disertakan.');
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
