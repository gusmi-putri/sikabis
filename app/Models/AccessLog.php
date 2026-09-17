<?php

namespace App\Models;

use Database\Factories\AccessLogFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['fingerprint_id', 'result', 'image_path', 'device_id'])]
class AccessLog extends Model
{
    /** @use HasFactory<AccessLogFactory> */
    use HasFactory;

    public function personnel()
    {
        return $this->belongsTo(Personnel::class, 'fingerprint_id', 'fingerprint_id');
    }
}
