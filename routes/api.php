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
    Route::post('/ack-command', [DeviceEventController::class, 'ackCommand']);
    Route::post('/access-log', [DeviceEventController::class, 'accessLog']);

    // Kotak kunci dua board: Board A (sidik jari) & Board B (ESP32-CAM)
    Route::post('/keybox/log', [KeyBoxController::class, 'log']);
    Route::post('/keybox/foto', [KeyBoxController::class, 'photo']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/access-logs', [AccessLogController::class, 'index']);
    Route::get('/access-photos/unpaired', [AccessLogController::class, 'unpairedPhotos']);
    Route::get('/motion-events', [MotionEventController::class, 'index']);
    Route::get('/personnel', [PersonnelController::class, 'index']);
    Route::get('/device-status', [DeviceStatusController::class, 'show']);
    Route::post('/device/pir-mode', [DeviceStatusController::class, 'setPirMode']);
    Route::get('/device/pir-mode-logs', [DeviceStatusController::class, 'pirModeLogs']);
    Route::post('/device/flash', [DeviceStatusController::class, 'setFlash']);

    // Khusus Admin PAM
    Route::middleware('role:admin_pam')->group(function () {
        Route::post('/personnel/enroll', [PersonnelController::class, 'enroll']);
        Route::post('/personnel/revoke', [PersonnelController::class, 'revoke']);
        Route::put('/personnel/{personnel}', [PersonnelController::class, 'update']);
        Route::post('/device/cancel-pending', [DeviceStatusController::class, 'cancelPending']);

        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::put('/users/{user}', [UserController::class, 'update']);
        Route::delete('/users/{user}', [UserController::class, 'destroy']);
        Route::patch('/users/{user}/toggle-active', [UserController::class, 'toggleActive']);
    });
});
