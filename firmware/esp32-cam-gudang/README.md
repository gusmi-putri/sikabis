# Firmware ESP32-CAM — Gudang

Firmware untuk board **AI Thinker ESP32-CAM**, menjalankan tiga fungsi sekaligus:

1. **Live streaming** MJPEG lewat browser (`http://<IP-ESP32>/stream`).
2. **Bot Telegram** — notifikasi + foto otomatis saat sensor PIR mendeteksi gerakan, plus kontrol manual lewat command.
3. **Integrasi backend Laravel SI-JAGA** — motion event, status perangkat, dan kontrol PIR/flash tersinkron dua arah dengan dashboard web.

## Kebutuhan Hardware

- Board **AI Thinker ESP32-CAM** (dengan PSRAM).
- Sensor PIR, output digital dihubungkan ke **GPIO13**.
- Programmer FTDI/USB-to-serial (board ini tidak punya USB langsung).
- Sumber daya **5V terpisah yang kuat** — streaming + Telegram + API menarik arus cukup besar, jangan hanya mengandalkan pin 5V dari FTDI programmer.

## Kebutuhan Software

**Arduino IDE** dengan board package ESP32 terpasang ([panduan resmi Espressif](https://docs.espressif.com/projects/arduino-esp32/en/latest/installing.html)).

**Library** (install lewat Library Manager):
1. `UniversalTelegramBot` by Brian Lough
2. `ArduinoJson` by Benoit Blanchon (versi 6.x)

**Pengaturan board** di Arduino IDE:
- Board: `AI Thinker ESP32-CAM`
- Partition Scheme: `Huge APP (3MB No OTA/1MB SPIFFS)`

## Konfigurasi

Kredensial (WiFi, token Telegram, alamat server, API key) **tidak ditulis langsung di kode**, melainkan di file `config.h` yang di-gitignore supaya tidak pernah ter-commit ke repo.

```bash
cp config.h.example config.h
```

Edit `config.h`:

```cpp
const char* WIFI_SSID     = "nama-wifi-anda";
const char* WIFI_PASSWORD = "password-wifi-anda";

const char* BOT_TOKEN_VAL = "token-dari-@BotFather";
const char* CHAT_ID_VAL   = "chat-id-dari-@userinfobot";

const char* API_BASE_URL_VAL   = "http://192.168.1.XXX:8000/api";  // IP LAN server Laravel
const char* DEVICE_ID_VAL      = "ESP32-GUDANG-01";
const char* DEVICE_API_KEY_VAL = "api-key-dari-tabel-device_statuses";
```

**Cara dapat masing-masing nilai:**
- `WIFI_SSID`/`WIFI_PASSWORD` — jaringan WiFi tempat ESP32 akan beroperasi (harus sejaringan dengan komputer server).
- `BOT_TOKEN_VAL` — chat dengan [@BotFather](https://t.me/BotFather) di Telegram, buat bot baru.
- `CHAT_ID_VAL` — chat dengan [@userinfobot](https://t.me/userinfobot), akan membalas dengan ID Anda.
- `API_BASE_URL_VAL` — IP LAN komputer server, **bukan** `localhost` (lihat [docs/SETUP.md](../../docs/SETUP.md#mencari-ip-lan-komputer-server) di root repo).
- `DEVICE_API_KEY_VAL` — dicetak otomatis saat `php artisan migrate --seed` dijalankan pertama kali di backend, atau lihat lewat `mysql -u root sikabis -e "SELECT device_id, api_key FROM device_statuses;"`.

## Upload ke Board

1. Hubungkan programmer FTDI ke board (perhatikan TX/RX bersilang: TX programmer → RX board, RX programmer → TX board).
2. **Jumper pin IO0 ke GND** sebelum menyalakan/upload (mode flashing).
3. Tekan tombol RESET di board.
4. Klik Upload di Arduino IDE.
5. Setelah selesai upload, **cabut jumper IO0-GND**, lalu tekan RESET lagi untuk menjalankan program normal.
6. Buka Serial Monitor (115200 baud) untuk melihat log booting — akan menampilkan IP address dan status koneksi ke server.

## Perintah Bot Telegram

| Command | Fungsi |
|---|---|
| `/start` | Tampilkan daftar perintah |
| `/photo` | Ambil & kirim foto sekarang juga |
| `/ip` | Tampilkan alamat live stream saat ini |
| `/flash` | Nyalakan/matikan LED flash (tersinkron ke dashboard web) |
| `/piron` | Nyalakan sensor PIR (tersinkron ke dashboard sebagai status "nyala") |
| `/piroff` | Matikan sensor PIR (tersinkron ke dashboard sebagai status "mati") |
| `/status` | Tampilkan status sensor PIR, flash, dan koneksi ke server SI-JAGA |

## Perilaku Sensor PIR

Sensor **bukan** dua-mode (ARMED vs ACTIVITY sebagai fitur berbeda) — ini saklar nyala/mati sederhana:

- **Nyala**: gerakan memicu foto → dikirim ke Telegram **dan** diupload ke dashboard web.
- **Mati**: gerakan tidak memicu apa pun — tidak ke Telegram, tidak ke dashboard.

Status ini tersinkron dua arah dengan dashboard web (lihat [docs/ARSITEKTUR.md](../../docs/ARSITEKTUR.md#model-sinkronisasi-perangkat-heartbeat--polling) untuk detail mekanismenya).

## Keandalan

- **Auto-reconnect WiFi** — kalau koneksi putus, firmware otomatis mencoba menyambung ulang tiap 10 detik tanpa perlu restart manual.
- **Kalibrasi PIR 30 detik saat boot** — mencegah notifikasi palsu dari sensor yang belum stabil.
- **Toleran terhadap server offline** — kalau backend Laravel tidak bisa dihubungi, jalur Telegram tetap berfungsi normal (kegagalan API hanya dicatat ke Serial log, tidak mengganggu fungsi utama).

## Troubleshooting

| Gejala | Kemungkinan Penyebab |
|---|---|
| Upload gagal / board tidak terdeteksi | Pastikan jumper IO0-GND terpasang saat upload, dan driver USB-to-serial programmer sudah terinstall. |
| Kamera gagal init (`Camera init failed`) | Kabel fleksibel kamera tidak terpasang benar, atau board bukan varian dengan PSRAM. |
| WiFi gagal konek | Cek SSID/password di `config.h`, pastikan jaringan 2.4GHz (ESP32 tidak mendukung 5GHz). |
| Status "TIDAK terhubung" ke server SI-JAGA (`/status`) | Cek `API_BASE_URL_VAL` — harus IP LAN, server harus jalan dengan `--host=0.0.0.0`, dan `DEVICE_API_KEY_VAL` harus cocok dengan database. |
| Live stream tidak muncul di dashboard web | Tunggu maks. 30 detik (interval heartbeat pertama), atau cek `stream_url` di tabel `device_statuses` sudah terisi. |
