<?php

namespace Tests\Feature;

use App\Models\AccessLog;
use App\Models\DeviceStatus;
use App\Models\Personnel;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PersonnelRegistrationTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::create([
            'name' => 'Admin Uji',
            'username' => 'admin-uji',
            'password' => 'rahasia',
            'role' => 'admin_pam',
            'is_active' => true,
        ]);
    }

    private function sendMatchLog(int $fingerprintId, int $eventNumber): void
    {
        $this->withToken('kunci-board-a')->postJson('/api/device/keybox/log', [
            'perangkat' => 'kotak-kunci-01',
            'nomor_kejadian' => $eventNumber,
            'waktu_ms' => $eventNumber * 1000,
            'hasil' => 'cocok',
            'id_sidik_jari' => $fingerprintId,
            'keyakinan' => 80,
            'gagal_beruntun' => 0,
            'alarm' => false,
        ])->assertCreated();
    }

    public function test_admin_records_personnel_with_fingerprint_id(): void
    {
        $this->actingAs($this->admin)->postJson('/api/personnel', [
            'name' => 'Praka Budi',
            'rank_nrp' => 'Praka Inf / 3120',
            'fingerprint_id' => 4,
        ])->assertCreated()
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.fingerprint_id', 4);
    }

    public function test_fingerprint_id_must_be_unique_and_within_sensor_range(): void
    {
        Personnel::create(['name' => 'Lama', 'fingerprint_id' => 4, 'status' => 'active']);

        $this->actingAs($this->admin)->postJson('/api/personnel', ['name' => 'Baru', 'fingerprint_id' => 4])
            ->assertUnprocessable()->assertJsonValidationErrors('fingerprint_id');

        $this->actingAs($this->admin)->postJson('/api/personnel', ['name' => 'Baru', 'fingerprint_id' => 128])
            ->assertUnprocessable()->assertJsonValidationErrors('fingerprint_id');
    }

    public function test_piket_cannot_record_personnel(): void
    {
        $piket = User::create([
            'name' => 'Piket', 'username' => 'piket-uji', 'password' => 'x', 'role' => 'piket', 'is_active' => true,
        ]);

        $this->actingAs($piket)->postJson('/api/personnel', ['name' => 'X', 'fingerprint_id' => 1])->assertForbidden();
    }

    public function test_deactivating_releases_the_fingerprint_id(): void
    {
        $personnel = Personnel::create(['name' => 'Mutasi', 'fingerprint_id' => 7, 'status' => 'active']);

        $this->actingAs($this->admin)->postJson("/api/personnel/{$personnel->id}/deactivate")->assertOk();

        $this->assertSame('inactive', $personnel->fresh()->status);
        $this->assertNull($personnel->fresh()->fingerprint_id);

        $this->actingAs($this->admin)->putJson("/api/personnel/{$personnel->id}", ['name' => 'Mutasi', 'fingerprint_id' => 9])
            ->assertOk()->assertJsonPath('data.status', 'active');
    }

    public function test_reused_fingerprint_id_keeps_old_logs_under_the_previous_owner(): void
    {
        DeviceStatus::create(['device_id' => 'kotak-kunci-01', 'api_key' => 'kunci-board-a', 'pir_mode' => 'OFF']);
        $first = Personnel::create(['name' => 'Pemilik Lama', 'fingerprint_id' => 3, 'status' => 'active']);

        $this->sendMatchLog(3, 1);

        $this->actingAs($this->admin)->postJson("/api/personnel/{$first->id}/deactivate");
        $this->actingAs($this->admin)->postJson('/api/personnel', ['name' => 'Pemilik Baru', 'fingerprint_id' => 3]);

        $this->sendMatchLog(3, 2);

        $this->assertSame(
            ['Pemilik Lama', 'Pemilik Baru'],
            AccessLog::with('personnel')->orderBy('id')->get()->pluck('personnel.name')->all(),
        );
    }
}
