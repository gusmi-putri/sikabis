@echo off
REM Cek cepat sebelum sidang: hotspot laptop, band, dan server SI-JAGA.
title SI-JAGA Cek Jaringan
echo ==== 1. Alamat hotspot laptop (harus ada 192.168.137.1) ====
ipconfig | findstr /C:"192.168.137"
if errorlevel 1 echo [GAGAL] Tidak ada 192.168.137.1 - Mobile Hotspot belum menyala.
echo.
echo ==== 2. Wi-Fi laptop saat ini (sumber internet) ====
echo Jangan sampai bernama SIJAGA: itu nama hotspot untuk alat.
netsh wlan show interfaces | findstr /I /C:" SSID" /C:"Band" /C:"State"
echo Band 5 GHz pada sumber internet bisa memaksa hotspot ikut 5 GHz,
echo padahal ESP32 hanya 2.4 GHz.
echo.
echo ==== 3. Server SI-JAGA lewat alamat hotspot ====
curl -s -o NUL -m 5 -w "Status: %%{http_code} (200 = server hidup, 000 = tidak terjangkau)\n" http://192.168.137.1/sikabis/public/up
echo.
pause
