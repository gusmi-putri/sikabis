#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// Untuk ESP32-CAM (Jika pakai camera, sertakan library camera juga)
// Karena targetnya ESP32-CAM, kita masukkan library esp_camera
#include "esp_camera.h"

// Library fingerprint
#include <Adafruit_Fingerprint.h>

// PIN konfigurasi UART untuk Fingerprint (sesuaikan dengan wiring)
#define RX_PIN 12
#define TX_PIN 13
HardwareSerial mySerial(1);
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&mySerial);

#if __has_include("config.h")
#include "config.h"
#else
#include "config.h.example"
#endif

// Konstanta
const unsigned long JEDA_POLL_PERINTAH = 5000;
unsigned long waktuPollTerakhir = 0;
bool serverTerhubung = false;

// Dummy konfigurasi kamera (mirip dengan esp32-cam-gudang)
// ... Konfigurasi pin kamera di sini ...

void setup() {
  Serial.begin(115200);
  
  // Setup WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");

  // Setup Fingerprint
  mySerial.begin(57600, SERIAL_8N1, RX_PIN, TX_PIN);
  if (finger.verifyPassword()) {
    Serial.println("Fingerprint sensor ditemukan!");
  } else {
    Serial.println("Fingerprint sensor TIDAK ditemukan. Cek wiring.");
  }

  // Setup Kamera (TODO)
}

void loop() {
  // 1. Polling command dari web
  if (millis() - waktuPollTerakhir > JEDA_POLL_PERINTAH) {
    pollCommand();
    waktuPollTerakhir = millis();
  }

  // 2. Cek apakah ada jari yang menempel
  cekFingerprint();
}

void pollCommand() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = String(API_BASE_URL_VAL) + "/device/command?device_id=" + String(DEVICE_ID_VAL);
  
  http.begin(url);
  http.addHeader("X-Device-Key", DEVICE_API_KEY_VAL);
  
  int kodeStatus = http.GET();
  if (kodeStatus == 200) {
    serverTerhubung = true;
    String body = http.getString();
    
    StaticJsonDocument<256> doc;
    DeserializationError err = deserializeJson(doc, body);
    if (!err) {
      const char* cmd = doc["pending_command"];
      int target = doc["pending_target"];

      if (cmd && String(cmd) == "ENROLL") {
        jalankanEnroll();
      } else if (cmd && String(cmd) == "DELETE") {
        jalankanDelete(target);
      }
    }
  }
  http.end();
}

void jalankanEnroll() {
  Serial.println("Menjalankan perintah ENROLL dari server...");
  // Logika enroll AS608
  // ...
  // Jika berhasil, kirim ACK dengan ID baru
  kirimAck("ENROLL", 1 /* ID dummy */, true);
}

void jalankanDelete(int id) {
  Serial.printf("Menjalankan perintah DELETE untuk ID %d...\n", id);
  // Logika delete AS608
  // ...
  // Jika berhasil, kirim ACK
  kirimAck("DELETE", id, true);
}

void kirimAck(String cmd, int target, bool success) {
  if (WiFi.status() != WL_CONNECTED) return;
  
  HTTPClient http;
  String url = String(API_BASE_URL_VAL) + "/device/ack-command?device_id=" + String(DEVICE_ID_VAL);
  http.begin(url);
  http.addHeader("X-Device-Key", DEVICE_API_KEY_VAL);
  http.addHeader("Content-Type", "application/json");

  String jsonBody = "{\"command\":\"" + cmd + "\",\"target\":" + String(target) + ",\"success\":" + (success ? "true" : "false") + "}";
  http.POST(jsonBody);
  http.end();
}

void cekFingerprint() {
  // Logika scanning AS608
  // Jika jari dikenali, ambil foto dari ESP32-CAM, lalu POST ke /device/access-log
  // ...
}
