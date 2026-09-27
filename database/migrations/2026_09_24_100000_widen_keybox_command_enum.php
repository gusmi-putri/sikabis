<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Ganti enum jadi string biasa supaya menambah jenis perintah baru
     * (uji buzzer, uji pemicu kamera, reset sensor) tidak perlu migrasi
     * ALTER TABLE enum lagi setiap kali. Validasi nilai yang diterima
     * tetap dijaga ketat di DeviceStatusController::sendKeyboxCommand(),
     * bukan di level database.
     */
    public function up(): void
    {
        Schema::table('device_statuses', function (Blueprint $table) {
            $table->string('keybox_command')->default('NONE')->change();
        });
    }

    public function down(): void
    {
        Schema::table('device_statuses', function (Blueprint $table) {
            $table->enum('keybox_command', ['NONE', 'MUTE_ALARM', 'FORCE_LOCK'])->default('NONE')->change();
        });
    }
};
