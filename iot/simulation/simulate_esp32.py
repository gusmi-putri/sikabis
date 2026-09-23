import requests
import time
import threading

# Konfigurasi
SERVER_URL = "http://127.0.0.1:8000/api/device"
DEVICE_KEY = "Hso7Mxb56wNi45Xq8K2cgus26ZuMsMc3t5JCF2ll" # Sesuaikan dengan api_key di database
HEADERS = {
    "X-Device-Key": DEVICE_KEY,
    "Accept": "application/json"
}

def heartbeat_loop():
    print("[ESP32-CAM] Memulai pengiriman Heartbeat...")
    while True:
        try:
            response = requests.post(
                f"{SERVER_URL}/heartbeat",
                headers=HEADERS,
                json={"stream_url": "http://192.168.1.100:81/stream"}
            )
            if response.status_code == 200:
                print(f"[ESP32-CAM] Heartbeat sukses. Status IoT di Web sekarang harus ONLINE.")
            else:
                print(f"[ESP32-CAM] Heartbeat gagal: {response.text}")
        except Exception as e:
            print(f"[ESP32-CAM] Error koneksi heartbeat: {e}")
        
        # Kirim heartbeat setiap 10 detik
        time.sleep(10)

def polling_loop():
    print("[ESP32 KeyBox] Memulai Polling Command...")
    while True:
        try:
            response = requests.get(
                f"{SERVER_URL}/command",
                headers=HEADERS
            )
            if response.status_code == 200:
                data = response.json()
                print(f"[ESP32 KeyBox] Polling Data: {data}")
                
                # Simulasi memproses perintah ENROLL
                if data.get("pending_command") == "ENROLL":
                    target = data.get("pending_target")
                    print(f"[ESP32 KeyBox] Mendapat perintah ENROLL untuk ID: {target}. Mensimulasikan scan jari...")
                    time.sleep(3) # pura-pura sedang scan jari
                    
                    # Kirim ACK (konfirmasi sukses)
                    ack_resp = requests.post(
                        f"{SERVER_URL}/ack-command",
                        headers=HEADERS,
                        json={
                            "command": "ENROLL",
                            "target": target,
                            "success": True
                        }
                    )
                    print(f"[ESP32 KeyBox] ACK Terkirim: {ack_resp.text}")
            else:
                print(f"[ESP32 KeyBox] Polling gagal: {response.text}")
        except Exception as e:
            print(f"[ESP32 KeyBox] Error koneksi polling: {e}")
            
        time.sleep(5)

if __name__ == "__main__":
    # Jalankan kedua fungsi secara paralel menggunakan thread
    t1 = threading.Thread(target=heartbeat_loop)
    t2 = threading.Thread(target=polling_loop)
    
    t1.start()
    t2.start()
    
    t1.join()
    t2.join()
