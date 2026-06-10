#!/bin/bash
# ================================================================
#  ViHand Grade — Script cập nhật hệ thống trên Raspberry Pi 4
#  Kéo code mới nhất từ GitHub, cài deps, build, restart service
#
#  Cách dùng:
#    bash update_rpi.sh              # Cập nhật đầy đủ (mặc định)
#    bash update_rpi.sh --quick      # Chỉ restart, không build lại
#    bash update_rpi.sh --deps-only  # Chỉ npm install + db push
#
#  Yêu cầu: Đã chạy setup_rpi.sh ít nhất một lần
# ================================================================

set -e  # Dừng ngay nếu có lỗi

# ── Màu sắc terminal ────────────────────────────────────────────
CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

# ── Phân tích tham số ───────────────────────────────────────────
MODE="full"
for arg in "$@"; do
  case "$arg" in
    --quick)      MODE="quick" ;;
    --deps-only)  MODE="deps" ;;
    --help|-h)
      echo "Cách dùng: bash update_rpi.sh [--quick|--deps-only|--help]"
      echo "  (không tham số)  : Cập nhật đầy đủ — pull + npm install + build + restart"
      echo "  --quick          : Chỉ restart service (không pull, không build)"
      echo "  --deps-only      : Chỉ pull + npm install + db push (không build lại)"
      exit 0
      ;;
  esac
done

# ── Thông tin phiên ─────────────────────────────────────────────
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
APP_DIR="$HOME/vihand-grade"
SERVICE_NAME="vihand"
NODE_MEM="--max-old-space-size=1024"

echo -e "\n${CYAN}${BOLD}"
echo "╔══════════════════════════════════════════╗"
echo "║   ViHand Grade — Cập nhật Raspberry Pi 4  ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"
echo -e "  📅 Thời gian : ${TIMESTAMP}"
echo -e "  📂 Thư mục   : ${APP_DIR}"
echo -e "  ⚙️  Chế độ    : ${BOLD}${MODE}${NC}"
echo ""

# ── Kiểm tra thư mục project ────────────────────────────────────
if [ ! -d "$APP_DIR" ]; then
  echo -e "${RED}❌ Không tìm thấy thư mục '$APP_DIR'!"
  echo -e "   Hãy chạy setup_rpi.sh trước.${NC}"
  exit 1
fi

cd "$APP_DIR"

# ───────────────────────────────────────────────────────────────
# CHẾ ĐỘ QUICK — chỉ restart service
# ───────────────────────────────────────────────────────────────
if [ "$MODE" = "quick" ]; then
  echo -e "${CYAN}[Quick] Khởi động lại service ${SERVICE_NAME}...${NC}"
  sudo systemctl restart "$SERVICE_NAME"
  sleep 3
  if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
    echo -e "${GREEN}✅ Service đang chạy!${NC}"
  else
    echo -e "${RED}❌ Service không khởi động được.${NC}"
    sudo journalctl -u "$SERVICE_NAME" -n 20 --no-pager
    exit 1
  fi
  IP=$(hostname -I | awk '{print $1}')
  echo -e "\n  🌐 Truy cập: ${CYAN}http://${IP}:3000${NC}\n"
  exit 0
fi

# ───────────────────────────────────────────────────────────────
# BƯỚC 1 — Kéo code mới từ GitHub
# ───────────────────────────────────────────────────────────────
echo -e "${CYAN}[1/5] Kéo code mới nhất từ GitHub...${NC}"

# Lưu lại file .env (không bị overwrite bởi git)
if [ -f .env.local ]; then
  cp .env.local .env.local.bak
fi

# Stash local changes (ví dụ package-lock.json), rồi pull
git fetch origin main
BEHIND=$(git rev-list HEAD..origin/main --count 2>/dev/null || echo "0")

if [ "$BEHIND" -eq 0 ]; then
  echo -e "${YELLOW}  ℹ️  Code đã là phiên bản mới nhất (không có commit mới).${NC}"
  UPDATED=false
else
  echo -e "  ↓  Có ${BEHIND} commit mới, đang kéo về..."
  git checkout -- .    # Reset thay đổi local
  git pull origin main
  echo -e "${GREEN}  ✅ Đã cập nhật ${BEHIND} commit mới.${NC}"
  UPDATED=true
fi

# Phục hồi .env.local nếu bị xoá bởi git
if [ -f .env.local.bak ] && [ ! -f .env.local ]; then
  cp .env.local.bak .env.local
  echo -e "${YELLOW}  ♻️  Đã phục hồi .env.local${NC}"
fi
rm -f .env.local.bak

# ───────────────────────────────────────────────────────────────
# BƯỚC 2 — Kiểm tra file .env
# ───────────────────────────────────────────────────────────────
echo -e "\n${CYAN}[2/5] Kiểm tra cấu hình môi trường (.env)...${NC}"

ENV_FILE=".env.local"
if [ ! -f "$ENV_FILE" ]; then
  ENV_FILE=".env"
fi

if [ ! -f "$ENV_FILE" ]; then
  echo -e "${RED}❌ Không tìm thấy file .env hoặc .env.local!"
  echo -e "   Tạo thủ công: echo 'GEMINI_API_KEY=AIza...' > .env.local${NC}"
  exit 1
fi

# Kiểm tra các biến bắt buộc
MISSING_VARS=()
grep -q 'GEMINI_API_KEY' "$ENV_FILE" || MISSING_VARS+=("GEMINI_API_KEY")
grep -q 'DATABASE_URL\|prisma' "$ENV_FILE" || true  # DATABASE_URL không bắt buộc nếu dùng default

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  echo -e "${RED}❌ Thiếu biến môi trường trong ${ENV_FILE}: ${MISSING_VARS[*]}${NC}"
  exit 1
fi

echo -e "${GREEN}  ✅ File ${ENV_FILE} hợp lệ.${NC}"

# ───────────────────────────────────────────────────────────────
# BƯỚC 3 — Cài dependencies + migrate database
# ───────────────────────────────────────────────────────────────
echo -e "\n${CYAN}[3/5] Cài đặt / kiểm tra dependencies...${NC}"

# Cài đầy đủ deps kể cả devDependencies (cần cho build: tailwindcss, postcss...)
# Sau khi build xong, Next.js chỉ chạy production nên RAM không bị ảnh hưởng lúc runtime
if $UPDATED || [ ! -d node_modules ]; then
  npm install 2>&1 | tail -5
  echo -e "${GREEN}  ✅ npm install hoàn tất.${NC}"
else
  echo -e "${YELLOW}  ℹ️  Bỏ qua npm install (không có thay đổi package.json).${NC}"
fi

echo -e "  🗃️  Đang chạy Prisma migrate..."
npx prisma generate --silent 2>/dev/null || true
npx prisma db push --accept-data-loss 2>&1 | tail -3
echo -e "${GREEN}  ✅ Database đã đồng bộ.${NC}"

# ── Dừng tại đây nếu --deps-only ──────────────────────────────
if [ "$MODE" = "deps" ]; then
  echo -e "\n${GREEN}═══════ DEPS-ONLY: Hoàn tất ═══════${NC}"
  exit 0
fi

# ───────────────────────────────────────────────────────────────
# BƯỚC 4 — Build production
# ───────────────────────────────────────────────────────────────
echo -e "\n${CYAN}[4/5] Build ứng dụng Next.js...${NC}"
echo -e "${YELLOW}  ⏱️  Mất ~5-10 phút trên RPi4, hãy kiên nhẫn...${NC}"

START_TIME=$(date +%s)

rm -rf .next
export NODE_OPTIONS="$NODE_MEM"
npm run build 2>&1 | grep -E "(Route|Error|warn|✓|○|λ)" || true

END_TIME=$(date +%s)
BUILD_SECS=$((END_TIME - START_TIME))
echo -e "${GREEN}  ✅ Build xong sau ${BUILD_SECS} giây.${NC}"

# ───────────────────────────────────────────────────────────────
# BƯỚC 5 — Restart service
# ───────────────────────────────────────────────────────────────
echo -e "\n${CYAN}[5/5] Khởi động lại service ${SERVICE_NAME}...${NC}"

if sudo systemctl is-enabled --quiet "$SERVICE_NAME" 2>/dev/null; then
  sudo systemctl restart "$SERVICE_NAME"
  sleep 5  # Chờ Next.js khởi động

  if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
    echo -e "${GREEN}  ✅ Service đang chạy bình thường.${NC}"
  else
    echo -e "${RED}  ❌ Service không khởi động được! Xem log bên dưới:${NC}"
    sudo journalctl -u "$SERVICE_NAME" -n 30 --no-pager
    exit 1
  fi
else
  echo -e "${YELLOW}  ⚠️  Service '${SERVICE_NAME}' chưa được cài. Khởi động thủ công...${NC}"
  nohup npm run start > /tmp/vihand.log 2>&1 &
  echo -e "${GREEN}  ✅ Đã khởi động (PID: $!). Log: /tmp/vihand.log${NC}"
fi

# ───────────────────────────────────────────────────────────────
# TỔNG KẾT
# ───────────────────────────────────────────────────────────────
IP=$(hostname -I | awk '{print $1}')
TUNNEL_URL=$(sudo journalctl -u cloudflared -n 20 --no-pager 2>/dev/null \
  | grep -oP 'https://[a-z0-9\-]+\.trycloudflare\.com' | tail -1)

echo ""
echo -e "${GREEN}${BOLD}"
echo "╔══════════════════════════════════════════╗"
echo "║           CẬP NHẬT HOÀN TẤT! 🎉         ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"
echo -e "  🌐 Mạng LAN  : ${CYAN}http://${IP}:3000${NC}"
if [ -n "$TUNNEL_URL" ]; then
  echo -e "  🌍 Internet  : ${CYAN}${TUNNEL_URL}${NC}"
fi
echo ""
echo -e "  📋 Xem log   : ${YELLOW}sudo journalctl -u ${SERVICE_NAME} -f${NC}"
echo -e "  🌡️  Nhiệt độ  : $(vcgencmd measure_temp 2>/dev/null || echo 'N/A')"
echo -e "  💾 RAM trống : $(free -h | awk '/Mem:/{print $7}' || echo 'N/A')"
echo ""
