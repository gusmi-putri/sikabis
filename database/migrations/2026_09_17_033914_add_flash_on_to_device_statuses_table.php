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
            // Diselaraskan dua arah lewat mekanisme yang sama seperti
            // pir_mode: web set -> /device/command dipoll firmware, dan
            // Telegram /flash -> dikirim balik lewat /device/heartbeat.
            $table->boolean('flash_on')->default(false)->after('pir_mode');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('device_statuses', function (Blueprint $table) {
            $table->dropColumn('flash_on');
        });
    }
};
