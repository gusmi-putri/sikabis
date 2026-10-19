<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

/**
 * Jejak tindakan operator: siapa mengubah apa dan kapan. Dipakai untuk
 * audit, bukan untuk logika aplikasi.
 */
#[Fillable(['user_id', 'user_name', 'action', 'target', 'detail', 'ip_address'])]
class ActivityLog extends Model
{
    public const LABELS = [
        'auth.login' => 'Login',
        'auth.login_failed' => 'Login gagal',
        'personnel.create' => 'Mencatat personel',
        'personnel.update' => 'Mengubah data personel',
        'personnel.deactivate' => 'Mencabut akses personel',
        'user.create' => 'Membuat akun',
        'user.update' => 'Mengubah akun',
        'user.toggle_active' => 'Mengubah status aktif akun',
        'user.delete' => 'Menghapus akun',
        'sensor.set' => 'Mengubah status sensor',
        'flash.set' => 'Mengubah flash kamera',
        'keybox.command' => 'Perintah ke kotak kunci',
    ];

    protected function casts(): array
    {
        return ['detail' => 'array'];
    }

    /**
     * Catat satu tindakan. Kegagalan menulis log tidak boleh menggagalkan
     * tindakan aslinya (misal perintah ke alat), jadi cuma dilaporkan.
     */
    public static function record(
        Request $request,
        string $action,
        ?string $target = null,
        array $detail = [],
        ?User $actor = null,
    ): void {
        $actor ??= $request->user();

        try {
            static::create([
                'user_id' => $actor?->id,
                'user_name' => $actor?->name,
                'action' => $action,
                'target' => $target,
                'detail' => $detail ?: null,
                'ip_address' => $request->ip(),
            ]);
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
