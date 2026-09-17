<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DeviceStatusResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'device_id' => $this->device_id,
            'status' => $this->status,
            'pir_mode' => $this->pir_mode,
            'flash_on' => (bool) $this->flash_on,
            'stream_url' => $this->stream_url,
            'last_seen' => $this->last_seen?->toIso8601String(),
            'pending_command' => $this->pending_command,
            'pending_target' => $this->pending_target,
            'pending_since' => $this->pending_since?->toIso8601String(),
        ];
    }
}
