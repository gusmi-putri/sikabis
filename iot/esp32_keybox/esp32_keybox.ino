#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// Uncomment jika menggunakan library sidik jari AS608
// #include <Adafruit_Fingerprint.h> 

// ── KONFIGURASI JARINGAN ──
const char* ssid = "WIFI_SSID_ANDA";
const char* password = "WIFI_PASSWORD_ANDA";

// ── KONFIGURASI API SI-JAGA ──
// Ganti IP dengan IP komputer server Laravel (bukan localhost)
const char* API_URL = "http://192.168.x.x:8000/api/device";
// Ganti dengan API Key milik ESP32-KEYBOX-01 (lihat tabel device_statuses)
const char* API_KEY = "GANTI_DENGAN_API_KEY_ESP32_KEYBOX_01"; 

unsigned long lastPolling = 0;
const long pollingInterval = 5000; // 5 detik untuk cek perintah Enroll/Delete

// Inisialisasi Hardware
// HardwareSerial mySerial(2); // RX, TX
// Adafruit_Fingerprint finger = Adafruit_Fingerprint(&mySerial);

void setup() {
  Serial.begin(115200);
  
  // finger.begin(57600);
  
  Serial.print("Menghubungkan ke WiFi");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Terhubung!");
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    unsigned long currentMillis = millis();
    
    // 1. Polling Perintah (Mengecek ada request Enroll/Delete dari Web)
    if (currentMillis - lastPolling >= pollingInterval) {
      pollCommand();
      lastPolling = currentMillis;
    }
    
    // 2. Baca Sensor Sidik Jari (Akses normal sehari-hari)
    // int fingerID = checkFingerprint();
    // if (fingerID > 0) {
    //   Serial.println("Akses Diterima! Membuka Keybox...");
    //   sendAccessLog(fingerID, "success");
    //   // Buka Selenoid Door Lock di sini
    // } else if (fingerID == -1) {
    //   Serial.println("Akses Ditolak!");
    //   sendAccessLog(0, "failed");
    // }
  }
}

// ── FUNGSI KOMUNIKASI HTTP ──

void pollCommand() {
  HTTPClient http;
  String url = String(API_URL) + "/command";
  http.begin(url);
  http.addHeader("X-Device-Key", API_KEY);
  
  int httpCode = http.GET();
  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    
    StaticJsonDocument<512> doc;
    DeserializationError error = deserializeJson(doc, payload);
    
    if (!error) {
      String command = doc["pending_command"].as<String>();
      
      if (command == "ENROLL") {
        int targetId = doc["pending_target"].as<int>();
        bool success = enrollFingerprint(targetId);
        sendAckCommand("ENROLL", targetId, success);
      } 
      else if (command == "DELETE") {
        int targetId = doc["pending_target"].as<int>();
        bool success = deleteFingerprint(targetId);
        sendAckCommand("DELETE", targetId, success);
      }
    }
  }
  http.end();
}

void sendAckCommand(String command, int target, bool success) {
  HTTPClient http;
  String url = String(API_URL) + "/ack-command";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", API_KEY);
  
  String payload = "{\"command\":\"" + command + "\", \"target\":" + String(target) + ", \"success\":" + (success ? "true" : "false") + "}";
  int httpCode = http.POST(payload);
  
  Serial.print("Ack " + command + " Sent. HTTP Code: ");
  Serial.println(httpCode);
  http.end();
}

void sendAccessLog(int fingerId, String result) {
  HTTPClient http;
  String url = String(API_URL) + "/access-log";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", API_KEY);
  
  // Note: Bisa juga ditambah multipart/form-data jika modul ini punya kamera sendiri
  String payload = "{\"fingerprint_id\":" + String(fingerId) + ", \"result\":\"" + result + "\"}";
  int httpCode = http.POST(payload);
  
  Serial.print("Access Log Sent. HTTP Code: ");
  Serial.println(httpCode);
  http.end();
}


// ── DUMMY FUNGSI HARDWARE FINGERPRINT ──

bool enrollFingerprint(int id) {
  Serial.print("[!] Menunggu user menempelkan jari untuk daftar ID ");
  Serial.println(id);
  // Logika asli pendaftaran sidik jari di sini menggunakan library Adafruit
  return true; // Return false jika gagal/timeout
}

bool deleteFingerprint(int id) {
  Serial.print("[!] Menghapus sidik jari ID ");
  Serial.println(id);
  // Logika asli penghapusan sidik jari di sini
  return true;
}
