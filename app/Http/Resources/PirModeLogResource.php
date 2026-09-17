<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PirModeLogResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'device_id' => $this->device_id,
            'pir_mode' => $this->pir_mode,
            'source' => $this->source,
            'changed_by' => $this->changed_by,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
