<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('device_statuses', function (Blueprint $table) {
            // Dilaporkan otomatis oleh firmware lewat /device/heartbeat
            // (device tahu IP LAN-nya sendiri lewat WiFi.localIP()),
            // supaya web tidak perlu diisi manual dan tetap akurat kalau
            // IP berubah karena DHCP.
            $table->string('stream_url')->nullable()->after('pir_mode');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('device_statuses', function (Blueprint $table) {
            $table->dropColumn('stream_url');
        });
    }
};
