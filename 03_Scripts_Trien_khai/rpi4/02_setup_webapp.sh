#!/bin/bash
# ==============================================================================
# ViHand Grade — Raspberry Pi 4: BƯỚC 2: CÀI ĐẶT WEB APP & AI BFF GATEWAY (NEXT.JS)
# ==============================================================================
set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RED='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[⚠]${NC} $1"; }
err()  { echo -e "${RED}[✗] $1${NC}"; exit 1; }
step() { echo -e "\n${CYAN}${BOLD}═══════════════════════════════════════════════════════════${NC}"; echo -e "${CYAN}${BOLD}  $1${NC}"; echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════${NC}\n"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
NODE_TARGET_VERSION="20"

step "BƯỚC 1/5: KIỂM TRA & CÀI ĐẶT NODE.JS ${NODE_TARGET_VERSION} LTS"

install_node() {
    log "Cài đặt Node.js ${NODE_TARGET_VERSION} LTS từ NodeSource..."
    curl -fsSL https://deb.nodesource.com/setup_${NODE_TARGET_VERSION}.x | sudo -E bash -
    sudo apt install -y nodejs
}

if command -v node &> /dev/null; then
    CURRENT_NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$CURRENT_NODE_VER" -ge "$NODE_TARGET_VERSION" ]; then
        log "Node.js đã có sẵn: $(node -v) | npm $(npm -v)"
    else
        warn "Node.js hiện tại ($(node -v)) cũ hơn yêu cầu (v${NODE_TARGET_VERSION}). Đang nâng cấp..."
        install_node
    fi
else
    install_node
fi
log "Node.js sẵn sàng: $(node -v) | npm $(npm -v)"

step "BƯỚC 2/5: THIẾT LẬP FILE BIẾN MÔI TRƯỜNG .env.local"

cd "$APP_DIR"
ENV_LOCAL="$APP_DIR/.env.local"

if [ ! -f "$ENV_LOCAL" ]; then
    log "Tạo .env.local từ template shared/.env.example..."
    cp "$APP_DIR/03_Scripts_Trien_khai/shared/.env.example" "$ENV_LOCAL"
    
    # Cập nhật đường dẫn SQLite tuyệt đối cho máy hiện tại
    DB_PATH="$APP_DIR/prisma/vihand.db"
    sed -i "s|DATABASE_URL=.*|DATABASE_URL=\"file:${DB_PATH}\"|" "$ENV_LOCAL"
    log "Đã tạo .env.local với DATABASE_URL=file:${DB_PATH}"
else
    log "File .env.local đã tồn tại, giữ nguyên cấu hình."
fi

# Đồng bộ .env để Prisma CLI và seed-admin.js luôn nạp được biến môi trường DATABASE_URL
cp "$ENV_LOCAL" "$APP_DIR/.env"
chmod 775 "$APP_DIR/prisma" 2>/dev/null || true
log "Đã đồng bộ .env và cấp quyền thư mục prisma/"

step "BƯỚC 3/5: CÀI ĐẶT NPM DEPENDENCIES"

log "Đang chạy npm install (có thể mất 3-5 phút trên thẻ nhớ SD)..."
npm install --production=false
log "Dependencies đã cài đặt thành công."

step "BƯỚC 4/5: ĐỒNG BỘ CƠ SỞ DỮ LIỆU SQLITE VỚI PRISMA"

log "Sinh Prisma Client..."
npx prisma generate

log "Đồng bộ cấu trúc database..."
npx prisma db push --accept-data-loss

log "Khởi tạo tài khoản quản trị mặc định (admin/123456)..."
node prisma/seed-admin.js 2>/dev/null || true
log "Cơ sở dữ liệu SQLite đã sẵn sàng tại prisma/vihand.db."

step "BƯỚC 5/5: BUILD NEXT.JS PRODUCTION BUNDLE"

log "Dọn dẹp bản build cũ..."
rm -rf .next

log "Đang build Next.js (mất khoảng 5-8 phút trên Raspberry Pi 4)..."
export NODE_OPTIONS="--max-old-space-size=1536"
npm run build

log "Build Next.js Production thành công!"

echo -e "\n${GREEN}${BOLD}✅ [BƯỚC 2 HOÀN TẤT] Web App & BFF Gateway đã sẵn sàng để cấu hình dịch vụ Systemd.${NC}\n"
