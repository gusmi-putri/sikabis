# SI-JAGA — Sistem Informasi Jaga Gudang

Command center keamanan gudang berbasis web, terintegrasi dengan perangkat IoT (ESP32-CAM) untuk deteksi gerakan (PIR), live streaming, dan notifikasi Telegram real-time.

Dikembangkan untuk **Bengpuskomlekad** sebagai sistem kontrol akses dan monitoring gudang senjata/perlengkapan.

## Fitur

- **Dashboard real-time** — statistik akses 24 jam, status perangkat, live camera feed.
- **Manajemen akses key box** — enroll/revoke personel dengan sinkronisasi ke sensor fingerprint fisik.
- **Kontrol sensor PIR** — nyala/matikan sensor gerak dari web, tersinkron dua arah dengan Telegram.
- **Kontrol flash LED** ESP32-CAM dari web maupun Telegram.
- **Live streaming MJPEG** langsung dari kamera ESP32-CAM, ditampilkan di dashboard.
- **Log motion event** — setiap gerakan tercatat dengan foto, baik saat sensor nyala maupun mati (untuk jejak audit).
- **Riwayat nyala/mati sensor** — mencatat siapa/apa yang mengubah, dari web atau Telegram.
- **Role-based access control** — Admin PAM (akses penuh) vs Piket Jaga (monitoring saja).
- **Notifikasi Telegram otomatis** — foto + info setiap kali ada gerakan terdeteksi.

## Tech Stack

| Layer | Teknologi |
|---|---|
| Backend | Laravel 13, MySQL 8, Sanctum (auth) |
| Frontend | React 19 + TypeScript, Inertia.js, Tailwind CSS 4 |
| Firmware | ESP32-CAM (Arduino/C++), UniversalTelegramBot, ArduinoJson |
| Build tool | Vite 8 |

## Struktur Proyek

```
sikabis/
├── app/                        # Backend Laravel (controllers, models, middleware)
│   └── Http/Controllers/Api/   # Semua REST API controller
├── database/migrations/        # Skema database
├── resources/
│   ├── js/                     # Frontend React + TypeScript
│   │   ├── Pages/               # Halaman Inertia (Dashboard.tsx)
│   │   ├── components/          # Komponen UI
│   │   └── services/api.ts      # HTTP client ke backend
│   └── views/                  # Blade shell untuk Inertia
├── routes/api.php              # Definisi endpoint API
├── firmware/
│   └── esp32-cam-gudang/       # Firmware ESP32-CAM (Arduino sketch)
└── docs/                       # Dokumentasi detail (lihat di bawah)
```

## Dokumentasi Lengkap

| Dokumen | Isi |
|---|---|
| [docs/ARSITEKTUR.md](docs/ARSITEKTUR.md) | Bagaimana web, backend, dan perangkat IoT saling terhubung |
| [docs/SETUP.md](docs/SETUP.md) | Panduan instalasi & menjalankan proyek dari nol |
| [docs/API.md](docs/API.md) | Referensi lengkap semua endpoint REST API |
| [firmware/esp32-cam-gudang/README.md](firmware/esp32-cam-gudang/README.md) | Wiring, konfigurasi, dan upload firmware ESP32-CAM |

## Quick Start

Butuh PHP 8.2+, Composer, MySQL 8+, Node.js 20+. Lihat [docs/SETUP.md](docs/SETUP.md) untuk panduan lengkap.

```bash
# Install dependencies
composer install
npm install

# Setup environment & database
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan storage:link

# Build frontend & jalankan
npm run build
php artisan serve --host=0.0.0.0
```

Login default (dari seeder): `admin` / `123` (Admin PAM), `piket` / `123` (Piket Jaga).

**Ganti password default ini sebelum dipakai di lingkungan produksi.**

## Status Pengembangan

- ✅ Web dashboard (React + Inertia + Laravel) — selesai & teruji.
- ✅ Integrasi ESP32-CAM (motion capture, live stream, kontrol PIR/flash) — selesai & teruji.
- ⏳ Key box fingerprint (KEYBOX-01) — belum diimplementasikan; saat ini menu "Manajemen Akses" di web sudah siap sisi software-nya, tapi perangkat fisiknya masih terpisah dan perlu firmware sendiri.

## Lisensi

Proprietary — dikembangkan khusus untuk kebutuhan internal Bengpuskomlekad.
