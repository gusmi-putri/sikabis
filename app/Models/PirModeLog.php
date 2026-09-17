<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['device_id', 'pir_mode', 'source', 'changed_by'])]
class PirModeLog extends Model
{
}
