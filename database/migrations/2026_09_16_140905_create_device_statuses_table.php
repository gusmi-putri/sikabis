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
        Schema::create('device_statuses', function (Blueprint $table) {
            $table->string('device_id')->primary();
            $table->enum('status', ['online', 'offline'])->default('offline');
            $table->enum('pir_mode', ['ARMED', 'ACTIVITY'])->default('ARMED');
            $table->timestamp('last_seen')->nullable();
            $table->enum('pending_command', ['NONE', 'ENROLL', 'DELETE'])->default('NONE');
            $table->unsignedInteger('pending_target')->nullable();
            $table->timestamp('pending_since')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('device_statuses');
    }
};
