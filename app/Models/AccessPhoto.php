<?php

namespace App\Models;

use Database\Factories\AccessPhotoFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Foto dari kamera kotak kunci (Board B), diambil tepat saat jari
 * menyentuh sensor, sebelum hasil pencocokan diketahui.
 */
#[Fillable(['device_id', 'trigger_number', 'device_uptime_ms', 'image_path', 'access_log_id'])]
class AccessPhoto extends Model
{
    /** @use HasFactory<AccessPhotoFactory> */
    use HasFactory;

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
}
