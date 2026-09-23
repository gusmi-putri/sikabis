/*
 * ESP32-CAM : Live Streaming + Bot Telegram + Sensor PIR + SI-JAGA API
 * Board   : AI Thinker ESP32-CAM
 * PIR OUT : GPIO13
 *
 * Tiga fungsi sekaligus:
 *   1. Live stream lewat browser  -> buka http://<IP-ESP32>
 *   2. Bot Telegram               -> notifikasi + foto saat ada gerakan
 *   3. Backend Laravel SI-JAGA    -> dashboard web (motion log, status
 *                                    perangkat). Status aktif/mati sensor
 *                                    tersinkron dua arah dengan tombol
 *                                    "Set ON / Set OFF" di web.
 *
 * Perintah bot:
 *   /start   - daftar perintah
 *   /photo   - ambil foto sekarang
 *   /ip      - tampilkan alamat live stream
 *   /flash   - nyalakan / matikan LED flash
 *   /piron   - aktifkan sensor PIR (tersinkron ke dashboard sebagai ARMED)
 *   /piroff  - matikan sensor PIR (tersinkron ke dashboard sebagai ACTIVITY)
 *   /status  - tampilkan status koneksi ke server SI-JAGA
 *
 * LIBRARY YANG HARUS DIINSTALL:
 *   1. "UniversalTelegramBot" by Brian Lough
 *   2. "ArduinoJson" by Benoit Blanchon (versi 6.x)
 *
 * Setting Arduino IDE:
 *   Papan            : AI Thinker ESP32-CAM
 *   Partition Scheme : Huge APP (3MB No OTA/1MB SPIFFS)
 *
 * CATATAN DAYA: streaming + Telegram + API menarik arus besar.
 * Gunakan sumber 5V terpisah yang kuat, jangan hanya dari FTDI.
 *
 * Ingat: jumper IO0 -> GND saat upload, dicabut saat dijalankan.
 *
 * ===========================================================
 * KENAPA FILE INI BERBEDA DARI VERSI AWAL:
 * Versi awal HANYA mengirim foto ke Telegram dan menyimpan stream
 * lokal — tidak pernah memberi tahu backend Laravel, sehingga:
 *   - Motion event tidak pernah muncul di dashboard web (tabel
 *     motion_events tetap kosong/basi).
 *   - Status perangkat (online/offline, last_seen) di dashboard
 *     tidak pernah ter-update, jadi terlihat seolah mati selamanya.
 *   - Tombol "Set ON / Set OFF" di web (PIRControlPanel)
 *     tidak berefek apa pun ke perangkat fisik.
 * Versi ini menambahkan tiga panggilan HTTP ke Laravel API
 * (heartbeat, command polling, upload motion-event) supaya
 * perangkat fisik dan dashboard web benar-benar tersinkron.
 * ===========================================================
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <UniversalTelegramBot.h>
#include <ArduinoJson.h>
#include "esp_camera.h"
#include "esp_http_server.h"
#include "esp_timer.h"
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"
#include "config.h"   // Kredensial asli -- lihat config.h.example untuk template

// ===================================================
// 1. KREDENSIAL (diambil dari config.h, JANGAN hardcode di sini)
// ===================================================
// PENTING soal API_BASE_URL: harus IP LAN komputer server (bukan
// "localhost" -- ESP32 tidak bisa mengaksesnya), dan server harus
// dijalankan dengan `php artisan serve --host=0.0.0.0`. Kalau router
// memberi IP baru (DHCP) ke komputer server, config.h perlu diupdate
// dan firmware di-upload ulang -- pertimbangkan set IP static/reservation
// untuk komputer server di pengaturan router untuk pemakaian jangka panjang.
const char* ssid     = WIFI_SSID;
const char* password = WIFI_PASSWORD;

String BOT_TOKEN = BOT_TOKEN_VAL;
String CHAT_ID   = CHAT_ID_VAL;

const char* API_BASE_URL   = API_BASE_URL_VAL;
const char* DEVICE_ID      = DEVICE_ID_VAL;
const char* DEVICE_API_KEY = DEVICE_API_KEY_VAL;

// ===================================================
// 2. PENGATURAN
// ===================================================
#define PIR_PIN        13
#define FLASH_LED_PIN   4

const unsigned long WAKTU_KALIBRASI   = 30000;  // pemanasan PIR (ms)
const unsigned long JEDA_ANTAR_FOTO   = 15000;  // jeda minimal antar notifikasi (ms)
const unsigned long JEDA_CEK_PESAN    = 3000;   // frekuensi cek pesan Telegram (ms)
const unsigned long JEDA_HEARTBEAT    = 30000;  // frekuensi lapor "online" ke server (ms)
const unsigned long JEDA_POLL_PERINTAH = 10000; // frekuensi sinkron mode PIR dari dashboard (ms)
const unsigned long JEDA_CEK_WIFI      = 10000; // frekuensi cek koneksi WiFi (ms)

unsigned long waktuCekWifiTerakhir = 0;

bool flashMenyala = false;

// pirAktif = saklar on/off sederhana, PERSIS seperti versi awal yang sudah
// terbukti jalan: true = gerakan memicu foto + notifikasi Telegram + catat
// ke dashboard; false = tidak terjadi apa-apa sama sekali (tidak ke
// Telegram, tidak ke server) -- sensor dianggap nonaktif.
//
// Untuk dashboard web, status ini dikirim sebagai "ON" (aktif) atau
// "OFF" (nonaktif) lewat modePirUntukServer() di bawah -- backend
// & web tidak perlu tahu soal pirAktif, cukup dua status itu saja.
// Disinkronkan DUA ARAH:
//   - Diubah dari web dashboard (Admin PAM)  -> ke sini lewat /device/command
//   - Diubah dari Telegram (/piron /piroff)  -> ke server lewat /device/heartbeat
bool pirAktif = true;

String modePirUntukServer() {
  return pirAktif ? "ON" : "OFF";
}

volatile bool adaGerakan = false;   // diisi oleh interrupt, jangan diubah manual
unsigned long waktuFotoTerakhir     = 0;
unsigned long waktuCekPesanTerakhir = 0;
unsigned long waktuHeartbeatTerakhir = 0;
unsigned long waktuPollTerakhir      = 0;
bool serverTerhubung = false;

// ===================================================
// 3. PIN KAMERA (AI Thinker ESP32-CAM)
// ===================================================
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

WiFiClientSecure clientTCP;
UniversalTelegramBot bot(BOT_TOKEN, clientTCP);

// Deklarasi awal (IRAM_ATTR membuat Arduino tidak bisa membuat prototipe otomatis)
void IRAM_ATTR isrGerakan();
void kirimFotoTelegram(uint8_t* data, size_t len, String keterangan);
bool kirimMotionEventKeServer(uint8_t* data, size_t len);
void kirimHeartbeat(bool sertakanMode, bool sertakanFlash);
void sinkronPerintahDariServer();

// ===================================================
// KONSTANTA STREAMING MJPEG
// ===================================================
#define PART_BOUNDARY "123456789000000000000987654321"
static const char* _STREAM_CONTENT_TYPE = "multipart/x-mixed-replace;boundary=" PART_BOUNDARY;
static const char* _STREAM_BOUNDARY     = "\r\n--" PART_BOUNDARY "\r\n";
static const char* _STREAM_PART         = "Content-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n";

httpd_handle_t server_stream = NULL;

// Halaman HTML sederhana
static const char PROGMEM HALAMAN_HTML[] = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ESP32-CAM Monitor</title>
  <style>
    body { font-family: sans-serif; text-align: center; background: #111; color: #eee; margin: 0; padding: 16px; }
    h2 { font-weight: 600; margin-bottom: 4px; }
    p { color: #999; font-size: 14px; margin-top: 0; }
    img { width: 100%; max-width: 640px; border-radius: 8px; border: 1px solid #333; }
  </style>
</head>
<body>
  <h2>ESP32-CAM Monitor</h2>
  <p>Live stream ruangan</p>
  <img src="/stream">
</body>
</html>
)rawliteral";

// ===================================================
// HANDLER HALAMAN UTAMA
// ===================================================
static esp_err_t index_handler(httpd_req_t *req) {
  httpd_resp_set_type(req, "text/html");
  return httpd_resp_send(req, (const char *)HALAMAN_HTML, strlen(HALAMAN_HTML));
}

// ===================================================
// HANDLER STREAMING MJPEG
// ===================================================
static esp_err_t stream_handler(httpd_req_t *req) {
  camera_fb_t* fb = NULL;
  esp_err_t res = ESP_OK;
  char part_buf[64];

  res = httpd_resp_set_type(req, _STREAM_CONTENT_TYPE);
  if (res != ESP_OK) return res;

  while (true) {
    fb = esp_camera_fb_get();
    if (!fb) {
      res = ESP_FAIL;
      break;
    }

    size_t hlen = snprintf(part_buf, 64, _STREAM_PART, fb->len);

    res = httpd_resp_send_chunk(req, _STREAM_BOUNDARY, strlen(_STREAM_BOUNDARY));
    if (res == ESP_OK) res = httpd_resp_send_chunk(req, part_buf, hlen);
    if (res == ESP_OK) res = httpd_resp_send_chunk(req, (const char *)fb->buf, fb->len);

    esp_camera_fb_return(fb);
    fb = NULL;

    if (res != ESP_OK) break;   // browser menutup koneksi
  }

  return res;
}

// ===================================================
// JALANKAN WEB SERVER
// ===================================================
void mulaiWebServer() {
  httpd_config_t config = HTTPD_DEFAULT_CONFIG();
  config.server_port = 80;
  config.ctrl_port   = 32768;

  httpd_uri_t uri_index = {
    .uri      = "/",
    .method   = HTTP_GET,
    .handler  = index_handler,
    .user_ctx = NULL
  };

  httpd_uri_t uri_stream = {
    .uri      = "/stream",
    .method   = HTTP_GET,
    .handler  = stream_handler,
    .user_ctx = NULL
  };

  if (httpd_start(&server_stream, &config) == ESP_OK) {
    httpd_register_uri_handler(server_stream, &uri_index);
    httpd_register_uri_handler(server_stream, &uri_stream);
    Serial.println("Web server aktif.");
  } else {
    Serial.println("Web server gagal dijalankan.");
  }
}

// ===================================================
// SETUP
// ===================================================
void setup() {
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);

  Serial.begin(115200);
  Serial.println();
  Serial.println("=== ESP32-CAM: Stream + Telegram + PIR + SI-JAGA API ===");

  pinMode(PIR_PIN, INPUT);
  pinMode(FLASH_LED_PIN, OUTPUT);
  digitalWrite(FLASH_LED_PIN, LOW);

  if (!mulaiKamera()) {
    Serial.println("Kamera gagal diinisialisasi. Program berhenti.");
    while (true) { delay(1000); }
  }

  sambungkanWiFi();
  clientTCP.setInsecure();

  mulaiWebServer();

  Serial.print("Live stream: http://");
  Serial.println(WiFi.localIP());

  Serial.println("Kalibrasi PIR, tunggu 30 detik...");
  delay(WAKTU_KALIBRASI);

  // Pasang interrupt SETELAH kalibrasi, supaya sensor yang belum stabil
  // tidak langsung memicu notifikasi palsu.
  adaGerakan = false;
  attachInterrupt(digitalPinToInterrupt(PIR_PIN), isrGerakan, RISING);
  Serial.println("Interrupt PIR aktif.");

  // Ambil mode PIR awal dari server (kalau Admin sudah pernah mengaturnya
  // dari dashboard sebelum device ini menyala ulang).
  sinkronPerintahDariServer();
  kirimHeartbeat(false, false);

  String pesanAwal = "Sistem aktif.\nLive stream: http://" + WiFi.localIP().toString();
  pesanAwal += "\nStatus server SI-JAGA: " + String(serverTerhubung ? "terhubung" : "TIDAK terhubung");
  pesanAwal += "\n\nKetik /start untuk daftar perintah.";
  bot.sendMessage(CHAT_ID, pesanAwal, "");

  Serial.println("Sistem siap.");
}

// ===================================================
// INTERRUPT PIR
// Dipanggil otomatis oleh hardware saat PIR berubah LOW->HIGH,
// bahkan ketika program sedang sibuk mengirim data ke Telegram.
// ===================================================
void IRAM_ATTR isrGerakan() {
  adaGerakan = true;
}

// ===================================================
// LOOP
// ===================================================
void loop() {
  // --- Gerakan tertangkap oleh interrupt ---
  if (adaGerakan) {
    adaGerakan = false;

    bool jedaSelesai = (waktuFotoTerakhir == 0 || millis() - waktuFotoTerakhir > JEDA_ANTAR_FOTO);

    // Logika asli, tidak diubah: kalau pirAktif == false, tidak terjadi
    // apa pun -- tidak ke Telegram, tidak ke server. Sensor dianggap mati.
    if (pirAktif && jedaSelesai) {
      Serial.println(">> Gerakan terdeteksi");
      waktuFotoTerakhir = millis();

      // Satu frame pemanasan, lalu satu frame nyata yang dipakai untuk
      // Telegram DAN dashboard web -- disalin ke buffer heap dulu supaya
      // frame buffer kamera bisa langsung dikembalikan (tidak menahan DMA
      // kamera selama dua koneksi HTTPS berjalan bergantian).
      camera_fb_t* buang = esp_camera_fb_get();
      if (buang) esp_camera_fb_return(buang);

      camera_fb_t* fb = esp_camera_fb_get();
      if (fb) {
        uint8_t* salinan = (uint8_t*) malloc(fb->len);
        size_t panjang = fb->len;
        if (salinan) memcpy(salinan, fb->buf, fb->len);
        esp_camera_fb_return(fb);

        if (salinan) {
          // Langsung potret, keterangan disatukan dengan foto supaya
          // hanya perlu satu koneksi HTTPS ke Telegram.
          kirimFotoTelegram(salinan, panjang, "Gerakan terdeteksi oleh sensor PIR!");

          // Tambahan baru: catat juga ke dashboard SI-JAGA. Kalau server
          // sedang tidak bisa dihubungi, ini gagal diam-diam (di-log ke
          // Serial) tanpa mengganggu jalur Telegram yang sudah terbukti.
          bool ok = kirimMotionEventKeServer(salinan, panjang);
          Serial.println(ok ? ">> Motion event tersimpan di dashboard." : ">> Gagal kirim motion event ke server.");

          free(salinan);
        }
      } else {
        Serial.println("Gagal mengambil gambar.");
      }
    }
  }

  // --- Cek pesan masuk dari Telegram ---
  if (millis() - waktuCekPesanTerakhir > JEDA_CEK_PESAN) {
    int jumlahPesan = bot.getUpdates(bot.last_message_received + 1);
    while (jumlahPesan) {
      prosesPesan(jumlahPesan);
      jumlahPesan = bot.getUpdates(bot.last_message_received + 1);
    }
    waktuCekPesanTerakhir = millis();
  }

  // --- Lapor "online" berkala ke dashboard web ---
  if (millis() - waktuHeartbeatTerakhir > JEDA_HEARTBEAT) {
    kirimHeartbeat(false, false);
    waktuHeartbeatTerakhir = millis();
  }

  // --- Sinkron mode PIR dari dashboard web (kalau Admin mengubahnya) ---
  if (millis() - waktuPollTerakhir > JEDA_POLL_PERINTAH) {
    sinkronPerintahDariServer();
    waktuPollTerakhir = millis();
  }

  // --- Sambung ulang WiFi kalau putus ---
  // Tanpa ini, sekali WiFi drop (hal yang wajar untuk perangkat yang
  // menyala 24/7), heartbeat/motion-event/Telegram akan diam-diam gagal
  // selamanya sampai device di-restart manual.
  if (millis() - waktuCekWifiTerakhir > JEDA_CEK_WIFI) {
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println(">> WiFi terputus, mencoba menyambung ulang...");
      sambungkanWiFi();
    }
    waktuCekWifiTerakhir = millis();
  }

  delay(20);
}

// ===================================================
// PROSES PESAN MASUK
// ===================================================
void prosesPesan(int jumlahPesan) {
  for (int i = 0; i < jumlahPesan; i++) {
    String idPengirim = String(bot.messages[i].chat_id);

    if (idPengirim != CHAT_ID) {
      bot.sendMessage(idPengirim, "Maaf, Anda tidak memiliki akses.", "");
      continue;
    }

    String teks = bot.messages[i].text;
    Serial.println("Perintah masuk: " + teks);

    if (teks == "/start") {
      String pesan = "Bot monitoring ruangan ESP32-CAM.\n\n";
      pesan += "/photo  : Ambil foto\n";
      pesan += "/ip     : Alamat live stream\n";
      pesan += "/flash  : Nyalakan / matikan flash LED\n";
      pesan += "/piron  : Aktifkan sensor PIR\n";
      pesan += "/piroff : Matikan sensor PIR\n";
      pesan += "/status : Status koneksi ke dashboard SI-JAGA\n\n";
      pesan += "Status PIR dan flash ini juga tersinkron dua arah ke dashboard web.";
      bot.sendMessage(CHAT_ID, pesan, "");
    }

    else if (teks == "/photo") {
      camera_fb_t* buang = esp_camera_fb_get();
      if (buang) esp_camera_fb_return(buang);
      camera_fb_t* fb = esp_camera_fb_get();
      if (fb) {
        uint8_t* salinan = (uint8_t*) malloc(fb->len);
        size_t panjang = fb->len;
        if (salinan) memcpy(salinan, fb->buf, fb->len);
        esp_camera_fb_return(fb);
        if (salinan) {
          kirimFotoTelegram(salinan, panjang, "Foto diambil atas permintaan.");
          free(salinan);
        }
      }
    }

    else if (teks == "/ip") {
      bot.sendMessage(CHAT_ID, "Live stream: http://" + WiFi.localIP().toString(), "");
    }

    else if (teks == "/flash") {
      flashMenyala = !flashMenyala;
      digitalWrite(FLASH_LED_PIN, flashMenyala ? HIGH : LOW);
      kirimHeartbeat(false, true); // dorong status flash terbaru ke dashboard
      bot.sendMessage(CHAT_ID, flashMenyala ? "Flash LED dinyalakan." : "Flash LED dimatikan.", "");
    }

    else if (teks == "/piron") {
      pirAktif = true;
      waktuFotoTerakhir = millis();
      kirimHeartbeat(true, false); // dorong perubahan ke server supaya dashboard ikut update
      bot.sendMessage(CHAT_ID, "Sensor PIR diaktifkan (tersinkron ke dashboard).", "");
    }

    else if (teks == "/piroff") {
      pirAktif = false;
      kirimHeartbeat(true, false);
      bot.sendMessage(CHAT_ID, "Sensor PIR dimatikan (tersinkron ke dashboard).", "");
    }

    else if (teks == "/status") {
      String pesan = "Sensor PIR: " + String(pirAktif ? "AKTIF" : "MATI") + "\n";
      pesan += "Flash LED: " + String(flashMenyala ? "NYALA" : "MATI") + "\n";
      pesan += "Server SI-JAGA: " + String(serverTerhubung ? "terhubung" : "TIDAK terhubung");
      bot.sendMessage(CHAT_ID, pesan, "");
    }

    else {
      bot.sendMessage(CHAT_ID, "Perintah tidak dikenal. Ketik /start untuk daftar perintah.", "");
    }
  }
}

// ===================================================
// KIRIM FOTO KE TELEGRAM (dari buffer yang sudah disalin)
// ===================================================
void kirimFotoTelegram(uint8_t* data, size_t len, String keterangan) {
  unsigned long mulai = millis();

  WiFiClientSecure klienFoto;
  klienFoto.setInsecure();

  if (!klienFoto.connect("api.telegram.org", 443)) {
    Serial.println("Gagal terhubung ke server Telegram.");
    return;
  }

  String batas = "ESP32CAMBOUNDARY";

  String kepala = "--" + batas + "\r\n";
  kepala += "Content-Disposition: form-data; name=\"chat_id\"\r\n\r\n";
  kepala += CHAT_ID + "\r\n";

  if (keterangan.length() > 0) {
    kepala += "--" + batas + "\r\n";
    kepala += "Content-Disposition: form-data; name=\"caption\"\r\n\r\n";
    kepala += keterangan + "\r\n";
  }

  kepala += "--" + batas + "\r\n";
  kepala += "Content-Disposition: form-data; name=\"photo\"; filename=\"foto.jpg\"\r\n";
  kepala += "Content-Type: image/jpeg\r\n\r\n";

  String ekor = "\r\n--" + batas + "--\r\n";

  uint32_t totalPanjang = kepala.length() + len + ekor.length();

  klienFoto.println("POST /bot" + BOT_TOKEN + "/sendPhoto HTTP/1.1");
  klienFoto.println("Host: api.telegram.org");
  klienFoto.println("Content-Length: " + String(totalPanjang));
  klienFoto.println("Content-Type: multipart/form-data; boundary=" + batas);
  klienFoto.println("Connection: close");
  klienFoto.println();

  klienFoto.print(kepala);

  uint8_t* ptr = data;
  size_t sisa = len;
  while (sisa > 0) {
    size_t potongan = (sisa > 1024) ? 1024 : sisa;
    klienFoto.write(ptr, potongan);
    ptr += potongan;
    sisa -= potongan;
  }

  klienFoto.print(ekor);

  String balasan = "";
  unsigned long batasWaktu = millis();
  while (klienFoto.connected() && millis() - batasWaktu < 15000) {
    while (klienFoto.available()) {
      balasan += (char)klienFoto.read();
      batasWaktu = millis();
    }
  }
  klienFoto.stop();

  if (balasan.indexOf("\"ok\":true") > 0) {
    Serial.printf("Foto Telegram terkirim (%u byte, %lu ms).\n", len, millis() - mulai);
  } else {
    Serial.println("Pengiriman Telegram gagal. Balasan server:");
    Serial.println(balasan);
  }
}

// ===================================================
// KIRIM MOTION EVENT (FOTO + MODE PIR) KE BACKEND LARAVEL
// Endpoint: POST {API_BASE_URL}/device/motion-event
// Auth    : header X-Device-Key (bukan Sanctum -- itu untuk user web)
// ===================================================
bool kirimMotionEventKeServer(uint8_t* data, size_t len) {
  if (WiFi.status() != WL_CONNECTED) return false;

  HTTPClient http;
  String batas = "SIJAGADEVICEBOUNDARY";
  String url = String(API_BASE_URL) + "/device/motion-event";

  http.begin(url);
  http.addHeader("X-Device-Key", DEVICE_API_KEY);
  http.addHeader("Content-Type", "multipart/form-data; boundary=" + batas);
  http.setTimeout(15000);

  String kepala = "--" + batas + "\r\n";
  kepala += "Content-Disposition: form-data; name=\"device_id\"\r\n\r\n";
  kepala += String(DEVICE_ID) + "\r\n";
  kepala += "--" + batas + "\r\n";
  kepala += "Content-Disposition: form-data; name=\"pir_mode\"\r\n\r\n";
  kepala += modePirUntukServer() + "\r\n";
  kepala += "--" + batas + "\r\n";
  kepala += "Content-Disposition: form-data; name=\"photo\"; filename=\"motion.jpg\"\r\n";
  kepala += "Content-Type: image/jpeg\r\n\r\n";

  String ekor = "\r\n--" + batas + "--\r\n";

  size_t totalPanjang = kepala.length() + len + ekor.length();
  uint8_t* payload = (uint8_t*) malloc(totalPanjang);
  if (!payload) {
    Serial.println("Memori tidak cukup untuk membuat payload motion-event.");
    http.end();
    return false;
  }

  size_t offset = 0;
  memcpy(payload + offset, kepala.c_str(), kepala.length()); offset += kepala.length();
  memcpy(payload + offset, data, len); offset += len;
  memcpy(payload + offset, ekor.c_str(), ekor.length()); offset += ekor.length();

  int kodeStatus = http.POST(payload, totalPanjang);
  free(payload);

  bool berhasil = (kodeStatus == 201);
  if (!berhasil) {
    Serial.printf("Upload motion-event gagal, kode HTTP: %d\n", kodeStatus);
    Serial.println(http.getString());
  }
  serverTerhubung = (kodeStatus > 0);

  http.end();
  return berhasil;
}

// ===================================================
// HEARTBEAT: lapor status online + (opsional) mode PIR/flash ke server
// Endpoint: POST {API_BASE_URL}/device/heartbeat
//
// PENTING: pir_mode dan flash_on HANYA disertakan saat device sendiri
// yang baru mengubahnya (lewat Telegram) -- BUKAN di setiap heartbeat
// berkala. Kalau dikirim terus-menerus, heartbeat periodik bisa
// menimpa balik perubahan yang baru saja diset dari dashboard web
// sebelum device sempat poll /device/command untuk menerapkannya,
// membuat tombol web terlihat "tidak berhasil" karena ke-race.
// ===================================================
void kirimHeartbeat(bool sertakanMode, bool sertakanFlash) {
  if (WiFi.status() != WL_CONNECTED) {
    serverTerhubung = false;
    return;
  }

  HTTPClient http;
  String url = String(API_BASE_URL) + "/device/heartbeat";

  http.begin(url);
  http.addHeader("X-Device-Key", DEVICE_API_KEY);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(8000);

  // stream_url disertakan di setiap heartbeat (bukan cuma sekali saat
  // boot) supaya kalau IP berubah karena DHCP, dashboard web otomatis
  // ikut update tanpa perlu ada yang mengedit manual.
  String streamUrl = "http://" + WiFi.localIP().toString() + "/stream";

  String body = "{\"device_id\":\"" + String(DEVICE_ID) + "\"";
  body += ",\"stream_url\":\"" + streamUrl + "\"";
  if (sertakanFlash) {
    body += ",\"flash_on\":" + String(flashMenyala ? "true" : "false");
  }
  if (sertakanMode) {
    body += ",\"pir_mode\":\"" + modePirUntukServer() + "\"";
  }
  body += "}";

  int kodeStatus = http.POST(body);
  serverTerhubung = (kodeStatus == 204);

  if (!serverTerhubung) {
    Serial.printf("Heartbeat gagal, kode HTTP: %d\n", kodeStatus);
  }

  http.end();
}

// ===================================================
// POLL: ambil status PIR & flash terbaru dari dashboard (kalau Admin
// mengubahnya lewat tombol Set ON/OFF atau tombol flash di web)
// Endpoint: GET {API_BASE_URL}/device/command?device_id=...
// ARMED (web) -> pirAktif = true, ACTIVITY (web) -> pirAktif = false.
// ===================================================
void sinkronPerintahDariServer() {
  if (WiFi.status() != WL_CONNECTED) {
    serverTerhubung = false;
    return;
  }

  HTTPClient http;
  String url = String(API_BASE_URL) + "/device/command?device_id=" + String(DEVICE_ID);

  http.begin(url);
  http.addHeader("X-Device-Key", DEVICE_API_KEY);
  http.setTimeout(8000);

  int kodeStatus = http.GET();
  if (kodeStatus == 200) {
    serverTerhubung = true;
    String body = http.getString();

    StaticJsonDocument<192> doc;
    DeserializationError err = deserializeJson(doc, body);
    if (!err) {
      const char* modeBaru = doc["pir_mode"];
      if (modeBaru) {
        bool aktifBaru = (String(modeBaru) == "ON");
        if (aktifBaru != pirAktif) {
          pirAktif = aktifBaru;
          Serial.println(">> Status PIR disinkronkan dari dashboard: " + String(pirAktif ? "AKTIF" : "MATI"));
        }
      }

      if (doc.containsKey("flash_on")) {
        bool flashBaru = doc["flash_on"];
        if (flashBaru != flashMenyala) {
          flashMenyala = flashBaru;
          digitalWrite(FLASH_LED_PIN, flashMenyala ? HIGH : LOW);
          Serial.println(">> Flash LED disinkronkan dari dashboard: " + String(flashMenyala ? "NYALA" : "MATI"));
        }
      }
    }
  } else {
    serverTerhubung = false;
    Serial.printf("Poll command gagal, kode HTTP: %d\n", kodeStatus);
  }

  http.end();
}

// ===================================================
// INISIALISASI KAMERA
// ===================================================
bool mulaiKamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer   = LEDC_TIMER_0;
  config.pin_d0       = Y2_GPIO_NUM;
  config.pin_d1       = Y3_GPIO_NUM;
  config.pin_d2       = Y4_GPIO_NUM;
  config.pin_d3       = Y5_GPIO_NUM;
  config.pin_d4       = Y6_GPIO_NUM;
  config.pin_d5       = Y7_GPIO_NUM;
  config.pin_d6       = Y8_GPIO_NUM;
  config.pin_d7       = Y9_GPIO_NUM;
  config.pin_xclk     = XCLK_GPIO_NUM;
  config.pin_pclk     = PCLK_GPIO_NUM;
  config.pin_vsync    = VSYNC_GPIO_NUM;
  config.pin_href     = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn     = PWDN_GPIO_NUM;
  config.pin_reset    = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;

  if (psramFound()) {
    config.frame_size   = FRAMESIZE_VGA;    // 640x480, seimbang untuk stream + foto
    config.jpeg_quality = 12;
    config.fb_count     = 2;
    config.grab_mode    = CAMERA_GRAB_LATEST;
    config.fb_location  = CAMERA_FB_IN_PSRAM;
  } else {
    config.frame_size   = FRAMESIZE_CIF;
    config.jpeg_quality = 14;
    config.fb_count     = 1;
    config.grab_mode    = CAMERA_GRAB_WHEN_EMPTY;
    config.fb_location  = CAMERA_FB_IN_DRAM;
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x\n", err);
    return false;
  }

  Serial.println("Kamera siap.");
  return true;
}

// ===================================================
// KONEKSI WIFI
// ===================================================
void sambungkanWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  WiFi.setSleep(false);

  Serial.print("Menyambung ke WiFi");
  unsigned long mulai = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - mulai < 20000) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi tersambung. IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("Gagal menyambung WiFi.");
  }
}
