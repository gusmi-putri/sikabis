# API Reference

Base URL: `http://<host>:8000/api`

Semua response sukses berbentuk JSON. Endpoint yang mengembalikan koleksi data membungkusnya dalam `{ "data": [...] }` (Laravel API Resource Collection); endpoint tunggal membungkus dalam `{ "data": {...} }`.

## Autentikasi

Ada **dua jalur auth berbeda** — lihat [ARSITEKTUR.md](ARSITEKTUR.md#dua-jalur-autentikasi) untuk penjelasan kenapa dipisah.

### A. User web (Sanctum Bearer Token)

```
Authorization: Bearer <token>
```

Token didapat dari `POST /login`. Endpoint yang butuh ini ditandai 🔐 di tabel bawah. Endpoint bertanda 🔐👑 hanya bisa diakses role `admin_pam`.

### B. Perangkat IoT (Device API Key)

```
X-Device-Key: <api_key milik device>
```

`api_key` unik per baris di tabel `device_statuses`, bukan token Sanctum. Endpoint yang butuh ini ditandai 📡.

---

## Auth

### `POST /login`
Login user web. Tidak butuh auth.

**Request:**
```json
{ "username": "admin", "password": "123" }
```

**Response `200`:**
```json
{
  "user": { "id": 1, "name": "Letkol Admin PAM", "username": "admin", "role": "admin_pam", "is_active": true, "created_at": "..." },
  "token": "1|xxxxxxxxxxxxxxxxxxxx"
}
```

**Response `422`** (kredensial salah / akun nonaktif):
```json
{ "message": "...", "errors": { "username": ["Username atau password salah."] } }
```

### `POST /logout` 🔐
Cabut token Sanctum yang sedang dipakai. Response `204`.

---

## Dashboard — Data Log

### `GET /access-logs` 🔐
Riwayat scan fingerprint key box, terbaru duluan. Field `personnel_name` di-resolve dari relasi `fingerprint_id`, bisa `null` kalau fingerprint tidak dikenal (misal upaya akses gagal). Log dari kotak kunci dua board juga membawa `reason`, `confidence`, `failed_streak`, `alarm`, `event_number`, `missing_before`, dan `device_restarted` (lihat `POST /device/keybox/log`).

### `GET /motion-events` 🔐
Riwayat deteksi PIR + foto, terbaru duluan.

### `GET /personnel` 🔐
Daftar personel terdaftar akses key box.

### `GET /users` 🔐👑
Daftar akun user (admin + piket).

---

## Perangkat & Kontrol

### `GET /device-status` 🔐
Status live perangkat (mengembalikan objek tunggal — device pertama di tabel). Otomatis menandai `status: "offline"` kalau `last_seen` lebih tua dari 90 detik (3x interval heartbeat).

```json
{
  "data": {
    "device_id": "GUDANG-01",
    "status": "online",
    "pir_mode": "ON",
    "flash_on": false,
    "stream_url": "http://192.168.1.17/stream",
    "last_seen": "2026-09-17T15:02:03+00:00"
  }
}
```

### `POST /device/pir-mode` 🔐
Nyalakan/matikan sensor PIR dari web. Mencatat entri baru ke `pir_mode_logs` (source: `web`) kalau nilainya benar-benar berubah.

```json
{ "mode": "ON" }   // atau "OFF"
```

### `POST /device/flash` 🔐
Nyalakan/matikan flash LED ESP32-CAM. Perubahan diambil firmware lewat polling `GET /device/command`.

```json
{ "on": true }
```

### `GET /device/pir-mode-logs` 🔐
Riwayat 100 perubahan status PIR terakhir, dari web maupun Telegram.

```json
{
  "data": [
    { "id": 2, "device_id": "GUDANG-01", "pir_mode": "ON", "source": "telegram", "changed_by": null, "created_at": "..." },
    { "id": 1, "device_id": "GUDANG-01", "pir_mode": "OFF", "source": "web", "changed_by": "Letkol Admin PAM", "created_at": "..." }
  ]
}
```

---

## Manajemen Akses Personel (Admin PAM)

Sidik jari didaftarkan langsung di Board A (perintah Serial `D`); endpoint ini hanya mencatat pemilik nomor ID-nya.

### `POST /personnel` 🔐👑
Catat personel baru, langsung berstatus `active`.

```json
{ "name": "Praka Budi", "rank_nrp": "Praka Inf / 123...", "fingerprint_id": 6, "notes": "opsional" }
```

`fingerprint_id` wajib, 1-127, dan belum dipakai personel lain (`422` kalau bentrok).

### `PUT /personnel/{id}` 🔐👑
Update nama, pangkat/NRP, catatan, dan `fingerprint_id`. Mengisi `fingerprint_id` pada personel nonaktif mengaktifkannya lagi.

### `POST /personnel/{id}/deactivate` 🔐👑
Cabut akses: status `inactive`, `fingerprint_id` dilepas agar bisa dipakai lagi. Riwayat akses tetap atas nama personel ini. Template di sensor harus dihapus terpisah di Board A.

---

## Manajemen User / Akun Piket (Admin PAM)

### `POST /users` 🔐👑
Buat akun piket baru. Password otomatis di-hash.

```json
{ "name": "Praka Budi", "username": "budi", "password": "min4karakter", "role": "piket" }
```

### `PUT /users/{id}` 🔐👑
Update akun piket. `password` opsional — kosongkan untuk tidak mengubah. **Hanya bisa untuk akun role `piket`**, mengedit akun `admin_pam` lain akan ditolak `403`.

### `DELETE /users/{id}` 🔐👑
Hapus akun piket. Sama seperti di atas, hanya untuk role `piket`.

### `PATCH /users/{id}/toggle-active` 🔐👑
Aktifkan/nonaktifkan akun piket.

---

## Endpoint Perangkat IoT (ESP32)

Semua endpoint ini pakai auth `X-Device-Key`, **bukan** Sanctum. `device_id` disertakan di body/query, dicocokkan dengan `api_key` di header.

### `POST /device/heartbeat` 📡
Lapor status online + (opsional) perubahan yang device sendiri buat.

```json
{
  "device_id": "GUDANG-01",
  "stream_url": "http://192.168.1.17/stream",
  "pir_mode": "ON",
  "flash_on": true
}
```

`stream_url` selalu disertakan. `pir_mode` dan `flash_on` **hanya** disertakan saat device sendiri baru mengubahnya (misal command Telegram) — lihat [ARSITEKTUR.md](ARSITEKTUR.md#model-sinkronisasi-perangkat-heartbeat--polling) untuk kenapa ini penting. Response `204`.

### `GET /device/command?device_id=GUDANG-01` 📡
Dipoll device untuk mengambil perintah terbaru dari web.

```json
{ "pir_mode": "ON", "flash_on": false }
```

### `POST /device/motion-event` 📡
Upload foto motion event. `multipart/form-data`, bukan JSON.

| Field | Tipe | Keterangan |
|---|---|---|
| `device_id` | string | wajib |
| `pir_mode` | string | wajib, `ARMED`/`ACTIVITY` |
| `photo` | file | wajib, image, maks 5MB |

Response `201`: `{ "id": 42 }`.

### Kotak kunci dua board

Dipakai `firmware_kotak_kunci.ino` (Board A, sidik jari) dan `firmware_kamera_boardB.ino` (Board B, ESP32-CAM). Format mengikuti *Spesifikasi Integrasi ESP32 ke Server*: identitas lewat field `perangkat`, kunci lewat `Authorization: Bearer <api_key>` (header `X-Device-Key` + `device_id` juga diterima).

Daftarkan kedua board dan dapatkan `api_key`-nya dengan:

```bash
php artisan keybox:register            # default: kotak-kunci-01 + kotak-kunci-cam-01
```

### `POST /device/keybox/log` 📡
Satu log per percobaan akses dari Board A. JSON.

```json
{ "perangkat": "kotak-kunci-01", "nomor_kejadian": 7, "waktu_ms": 123456, "umur_ms": 850,
  "hasil": "cocok", "id_sidik_jari": 1, "keyakinan": 76, "gagal_beruntun": 0, "alarm": false }
```

- `hasil` = `cocok` → `result: success`; `tidak_cocok` / `tidak_terbaca` / `keyakinan_rendah` → `result: failed` (nilai aslinya disimpan di `reason`). `id_sidik_jari: -1` disimpan sebagai `fingerprint_id: null`.
- Waktu kejadian (`created_at`, presisi milidetik) = jam server saat diterima dikurangi `umur_ms` (opsional: sudah berapa lama log menunggu di antrean Board A). Tanpa `umur_ms`, jam terima yang dipakai. `waktu_ms` hanya disimpan sebagai `device_uptime_ms`.
- **Idempoten:** kiriman ulang dengan `nomor_kejadian` + `waktu_ms` yang sama dibalas `200` tanpa disimpan dua kali.
- **Nomor bolong:** `missing_before` = jumlah nomor yang terlewat sejak log sebelumnya; `device_restarted: true` kalau `waktu_ms` mundur atau nomor kembali kecil.
- **Pemasangan foto:** log mengklaim foto dari kamera pasangannya (`device_statuses.camera_device_id`) yang belum berpasangan dan waktu potretnya paling dekat dengan waktu kejadian log, dalam selisih ≤ 10 detik ke arah mana pun. Karena memakai waktu kejadian, bukan jam tiba, pemasangan tetap benar walau log atau foto tertahan lama di antrean.

Response `201`: `{ "ok": true, "id": 42 }` (`200` untuk kiriman ulang).

### `POST /device/keybox/foto` 📡
Satu foto per percobaan dari Board B. `multipart/form-data`.

| Field | Tipe | Keterangan |
|---|---|---|
| `perangkat` | string | wajib, mis. `kotak-kunci-cam-01` |
| `nomor_pemicu` | integer | wajib |
| `waktu_ms` | integer | wajib, jam papan saat memotret (sama di setiap kiriman ulang) |
| `umur_ms` | integer | opsional, sudah berapa lama foto menunggu di antrean saat dikirim |
| `foto` | file | wajib, image, maks 5MB |

Response `201`: `{ "ok": true, "id": 9 }`. Waktu potret (`created_at`) = jam terima dikurangi `umur_ms`. Foto langsung dipasangkan dengan log yang sudah ada kalau waktunya paling dekat (≤ 10 detik); kalau belum ada, log yang tiba sesudahnya yang mengklaimnya.

Kiriman ulang (nomor pemicu sama, `waktu_ms` paling lama 30 detik lebih akhir, waktu potret selisih ≤ 30 detik) dibalas `200` dengan `id` foto yang sudah tersimpan dan tidak disimpan lagi.

### `GET /access-photos/unpaired` 🔐
Foto kotak kunci yang tidak pernah mendapat pasangan log (lebih tua dari jendela pemasangan), terbaru duluan. Ditampilkan di halaman Access Log sebagai "Foto Tanpa Log".

### `DELETE /access-photos/{id}` 🔐 (Admin PAM)
Hapus satu foto tanpa log beserta filenya. Response `204`; `422` kalau foto sudah terpasang pada log.

### `DELETE /access-photos/unpaired` 🔐 (Admin PAM)
Hapus semua foto tanpa log (yang tampil di endpoint `GET` di atas). Response `200`: `{ "deleted": 17 }`.

---

## Kode Status Umum

| Kode | Arti |
|---|---|
| `200` | Sukses (GET) |
| `201` | Data berhasil dibuat |
| `204` | Sukses, tanpa body response |
| `401` | Tidak terautentikasi (token/API key salah atau tidak ada) |
| `403` | Terautentikasi tapi tidak punya izin (misal piket akses endpoint admin) |
| `404` | Data tidak ditemukan |
| `422` | Validasi gagal — lihat field `errors` di body response |
