<?php

namespace Tests\Feature;

use App\Models\DeviceStatus;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PimpinanRoleTest extends TestCase
{
    use RefreshDatabase;

    public function test_pimpinan_can_view_dashboard_data(): void
    {
        $pimpinan = User::create([
            'name' => 'Kolonel Danpus',
            'username' => 'danpus',
            'password' => Hash::make('123'),
            'role' => 'pimpinan',
            'is_active' => true,
        ]);

        DeviceStatus::create([
            'device_id' => 'GUDANG-01',
            'api_key' => 'test-api-key',
            'status' => 'online',
            'pir_mode' => 'ON',
            'flash_on' => false,
        ]);

        Sanctum::actingAs($pimpinan);

        $responseLogs = $this->getJson('/api/access-logs');
        $responseLogs->assertOk();

        $responseMotion = $this->getJson('/api/motion-events');
        $responseMotion->assertOk();

        $responseDevice = $this->getJson('/api/device-status');
        $responseDevice->assertOk();
    }

    public function test_pimpinan_is_forbidden_from_hardware_controls(): void
    {
        $pimpinan = User::create([
            'name' => 'Kolonel Danpus',
            'username' => 'danpus',
            'password' => Hash::make('123'),
            'role' => 'pimpinan',
            'is_active' => true,
        ]);

        DeviceStatus::create([
            'device_id' => 'GUDANG-01',
            'api_key' => 'test-api-key',
            'status' => 'online',
            'pir_mode' => 'ON',
            'flash_on' => false,
        ]);

        Sanctum::actingAs($pimpinan);

        $responsePir = $this->postJson('/api/device/pir-mode', ['mode' => 'OFF']);
        $responsePir->assertForbidden();

        $responseFlash = $this->postJson('/api/device/flash', ['on' => true]);
        $responseFlash->assertForbidden();

        $responseKeyboxCmd = $this->postJson('/api/keybox/command', ['command' => 'MUTE_ALARM']);
        $responseKeyboxCmd->assertForbidden();
    }

    public function test_admin_pam_can_create_pimpinan_account(): void
    {
        $admin = User::create([
            'name' => 'Letkol Admin PAM',
            'username' => 'admin_pam',
            'password' => Hash::make('123'),
            'role' => 'admin_pam',
            'is_active' => true,
        ]);

        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/users', [
            'name' => 'Kolonel Danpus',
            'username' => 'danpus',
            'password' => 'secret123',
            'role' => 'pimpinan',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('users', [
            'username' => 'danpus',
            'role' => 'pimpinan',
        ]);
    }
}
