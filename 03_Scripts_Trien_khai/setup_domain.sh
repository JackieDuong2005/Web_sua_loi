#!/bin/bash
# ═══════════════════════════════════════════════════════════
#  ViHand Grade — Script gắn tên miền cố định qua Cloudflare
#
#  ĐIỀU KIỆN TRƯỚC KHI CHẠY:
#    1. Đã chạy setup_rpi.sh thành công
#    2. Đã có tên miền (vd: vihandgrade.com) tại Namecheap/Porkbun/...
#    3. Đã chuyển Nameserver tên miền về Cloudflare
#    4. Đã có tài khoản Cloudflare (miễn phí)
#
#  CÁCH DÙNG:
#    chmod +x setup_domain.sh
#    sudo ./setup_domain.sh
# ═══════════════════════════════════════════════════════════

set -e

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

[ "$EUID" -ne 0 ] && err "Vui lòng chạy với sudo: sudo ./setup_domain.sh"

APP_USER="${SUDO_USER:-pi}"
APP_PORT=3000
CF_CONFIG_DIR="/home/$APP_USER/.cloudflared"
CF_BIN="/usr/local/bin/cloudflared"

# Kiểm tra cloudflared đã cài chưa
command -v cloudflared &>/dev/null || err "cloudflared chưa được cài. Chạy setup_rpi.sh trước."

# ══════════════════════════════════════════════════════════
step "BƯỚC 1/5: Nhập thông tin tên miền của bạn"
# ══════════════════════════════════════════════════════════
echo ""
echo "  Ví dụ tên miền: vihandgrade.com, vihand.edu.vn, ..."
echo ""
read -p "  Nhập tên miền của bạn: " DOMAIN
[ -z "$DOMAIN" ] && err "Tên miền không được để trống"

read -p "  Thêm www.${DOMAIN} (y/N): " ADD_WWW

TUNNEL_NAME="vihand-$(echo $DOMAIN | tr '.' '-')"

log "Tên miền: $DOMAIN"
log "Tên tunnel: $TUNNEL_NAME"

# ══════════════════════════════════════════════════════════
step "BƯỚC 2/5: Đăng nhập Cloudflare"
# ══════════════════════════════════════════════════════════
echo ""
echo "  Lệnh sau sẽ mở một đường link."
echo "  Hãy copy link đó vào trình duyệt trên máy tính"
echo "  của bạn và nhấn Authorize để cho phép."
echo ""
read -p "  Nhấn Enter để tiếp tục..."

sudo -u "$APP_USER" cloudflared tunnel login
log "Đăng nhập Cloudflare thành công"

# ══════════════════════════════════════════════════════════
step "BƯỚC 3/5: Tạo Cloudflare Named Tunnel"
# ══════════════════════════════════════════════════════════

# Xóa tunnel cũ cùng tên nếu có
if sudo -u "$APP_USER" cloudflared tunnel list 2>/dev/null | grep -q "$TUNNEL_NAME"; then
  warn "Tunnel '$TUNNEL_NAME' đã tồn tại, đang xóa và tạo lại..."
  sudo -u "$APP_USER" cloudflared tunnel delete "$TUNNEL_NAME" 2>/dev/null || true
fi

sudo -u "$APP_USER" cloudflared tunnel create "$TUNNEL_NAME"
log "Tunnel '$TUNNEL_NAME' đã tạo"

# Lấy Tunnel ID
TUNNEL_ID=$(sudo -u "$APP_USER" cloudflared tunnel list 2>/dev/null \
  | grep "$TUNNEL_NAME" | awk '{print $1}')

[ -z "$TUNNEL_ID" ] && err "Không lấy được Tunnel ID. Kiểm tra lại đăng nhập Cloudflare."
log "Tunnel ID: $TUNNEL_ID"

# ══════════════════════════════════════════════════════════
step "BƯỚC 4/5: Tạo file cấu hình Tunnel"
# ══════════════════════════════════════════════════════════

# Tìm file credentials
CRED_FILE=$(ls $CF_CONFIG_DIR/${TUNNEL_ID}.json 2>/dev/null || echo "")
[ -z "$CRED_FILE" ] && CRED_FILE="$CF_CONFIG_DIR/${TUNNEL_ID}.json"

# Tạo config.yml
cat > "$CF_CONFIG_DIR/config.yml" <<EOF
tunnel: ${TUNNEL_ID}
credentials-file: ${CRED_FILE}
logfile: /var/log/cloudflared.log
loglevel: info

ingress:
  - hostname: ${DOMAIN}
    service: http://localhost:${APP_PORT}
    originRequest:
      connectTimeout: 30s
      noTLSVerify: false
EOF

# Thêm www nếu muốn
if [[ "$ADD_WWW" =~ ^[yY]$ ]]; then
  sed -i "/  - hostname: ${DOMAIN}/i\\  - hostname: www.${DOMAIN}\\n    service: http://localhost:${APP_PORT}\\n    originRequest:\\n      connectTimeout: 30s" "$CF_CONFIG_DIR/config.yml"
fi

# Mục catch-all bắt buộc phải ở cuối
cat >> "$CF_CONFIG_DIR/config.yml" <<EOF
  - service: http_status:404
EOF

chown "$APP_USER:$APP_USER" "$CF_CONFIG_DIR/config.yml"
log "config.yml đã tạo tại $CF_CONFIG_DIR/config.yml"

# Tạo DNS record trên Cloudflare tự động
log "Đang tạo DNS record cho $DOMAIN..."
sudo -u "$APP_USER" cloudflared tunnel route dns "$TUNNEL_NAME" "$DOMAIN"
if [[ "$ADD_WWW" =~ ^[yY]$ ]]; then
  sudo -u "$APP_USER" cloudflared tunnel route dns "$TUNNEL_NAME" "www.$DOMAIN"
  log "DNS record www.$DOMAIN đã tạo"
fi
log "DNS record $DOMAIN đã trỏ về tunnel"

# ══════════════════════════════════════════════════════════
step "BƯỚC 5/5: Cập nhật Systemd Service dùng Named Tunnel"
# ══════════════════════════════════════════════════════════

# Ghi đè service cũ (đang dùng quick tunnel) bằng named tunnel
cat > /etc/systemd/system/cloudflared.service <<EOF
[Unit]
Description=Cloudflare Named Tunnel for ViHand Grade (${DOMAIN})
Documentation=https://developers.cloudflare.com/cloudflare-one/connections/connect-apps
After=network-online.target vihand.service
Wants=network-online.target
Requires=vihand.service

[Service]
Type=simple
User=${APP_USER}

ExecStart=${CF_BIN} tunnel --config ${CF_CONFIG_DIR}/config.yml run
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
log "Service cloudflared đã cập nhật và khởi động lại"

# Đợi tunnel ổn định
sleep 8

# Kiểm tra status
if systemctl is-active --quiet cloudflared; then
  log "Cloudflare Tunnel đang chạy ổn định"
else
  warn "Tunnel có thể chưa kết nối. Kiểm tra log:"
  echo "  sudo journalctl -u cloudflared -f"
fi

# ══════════════════════════════════════════════════════════
#  HOÀN TẤT
# ══════════════════════════════════════════════════════════
echo ""
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  ✅ GẮN TÊN MIỀN HOÀN TẤT!${NC}"
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${CYAN}🌐 Tên miền cố định của bạn:${NC}"
echo -e "     ${GREEN}${BOLD}https://${DOMAIN}${NC}   ← HTTPS miễn phí nhờ Cloudflare"
if [[ "$ADD_WWW" =~ ^[yY]$ ]]; then
echo -e "     ${GREEN}${BOLD}https://www.${DOMAIN}${NC}"
fi
echo ""
echo -e "  ${CYAN}ℹ️  Lưu ý quan trọng:${NC}"
echo -e "     • DNS cần 1-5 phút để lan truyền toàn cầu"
echo -e "     • HTTPS được Cloudflare cấp chứng chỉ tự động"
echo -e "     • Tên miền sẽ hoạt động ngay cả khi IP Pi thay đổi"
echo -e "     • Không cần mở port trên router của trường"
echo ""
echo -e "  ${CYAN}📋 Quản lý tunnel:${NC}"
echo -e "     ${YELLOW}sudo systemctl status cloudflared${NC}   ← Xem trạng thái"
echo -e "     ${YELLOW}sudo journalctl -u cloudflared -f${NC}   ← Xem log realtime"
echo -e "     ${YELLOW}sudo systemctl restart cloudflared${NC}  ← Khởi động lại"
echo -e "     ${YELLOW}cloudflared tunnel list${NC}              ← Xem danh sách tunnel"
echo ""
echo -e "  ${CYAN}🔁 Thứ tự tự động khi bật Raspberry Pi:${NC}"
echo -e "     1. Pi bật nguồn → kết nối WiFi đã lưu"
echo -e "     2. ${YELLOW}vihand.service${NC} tự khởi động Next.js server"
echo -e "     3. ${YELLOW}cloudflared.service${NC} tự kết nối tunnel"
echo -e "     4. Người dùng truy cập ${GREEN}https://${DOMAIN}${NC}"
echo ""
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════════════${NC}"
