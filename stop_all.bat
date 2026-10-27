@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title ViHand Grade - System Shutdown

cd /d "%~dp0"

echo ================================================================
echo       DANG DUNG TOAN BO HE THONG VIHAND GRADE...
echo ================================================================
echo.

REM 1. Giai phong port 3000 va 8000
echo [1/3] Giai phong port 3000 (Web) va 8000 (AI Core)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "& { 3000, 8000 | ForEach-Object { $p = $_; Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue | ForEach-Object { if ($_.OwningProcess -gt 4) { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } } } }; exit 0" >nul 2>&1

for /f "tokens=5" %%a in ('netstat -aon ^| findstr /r /c:":3000 " /c:":8000 "') do (
    if not "%%a"=="0" (
        taskkill /F /T /PID %%a >nul 2>&1
    )
)

REM 2. Dong cac cua so terminal cua he thong
echo [2/3] Dong cac cua so terminal cua ViHand Grade...
taskkill /F /FI "WINDOWTITLE eq ViHand Grade Web (Port 3000)*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq ViHand AI Service (Port 8000)*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq ViHand YOLO Service (:8000)*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq ViHand Web App (:3000)*" /T >nul 2>&1

REM 3. Cho thu hoi socket
timeout /t 1 /nobreak >nul 2>&1 || ping -n 2 127.0.0.1 >nul

echo [3/3] Kiem tra lai trang thai...
netstat -aon | findstr /r /c:":3000 " /c:":8000 " | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo [!] Mot vai tien trinh van chua tat han, dang cuong che tat node va python cuc bo...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Process -Name node, python -ErrorAction SilentlyContinue | Where-Object { $_.Path -like '*Web_sua_loi*' } | Stop-Process -Force -ErrorAction SilentlyContinue" >nul 2>&1
)

echo.
echo ================================================================
echo   TAT CA CAC DICH VU DA DUOC DUNG HOAN TOAN VA AN TOAN!
echo ================================================================
echo.
timeout /t 3 >nul 2>&1 || ping -n 4 127.0.0.1 >nul
