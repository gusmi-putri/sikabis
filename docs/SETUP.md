# Panduan Instalasi

## Prasyarat

- PHP 8.2 atau lebih baru, dengan ekstensi: `openssl`, `pdo_mysql`, `mbstring`, `curl`, `fileinfo`, `gd`, `zip`, `intl`
- Composer 2.x
- MySQL 8.0+ (atau MariaDB yang kompatibel)
- Node.js 20+ dan npm
- Untuk Windows: [Laragon](https://laragon.org/) direkomendasikan — satu paket berisi PHP, Composer, MySQL sekaligus.

## 1. Clone & Install Dependencies

```bash
git clone <url-repo-ini>
cd sikabis

composer install
npm install
```

## 2. Konfigurasi Environment

```bash
cp .env.example .env
php artisan key:generate
```

Edit `.env`, sesuaikan bagian database:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=sikabis
DB_USERNAME=root
DB_PASSWORD=

FRONTEND_URL=http://localhost:8000
```

Buat database-nya:

```bash
mysql -u root -e "CREATE DATABASE sikabis CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

## 3. Migrasi & Seed Database

```bash
php artisan migrate --seed
```

Seeder (`database/seeders/SiJagaSeeder.php`) akan membuat:
- 3 akun user contoh (`admin`/`123` sebagai Admin PAM, `piket`/`123` dan `piket2`/`123` sebagai Piket Jaga — `piket2` sengaja nonaktif untuk demo).
- Beberapa data personel, access log, dan motion event contoh.
- Satu baris `device_statuses` untuk `ESP32-GUDANG-01`, lengkap dengan `api_key` yang di-generate acak.

**Simpan `api_key` yang tercetak** — dibutuhkan untuk konfigurasi firmware ESP32 (lihat langkah 6). Kalau lupa, ambil lagi dengan:

```bash
mysql -u root sikabis -e "SELECT device_id, api_key FROM device_statuses;"
```

## 4. Storage Link

Wajib supaya foto motion event bisa diakses lewat browser:

```bash
php artisan storage:link
```

## 5. Build Frontend & Jalankan Server

**Untuk development** (dengan hot-reload):

```bash
# Terminal 1
php artisan serve --host=0.0.0.0

# Terminal 2
npm run dev
```

**Untuk penggunaan sehari-hari / production build:**

```bash
npm run build
php artisan serve --host=0.0.0.0
```

> `--host=0.0.0.0` **wajib** kalau perangkat ESP32 perlu mengakses server ini lewat jaringan LAN — `php artisan serve` tanpa flag ini hanya mendengarkan di `127.0.0.1` dan tidak akan terlihat oleh perangkat lain di jaringan.

Akses dashboard di `http://localhost:8000` (atau `http://<IP-LAN-komputer>:8000` dari perangkat lain).

## 6. Konfigurasi & Upload Firmware ESP32-CAM

Lihat panduan lengkap di [firmware/esp32-cam-gudang/README.md](../firmware/esp32-cam-gudang/README.md). Ringkasnya:

1. Salin `firmware/esp32-cam-gudang/config.h.example` → `config.h`.
2. Isi `config.h` dengan: SSID/password WiFi, token bot Telegram, IP LAN komputer server (dari langkah 5), dan `api_key` device (dari langkah 3).
3. Buka `esp32-cam-gudang.ino` di Arduino IDE, install library yang dibutuhkan, lalu upload ke board.

## Mencari IP LAN Komputer Server

Firmware ESP32 butuh IP LAN komputer yang menjalankan Laravel (bukan `localhost`):

**Windows:**
```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" }
```

**macOS/Linux:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

Untuk pemakaian jangka panjang, sebaiknya set **IP address reservation/static** untuk komputer server di pengaturan router, supaya IP-nya tidak berubah-ubah karena DHCP (yang akan membuat firmware perlu diupload ulang tiap kali IP berganti).

## Troubleshooting Umum

| Gejala | Kemungkinan Penyebab |
|---|---|
| Foto motion event 404 di browser | Symlink `public/storage` rusak/bukan symlink asli. Jalankan ulang `php artisan storage:link`. |
| ESP32 tidak bisa hubungi server | Server tidak dijalankan dengan `--host=0.0.0.0`, atau `API_BASE_URL` di `config.h` masih pakai `localhost`/IP lama. |
| Perubahan status (PIR/flash) dari web tidak sampai ke device | Tunggu maks. 10 detik (interval polling firmware), atau cek `serverTerhubung` lewat command `/status` di Telegram. |
| Halaman blank / asset 404 setelah `git pull` | Jalankan `npm run build` ulang — build lama di `public/build` tidak otomatis update. |
