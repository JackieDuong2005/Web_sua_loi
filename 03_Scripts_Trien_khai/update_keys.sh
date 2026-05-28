#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════
#  ViHand Grade — Script cập nhật API keys và rebuild server
#
#  CÁCH DÙNG trên Raspberry Pi:
#    chmod +x update_keys.sh
#    ./update_keys.sh
#  (Không cần sudo)
# ═══════════════════════════════════════════════════════════════════════

set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'
BOLD='\033[1m'; NC='\033[0m'

log()  { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[⚠]${NC} $1"; }
step() { echo -e "\n${CYAN}${BOLD}══════════════════════════════════════════════${NC}"; echo -e "${CYAN}${BOLD}  $1${NC}"; echo -e "${CYAN}${BOLD}══════════════════════════════════════════════${NC}"; }

APP_DIR="/home/$(whoami)/vihand-grade"
ENV_FILE="$APP_DIR/.env.local"

# ═══════════════════════════════════════════════════════════════════════
step "BƯỚC 1/3: Cập nhật API Keys vào .env.local"
# ═══════════════════════════════════════════════════════════════════════

# Danh sách API keys (thêm/xóa key tại đây khi cần)
GEMINI_API_KEYS="AIzaSyDCA8xG8ec1JSGPKjV4s22UvrKvzIi6gf0,AIzaSyB1xE0KPSohRiqCLukft3Ph-xIxBPLYv9o,AIzaSyC9BFOtMw5s3DFFl_mKisJVheUD2UYFqds,AIzaSyBTgcBDlHlvW-6RG2NlRyFMwxvS5EdxpmI"

# Đọc DATABASE_URL hiện tại để giữ nguyên
CURRENT_DB_URL=$(grep "DATABASE_URL" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2- || echo "file:/home/$(whoami)/vihand-grade/prisma/vihand.db")

# Ghi lại .env.local với keys mới
cat > "$ENV_FILE" << EOF
# Gemini API Keys — xoay vòng ngẫu nhiên mỗi lần chấm điểm
GEMINI_API_KEYS=${GEMINI_API_KEYS}

# Database
DATABASE_URL=${CURRENT_DB_URL}
EOF

chmod 600 "$ENV_FILE"
log "Đã cập nhật $(echo $GEMINI_API_KEYS | tr ',' '\n' | wc -l) API keys vào .env.local"

# ═══════════════════════════════════════════════════════════════════════
step "BƯỚC 2/3: Pull code mới nhất từ GitHub"
# ═══════════════════════════════════════════════════════════════════════

cd "$APP_DIR"
git pull origin main
log "Code đã cập nhật"

# ═══════════════════════════════════════════════════════════════════════
step "BƯỚC 3/3: Rebuild và Restart server"
# ═══════════════════════════════════════════════════════════════════════

export DATABASE_URL="$CURRENT_DB_URL"
npm run build
log "Build hoàn tất"

sudo systemctl restart vihand
sleep 3

if systemctl is-active --quiet vihand; then
  log "Server đã khởi động lại thành công!"
else
  warn "Server có vấn đề. Kiểm tra: sudo journalctl -u vihand -f"
fi

# ═══════════════════════════════════════════════════════════════════════
echo ""
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  ✅ CẬP NHẬT HOÀN TẤT!${NC}"
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${CYAN}API Keys đang dùng:${NC}"
echo "$GEMINI_API_KEYS" | tr ',' '\n' | nl | while read n key; do
  echo -e "    $n. ${key:0:20}..."
done
echo ""
echo -e "  ${CYAN}Hệ thống sẽ random chọn 1 key mỗi lần chấm điểm${NC}"
echo -e "  ${CYAN}Khi 1 key bị 503 → tự động thử key tiếp theo${NC}"
echo ""
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════════════${NC}"
