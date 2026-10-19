<?php

namespace Tests\Feature;

use App\Models\AccessLog;
use App\Models\ActivityLog;
use App\Models\DeviceStatus;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class HardeningTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $role, string $username = null): User
    {
        return User::create([
            'name' => ucfirst($role).' Uji',
            'username' => $username ?? $role.'_uji',
            'password' => Hash::make('rahasia'),
            'role' => $role,
            'is_active' => true,
        ]);
    }

    public function test_login_is_rate_limited_after_five_failed_attempts(): void
    {
        $this->makeUser('piket');

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/login', ['username' => 'piket_uji', 'password' => 'salah'])
                ->assertStatus(422);
        }

        $this->postJson('/api/login', ['username' => 'piket_uji', 'password' => 'salah'])
            ->assertStatus(429)
            ->assertJsonPath('message', 'Terlalu banyak percobaan login. Coba lagi dalam 1 menit.');
    }

    public function test_rate_limit_is_per_account_not_global(): void
    {
        $this->makeUser('piket');
        $this->makeUser('admin_pam');

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/login', ['username' => 'piket_uji', 'password' => 'salah']);
        }

        $this->postJson('/api/login', ['username' => 'admin_pam_uji', 'password' => 'rahasia'])
            ->assertOk();
    }

    public function test_sync_state_changes_when_data_changes(): void
    {
        Sanctum::actingAs($this->makeUser('piket'));

        $before = $this->getJson('/api/sync-state')->assertOk()->json('data');

        AccessLog::create([
            'result' => 'failed',
            'reason' => 'tidak_cocok',
            'device_id' => 'kotak-kunci-01',
        ]);

        $after = $this->getJson('/api/sync-state')->assertOk()->json('data');

        $this->assertNotSame($before['access_logs'], $after['access_logs']);
        $this->assertSame($before['motion_events'], $after['motion_events']);
        $this->assertNull($after['users'], 'Fingerprint akun hanya untuk Admin PAM.');
    }

    public function test_sync_state_includes_users_fingerprint_for_admin(): void
    {
        Sanctum::actingAs($this->makeUser('admin_pam'));

        $this->assertNotNull($this->getJson('/api/sync-state')->assertOk()->json('data.users'));
    }

    public function test_admin_actions_are_recorded_in_activity_log(): void
    {
        Sanctum::actingAs($this->makeUser('admin_pam'));

        $this->postJson('/api/users', [
            'name' => 'Praka Baru',
            'username' => 'praka_baru',
            'password' => 'abcd1234',
            'role' => 'piket',
        ])->assertSuccessful();

        $entry = ActivityLog::where('action', 'user.create')->first();

        $this->assertNotNull($entry);
        $this->assertSame('praka_baru', $entry->target);
        $this->assertSame('Admin_pam Uji', $entry->user_name);
        $this->assertStringNotContainsString('abcd1234', json_encode($entry->detail));

        $this->getJson('/api/activity-logs')
            ->assertOk()
            ->assertJsonPath('data.0.label', 'Membuat akun');
    }

    public function test_activity_log_is_admin_only(): void
    {
        Sanctum::actingAs($this->makeUser('piket'));
        $this->getJson('/api/activity-logs')->assertForbidden();
    }

    public function test_rotating_a_device_key_invalidates_the_old_one(): void
    {
        $device = DeviceStatus::create([
            'device_id' => 'kotak-kunci-01',
            'api_key' => 'kunci-lama-kunci-lama',
            'status' => 'offline',
            'pir_mode' => 'OFF',
        ]);

        $this->artisan('device:rotate-key', ['device' => 'kotak-kunci-01', '--yes' => true])
            ->assertExitCode(0);

        $this->assertNotSame('kunci-lama-kunci-lama', $device->fresh()->api_key);

        $this->getJson('/api/device/keybox/command?perangkat=kotak-kunci-01', [
            'Authorization' => 'Bearer kunci-lama-kunci-lama',
        ])->assertUnauthorized();
    }

    public function test_rotating_an_unknown_device_fails(): void
    {
        $this->artisan('device:rotate-key', ['device' => 'tidak-ada', '--yes' => true])
            ->assertExitCode(1);
    }

    public function test_failed_login_is_recorded_without_password(): void
    {
        $this->postJson('/api/login', ['username' => 'tidak_ada', 'password' => 'rahasia-salah'])
            ->assertStatus(422);

        $entry = ActivityLog::where('action', 'auth.login_failed')->first();

        $this->assertNotNull($entry);
        $this->assertSame('tidak_ada', $entry->target);
        $this->assertNull($entry->user_id);
        $this->assertStringNotContainsString('rahasia-salah', json_encode($entry->toArray()));
    }
}
