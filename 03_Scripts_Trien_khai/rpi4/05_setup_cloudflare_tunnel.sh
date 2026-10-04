#!/bin/bash
# ==============================================================================
# ViHand Grade — Raspberry Pi 4: BƯỚC 5: CẤU HÌNH CLOUDFLARE NAMED TUNNEL
# (Truy cập từ xa qua HTTPS cố định mà không cần IP tĩnh hay mở port router)
# ==============================================================================
set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RED='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[⚠]${NC} $1"; }
err()  { echo -e "${RED}[✗] $1${NC}"; exit 1; }
step() { echo -e "\n${CYAN}${BOLD}═══════════════════════════════════════════════════════════${NC}"; echo -e "${CYAN}${BOLD}  $1${NC}"; echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════${NC}\n"; }

[ "$EUID" -ne 0 ] && err "Vui lòng chạy script với quyền sudo: sudo bash 05_setup_cloudflare_tunnel.sh"

APP_USER="${SUDO_USER:-$(logname 2>/dev/null || echo "pi")}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEMPLATE_DIR="$APP_DIR/03_Scripts_Trien_khai/shared"
CF_CONFIG_DIR="/home/$APP_USER/.cloudflared"
PORT=3000

step "BƯỚC 1/4: KIỂM TRA & CÀI ĐẶT CLOUDFLARED"

if ! command -v cloudflared &>/dev/null; then
    log "Đang tải cloudflared cho ARM64..."
    curl -fsSL "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb" -o /tmp/cloudflared.deb
    dpkg -i /tmp/cloudflared.deb
    rm -f /tmp/cloudflared.deb
    log "Cài đặt cloudflared thành công: $(cloudflared --version)"
else
    log "cloudflared đã có sẵn: $(cloudflared --version)"
fi

step "BƯỚC 2/4: THIẾT LẬP TÊN MIỀN VÀ ĐĂNG NHẬP CLOUDFLARE"

echo -e "  Nhập tên miền bạn muốn gắn vào ViHand Grade (ví dụ: vihandgrade.click hoặc mydomain.com):"
read -rp "  Tên miền: " DOMAIN
[ -z "$DOMAIN" ] && err "Tên miền không được để trống"

TUNNEL_NAME="vihand-$(echo "$DOMAIN" | tr '.' '-')"
mkdir -p "$CF_CONFIG_DIR"
chown "$APP_USER:$APP_USER" "$CF_CONFIG_DIR"

echo -e "\n  ${YELLOW}Lệnh sau sẽ hiển thị đường link ủy quyền Cloudflare.${NC}"
echo -e "  Hãy copy link mở trên trình duyệt, chọn domain ${BOLD}$DOMAIN${NC} và bấm Authorize.\n"
read -rp "  Nhấn [Enter] để tiếp tục..."

sudo -u "$APP_USER" cloudflared tunnel login
log "Đăng nhập Cloudflare thành công."

step "BƯỚC 3/4: TẠO NAMED TUNNEL & CẤU HÌNH INGRESS"

# Xóa tunnel cũ cùng tên nếu có
if sudo -u "$APP_USER" cloudflared tunnel list 2>/dev/null | grep -q "$TUNNEL_NAME"; then
    log "Đang dọn dẹp tunnel cũ '$TUNNEL_NAME'..."
    sudo -u "$APP_USER" cloudflared tunnel cleanup "$TUNNEL_NAME" 2>/dev/null || true
    sudo -u "$APP_USER" cloudflared tunnel delete "$TUNNEL_NAME" 2>/dev/null || true
fi

sudo -u "$APP_USER" cloudflared tunnel create "$TUNNEL_NAME"
TUNNEL_ID=$(sudo -u "$APP_USER" cloudflared tunnel list 2>/dev/null | grep "$TUNNEL_NAME" | awk '{print $1}')
[ -z "$TUNNEL_ID" ] && err "Không lấy được Tunnel ID từ Cloudflare"
log "Đã tạo Tunnel ID: $TUNNEL_ID"

CRED_FILE="$CF_CONFIG_DIR/${TUNNEL_ID}.json"
CONFIG_FILE="$CF_CONFIG_DIR/config.yml"

cat > "$CONFIG_FILE" <<EOF
tunnel: ${TUNNEL_ID}
credentials-file: ${CRED_FILE}
logfile: ${CF_CONFIG_DIR}/cloudflared.log
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
EOF

chown "$APP_USER:$APP_USER" "$CONFIG_FILE"
log "Đã tạo cấu hình $CONFIG_FILE"

# Trỏ bản ghi DNS
log "Trỏ DNS bản ghi ${DOMAIN}..."
sudo -u "$APP_USER" cloudflared tunnel route dns "$TUNNEL_NAME" "$DOMAIN" 2>/dev/null || true
sudo -u "$APP_USER" cloudflared tunnel route dns "$TUNNEL_NAME" "www.$DOMAIN" 2>/dev/null || true

step "BƯỚC 4/4: CẬP NHẬT SYSTEMD SERVICE CHO CLOUDFLARED"

CF_BIN="$(command -v cloudflared || echo "/usr/bin/cloudflared")"
CF_SVC="/etc/systemd/system/cloudflared.service"
sed -e "s|{{APP_USER}}|$APP_USER|g" \
    -e "s|{{CF_CONFIG_DIR}}|$CF_CONFIG_DIR|g" \
    -e "s|{{CLOUDFLARED_BIN}}|$CF_BIN|g" \
    "$TEMPLATE_DIR/cloudflared.service.template" > "$CF_SVC"
chmod 644 "$CF_SVC"

systemctl daemon-reload
systemctl enable cloudflared
systemctl restart cloudflared

sleep 5
if systemctl is-active --quiet cloudflared; then
    log "Cloudflare Tunnel đang hoạt động ổn định ✔"
else
    warn "Tunnel chưa kích hoạt xong. Xem log: sudo journalctl -u cloudflared -n 20"
fi

echo -e "\n${GREEN}${BOLD}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  ✅ [BƯỚC 5 HOÀN TẤT] TÊN MIỀN CLOUDFLARE ĐÃ KẾT NỐI!${NC}"
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════════════${NC}"
echo -e "  🌐 Truy cập toàn cầu bảo mật: ${CYAN}https://${DOMAIN}${NC}"
echo -e "  🌐 Hoặc:                      ${CYAN}https://www.${DOMAIN}${NC}\n"
