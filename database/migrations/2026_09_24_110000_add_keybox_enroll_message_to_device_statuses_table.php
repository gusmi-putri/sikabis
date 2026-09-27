<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Pesan panduan langkah-demi-langkah proses enroll ("Tempelkan jari
     * untuk ID 6", "Angkat jari...", dst), dilaporkan Board A ke sini di
     * tiap tahap supaya operator bisa mengikuti prosesnya dari dashboard
     * web -- tidak perlu buka Serial Monitor untuk tahu kapan harus
     * menyentuh sensor.
     */
    public function up(): void
    {
        Schema::table('device_statuses', function (Blueprint $table) {
            $table->string('keybox_enroll_message')->nullable()->after('keybox_command_target');
            $table->timestamp('keybox_enroll_message_at')->nullable()->after('keybox_enroll_message');
        });
    }

    public function down(): void
    {
        Schema::table('device_statuses', function (Blueprint $table) {
            $table->dropColumn(['keybox_enroll_message', 'keybox_enroll_message_at']);
        });
    }
};
