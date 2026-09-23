<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Sidik jari kini didaftarkan langsung di Board A (perintah Serial `D`),
     * lalu admin mencatat nama/NRP dan ID sidik jarinya di web. Status
     * antrean enroll/revoke tidak dipakai lagi, tinggal aktif atau tidak.
     *
     * access_logs.personnel_id menyimpan siapa pemilik ID saat kejadian,
     * supaya log lama tidak berpindah nama ketika ID sensor dipakai ulang.
     */
    public function up(): void
    {
        DB::table('personnel')->where('status', 'pending_revoke')->update(['status' => 'active']);
        DB::table('personnel')->whereIn('status', ['pending_enroll', 'failed'])
            ->update(['status' => 'inactive', 'fingerprint_id' => null]);
        DB::table('personnel')->where('status', 'inactive')->update(['fingerprint_id' => null]);

        Schema::table('personnel', function (Blueprint $table) {
            $table->enum('status', ['active', 'inactive'])->default('active')->change();
        });

        Schema::table('access_logs', function (Blueprint $table) {
            $table->foreignId('personnel_id')->nullable()->after('fingerprint_id')->constrained('personnel')->nullOnDelete();
        });

        DB::table('personnel')->whereNotNull('fingerprint_id')->get(['id', 'fingerprint_id'])
            ->each(fn ($personnel) => DB::table('access_logs')
                ->where('fingerprint_id', $personnel->fingerprint_id)
                ->update(['personnel_id' => $personnel->id]));
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('access_logs', function (Blueprint $table) {
            $table->dropConstrainedForeignId('personnel_id');
        });

        Schema::table('personnel', function (Blueprint $table) {
            $table->enum('status', ['pending_enroll', 'active', 'pending_revoke', 'inactive', 'failed'])
                ->default('pending_enroll')->change();
        });
    }
};
