<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Antrean perintah ENROLL/DELETE hanya dipakai prototipe key box lama
     * (ESP32-KEYBOX-01). Firmware kotak kunci sekarang tidak menerima
     * perintah dari jaringan, jadi kolom dan device-nya dihapus.
     */
    public function up(): void
    {
        DB::table('device_statuses')->where('device_id', 'ESP32-KEYBOX-01')->delete();

        Schema::table('device_statuses', function (Blueprint $table) {
            $table->dropColumn(['pending_command', 'pending_target', 'pending_since']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('device_statuses', function (Blueprint $table) {
            $table->enum('pending_command', ['NONE', 'ENROLL', 'DELETE'])->default('NONE');
            $table->unsignedInteger('pending_target')->nullable();
            $table->timestamp('pending_since')->nullable();
        });
    }
};
