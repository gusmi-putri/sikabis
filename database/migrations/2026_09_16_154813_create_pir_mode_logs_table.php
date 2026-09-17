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
        Schema::create('pir_mode_logs', function (Blueprint $table) {
            $table->id();
            $table->string('device_id');
            $table->enum('pir_mode', ['ARMED', 'ACTIVITY']); // ARMED = nyala, ACTIVITY = mati
            $table->enum('source', ['web', 'telegram']);
            $table->string('changed_by')->nullable(); // nama user (web) atau null (telegram)
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pir_mode_logs');
    }
};
