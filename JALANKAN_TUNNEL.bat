@echo off
REM Membuka SI-JAGA ke alamat publik tetap lewat ngrok.
REM Laragon (Apache) harus sudah menyala. Alamat tidak berubah walau IP/WiFi berganti.
title SI-JAGA Tunnel
echo Alamat publik: https://jacket-slip-word.ngrok-free.dev
echo Biarkan jendela ini terbuka. Tutup untuk mematikan tunnel.
echo.
ngrok http 127.0.0.1:80 --url=https://jacket-slip-word.ngrok-free.dev --host-header=sikabis.test
pause
