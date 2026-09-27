<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Kolom perintah khusus kotak kunci (Board A), terpisah dari
     * pending_command/pending_target lama (dihapus di migrasi
     * 2026_09_23_073038, yang khusus ENROLL/DELETE sidik jari).
     *
     * Cakupan sengaja dibatasi ke dua aksi paling aman untuk dikirim
     * lewat jaringan: mematikan alarm dan memaksa kunci. Keduanya
     * tidak pernah MEMBUKA solenoid dari jarak jauh -- itu tetap
     * hanya bisa dipicu fisik oleh sidik jari yang cocok di Board A.
     */
    public function up(): void
    {
        Schema::table('device_statuses', function (Blueprint $table) {
            $table->enum('keybox_command', ['NONE', 'MUTE_ALARM', 'FORCE_LOCK'])->default('NONE')->after('status');
            $table->timestamp('keybox_command_at')->nullable()->after('keybox_command');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('device_statuses', function (Blueprint $table) {
            $table->dropColumn(['keybox_command', 'keybox_command_at']);
        });
    }
};
