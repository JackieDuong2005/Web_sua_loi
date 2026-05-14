#!/usr/bin/env pwsh
# deploy.ps1 - Push code len GitHub va Hugging Face Space
# Su dung: .\deploy.ps1 "Mo ta thay doi"
# Hoac:    .\deploy.ps1  (se dung message mac dinh)

param(
    [string]$Message = "fix: update code"
)

$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
$DIR = $PSScriptRoot

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  DEPLOY: GitHub + Hugging Face Space" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# ── Stage + Commit ──────────────────────────────────────
Write-Host "[1/3] Staging changes..." -ForegroundColor Yellow
git -C $DIR add .

$status = git -C $DIR status --short
if (-not $status) {
    Write-Host "  Khong co thay doi moi. Thoat." -ForegroundColor Gray
    exit 0
}

Write-Host "  Files changed:" -ForegroundColor Gray
git -C $DIR status --short | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }

Write-Host ""
Write-Host "[2/3] Committing: '$Message'" -ForegroundColor Yellow
git -C $DIR commit -m $Message
Write-Host "  Commit OK" -ForegroundColor Green

# ── Push GitHub ─────────────────────────────────────────
Write-Host ""
Write-Host "[3/3] Pushing..." -ForegroundColor Yellow

Write-Host "  -> GitHub..." -ForegroundColor Gray
$ghResult = git -C $DIR push origin main 2>&1
if ($LASTEXITCODE -eq 0 -or $ghResult -match "main -> main") {
    Write-Host "  GitHub: OK" -ForegroundColor Green
} else {
    Write-Host "  GitHub: FAILED" -ForegroundColor Red
    Write-Host $ghResult -ForegroundColor Red
}

Write-Host "  -> Hugging Face Space..." -ForegroundColor Gray
$hfResult = git -C $DIR push hf main --force 2>&1
if ($hfResult -match "main -> main") {
    Write-Host "  Hugging Face: OK" -ForegroundColor Green
} else {
    Write-Host "  Hugging Face: FAILED" -ForegroundColor Red
    Write-Host $hfResult -ForegroundColor Red
}

# ── Done ────────────────────────────────────────────────
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  DONE!" -ForegroundColor Green
Write-Host ""
Write-Host "  GitHub : https://github.com/JackieDuong2005/Web_sua_loi" -ForegroundColor White
Write-Host "  HF Space: https://huggingface.co/spaces/JackieDuong/NCKh" -ForegroundColor White
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
