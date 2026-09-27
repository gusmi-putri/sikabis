/* ==================================================================
   FIRMWARE BOARD A  -  PENGAMANAN KOTAK KUNCI
   Bengpuskomlekad  |  Richard  |  Universitas Pertahanan RI

   Board A memegang: sensor sidik jari AS608, relay + solenoid,
   buzzer, LED indikator, pemicu kamera, dan pengiriman log ke
   server web rekan.

   Board B (ESP32-CAM) berdiri sendiri: ia menunggu pulsa di satu
   kabel dari Board A, memotret, lalu mengirim fotonya sendiri ke
   server. Board A tidak pernah menyentuh data foto.

   ALUR SATU PERCOBAAN
     1. Jari menyentuh sensor
     2. DETIK ITU JUGA Board A memberi pulsa ke Board B  -> kamera
        memotret sebelum hasil pencocokan diketahui, sehingga
        percobaan yang gagal pun tetap terpotret
     3. Pencocokan dikerjakan di dalam modul AS608
     4. Cocok      -> relay LOW 5 detik, lalu terkunci lagi
        Tidak cocok -> penghitung gagal bertambah
     5. Gagal 3 kali berturut-turut -> alarm buzzer
     6. Apa pun hasilnya, satu baris log diantrikan untuk dikirim

   Disusun dengan bantuan Claude (Anthropic).
   ================================================================== */

#include <WiFi.h>
#include <HTTPClient.h>
#include <Adafruit_Fingerprint.h>
#include <Preferences.h>

/* ==================================================================
   BAGIAN 1  -  KONFIGURASI YANG PERLU ANDA ISI
   Hanya bagian ini yang berubah saat pindah jaringan atau server.
   ================================================================== */

const char* WIFI_SSID  = "Lab Modern Alkomlek";
const char* WIFI_SANDI = "prc_1077";

// Alamat endpoint milik rekan Anda. Selama masih false, firmware
// berjalan penuh tetapi log hanya dicetak ke Serial Monitor -
// berguna untuk menguji semuanya sebelum servernya siap.
const bool  KIRIM_KE_SERVER = true;
const char* SERVER_URL      = "http://192.168.1.243/sikabis/public/api/device/keybox/log";
const char* SERVER_TOKEN    = "APIKEY-KOTAK-KUNCI-01";
const char* ID_PERANGKAT    = "kotak-kunci-01";

// Perintah dari dashboard web (mute alarm / paksa kunci). SENGAJA tidak
// ada perintah untuk membuka solenoid dari jarak jauh -- itu keputusan
// keamanan yang disengaja, bukan keterbatasan teknis. Lihat juga
// KeyBoxController::command() di backend.
const char* SERVER_URL_PERINTAH = "http://192.168.1.243/sikabis/public/api/device/keybox/command";
const unsigned long JEDA_POLL_PERINTAH = 5000;

// Dipakai enroll/delete untuk melapor tiap tahap ("Tempelkan jari",
// "Angkat jari...", dst) supaya operator bisa mengikuti dari dashboard
// web, tidak perlu buka Serial Monitor untuk tahu kapan harus menyentuh
// sensor.
const char* SERVER_URL_ENROLL_STATUS = "http://192.168.1.243/sikabis/public/api/device/keybox/enroll-status";

/* ==================================================================
   BAGIAN 2  -  PIN
   ================================================================== */

const int PIN_RELAY         = 26;   // ke IN1 modul relay, aktif LOW
const int PIN_BUZZER        = 27;   // buzzer aktif, aktif HIGH
const int PIN_PEMICU_KAMERA = 25;   // satu kabel ke Board B + GND bersama
const int PIN_LED           = 33;   // LED indikator di panel depan
const int PIN_RX_SIDIKJARI  = 16;   // ESP32 RX  <- TX sensor (KELUARAN sensor)
const int PIN_TX_SIDIKJARI  = 17;   // ESP32 TX  -> RX sensor (MASUKAN sensor)
// Jangan menentukan pin dari warna kabel - urutan warna AS608 berbeda
// antar produsen. Pakai label sablon di badan modul. Menukar TX dan RX
// tidak merusak apa pun, sensor hanya tidak terdeteksi.

const bool RELAY_AKTIF_LOW = true;

/* ==================================================================
   BAGIAN 3  -  WAKTU DAN AMBANG
   ================================================================== */

const unsigned long LAMA_BUKA   = 5000;   // solenoid terbuka 5 detik
const unsigned long BATAS_AMAN  = 8000;   // pengaman keras, di bawah
                                          // batas pabrik solenoid 10 detik

/* Ambang keyakinan 50 ditetapkan dari 60 sampel uji yang dikumpulkan
   pada rancangan ini, bukan dari angka bawaan pustaka. Pada ambang
   50 diperoleh FRR 5,0 % dan FAR 0,0 %. Menaikkannya ke 100 akan
   menolak tap sah yang mencetak 82, dan menaikkan FRR ke 15 %. */
const uint16_t AMBANG_KEYAKINAN = 50;

/* Tiga kali gagal berturut-turut memicu alarm. Dengan FRR terukur
   5 %, peluang pengguna sah memicu alarm palsu adalah 0,05^3 =
   0,0125 %, atau sekitar satu kali dalam 8000 percobaan. Itu harga
   yang wajar untuk mendeteksi percobaan paksa. */
const int BATAS_GAGAL = 3;

const unsigned long LAMA_PULSA_KAMERA = 50;     // lebar pulsa pemicu
const unsigned long JEDA_LEPAS_JARI   = 400;    // jari harus lepas selama
                                                // ini sebelum tap berikutnya
const unsigned long ALARM_AUTO_MATI   = 60000;  // 0 = alarm tidak pernah
                                                // mati sendiri
const unsigned long TIMEOUT_HTTP      = 3000;
const unsigned long JEDA_COBA_WIFI    = 15000;

/* ==================================================================
   BAGIAN 4  -  KEADAAN
   ================================================================== */

// UART1, bukan UART2. Ini konfigurasi yang terbukti jalan pada modul
// AS608 milik Richard saat pengambilan 60 sampel uji, 18 Sep 2026.
HardwareSerial SerialSidikJari(1);
Adafruit_Fingerprint sensor = Adafruit_Fingerprint(&SerialSidikJari);

bool          sensorSiap   = false;

bool          terbuka      = false;
unsigned long mulaiBuka    = 0;
bool          pengamanAktif = false;

int           gagalBeruntun = 0;
bool          alarmAktif    = false;
unsigned long alarmMulai    = 0;

bool          pulsaAktif  = false;
unsigned long pulsaMulai  = 0;

bool          jariMenempel = false;
unsigned long jariLepasSejak = 0;

int           bipSisa  = 0;
bool          bipNyala = false;
unsigned long bipUbah  = 0;
unsigned long bipLamaNyala = 0;
unsigned long bipLamaMati  = 0;

unsigned long wifiCobaTerakhir = 0;
unsigned long pollPerintahTerakhir = 0;

/* Nomor kejadian disimpan di flash ESP32, bukan sekadar di memori.

   Maksudnya: nomor ini TIDAK PERNAH kembali ke 1, walau perangkat
   dimatikan atau di-reset. Dengan begitu server bisa mendeteksi
   catatan yang hilang - menerima #47 lalu #49 berarti #48 tidak
   pernah sampai.

   Ini penting karena seluruh nilai sistem ini terletak pada
   kelengkapan catatan. Tanpa nomor yang berjalan terus, tidak ada
   yang bisa membedakan "tidak ada yang membuka kotak" dari
   "catatannya hilang".

   Sengaja TIDAK disediakan perintah untuk menolkannya. Nomor urut
   yang bisa direset dari perangkat di dinding bukan bukti apa-apa.
   Kalau benar-benar perlu dinolkan, gunakan "Erase All Flash Before
   Sketch Upload" di menu Tools - tindakan yang disengaja dan
   meninggalkan jejak. */
Preferences simpanan;
unsigned long nomorKejadian    = 0;

/* Antrean log. Percobaan tidak pernah menunggu jaringan: ia
   diantrikan dulu, dan baru dikirim saat solenoid sedang TERKUNCI.
   Alasannya penting - HTTPClient memblokir sampai beberapa detik,
   dan kalau itu terjadi saat solenoid terbuka, timer 5 detik tidak
   terlayani dan solenoid menyala lebih lama dari seharusnya. */
struct Kejadian {
  unsigned long nomor;
  unsigned long waktu;
  char          hasil[16];
  int           id;
  int           keyakinan;
  int           gagalKe;
  bool          alarm;
};

const int MUAT_ANTREAN = 8;
Kejadian antrean[MUAT_ANTREAN];
int antreanIsi = 0;

/* ==================================================================
   BAGIAN 5  -  UTILITAS KECIL
   ================================================================== */

void mulaiSensor();               // dideklarasikan lebih dulu, isinya di Bagian 12b

void garis() {
  Serial.println(F("-----------------------------------------------------"));
}

void relayNyala() { digitalWrite(PIN_RELAY, RELAY_AKTIF_LOW ? LOW  : HIGH); }
void relayMati()  { digitalWrite(PIN_RELAY, RELAY_AKTIF_LOW ? HIGH : LOW ); }

void mulaiBip(int jumlah, unsigned long nyala, unsigned long mati) {
  if (alarmAktif) return;           // alarm mengalahkan pola bip apa pun
  bipSisa      = jumlah;
  bipLamaNyala = nyala;
  bipLamaMati  = mati;
  bipNyala     = false;
  bipUbah      = 0;
}

/* ==================================================================
   BAGIAN 6  -  TIMER SOLENOID
   Inti keselamatan firmware. Tidak memakai delay() sama sekali,
   sehingga sensor, buzzer, dan jaringan tetap terlayani selama
   solenoid terbuka.
   ================================================================== */

void layaniSolenoid() {
  if (!terbuka) return;

  unsigned long lama = millis() - mulaiBuka;

  if (lama >= BATAS_AMAN) {
    relayMati();
    terbuka = false;
    pengamanAktif = true;
    Serial.println();
    Serial.println(F("  !! PENGAMAN BEKERJA - solenoid dipaksa mati pada 8 detik"));
    Serial.println(F("     Ini seharusnya tidak pernah muncul. Kalau muncul,"));
    Serial.println(F("     berarti ada yang salah di logika utama."));
    return;
  }

  if (lama >= LAMA_BUKA) {
    relayMati();
    terbuka = false;
    digitalWrite(PIN_LED, LOW);
    Serial.print(F("  Terkunci kembali setelah "));
    Serial.print(lama);
    Serial.println(F(" ms"));
  }
}

void bukaSolenoid() {
  if (terbuka) return;
  relayNyala();
  digitalWrite(PIN_LED, HIGH);
  terbuka   = true;
  mulaiBuka = millis();
  Serial.print(F("  Solenoid MEMBUKA, akan terkunci dalam "));
  Serial.print(LAMA_BUKA);
  Serial.println(F(" ms"));
}

void paksaTerkunci() {
  relayMati();
  digitalWrite(PIN_LED, LOW);
  terbuka = false;
  Serial.println(F("  Dipaksa terkunci."));
}

/* ==================================================================
   BAGIAN 7  -  BUZZER DAN ALARM
   ================================================================== */

void nyalakanAlarm() {
  if (alarmAktif) return;
  alarmAktif = true;
  alarmMulai = millis();
  bipSisa    = 0;
  digitalWrite(PIN_BUZZER, HIGH);
  Serial.println();
  Serial.print(F("  *** ALARM - gagal "));
  Serial.print(BATAS_GAGAL);
  Serial.println(F(" kali berturut-turut ***"));
  Serial.println(F("      Matikan dengan sidik jari terdaftar, atau kirim M"));
}

void matikanAlarm(const char* sebab) {
  if (!alarmAktif) return;
  alarmAktif = false;
  digitalWrite(PIN_BUZZER, LOW);
  Serial.print(F("  Alarm dimatikan ("));
  Serial.print(sebab);
  Serial.println(F(")"));
}

void layaniBuzzer() {
  if (alarmAktif) {
    digitalWrite(PIN_BUZZER, HIGH);
    if (ALARM_AUTO_MATI > 0 && millis() - alarmMulai >= ALARM_AUTO_MATI) {
      matikanAlarm("batas waktu otomatis");
    }
    return;
  }

  if (bipSisa <= 0) { digitalWrite(PIN_BUZZER, LOW); return; }

  unsigned long sekarang = millis();
  if (bipUbah == 0) {
    bipNyala = true;
    digitalWrite(PIN_BUZZER, HIGH);
    bipUbah = sekarang;
    return;
  }

  if (bipNyala && sekarang - bipUbah >= bipLamaNyala) {
    bipNyala = false;
    digitalWrite(PIN_BUZZER, LOW);
    bipUbah  = sekarang;
    bipSisa--;
  } else if (!bipNyala && sekarang - bipUbah >= bipLamaMati) {
    if (bipSisa > 0) {
      bipNyala = true;
      digitalWrite(PIN_BUZZER, HIGH);
      bipUbah  = sekarang;
    }
  }
}

/* ==================================================================
   BAGIAN 8  -  PEMICU KAMERA
   Satu kabel GPIO ditambah ground bersama. Board A menaikkan pin
   ini sesaat; Board B menunggu tepi naik lalu memotret.
   ================================================================== */

void picuKamera() {
  digitalWrite(PIN_PEMICU_KAMERA, HIGH);
  pulsaAktif = true;
  pulsaMulai = millis();
}

void layaniPulsaKamera() {
  if (!pulsaAktif) return;
  if (millis() - pulsaMulai >= LAMA_PULSA_KAMERA) {
    digitalWrite(PIN_PEMICU_KAMERA, LOW);
    pulsaAktif = false;
  }
}

/* ==================================================================
   BAGIAN 9  -  ANTREAN DAN PENGIRIMAN LOG
   ================================================================== */

void antrikan(const char* hasil, int id, int keyakinan) {
  nomorKejadian++;
  simpanan.putULong("nomor", nomorKejadian);   // disimpan SEBELUM dipakai,
                                               // supaya mati listrik di
                                               // tengah jalan menyisakan
                                               // lubang, bukan nomor ganda

  if (antreanIsi >= MUAT_ANTREAN) {
    // Antrean penuh. Buang yang paling lama supaya kejadian terbaru
    // - yang biasanya paling penting - tetap tersimpan.
    for (int i = 1; i < MUAT_ANTREAN; i++) antrean[i - 1] = antrean[i];
    antreanIsi = MUAT_ANTREAN - 1;
    Serial.println(F("  (antrean penuh, satu log terlama dibuang)"));
  }

  Kejadian &k = antrean[antreanIsi++];
  k.nomor     = nomorKejadian;
  k.waktu     = millis();
  strncpy(k.hasil, hasil, sizeof(k.hasil) - 1);
  k.hasil[sizeof(k.hasil) - 1] = '\0';
  k.id        = id;
  k.keyakinan = keyakinan;
  k.gagalKe   = gagalBeruntun;
  k.alarm     = alarmAktif;

  Serial.print(F("  LOG #"));
  Serial.print(k.nomor);
  Serial.print(F("  hasil="));
  Serial.print(k.hasil);
  Serial.print(F("  id="));
  Serial.print(k.id);
  Serial.print(F("  keyakinan="));
  Serial.print(k.keyakinan);
  Serial.print(F("  gagal_beruntun="));
  Serial.println(k.gagalKe);
}

void susunJson(const Kejadian &k, char* buf, size_t n) {
  snprintf(buf, n,
    "{\"perangkat\":\"%s\","
    "\"nomor_kejadian\":%lu,"
    "\"waktu_ms\":%lu,"
    "\"hasil\":\"%s\","
    "\"id_sidik_jari\":%d,"
    "\"keyakinan\":%d,"
    "\"gagal_beruntun\":%d,"
    "\"alarm\":%s}",
    ID_PERANGKAT, k.nomor, k.waktu, k.hasil,
    k.id, k.keyakinan, k.gagalKe, k.alarm ? "true" : "false");
}

void kirimAntrean() {
  if (antreanIsi == 0) return;
  if (terbuka) return;                       // jangan pernah memblokir
                                             // selagi solenoid menyala
  if (!KIRIM_KE_SERVER) { antreanIsi = 0; return; }
  if (WiFi.status() != WL_CONNECTED) return;

  char json[256];
  susunJson(antrean[0], json, sizeof(json));

  HTTPClient http;
  http.setTimeout(TIMEOUT_HTTP);
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  if (strlen(SERVER_TOKEN) > 0) {
    http.addHeader("Authorization", String("Bearer ") + SERVER_TOKEN);
  }

  int kode = http.POST((uint8_t*)json, strlen(json));
  http.end();

  if (kode > 0 && kode < 400) {
    Serial.print(F("  Log #"));
    Serial.print(antrean[0].nomor);
    Serial.print(F(" terkirim, balasan "));
    Serial.println(kode);
    for (int i = 1; i < antreanIsi; i++) antrean[i - 1] = antrean[i];
    antreanIsi--;
  } else {
    Serial.print(F("  Gagal mengirim log #"));
    Serial.print(antrean[0].nomor);
    Serial.print(F(", kode "));
    Serial.println(kode);
    // Log tetap di antrean dan dicoba lagi nanti.
  }
}

/* ==================================================================
   POLLING PERINTAH DARI DASHBOARD WEB
   Dipanggil berkala, TIDAK saat solenoid sedang terbuka -- alasannya
   sama seperti kirimAntrean(): HTTPClient memblokir sampai beberapa
   detik, dan itu tidak boleh terjadi selagi timer 5 detik solenoid
   sedang berjalan.
   ================================================================== */

void cekPerintahServer() {
  if (!KIRIM_KE_SERVER) return;
  if (terbuka) return;
  if (WiFi.status() != WL_CONNECTED) return;
  if (millis() - pollPerintahTerakhir < JEDA_POLL_PERINTAH) return;
  pollPerintahTerakhir = millis();

  HTTPClient http;
  http.setTimeout(TIMEOUT_HTTP);
  http.begin(String(SERVER_URL_PERINTAH) + "?perangkat=" + ID_PERANGKAT);
  if (strlen(SERVER_TOKEN) > 0) {
    http.addHeader("Authorization", String("Bearer ") + SERVER_TOKEN);
  }

  int kode = http.GET();
  if (kode != 200) {
    http.end();
    return;
  }

  String isi = http.getString();
  http.end();

  if (isi.indexOf("MUTE_ALARM") >= 0) {
    matikanAlarm("perintah web");
  } else if (isi.indexOf("FORCE_LOCK") >= 0) {
    paksaTerkunci();
    Serial.println(F("  Dikunci paksa lewat perintah web."));
  } else if (isi.indexOf("TEST_BUZZER") >= 0) {
    mulaiBip(3, 120, 120);
    Serial.println(F("  Buzzer diuji lewat perintah web: 3 bip"));
  } else if (isi.indexOf("TEST_TRIGGER") >= 0) {
    picuKamera();
    Serial.println(F("  Pulsa pemicu kamera dikirim lewat perintah web."));
  } else if (isi.indexOf("RESET_SENSOR") >= 0) {
    Serial.println(F("  Deteksi ulang sensor sidik jari lewat perintah web."));
    mulaiSensor();
  } else if (isi.indexOf("ENROLL") >= 0) {
    int posisi = isi.indexOf("\"target\":");
    int target = posisi >= 0 ? isi.substring(posisi + 9).toInt() : 0;
    if (target >= 1 && target <= 127) {
      Serial.print(F("  Perintah ENROLL dari web untuk ID "));
      Serial.println(target);
      daftarSidikJariID(target);
    } else {
      Serial.println(F("  Perintah ENROLL dari web punya target tidak sah, diabaikan."));
    }
  } else if (isi.indexOf("DELETE") >= 0) {
    int posisi = isi.indexOf("\"target\":");
    int target = posisi >= 0 ? isi.substring(posisi + 9).toInt() : 0;
    if (target >= 1 && target <= 127) {
      Serial.print(F("  Perintah DELETE dari web untuk ID "));
      Serial.println(target);
      hapusSidikJariID(target);
    } else {
      Serial.println(F("  Perintah DELETE dari web punya target tidak sah, diabaikan."));
    }
  }
}

/* Lapor satu baris status ke dashboard web supaya operator tahu kapan
   harus menyentuh sensor tanpa perlu buka Serial Monitor. Dipanggil
   dari dalam proses enroll/delete yang sedang blocking -- gagal kirim
   di sini TIDAK membatalkan proses, cuma berarti operator kembali
   mengandalkan Serial Monitor untuk baris itu saja. */
void laporEnroll(const String &pesan) {
  Serial.println("  [web] " + pesan);
  if (!KIRIM_KE_SERVER || WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.setTimeout(3000);
  http.begin(SERVER_URL_ENROLL_STATUS);
  http.addHeader("Content-Type", "application/json");
  if (strlen(SERVER_TOKEN) > 0) {
    http.addHeader("Authorization", String("Bearer ") + SERVER_TOKEN);
  }
  String body = "{\"perangkat\":\"" + String(ID_PERANGKAT) + "\",\"message\":\"" + pesan + "\"}";
  int kode = http.POST(body);
  if (kode != 204) {
    Serial.print(F("  [web] Gagal lapor ke server, kode "));
    Serial.print(kode);
    Serial.print(F(": "));
    Serial.println(http.getString());
  }
  http.end();
}

void layaniWiFi() {
  if (!KIRIM_KE_SERVER) return;
  if (WiFi.status() == WL_CONNECTED) return;
  if (millis() - wifiCobaTerakhir < JEDA_COBA_WIFI) return;
  wifiCobaTerakhir = millis();
  Serial.println(F("  Menyambung ulang Wi-Fi ..."));
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_SANDI);
}

/* ==================================================================
   BAGIAN 10  -  PEMBACAAN SIDIK JARI
   ================================================================== */

void tanganiCocok(int id, int keyakinan) {
  Serial.println();
  Serial.print(F("  COCOK  - ID "));
  Serial.print(id);
  Serial.print(F(", keyakinan "));
  Serial.println(keyakinan);

  if (alarmAktif) matikanAlarm("sidik jari terdaftar");
  gagalBeruntun = 0;
  mulaiBip(1, 120, 80);
  bukaSolenoid();
  antrikan("cocok", id, keyakinan);
}

void tanganiGagal(const char* sebab, int keyakinan) {
  gagalBeruntun++;
  Serial.println();
  Serial.print(F("  GAGAL  - "));
  Serial.print(sebab);
  Serial.print(F("  (gagal beruntun ke-"));
  Serial.print(gagalBeruntun);
  Serial.println(F(")"));

  mulaiBip(2, 80, 80);
  if (gagalBeruntun >= BATAS_GAGAL) nyalakanAlarm();
  antrikan(sebab, -1, keyakinan);
}

void bacaSidikJari() {
  if (!sensorSiap) return;

  /* Selagi solenoid terbuka, pembacaan dihentikan. Dua alasan:
     pintunya memang sedang boleh dibuka sehingga tap kedua tidak
     berarti apa-apa, dan yang lebih penting - fingerFastSearch()
     memblokir sekitar satu detik. Kalau itu terjadi di tengah
     jendela 5 detik, timer solenoid tidak terlayani dan pintu
     terbuka lebih lama dari rancangan. */
  if (terbuka) return;

  uint8_t p = sensor.getImage();

  // --- tidak ada jari: catat kapan jari terakhir lepas
  if (p == FINGERPRINT_NOFINGER) {
    if (jariMenempel) { jariMenempel = false; jariLepasSejak = millis(); }
    return;
  }

  if (p != FINGERPRINT_OK) return;           // gangguan komunikasi sesaat

  // --- ada jari, tapi jangan hitung dua kali untuk satu tempelan
  if (jariMenempel) return;
  if (millis() - jariLepasSejak < JEDA_LEPAS_JARI) return;
  jariMenempel = true;

  /* PEMICU KAMERA DIKIRIM DI SINI, sebelum pencocokan.
     Inilah yang membuat percobaan gagal pun tetap terpotret. */
  picuKamera();

  uint8_t k = sensor.image2Tz();
  if (k != FINGERPRINT_OK) {
    tanganiGagal("tidak_terbaca", 0);
    return;
  }

  uint8_t c = sensor.fingerFastSearch();
  if (c != FINGERPRINT_OK) {
    tanganiGagal("tidak_cocok", 0);
    return;
  }

  if (sensor.confidence < AMBANG_KEYAKINAN) {
    Serial.print(F("  Keyakinan "));
    Serial.print(sensor.confidence);
    Serial.print(F(" di bawah ambang "));
    Serial.println(AMBANG_KEYAKINAN);
    tanganiGagal("keyakinan_rendah", sensor.confidence);
    return;
  }

  tanganiCocok(sensor.fingerID, sensor.confidence);
}

/* ==================================================================
   BAGIAN 11  -  PENDAFTARAN SIDIK JARI (perawatan)
   Memakai delay() dan memang diniatkan memblokir, karena hanya
   dijalankan oleh petugas lewat Serial Monitor, bukan saat sistem
   sedang berjaga. Solenoid dipaksa terkunci lebih dulu.
   ================================================================== */

void daftarSidikJari() {
  garis();
  Serial.println(F("  PENDAFTARAN SIDIK JARI BARU"));
  Serial.print(F("  Terdaftar saat ini: "));
  sensor.getTemplateCount();
  Serial.println(sensor.templateCount);
  Serial.println(F("  Ketik nomor ID (1 sampai 127), lalu Enter:"));

  while (!Serial.available()) delay(10);
  int id = Serial.parseInt();
  while (Serial.available()) Serial.read();
  if (id < 1 || id > 127) { Serial.println(F("  ID tidak sah, dibatalkan.")); return; }

  daftarSidikJariID(id);
}

/* Inti pendaftaran, dipakai baik dari perintah Serial 'D' (ID diketik
   manual) maupun dari perintah ENROLL lewat dashboard web (ID sudah
   ditentukan Admin PAM saat mencatat personel baru). Kedua jalur
   TETAP mewajibkan sentuhan fisik dua kali ke sensor -- itu keterbatasan
   hardware, bukan sesuatu yang bisa dilewati dari jaringan. Yang
   dihapus dari jalur web hanyalah keharusan buka Serial Monitor untuk
   mengetik nomor ID. */
void daftarSidikJariID(int id) {
  paksaTerkunci();

  laporEnroll("Tempelkan jari untuk ID " + String(id));
  while (sensor.getImage() != FINGERPRINT_OK) delay(50);
  if (sensor.image2Tz(1) != FINGERPRINT_OK) {
    laporEnroll("Gagal - gambar pertama tidak jelas, ulangi dari awal");
    return;
  }

  laporEnroll("Angkat jari...");
  mulaiBip(1, 100, 50); // Bunyi bip pendek tanda jari pertama sudah terbaca
  while (sensor.getImage() != FINGERPRINT_NOFINGER) delay(50);

  laporEnroll("Tempelkan jari yang SAMA sekali lagi");
  while (sensor.getImage() != FINGERPRINT_OK) delay(50);
  if (sensor.image2Tz(2) != FINGERPRINT_OK) {
    laporEnroll("Gagal - gambar kedua tidak jelas, ulangi dari awal");
    return;
  }

  if (sensor.createModel() != FINGERPRINT_OK) {
    laporEnroll("Gagal - kedua sentuhan tidak cocok satu sama lain, ulangi dari awal");
    return;
  }

  if (sensor.storeModel(id) == FINGERPRINT_OK) {
    laporEnroll("Berhasil - ID " + String(id) + " tersimpan di sensor");
    mulaiBip(1, 200, 100);
  } else {
    laporEnroll("Gagal - modul sensor menolak menyimpan (mungkin penuh)");
  }
  garis();
}

/* Menghapus template sidik jari dari memori sensor AS608 */
void hapusSidikJariID(int id) {
  if (id < 1 || id > 127) return;
  if (sensor.deleteModel(id) == FINGERPRINT_OK) {
    laporEnroll("Berhasil - template ID " + String(id) + " dihapus dari sensor");
    mulaiBip(1, 100, 50);
  } else {
    laporEnroll("Gagal - template ID " + String(id) + " tidak bisa dihapus");
  }
}

/* ==================================================================
   BAGIAN 12  -  PERINTAH SERIAL UNTUK PERAWATAN
   ================================================================== */

void cetakBantuan() {
  garis();
  Serial.println(F("  PERINTAH PERAWATAN"));
  Serial.println(F("   D  daftarkan sidik jari baru"));
  Serial.println(F("   S  status sistem"));
  Serial.println(F("   M  matikan alarm"));
  Serial.println(F("   K  paksa terkunci sekarang"));
  Serial.println(F("   B  uji buzzer"));
  Serial.println(F("   T  uji pemicu kamera"));
  Serial.println(F("   R  coba deteksi ulang sensor sidik jari"));
  Serial.println(F("   ?  tampilkan daftar ini"));
  garis();
}

void cetakStatus() {
  garis();
  Serial.println(F("  STATUS"));
  Serial.print(F("   Sensor sidik jari : "));
  if (sensorSiap) {
    sensor.getTemplateCount();
    Serial.print(F("siap, "));
    Serial.print(sensor.templateCount);
    Serial.println(F(" sidik jari terdaftar"));
  } else {
    Serial.println(F("TIDAK TERDETEKSI"));
  }
  Serial.print(F("   Solenoid          : "));
  Serial.println(terbuka ? F("TERBUKA") : F("terkunci"));
  Serial.print(F("   Gagal beruntun    : "));
  Serial.println(gagalBeruntun);
  Serial.print(F("   Alarm             : "));
  Serial.println(alarmAktif ? F("BERBUNYI") : F("mati"));
  Serial.print(F("   Pengaman 8 detik  : "));
  Serial.println(pengamanAktif ? F("PERNAH BEKERJA") : F("belum pernah"));
  Serial.print(F("   Log dalam antrean : "));
  Serial.println(antreanIsi);
  Serial.print(F("   Total kejadian    : "));
  Serial.print(nomorKejadian);
  Serial.println(F("  (sejak perangkat pertama dipakai)"));
  Serial.print(F("   Wi-Fi             : "));
  if (!KIRIM_KE_SERVER)                  Serial.println(F("dimatikan lewat konfigurasi"));
  else if (WiFi.status() == WL_CONNECTED) Serial.println(WiFi.localIP());
  else                                    Serial.println(F("belum tersambung"));
  garis();
}

void layaniPerintah() {
  if (!Serial.available()) return;
  char c = Serial.read();
  while (Serial.available() && (Serial.peek() == '\n' || Serial.peek() == '\r')) Serial.read();

  switch (c) {
    case 'D': case 'd': daftarSidikJari(); break;
    case 'S': case 's': cetakStatus();     break;
    case 'M': case 'm': matikanAlarm("perintah serial"); break;
    case 'K': case 'k': paksaTerkunci();   break;
    case 'B': case 'b': mulaiBip(3, 120, 120);
                        Serial.println(F("  Buzzer diuji: 3 bip")); break;
    case 'T': case 't': picuKamera();
                        Serial.println(F("  Pulsa pemicu kamera dikirim")); break;
    case 'R': case 'r': mulaiSensor();     break;
    case '?':           cetakBantuan();    break;
    default: break;
  }
}

/* ==================================================================
   BAGIAN 12b  -  INISIALISASI SENSOR
   Dipisah jadi fungsi sendiri supaya bisa diulang lewat perintah R
   tanpa perlu mengunggah ulang sketsa.
   ================================================================== */

void mulaiSensor() {
  sensorSiap = false;
  SerialSidikJari.begin(57600, SERIAL_8N1, PIN_RX_SIDIKJARI, PIN_TX_SIDIKJARI);
  delay(100);
  sensor.begin(57600);
  delay(300);

  Serial.println(F("  Mencari sensor sidik jari ..."));
  for (int i = 1; i <= 5; i++) {
    if (sensor.verifyPassword()) { sensorSiap = true; break; }
    Serial.print(F("    percobaan "));
    Serial.print(i);
    Serial.println(F(" gagal"));
    delay(700);
  }

  if (sensorSiap) {
    sensor.getTemplateCount();
    Serial.print(F("  SENSOR SIAP - "));
    Serial.print(sensor.templateCount);
    Serial.println(F(" sidik jari terdaftar"));
    return;
  }

  Serial.println();
  Serial.println(F("  SENSOR TIDAK TERDETEKSI. Periksa berurutan:"));
  Serial.println(F("   1. Tukar kedua kabel data. Keluaran sensor harus"));
  Serial.println(F("      masuk ke S D16, masukan sensor ke S D17."));
  Serial.println(F("   2. VCC sensor di 5V, GND menyatu dengan GND ESP32."));
  Serial.println(F("   3. Pembagi tegangan: pastikan yang masuk ke S D16"));
  Serial.println(F("      adalah titik PERTEMUAN dua resistor, bukan ujung"));
  Serial.println(F("      yang lain."));
  Serial.println(F("   4. Sebagian AS608 memakai baud 9600, bukan 57600."));
  Serial.println();
  Serial.println(F("  Setelah memperbaiki kabel, kirim R untuk mencoba lagi"));
  Serial.println(F("  tanpa mengunggah ulang."));
  Serial.println();
}

/* ==================================================================
   BAGIAN 13  -  SETUP
   ================================================================== */

void setup() {
  /* Keadaan aman ditulis SEBELUM pinMode, supaya pin relay tidak
     sempat mengambang saat boot dan solenoid tidak menyentak. */
  digitalWrite(PIN_RELAY, RELAY_AKTIF_LOW ? HIGH : LOW);
  pinMode(PIN_RELAY, OUTPUT);
  relayMati();

  digitalWrite(PIN_BUZZER, LOW);
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);

  digitalWrite(PIN_PEMICU_KAMERA, LOW);
  pinMode(PIN_PEMICU_KAMERA, OUTPUT);
  digitalWrite(PIN_PEMICU_KAMERA, LOW);

  pinMode(PIN_LED, OUTPUT);
  digitalWrite(PIN_LED, LOW);

  Serial.begin(115200);
  delay(300);

  Serial.println();
  garis();
  Serial.println(F("  FIRMWARE KOTAK KUNCI - BOARD A"));
  Serial.println(F("  Bengpuskomlekad"));
  garis();

  // --- nomor kejadian diambil dari flash, bukan dimulai dari nol
  simpanan.begin("kotakkunci", false);
  nomorKejadian = simpanan.getULong("nomor", 0);
  Serial.print(F("  Kejadian tercatat sebelum ini : "));
  Serial.println(nomorKejadian);
  Serial.print(F("  Kejadian berikutnya akan bernomor : "));
  Serial.println(nomorKejadian + 1);

  // --- sensor sidik jari
  mulaiSensor();

  // --- wifi
  if (KIRIM_KE_SERVER) {
    WiFi.mode(WIFI_STA);
    WiFi.setSleep(false);
    WiFi.begin(WIFI_SSID, WIFI_SANDI);
    Serial.print(F("  Menyambung Wi-Fi "));
    unsigned long batas = millis() + 12000;
    while (WiFi.status() != WL_CONNECTED && millis() < batas) {
      delay(300); Serial.print('.');
    }
    Serial.println();
    if (WiFi.status() == WL_CONNECTED) {
      Serial.print(F("  Tersambung, alamat IP "));
      Serial.println(WiFi.localIP());
    } else {
      Serial.println(F("  Belum tersambung. Sistem tetap berjalan,"));
      Serial.println(F("  log ditahan di antrean sampai Wi-Fi kembali."));
    }
  } else {
    Serial.println(F("  Pengiriman ke server DIMATIKAN lewat konfigurasi."));
    Serial.println(F("  Log hanya dicetak di sini."));
  }

  garis();
  Serial.print(F("  Ambang keyakinan  : ")); Serial.println(AMBANG_KEYAKINAN);
  Serial.print(F("  Lama membuka      : ")); Serial.print(LAMA_BUKA);  Serial.println(F(" ms"));
  Serial.print(F("  Pengaman keras    : ")); Serial.print(BATAS_AMAN); Serial.println(F(" ms"));
  Serial.print(F("  Batas gagal       : ")); Serial.println(BATAS_GAGAL);
  garis();
  Serial.println(F("  Sistem berjaga. Tempelkan jari pada sensor."));
  cetakBantuan();

  mulaiBip(2, 80, 80);              // tanda siap
}

/* ==================================================================
   BAGIAN 14  -  LOOP
   Semua yang di sini harus cepat dan tidak memblokir.
   ================================================================== */

void loop() {
  layaniSolenoid();        // pertama, supaya timer paling terjamin
  layaniPulsaKamera();
  layaniBuzzer();
  bacaSidikJari();
  layaniPerintah();
  layaniWiFi();
  kirimAntrean();
  cekPerintahServer();
}
