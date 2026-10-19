<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * Tes memakai RefreshDatabase (migrate:fresh). Kalau konfigurasi yang
     * terbaca ternyata bukan SQLite memori, hentikan SEBELUM menyentuh
     * database apa pun, supaya log asli tidak pernah terhapus.
     */
    protected function refreshApplication()
    {
        parent::refreshApplication();

        $default = config('database.default');

        if ($default !== 'sqlite' || config("database.connections.{$default}.database") !== ':memory:') {
            throw new \RuntimeException(
                "Tes dihentikan: koneksi database aktif '{$default}' bukan SQLite memori. ".
                'Jalankan `php artisan config:clear`, periksa phpunit.xml, lalu ulangi.'
            );
        }
    }
}
