<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MotionEventResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'image_path' => $this->image_path,
            'pir_mode' => $this->pir_mode,
            'device_id' => $this->device_id,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
