@echo off
chcp 65001 >nul
:: ====================================================================
::  SETUP GEMINI API KEY CHO XIAOZHI VOICE CORE
::  Chay file nay 1 LAN duy nhat truoc khi dung start_all.bat
:: ====================================================================

echo ================================================================
echo   THIET LAP GEMINI API KEY CHO XIAOZHI VOICE CORE
echo ================================================================
echo.
echo Lay Gemini API Key mien phi tai:
echo   https://aistudio.google.com/app/apikey
echo.

set /p GEMINI_API_KEY="Dan API Key vao day: "

if "%GEMINI_API_KEY%"=="" (
    echo [LOI] Ban chua nhap API Key!
    pause
    exit /b 1
)

:: Luu vao bien moi truong toan he thong (User level)
setx GEMINI_API_KEY "%GEMINI_API_KEY%" /M >nul 2>&1
if %errorlevel% neq 0 (
    :: Thu khong co admin
    setx GEMINI_API_KEY "%GEMINI_API_KEY%" >nul 2>&1
)

echo.
echo [OK] Da luu GEMINI_API_KEY thanh cong!
echo.
echo Kiem tra:
set | findstr GEMINI
echo.
echo Ban co the dung start_all.bat ngay bay gio.
echo (Neu khong thay bien, mo lai terminal truoc)
echo.
pause
