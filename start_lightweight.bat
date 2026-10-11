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
set "PYTHON_EXE=%~dp0venv\Scripts\python.exe"
if not exist "%PYTHON_EXE%" (
    set "PYTHON_EXE=python"
)

REM Khởi chạy AI Service (Port 8000) với YOLOv8 + ENABLE_VIT5=0
echo [1/2] Đang khởi động AI Service (YOLOv8 Detector - Port 8000)...
start "ViHand YOLO Service (:8000)" cmd /k "cd /d ""%~dp0python_service"" && set ""ENABLE_VIT5=0"" && set ""ENABLE_QWEN_SLM=0"" && set ""PYTHONIOENCODING=utf-8"" && ""%PYTHON_EXE%"" main.py"

REM Khởi chạy Next.js (Port 3000)
echo [2/2] Đang khởi động Next.js Web App (:3000)...
start "ViHand Web App (:3000)" cmd /k "cd /d ""%~dp0"" && npm run dev"

echo.
echo ================================================================
echo   HỆ THỐNG ĐÃ SẴN SÀNG!
echo   - Web App & Gemini OCR:   http://localhost:3000
echo   - Chấm điểm & YOLO BBox:  http://localhost:3000/teacher/grade
echo   - YOLO Status API:        http://localhost:8000/yolo/status
echo ================================================================
