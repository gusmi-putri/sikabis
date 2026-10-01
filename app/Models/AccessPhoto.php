<?php

namespace App\Models;

use App\Http\Controllers\Api\KeyBoxController;
use Database\Factories\AccessPhotoFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Foto dari kamera kotak kunci (Board B), diambil tepat saat jari
 * menyentuh sensor, sebelum hasil pencocokan diketahui.
 */
#[Fillable(['device_id', 'trigger_number', 'device_uptime_ms', 'image_path', 'access_log_id'])]
class AccessPhoto extends Model
{
    /** @use HasFactory<AccessPhotoFactory> */
    use HasFactory;

    /** Milidetik ikut disimpan; foto dan log dipasangkan berdasarkan waktu kejadian. */
    protected $dateFormat = 'Y-m-d H:i:s.v';

    protected static function booted(): void
    {
        // File JPEG ikut dihapus supaya foto yang dibuang tidak tertinggal
        // di storage tanpa baris database.
        static::deleted(function (AccessPhoto $photo) {
            Storage::disk('public')->delete(Str::after($photo->image_path, '/storage/'));
        });
    }

    protected function casts(): array
    {
        return [
            'trigger_number' => 'integer',
            'device_uptime_ms' => 'integer',
        ];
    }

    public function accessLog(): BelongsTo
    {
        return $this->belongsTo(AccessLog::class);
    }

    /**
     * Foto sebelumnya dari pemotretan yang sama: nomor pemicu sama dan
     * `waktu_ms` hanya sedikit lebih awal (kiriman ulang Board B). Batas
     * waktu potret mencegah foto dari sesi sebelum board menyala ulang
     * (nomor pemicu kembali ke 1) ikut dianggap kiriman ulang.
     *
     * @param  Builder<AccessPhoto>  $query
     */
    public function scopeRetryOf(Builder $query, string $deviceId, int $triggerNumber, int $uptimeMs, Carbon $capturedAt): void
    {
        $query->where('device_id', $deviceId)
            ->where('trigger_number', $triggerNumber)
            ->whereBetween('device_uptime_ms', [$uptimeMs - KeyBoxController::PHOTO_RETRY_TOLERANCE_MS, $uptimeMs])
            ->whereBetween('created_at', [
                $capturedAt->copy()->subMilliseconds(KeyBoxController::PHOTO_RETRY_TOLERANCE_MS),
                $capturedAt->copy()->addMilliseconds(KeyBoxController::PHOTO_RETRY_TOLERANCE_MS),
            ]);
    }
}
