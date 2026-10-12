@echo off
title SI-JAGA Server Launcher
color 0A

echo ========================================================
echo       SISTEM INFORMASI JAGA GUDANG (SI-JAGA)
echo              Bengpuskomlekad
echo ========================================================
echo.

:: Pindah ke direktori script ini berada
cd /d "%~dp0"

:: 1. Cek apakah folder public/build sudah ada (hasil npm run build)
if not exist "public\build" (
    echo [PERSIAPAN] Menyiapkan tampilan aplikasi (build pertama kali)...
    call npm run build
    echo.
)

:: 2. Cek apakah storage link sudah aktif
if not exist "public\storage" (
    echo [PERSIAPAN] Menghubungkan penyimpanan foto (storage link)...
    php artisan storage:link
    echo.
)

:: 3. Jalankan server Laravel di latar belakang (Port 8000)
echo [1/2] Menyalakan Server SI-JAGA...
start /min "SI-JAGA Server" php artisan serve --host=0.0.0.0 --port=8000

:: Tunggu 2 detik agar server siap
timeout /t 2 /nobreak >nul

:: 4. Buka browser otomatis ke SI-JAGA
echo [2/2] Membuka Dashboard di Browser...
start "" "http://localhost:8000"

echo.
echo ========================================================
echo   SERVER SUDAH BERJALAN!
echo   - Akses lokal PC ini : http://localhost:8000
echo   - Untuk mematikan    : Dobel klik 'STOP_SIJAGA.bat'
echo ========================================================
echo.
echo Jendela ini boleh ditutup. Server tetap berjalan di latar belakang.
timeout /t 5 >nul
exit
