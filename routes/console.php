<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

use Illuminate\Support\Facades\Schedule;
use App\Models\DeviceStatus;
use App\Models\PirModeLog;

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
