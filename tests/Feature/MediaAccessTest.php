<?php

namespace Tests\Feature;

use App\Models\AccessLog;
use App\Models\User;
use App\Support\MediaUrl;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MediaAccessTest extends TestCase
{
    use RefreshDatabase;

    private function storedPhoto(): string
    {
        Storage::fake('public');
        $path = UploadedFile::fake()->image('x.jpg')->store('access-photos', 'public');

        return 'http://sikabis.test/storage/'.$path;
    }

    public function test_signed_url_serves_the_photo(): void
    {
        $url = MediaUrl::signed($this->storedPhoto());

        $this->assertStringStartsWith('/api/media/access-photos/', $url);
        $this->get($url)->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');
    }

    public function test_retry_parameter_does_not_break_the_signature(): void
    {
        $url = MediaUrl::signed($this->storedPhoto());

        $this->get($url.'&r=2')->assertOk();
    }

    public function test_unsigned_or_tampered_url_is_rejected(): void
    {
        $stored = $this->storedPhoto();
        $url = MediaUrl::signed($stored);
        $name = basename($stored);

        $this->get('/api/media/access-photos/'.$name)->assertForbidden();
        $this->get(str_replace('signature=', 'signature=x', $url))->assertForbidden();
    }

    public function test_folder_outside_whitelist_is_not_served(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('rahasia/data.txt', 'isi');

        $this->assertNull(MediaUrl::signed('http://sikabis.test/storage/rahasia/data.txt'));
    }

    public function test_external_urls_and_null_pass_through(): void
    {
        $this->assertNull(MediaUrl::signed(null));
        $this->assertSame('https://images.example/a.jpg', MediaUrl::signed('https://images.example/a.jpg'));
    }

    public function test_api_returns_signed_url_instead_of_public_storage_url(): void
    {
        Sanctum::actingAs(User::create([
            'name' => 'Piket', 'username' => 'piket_foto', 'password' => Hash::make('x'),
            'role' => 'piket', 'is_active' => true,
        ]));
        $stored = $this->storedPhoto();
        $log = new AccessLog([
            'result' => 'failed', 'reason' => 'tidak_cocok', 'confidence' => 0,
            'failed_streak' => 1, 'alarm' => false, 'image_path' => $stored,
            'device_id' => 'kotak-kunci-01', 'event_number' => 1, 'device_uptime_ms' => 1,
        ]);
        $log->save();

        $path = $this->getJson('/api/access-logs')->assertOk()->json('data.0.image_path');

        $this->assertStringContainsString('/api/media/', $path);
        $this->assertStringNotContainsString('/storage/', $path);
    }
}
