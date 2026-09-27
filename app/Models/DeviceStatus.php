<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['device_id', 'api_key', 'status', 'pir_mode', 'flash_on', 'stream_url', 'camera_device_id', 'last_seen', 'auto_arm_at', 'keybox_command', 'keybox_command_at', 'keybox_command_target', 'keybox_enroll_message', 'keybox_enroll_message_at'])]
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
            'flash_on' => 'boolean',
            'auto_arm_at' => 'datetime',
            'keybox_command_at' => 'datetime',
            'keybox_enroll_message_at' => 'datetime',
        ];
    }
}
