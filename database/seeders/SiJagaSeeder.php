<?php

namespace Database\Seeders;

use App\Models\AccessLog;
use App\Models\DeviceStatus;
use App\Models\MotionEvent;
use App\Models\Personnel;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class SiJagaSeeder extends Seeder
{
    /**
     * Seed data awal SI-JAGA, setara dengan src/data/mockData.ts di frontend.
     */
    public function run(): void
    {
        $ago = fn (int $minutes) => now()->subMinutes($minutes);

        // ---- Users ----
        User::create([
            'name' => 'Letkol Admin PAM',
            'username' => 'admin',
            'password' => Hash::make('123'),
            'role' => 'admin_pam',
            'is_active' => true,
        ]);

        User::create([
            'name' => 'Kopda Piket Jaga 1',
            'username' => 'piket',
            'password' => Hash::make('123'),
            'role' => 'piket',
            'is_active' => true,
        ]);

        User::create([
            'name' => 'Praka Piket Jaga 2',
            'username' => 'piket2',
            'password' => Hash::make('123'),
            'role' => 'piket',
            'is_active' => false,
        ]);

        // ---- Personnel ----
        $personnel = [
            ['name' => 'Letkol Inf Hendra Gunawan', 'rank_nrp' => 'Letkol Inf / 11020011220675', 'fingerprint_id' => 1, 'status' => 'active', 'notes' => null, 'minutes' => 14400],
            ['name' => 'Kapten Chb Bambang Suryanto', 'rank_nrp' => 'Kapten Chb / 11090023410788', 'fingerprint_id' => 2, 'status' => 'active', 'notes' => null, 'minutes' => 10000],
            ['name' => 'Serma Cpl Dedi Prasetyo', 'rank_nrp' => 'Serma Cpl / 21120045610892', 'fingerprint_id' => 3, 'status' => 'active', 'notes' => 'Teknisi gudang shift malam', 'minutes' => 7200],
            ['name' => 'Sertu Inf Agus Wijayanto', 'rank_nrp' => 'Sertu Inf / 31140089210995', 'fingerprint_id' => 4, 'status' => 'active', 'notes' => null, 'minutes' => 5000],
            ['name' => 'Kopda Chb Rian Saputra', 'rank_nrp' => 'Kopda Chb / 31180091221001', 'fingerprint_id' => 5, 'status' => 'active', 'notes' => 'Operator jaga pos 1', 'minutes' => 2000],
            ['name' => 'Serda Chb Wahyu Nugroho', 'rank_nrp' => 'Serda Chb / 31190094221008', 'fingerprint_id' => null, 'status' => 'inactive', 'notes' => 'Mutasi ke satuan lain', 'minutes' => 20000],
        ];

        foreach ($personnel as $p) {
            Personnel::create([
                'name' => $p['name'],
                'rank_nrp' => $p['rank_nrp'],
                'fingerprint_id' => $p['fingerprint_id'],
                'status' => $p['status'],
                'notes' => $p['notes'],
                'created_at' => $ago($p['minutes']),
                'updated_at' => $ago($p['minutes']),
            ]);
        }

        // ---- Access Logs ----
        $accessLogs = [
            ['fingerprint_id' => 2, 'result' => 'success', 'image_path' => 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80', 'minutes' => 5],
            ['fingerprint_id' => 3, 'result' => 'success', 'image_path' => 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80', 'minutes' => 18],
            ['fingerprint_id' => null, 'result' => 'failed', 'image_path' => 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80', 'minutes' => 42],
            ['fingerprint_id' => 5, 'result' => 'success', 'image_path' => 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80', 'minutes' => 65],
            ['fingerprint_id' => 1, 'result' => 'success', 'image_path' => 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&auto=format&fit=crop&q=80', 'minutes' => 130],
        ];

        foreach ($accessLogs as $log) {
            AccessLog::create([
                'fingerprint_id' => $log['fingerprint_id'],
                'personnel_id' => $log['fingerprint_id']
                    ? Personnel::where('fingerprint_id', $log['fingerprint_id'])->value('id')
                    : null,
                'result' => $log['result'],
                'reason' => $log['result'] === 'success' ? 'cocok' : 'tidak_cocok',
                'image_path' => $log['image_path'],
                'device_id' => 'kotak-kunci-01',
                'created_at' => $ago($log['minutes']),
                'updated_at' => $ago($log['minutes']),
            ]);
        }

        // ---- Motion Events ----
        $motionEvents = [
            ['image_path' => 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&auto=format&fit=crop&q=80', 'pir_mode' => 'ON', 'minutes' => 8],
            ['image_path' => 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=400&auto=format&fit=crop&q=80', 'pir_mode' => 'OFF', 'minutes' => 55],
            ['image_path' => null, 'pir_mode' => 'ON', 'minutes' => 180],
        ];

        foreach ($motionEvents as $event) {
            MotionEvent::create([
                'image_path' => $event['image_path'],
                'pir_mode' => $event['pir_mode'],
                'device_id' => 'GUDANG-01',
                'created_at' => $ago($event['minutes']),
                'updated_at' => $ago($event['minutes']),
            ]);
        }

        // ---- Device Status ----
        // api_key dipakai ESP32-CAM untuk autentikasi ke endpoint /api/device/*
        // (lihat EnsureValidDeviceKey). Cetak sekali di sini, salin ke firmware.
        DeviceStatus::create([
            'device_id' => 'GUDANG-01',
            'api_key' => Str::random(40),
            'status' => 'online',
            'pir_mode' => 'ON',
            'last_seen' => now()->subSeconds(30),
        ]);

        // Kotak kunci dua board (firmware_kotak_kunci.ino + firmware_kamera_boardB.ino).
        // api_key diisi ke SERVER_TOKEN di firmware masing-masing board.
        DeviceStatus::create([
            'device_id' => 'kotak-kunci-cam-01',
            'api_key' => Str::random(40),
            'status' => 'offline',
            'pir_mode' => 'OFF',
        ]);

        DeviceStatus::create([
            'device_id' => 'kotak-kunci-01',
            'api_key' => Str::random(40),
            'status' => 'offline',
            'pir_mode' => 'OFF',
            'camera_device_id' => 'kotak-kunci-cam-01',
        ]);
    }
}
