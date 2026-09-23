<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['device_id', 'api_key', 'status', 'pir_mode', 'flash_on', 'stream_url', 'camera_device_id', 'last_seen', 'pending_command', 'pending_target', 'pending_since'])]
#[Hidden(['api_key'])]
class DeviceStatus extends Model
{
    protected $table = 'device_statuses';

    protected $primaryKey = 'device_id';

    protected $keyType = 'string';

    public $incrementing = false;

    protected function casts(): array
    {
        return [
            'last_seen' => 'datetime',
            'pending_since' => 'datetime',
            'pending_target' => 'integer',
            'flash_on' => 'boolean',
        ];
    }
}
