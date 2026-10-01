<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Foto dan log kotak kunci dipasangkan berdasarkan waktu kejadian.
 * Percobaan beruntun hanya berjarak sekitar 1,5 detik, jadi presisi
 * detik bisa membuat dua kandidat tampak sama dekat.
 */
return new class extends Migration
{
    public function up(): void
    {
        foreach (['access_logs', 'access_photos'] as $table) {
            Schema::table($table, function (Blueprint $table) {
                $table->timestamp('created_at', 3)->nullable()->change();
                $table->timestamp('updated_at', 3)->nullable()->change();
            });
        }
    }

    public function down(): void
    {
        foreach (['access_logs', 'access_photos'] as $table) {
            Schema::table($table, function (Blueprint $table) {
                $table->timestamp('created_at')->nullable()->change();
                $table->timestamp('updated_at')->nullable()->change();
            });
        }
    }
};
