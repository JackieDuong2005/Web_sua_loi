@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title ViHand Grade - System Launcher

REM ------------------------------------------------------------------
REM Chuyen ve dung thu muc chua script (tranh loi khi Run as Admin)
REM ------------------------------------------------------------------
cd /d "%~dp0"

echo ================================================================
echo     KHOI DONG HE THONG VIHAND GRADE (WEB + AI + DICTATION)
echo ================================================================
echo.
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
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [LOI] Khong tim thay Python trong PATH!
    echo       Vui long cai dat Python 3.10+ va tick chon "Add Python to PATH".
    echo.
    pause
    exit /b 1
)

REM ------------------------------------------------------------------
REM 3. Giai phong port cu neu bi treo (:3000, :8000)
REM ------------------------------------------------------------------
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ports = @(3000, 8000); foreach ($p in $ports) { $conns = Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue; if ($conns) { foreach ($c in $conns) { try { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue } catch {} } } }" >nul 2>&1

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
start "ViHand Grade Web (Port 3000)" cmd /k "cd /d ""%~dp0"" && set PORT=3000 && npm run dev"
echo     [OK] Cua so Next.js da duoc mo.
echo.

REM ------------------------------------------------------------------
REM 6. Khoi dong AI Service: ViT5 + YOLOv8 + Qwen SLM + TTS (Python - Port 8000)
REM ------------------------------------------------------------------
echo [2/2] Dang khoi dong AI Service: ViT5 + YOLOv8 + Qwen SLM + Piper TTS (Port 8000)...
start "ViHand AI Service (Port 8000)" cmd /k "cd /d ""%~dp0python_service"" && set PYTHONIOENCODING=utf-8 && set ENABLE_VIT5=1 && set ENABLE_YOLO=1 && set ENABLE_QWEN_SLM=1 && python main.py"
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
echo  Dang cho 5 giay de tu dong mo trinh duyet...
timeout /t 5 /nobreak >nul 2>&1 || ping -n 6 127.0.0.1 >nul
start http://localhost:3000/teacher
echo.
echo  LUU Y:
echo  - Giu nguyen 2 cua so Command Prompt vua mo de he thong hoat dong.
echo  - Muon tat he thong, chi can dong 2 cua so terminal do la xong.
echo ================================================================
pause
