#!/bin/bash
# ═══════════════════════════════════════════════════════════
#  ViHand Grade — Script cài đặt tự động cho Raspberry Pi 4
#
#  CÁCH DÙNG:
#    chmod +x setup_rpi.sh
#    sudo ./setup_rpi.sh
#
#  Script này sẽ tự động:
#    1. Cập nhật hệ thống
#    2. Cài Node.js 20 LTS
#    3. Cấu hình Swap 2GB
#    4. Cài dependencies & build Next.js
#    5. Cấu hình biến môi trường
#    6. Khởi tạo database SQLite
#    7. Tạo systemd service tự chạy khi bật Pi
#    8. Cài Cloudflare Tunnel
#    9. Cấu hình WiFi tự kết nối
# ═══════════════════════════════════════════════════════════

set -e

# ─── Màu sắc ───────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log()  { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[⚠]${NC} $1"; }
err()  { echo -e "${RED}[✗] $1${NC}"; exit 1; }
step() {
  echo ""
  echo -e "${CYAN}${BOLD}══════════════════════════════════════════════${NC}"
  echo -e "${CYAN}${BOLD}  $1${NC}"
  echo -e "${CYAN}${BOLD}══════════════════════════════════════════════${NC}"
}

# ─── Kiểm tra quyền root ───────────────────────────────────
[ "$EUID" -ne 0 ] && err "Vui lòng chạy với sudo: sudo ./setup_rpi.sh"

# ─── Biến cấu hình ─────────────────────────────────────────
APP_USER="${SUDO_USER:-pi}"
APP_DIR="/home/$APP_USER/vihand-grade"
NODE_VERSION="20"
SWAP_SIZE=2048
PORT=3000
CF_ARCH="arm64"  # Raspberry Pi 4 dùng arm64
[ "$(uname -m)" = "armv7l" ] && CF_ARCH="arm"

# ══════════════════════════════════════════════════════════
step "BƯỚC 1/9: Cập nhật hệ thống"
# ══════════════════════════════════════════════════════════
apt update && apt upgrade -y
apt install -y git curl wget build-essential python3 \
               ca-certificates gnupg ufw net-tools
log "Hệ thống đã cập nhật xong"

# ══════════════════════════════════════════════════════════
step "BƯỚC 2/9: Cài đặt Node.js $NODE_VERSION LTS"
# ══════════════════════════════════════════════════════════
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

# ══════════════════════════════════════════════════════════
step "BƯỚC 3/9: Cấu hình Swap ${SWAP_SIZE}MB (giúp build Next.js ổn định)"
# ══════════════════════════════════════════════════════════
if [ -f /etc/dphys-swapfile ]; then
  dphys-swapfile swapoff 2>/dev/null || true
  sed -i "s/CONF_SWAPSIZE=.*/CONF_SWAPSIZE=$SWAP_SIZE/" /etc/dphys-swapfile
  dphys-swapfile setup && dphys-swapfile swapon
else
  fallocate -l ${SWAP_SIZE}M /swapfile
  chmod 600 /swapfile
  mkswap /swapfile && swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
log "Swap đã cấu hình: ${SWAP_SIZE}MB"

# ══════════════════════════════════════════════════════════
step "BƯỚC 4/9: Clone / Copy source code ViHand Grade"
# ══════════════════════════════════════════════════════════
if [ -d "$APP_DIR" ]; then
  warn "Thư mục $APP_DIR đã tồn tại"
  read -p "  Ghi đè cài đặt mới? (y/N): " confirm
  [[ "$confirm" =~ ^[yY]$ ]] && rm -rf "$APP_DIR" || log "Giữ nguyên thư mục"
fi

if [ ! -d "$APP_DIR" ]; then
  SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
  if [ -f "$SCRIPT_DIR/package.json" ] && grep -q "next" "$SCRIPT_DIR/package.json"; then
    log "Phát hiện project tại $SCRIPT_DIR, đang copy..."
    cp -r "$SCRIPT_DIR" "$APP_DIR"
    # Xóa các thư mục không cần cho production
    rm -rf "$APP_DIR/.git" "$APP_DIR/.next" "$APP_DIR/node_modules"
    rm -rf "$APP_DIR/01_Bao_cao_Nghien_cuu" "$APP_DIR/02_Kich_ban_Thuc_nghiem"
  else
    read -p "  Nhập Git repo URL (ví dụ: https://github.com/user/repo.git): " REPO_URL
    [ -n "$REPO_URL" ] && sudo -u "$APP_USER" git clone "$REPO_URL" "$APP_DIR" \
      || err "Không có source code. Copy thư mục project vào $APP_DIR rồi chạy lại."
  fi
fi

chown -R "$APP_USER:$APP_USER" "$APP_DIR"
cd "$APP_DIR"

# ══════════════════════════════════════════════════════════
step "BƯỚC 5/9: Cài npm dependencies"
# ══════════════════════════════════════════════════════════
log "Đang cài dependencies (có thể mất 3-5 phút)..."
sudo -u "$APP_USER" npm install --production=false
log "Dependencies đã cài xong"

# ══════════════════════════════════════════════════════════
step "BƯỚC 6/9: Cấu hình biến môi trường (.env.local)"
# ══════════════════════════════════════════════════════════
ENV_FILE="$APP_DIR/.env.local"
if [ ! -f "$ENV_FILE" ]; then
  echo ""
  echo "  Bạn cần Gemini API Key từ: https://aistudio.google.com/app/apikey"
  echo ""
  read -p "  Nhập GEMINI_API_KEY: " API_KEY
  if [ -z "$API_KEY" ]; then
    warn "Chưa nhập, tạo file .env.local mẫu"
    cat > "$ENV_FILE" <<ENVEOF
GEMINI_API_KEY=YOUR_KEY_HERE
DATABASE_URL=file:./prisma/vihand.db
ENVEOF
  else
    cat > "$ENV_FILE" <<ENVEOF
GEMINI_API_KEY=$API_KEY
DATABASE_URL=file:./prisma/vihand.db
ENVEOF
    log "API key đã lưu vào .env.local"
  fi
  chown "$APP_USER:$APP_USER" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
else
  log ".env.local đã tồn tại, giữ nguyên"
fi

# ══════════════════════════════════════════════════════════
step "BƯỚC 7/9: Khởi tạo Database SQLite"
# ══════════════════════════════════════════════════════════
sudo -u "$APP_USER" npx prisma generate
sudo -u "$APP_USER" npx prisma db push
log "Database SQLite đã sẵn sàng"

# ══════════════════════════════════════════════════════════
step "BƯỚC 8/9: Build Next.js Production"
# ══════════════════════════════════════════════════════════
log "Đang build (có thể mất 5-10 phút trên RPi4)..."
sudo -u "$APP_USER" npm run build
log "Build hoàn tất!"

# ══════════════════════════════════════════════════════════
step "BƯỚC 9/9: Tạo Systemd Services (tự chạy khi bật Pi)"
# ══════════════════════════════════════════════════════════

# ── 9a. Service: ViHand Grade App ──────────────────────────
cat > /etc/systemd/system/vihand.service <<EOF
[Unit]
Description=ViHand Grade - AI Spelling Grading System
Documentation=https://github.com/JackieDuong2005/Web_sua_loi
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR
EnvironmentFile=$APP_DIR/.env.local
Environment=NODE_ENV=production
Environment=PORT=$PORT

ExecStart=$(which node) $APP_DIR/node_modules/.bin/next start -p $PORT
ExecReload=/bin/kill -HUP \$MAINPID

Restart=always
RestartSec=10
StartLimitIntervalSec=120
StartLimitBurst=5

# Giới hạn tài nguyên phù hợp RPi4 4GB
MemoryMax=1500M
CPUQuota=85%

# Logging vào journald
StandardOutput=journal
StandardError=journal
SyslogIdentifier=vihand

[Install]
WantedBy=multi-user.target
EOF
log "Service vihand.service đã tạo"

# ── 9b. Cài Cloudflare Tunnel ───────────────────────────────
if ! command -v cloudflared &> /dev/null; then
  log "Đang tải cloudflared ($CF_ARCH)..."
  curl -fsSL "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${CF_ARCH}.deb" \
    -o /tmp/cloudflared.deb
  dpkg -i /tmp/cloudflared.deb
  rm -f /tmp/cloudflared.deb
  log "cloudflared đã cài xong: $(cloudflared --version)"
else
  log "cloudflared đã có: $(cloudflared --version)"
fi

# ── 9c. Service: Cloudflare Tunnel ─────────────────────────
# Dùng Quick Tunnel trước. Sau đó chạy setup_domain.sh để gắn tên miền cố định.
cat > /etc/systemd/system/cloudflared.service <<EOF
[Unit]
Description=Cloudflare Tunnel for ViHand Grade
Documentation=https://developers.cloudflare.com/cloudflare-one/connections/connect-apps
After=network-online.target vihand.service
Wants=network-online.target
Requires=vihand.service

[Service]
Type=simple
User=$APP_USER

# Chạy quick tunnel (URL tạm thời). Thay bằng named tunnel sau khi chạy setup_domain.sh
ExecStart=/usr/local/bin/cloudflared tunnel --url http://localhost:${PORT} --no-autoupdate

Restart=always
RestartSec=15
StandardOutput=journal
StandardError=journal
SyslogIdentifier=cloudflared

[Install]
WantedBy=multi-user.target
EOF
log "Service cloudflared.service đã tạo"

# ── 9d. Kích hoạt tất cả services ──────────────────────────
systemctl daemon-reload
systemctl enable vihand cloudflared
systemctl start vihand

# Đợi app khởi động xong rồi mới bật tunnel
sleep 8
systemctl start cloudflared

# ══════════════════════════════════════════════════════════
#  HOÀN TẤT
# ══════════════════════════════════════════════════════════
IP=$(hostname -I | awk '{print $1}')
TUNNEL_URL=$(journalctl -u cloudflared -n 30 --no-pager 2>/dev/null \
  | grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1)

echo ""
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  ✅ CÀI ĐẶT HOÀN TẤT!${NC}"
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${CYAN}📶 Trong mạng WiFi (LAN):${NC}"
echo -e "     ${BOLD}http://${IP}:${PORT}${NC}"
echo ""
echo -e "  ${CYAN}🌐 Từ Internet (URL tạm thời):${NC}"
if [ -n "$TUNNEL_URL" ]; then
  echo -e "     ${GREEN}${BOLD}${TUNNEL_URL}${NC}"
  warn "URL này thay đổi mỗi lần restart cloudflared"
  echo -e "     → Chạy ${YELLOW}./setup_domain.sh${NC} để gắn tên miền cố định"
else
  echo -e "     ${YELLOW}Tunnel đang khởi tạo... Kiểm tra bằng:${NC}"
  echo -e "     ${YELLOW}sudo journalctl -u cloudflared -f${NC}"
fi
echo ""
echo -e "  ${CYAN}📋 Lệnh quản lý:${NC}"
echo -e "     ${YELLOW}sudo systemctl status vihand${NC}        ← Xem trạng thái app"
echo -e "     ${YELLOW}sudo journalctl -u vihand -f${NC}        ← Xem log realtime"
echo -e "     ${YELLOW}sudo systemctl restart vihand${NC}       ← Khởi động lại app"
echo -e "     ${YELLOW}sudo journalctl -u cloudflared -f${NC}   ← Xem log tunnel"
echo ""
echo -e "  ${CYAN}⚙️  Bước tiếp theo:${NC}"
echo -e "     Chạy ${YELLOW}sudo ./setup_domain.sh${NC} để gắn tên miền riêng"
echo ""
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════════════${NC}"
