<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Foto dari kamera kotak kunci (Board B). Disimpan terpisah dari
     * access_logs karena foto tiba lebih dulu dan dikirim perangkat lain;
     * foto yang tidak pernah mendapat pasangan log tetap tersimpan
     * sebagai bukti.
     */
    public function up(): void
    {
        Schema::create('access_photos', function (Blueprint $table) {
            $table->id();
            $table->string('device_id');
            $table->unsignedInteger('trigger_number');
            $table->unsignedBigInteger('device_uptime_ms');
            $table->string('image_path');
            $table->foreignId('access_log_id')->nullable()->unique()->constrained()->nullOnDelete();
            $table->timestamps();

            $table->index(['device_id', 'access_log_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('access_photos');
    }
};
