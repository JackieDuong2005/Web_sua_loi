#!/bin/bash
# ==============================================================================
# ViHand Grade — NVIDIA Jetson Nano: BƯỚC 5: CÀI ĐẶT WEB APP NEXT.JS & PRISMA
# ==============================================================================
set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RED='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[⚠]${NC} $1"; }
err()  { echo -e "${RED}[✗] $1${NC}"; exit 1; }
step() { echo -e "\n${CYAN}${BOLD}═══════════════════════════════════════════════════════════${NC}"; echo -e "${CYAN}${BOLD}  $1${NC}"; echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════${NC}\n"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

step "BƯỚC 1/4: CÀI ĐẶT NODE.JS 20 LTS TRÊN UBUNTU JETSON"

GLIBC_VER=$(ldd --version 2>/dev/null | head -n 1 | grep -oP '\d+\.\d+' || echo "2.27")
if (( $(echo "$GLIBC_VER < 2.28" | bc -l 2>/dev/null || echo 0) )); then
    warn "Phát hiện phiên bản GLIBC $GLIBC_VER (< 2.28, phổ biến trên Ubuntu 18.04 Bionic)."
    warn "Node.js 20 và Next.js 16 yêu cầu GLIBC >= 2.28."
    warn "Nếu gặp lỗi 'GLIBC_2.28 not found', vui lòng cân nhắc:"
    warn "  1. Chạy Web App trên Raspberry Pi 4 hoặc PC trong LAN, và dùng Jetson làm AI Inference Node (:8000)."
    warn "  2. Hoặc nâng cấp hệ điều hành Jetson Nano lên Ubuntu 20.04 LTS (Focal)."
fi

if ! command -v node &> /dev/null || [ "$(node -v | cut -d'v' -f2 | cut -d'.' -f1)" -lt 20 ]; then
    log "Cài đặt Node.js 20 LTS từ NodeSource..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - || warn "NodeSource setup gặp cảnh báo về phiên bản OS."
    sudo apt install -y nodejs || warn "Cài đặt nodejs qua apt gặp vấn đề tương thích GLIBC."
fi
log "Node.js sẵn sàng: $(node -v 2>/dev/null || echo 'Chưa cài đặt') | npm $(npm -v 2>/dev/null || echo 'Chưa cài đặt')"

step "BƯỚC 2/4: THIẾT LẬP FILE .env.local VÀ ĐỒNG BỘ .env"

cd "$APP_DIR"
ENV_LOCAL="$APP_DIR/.env.local"
if [ ! -f "$ENV_LOCAL" ]; then
    cp "$APP_DIR/03_Scripts_Trien_khai/shared/.env.example" "$ENV_LOCAL"
    DB_PATH="$APP_DIR/prisma/vihand.db"
    sed -i "s|DATABASE_URL=.*|DATABASE_URL=\"file:${DB_PATH}\"|" "$ENV_LOCAL"
    log "Đã tạo .env.local với DATABASE_URL=file:${DB_PATH}"
fi

# Đồng bộ .env để Prisma CLI và seed-admin.js luôn nạp được biến môi trường DATABASE_URL
cp "$ENV_LOCAL" "$APP_DIR/.env"
chmod 775 "$APP_DIR/prisma" 2>/dev/null || true
log "Đã đồng bộ .env và cấp quyền thư mục prisma/"

step "BƯỚC 3/4: NPM INSTALL & ĐỒNG BỘ CƠ SỞ DỮ LIỆU SQLITE"

log "Cài đặt npm dependencies..."
npm install --production=false
npx prisma generate
npx prisma db push --accept-data-loss
chmod 664 "$APP_DIR/prisma/vihand.db"* 2>/dev/null || true
node prisma/seed-admin.js 2>/dev/null || true
log "Cơ sở dữ liệu SQLite đã sẵn sàng."

step "BƯỚC 4/4: BUILD NEXT.JS PRODUCTION TRÊN JETSON NANO"

log "Đang build Next.js..."
rm -rf .next
export NODE_OPTIONS="--max-old-space-size=1536"
npm run build
log "Build Next.js thành công."

echo -e "\n${GREEN}${BOLD}✅ [BƯỚC 5 HOÀN TẤT] Web App Next.js đã được cài đặt và build thành công!${NC}"
echo -e "  Tiếp theo: Chạy ${YELLOW}sudo bash 06_setup_services.sh${NC}\n"
