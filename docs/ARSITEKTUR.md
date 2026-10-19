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
- Middleware: `auth:sanctum`, plus `role:admin_pam,piket` untuk kontrol perangkat fisik dan `role:admin_pam` untuk manajemen personel/akun. Lihat [Role dan Hak Akses](#role-dan-hak-akses).
- Dipakai untuk semua endpoint dashboard: data log, manajemen personel/user, kontrol perangkat dari UI.

## Role dan Hak Akses

Tiga role di tabel `users`, dicek backend lewat middleware `EnsureUserHasRole` (`role:<daftar>` di `routes/api.php`) — bukan cuma disembunyikan di UI:

| Role | Lihat dashboard/log | Kontrol sensor PIR, flash, kotak kunci | Kelola personel & akun |
|---|---|---|---|
| `admin_pam` | ✅ | ✅ | ✅ |
| `piket` | ✅ | ✅ | ❌ |
| `pimpinan` | ✅ (termasuk live stream) | ❌ — ditolak `403` di backend | ❌ |

Frontend menyesuaikan tampilan untuk `pimpinan`: `Dashboard.tsx` menukar panel kontrol (`PIRControlPanel`, `DeviceStatusPanel`, `LiveCameraPanel`) dengan `ExecutiveHardwareSummary` yang murni ringkasan tanpa tombol aksi, supaya tidak menampilkan kontrol yang akan ditolak backend.

Admin PAM mengelola akun lewat **Manajemen User**: boleh membuat/mengubah/menghapus/menonaktifkan akun `piket` dan `pimpinan`, boleh mengubah profil sendiri, tapi **tidak** bisa mengubah, menghapus, atau menonaktifkan akun `admin_pam` lain (`UserController::ensureNotAdminPam`) — mencegah situasi di mana sistem kehilangan semua admin aktif.

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
| `users` | Akun login web (`role`: `admin_pam`, `piket`, atau `pimpinan`) |
| `personnel` | Personel kotak kunci: nama, pangkat/NRP, dan ID sidik jari (1-127) di sensor Board A |
| `access_logs` | Riwayat percobaan akses kotak kunci; `personnel_id` = pemilik ID saat kejadian |
| `access_photos` | Foto kamera kotak kunci, dipasangkan ke `access_logs` |
| `motion_events` | Riwayat deteksi PIR + foto dari ESP32-CAM |
| `device_statuses` | Status live tiap perangkat (online/offline, status PIR, flash, stream URL, API key) |
| `pir_mode_logs` | Riwayat perubahan nyala/mati sensor PIR, dengan sumber (`web`/`telegram`) dan siapa yang mengubah |
| `activity_logs` | Jejak tindakan operator (login, kelola personel/akun, kontrol perangkat) dengan pelaku dan IP, khusus dibaca Admin PAM |

## Polling Dashboard yang Hemat

Dashboard tidak lagi memanggil 8 endpoint tiap 2 detik. Tiap siklus hanya tiga permintaan ringan: status perangkat, status kotak kunci, dan `GET /sync-state` (sidik jari perubahan tiap daftar, dihitung dengan agregat tanpa mengambil baris). Daftar log, foto, personel, dan riwayat baru diunduh ulang **hanya kalau sidik jarinya berubah**, dan sidik jari baru dicatat setelah unduhan berhasil sehingga yang gagal dicoba lagi. Refresh penuh tiap 60 detik menjadi jaring pengaman, dan kalau `/sync-state` gagal dashboard kembali ke pengambilan penuh. Alasannya: pemuatan penuh tiap 2 detik membuat antrean koneksi browser penuh (foto gagal termuat) dan makin berat seiring data bertambah.

## Keamanan Login dan Log Aktivitas

- **Pembatasan login:** 5 percobaan per menit per kombinasi akun + IP, 20 per menit per IP (`RateLimiter` `login` di `AppServiceProvider`), supaya password tidak bisa ditebak berulang.
- **Log aktivitas (`activity_logs`):** login berhasil/gagal, kelola personel dan akun, ubah status sensor/flash, dan perintah ke kotak kunci dicatat beserta pelaku dan alamat IP. Nama pelaku disalin saat kejadian (tanpa foreign key), jadi jejak tetap ada walau akunnya dihapus. Kegagalan menulis log tidak menggagalkan aksi aslinya (hanya dilaporkan ke log Laravel). Hanya Admin PAM yang bisa membacanya (menu **Log Aktivitas**).
- **Rotasi API key perangkat:** `php artisan device:rotate-key <device_id>` mengganti kunci dan mencetak kunci baru untuk disalin ke `config.h`.

## Status Sensor: Nyala vs Mati

Nilai `pir_mode` di database adalah `ON`/`OFF` (kolom ini sempat bernama konsep `ARMED`/`ACTIVITY` di awal pengembangan, sudah diubah lewat migration `change_pir_mode_to_on_off`). Secara konsep ini **saklar nyala/mati sederhana**, bukan dua mode berbeda:

- `ON` = sensor nyala → gerakan memicu foto, upload ke dashboard, DAN notifikasi Telegram.
- `OFF` = sensor mati → tidak ada reaksi sama sekali terhadap gerakan (baik ke Telegram maupun dashboard).

UI web dan seluruh teks yang dibaca operator menampilkan ini sebagai "Nyala"/"Mati" atau "Nyalakan Sensor"/"Matikan Sensor" — kata "mode" sengaja dihindari karena ini saklar, bukan dua perilaku berbeda. `pir_mode` mentah (`ON`/`OFF`) tetap dipakai untuk logika; API menyertakan field turunan `sensor_label` ("Nyala"/"Mati") di `device-status`, `motion-events`, dan `pir-mode-logs` supaya frontend tidak perlu menulis ulang pemetaannya (lihat [API.md](API.md)).

## Penyimpanan Foto

Foto motion event diupload ESP32 sebagai multipart form-data ke `POST /api/device/motion-event`, disimpan Laravel ke `storage/app/public/motion-events/`, lalu diakses publik lewat symlink `public/storage` → `storage/app/public` (dibuat dengan `php artisan storage:link`).

> **Catatan operasional:** kalau folder proyek pernah dipindah/di-restructure secara manual (bukan lewat Artisan), symlink ini bisa jadi folder kosong biasa dan foto akan 404 di browser meski file aslinya tersimpan dengan benar. Jalankan ulang `php artisan storage:link` setelah restrukturisasi apa pun.

## Kotak Kunci Sidik Jari

Kotak kunci terdiri dari dua board yang berdiri sendiri: Board A (sensor AS608 + solenoid) mengirim log ke `POST /api/device/keybox/log`, Board B (ESP32-CAM) memotret saat jari menempel dan mengirim foto ke `POST /api/device/keybox/foto`. Server memasangkan foto dengan log berdasarkan waktu kejadian (`umur_ms`), bukan jam tiba (lihat [API.md](API.md#kotak-kunci-dua-board)).

**Pendaftaran dan pencabutan sidik jari sudah tersambung dua arah lewat web**, sudah diuji dan berjalan:

- **Arah web → sensor**: Admin PAM mencatat/mencabut personel di menu **Manajemen Akses**. `PersonnelController` menulis perintah `ENROLL`/`DELETE` beserta target ID ke kolom `keybox_command`/`keybox_command_target` di `device_statuses`. Board A mengambilnya lewat polling `GET /api/device/keybox/command`, lalu menjalankan proses tempel-jari dua kali secara fisik di sensor AS608 (perintah dari jaringan tidak bisa membuka solenoid, hanya memicu mode *enroll*/*delete* di sensor).
- **Arah sensor → web**: selagi proses berjalan, Board A melapor tiap tahap ("Tempelkan jari", "Angkat jari...", "Berhasil disimpan", dst) lewat `POST /api/device/keybox/enroll-status`, ditampilkan live di form registrasi supaya operator tidak perlu membuka Serial Monitor.
- Hasil tiap percobaan akses (cocok/tidak) tetap lewat jalur terpisah `POST /api/device/keybox/log` seperti dijelaskan di atas — bukan bagian dari alur enroll/delete.

**Keputusan keamanan yang disengaja:** tidak ada perintah buka solenoid dari jarak jauh. Perintah dari web hanya memicu mode pendaftaran/penghapusan template, bukan membuka kunci — jari yang sah secara fisik tetap wajib ditempelkan di sensor.

Setiap log menyimpan `personnel_id` pemilik ID saat kejadian, sehingga riwayat lama tidak berpindah nama ketika nomor ID dipakai ulang oleh personel lain. Catatan operasional: mencabut akses di web melepas `fingerprint_id` dari personel (lewat `deactivate()`) **dan** mengirim perintah `DELETE` ke Board A, tapi kalau sebuah ID pernah didaftarkan di luar alur ini (misalnya langsung lewat Serial Monitor di masa lalu, atau row personel-nya dihapus manual dari database), template-nya bisa tertinggal di sensor tanpa pemilik di tabel — log percobaan dengan ID itu akan tampil "Tidak dikenal" padahal solenoid tetap terbuka.
