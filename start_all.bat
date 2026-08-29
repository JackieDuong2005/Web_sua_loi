@echo off
chcp 65001 >nul
echo ================================================================
echo     KHOI DONG HE THONG VIHAND GRADE + XIAOZHI VOICE CORE
echo ================================================================
echo.

:: === FIX QUAN TRONG: Tat Quick Edit Mode ===
:: Quick Edit Mode lam DONG BANG Python khi click vao cua so terminal
reg add "HKCU\Console" /v QuickEdit /t REG_DWORD /d 0 /f >nul 2>&1
echo [OK] Da tat Quick Edit Mode.
echo.

:: ── Kiem tra GEMINI_API_KEY ──────────────────────────────────────────
if "%GEMINI_API_KEY%"=="" (
    echo [!] CANH BAO: Chua thiet lap GEMINI_API_KEY
    echo     Chay setup_api_key.bat truoc khi dung start_all.bat
    echo.
)

echo [1/3] Dang khoi dong Web Frontend ^& REST API (Next.js - Port 3000)...
start "ViHand Grade Web" cmd /c "npm run dev"
echo     [OK] Next.js dang khoi dong tai http://localhost:3000
echo.

echo [2/3] Dang khoi dong AI Grading Service (ViT5 Python - Port 8000)...
start "ViT5 AI Service" cmd /k "cd python_service && python main.py"
echo     [OK] ViT5 Grader dang khoi dong tai http://localhost:8000
echo.

echo [3/3] Dang khoi dong Xiaozhi Voice Core cho ESP32 (Port 8100)...
echo     Robot ESP32 se ket noi qua: ws://[IP_MAY]:8100/xiaozhi/v1/
:: Chay voi HIGH priority de asyncio khong bi Windows throttle
start /HIGH "Xiaozhi Voice Core" cmd /k "cd xiaozhi-esp32-server-main\main\xiaozhi-server && python -u app.py"
echo     [OK] Xiaozhi Voice Core dang khoi dong tai port 8100
echo.

echo ================================================================
echo  TAT CA CAC DICH VU DANG DUOC KHOI DONG!
echo ================================================================
echo.
echo  DICH VU          CONG DUNG                  PORT
echo  -------          ---------                  ----
echo  Next.js Web      Giao dien + REST API        3000
echo  ViT5 Grader      AI Cham bai OCR             8000
echo  Xiaozhi Voice    WebSocket cho ESP32-S3      8100
echo.
echo  TRUY CAP WEB:   http://localhost:3000
echo  XIAOZHI HUB:    http://localhost:3000/teacher/xiaozhi
echo  ESP32 CONNECT:  ws://[IP_MAY]:8100/xiaozhi/v1/
echo.
echo  QUAN TRONG:
echo  - KHONG CLICK vao cua so "Xiaozhi Voice Core"!
echo    Neu lo click, nhan ENTER ngay de giai phong asyncio.
echo  - Cho 20-30 giay de Xiaozhi Voice Core load Silero-VAD.
echo  - Xem log Robot tai cua so "Xiaozhi Voice Core".
echo.
echo  CAU HINH TUY CHINH:
echo  - Giong doc / toc do: xiaozhi-esp32-server-main\main\xiaozhi-server\data\.config.yaml
echo  - Nguon dien: Raspberry Pi 4 hoac may tinh Windows
echo.
echo  ROBOT ESP32:
echo  1. Cai firmware xiaozhi-esp32-main len mach ESP32-S3
echo  2. Dung app BluFi cau hinh Wi-Fi phong hoc
echo  3. Thanh cong: LED xanh + Alexa noi "Em da san sang!"
echo.
echo  Vui long cho 30 giay de tat ca dich vu san sang...
echo ================================================================
pause
