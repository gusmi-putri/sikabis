# Arsitektur SI-JAGA

## Gambaran Umum

SI-JAGA terdiri dari tiga komponen yang saling terhubung lewat REST API:

```
┌─────────────────────┐         ┌──────────────────────┐         ┌─────────────────────┐
│   Browser (React)   │◄───────►│   Laravel Backend     │◄───────►│   ESP32-CAM (IoT)    │
│  via Inertia.js     │  HTTP   │   + MySQL              │  HTTP   │   ON/OFF     │
│  Dashboard SPA-like │ Sanctum │   routes/api.php        │ X-Device│   PIR + Kamera       │
└─────────────────────┘         └──────────────────────┘  -Key    └─────────────────────┘
                                                                            │
                                                                            ▼
                                                                    ┌───────────────┐
                                                                    │ Bot Telegram  │
                                                                    │ (notifikasi)  │
                                                                    └───────────────┘
```

Backend dan frontend berjalan dalam **satu aplikasi Laravel** (menggunakan Inertia.js — bukan SPA terpisah dengan CORS). Perangkat IoT (ESP32-CAM) adalah klien HTTP eksternal yang berkomunikasi lewat endpoint API khusus dengan skema autentikasi berbeda dari user web.

## Dua Jalur Autentikasi

API di `routes/api.php` punya dua kelompok endpoint dengan mekanisme auth yang **sengaja dipisah**:

### 1. User web (browser) — Laravel Sanctum, token-based

- Login via `POST /api/login` mengembalikan personal access token (Sanctum).
- Setiap request berikutnya menyertakan `Authorization: Bearer <token>`.
- Middleware: `auth:sanctum`, plus `role:admin_pam` untuk endpoint khusus admin.
- Dipakai untuk semua endpoint dashboard: data log, manajemen personel/user, kontrol perangkat dari UI.

### 2. Perangkat IoT (ESP32) — API key statis per device

- Setiap baris di tabel `device_statuses` punya kolom `api_key` unik (di-generate sekali saat seeding).
- ESP32 menyertakan `X-Device-Key: <api_key>` di setiap request, bukan Bearer token.
- Middleware: `device.key` (`App\Http\Middleware\EnsureValidDeviceKey`).
- Kenapa dipisah dari Sanctum: firmware bukan "user" yang login — ia perangkat headless yang selalu memakai kredensial tetap. Menyamakannya dengan alur user (CSRF, session, token expiry) hanya menambah kerumitan tanpa manfaat.

## Model Sinkronisasi Perangkat: Heartbeat + Polling

Karena ESP32 dan web sama-sama bisa mengubah state perangkat (mode PIR, flash), dipakai pola **heartbeat + polling** alih-alih WebSocket/event push (lebih sederhana untuk board dengan resource terbatas):

```
Web ubah status  ──POST /api/device/pir-mode──►  DB (device_statuses)
                                                         │
ESP32 poll tiap 10 detik ──GET /api/device/command──────┘
                          (baca status terbaru, terapkan ke hardware)

ESP32 ubah status ──POST /api/device/heartbeat (pir_mode/flash_on)──►  DB
                    (HANYA saat device sendiri yang mengubah, misal
                     command Telegram /piron — BUKAN di setiap
                     heartbeat rutin, supaya tidak race dengan
                     perubahan dari web yang belum sempat di-poll)

ESP32 heartbeat rutin tiap 30 detik ──POST /api/device/heartbeat──►  DB
                    (hanya update status "online" + last_seen +
                     stream_url, TANPA pir_mode/flash_on)
```

**Kenapa heartbeat rutin tidak menyertakan pir_mode/flash_on:** kalau disertakan di setiap heartbeat, nilai lokal device yang belum ter-update bisa menimpa balik perubahan yang baru saja diset dari web sebelum device sempat poll `/device/command` — menyebabkan tombol di web terlihat "tidak berhasil" karena kalah race dengan heartbeat berikutnya. Field ini hanya dikirim tepat setelah device sendiri mengubah state (lewat command Telegram).

## Model Data Utama

| Tabel | Fungsi |
|---|---|
| `users` | Akun login web (`role`: `admin_pam` atau `piket`) |
| `personnel` | Personel kotak kunci: nama, pangkat/NRP, dan ID sidik jari (1-127) di sensor Board A |
| `access_logs` | Riwayat percobaan akses kotak kunci; `personnel_id` = pemilik ID saat kejadian |
| `access_photos` | Foto kamera kotak kunci, dipasangkan ke `access_logs` |
| `motion_events` | Riwayat deteksi PIR + foto dari ESP32-CAM |
| `device_statuses` | Status live tiap perangkat (online/offline, mode PIR, flash, stream URL, API key) |
| `pir_mode_logs` | Riwayat perubahan nyala/mati sensor PIR, dengan sumber (`web`/`telegram`) dan siapa yang mengubah |

## Mode PIR: ARMED vs ACTIVITY

Nilai `pir_mode` di database tetap `ARMED`/`ACTIVITY` (historis), tapi **secara konsep sekarang ini adalah saklar nyala/mati sederhana**, bukan dua mode berbeda:

- `ARMED` = sensor nyala → gerakan memicu foto, upload ke dashboard, DAN notifikasi Telegram.
- `ACTIVITY` = sensor mati → tidak ada reaksi sama sekali terhadap gerakan (baik ke Telegram maupun dashboard).

UI web menampilkan ini sebagai "Nyalakan Sensor" / "Matikan Sensor", bukan istilah ON/OFF, untuk menghindari kebingungan operator.

## Penyimpanan Foto

Foto motion event diupload ESP32 sebagai multipart form-data ke `POST /api/device/motion-event`, disimpan Laravel ke `storage/app/public/motion-events/`, lalu diakses publik lewat symlink `public/storage` → `storage/app/public` (dibuat dengan `php artisan storage:link`).

> **Catatan operasional:** kalau folder proyek pernah dipindah/di-restructure secara manual (bukan lewat Artisan), symlink ini bisa jadi folder kosong biasa dan foto akan 404 di browser meski file aslinya tersimpan dengan benar. Jalankan ulang `php artisan storage:link` setelah restrukturisasi apa pun.

## Kotak Kunci Sidik Jari

Kotak kunci terdiri dari dua board yang berdiri sendiri: Board A (sensor AS608 + solenoid) mengirim log ke `POST /api/device/keybox/log`, Board B (ESP32-CAM) memotret saat jari menempel dan mengirim foto ke `POST /api/device/keybox/foto`. Server memasangkan foto dengan log berdasarkan jam kedatangan (lihat [API.md](API.md#kotak-kunci-dua-board)).

**Pendaftaran sidik jari tidak lewat web.** Perangkat pintu sengaja tidak menerima perintah dari jaringan. Alurnya:

1. Petugas mendaftarkan jari di Board A lewat Serial Monitor (perintah `D`, lalu nomor ID 1-127).
2. Admin PAM mencatat nama, pangkat/NRP, dan nomor ID yang sama di menu **Manajemen Akses**.
3. Mencabut akses di web melepas ID dari personel itu; **template di sensor tetap harus dihapus di Board A**, karena selama masih tersimpan jari itu tetap bisa membuka kotak.

Setiap log menyimpan `personnel_id` pemilik ID saat kejadian, sehingga riwayat lama tidak berpindah nama ketika nomor ID dipakai ulang oleh personel lain.
