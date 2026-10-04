#!/bin/bash
# ==============================================================================
# ViHand Grade — NVIDIA Jetson Nano: RUN ISOLATED SERVER (NON-INVASIVE SANDBOX)
# Chạy hệ thống ở chế độ KHÔNG XÂM LẤN:
#   1. KHÔNG apt upgrade làm hỏng thư viện hệ thống của project khác
#   2. KHÔNG cài đè pip global (toàn bộ gói nằm trong venv cục bộ)
#   3. KHÔNG sửa /etc/fstab (swapfile tạm thời chỉ mount trong phiên làm việc)
#   4. KHÔNG đăng ký systemd vĩnh viễn (chạy tiến trình nền có thể tắt sạch)
# ==============================================================================
set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RED='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[⚠]${NC} $1"; }
err()  { echo -e "${RED}[✗] $1${NC}"; exit 1; }
step() { echo -e "\n${CYAN}${BOLD}═══════════════════════════════════════════════════════════${NC}"; echo -e "${CYAN}${BOLD}  $1${NC}"; echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════${NC}\n"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_DIR="$SCRIPT_DIR/logs"
PID_FILE="$LOG_DIR/vihand_server.pids"
TEMP_SWAP="/swapfile_vihand_temp"

mkdir -p "$LOG_DIR"

step "1/4. THIẾT LẬP BỘ NHỚ SWAP TẠM THỜI (TỰ GỠ KHI DỪNG)"

CURRENT_SWAP=$(free -m | awk '/^Swap:/{print $2}')
if [ "$CURRENT_SWAP" -lt 2000 ]; then
    log "RAM Swap hiện tại (${CURRENT_SWAP}MB) khá thấp. Đang tạo swap tạm thời 3GB tại $TEMP_SWAP..."
    if [ ! -f "$TEMP_SWAP" ]; then
        sudo fallocate -l 3072M "$TEMP_SWAP" || sudo dd if=/dev/zero of="$TEMP_SWAP" bs=1M count=3072
        sudo chmod 600 "$TEMP_SWAP"
        sudo mkswap "$TEMP_SWAP"
    fi
    sudo swapon "$TEMP_SWAP" 2>/dev/null || true
    log "Đã kích hoạt Swap tạm thời: $TEMP_SWAP (Không ghi vào /etc/fstab, an toàn 100%)."
else
    log "Hệ thống đã có sẵn Swap: ${CURRENT_SWAP}MB. Giữ nguyên, không tạo thêm."
fi

step "2/4. KHỞI TẠO MÔI TRƯỜNG PYTHON CÁCH LY (VIRTUALENV)"

VENV_DIR="$APP_DIR/python_service/venv"
if [ ! -d "$VENV_DIR" ]; then
    log "Tạo virtualenv riêng biệt tại $VENV_DIR (không đụng vào /usr/lib)..."
    python3 -m venv "$VENV_DIR"
fi

# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"

# Cài đặt tối thiểu vào venv cục bộ
log "Cài đặt các thư viện cần thiết vào venv cục bộ..."
pip install --upgrade pip setuptools wheel --quiet
pip install fastapi "uvicorn[standard]" pydantic pillow edge-tts --quiet

# Kiểm tra PyTorch
if ! python3 -c "import torch" 2>/dev/null; then
    log "Đang nạp PyTorch vào venv..."
    pip install torch torchvision --quiet || true
fi

# Kiểm tra Ultralytics YOLO
if ! python3 -c "import ultralytics" 2>/dev/null; then
    log "Cài đặt Ultralytics vào venv..."
    pip install ultralytics --quiet || true
fi

# Kiểm tra Transformers ViT5
if ! python3 -c "import transformers" 2>/dev/null; then
    log "Cài đặt Transformers vào venv..."
    pip install "transformers==4.47.1" "tokenizers>=0.21.0" "sentencepiece>=0.2.0" safetensors --quiet || true
fi

step "3/4. KHỞI CHẠY TIẾN TRÌNH SERVER VIHAND GRADE"

# Xóa PID file cũ
rm -f "$PID_FILE"

# 1. Khởi chạy Python AI Core (Port 8000)
log "Đang khởi động Python AI Core trên cổng 8000..."
cd "$APP_DIR/python_service"
export PYTHONUNBUFFERED=1
export ENABLE_QWEN_SLM=0
export VIT5_WORKERS=1
nohup "$VENV_DIR/bin/python3" main.py > "$LOG_DIR/python_service.log" 2>&1 &
PYTHON_PID=$!
echo "PYTHON_PID=$PYTHON_PID" >> "$PID_FILE"
log "Python AI Core đã chạy (PID: $PYTHON_PID | Log: $LOG_DIR/python_service.log)"

sleep 4

# 2. Khởi chạy Next.js Web App (Port 3000) nếu máy có sẵn Node.js
cd "$APP_DIR"
if command -v node &>/dev/null; then
    log "Khởi chạy Next.js Web App trên cổng 3000..."
    export PORT=3000
    export NODE_ENV=production
    export DATABASE_URL="file:$APP_DIR/prisma/vihand.db"
    
    # Đồng bộ .env cục bộ
    cp -n "$APP_DIR/03_Scripts_Trien_khai/shared/.env.example" "$APP_DIR/.env" 2>/dev/null || true
    sed -i "s|DATABASE_URL=.*|DATABASE_URL=\"file:$APP_DIR/prisma/vihand.db\"|" "$APP_DIR/.env" 2>/dev/null || true
    
    if [ -f "$APP_DIR/node_modules/next/dist/bin/next" ]; then
        nohup node "$APP_DIR/node_modules/next/dist/bin/next" start -p 3000 > "$LOG_DIR/webapp.log" 2>&1 &
        WEB_PID=$!
        echo "WEB_PID=$WEB_PID" >> "$PID_FILE"
        log "Next.js Web App đã chạy (PID: $WEB_PID | Log: $LOG_DIR/webapp.log)"
    else
        warn "Chưa build Next.js (thiếu node_modules). Hệ thống vẫn hoạt động ở chế độ AI Engine (:8000)."
    fi
else
    warn "Không có Node.js trên Jetson. Hệ thống chạy ở chế độ 'AI Server Chuyên Dụng' (:8000)."
fi

step "4/4. TRẠNG THÁI SERVER & THÔNG TIN TRUY CẬP"

IP=$(hostname -I | awk '{print $1}')
echo -e "${GREEN}${BOLD}================================================================${NC}"
echo -e "${GREEN}${BOLD}  🎉 VIHAND GRADE SERVER ĐANG HOẠT ĐỘNG Ở CHẾ ĐỘ ISOLATED!     ${NC}"
echo -e "${GREEN}${BOLD}================================================================${NC}"
echo -e "  🌐 Địa chỉ IP máy Jetson:  ${CYAN}http://${IP}${NC}"
echo -e "  🐍 Python AI Swagger API:  ${CYAN}http://${IP}:8000/docs${NC}"
if [ -n "$WEB_PID" ]; then
    echo -e "  💻 Giao diện Web:          ${CYAN}http://${IP}:3000${NC}"
fi
echo -e "  📁 Thư mục Log cách ly:    ${YELLOW}$LOG_DIR${NC}"
echo -e "  🛑 KHI TEST XONG CUỐI GIỜ: Chạy lệnh sau để gỡ bỏ sạch 100%:"
echo -e "     ${BOLD}${RED}sudo bash $SCRIPT_DIR/cleanup_and_restore.sh${NC}\n"
