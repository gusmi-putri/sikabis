<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AccessLogResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'fingerprint_id' => $this->fingerprint_id,
            'result' => $this->result,
            'reason' => $this->reason,
            'confidence' => $this->confidence,
            'failed_streak' => $this->failed_streak,
            'alarm' => (bool) $this->alarm,
            'image_path' => $this->image_path,
            'device_id' => $this->device_id,
            'event_number' => $this->event_number,
            'missing_before' => (int) $this->missing_before,
            'device_restarted' => (bool) $this->device_restarted,
            'created_at' => $this->created_at?->toIso8601String(),
            'personnel_name' => $this->whenLoaded('personnel', fn () => $this->personnel?->name),
        ];
    }
}
