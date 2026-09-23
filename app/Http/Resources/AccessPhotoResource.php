<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AccessPhotoResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'device_id' => $this->device_id,
            'trigger_number' => $this->trigger_number,
            'image_path' => $this->image_path,
            'access_log_id' => $this->access_log_id,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
