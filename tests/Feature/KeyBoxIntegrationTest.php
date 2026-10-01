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

    private function sendPhoto(int $triggerNumber = 1, string $key = self::BOARD_B_KEY, int $uptimeMs = 98765, ?int $ageMs = null): TestResponse
    {
        return $this->withToken($key)->post('/api/device/keybox/foto', array_filter([
            'perangkat' => 'kotak-kunci-cam-01',
            'nomor_pemicu' => $triggerNumber,
            'waktu_ms' => $uptimeMs,
            'umur_ms' => $ageMs,
            'foto' => UploadedFile::fake()->image("tap_{$triggerNumber}.jpg", 800, 600),
        ], fn ($value) => $value !== null));
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

    public function test_board_b_retry_of_the_same_photo_is_not_stored_twice(): void
    {
        $this->sendPhoto(7)->assertCreated();
        $first = AccessPhoto::sole();

        // Firmware lama: waktu_ms dihitung ulang setelah timeout 5 detik.
        $this->travel(5)->seconds();
        $this->sendPhoto(7, uptimeMs: 98765 + 5400)->assertOk()->assertJson(['id' => $first->id]);

        // Firmware baru: waktu_ms sama persis.
        $this->sendPhoto(7)->assertOk()->assertJson(['id' => $first->id]);

        $this->assertSame(1, AccessPhoto::count());
        $this->assertCount(1, Storage::disk('public')->allFiles('access-photos'));
    }

    public function test_burst_attempts_pair_by_event_time_even_when_uploads_arrive_late(): void
    {
        $start = now()->startOfSecond();

        // Tiga percobaan gagal beruntun: foto diambil saat jari menempel,
        // log dicatat 0,8 detik kemudian, percobaan berikutnya 1,5 detik
        // sesudahnya. Foto baru terkirim 6 detik kemudian (antrean Board B)
        // dan log menyusul setelah 20 detik (antrean Board A), terbalik urutannya.
        $capturedAt = fn (int $i) => $start->copy()->addMilliseconds($i * 1500);
        $loggedAt = fn (int $i) => $capturedAt($i)->addMilliseconds(800);

        foreach ([0, 1, 2] as $i) {
            $this->travelTo($start->copy()->addSeconds(6)->addMilliseconds($i * 300));
            $this->sendPhoto($i + 1, uptimeMs: 1000 + $i * 1500, ageMs: (int) $capturedAt($i)->diffInMilliseconds(now()))
                ->assertCreated();
        }

        foreach ([2, 1, 0] as $i) {
            $this->travelTo($start->copy()->addSeconds(20)->addMilliseconds((2 - $i) * 300));
            $this->sendLog([
                'nomor_kejadian' => $i + 1,
                'waktu_ms' => 5000 + $i * 1500,
                'hasil' => 'tidak_cocok',
                'id_sidik_jari' => -1,
                'umur_ms' => (int) $loggedAt($i)->diffInMilliseconds(now()),
            ])->assertCreated();
        }

        $pairs = AccessPhoto::orderBy('id')->get()
            ->map(fn (AccessPhoto $photo) => [$photo->trigger_number, $photo->accessLog?->event_number])
            ->all();

        $this->assertSame([[1, 1], [2, 2], [3, 3]], $pairs);
        $this->assertSame(
            $loggedAt(0)->format('Y-m-d H:i:s.v'),
            AccessLog::where('event_number', 1)->sole()->created_at->format('Y-m-d H:i:s.v'),
        );
    }

    public function test_log_held_in_the_queue_for_minutes_still_finds_its_photo(): void
    {
        $this->sendPhoto(1, ageMs: 300);

        $this->travel(3)->minutes();
        $this->sendLog(['umur_ms' => 3 * 60 * 1000])->assertCreated();

        $this->assertSame(AccessLog::sole()->id, AccessPhoto::sole()->access_log_id);
    }

    public function test_same_trigger_number_after_a_restart_is_a_new_photo(): void
    {
        $this->sendPhoto(1, uptimeMs: 20000);
        $this->travel(10)->minutes();
        $this->sendPhoto(1, uptimeMs: 25000)->assertCreated();

        $this->assertSame(2, AccessPhoto::count());
    }

    public function test_admin_can_delete_unpaired_photos_but_not_paired_ones(): void
    {
        $this->sendPhoto(1);
        $this->sendLog();
        $paired = AccessPhoto::sole();

        $this->travel(1)->minutes();
        $this->sendPhoto(2, uptimeMs: 200000);
        $this->sendPhoto(3, uptimeMs: 300000);
        $this->travel(KeyBoxController::PAIRING_WINDOW_SECONDS + 1)->seconds();
        [$single, $other] = AccessPhoto::whereNull('access_log_id')->orderBy('id')->get();

        $admin = User::create([
            'name' => 'Admin Uji',
            'username' => 'admin-uji',
            'password' => 'rahasia',
            'role' => 'admin_pam',
            'is_active' => true,
        ]);
        $piket = User::create([
            'name' => 'Piket Uji',
            'username' => 'piket-uji',
            'password' => 'rahasia',
            'role' => 'piket',
            'is_active' => true,
        ]);

        $this->actingAs($piket)->deleteJson("/api/access-photos/{$single->id}")->assertForbidden();
        $this->actingAs($admin)->deleteJson("/api/access-photos/{$paired->id}")->assertUnprocessable();

        $this->actingAs($admin)->deleteJson("/api/access-photos/{$single->id}")->assertNoContent();
        Storage::disk('public')->assertMissing(str_replace('/storage/', '', $single->image_path));

        $this->actingAs($admin)->deleteJson('/api/access-photos/unpaired')->assertOk()->assertJson(['deleted' => 1]);
        Storage::disk('public')->assertMissing(str_replace('/storage/', '', $other->image_path));

        $this->assertSame([$paired->id], AccessPhoto::pluck('id')->all());
        Storage::disk('public')->assertExists(str_replace('/storage/', '', $paired->image_path));
    }
}
