<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Kolom tambahan untuk log dari firmware kotak kunci (Board A).
     * Semua nullable supaya log lama dan endpoint /device/access-log
     * tetap jalan tanpa perubahan.
     */
    public function up(): void
    {
        Schema::table('access_logs', function (Blueprint $table) {
            // Percobaan gagal tidak punya ID sidik jari (firmware kirim -1).
            $table->unsignedInteger('fingerprint_id')->nullable()->change();

            $table->string('reason', 32)->nullable()->after('result');
            $table->unsignedSmallInteger('confidence')->nullable()->after('reason');
            $table->unsignedSmallInteger('failed_streak')->nullable()->after('confidence');
            $table->boolean('alarm')->default(false)->after('failed_streak');
            $table->unsignedInteger('event_number')->nullable()->after('device_id');
            $table->unsignedBigInteger('device_uptime_ms')->nullable()->after('event_number');
            $table->unsignedInteger('missing_before')->default(0)->after('device_uptime_ms');
            $table->boolean('device_restarted')->default(false)->after('missing_before');

            $table->index(['device_id', 'event_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('access_logs', function (Blueprint $table) {
            $table->dropIndex(['device_id', 'event_number']);
            $table->dropColumn([
                'reason', 'confidence', 'failed_streak', 'alarm',
                'event_number', 'device_uptime_ms', 'missing_before', 'device_restarted',
            ]);
        });
    }
};
