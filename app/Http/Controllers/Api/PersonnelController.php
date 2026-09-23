<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PersonnelResource;
use App\Models\DeviceStatus;
use App\Models\Personnel;
use Illuminate\Http\Request;

class PersonnelController extends Controller
{
    public function index()
    {
        return PersonnelResource::collection(Personnel::latest()->get());
    }

    public function enroll(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'rank_nrp' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ]);

        $personnel = Personnel::create([
            ...$data,
            'status' => 'pending_enroll',
        ]);

        DeviceStatus::where('device_id', 'ESP32-KEYBOX-01')->first()?->update([
            'pending_command' => 'ENROLL',
            'pending_target' => null,
            'pending_since' => now(),
        ]);

        return new PersonnelResource($personnel);
    }

    public function update(Request $request, Personnel $personnel)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'rank_nrp' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ]);

        $personnel->update($data);

        return new PersonnelResource($personnel);
    }

    public function revoke(Request $request)
    {
        $data = $request->validate([
            'fingerprint_id' => ['required', 'integer'],
        ]);

        $personnel = Personnel::where('fingerprint_id', $data['fingerprint_id'])->firstOrFail();
        $personnel->update(['status' => 'pending_revoke']);

        DeviceStatus::where('device_id', 'ESP32-KEYBOX-01')->first()?->update([
            'pending_command' => 'DELETE',
            'pending_target' => $data['fingerprint_id'],
            'pending_since' => now(),
        ]);

        return response()->json(null, 204);
    }
}
