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
        $personnel = Personnel::create([
            ...$this->validated($request),
            'status' => 'active',
        ]);

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
        $personnel->update(['status' => 'inactive', 'fingerprint_id' => null]);

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
            'fingerprint_id.between' => 'ID sidik jari harus 1 sampai 127, sama dengan yang diketik saat pendaftaran di Board A.',
        ]);
    }
}
