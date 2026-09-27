/* ==================================================================
   FIRMWARE BOARD B  -  KAMERA
   Pengamanan Kotak Kunci  |  Bengpuskomlekad  |  Richard

   Board B punya dua tugas, dan urutan kepentingannya tidak boleh
   dibalik:

     1. WAJIB  - memotret saat jari menyentuh sensor, lalu mengirim
                 fotonya ke server. Inilah buktinya.
     2. BONUS  - menyiarkan gambar kamera secara langsung ke browser
                 supaya petugas bisa melihat keadaan depan kotak.

   Ia tidak tahu apa-apa soal sidik jari, relay, atau alarm - dan
   memang tidak perlu tahu.

   CARA IA DIBERI TAHU
   Satu kabel dari GPIO 25 Board A ke GPIO 13 Board B, ditambah
   ground bersama. Board A menaikkan kabel itu selama 50 ms tepat
   saat jari terdeteksi menempel, SEBELUM hasil pencocokan diketahui.
   Board B menangkap tepi naiknya lewat interupsi, lalu memotret.

   Karena pemicunya datang sebelum hasil pencocokan, percobaan yang
   GAGAL pun ikut terpotret. Itu seluruh alasan sistem ini ada:
   gembok lama tidak meninggalkan jejak siapa pun yang mencoba.

   KALAU BOARD B MATI, pintu tetap aman. Yang hilang hanya fotonya,
   dan Board A tetap mencatat percobaannya.

   Papan: AI Thinker ESP32-CAM
   Partisi: Huge APP (3MB No OTA/1MB SPIFFS)

   Disusun dengan bantuan Claude (Anthropic).
   ================================================================== */

#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include "esp_http_server.h"
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

/* ==================================================================
   BAGIAN 1  -  KONFIGURASI YANG PERLU ANDA ISI
   ================================================================== */

const char* WIFI_SSID  = "Lab Modern Alkomlek";
const char* WIFI_SANDI = "prc_1077";

// Selama false, kamera tetap memotret dan melaporkan ukuran fotonya
// di Serial Monitor, tapi tidak mengirim ke mana pun. Berguna untuk
// menguji rantai pemicu sebelum server rekan Anda siap.
const bool  KIRIM_KE_SERVER = true;
const char* SERVER_URL_FOTO = "http://192.168.1.243/sikabis/public/api/device/keybox/foto";
const char* SERVER_TOKEN    = "APIKEY-KAMERA-BOARD-B";
const char* ID_PERANGKAT    = "kotak-kunci-cam-01";

// Board B tidak punya alasan lain untuk menghubungi server selain saat
// memotret -- kalau lama tidak ada gerakan, dashboard salah kira board
// ini mati padahal cuma menunggu. Heartbeat kosong ini yang menjaga
// status "online" tetap benar walau tidak ada pemicu sama sekali.
const char* SERVER_URL_HEARTBEAT = "http://192.168.1.243/sikabis/public/api/device/heartbeat";
const unsigned long JEDA_HEARTBEAT = 20000;

/* Siaran langsung. Dimatikan dengan mengubah baris ini ke false -
   pemotretan dan pengiriman bukti tidak terpengaruh sama sekali.

   Siaran hanya membebani papan SELAMA ada yang membuka halamannya.
   Kalau tidak ada penonton, biayanya nyaris nol. */
const bool SIARAN_LANGSUNG = true;

// Catatan untuk nanti: kalau microSD sudah dibeli, spool foto saat
// jaringan mati dipasang di sini. Pakai SD_MMC mode 1-bit
// (SD_MMC.begin("/sdcard", true)) supaya GPIO 13 tetap bebas untuk
// kabel pemicu - mode 4-bit merebut pin itu.

/* ==================================================================
   BAGIAN 2  -  PIN
   ================================================================== */

const int PIN_PEMICU = 13;      // <- GPIO 25 Board A, ground bersama

// Pin kamera AI Thinker - jangan diubah
#define PWDN_GPIO_NUM   32
#define RESET_GPIO_NUM  -1
#define XCLK_GPIO_NUM    0
#define SIOD_GPIO_NUM   26
#define SIOC_GPIO_NUM   27
#define Y9_GPIO_NUM     35
#define Y8_GPIO_NUM     34
#define Y7_GPIO_NUM     39
#define Y6_GPIO_NUM     36
#define Y5_GPIO_NUM     21
#define Y4_GPIO_NUM     19
#define Y3_GPIO_NUM     18
#define Y2_GPIO_NUM      5
#define VSYNC_GPIO_NUM  25
#define HREF_GPIO_NUM   23
#define PCLK_GPIO_NUM   22

/* ==================================================================
   BAGIAN 3  -  KEADAAN
   ================================================================== */

/* Pemicu diukur LEBARNYA di dalam interupsi. Alasannya di Bagian 4. */
volatile unsigned long naikPada    = 0;
volatile bool          pemicuSah   = false;
volatile unsigned long pemicuPalsu = 0;

bool          kameraSiap   = false;
unsigned long nomorPemicu  = 0;
unsigned long berhasilKirim = 0;
unsigned long gagalKirim    = 0;
unsigned long wifiCobaTerakhir = 0;
unsigned long heartbeatTerakhir = 0;

/* Keadaan siaran. Dibaca dan ditulis dari dua task berbeda - loop
   utama dan task server web - jadi keduanya volatile. */
httpd_handle_t serverSiaran   = NULL;
volatile bool  siaranMengalah = false;   // true selagi potret() bekerja
volatile int   penonton       = 0;
volatile unsigned long bingkaiDisiarkan = 0;

const unsigned long JEDA_COBA_WIFI = 15000;

/* Timeout diturunkan dari 8 ke 5 detik, dan percobaan dari 3 ke 2.
   Alasannya: selama pengiriman berlangsung, siaran ikut berhenti.
   Dengan angka lama, satu kegagalan beruntun membekukan siaran
   sampai 25 detik - di depan penguji itu terlihat seperti sistem
   yang hang. Sekarang paling lama 10,4 detik. Pengiriman foto yang
   berhasil selama ini hanya butuh sekitar 0,7 detik, jadi 5 detik
   masih tujuh kali lipat kelonggaran. */
const unsigned long TIMEOUT_HTTP = 5000;

/* Jendela lebar pulsa yang diakui sebagai perintah sungguhan.
   Pulsa asli dari Board A lamanya 50 ms, jadi ada kelonggaran besar
   di kedua sisi. Ayunan listrik saat Board A booting lamanya
   mikrodetik dan tidak pernah lolos batas bawah. Batas atas menangkal
   keadaan tidak wajar, misalnya kabel pemicu tersangkut tinggi terus. */
const unsigned long LEBAR_MIN_PULSA = 15;
const unsigned long LEBAR_MAX_PULSA = 500;

void garis() {
  Serial.println(F("-----------------------------------------------------"));
}

/* ==================================================================
   BAGIAN 4  -  PEMBACAAN PEMICU
   Bagian ini sudah dua kali salah, dan keduanya layak dicatat.

   Versi 1 memakai interupsi pada tepi NAIK saja. Terbukti keliru pada
   24 September 2026: saat Board A booting, pin GPIO 25-nya mengambang
   dan berayun puluhan kali dalam dua detik. Setiap ayunan tertangkap,
   dan satu di antaranya menjadi foto sampah - foto tanpa percobaan
   akses apa pun.

   Versi 2 memindai pin tiap putaran loop dan menuntut sinyal bertahan
   tinggi. Itu menyelesaikan gangguan, tapi melahirkan lubang lain
   yang baru berbahaya setelah pengiriman ke server dinyalakan:
   mengirim foto memblokir sampai beberapa detik, dan selama itu loop
   tidak memindai apa pun. Pulsa yang datang di tengah pengiriman
   hilang tanpa jejak.

   Versi sekarang mengambil yang terbaik dari keduanya. Interupsi
   dipasang pada setiap PERUBAHAN, lalu LEBAR pulsanya diukur:

     - tepi naik  -> catat waktunya
     - tepi turun -> hitung lebarnya

   Pulsa selebar 15-500 ms diakui sebagai perintah. Ayunan listrik
   selebar mikrodetik ditolak dan dihitung sebagai gangguan.

   Karena yang bekerja adalah interupsi, pulsa tetap tertangkap walau
   loop sedang sibuk mengirim foto.
   ================================================================== */

void IRAM_ATTR tanganiTepi() {
  if (digitalRead(PIN_PEMICU) == HIGH) {
    naikPada = millis();
    return;
  }

  if (naikPada == 0) return;                  // tepi turun tanpa tepi naik
  unsigned long lebar = millis() - naikPada;
  naikPada = 0;

  if (lebar >= LEBAR_MIN_PULSA && lebar <= LEBAR_MAX_PULSA) pemicuSah = true;
  else                                                      pemicuPalsu++;
}

/* ==================================================================
   BAGIAN 5  -  KAMERA
   ================================================================== */

bool mulaiKamera() {
  camera_config_t cfg;
  memset(&cfg, 0, sizeof(cfg));

  cfg.ledc_channel = LEDC_CHANNEL_0;
  cfg.ledc_timer   = LEDC_TIMER_0;
  cfg.pin_d0 = Y2_GPIO_NUM;   cfg.pin_d1 = Y3_GPIO_NUM;
  cfg.pin_d2 = Y4_GPIO_NUM;   cfg.pin_d3 = Y5_GPIO_NUM;
  cfg.pin_d4 = Y6_GPIO_NUM;   cfg.pin_d5 = Y7_GPIO_NUM;
  cfg.pin_d6 = Y8_GPIO_NUM;   cfg.pin_d7 = Y9_GPIO_NUM;
  cfg.pin_xclk = XCLK_GPIO_NUM;
  cfg.pin_pclk = PCLK_GPIO_NUM;
  cfg.pin_vsync = VSYNC_GPIO_NUM;
  cfg.pin_href  = HREF_GPIO_NUM;

  // Nama field ini berganti antara core 2.x dan 3.x
#if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
  cfg.pin_sccb_sda = SIOD_GPIO_NUM;
  cfg.pin_sccb_scl = SIOC_GPIO_NUM;
#else
  cfg.pin_sscb_sda = SIOD_GPIO_NUM;
  cfg.pin_sscb_scl = SIOC_GPIO_NUM;
#endif

  cfg.pin_pwdn  = PWDN_GPIO_NUM;
  cfg.pin_reset = RESET_GPIO_NUM;
  cfg.xclk_freq_hz = 20000000;
  cfg.pixel_format = PIXFORMAT_JPEG;

  if (psramFound()) {
    cfg.frame_size   = FRAMESIZE_SVGA;   // 800x600, lebar wajah 200-250 px
    cfg.jpeg_quality = 12;               // makin kecil makin bagus
    cfg.fb_count     = 2;                // dua penyangga: satu bisa dipakai
                                         // siaran selagi satunya disiapkan
    cfg.grab_mode    = CAMERA_GRAB_LATEST;
    cfg.fb_location  = CAMERA_FB_IN_PSRAM;
  } else {
    // PENTING: fb_location HARUS eksplisit CAMERA_FB_IN_DRAM di sini.
    // Tanpa baris ini, cfg (di-memset ke 0) diam-diam memakai nilai
    // default yang sama dengan CAMERA_FB_IN_PSRAM -- kalau board ini
    // tidak punya PSRAM (atau PSRAM tidak diaktifkan di Tools > PSRAM
    // pada Arduino IDE), driver mengira ada PSRAM padahal tidak,
    // sehingga frame buffer korup setelah beberapa kali pakai: foto
    // pertama kebetulan masih berhasil, sesudah itu esp_camera_fb_get()
    // gagal diam-diam atau board macet total.
    cfg.frame_size   = FRAMESIZE_VGA;
    cfg.jpeg_quality = 14;
    cfg.fb_count     = 1;
    cfg.grab_mode    = CAMERA_GRAB_WHEN_EMPTY;
    cfg.fb_location  = CAMERA_FB_IN_DRAM;
  }

  esp_err_t hasil = esp_camera_init(&cfg);
  if (hasil != ESP_OK) {
    Serial.print(F("  Kamera GAGAL disiapkan, kode 0x"));
    Serial.println(hasil, HEX);
    Serial.println(F("  Paling sering: kabel pita kamera kurang rapat."));
    Serial.println(F("  Buka kaitnya, masukkan ulang sampai mentok, tutup lagi."));
    return false;
  }

  /* Pemanasan sensor. OV2640 butuh beberapa bingkai sebelum
     pengaturan cahayanya mantap. Tanpa ini, foto pertama keluar
     merah muda pucat - dan foto pertama justru yang paling penting,
     karena itulah percobaan akses pertama. */
  Serial.print(F("  Memanaskan sensor "));
  for (int i = 0; i < 8; i++) {
    camera_fb_t *b = esp_camera_fb_get();
    if (b) esp_camera_fb_return(b);
    Serial.print('.');
    delay(60);
  }
  Serial.println();
  return true;
}

/* ==================================================================
   BAGIAN 6  -  PENGIRIMAN FOTO
   Dikirim sebagai multipart/form-data. Kalau rekan Anda mengubah
   format penerimaannya, hanya fungsi ini yang perlu diubah.
   ================================================================== */

/* Berapa kali dicoba total kalau gagal (1 percobaan awal + sisanya
   pengulangan). Sinyal WiFi board ini sering di bawah -75 dBm, jadi
   kegagalan kirim yang sifatnya sesaat lebih sering terjadi di sini
   dibanding di Board A yang cuma kirim teks kecil. Board A punya
   antrean; board ini tidak (frame kamera tidak disimpan), jadi
   pengulangan dilakukan langsung di sini sebelum frame dilepas. */
const int PERCOBAAN_KIRIM_FOTO = 2;
const unsigned long JEDA_ANTAR_PERCOBAAN = 400;

bool kirimFotoSekali(camera_fb_t *fb, unsigned long nomor);

bool kirimFoto(camera_fb_t *fb, unsigned long nomor) {
  if (!KIRIM_KE_SERVER) return true;

  for (int percobaan = 1; percobaan <= PERCOBAAN_KIRIM_FOTO; percobaan++) {
    if (WiFi.status() != WL_CONNECTED) return false;

    if (kirimFotoSekali(fb, nomor)) return true;

    if (percobaan < PERCOBAAN_KIRIM_FOTO) {
      Serial.print(F("  Coba lagi ("));
      Serial.print(percobaan + 1);
      Serial.print('/');
      Serial.print(PERCOBAAN_KIRIM_FOTO);
      Serial.println(F(") ..."));
      delay(JEDA_ANTAR_PERCOBAAN);
    }
  }
  return false;
}

bool kirimFotoSekali(camera_fb_t *fb, unsigned long nomor) {
  const char* BATAS = "----KotakKunciBengpuskomlekad";

  String kepala = "";
  kepala += "--"; kepala += BATAS; kepala += "\r\n";
  kepala += "Content-Disposition: form-data; name=\"perangkat\"\r\n\r\n";
  kepala += ID_PERANGKAT; kepala += "\r\n";

  kepala += "--"; kepala += BATAS; kepala += "\r\n";
  kepala += "Content-Disposition: form-data; name=\"nomor_pemicu\"\r\n\r\n";
  kepala += String(nomor); kepala += "\r\n";

  kepala += "--"; kepala += BATAS; kepala += "\r\n";
  kepala += "Content-Disposition: form-data; name=\"waktu_ms\"\r\n\r\n";
  kepala += String(millis()); kepala += "\r\n";

  kepala += "--"; kepala += BATAS; kepala += "\r\n";
  kepala += "Content-Disposition: form-data; name=\"foto\"; filename=\"tap_";
  kepala += String(nomor); kepala += ".jpg\"\r\n";
  kepala += "Content-Type: image/jpeg\r\n\r\n";

  String ekor = "\r\n--";
  ekor += BATAS; ekor += "--\r\n";

  size_t total = kepala.length() + fb->len + ekor.length();

  uint8_t *badan = (uint8_t*) (psramFound() ? ps_malloc(total) : malloc(total));
  if (!badan) {
    Serial.println(F("  Memori tidak cukup untuk menyusun kiriman."));
    return false;
  }

  memcpy(badan, kepala.c_str(), kepala.length());
  memcpy(badan + kepala.length(), fb->buf, fb->len);
  memcpy(badan + kepala.length() + fb->len, ekor.c_str(), ekor.length());

  HTTPClient http;
  http.setTimeout(TIMEOUT_HTTP);
  http.begin(SERVER_URL_FOTO);
  http.addHeader("Content-Type", String("multipart/form-data; boundary=") + BATAS);
  if (strlen(SERVER_TOKEN) > 0) {
    http.addHeader("Authorization", String("Bearer ") + SERVER_TOKEN);
  }

  int kode = http.POST(badan, total);
  http.end();
  free(badan);

  if (kode > 0 && kode < 400) {
    Serial.print(F("  Terkirim, balasan "));
    Serial.println(kode);
    return true;
  }
  Serial.print(F("  Gagal mengirim, kode "));
  Serial.println(kode);
  return false;
}

/* ==================================================================
   BAGIAN 7  -  SATU KALI MEMOTRET

   Seluruh isi fungsi ini berjalan dengan siaran DIMINTA MENGALAH.
   Kameranya cuma satu; kalau siaran dan pemotretan berebut penyangga
   bingkai, yang hilang bisa justru foto percobaan akses - dan itu
   satu-satunya hal yang tidak boleh hilang. Penonton siaran melihat
   gambarnya membeku sekitar satu detik. Itu harga yang benar.
   ================================================================== */

void potret(const char* sebab) {
  if (!kameraSiap) {
    Serial.println(F("  Ada pemicu, tapi kamera tidak siap."));
    return;
  }

  /* Minta siaran berhenti, lalu beri jeda singkat supaya bingkai yang
     sedang dikirimnya sempat dilepas sebelum kita meminta yang baru. */
  siaranMengalah = true;
  if (penonton > 0) delay(120);

  nomorPemicu++;
  unsigned long t0 = millis();

  // Dua bingkai dibuang supaya yang tersimpan adalah bingkai terbaru,
  // bukan yang mengendap di penyangga sejak sebelum jari menyentuh.
  for (int i = 0; i < 2; i++) {
    camera_fb_t *b = esp_camera_fb_get();
    if (b) esp_camera_fb_return(b);
  }

  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println(F("  GAGAL mengambil gambar."));
    siaranMengalah = false;          // jangan tinggalkan siaran membeku
    return;
  }

  Serial.println();
  Serial.print(F("  FOTO #"));
  Serial.print(nomorPemicu);
  Serial.print(F("  ("));
  Serial.print(sebab);
  Serial.print(F(")  "));
  Serial.print(fb->width);  Serial.print('x'); Serial.print(fb->height);
  Serial.print(F("  "));
  Serial.print(fb->len);    Serial.print(F(" byte  "));
  Serial.print(millis() - t0); Serial.println(F(" ms"));

  bool ok = kirimFoto(fb, nomorPemicu);
  if (KIRIM_KE_SERVER) { if (ok) berhasilKirim++; else gagalKirim++; }
  else Serial.println(F("  (pengiriman dimatikan lewat konfigurasi)"));

  esp_camera_fb_return(fb);

  siaranMengalah = false;            // siaran boleh jalan lagi

  Serial.print(F("  Free heap setelah foto ini: "));
  Serial.print(ESP.getFreeHeap());
  Serial.println(F(" byte"));
}

/* ==================================================================
   BAGIAN 8  -  SIARAN LANGSUNG

   Dilayani oleh esp_http_server, yang berjalan di task-nya sendiri.
   Artinya siaran tidak menghambat loop utama, dan sebaliknya loop
   utama tidak menghambat siaran - kecuali pada satu titik yang memang
   disengaja: selama potret() bekerja, siaran menunggu.

   Dua alamat:
     http://<ip>/         halaman sederhana berisi gambarnya
     http://<ip>/stream   aliran MJPEG mentah, untuk ditanam di
                          dashboard rekan Anda dengan <img src="...">

   Siaran hanya membaca bingkai selama ada penonton. Tanpa penonton,
   task ini tidur dan papan bekerja persis seperti sebelumnya.
   ================================================================== */

#define TIPE_SIARAN   "multipart/x-mixed-replace;boundary=bingkai"
#define BATAS_BINGKAI "\r\n--bingkai\r\n"
#define KEPALA_JPEG   "Content-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n"

static const char HALAMAN_SIARAN[] PROGMEM = R"HALAMAN(<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Kamera Kotak Kunci</title>
<style>
:root{color-scheme:dark}
body{margin:0;min-height:100vh;box-sizing:border-box;background:#0f1216;
 color:#e7e9ec;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
 display:flex;flex-direction:column;align-items:center;justify-content:center;
 gap:16px;padding:20px}
h1{margin:0;font-size:17px;font-weight:600;letter-spacing:.2px;text-align:center}
h1 span{display:block;font-size:12px;font-weight:400;color:#8d959d;margin-top:4px}
img{width:100%;max-width:800px;aspect-ratio:4/3;object-fit:cover;
 border-radius:12px;background:#000;border:1px solid #272c33;display:block}
p{margin:0;max-width:620px;font-size:12.5px;line-height:1.55;
 color:#8d959d;text-align:center}
</style></head><body>
<h1>Kamera Kotak Kunci<span>Bengpuskomlekad</span></h1>
<img src="/stream" alt="Siaran langsung kamera kotak kunci">
<p>Siaran ini untuk pemantauan saja. Bukti yang tersimpan tetap foto
otomatis yang diambil setiap kali sidik jari ditempelkan &mdash; gambar
di atas berhenti sejenak setiap kali foto itu diambil, karena pemotretan
selalu didahulukan.</p>
</body></html>)HALAMAN";

static esp_err_t tanganiHalaman(httpd_req_t *req) {
  httpd_resp_set_type(req, "text/html; charset=utf-8");
  return httpd_resp_send(req, HALAMAN_SIARAN, HTTPD_RESP_USE_STRLEN);
}

static esp_err_t tanganiSiaran(httpd_req_t *req) {
  if (httpd_resp_set_type(req, TIPE_SIARAN) != ESP_OK) return ESP_FAIL;
  httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");

  penonton++;
  Serial.print(F("  Penonton siaran bergabung. Jumlah sekarang: "));
  Serial.println(penonton);

  char kepala[72];
  esp_err_t res = ESP_OK;

  while (true) {
    /* Titik mengalah. Selama potret() bekerja, siaran tidak menyentuh
       kamera sama sekali. Batas 30 detik hanya jaring pengaman supaya
       task ini tidak pernah menunggu selamanya kalau ada yang salah. */
    unsigned long batasTunggu = millis() + 30000;
    while (siaranMengalah && millis() < batasTunggu) delay(20);

    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb) { res = ESP_FAIL; break; }

    int n = snprintf(kepala, sizeof(kepala), KEPALA_JPEG, fb->len);
    res = httpd_resp_send_chunk(req, BATAS_BINGKAI, strlen(BATAS_BINGKAI));
    if (res == ESP_OK) res = httpd_resp_send_chunk(req, kepala, n);
    if (res == ESP_OK) res = httpd_resp_send_chunk(req, (const char*)fb->buf, fb->len);

    esp_camera_fb_return(fb);

    if (res != ESP_OK) break;        // penonton menutup halamannya
    bingkaiDisiarkan++;
    delay(1);                        // beri giliran ke task lain
  }

  penonton--;
  Serial.print(F("  Penonton siaran keluar. Jumlah sekarang: "));
  Serial.println(penonton);
  return res;
}

void mulaiServerSiaran() {
  if (!SIARAN_LANGSUNG) {
    Serial.println(F("  Siaran langsung DIMATIKAN lewat konfigurasi."));
    return;
  }
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("  Siaran belum bisa dijalankan: Wi-Fi belum tersambung."));
    return;
  }

  httpd_config_t cfg = HTTPD_DEFAULT_CONFIG();
  cfg.server_port      = 80;
  cfg.ctrl_port        = 32768;
  cfg.max_uri_handlers = 4;
  cfg.stack_size       = 8192;
  cfg.lru_purge_enable = true;      // penonton lama diputus kalau penuh

  httpd_uri_t uriHalaman;
  memset(&uriHalaman, 0, sizeof(uriHalaman));
  uriHalaman.uri      = "/";
  uriHalaman.method   = HTTP_GET;
  uriHalaman.handler  = tanganiHalaman;
  uriHalaman.user_ctx = NULL;

  httpd_uri_t uriSiaran;
  memset(&uriSiaran, 0, sizeof(uriSiaran));
  uriSiaran.uri      = "/stream";
  uriSiaran.method   = HTTP_GET;
  uriSiaran.handler  = tanganiSiaran;
  uriSiaran.user_ctx = NULL;

  if (httpd_start(&serverSiaran, &cfg) == ESP_OK) {
    httpd_register_uri_handler(serverSiaran, &uriHalaman);
    httpd_register_uri_handler(serverSiaran, &uriSiaran);
    garis();
    Serial.print(F("  SIARAN LANGSUNG SIAP  ->  http://"));
    Serial.println(WiFi.localIP());
    Serial.print(F("  Untuk ditanam di dashboard :  http://"));
    Serial.print(WiFi.localIP());
    Serial.println(F("/stream"));
    Serial.println(F("  Penonton harus berada di jaringan Wi-Fi yang sama."));
    garis();
  } else {
    Serial.println(F("  Server siaran GAGAL dijalankan. Pemotretan tetap jalan."));
  }
}

/* ==================================================================
   BAGIAN 9  -  WI-FI
   ================================================================== */

void sambungWiFi(unsigned long batasMs) {
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);          // tanpa ini, kiriman pertama sering tersendat
  WiFi.begin(WIFI_SSID, WIFI_SANDI);
  Serial.print(F("  Menyambung Wi-Fi "));
  unsigned long batas = millis() + batasMs;
  while (WiFi.status() != WL_CONNECTED && millis() < batas) {
    delay(300); Serial.print('.');
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print(F("  Tersambung, alamat IP "));
    Serial.println(WiFi.localIP());
    Serial.print(F("  Kekuatan sinyal "));
    Serial.print(WiFi.RSSI());
    Serial.println(F(" dBm"));
    if (WiFi.RSSI() < -75) {
      Serial.println(F("  PERINGATAN: di bawah -75 dBm kiriman foto akan sering gagal,"));
      Serial.println(F("  dan siaran langsung akan tersendat-sendat."));
    }
  } else {
    Serial.println(F("  Belum tersambung. Kamera tetap memotret,"));
    Serial.println(F("  hanya pengirimannya yang tertunda."));
  }
}

void kirimHeartbeat() {
  if (!KIRIM_KE_SERVER) return;
  if (WiFi.status() != WL_CONNECTED) return;
  if (millis() - heartbeatTerakhir < JEDA_HEARTBEAT) return;
  heartbeatTerakhir = millis();

  HTTPClient http;
  http.setTimeout(TIMEOUT_HTTP);
  http.begin(SERVER_URL_HEARTBEAT);
  http.addHeader("Content-Type", "application/json");
  if (strlen(SERVER_TOKEN) > 0) {
    http.addHeader("Authorization", String("Bearer ") + SERVER_TOKEN);
  }
  String payload = String("{\"perangkat\":\"") + ID_PERANGKAT + "\"";
  if (SIARAN_LANGSUNG) {
    payload += ",\"stream_url\":\"http://" + WiFi.localIP().toString() + "/stream\"";
  }
  payload += "}";
  http.POST(payload);
  http.end();
}

void layaniWiFi() {
  if (!KIRIM_KE_SERVER && !SIARAN_LANGSUNG) return;
  if (WiFi.status() == WL_CONNECTED) return;
  if (millis() - wifiCobaTerakhir < JEDA_COBA_WIFI) return;
  wifiCobaTerakhir = millis();
  Serial.println(F("  Menyambung ulang Wi-Fi ..."));
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_SANDI);
}

/* ==================================================================
   BAGIAN 10  -  PERINTAH SERIAL
   ================================================================== */

void cetakBantuan() {
  garis();
  Serial.println(F("  PERINTAH"));
  Serial.println(F("   F  potret sekarang (meniru pemicu dari Board A)"));
  Serial.println(F("   S  status"));
  Serial.println(F("   W  sambung ulang Wi-Fi"));
  Serial.println(F("   A  tampilkan alamat siaran langsung"));
  Serial.println(F("   ?  tampilkan daftar ini"));
  garis();
}

void cetakAlamatSiaran() {
  garis();
  if (!SIARAN_LANGSUNG) {
    Serial.println(F("  Siaran dimatikan lewat konfigurasi."));
  } else if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("  Wi-Fi belum tersambung, alamat belum ada."));
  } else {
    Serial.print(F("  Halaman : http://")); Serial.println(WiFi.localIP());
    Serial.print(F("  Gambar  : http://")); Serial.print(WiFi.localIP());
    Serial.println(F("/stream"));
  }
  garis();
}

void cetakStatus() {
  garis();
  Serial.println(F("  STATUS BOARD B"));
  Serial.print(F("   Kamera           : "));
  Serial.println(kameraSiap ? F("siap") : F("TIDAK SIAP"));
  Serial.print(F("   PSRAM            : "));
  Serial.println(psramFound() ? F("ada") : F("tidak ada"));
  Serial.print(F("   Pemicu diterima  : "));
  Serial.println(nomorPemicu);
  Serial.print(F("   Gangguan ditolak : "));
  Serial.print(pemicuPalsu);
  Serial.println(F("  (ayunan singkat yang tidak jadi foto)"));
  Serial.print(F("   Foto terkirim    : "));
  Serial.println(berhasilKirim);
  Serial.print(F("   Gagal terkirim   : "));
  Serial.println(gagalKirim);
  Serial.print(F("   Penonton siaran  : "));
  Serial.println(penonton);
  Serial.print(F("   Bingkai disiarkan: "));
  Serial.println(bingkaiDisiarkan);
  Serial.print(F("   Free heap        : "));
  Serial.print(ESP.getFreeHeap());
  Serial.println(F(" byte"));
  Serial.print(F("   Wi-Fi            : "));
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print(WiFi.localIP());
    Serial.print(F("  ("));
    Serial.print(WiFi.RSSI());
    Serial.println(F(" dBm)"));
  } else {
    Serial.println(F("belum tersambung"));
  }
  Serial.print(F("   Keadaan pin "));
  Serial.print(PIN_PEMICU);
  Serial.print(F("   : "));
  Serial.println(digitalRead(PIN_PEMICU) ? F("TINGGI") : F("rendah (normal)"));
  garis();
}

void layaniPerintah() {
  if (!Serial.available()) return;
  char c = Serial.read();
  while (Serial.available() && (Serial.peek() == '\n' || Serial.peek() == '\r')) Serial.read();
  switch (c) {
    case 'F': case 'f': potret("perintah serial"); break;
    case 'S': case 's': cetakStatus();             break;
    case 'W': case 'w': sambungWiFi(12000);        break;
    case 'A': case 'a': cetakAlamatSiaran();       break;
    case '?':           cetakBantuan();            break;
    default: break;
  }
}

/* ==================================================================
   BAGIAN 11  -  SETUP
   ================================================================== */

void setup() {
  /* ESP32-CAM terkenal reboot sendiri kena brownout detector saat
     kamera+WiFi menarik arus sesaat lebih besar dari yang bisa
     ditangani regulator on-board -- persis saat sedang sibuk motret
     berturut-turut. Baris ini mematikan deteksi itu; kestabilan daya
     yang sesungguhnya tetap harus dijaga lewat catu 5V terpisah yang
     kuat, bukan cuma lewat baris ini.

     Dengan siaran langsung menyala, arusnya lebih besar lagi karena
     kamera bekerja terus-menerus selama ada penonton. Pastikan papan
     ini diberi daya dari step-down LM2596, bukan dari USB laptop. */
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);

  Serial.begin(115200);
  delay(300);

  Serial.println();
  garis();
  Serial.println(F("  FIRMWARE KAMERA - BOARD B"));
  Serial.println(F("  Pengamanan Kotak Kunci - Bengpuskomlekad"));
  garis();
  Serial.print(F("  PSRAM terdeteksi : "));
  Serial.println(psramFound() ? F("YA") : F("TIDAK"));
  Serial.print(F("  Free heap awal   : "));
  Serial.print(ESP.getFreeHeap());
  Serial.println(F(" byte"));
  garis();

  /* Pull-down internal menahan jalur pemicu tetap rendah saat Board A
     belum menyala. Kekuatannya terbatas (sekitar 45 kilo-ohm), jadi
     sangat disarankan menambah resistor 10k dari pin ini ke GND. */
  pinMode(PIN_PEMICU, INPUT_PULLDOWN);
  attachInterrupt(digitalPinToInterrupt(PIN_PEMICU), tanganiTepi, CHANGE);
  Serial.print(F("  Pin pemicu    : GPIO "));
  Serial.print(PIN_PEMICU);
  Serial.print(F("  (pulsa sah "));
  Serial.print(LEBAR_MIN_PULSA);
  Serial.print(F("-"));
  Serial.print(LEBAR_MAX_PULSA);
  Serial.println(F(" ms)"));

  kameraSiap = mulaiKamera();
  if (kameraSiap) {
    Serial.println(F("  Kamera siap."));
  }

  if (KIRIM_KE_SERVER || SIARAN_LANGSUNG) sambungWiFi(12000);
  else {
    Serial.println(F("  Pengiriman ke server DIMATIKAN lewat konfigurasi."));
    Serial.println(F("  Foto tetap diambil, ukurannya dilaporkan di sini."));
  }

  if (kameraSiap) mulaiServerSiaran();

  garis();
  Serial.println(F("  Menunggu pemicu dari Board A."));
  cetakBantuan();
}

/* ==================================================================
   BAGIAN 12  -  LOOP
   Siaran TIDAK dilayani di sini - ia punya task sendiri di dalam
   esp_http_server. Loop ini tetap sependek sebelumnya.
   ================================================================== */

void loop() {
  if (pemicuSah) {
    pemicuSah = false;
    potret("pemicu Board A");
  }
  layaniPerintah();
  layaniWiFi();
  kirimHeartbeat();
  delay(5);
}
