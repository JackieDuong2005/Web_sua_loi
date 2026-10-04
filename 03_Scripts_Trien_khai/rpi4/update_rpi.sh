#!/bin/bash
# ==============================================================================
# ViHand Grade — Raspberry Pi 4: SCRIPT BẢO TRÌ & CẬP NHẬT HỆ THỐNG
# Hỗ trợ kéo code mới, cập nhật database, xoay vòng API Keys và restart service
# ==============================================================================
set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RED='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[⚠]${NC} $1"; }
err()  { echo -e "${RED}[✗] $1${NC}"; exit 1; }
step() { echo -e "\n${CYAN}${BOLD}═══════════════════════════════════════════════════════════${NC}"; echo -e "${CYAN}${BOLD}  $1${NC}"; echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════${NC}\n"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$APP_DIR/.env.local"
MODE="all"

for arg in "$@"; do
    case "$arg" in
        --quick)      MODE="quick" ;;
        --keys-only)  MODE="keys" ;;
        --help|-h)
            echo "Cách dùng: bash update_rpi.sh [--quick|--keys-only|--help]"
            echo "  (không tham số): Kéo code Git + update DB + build Next.js + restart"
            echo "  --quick        : Chỉ restart các services"
            echo "  --keys-only    : Cập nhật danh sách Gemini API Keys và restart"
            exit 0
            ;;
    esac
done

cd "$APP_DIR"

if [ "$MODE" = "keys" ]; then
    step "CẬP NHẬT DANH SÁCH GEMINI API KEYS"
    echo -e "  Nhập danh sách keys mới (ngăn cách bởi dấu phẩy):"
    read -rp "  Keys: " NEW_KEYS
    if [ -n "$NEW_KEYS" ]; then
        sed -i "s|^GEMINI_API_KEYS=.*|GEMINI_API_KEYS=\"$NEW_KEYS\"|" "$ENV_FILE"
        log "Đã cập nhật $ENV_FILE"
        sudo systemctl restart vihand-web
        log "Đã khởi động lại vihand-web để nhận key mới."
    fi
    exit 0
fi

if [ "$MODE" = "quick" ]; then
    step "KHỞI ĐỘNG LẠI DỊCH VỤ NHANH"
    sudo systemctl restart vihand-python vihand-web
    log "Dịch vụ đã được khởi động lại."
    exit 0
fi

step "BƯỚC 1/4: KÉO MÃ NGUỒN MỚI TỪ GITHUB"

# Bảo vệ .env.local không bị git overwrite
[ -f .env.local ] && cp .env.local /tmp/.env.local.bak

git fetch origin main
BEHIND=$(git rev-list HEAD..origin/main --count 2>/dev/null || echo "0")

if [ "$BEHIND" -gt 0 ]; then
    log "Có $BEHIND commit mới, đang kéo về..."
    git checkout -- .
    git pull origin main
    log "Đã cập nhật mã nguồn mới nhất."
else
    log "Mã nguồn hiện tại đã là phiên bản mới nhất."
fi

# Phục hồi .env.local và đồng bộ .env
[ -f /tmp/.env.local.bak ] && cp /tmp/.env.local.bak .env.local && cp .env.local .env && rm -f /tmp/.env.local.bak

step "BƯỚC 2/4: CẬP NHẬT PYTHON DEPENDENCIES & SQLITE DATABASE"

# Python dependencies
if [ -d "$APP_DIR/python_service/venv" ]; then
    # shellcheck disable=SC1091
    source "$APP_DIR/python_service/venv/bin/activate"
    pip install -r "$APP_DIR/python_service/requirements.txt" --quiet
    deactivate
    log "Python dependencies đã được đồng bộ."
fi

# Node dependencies & Prisma
npm install --production=false --prefer-offline 2>&1 | tail -3
npx prisma generate
npx prisma db push --accept-data-loss
chmod 775 "$APP_DIR/prisma" 2>/dev/null || true
chmod 664 "$APP_DIR/prisma/vihand.db"* 2>/dev/null || true
log "Prisma database schema đã được đồng bộ."

step "BƯỚC 3/4: REBUILD NEXT.JS WEB APP"

log "Đang build lại Next.js..."
rm -rf .next
export NODE_OPTIONS="--max-old-space-size=1536"
npm run build
log "Build hoàn tất."

step "BƯỚC 4/4: KHỞI ĐỘNG LẠI TẤT CẢ DỊCH VỤ"

sudo systemctl restart vihand-python
sleep 4
sudo systemctl restart vihand-web
sleep 4

IP=$(hostname -I | awk '{print $1}')
echo -e "\n${GREEN}${BOLD}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  ✅ HỆ THỐNG ĐÃ ĐƯỢC CẬP NHẬT THÀNH CÔNG!${NC}"
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════════════${NC}"
echo -e "  🌐 Địa chỉ Web: ${CYAN}http://${IP}:3000${NC}"
echo -e "  📋 Trạng thái:  ${YELLOW}sudo systemctl status vihand-python vihand-web${NC}\n"
