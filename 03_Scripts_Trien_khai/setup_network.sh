#!/bin/bash
# ═══════════════════════════════════════════════════════════
#  ViHand Grade — Script cấu hình WiFi tự kết nối khi boot
#
#  CÁCH DÙNG:
#    chmod +x setup_network.sh
#    sudo ./setup_network.sh
#
#  Script này sẽ:
#    1. Lưu thông tin WiFi để Pi tự kết nối khi bật nguồn
#    2. Cấu hình IP tĩnh trên mạng LAN trường
#    3. Kiểm tra kết nối mạng và dịch vụ
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

[ "$EUID" -ne 0 ] && err "Vui lòng chạy với sudo: sudo ./setup_network.sh"

APP_PORT=3000

# ══════════════════════════════════════════════════════════
step "BƯỚC 1/4: Cấu hình WiFi tự động kết nối khi bật Pi"
# ══════════════════════════════════════════════════════════
echo ""
echo "  Nhập thông tin WiFi của trường học."
echo "  Pi sẽ tự kết nối mạng này mỗi khi bật nguồn."
echo ""
read -p "  Tên WiFi (SSID): " WIFI_SSID
[ -z "$WIFI_SSID" ] && err "Tên WiFi không được để trống"

read -s -p "  Mật khẩu WiFi: " WIFI_PASS
echo ""

# Kiểm tra NetworkManager hoặc wpa_supplicant
if command -v nmcli &>/dev/null; then
  # ── Cách 1: Dùng NetworkManager (Raspberry Pi OS mới) ──
  log "Dùng NetworkManager để cấu hình WiFi..."

  # Kết nối WiFi
  nmcli device wifi connect "$WIFI_SSID" password "$WIFI_PASS" 2>/dev/null \
    && log "Kết nối WiFi '$WIFI_SSID' thành công!" \
    || warn "Chưa kết nối được (có thể Pi đang không trong vùng phủ sóng WiFi đó)"

  # Đảm bảo auto-connect khi boot
  nmcli connection modify "$WIFI_SSID" \
    connection.autoconnect yes \
    connection.autoconnect-priority 100 \
    2>/dev/null || true

  log "WiFi '$WIFI_SSID' đã đặt tự động kết nối khi bật Pi"

else
  # ── Cách 2: Dùng wpa_supplicant (Raspberry Pi OS cũ) ──
  log "Dùng wpa_supplicant để cấu hình WiFi..."

  WPA_CONF="/etc/wpa_supplicant/wpa_supplicant.conf"

  # Tạo/cập nhật wpa_supplicant.conf
  if ! grep -q "country=" "$WPA_CONF" 2>/dev/null; then
    cat > "$WPA_CONF" <<WPAEOF
ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1
country=VN
WPAEOF
  fi

  # Thêm mạng WiFi
  wpa_passphrase "$WIFI_SSID" "$WIFI_PASS" >> "$WPA_CONF"

  # Kích hoạt
  wpa_cli -i wlan0 reconfigure 2>/dev/null || true
  log "WiFi '$WIFI_SSID' đã lưu vào wpa_supplicant.conf"
fi

# ══════════════════════════════════════════════════════════
step "BƯỚC 2/4: Cấu hình IP tĩnh (giữ địa chỉ ổn định trong mạng trường)"
# ══════════════════════════════════════════════════════════
echo ""
echo "  IP tĩnh giúp giáo viên luôn truy cập cùng một địa chỉ."
echo "  Nếu bỏ qua, Pi sẽ dùng IP động (có thể thay đổi)."
echo ""
read -p "  Bạn muốn cấu hình IP tĩnh? (y/N): " WANT_STATIC

if [[ "$WANT_STATIC" =~ ^[yY]$ ]]; then
  read -p "  Nhập IP tĩnh mong muốn (VD: 192.168.1.100): " STATIC_IP
  read -p "  Nhập Gateway/Router (VD: 192.168.1.1): ":  GATEWAY
  read -p "  DNS server (Enter = 8.8.8.8): " DNS_SERVER
  DNS_SERVER="${DNS_SERVER:-8.8.8.8}"

  if command -v nmcli &>/dev/null; then
    # NetworkManager: cấu hình IP tĩnh
    nmcli connection modify "$WIFI_SSID" \
      ipv4.method manual \
      ipv4.addresses "${STATIC_IP}/24" \
      ipv4.gateway "$GATEWAY" \
      ipv4.dns "$DNS_SERVER 8.8.4.4" \
      2>/dev/null || warn "Không thể đặt IP tĩnh qua NetworkManager"
    nmcli connection up "$WIFI_SSID" 2>/dev/null || true
  else
    # dhcpcd: cấu hình IP tĩnh
    DHCPCD_CONF="/etc/dhcpcd.conf"
    # Xóa cấu hình cũ nếu có
    sed -i '/# ViHand Grade/,/domain_name_servers/d' "$DHCPCD_CONF" 2>/dev/null || true
    cat >> "$DHCPCD_CONF" <<DHCPEOF

# ViHand Grade - IP tĩnh WiFi trường
interface wlan0
static ip_address=${STATIC_IP}/24
static routers=${GATEWAY}
static domain_name_servers=${DNS_SERVER} 8.8.4.4
DHCPEOF
    systemctl restart dhcpcd 2>/dev/null || true
  fi

  log "IP tĩnh đã cấu hình: $STATIC_IP"
  LOCAL_ADDR="$STATIC_IP"
else
  warn "Sẽ dùng IP động (DHCP). Pi có thể đổi địa chỉ sau khi reboot."
  LOCAL_ADDR=$(hostname -I | awk '{print $1}')
fi

# ══════════════════════════════════════════════════════════
step "BƯỚC 3/4: Cấu hình Firewall"
# ══════════════════════════════════════════════════════════
if ! command -v ufw &>/dev/null; then
  apt install -y ufw
fi

ufw default deny incoming
ufw default allow outgoing
ufw allow ssh comment "SSH quản trị"
ufw allow $APP_PORT/tcp comment "ViHand Grade Web App"
ufw --force enable
log "Firewall đã mở: SSH (22) và Web App ($APP_PORT)"

# ══════════════════════════════════════════════════════════
step "BƯỚC 4/4: Kiểm tra trạng thái tổng thể"
# ══════════════════════════════════════════════════════════
echo ""

# Kiểm tra các services
check_service() {
  if systemctl is-active --quiet "$1" 2>/dev/null; then
    log "Service $1: ${GREEN}đang chạy ✔${NC}"
  else
    warn "Service $1: chưa chạy (chạy 'sudo systemctl start $1')"
  fi
}

check_service vihand
check_service cloudflared

# Kiểm tra kết nối internet
if curl -s --max-time 5 https://cloudflare.com > /dev/null; then
  log "Kết nối Internet: OK"
else
  warn "Không có kết nối Internet. Cloudflare Tunnel sẽ không hoạt động."
fi

# ══════════════════════════════════════════════════════════
#  HOÀN TẤT
# ══════════════════════════════════════════════════════════
CURRENT_IP=$(hostname -I | awk '{print $1}')

echo ""
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  ✅ CẤU HÌNH MẠNG HOÀN TẤT!${NC}"
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${CYAN}📶 Truy cập trong mạng WiFi trường:${NC}"
echo -e "     ${GREEN}${BOLD}http://${CURRENT_IP}:${APP_PORT}${NC}"
echo ""
echo -e "  ${CYAN}🔁 Khi bật Raspberry Pi:${NC}"
echo -e "     1. Pi tự kết nối WiFi '${WIFI_SSID}'"
echo -e "     2. ${YELLOW}vihand.service${NC} tự khởi động Next.js"
echo -e "     3. ${YELLOW}cloudflared.service${NC} tự kết nối Tunnel"
echo ""
echo -e "  ${CYAN}⚙️  Bước tiếp theo (nếu chưa chạy):${NC}"
echo -e "     ${YELLOW}sudo ./setup_domain.sh${NC}  ← Gắn tên miền cố định của bạn"
echo ""
echo -e "  ${CYAN}🔍 Lệnh kiểm tra nhanh:${NC}"
echo -e "     ${YELLOW}sudo systemctl status vihand cloudflared${NC}"
echo -e "     ${YELLOW}ip addr show wlan0${NC}   ← Xem địa chỉ IP hiện tại"
echo ""
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════════════${NC}"
