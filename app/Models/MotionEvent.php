<?php

namespace App\Models;

use Database\Factories\MotionEventFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['image_path', 'pir_mode', 'device_id'])]
class MotionEvent extends Model
{
    /** @use HasFactory<MotionEventFactory> */
    use HasFactory;
}
