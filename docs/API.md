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
Riwayat scan fingerprint key box, terbaru duluan. Field `personnel_name` di-resolve dari relasi `fingerprint_id`, bisa `null` kalau fingerprint tidak dikenal (misal upaya akses gagal).

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
    "device_id": "ESP32-GUDANG-01",
    "status": "online",
    "pir_mode": "ARMED",
    "flash_on": false,
    "stream_url": "http://192.168.1.17/stream",
    "last_seen": "2026-09-17T15:02:03+00:00",
    "pending_command": "NONE",
    "pending_target": null,
    "pending_since": null
  }
}
```

### `POST /device/pir-mode` 🔐
Nyalakan/matikan sensor PIR dari web. Mencatat entri baru ke `pir_mode_logs` (source: `web`) kalau nilainya benar-benar berubah.

```json
{ "mode": "ARMED" }   // atau "ACTIVITY"
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
    { "id": 2, "device_id": "ESP32-GUDANG-01", "pir_mode": "ARMED", "source": "telegram", "changed_by": null, "created_at": "..." },
    { "id": 1, "device_id": "ESP32-GUDANG-01", "pir_mode": "ACTIVITY", "source": "web", "changed_by": "Letkol Admin PAM", "created_at": "..." }
  ]
}
```

### `POST /device/cancel-pending` 🔐👑
Batalkan command `ENROLL`/`DELETE` yang belum direspon key box fisik. Personel `pending_enroll` → `failed`, `pending_revoke` → `active`.

---

## Manajemen Akses Personel (Admin PAM)

### `POST /personnel/enroll` 🔐👑
Daftarkan personel baru, status awal `pending_enroll`, memicu `pending_command: ENROLL` di device.

```json
{ "name": "Praka Budi", "rank_nrp": "Praka Inf / 123...", "notes": "opsional" }
```

### `POST /personnel/revoke` 🔐👑
Cabut akses personel by `fingerprint_id`, status jadi `pending_revoke`, memicu `pending_command: DELETE`.

```json
{ "fingerprint_id": 5 }
```

### `PUT /personnel/{id}` 🔐👑
Update data personel (nama, pangkat/NRP, catatan).

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
  "device_id": "ESP32-GUDANG-01",
  "stream_url": "http://192.168.1.17/stream",
  "pir_mode": "ARMED",
  "flash_on": true
}
```

`stream_url` selalu disertakan. `pir_mode` dan `flash_on` **hanya** disertakan saat device sendiri baru mengubahnya (misal command Telegram) — lihat [ARSITEKTUR.md](ARSITEKTUR.md#model-sinkronisasi-perangkat-heartbeat--polling) untuk kenapa ini penting. Response `204`.

### `GET /device/command?device_id=ESP32-GUDANG-01` 📡
Dipoll device untuk mengambil perintah terbaru dari web.

```json
{ "pir_mode": "ARMED", "flash_on": false }
```

### `POST /device/motion-event` 📡
Upload foto motion event. `multipart/form-data`, bukan JSON.

| Field | Tipe | Keterangan |
|---|---|---|
| `device_id` | string | wajib |
| `pir_mode` | string | wajib, `ARMED`/`ACTIVITY` |
| `photo` | file | wajib, image, maks 5MB |

Response `201`: `{ "id": 42 }`.

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
