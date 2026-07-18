@echo off
echo ========================================================
echo        KHOI DONG HE THONG VIHAND GRADE
echo ========================================================
echo.

:: === FIX QUAN TRONG: Tat Quick Edit Mode ===
:: Quick Edit Mode lam DONG BANG Python khi click vao cua so terminal
:: Day la nguyen nhan chinh khien ping bi delay 2-3 phut va mat ket noi
reg add "HKCU\Console" /v QuickEdit /t REG_DWORD /d 0 /f >nul 2>&1
echo [OK] Da tat Quick Edit Mode - Python se khong bi dong bang khi click.
echo.

echo [1/3] Dang khoi dong Web Frontend (Next.js - Port 3000)...
start "Next.js Web Server" cmd /c "npm run dev"

echo [2/3] Dang khoi dong AI Service (ViT5 Python - Port 8000)...
start "ViT5 AI Service" cmd /k "cd python_service && python main.py"

echo [3/3] Dang khoi dong MCP Server cho Xiaozhi AI (Port 8200)...
echo Ket noi voi xiaozhi.me qua MCP Endpoint...
:: Chay voi HIGH priority de asyncio khong bi Windows throttle
start /HIGH "Xiaozhi MCP Server" cmd /k "cd mcp_service && pip install -r requirements.txt -q && python -u main.py"

echo.
echo ========================================================
echo TAT CA CAC DICH VU DANG DUOC KHOI DONG!
echo - Web UI se chay tai: http://localhost:3000
echo - AI Service chay tai: http://localhost:8000
echo - Xiaozhi MCP Server:  http://localhost:8200
echo.
echo LUU Y QUAN TRONG:
echo - KHONG CLICK vao cua so "Xiaozhi MCP Server"!
echo   Neu lo click, nhan ENTER ngay de giai phong process.
echo - Ket noi bi ngat moi 60 giay la BINH THUONG (xiaozhi.me reset).
echo - REBOOT may de Quick Edit Mode tat hoan toan.
echo.
echo Cau hinh MCP Endpoint:
echo   Tao file mcp_service\.env:
echo   MCP_ENDPOINT=wss://api.xiaozhi.me/mcp/?token=...
echo   VIHAND_API_URL=http://localhost:3000
echo.
echo Vui long cho 15-30 giay de mo hinh AI load len RAM.
echo ========================================================
pause
