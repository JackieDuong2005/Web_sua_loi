#!/bin/bash
# ============================================================
# ViHand Grade — Script cài đặt MCP Server trên Raspberry Pi 4
# Chạy: bash setup_rpi.sh
# ============================================================

set -e  # Dừng nếu có lỗi

echo "======================================================"
echo " ViHand Grade MCP Server — Raspberry Pi 4 Setup"
echo "======================================================"

# --- 1. Cập nhật hệ thống ---
echo "[1/6] Cập nhật hệ thống..."
sudo apt update -y && sudo apt upgrade -y

# --- 2. Cài Python 3.11+ ---
echo "[2/6] Cài Python..."
sudo apt install -y python3 python3-pip python3-venv git curl wget

PY_VERSION=$(python3 --version 2>&1 | cut -d' ' -f2 | cut -d'.' -f1-2)
echo "    Python version: $PY_VERSION"

# --- 3. Tạo thư mục ---
echo "[3/6] Tạo thư mục ~/vihand-mcp..."
mkdir -p ~/vihand-mcp
cd ~/vihand-mcp

# --- 4. Tạo virtual environment ---
echo "[4/6] Tạo Python virtual environment..."
python3 -m venv venv
source venv/bin/activate

# --- 5. Cài dependencies ---
echo "[5/6] Cài dependencies..."
pip install --upgrade pip
pip install fastapi uvicorn httpx starlette websockets

echo "[6/6] Kiểm tra cài đặt..."
python3 -c "import fastapi, uvicorn, httpx, websockets; print('    OK - Tất cả dependencies đã sẵn sàng')"

echo ""
echo "======================================================"
echo " Cài đặt hoàn tất!"
echo " Bước tiếp theo:"
echo "   1. Copy main.py lên ~/vihand-mcp/"
echo "   2. Tạo file ~/vihand-mcp/.env"
echo "   3. Chạy: bash ~/vihand-mcp/install_service.sh"
echo "======================================================"
