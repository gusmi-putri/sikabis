<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // MODIFY COLUMN hanya ada di MySQL. Database lain (SQLite untuk tes)
        // cukup mengganti tipe kolom lewat Schema lalu memetakan nilainya.
        if (DB::getDriverName() !== 'mysql') {
            foreach (['device_statuses', 'motion_events', 'pir_mode_logs'] as $table) {
                Schema::table($table, function (Blueprint $blueprint) use ($table) {
                    $column = $blueprint->string('pir_mode', 20);
                    if ($table === 'device_statuses') {
                        $column->default('OFF');
                    }
                    $column->change();
                });
                DB::table($table)->where('pir_mode', 'ARMED')->update(['pir_mode' => 'ON']);
                DB::table($table)->where('pir_mode', 'ACTIVITY')->update(['pir_mode' => 'OFF']);
            }

            return;
        }

        // device_statuses
        DB::statement("ALTER TABLE device_statuses MODIFY COLUMN pir_mode VARCHAR(20) DEFAULT 'OFF'");
        DB::table('device_statuses')->where('pir_mode', 'ARMED')->update(['pir_mode' => 'ON']);
        DB::table('device_statuses')->where('pir_mode', 'ACTIVITY')->update(['pir_mode' => 'OFF']);
        DB::statement("ALTER TABLE device_statuses MODIFY COLUMN pir_mode ENUM('ON', 'OFF') DEFAULT 'OFF'");

        // motion_events
        DB::statement("ALTER TABLE motion_events MODIFY COLUMN pir_mode VARCHAR(20)");
        DB::table('motion_events')->where('pir_mode', 'ARMED')->update(['pir_mode' => 'ON']);
        DB::table('motion_events')->where('pir_mode', 'ACTIVITY')->update(['pir_mode' => 'OFF']);
        DB::statement("ALTER TABLE motion_events MODIFY COLUMN pir_mode ENUM('ON', 'OFF')");

        // pir_mode_logs
        DB::statement("ALTER TABLE pir_mode_logs MODIFY COLUMN pir_mode VARCHAR(20)");
        DB::table('pir_mode_logs')->where('pir_mode', 'ARMED')->update(['pir_mode' => 'ON']);
        DB::table('pir_mode_logs')->where('pir_mode', 'ACTIVITY')->update(['pir_mode' => 'OFF']);
        DB::statement("ALTER TABLE pir_mode_logs MODIFY COLUMN pir_mode ENUM('ON', 'OFF')");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("ALTER TABLE device_statuses MODIFY COLUMN pir_mode VARCHAR(20) DEFAULT 'ACTIVITY'");
        DB::table('device_statuses')->where('pir_mode', 'ON')->update(['pir_mode' => 'ARMED']);
        DB::table('device_statuses')->where('pir_mode', 'OFF')->update(['pir_mode' => 'ACTIVITY']);
        DB::statement("ALTER TABLE device_statuses MODIFY COLUMN pir_mode ENUM('ARMED', 'ACTIVITY') DEFAULT 'ARMED'");

        DB::statement("ALTER TABLE motion_events MODIFY COLUMN pir_mode VARCHAR(20)");
        DB::table('motion_events')->where('pir_mode', 'ON')->update(['pir_mode' => 'ARMED']);
        DB::table('motion_events')->where('pir_mode', 'OFF')->update(['pir_mode' => 'ACTIVITY']);
        DB::statement("ALTER TABLE motion_events MODIFY COLUMN pir_mode ENUM('ARMED', 'ACTIVITY')");

        DB::statement("ALTER TABLE pir_mode_logs MODIFY COLUMN pir_mode VARCHAR(20)");
        DB::table('pir_mode_logs')->where('pir_mode', 'ON')->update(['pir_mode' => 'ARMED']);
        DB::table('pir_mode_logs')->where('pir_mode', 'OFF')->update(['pir_mode' => 'ACTIVITY']);
        DB::statement("ALTER TABLE pir_mode_logs MODIFY COLUMN pir_mode ENUM('ARMED', 'ACTIVITY')");
    }
};
