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
REM 3. Kiem tra cau hinh GEMINI API KEY
REM ------------------------------------------------------------------
if exist ".env.local" (
    echo [OK] Da tim thay file cau hinh .env.local
) else if not "%GEMINI_API_KEY%"=="" (
    echo [OK] Da nhan dien GEMINI_API_KEY tu bien moi truong he thong.
) else (
    echo [!] CANH BAO: Chua tim thay file .env.local hoac bien GEMINI_API_KEY.
    echo     He thong van khoi dong, nhung tinh nang OCR Gemini co the bi han che.
    echo     Ban co the chay setup_api_key.bat de bo sung key bat cu luc nao.
)
echo.

REM ------------------------------------------------------------------
REM 4. Khoi dong Web Frontend va REST API (Next.js - Port 3000)
REM ------------------------------------------------------------------
echo [1/2] Dang khoi dong Web Frontend va REST API (Next.js - Port 3000)...
start "ViHand Grade Web (Port 3000)" cmd /k "cd /d ""%~dp0"" && echo Dang khoi dong Next.js dev server... && npm run dev"
echo     [OK] Cua so Next.js da duoc mo. Vui long doi san sang tai http://localhost:3000
echo.

REM ------------------------------------------------------------------
REM 5. Khoi dong AI Service: ViT5 Grader + Qwen SLM + Edge-TTS (Python - Port 8000)
REM ------------------------------------------------------------------
echo [2/2] Dang khoi dong AI Service: ViT5 + Qwen SLM + Edge-TTS (Python - Port 8000)...
start "ViHand AI Service (Port 8000)" cmd /k "cd /d ""%~dp0python_service"" && set ENABLE_QWEN_SLM=1 && echo Dang khoi dong Python AI Service (ViT5 + Qwen2.5 SLM)... && python main.py"
echo     [OK] Cua so AI Service da duoc mo. Vui long doi tai model tai http://localhost:8000
echo.

REM ------------------------------------------------------------------
REM 6. Thong tin dieu huong
REM ------------------------------------------------------------------
echo ================================================================
echo  TAT CA CAC DICH VU DANG DUOC KHOI DONG!
echo ================================================================
echo.
echo  DICH VU             CONG DUNG                        PORT
echo  -------             ---------                        ----
echo  Next.js Web         Giao dien + Cham diem + Doc bai  3000
echo  ViHand AI Service   ViT5 + Qwen2.5 SLM + Edge-TTS    8000
echo.
echo  DIA CHI TRUY CAP:
echo  - Trang chu Web:        http://localhost:3000
echo  - Cham diem AI:         http://localhost:3000/teacher/grade
echo  - Doc chinh ta Web:     http://localhost:3000/teacher/dictation
echo  - API Docs (Swagger):   http://localhost:8000/docs
echo.
echo  LUU Y:
echo  - Giu nguyen 2 cua so Command Prompt vua mo de he thong hoat dong.
echo  - Muon tat he thong, chi can dong 2 cua so terminal do.
echo ================================================================
pause
