@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title ViHand Grade - Master System Launcher

REM ------------------------------------------------------------------
REM 0. Chuyen ve dung thu muc chua script (chong loi khi Run as Admin)
REM ------------------------------------------------------------------
cd /d "%~dp0"

echo ================================================================
echo     KHOI DONG HE THONG VIHAND GRADE (WEB + AI + DICTATION)
echo ================================================================
echo Thu muc lam viec: %~dp0
echo.

REM ------------------------------------------------------------------
REM 1. Kiem tra Node.js va npm
REM ------------------------------------------------------------------
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [LOI] Khong tim thay Node.js trong PATH!
    echo       Vui long cai dat Node.js tu https://nodejs.org
    echo.
    pause
    exit /b 1
)

where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [LOI] Khong tim thay npm trong PATH!
    echo.
    pause
    exit /b 1
)

REM ------------------------------------------------------------------
REM 2. Kiem tra Python
REM ------------------------------------------------------------------
set "PY_EXE="
if exist "%~dp0venv\Scripts\python.exe" (
    set "PY_EXE=%~dp0venv\Scripts\python.exe"
) else if exist "%~dp0python_service\venv\Scripts\python.exe" (
    set "PY_EXE=%~dp0python_service\venv\Scripts\python.exe"
) else (
    where python >nul 2>&1
    if %errorlevel% equ 0 (
        set "PY_EXE=python"
    ) else (
        echo [LOI] Khong tim thay Python trong PATH hoac venv!
        echo       Vui long cai dat Python 3.10+ hoac tao venv.
        echo.
        pause
        exit /b 1
    )
)

REM ------------------------------------------------------------------
REM 3. Giai phong triet de port cu (:3000, :8000) va tien trinh zombie
REM ------------------------------------------------------------------
echo [0/2] Dang kiem tra va giai phong triet de cac port 3000 va 8000...

REM Giai doan 3a: Dung PowerShell de ngat cac tien trinh dang bind port
powershell -NoProfile -ExecutionPolicy Bypass -Command "& { 3000, 8000 | ForEach-Object { $p = $_; Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue | ForEach-Object { if ($_.OwningProcess -gt 4) { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } } } }; exit 0" >nul 2>&1

REM Giai doan 3b: Dung Taskkill cay tien trinh (/T /F) du phong qua netstat
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /r /c:":3000 " /c:":8000 "') do (
    if not "%%a"=="0" (
        taskkill /F /T /PID %%a >nul 2>&1
    )
)

REM Cho 1 giay de Windows hoan tat thu hoi socket TCP TIME_WAIT
timeout /t 1 /nobreak >nul 2>&1 || ping -n 2 127.0.0.1 >nul
echo     [OK] Cong 3000 va 8000 da duoc lam sach va san sang.
echo.

REM ------------------------------------------------------------------
REM 4. Kiem tra cau hinh GEMINI API KEY
REM ------------------------------------------------------------------
if exist ".env.local" (
    echo [OK] Da tim thay file cau hinh .env.local
) else if not "%GEMINI_API_KEY%"=="" (
    echo [OK] Da nhan dien GEMINI_API_KEY tu bien moi truong he thong.
) else (
    echo [!] CANH BAO: Chua tim thay file .env.local hoac bien GEMINI_API_KEY.
)
echo.

REM ------------------------------------------------------------------
REM 5. Khoi dong Web Frontend va REST API (Next.js - Port 3000)
REM ------------------------------------------------------------------
echo [1/2] Dang khoi dong Web Frontend va REST API (Next.js - Port 3000)...
start "ViHand Grade Web (Port 3000)" /D "%~dp0" cmd /k "set PORT=3000 && npm run dev"
echo     [OK] Cua so Next.js da duoc mo.
echo.

REM ------------------------------------------------------------------
REM 6. Khoi dong AI Service: ViT5 + YOLOv8 + Qwen SLM + Piper TTS (Port 8000)
REM ------------------------------------------------------------------
echo [2/2] Dang khoi dong AI Service: ViT5 + YOLOv8 + Qwen SLM + Piper TTS (Port 8000)...
start "ViHand AI Service (Port 8000)" /D "%~dp0python_service" cmd /k "set PYTHONIOENCODING=utf-8 && set ENABLE_VIT5=1 && set ENABLE_YOLO=1 && set ENABLE_QWEN_SLM=1 && set QWEN_LIFECYCLE_MODE=on_demand_unload && "!PY_EXE!" main.py"
echo     [OK] Cua so AI Service da duoc mo.
echo.

REM ------------------------------------------------------------------
REM 7. Thong tin dieu huong & Tu dong mo trinh duyet
REM ------------------------------------------------------------------
echo ================================================================
echo  TAT CA CAC DICH VU DANG DUOC KHOI DONG!
echo ================================================================
echo.
echo  DIA CHI TRUY CAP:
echo  - Trang chu Web:        http://localhost:3000
echo  - Cham diem AI:         http://localhost:3000/teacher/grade
echo  - Doc chinh ta Web:     http://localhost:3000/teacher/dictation
echo  - Cong hoc sinh:        http://localhost:3000/student
echo  - API Docs (Swagger):   http://localhost:8000/docs
echo.
echo  Dang doi dich vu san sang de tu dong mo trinh duyet...

REM Cho toi da 10 giay de Next.js san sang, neu co phan hoi se mo ngay
powershell -NoProfile -ExecutionPolicy Bypass -Command "& { for ($i=0; $i -lt 10; $i++) { try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:3000' -UseBasicParsing -TimeoutSec 1; if ($r.StatusCode -eq 200) { break } } catch {}; Start-Sleep -Seconds 1 } }; exit 0" >nul 2>&1
start http://localhost:3000

echo.
echo  LUU Y:
echo  - Giu nguyen 2 cua so Command Prompt vua mo de he thong hoat dong.
echo  - De tat he thong sach se, chay file: stop_all.bat
echo ================================================================
pause
