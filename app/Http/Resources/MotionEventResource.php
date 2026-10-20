<?php

namespace App\Http\Resources;

use App\Support\MediaUrl;
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
            'image_path' => MediaUrl::signed($this->image_path),
            'pir_mode' => $this->pir_mode,
            'sensor_label' => $this->pir_mode === 'ON' ? 'Nyala' : 'Mati',
            'device_id' => $this->device_id,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
