<?php

namespace App\Models;

use Database\Factories\AccessLogFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable([
    'fingerprint_id', 'personnel_id', 'result', 'reason', 'confidence', 'failed_streak', 'alarm',
    'image_path', 'device_id', 'event_number', 'device_uptime_ms', 'missing_before', 'device_restarted',
])]
class AccessLog extends Model
{
    /** @use HasFactory<AccessLogFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'fingerprint_id' => 'integer',
            'confidence' => 'integer',
            'failed_streak' => 'integer',
            'alarm' => 'boolean',
            'event_number' => 'integer',
            'device_uptime_ms' => 'integer',
            'missing_before' => 'integer',
            'device_restarted' => 'boolean',
        ];
    }

    public function personnel(): BelongsTo
    {
        return $this->belongsTo(Personnel::class);
    }

    public function photo(): HasOne
    {
        return $this->hasOne(AccessPhoto::class);
    }
}
