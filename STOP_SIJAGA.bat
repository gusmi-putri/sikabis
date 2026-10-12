@echo off
title Hentikan SI-JAGA Server
color 0C

echo ========================================================
echo       MEMATIKAN SERVER SI-JAGA
echo ========================================================
echo.

:: Matikan proses php artisan serve
echo Menghentikan layanan server SI-JAGA...
taskkill /F /FI "WINDOWTITLE eq SI-JAGA Server*" /T >nul 2>&1

:: Opsi cadangan jika windowtitle tidak tertangkap
taskkill /F /IM php.exe >nul 2>&1

echo.
echo Server SI-JAGA telah dinonaktifkan.
timeout /t 3 >nul
exit
