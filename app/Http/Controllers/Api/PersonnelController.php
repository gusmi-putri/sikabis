<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PersonnelResource;
use App\Models\Personnel;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Pencatatan personel kotak kunci. Sidik jari didaftarkan langsung di
 * Board A lewat Serial Monitor (perintah `D`), yang menanyakan nomor ID
 * 1-127. Web hanya mencatat siapa pemilik nomor ID itu; perangkat pintu
 * sengaja tidak bisa diperintah dari jaringan.
 */
class PersonnelController extends Controller
{
    public function index()
    {
        return PersonnelResource::collection(Personnel::latest()->get());
    }

    public function store(Request $request)
    {
        $data = $this->validated($request, null, requireFingerprint: false);

        // Jika fingerprint_id tidak dikirim, auto-assign ID terkecil yang bebas.
        if (empty($data['fingerprint_id'])) {
            $usedIds = Personnel::whereNotNull('fingerprint_id')->pluck('fingerprint_id')->toArray();
            $freeId = null;
            for ($i = 1; $i <= 127; $i++) {
                if (!in_array($i, $usedIds)) {
                    $freeId = $i;
                    break;
                }
            }

            if (!$freeId) {
                abort(400, 'Kapasitas sidik jari penuh (maksimal 127 orang).');
            }

            $data['fingerprint_id'] = $freeId;
        }

        $personnel = Personnel::create([
            ...$data,
            'status' => 'active',
        ]);

        // Langsung kirim perintah ENROLL ke Board A
        $device = \App\Models\DeviceStatus::where('device_id', 'kotak-kunci-01')->first();
        if ($device) {
            $device->update([
                'keybox_command' => 'ENROLL',
                'keybox_command_at' => now(),
                'keybox_command_target' => $personnel->fingerprint_id,
                'keybox_enroll_message' => 'Menunggu pendaftaran sidik jari di alat...',
                'keybox_enroll_message_at' => now(),
            ]);
        }

        return new PersonnelResource($personnel);
    }

    public function update(Request $request, Personnel $personnel)
    {
        $data = $this->validated($request, $personnel, requireFingerprint: $personnel->status === 'active');

        // Personel nonaktif diaktifkan lagi dengan memberinya ID sidik jari baru.
        if (! empty($data['fingerprint_id'])) {
            $data['status'] = 'active';
        }

        $personnel->update($data);

        return new PersonnelResource($personnel);
    }

    /**
     * Cabut akses. ID sidik jari dilepas supaya bisa dipakai personel lain;
     * log lama tetap tercatat atas nama personel ini lewat personnel_id.
     * Template di sensor tetap harus dihapus di Board A.
     */
    public function deactivate(Personnel $personnel)
    {
        $fingerprintId = $personnel->fingerprint_id;
        
        $personnel->update(['status' => 'inactive', 'fingerprint_id' => null]);

        // Antrekan perintah DELETE ke Board A jika sebelumnya punya ID
        if ($fingerprintId) {
            $device = \App\Models\DeviceStatus::where('device_id', 'kotak-kunci-01')->first();
            if ($device) {
                $device->update([
                    'keybox_command' => 'DELETE',
                    'keybox_command_at' => now(),
                    'keybox_command_target' => $fingerprintId,
                ]);
            }
        }

        return new PersonnelResource($personnel);
    }

    /**
     * @return array{name: string, rank_nrp: ?string, notes: ?string, fingerprint_id?: ?int}
     */
    private function validated(Request $request, ?Personnel $personnel = null, bool $requireFingerprint = true): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'rank_nrp' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'fingerprint_id' => [
                $requireFingerprint ? 'required' : 'nullable',
                'integer',
                'between:1,127',
                Rule::unique('personnel', 'fingerprint_id')->ignore($personnel?->id),
            ],
        ], [
            'fingerprint_id.unique' => 'ID sidik jari ini sudah dipakai personel lain.',
            'fingerprint_id.between' => 'ID sidik jari harus 1 sampai 127.',
        ]);
    }
}
