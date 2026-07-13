@echo off
echo ========================================================
echo        KHOI DONG HE THONG VIHAND GRADE
echo ========================================================
echo.

echo [1/3] Dang khoi dong Web Frontend (Next.js - Port 3000)...
start "Next.js Web Server" cmd /c "npm run dev"

echo [2/3] Dang khoi dong AI Service (ViT5 Python - Port 8000)...
echo Dang ap dung Quantize INT8 de chay muot tren CPU...
start "ViT5 AI Service" cmd /k "cd python_service && python main.py"

echo [3/3] Dang khoi dong MCP Server cho Xiaozhi AI (Port 8200)...
start "Xiaozhi MCP Server" cmd /k "cd mcp_service && pip install -r requirements.txt -q && python main.py"

echo.
echo ========================================================
echo TAT CA CAC DICH VU DANG DUOC KHOI DONG!
echo - Web UI se chay tai: http://localhost:3000
echo - AI Service chay tai: http://localhost:8000
echo - Xiaozhi MCP Server:  http://localhost:8200/sse
echo.
echo Cau hinh tren xiaozhi.me:
echo   MCP URL: http://<IP_may_ban>:8200/sse
echo.
echo Luu y: Vui long cho khoang 15-30 giay de mo hinh AI load len RAM.
echo De tat he thong, hay dong cac cua so Terminal vua hien len.
echo ========================================================
pause
