#!/bin/bash
# ═══════════════════════════════════════════════════════════
#  ViHand Grade — Script cài đặt tự động cho Raspberry Pi 4
#  Chạy: chmod +x setup_rpi.sh && sudo ./setup_rpi.sh
# ═══════════════════════════════════════════════════════════

set -e

# Màu sắc
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

log()  { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[⚠]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }
step() { echo -e "\n${CYAN}══════════════════════════════════════${NC}"; echo -e "${CYAN}  $1${NC}"; echo -e "${CYAN}══════════════════════════════════════${NC}"; }

# Kiểm tra quyền root
if [ "$EUID" -ne 0 ]; then err "Vui lòng chạy với sudo: sudo ./setup_rpi.sh"; fi

# Biến cấu hình
APP_USER="${SUDO_USER:-pi}"
APP_DIR="/home/$APP_USER/vihand-grade"
NODE_VERSION="20"
SWAP_SIZE=2048
PORT=3000

step "BƯỚC 1/8: Cập nhật hệ thống"
apt update && apt upgrade -y
log "Hệ thống đã cập nhật"

step "BƯỚC 2/8: Cài đặt các gói cần thiết"
apt install -y git curl build-essential python3 ca-certificates gnupg
log "Các gói cơ bản đã cài xong"

step "BƯỚC 3/8: Cài đặt Node.js $NODE_VERSION LTS"
if command -v node &> /dev/null; then
    CURRENT_NODE=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$CURRENT_NODE" -ge "$NODE_VERSION" ]; then
        log "Node.js $(node -v) đã có sẵn, bỏ qua"
    else
        warn "Node.js cũ ($(node -v)), đang nâng cấp..."
        curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
        apt install -y nodejs
    fi
else
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt install -y nodejs
fi
log "Node.js $(node -v) | npm $(npm -v)"

step "BƯỚC 4/8: Cấu hình Swap (${SWAP_SIZE}MB)"
if [ -f /etc/dphys-swapfile ]; then
    dphys-swapfile swapoff 2>/dev/null || true
    sed -i "s/CONF_SWAPSIZE=.*/CONF_SWAPSIZE=$SWAP_SIZE/" /etc/dphys-swapfile
    dphys-swapfile setup
    dphys-swapfile swapon
    log "Swap đã cấu hình: ${SWAP_SIZE}MB"
else
    # Tạo swap thủ công nếu không có dphys-swapfile
    fallocate -l ${SWAP_SIZE}M /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    log "Swap file đã tạo: ${SWAP_SIZE}MB"
fi

step "BƯỚC 5/8: Clone và cài đặt ViHand Grade"
if [ -d "$APP_DIR" ]; then
    warn "Thư mục $APP_DIR đã tồn tại"
    read -p "Ghi đè? (y/N): " confirm
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
        rm -rf "$APP_DIR"
    else
        log "Giữ nguyên thư mục hiện tại"
    fi
fi

if [ ! -d "$APP_DIR" ]; then
    # Nếu đang chạy từ thư mục project, copy thay vì clone
    SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
    if [ -f "$SCRIPT_DIR/package.json" ] && grep -q "next" "$SCRIPT_DIR/package.json"; then
        log "Phát hiện project tại $SCRIPT_DIR, đang copy..."
        cp -r "$SCRIPT_DIR" "$APP_DIR"
    else
        read -p "Nhập Git repo URL (hoặc Enter để bỏ qua): " REPO_URL
        if [ -n "$REPO_URL" ]; then
            sudo -u "$APP_USER" git clone "$REPO_URL" "$APP_DIR"
        else
            err "Không có source code. Copy thư mục project vào $APP_DIR rồi chạy lại."
        fi
    fi
fi

chown -R "$APP_USER:$APP_USER" "$APP_DIR"
cd "$APP_DIR"

# Cài dependencies
log "Đang cài npm dependencies (có thể mất 3-5 phút)..."
sudo -u "$APP_USER" npm install --production=false
log "Dependencies đã cài xong"

step "BƯỚC 6/8: Cấu hình môi trường"
ENV_FILE="$APP_DIR/.env.local"
if [ ! -f "$ENV_FILE" ]; then
    read -p "Nhập GEMINI_API_KEY: " API_KEY
    if [ -z "$API_KEY" ]; then
        warn "Chưa nhập API key, bạn cần tạo file .env.local thủ công sau"
        echo "GEMINI_API_KEY=your_key_here" > "$ENV_FILE"
    else
        echo "GEMINI_API_KEY=$API_KEY" > "$ENV_FILE"
        log "API key đã lưu vào .env.local"
    fi
    chown "$APP_USER:$APP_USER" "$ENV_FILE"
    chmod 600 "$ENV_FILE"
else
    log ".env.local đã tồn tại, giữ nguyên"
fi

# Setup database
log "Đang setup database..."
cd "$APP_DIR"
sudo -u "$APP_USER" npx prisma generate
sudo -u "$APP_USER" npx prisma db push
log "Database SQLite đã sẵn sàng"

step "BƯỚC 7/8: Build production"
log "Đang build Next.js (có thể mất 5-10 phút trên RPi4)..."
cd "$APP_DIR"
sudo -u "$APP_USER" npm run build
log "Build hoàn tất!"

step "BƯỚC 8/8: Tạo systemd service"
cat > /etc/systemd/system/vihand.service << EOF
[Unit]
Description=ViHand Grade - AI Spelling Grading System
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR
ExecStart=$(which node) $APP_DIR/node_modules/.bin/next start -p $PORT
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=$PORT

# Giới hạn tài nguyên cho RPi4
MemoryMax=1G
CPUQuota=80%

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=vihand

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable vihand
systemctl start vihand
log "Service vihand đã chạy"

# ═══════════════════════════════════════
#  HOÀN TẤT
# ═══════════════════════════════════════
IP=$(hostname -I | awk '{print $1}')
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ CÀI ĐẶT HOÀN TẤT!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  🌐 Truy cập: ${CYAN}http://$IP:$PORT${NC}"
echo -e "  📱 Hoặc:     ${CYAN}http://$(hostname).local:$PORT${NC}"
echo ""
echo -e "  📋 Quản lý service:"
echo -e "     Xem trạng thái: ${YELLOW}sudo systemctl status vihand${NC}"
echo -e "     Xem log:        ${YELLOW}sudo journalctl -u vihand -f${NC}"
echo -e "     Khởi động lại:  ${YELLOW}sudo systemctl restart vihand${NC}"
echo -e "     Dừng:           ${YELLOW}sudo systemctl stop vihand${NC}"
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
