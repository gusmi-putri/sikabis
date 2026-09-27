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
            'auto_arm_at' => $this->auto_arm_at?->toIso8601String(),
            // Cuma dianggap "masih berlaku" kalau baru dilaporkan dalam
            // 90 detik terakhir -- kalau lebih lama, proses enroll
            // sebelumnya dianggap sudah selesai/ditinggalkan, bukan
            // ditampilkan sebagai instruksi basi yang membingungkan.
            'enroll_message' => $this->keybox_enroll_message_at && $this->keybox_enroll_message_at->gt(now()->subSeconds(90))
                ? $this->keybox_enroll_message
                : null,
        ];
    }
}
