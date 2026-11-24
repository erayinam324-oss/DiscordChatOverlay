@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Electron kuruluyor, lutfen bekle...
call npm install --no-audit --no-fund
if errorlevel 1 (
  echo.
  echo Kurulum basarisiz oldu. Internet baglantisini kontrol et.
  pause
  exit /b 1
)
echo.
echo Kurulum tamam. Baslat.vbs ile acabilirsin.
pause
