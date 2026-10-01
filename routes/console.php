<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

use App\Http\Controllers\Api\KeyBoxController;
use App\Models\AccessPhoto;
use App\Models\DeviceStatus;
use App\Models\PirModeLog;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Str;

Schedule::call(function () {
    $expiredDevices = DeviceStatus::whereNotNull('auto_arm_at')
        ->where('auto_arm_at', '<=', now())
        ->get();

    foreach ($expiredDevices as $device) {
        $device->update([
            'pir_mode' => 'ON',
            'auto_arm_at' => null,
        ]);

        PirModeLog::create([
            'device_id' => $device->device_id,
            'pir_mode' => 'ON',
            'source' => 'web',
            'changed_by' => 'Sistem (Auto-Arm Timer)',
        ]);
    }
})->everyMinute();

Artisan::command('keybox:register
    {device=kotak-kunci-01 : ID Board A (sidik jari), sama dengan ID_PERANGKAT di firmware_kotak_kunci.ino}
    {camera=kotak-kunci-cam-01 : ID Board B (kamera), sama dengan ID_PERANGKAT di firmware_kamera_boardB.ino}', function (string $device, string $camera) {
    $keys = [];

    foreach ([$camera => null, $device => $camera] as $deviceId => $cameraDeviceId) {
        $status = DeviceStatus::firstOrNew(['device_id' => $deviceId]);
        $status->api_key ??= Str::random(40);
        $status->pir_mode ??= 'OFF';
        $status->camera_device_id = $cameraDeviceId;
        $status->save();

        $keys[] = [$deviceId, $status->api_key];
    }

    $this->table(['device_id / ID_PERANGKAT', 'api_key / SERVER_TOKEN'], $keys);
    $this->info('Salin api_key ke SERVER_TOKEN di firmware masing-masing board.');
})->purpose('Daftarkan pasangan board kotak kunci (sidik jari + kamera) dan tampilkan API key-nya');

Artisan::command('keybox:dedupe-photos {--dry-run : Hanya tampilkan, jangan hapus}', function () {
    $duplicates = AccessPhoto::whereNull('access_log_id')->orderBy('id')->get()
        ->filter(fn (AccessPhoto $photo) => AccessPhoto::where('id', '<', $photo->id)
            ->where('device_id', $photo->device_id)
            ->where('trigger_number', $photo->trigger_number)
            ->whereBetween('device_uptime_ms', [$photo->device_uptime_ms - KeyBoxController::PHOTO_RETRY_TOLERANCE_MS, $photo->device_uptime_ms])
            ->whereBetween('created_at', [$photo->created_at->copy()->subMinute(), $photo->created_at])
            ->exists());

    foreach ($duplicates as $photo) {
        $this->line("#{$photo->id} {$photo->device_id} pemicu #{$photo->trigger_number} ({$photo->created_at})");

        if (! $this->option('dry-run')) {
            $photo->delete();
        }
    }

    $this->info(($this->option('dry-run') ? 'Ditemukan ' : 'Dihapus ').$duplicates->count().' foto kiriman ulang.');
})->purpose('Hapus foto kotak kunci yang merupakan kiriman ulang Board B (nomor pemicu sama, beberapa detik kemudian)');
