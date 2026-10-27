@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title ViHand Grade - Lightweight Mode (Next.js 3000 + Gemini API + YOLO)

cd /d "%~dp0"

echo ================================================================
echo   VIHAND GRADE - CHẾ ĐỘ NHẸ: LOCAL 3000 + GEMINI API + YOLOV8
echo   (Tạm tắt ViT5 & Qwen để khởi động tức thì và tiết kiệm tài nguyên)
echo ================================================================
echo.

REM Kích hoạt venv cục bộ
set "PYTHON_EXE="
if exist "%~dp0venv\Scripts\python.exe" (
    set "PYTHON_EXE=%~dp0venv\Scripts\python.exe"
) else if exist "%~dp0python_service\venv\Scripts\python.exe" (
    set "PYTHON_EXE=%~dp0python_service\venv\Scripts\python.exe"
) else (
    set "PYTHON_EXE=python"
)

REM Giải phóng triệt để port 3000 và 8000
echo [0/2] Đang dọn dẹp và giải phóng port 3000 & 8000...
powershell -NoProfile -ExecutionPolicy Bypass -Command "& { 3000, 8000 | ForEach-Object { $p = $_; Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue | ForEach-Object { if ($_.OwningProcess -gt 4) { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } } } }; exit 0" >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /r /c:":3000 " /c:":8000 "') do (
    if not "%%a"=="0" taskkill /F /T /PID %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul 2>&1 || ping -n 2 127.0.0.1 >nul

REM Khởi chạy AI Service (Port 8000) với YOLOv8 + ENABLE_VIT5=0
echo [1/2] Đang khởi động AI Service (YOLOv8 Detector - Port 8000)...
start "ViHand YOLO Service (:8000)" /D "%~dp0python_service" cmd /k "set ENABLE_VIT5=0 && set ENABLE_QWEN_SLM=0 && set PYTHONIOENCODING=utf-8 && "!PYTHON_EXE!" main.py"

REM Khởi chạy Next.js (Port 3000)
echo [2/2] Đang khởi động Next.js Web App (:3000)...
start "ViHand Web App (:3000)" /D "%~dp0" cmd /k "set PORT=3000 && npm run dev"

echo.
echo ================================================================
echo   HỆ THỐNG ĐÃ SẴN SÀNG!
echo   - Web App & Gemini OCR:   http://localhost:3000
echo   - Chấm điểm & YOLO BBox:  http://localhost:3000/teacher/grade
echo   - YOLO Status API:        http://localhost:8000/yolo/status
echo   - Dừng hệ thống:          Chạy stop_all.bat
echo ================================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "& { for ($i=0; $i -lt 10; $i++) { try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:3000' -UseBasicParsing -TimeoutSec 1; if ($r.StatusCode -eq 200) { break } } catch {}; Start-Sleep -Seconds 1 } }; exit 0" >nul 2>&1
start http://localhost:3000
