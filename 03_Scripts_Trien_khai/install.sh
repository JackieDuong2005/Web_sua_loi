#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════
#  ViHand Grade — ONE-CLICK INSTALL cho Raspberry Pi 4
#
#  File này tự động hóa 100% quá trình triển khai.
#  Chạy DUY NHẤT 1 lệnh:
#
#    chmod +x install.sh && sudo ./install.sh
#
#  Sau khi chạy xong, bật Pi lên là server tự hoạt động,
#  người dùng truy cập https://vihandgrade.click
# ═══════════════════════════════════════════════════════════════════════

set -e

# ┌─────────────────────────────────────────────────────────────────────┐
# │                    CẤU HÌNH — ĐÃ THU THẬP TỰ ĐỘNG                 │
# └─────────────────────────────────────────────────────────────────────┘

# WiFi trường học / nhà
WIFI_SSID="Tuyet Nhi"
WIFI_PASS="yuki.nhii2301"

# Mạng LAN
STATIC_IP="192.168.1.100"
GATEWAY="192.168.1.1"
DNS_SERVER="8.8.8.8"

# Tên miền Cloudflare (đã trỏ nameserver)
DOMAIN="vihandgrade.click"
ADD_WWW="y"

# API Key
GEMINI_API_KEY="AIzaSyCu2PS9KmstaSMX695jCEp66t1Vc-nqbdQ"

# GitHub repo
REPO_URL="https://github.com/JackieDuong2005/Web_sua_loi.git"

# Raspberry Pi settings
APP_USER="${SUDO_USER:-pi}"
APP_DIR="/home/$APP_USER/vihand-grade"
NODE_VERSION="20"
SWAP_SIZE=2048
PORT=3000

# ┌─────────────────────────────────────────────────────────────────────┐
# │                          HÀM TIỆN ÍCH                             │
# └─────────────────────────────────────────────────────────────────────┘
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log()  { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[⚠]${NC} $1"; }
err()  { echo -e "${RED}[✗] $1${NC}"; exit 1; }
step() {
  echo ""
  echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════${NC}"
  echo -e "${CYAN}${BOLD}  $1${NC}"
  echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════${NC}"
}

# ── Kiểm tra quyền root ────────────────────────────────────────────────
[ "$EUID" -ne 0 ] && err "Vui lòng chạy với sudo: sudo ./install.sh"

echo ""
echo -e "${GREEN}${BOLD}"
echo "  ██╗   ██╗██╗██╗  ██╗ █████╗ ███╗   ██╗██████╗ "
echo "  ██║   ██║██║██║  ██║██╔══██╗████╗  ██║██╔══██╗"
echo "  ██║   ██║██║███████║███████║██╔██╗ ██║██║  ██║"
echo "  ╚██╗ ██╔╝██║██╔══██║██╔══██║██║╚██╗██║██║  ██║"
echo "   ╚████╔╝ ██║██║  ██║██║  ██║██║ ╚████║██████╔╝"
echo "    ╚═══╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═════╝ "
echo "            G R A D E   —   I N S T A L L E R"
echo -e "${NC}"
echo -e "  Tên miền:  ${CYAN}${DOMAIN}${NC}"
echo -e "  WiFi:      ${CYAN}${WIFI_SSID}${NC}"
echo -e "  IP tĩnh:   ${CYAN}${STATIC_IP}${NC}"
echo -e "  Repo:      ${CYAN}${REPO_URL}${NC}"
echo ""
echo -e "  ${YELLOW}Quá trình cài đặt sẽ mất khoảng 15-20 phút.${NC}"
echo ""
read -p "  Nhấn Enter để bắt đầu (Ctrl+C để hủy)..."

# ═══════════════════════════════════════════════════════════════════════
step "PHẦN 1/6: CẬP NHẬT HỆ THỐNG & CÀI GÓI CẦN THIẾT"
# ═══════════════════════════════════════════════════════════════════════
apt update && apt upgrade -y
apt install -y git curl wget build-essential python3 \
               ca-certificates gnupg ufw net-tools
log "Hệ thống đã cập nhật"

# ═══════════════════════════════════════════════════════════════════════
step "PHẦN 2/6: CÀI ĐẶT NODE.JS ${NODE_VERSION} LTS & SWAP"
# ═══════════════════════════════════════════════════════════════════════

# ── Node.js ────────────────────────────────────────────────────────────
if command -v node &> /dev/null; then
  CURRENT_NODE=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
  if [ "$CURRENT_NODE" -ge "$NODE_VERSION" ]; then
    log "Node.js $(node -v) đã có sẵn"
  else
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt install -y nodejs
  fi
else
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
  apt install -y nodejs
fi
log "Node.js $(node -v) | npm $(npm -v)"

# ── Swap ───────────────────────────────────────────────────────────────
if [ -f /etc/dphys-swapfile ]; then
  dphys-swapfile swapoff 2>/dev/null || true
  sed -i "s/CONF_SWAPSIZE=.*/CONF_SWAPSIZE=$SWAP_SIZE/" /etc/dphys-swapfile
  dphys-swapfile setup && dphys-swapfile swapon
else
  if [ ! -f /swapfile ]; then
    fallocate -l ${SWAP_SIZE}M /swapfile
    chmod 600 /swapfile
    mkswap /swapfile && swapon /swapfile
    grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  fi
fi
log "Swap: ${SWAP_SIZE}MB"

# ═══════════════════════════════════════════════════════════════════════
step "PHẦN 3/6: TẢI MÃ NGUỒN & BUILD ỨNG DỤNG"
# ═══════════════════════════════════════════════════════════════════════

# ── Clone repo ─────────────────────────────────────────────────────────
if [ -d "$APP_DIR" ]; then
  warn "Thư mục $APP_DIR đã tồn tại, đang cập nhật..."
  cd "$APP_DIR"
  sudo -u "$APP_USER" git pull origin main 2>/dev/null || true
else
  sudo -u "$APP_USER" git clone "$REPO_URL" "$APP_DIR"
fi

# Xóa thư mục không cần cho production
rm -rf "$APP_DIR/01_Bao_cao_Nghien_cuu" "$APP_DIR/02_Kich_ban_Thuc_nghiem" 2>/dev/null || true

chown -R "$APP_USER:$APP_USER" "$APP_DIR"
cd "$APP_DIR"

# ── Tạo .env.local ────────────────────────────────────────────────────
cat > "$APP_DIR/.env.local" <<ENVEOF
GEMINI_API_KEY=${GEMINI_API_KEY}
DATABASE_URL=file:./prisma/vihand.db
ENVEOF
chown "$APP_USER:$APP_USER" "$APP_DIR/.env.local"
chmod 600 "$APP_DIR/.env.local"
log "File .env.local đã tạo"

# ── Cài dependencies ──────────────────────────────────────────────────
log "Đang cài npm dependencies (3-5 phút)..."
sudo -u "$APP_USER" npm install --production=false
log "Dependencies đã cài"

# ── Database ───────────────────────────────────────────────────────────
sudo -u "$APP_USER" npx prisma generate
sudo -u "$APP_USER" npx prisma db push
log "Database SQLite đã sẵn sàng"

# ── Build ──────────────────────────────────────────────────────────────
log "Đang build Next.js production (5-10 phút)..."
sudo -u "$APP_USER" npm run build
log "Build hoàn tất!"

# ═══════════════════════════════════════════════════════════════════════
step "PHẦN 4/6: CẤU HÌNH WIFI TỰ KẾT NỐI & IP TĨNH"
# ═══════════════════════════════════════════════════════════════════════

# ── WiFi ───────────────────────────────────────────────────────────────
if command -v nmcli &>/dev/null; then
  nmcli device wifi connect "$WIFI_SSID" password "$WIFI_PASS" 2>/dev/null || true
  nmcli connection modify "$WIFI_SSID" connection.autoconnect yes connection.autoconnect-priority 100 2>/dev/null || true

  # IP tĩnh qua NetworkManager
  nmcli connection modify "$WIFI_SSID" \
    ipv4.method manual \
    ipv4.addresses "${STATIC_IP}/24" \
    ipv4.gateway "$GATEWAY" \
    ipv4.dns "$DNS_SERVER 8.8.4.4" 2>/dev/null || true
  nmcli connection up "$WIFI_SSID" 2>/dev/null || true
  log "WiFi '$WIFI_SSID' (NetworkManager): auto-connect + IP tĩnh $STATIC_IP"
else
  # wpa_supplicant (Pi OS cũ)
  WPA_CONF="/etc/wpa_supplicant/wpa_supplicant.conf"
  if ! grep -q "$WIFI_SSID" "$WPA_CONF" 2>/dev/null; then
    cat >> "$WPA_CONF" <<WPAEOF
ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1
country=VN

network={
    ssid="$WIFI_SSID"
    psk="$WIFI_PASS"
    key_mgmt=WPA-PSK
    priority=1
}
WPAEOF
    wpa_cli -i wlan0 reconfigure 2>/dev/null || true
  fi

  # IP tĩnh qua dhcpcd
  if ! grep -q "ViHand" /etc/dhcpcd.conf 2>/dev/null; then
    cat >> /etc/dhcpcd.conf <<DHCPEOF

# ViHand Grade - IP tĩnh
interface wlan0
static ip_address=${STATIC_IP}/24
static routers=${GATEWAY}
static domain_name_servers=${DNS_SERVER} 8.8.4.4
DHCPEOF
  fi
  log "WiFi '$WIFI_SSID' (wpa_supplicant): auto-connect + IP tĩnh $STATIC_IP"
fi

# ── Firewall ──────────────────────────────────────────────────────────
ufw default deny incoming 2>/dev/null || true
ufw default allow outgoing 2>/dev/null || true
ufw allow ssh 2>/dev/null || true
ufw allow $PORT/tcp 2>/dev/null || true
ufw --force enable 2>/dev/null || true
log "Firewall: SSH(22) + App($PORT) đã mở"

# ═══════════════════════════════════════════════════════════════════════
step "PHẦN 5/6: TẠO SYSTEMD SERVICES (TỰ CHẠY KHI BẬT PI)"
# ═══════════════════════════════════════════════════════════════════════

# ── Service: ViHand Grade App ──────────────────────────────────────────
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

MemoryMax=1500M
CPUQuota=85%

StandardOutput=journal
StandardError=journal
SyslogIdentifier=vihand

[Install]
WantedBy=multi-user.target
EOF
log "Service vihand.service đã tạo"

# ── Cài cloudflared ────────────────────────────────────────────────────
CF_ARCH="arm64"
[ "$(uname -m)" = "armv7l" ] && CF_ARCH="arm"

if ! command -v cloudflared &> /dev/null; then
  log "Đang tải cloudflared ($CF_ARCH)..."
  curl -fsSL "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${CF_ARCH}.deb" \
    -o /tmp/cloudflared.deb
  dpkg -i /tmp/cloudflared.deb
  rm -f /tmp/cloudflared.deb
  log "cloudflared $(cloudflared --version)"
else
  log "cloudflared đã có: $(cloudflared --version)"
fi

# ── Service: Cloudflare Quick Tunnel (tạm thời) ───────────────────────
# Sẽ được thay thế bằng Named Tunnel sau bước đăng nhập Cloudflare
cat > /etc/systemd/system/cloudflared.service <<EOF
[Unit]
Description=Cloudflare Tunnel for ViHand Grade
After=network-online.target vihand.service
Wants=network-online.target
Requires=vihand.service

[Service]
Type=simple
User=$APP_USER
ExecStart=/usr/local/bin/cloudflared tunnel --url http://localhost:${PORT} --no-autoupdate
Restart=always
RestartSec=15
StandardOutput=journal
StandardError=journal
SyslogIdentifier=cloudflared

[Install]
WantedBy=multi-user.target
EOF

# ── Kích hoạt services ────────────────────────────────────────────────
systemctl daemon-reload
systemctl enable vihand cloudflared
systemctl start vihand
sleep 8
systemctl start cloudflared
log "Cả 2 services đã chạy"

# ═══════════════════════════════════════════════════════════════════════
step "PHẦN 6/6: GẮN TÊN MIỀN ${DOMAIN} QUA CLOUDFLARE TUNNEL"
# ═══════════════════════════════════════════════════════════════════════
echo ""
echo -e "  ${YELLOW}${BOLD}BÂY GIỜ CẦN ĐĂNG NHẬP CLOUDFLARE (CHỈ 1 LẦN DUY NHẤT)${NC}"
echo ""
echo -e "  Khi lệnh bên dưới chạy, nó sẽ hiển thị 1 đường link."
echo -e "  Hãy ${BOLD}copy link đó${NC} → dán vào trình duyệt trên máy tính"
echo -e "  → đăng nhập tài khoản Cloudflare → bấm ${GREEN}Authorize${NC}."
echo ""
read -p "  Nhấn Enter khi đã sẵn sàng..."

# Đăng nhập Cloudflare
sudo -u "$APP_USER" cloudflared tunnel login

TUNNEL_NAME="vihand-$(echo $DOMAIN | tr '.' '-')"
CF_CONFIG_DIR="/home/$APP_USER/.cloudflared"

# Xóa tunnel cũ nếu có
if sudo -u "$APP_USER" cloudflared tunnel list 2>/dev/null | grep -q "$TUNNEL_NAME"; then
  sudo -u "$APP_USER" cloudflared tunnel cleanup "$TUNNEL_NAME" 2>/dev/null || true
  sudo -u "$APP_USER" cloudflared tunnel delete "$TUNNEL_NAME" 2>/dev/null || true
fi

# Tạo Named Tunnel
sudo -u "$APP_USER" cloudflared tunnel create "$TUNNEL_NAME"
log "Tunnel '$TUNNEL_NAME' đã tạo"

# Lấy Tunnel ID
TUNNEL_ID=$(sudo -u "$APP_USER" cloudflared tunnel list 2>/dev/null \
  | grep "$TUNNEL_NAME" | awk '{print $1}')
[ -z "$TUNNEL_ID" ] && err "Không lấy được Tunnel ID"
log "Tunnel ID: $TUNNEL_ID"

# Tạo config.yml
CRED_FILE="$CF_CONFIG_DIR/${TUNNEL_ID}.json"
cat > "$CF_CONFIG_DIR/config.yml" <<CFEOF
tunnel: ${TUNNEL_ID}
credentials-file: ${CRED_FILE}
logfile: /var/log/cloudflared.log
loglevel: info

ingress:
  - hostname: ${DOMAIN}
    service: http://localhost:${PORT}
    originRequest:
      connectTimeout: 30s
  - hostname: www.${DOMAIN}
    service: http://localhost:${PORT}
    originRequest:
      connectTimeout: 30s
  - service: http_status:404
CFEOF
chown "$APP_USER:$APP_USER" "$CF_CONFIG_DIR/config.yml"
log "config.yml đã tạo"

# Tạo DNS records trên Cloudflare
sudo -u "$APP_USER" cloudflared tunnel route dns "$TUNNEL_NAME" "$DOMAIN"
sudo -u "$APP_USER" cloudflared tunnel route dns "$TUNNEL_NAME" "www.$DOMAIN"
log "DNS records đã trỏ về tunnel"

# Cập nhật systemd service → dùng Named Tunnel thay Quick Tunnel
cat > /etc/systemd/system/cloudflared.service <<EOF
[Unit]
Description=Cloudflare Named Tunnel — ${DOMAIN}
Documentation=https://developers.cloudflare.com/cloudflare-one/connections/connect-apps
After=network-online.target vihand.service
Wants=network-online.target
Requires=vihand.service

[Service]
Type=simple
User=${APP_USER}
ExecStart=/usr/local/bin/cloudflared tunnel --config ${CF_CONFIG_DIR}/config.yml run
ExecReload=/bin/kill -HUP \$MAINPID
Restart=always
RestartSec=15
StartLimitIntervalSec=300
StartLimitBurst=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=cloudflared

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl restart cloudflared
sleep 8

# Kiểm tra
if systemctl is-active --quiet cloudflared; then
  log "Cloudflare Named Tunnel đang chạy ổn định!"
else
  warn "Tunnel có thể chưa kết nối. Kiểm tra: sudo journalctl -u cloudflared -f"
fi

# ═══════════════════════════════════════════════════════════════════════
#  HOÀN TẤT TOÀN BỘ QUÁ TRÌNH CÀI ĐẶT
# ═══════════════════════════════════════════════════════════════════════
echo ""
echo -e "${GREEN}${BOLD}"
echo "  ═══════════════════════════════════════════════════════"
echo "   ✅  CÀI ĐẶT HOÀN TẤT 100%!"
echo "  ═══════════════════════════════════════════════════════"
echo -e "${NC}"
echo ""
echo -e "  ${CYAN}${BOLD}🌐 TRUY CẬP TỪ BẤT KỲ ĐÂU:${NC}"
echo -e "     ${GREEN}${BOLD}https://${DOMAIN}${NC}"
echo -e "     ${GREEN}${BOLD}https://www.${DOMAIN}${NC}"
echo ""
echo -e "  ${CYAN}📶 Trong mạng WiFi '${WIFI_SSID}':${NC}"
echo -e "     ${BOLD}http://${STATIC_IP}:${PORT}${NC}"
echo ""
echo -e "  ${CYAN}🔁 Khi bật Pi lần sau — mọi thứ TỰ ĐỘNG:${NC}"
echo -e "     1. Pi tự kết nối WiFi '${WIFI_SSID}'"
echo -e "     2. Next.js server tự khởi động"
echo -e "     3. Cloudflare Tunnel tự kết nối"
echo -e "     4. ${GREEN}https://${DOMAIN}${NC} sẵn sàng hoạt động"
echo ""
echo -e "  ${CYAN}📋 Lệnh quản lý:${NC}"
echo -e "     ${YELLOW}sudo systemctl status vihand cloudflared${NC}"
echo -e "     ${YELLOW}sudo journalctl -u vihand -f${NC}"
echo -e "     ${YELLOW}sudo journalctl -u cloudflared -f${NC}"
echo -e "     ${YELLOW}sudo systemctl restart vihand cloudflared${NC}"
echo ""
echo -e "  ${GREEN}${BOLD}═══════════════════════════════════════════════════════${NC}"
echo ""
