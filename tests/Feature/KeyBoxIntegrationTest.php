<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\KeyBoxController;
use App\Models\AccessLog;
use App\Models\AccessPhoto;
use App\Models\DeviceStatus;
use App\Models\Personnel;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class KeyBoxIntegrationTest extends TestCase
{
    use RefreshDatabase;

    private const BOARD_A_KEY = 'kunci-board-a';

    private const BOARD_B_KEY = 'kunci-board-b';

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');

        DeviceStatus::create([
            'device_id' => 'kotak-kunci-cam-01',
            'api_key' => self::BOARD_B_KEY,
            'pir_mode' => 'OFF',
        ]);

        DeviceStatus::create([
            'device_id' => 'kotak-kunci-01',
            'api_key' => self::BOARD_A_KEY,
            'pir_mode' => 'OFF',
            'camera_device_id' => 'kotak-kunci-cam-01',
        ]);
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function sendLog(array $overrides = [], string $key = self::BOARD_A_KEY): TestResponse
    {
        return $this->withToken($key)->postJson('/api/device/keybox/log', [
            'perangkat' => 'kotak-kunci-01',
            'nomor_kejadian' => 1,
            'waktu_ms' => 123456,
            'hasil' => 'cocok',
            'id_sidik_jari' => 1,
            'keyakinan' => 76,
            'gagal_beruntun' => 0,
            'alarm' => false,
            ...$overrides,
        ]);
    }

    private function sendPhoto(int $triggerNumber = 1, string $key = self::BOARD_B_KEY): TestResponse
    {
        return $this->withToken($key)->post('/api/device/keybox/foto', [
            'perangkat' => 'kotak-kunci-cam-01',
            'nomor_pemicu' => $triggerNumber,
            'waktu_ms' => 98765,
            'foto' => UploadedFile::fake()->image("tap_{$triggerNumber}.jpg", 800, 600),
        ]);
    }

    public function test_board_a_log_is_stored_with_bearer_token(): void
    {
        Personnel::create(['name' => 'Kapten Uji', 'fingerprint_id' => 1, 'status' => 'active']);

        $this->sendLog()->assertCreated()->assertJson(['ok' => true]);

        $log = AccessLog::sole();
        $this->assertSame('success', $log->result);
        $this->assertSame('cocok', $log->reason);
        $this->assertSame(1, $log->fingerprint_id);
        $this->assertSame(76, $log->confidence);
        $this->assertSame('Kapten Uji', $log->personnel->name);
        $this->assertSame('online', DeviceStatus::find('kotak-kunci-01')->status);
    }

    public function test_failed_attempt_is_stored_without_fingerprint_id(): void
    {
        $this->sendLog([
            'hasil' => 'tidak_cocok',
            'id_sidik_jari' => -1,
            'keyakinan' => 0,
            'gagal_beruntun' => 3,
            'alarm' => true,
        ])->assertCreated();

        $log = AccessLog::sole();
        $this->assertSame('failed', $log->result);
        $this->assertSame('tidak_cocok', $log->reason);
        $this->assertNull($log->fingerprint_id);
        $this->assertSame(3, $log->failed_streak);
        $this->assertTrue($log->alarm);
    }

    public function test_wrong_token_is_rejected(): void
    {
        $this->sendLog([], 'salah')->assertUnauthorized();
        $this->sendLog([], self::BOARD_B_KEY)->assertUnauthorized();

        $this->assertSame(0, AccessLog::count());
    }

    public function test_retried_log_is_not_stored_twice(): void
    {
        $this->sendLog()->assertCreated();
        $this->sendLog()->assertOk();

        $this->assertSame(1, AccessLog::count());
    }

    public function test_missing_event_numbers_are_recorded_as_a_gap(): void
    {
        $this->sendLog(['nomor_kejadian' => 7, 'waktu_ms' => 1000]);
        $this->sendLog(['nomor_kejadian' => 8, 'waktu_ms' => 2000]);
        $this->sendLog(['nomor_kejadian' => 11, 'waktu_ms' => 3000]);

        $this->assertSame([0, 0, 2], AccessLog::orderBy('id')->pluck('missing_before')->all());
    }

    public function test_device_restart_is_detected(): void
    {
        $this->sendLog(['nomor_kejadian' => 9, 'waktu_ms' => 500000]);
        $this->sendLog(['nomor_kejadian' => 1, 'waktu_ms' => 4000]);

        $log = AccessLog::latest('id')->first();
        $this->assertTrue($log->device_restarted);
        $this->assertSame(0, $log->missing_before);
    }

    public function test_board_b_photo_is_stored(): void
    {
        $this->sendPhoto(3)->assertCreated()->assertJson(['ok' => true]);

        $photo = AccessPhoto::sole();
        $this->assertSame('kotak-kunci-cam-01', $photo->device_id);
        $this->assertSame(3, $photo->trigger_number);
        $this->assertNull($photo->access_log_id);
        Storage::disk('public')->assertExists(str_replace('/storage/', '', $photo->image_path));
    }

    public function test_photo_is_paired_with_the_log_that_arrives_after_it(): void
    {
        $this->sendPhoto(1);
        $this->travel(500)->milliseconds();
        $this->sendLog(['hasil' => 'tidak_terbaca', 'id_sidik_jari' => -1, 'keyakinan' => 0]);

        $photo = AccessPhoto::sole();
        $log = AccessLog::sole();
        $this->assertSame($log->id, $photo->access_log_id);
        $this->assertSame($photo->image_path, $log->image_path);
    }

    public function test_successful_attempt_is_paired_despite_the_solenoid_delay(): void
    {
        // Board A menahan log "cocok" sampai solenoid terkunci lagi (5 detik).
        $this->sendPhoto(1);
        $this->travel(6)->seconds();
        $this->sendLog();

        $this->assertSame(AccessLog::sole()->id, AccessPhoto::sole()->access_log_id);
    }

    public function test_photo_outside_the_window_stays_unpaired(): void
    {
        $this->sendPhoto(1);
        $this->travel(KeyBoxController::PAIRING_WINDOW_SECONDS + 1)->seconds();
        $this->sendLog();

        $this->assertNull(AccessPhoto::sole()->access_log_id);
        $this->assertNull(AccessLog::sole()->image_path);
    }

    public function test_consecutive_attempts_each_get_their_own_photo(): void
    {
        foreach ([1, 2, 3] as $number) {
            $this->sendPhoto($number);
            $this->travel(400)->milliseconds();
            $this->sendLog([
                'nomor_kejadian' => $number,
                'waktu_ms' => $number * 1500,
                'hasil' => 'tidak_cocok',
                'id_sidik_jari' => -1,
                'gagal_beruntun' => $number,
            ]);
            $this->travel(1)->seconds();
        }

        $pairs = AccessPhoto::orderBy('id')->get()
            ->map(fn (AccessPhoto $photo) => [$photo->trigger_number, $photo->accessLog->event_number])
            ->all();

        $this->assertSame([[1, 1], [2, 2], [3, 3]], $pairs);
    }

    public function test_dashboard_lists_logs_and_unpaired_photos(): void
    {
        $this->sendPhoto(1);
        $this->travel(KeyBoxController::PAIRING_WINDOW_SECONDS + 1)->seconds();
        $this->sendLog(['nomor_kejadian' => 4]);

        $user = User::create([
            'name' => 'Piket Uji',
            'username' => 'piket-uji',
            'password' => 'rahasia',
            'role' => 'piket',
            'is_active' => true,
        ]);

        $this->actingAs($user)->getJson('/api/access-logs')
            ->assertOk()
            ->assertJsonPath('data.0.reason', 'cocok')
            ->assertJsonPath('data.0.event_number', 4);

        $this->actingAs($user)->getJson('/api/access-photos/unpaired')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.trigger_number', 1);
    }
}
