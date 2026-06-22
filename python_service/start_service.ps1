# Script khởi động ViT5 Python Service (Windows PowerShell)
Write-Host "🚀 Khởi động ViHand Grade - ViT5 Python Service..." -ForegroundColor Cyan

$ServiceDir = "$PSScriptRoot"
$VenvDir = "$ServiceDir\.venv"

# Tạo virtualenv nếu chưa có
if (-not (Test-Path $VenvDir)) {
    Write-Host "📦 Tạo virtual environment..." -ForegroundColor Yellow
    python -m venv $VenvDir
}

# Kích hoạt venv
& "$VenvDir\Scripts\Activate.ps1"

# Cài đặt dependencies
Write-Host "📥 Cài đặt dependencies..." -ForegroundColor Yellow
pip install -r "$ServiceDir\requirements.txt" -q

# Khởi động server
Write-Host "✅ Khởi động FastAPI trên http://localhost:8000" -ForegroundColor Green
Write-Host "   - POST /grade  : Sửa lỗi + chấm điểm" -ForegroundColor White
Write-Host "   - GET  /health : Kiểm tra trạng thái" -ForegroundColor White
Write-Host "   - POST /preload: Tải model trước" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Lần đầu chạy sẽ tải mô hình ViT5 (~500MB) từ HuggingFace..." -ForegroundColor Yellow

python "$ServiceDir\main.py"
