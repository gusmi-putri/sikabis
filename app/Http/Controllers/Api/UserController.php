<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\ActivityLog;
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
            'role' => ['required', 'in:piket,admin_pam,pimpinan'],
        ]);

        $user = User::create([
            ...$data,
            'password' => Hash::make($data['password']),
            'is_active' => true,
        ]);

        ActivityLog::record($request, 'user.create', $user->username, ['role' => $user->role]);

        return new UserResource($user);
    }

    public function toggleActive(Request $request, User $user)
    {
        $this->ensureNotAdminPam($user);

        $user->update(['is_active' => ! $user->is_active]);

        ActivityLog::record($request, 'user.toggle_active', $user->username, ['is_active' => $user->is_active]);

        return new UserResource($user);
    }

    public function update(Request $request, User $user)
    {
        // Admin PAM boleh mengedit profilnya sendiri, tapi tidak boleh
        // mengubah akun admin_pam LAIN (termasuk menaikkan role orang lain
        // jadi admin_pam lewat sini).
        if ($user->role === 'admin_pam' && $request->user()?->id !== $user->id) {
            abort(403, 'Akun Admin PAM lain tidak bisa diubah.');
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'username' => ['required', 'string', 'max:255', 'unique:users,username,' . $user->id],
            'password' => ['nullable', 'string', 'min:4'],
            'role' => ['nullable', 'in:piket,admin_pam,pimpinan'],
        ]);

        if (! empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        $user->update($data);

        // Password sengaja tidak dicatat, hanya fakta bahwa diganti.
        ActivityLog::record($request, 'user.update', $user->username, [
            'role' => $user->role,
            'password_diganti' => array_key_exists('password', $data),
        ]);

        return new UserResource($user);
    }

    public function destroy(Request $request, User $user)
    {
        $this->ensureNotAdminPam($user);

        $user->delete();

        ActivityLog::record($request, 'user.delete', $user->username, ['role' => $user->role]);

        return response()->json(null, 204);
    }

    /**
     * Admin PAM boleh mengelola akun piket dan pimpinan, tapi tidak boleh
     * menghapus atau menonaktifkan akun admin_pam lain.
     */
    private function ensureNotAdminPam(User $user): void
    {
        if ($user->role === 'admin_pam') {
            abort(403, 'Akun Admin PAM tidak bisa dihapus atau dinonaktifkan.');
        }
    }
}
