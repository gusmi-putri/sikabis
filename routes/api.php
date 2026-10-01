<?php

use App\Http\Controllers\Api\AccessLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DeviceEventController;
use App\Http\Controllers\Api\DeviceStatusController;
use App\Http\Controllers\Api\KeyBoxController;
use App\Http\Controllers\Api\MotionEventController;
use App\Http\Controllers\Api\PersonnelController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

// ── Perangkat IoT (ESP32), autentikasi via X-Device-Key, bukan Sanctum ──
Route::middleware('device.key')->prefix('device')->group(function () {
    Route::post('/heartbeat', [DeviceEventController::class, 'heartbeat']);
    Route::get('/command', [DeviceEventController::class, 'command']);
    Route::post('/motion-event', [DeviceEventController::class, 'motionEvent']);

    // Kotak kunci dua board: Board A (sidik jari) & Board B (ESP32-CAM)
    Route::post('/keybox/log', [KeyBoxController::class, 'log']);
    Route::post('/keybox/foto', [KeyBoxController::class, 'photo']);
    Route::get('/keybox/command', [KeyBoxController::class, 'command']);
    Route::post('/keybox/enroll-status', [KeyBoxController::class, 'enrollStatus']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/access-logs', [AccessLogController::class, 'index']);
    Route::get('/access-photos/unpaired', [AccessLogController::class, 'unpairedPhotos']);
    Route::get('/motion-events', [MotionEventController::class, 'index']);
    Route::get('/personnel', [PersonnelController::class, 'index']);
    Route::get('/device-status', [DeviceStatusController::class, 'show']);
    Route::get('/keybox-status', [DeviceStatusController::class, 'keyboxStatus']);
    Route::post('/keybox/command', [DeviceStatusController::class, 'sendKeyboxCommand']);
    Route::post('/device/pir-mode', [DeviceStatusController::class, 'setPirMode']);
    Route::get('/device/pir-mode-logs', [DeviceStatusController::class, 'pirModeLogs']);
    Route::post('/device/flash', [DeviceStatusController::class, 'setFlash']);

    // Khusus Admin PAM
    Route::middleware('role:admin_pam')->group(function () {
        Route::post('/personnel', [PersonnelController::class, 'store']);
        Route::put('/personnel/{personnel}', [PersonnelController::class, 'update']);
        Route::post('/personnel/{personnel}/deactivate', [PersonnelController::class, 'deactivate']);

        Route::delete('/access-photos/unpaired', [AccessLogController::class, 'destroyUnpairedPhotos']);
        Route::delete('/access-photos/{photo}', [AccessLogController::class, 'destroyUnpairedPhoto']);

        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::put('/users/{user}', [UserController::class, 'update']);
        Route::delete('/users/{user}', [UserController::class, 'destroy']);
        Route::patch('/users/{user}/toggle-active', [UserController::class, 'toggleActive']);
    });
});
