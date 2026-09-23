<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Kotak kunci terdiri dari dua board: pembaca sidik jari dan kamera.
     * Kolom ini menunjuk device kamera yang satu instalasi dengan
     * pembaca sidik jari, dipakai untuk memasangkan foto dengan log.
     */
    public function up(): void
    {
        Schema::table('device_statuses', function (Blueprint $table) {
            $table->string('camera_device_id')->nullable()->after('stream_url');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('device_statuses', function (Blueprint $table) {
            $table->dropColumn('camera_device_id');
        });
    }
};
