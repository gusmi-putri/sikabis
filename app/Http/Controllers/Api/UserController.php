<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function index()
    {
        return UserResource::collection(User::latest()->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'username' => ['required', 'string', 'max:255', 'unique:users,username'],
            'password' => ['required', 'string', 'min:4'],
            'role' => ['required', 'in:piket,admin_pam'],
        ]);

        $user = User::create([
            ...$data,
            'password' => Hash::make($data['password']),
            'is_active' => true,
        ]);

        return new UserResource($user);
    }

    public function toggleActive(User $user)
    {
        $this->ensurePiket($user);

        $user->update(['is_active' => ! $user->is_active]);

        return new UserResource($user);
    }

    public function update(Request $request, User $user)
    {
        $this->ensurePiket($user);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'username' => ['required', 'string', 'max:255', 'unique:users,username,' . $user->id],
            'password' => ['nullable', 'string', 'min:4'],
        ]);

        if (! empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        $user->update($data);

        return new UserResource($user);
    }

    public function destroy(User $user)
    {
        $this->ensurePiket($user);

        $user->delete();

        return response()->json(null, 204);
    }

    /**
     * Halaman ini hanya untuk mengelola akun piket -- admin tidak boleh
     * mengedit/menghapus akun admin lain lewat endpoint ini.
     */
    private function ensurePiket(User $user): void
    {
        if ($user->role !== 'piket') {
            abort(403, 'Hanya akun piket yang bisa dikelola lewat halaman ini.');
        }
    }
}
