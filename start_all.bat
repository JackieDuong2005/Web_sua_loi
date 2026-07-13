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

echo [3/3] Dang khoi dong MCP Service cho Xiaozhi Chatbot...
echo Ket noi den xiaozhi.me qua WebSocket...
start "Xiaozhi MCP Service" cmd /k "cd mcp_service && python main.py"

echo.
echo ========================================================
echo TAT CA CAC DICH VU DANG DUOC KHOI DONG!
echo.
echo - Web UI:         http://localhost:3000
echo - AI Service:     http://localhost:8000
echo - MCP Service:    Ket noi den wss://api.xiaozhi.me/mcp/
echo.
echo LUU Y QUAN TRONG:
echo   MCP Service can file mcp_service/.env co chua:
echo   XIAOZHI_WSS_URL=wss://api.xiaozhi.me/mcp/?token=...
echo   (Copy URL nay tu: xiaozhi.me - Agent - MCP Endpoint)
echo.
echo Cho khoang 15-30 giay de mo hinh AI load len RAM.
echo De tat he thong, hay dong cac cua so Terminal.
echo ========================================================
pause
