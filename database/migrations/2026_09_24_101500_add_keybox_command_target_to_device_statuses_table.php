<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Nomor ID sidik jari target untuk perintah ENROLL, dikirim dari
     * dashboard bersamaan dengan command-nya lewat POST /api/keybox/command.
     */
    public function up(): void
    {
        Schema::table('device_statuses', function (Blueprint $table) {
            $table->unsignedTinyInteger('keybox_command_target')->nullable()->after('keybox_command');
        });
    }

    public function down(): void
    {
        Schema::table('device_statuses', function (Blueprint $table) {
            $table->dropColumn('keybox_command_target');
        });
    }
};
