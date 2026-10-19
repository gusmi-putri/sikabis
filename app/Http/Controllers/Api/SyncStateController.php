<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AccessLog;
use App\Models\AccessPhoto;
use App\Models\MotionEvent;
use App\Models\Personnel;
use App\Models\PirModeLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Sidik jari perubahan tiap daftar data, murah dihitung (agregat, tanpa
 * mengambil baris). Dashboard memanggil ini tiap beberapa detik dan baru
 * mengunduh ulang daftar yang sidik jarinya berubah, sehingga polling
 * tidak lagi memuat seluruh log setiap 2 detik.
 */
class SyncStateController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $personnel = $this->fingerprint(Personnel::class);

        // Foto baru masuk daftar "tanpa log" hanya setelah jendela pemasangan
        // lewat, tanpa ada baris yang berubah -- jadi jumlahnya ikut dihitung.
        $unpaired = AccessPhoto::whereNull('access_log_id')
            ->where('created_at', '<', now()->subSeconds(KeyBoxController::PAIRING_WINDOW_SECONDS))
            ->count();

        return response()->json(['data' => [
            // Nama personel ikut tampil di log akses, jadi perubahan personel
            // juga mengubah sidik jari log.
            'access_logs' => md5($this->fingerprint(AccessLog::class).$personnel),
            'access_photos' => md5($this->fingerprint(AccessPhoto::class).'|'.$unpaired),
            'motion_events' => md5($this->fingerprint(MotionEvent::class)),
            'personnel' => md5($personnel),
            'pir_mode_logs' => md5($this->fingerprint(PirModeLog::class)),
            'users' => $request->user()->role === 'admin_pam'
                ? md5($this->fingerprint(User::class))
                : null,
        ]]);
    }

    /**
     * @param  class-string<\Illuminate\Database\Eloquent\Model>  $model
     */
    private function fingerprint(string $model): string
    {
        $row = $model::query()
            ->selectRaw('COUNT(*) as c, MAX(id) as m, MAX(updated_at) as u')
            ->first();

        return "{$row->c}|{$row->m}|{$row->u}";
    }
}
