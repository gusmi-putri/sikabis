<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('login', function (Request $request) {
            $tooMany = fn () => response()->json([
                'message' => 'Terlalu banyak percobaan login. Coba lagi dalam 1 menit.',
            ], 429);

            return [
                // Menebak password satu akun dari satu alamat.
                Limit::perMinute(5)
                    ->by(strtolower((string) $request->input('username')).'|'.$request->ip())
                    ->response($tooMany),
                // Mencoba banyak username dari satu alamat.
                Limit::perMinute(20)->by($request->ip())->response($tooMany),
            ];
        });
    }
}
