#!/bin/bash
# ═══════════════════════════════════════════════════════════
#  ViHand Grade — Script cấu hình mạng cho Raspberry Pi 4
#  Cho phép truy cập từ WiFi trường + Internet bên ngoài
#  Chạy: chmod +x setup_network.sh && sudo ./setup_network.sh
# ═══════════════════════════════════════════════════════════

set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[⚠]${NC} $1"; }
step() { echo -e "\n${CYAN}══════════════════════════════════════${NC}"; echo -e "${CYAN}  $1${NC}"; echo -e "${CYAN}══════════════════════════════════════${NC}"; }

if [ "$EUID" -ne 0 ]; then echo -e "${RED}[✗] Chạy với sudo: sudo ./setup_network.sh${NC}"; exit 1; fi

APP_PORT=3000

# ─────────────────────────────────────
step "BƯỚC 1/5: Cấu hình IP tĩnh cho WiFi trường"
# ─────────────────────────────────────

echo ""
echo "Cấu hình IP tĩnh giúp RPi luôn có cùng địa chỉ IP trong mạng trường."
echo ""
read -p "Nhập IP tĩnh mong muốn (VD: 192.168.1.100): " STATIC_IP
read -p "Nhập Gateway (VD: 192.168.1.1): " GATEWAY
read -p "Nhập DNS (Enter = 8.8.8.8): " DNS
DNS=${DNS:-8.8.8.8}

# Cấu hình qua dhcpcd
cat >> /etc/dhcpcd.conf << EOF

# ViHand Grade - Static IP
interface wlan0
static ip_address=${STATIC_IP}/24
static routers=${GATEWAY}
static domain_name_servers=${DNS} 8.8.4.4
EOF

log "IP tĩnh đã cấu hình: $STATIC_IP"

# ─────────────────────────────────────
step "BƯỚC 2/5: Mở firewall cho port $APP_PORT"
# ─────────────────────────────────────

# Cài ufw nếu chưa có
if ! command -v ufw &> /dev/null; then
    apt install -y ufw
fi

ufw allow ssh
ufw allow $APP_PORT/tcp
ufw --force enable
log "Firewall đã mở port $APP_PORT"

# ─────────────────────────────────────
step "BƯỚC 3/5: Cài Cloudflare Tunnel (truy cập từ internet)"
# ─────────────────────────────────────

echo ""
echo "Cloudflare Tunnel cho phép mọi người truy cập ViHand Grade"
echo "từ internet mà KHÔNG cần mở port trên router trường."
echo ""

# Detect architecture
ARCH=$(uname -m)
if [ "$ARCH" = "aarch64" ]; then
    CF_ARCH="arm64"
elif [ "$ARCH" = "armv7l" ]; then
    CF_ARCH="arm"
else
    CF_ARCH="amd64"
fi

# Cài cloudflared
if ! command -v cloudflared &> /dev/null; then
    log "Đang tải cloudflared cho $ARCH..."
    curl -L "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${CF_ARCH}" -o /usr/local/bin/cloudflared
    chmod +x /usr/local/bin/cloudflared
    log "cloudflared đã cài xong"
else
    log "cloudflared đã có sẵn"
fi

# ─────────────────────────────────────
step "BƯỚC 4/5: Tạo Cloudflare Tunnel service"
# ─────────────────────────────────────

cat > /etc/systemd/system/cloudflared.service << EOF
[Unit]
Description=Cloudflare Tunnel for ViHand Grade
After=network-online.target vihand.service
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/local/bin/cloudflared tunnel --url http://localhost:${APP_PORT} --no-autoupdate
Restart=always
RestartSec=15
User=nobody

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable cloudflared
systemctl start cloudflared
log "Cloudflare Tunnel service đã chạy"

# Đợi tunnel khởi tạo
sleep 5

# ─────────────────────────────────────
step "BƯỚC 5/5: Kiểm tra kết nối"
# ─────────────────────────────────────

# Lấy URL tunnel từ log
TUNNEL_URL=$(journalctl -u cloudflared -n 20 --no-pager 2>/dev/null | grep -oP 'https://[a-z0-9-]+\.trycloudflare\.com' | tail -1)

IP=$(hostname -I | awk '{print $1}')

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ CẤU HÌNH MẠNG HOÀN TẤT!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${CYAN}📶 TRUY CẬP TRONG MẠNG TRƯỜNG (WiFi/LAN):${NC}"
echo -e "     http://${STATIC_IP}:${APP_PORT}"
echo ""
echo -e "  ${CYAN}🌐 TRUY CẬP TỪ INTERNET (mọi nơi):${NC}"
if [ -n "$TUNNEL_URL" ]; then
    echo -e "     ${GREEN}${TUNNEL_URL}${NC}"
else
    echo -e "     ${YELLOW}Đang khởi tạo... Kiểm tra bằng:${NC}"
    echo -e "     sudo journalctl -u cloudflared -f"
fi
echo ""
echo -e "  ${CYAN}📋 Quản lý:${NC}"
echo -e "     Xem URL tunnel:  ${YELLOW}sudo journalctl -u cloudflared | grep trycloudflare${NC}"
echo -e "     Restart tunnel:  ${YELLOW}sudo systemctl restart cloudflared${NC}"
echo -e "     Restart server:  ${YELLOW}sudo systemctl restart vihand${NC}"
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
