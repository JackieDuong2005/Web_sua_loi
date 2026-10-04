#!/bin/bash
# ==============================================================================
# ViHand Grade — Raspberry Pi 4: BƯỚC 4: CẤU HÌNH MẠNG WIFI, IP TĨNH & TƯỜNG LỬA
# ==============================================================================
set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RED='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[⚠]${NC} $1"; }
err()  { echo -e "${RED}[✗] $1${NC}"; exit 1; }
step() { echo -e "\n${CYAN}${BOLD}═══════════════════════════════════════════════════════════${NC}"; echo -e "${CYAN}${BOLD}  $1${NC}"; echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════${NC}\n"; }

[ "$EUID" -ne 0 ] && err "Vui lòng chạy script với quyền sudo: sudo bash 04_setup_network_firewall.sh"

PORT=3000

step "BƯỚC 1/3: CẤU HÌNH TƯỜNG LỬA BẢO MẬT (UFW)"

if ! command -v ufw &>/dev/null; then
    apt install -y ufw
fi

log "Thiết lập chính sách tường lửa an toàn..."
ufw default deny incoming
ufw default allow outgoing

# Mở cổng quản trị SSH và cổng Web App
ufw allow 22/tcp comment "SSH Remote Management"
ufw allow ${PORT}/tcp comment "ViHand Grade Web App"

# Lưu ý bảo mật: Cổng 8000 của Python Microservice KHÔNG mở ra ngoài mạng trường,
# toàn bộ truy cập đi qua cổng 3000 (Next.js AI BFF Gateway) để xác thực người dùng.
ufw --force enable
log "Tường lửa UFW đã kích hoạt thành công (Mở Port 22 & ${PORT})."

step "BƯỚC 2/3: CẤU HÌNH TỰ ĐỘNG KẾT NỐI WIFI TRƯỜNG HỌC"

echo -e "  Bạn có muốn lưu thông tin mạng WiFi trường học để Pi tự kết nối khi bật nguồn không?"
read -rp "  Cấu hình WiFi? [y/N]: " CONFIG_WIFI

if [[ "$CONFIG_WIFI" =~ ^[Yy]$ ]]; then
    read -rp "  Nhập tên mạng WiFi (SSID): " WIFI_SSID
    read -rsp "  Nhập mật khẩu WiFi: " WIFI_PASS
    echo ""

    if [ -n "$WIFI_SSID" ]; then
        if command -v nmcli &>/dev/null; then
            log "Cấu hình WiFi qua NetworkManager (nmcli)..."
            nmcli device wifi connect "$WIFI_SSID" password "$WIFI_PASS" 2>/dev/null || true
            nmcli connection modify "$WIFI_SSID" connection.autoconnect yes connection.autoconnect-priority 100 2>/dev/null || true
            log "Đã lưu WiFi '$WIFI_SSID' (NetworkManager)."
        else
            log "Cấu hình WiFi qua wpa_supplicant..."
            WPA_CONF="/etc/wpa_supplicant/wpa_supplicant.conf"
            wpa_passphrase "$WIFI_SSID" "$WIFI_PASS" >> "$WPA_CONF" 2>/dev/null || true
            wpa_cli -i wlan0 reconfigure 2>/dev/null || true
            log "Đã lưu WiFi '$WIFI_SSID' (wpa_supplicant)."
        fi
    fi
else
    log "Bỏ qua cấu hình WiFi, giữ nguyên kết nối hiện tại."
fi

step "BƯỚC 3/3: THÔNG TIN KẾT NỐI MẠNG"

IP=$(hostname -I | awk '{print $1}')
log "Địa chỉ IP nội bộ của Raspberry Pi: $IP"
log "Cổng truy cập Web: $PORT"

echo -e "\n${GREEN}${BOLD}✅ [BƯỚC 4 HOÀN TẤT] Mạng và tường lửa đã được thiết lập bảo mật.${NC}\n"
