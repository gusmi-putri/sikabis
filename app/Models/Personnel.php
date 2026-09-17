<?php

namespace App\Models;

use Database\Factories\PersonnelFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['name', 'rank_nrp', 'fingerprint_id', 'status', 'notes'])]
class Personnel extends Model
{
    /** @use HasFactory<PersonnelFactory> */
    use HasFactory;

    protected $table = 'personnel';

    protected function casts(): array
    {
        return [
            'fingerprint_id' => 'integer',
        ];
    }
}
