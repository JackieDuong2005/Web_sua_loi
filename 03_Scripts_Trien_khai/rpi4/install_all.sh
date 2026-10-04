#!/bin/bash
# ==============================================================================
# ViHand Grade — Raspberry Pi 4: ONE-CLICK MASTER INSTALLER
# Tự động hóa 100% quá trình triển khai trạm biên thành Appliance hoàn chỉnh
# ==============================================================================
set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RED='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[⚠]${NC} $1"; }
err()  { echo -e "${RED}[✗] $1${NC}"; exit 1; }
banner() {
    echo ""
    echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}${BOLD}   VIHAND GRADE — TRẠM BIÊN RASPBERRY PI 4 INSTALLER       ${NC}"
    echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════════════════${NC}"
    echo ""
}

[ "$EUID" -ne 0 ] && err "Vui lòng chạy master script với quyền sudo: sudo bash install_all.sh"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

banner

echo -e "  Hệ thống sẽ cài đặt đầy đủ các thành phần:"
echo -e "    1. Khởi tạo Swap 3GB & Công cụ hệ thống"
echo -e "    2. Python AI Service (ViT5, YOLOv8 Word Detector, Qwen SLM, Edge-TTS)"
echo -e "    3. Next.js Web App & AI BFF Gateway, Prisma SQLite Database"
echo -e "    4. Cấu hình tự khởi động cùng nguồn điện (Systemd Auto-Start)"
echo -e "    5. Tường lửa UFW & Mạng LAN"
echo -e "    6. (Tùy chọn) Gắn tên miền HTTPS qua Cloudflare Named Tunnel"
echo -e "    7. Tự động kiểm thử toàn diện End-to-End"
echo ""

read -rp "  Nhấn [Enter] để bắt đầu quá trình cài đặt..."

# Thu thập Google Gemini API Keys trước (dùng làm OCR & fallback)
echo ""
echo -e "${CYAN}CẤU HÌNH API KEYS DỰ PHÒNG:${NC}"
echo -e "  Bạn có thể nhập 1 hoặc nhiều Gemini API Keys (ngăn cách bởi dấu phẩy):"
read -rp "  GEMINI_API_KEYS (Enter để bỏ qua nếu chỉ dùng AI trạm biên): " USER_KEYS

# Bước 0: Init
bash "$SCRIPT_DIR/00_init_system.sh"

# Bước 1: Python AI Core
bash "$SCRIPT_DIR/01_setup_python_ai.sh"

# Bước 2: Web App & Prisma
bash "$SCRIPT_DIR/02_setup_webapp.sh"

# Nếu người dùng có nhập Gemini API Key thì ghi vào .env.local và .env
if [ -n "$USER_KEYS" ]; then
    ENV_FILE="$APP_DIR/.env.local"
    if [ -f "$ENV_FILE" ]; then
        sed -i "s|^GEMINI_API_KEYS=.*|GEMINI_API_KEYS=\"$USER_KEYS\"|" "$ENV_FILE"
        cp "$ENV_FILE" "$APP_DIR/.env"
        log "Đã cập nhật Gemini API Keys vào .env.local và .env"
    fi
fi

# Đảm bảo phân quyền chính xác cho người dùng thông thường trước khi tạo service
APP_USER="${SUDO_USER:-$(logname 2>/dev/null || whoami)}"
[ "$APP_USER" = "root" ] && APP_USER="$(ls -ld "$APP_DIR" | awk '{print $3}')"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"
chmod 775 "$APP_DIR/prisma" 2>/dev/null || true
chmod 664 "$APP_DIR/prisma/vihand.db"* 2>/dev/null || true

# Bước 3: Services
bash "$SCRIPT_DIR/03_setup_services.sh"

# Bước 4: Network & Firewall
bash "$SCRIPT_DIR/04_setup_network_firewall.sh"

# Bước 5: Cloudflare Tunnel (Hỏi người dùng)
echo ""
echo -e "${CYAN}CẤU HÌNH TRUY CẬP TỪ XA:${NC}"
read -rp "  Bạn có muốn gắn tên miền Cloudflare Tunnel ngay bây giờ không? [y/N]: " SETUP_CF
if [[ "$SETUP_CF" =~ ^[Yy]$ ]]; then
    bash "$SCRIPT_DIR/05_setup_cloudflare_tunnel.sh"
else
    log "Bỏ qua cấu hình Cloudflare Tunnel. Bạn có thể chạy riêng 'sudo bash 05_setup_cloudflare_tunnel.sh' bất cứ lúc nào."
fi

# Bước 6: Verification
bash "$SCRIPT_DIR/06_verify_system.sh"

IP=$(hostname -I | awk '{print $1}')
echo -e "\n${GREEN}${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  🎉 CHÚC MỪNG! HỆ THỐNG VIHAND GRADE ĐÃ HOÀN TẤT TRIỂN KHAI!${NC}"
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════════════════${NC}"
echo -e "  • Giao diện Web App:    ${CYAN}http://${IP}:3000${NC}"
echo -e "  • Python Swagger Docs:  ${CYAN}http://${IP}:8000/docs${NC}"
echo -e "  • Khởi động lại Server: ${YELLOW}sudo systemctl restart vihand-python vihand-web${NC}"
echo -e "  • Cập nhật phiên bản:   ${YELLOW}bash $SCRIPT_DIR/update_rpi.sh${NC}\n"
