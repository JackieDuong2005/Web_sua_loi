#!/bin/bash
# ==============================================================================
# ViHand Grade — NVIDIA Jetson Nano: DOCKER RUNNER SCRIPT
# Khởi chạy toàn bộ hệ thống bằng Docker Container độc lập 100%:
#   ✔ Không cài bất kỳ thư viện nào lên hệ điều hành gốc của Jetson
#   ✔ Không đụng chạm đến bất kỳ folder nào khác trên thẻ nhớ SD
#   ✔ Cuối giờ dọn dẹp sạch sẽ 100% bằng docker_cleanup.sh
# ==============================================================================
set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RED='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[⚠]${NC} $1"; }
err()  { echo -e "${RED}[✗] $1${NC}"; exit 1; }
step() { echo -e "\n${CYAN}${BOLD}═══════════════════════════════════════════════════════════${NC}"; echo -e "${CYAN}${BOLD}  $1${NC}"; echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════${NC}\n"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"

step "1/3. KIỂM TRA MÔI TRƯỜNG DOCKER TRÊN JETSON NANO"

if ! command -v docker &>/dev/null; then
    err "Không tìm thấy Docker! Hãy đảm bảo Jetson Nano đã được cài Docker (có sẵn trên JetPack)."
fi

# Kiểm tra quyền chạy docker không cần sudo
DOCKER_CMD="docker"
if ! docker info &>/dev/null; then
    if sudo docker info &>/dev/null; then
        DOCKER_CMD="sudo docker"
    else
        err "Docker daemon chưa khởi động. Hãy chạy: sudo systemctl start docker"
    fi
fi
log "Docker daemon đang hoạt động: $($DOCKER_CMD --version)"

# Kiểm tra NVIDIA runtime
HAS_NV_RUNTIME=false
if $DOCKER_CMD info 2>/dev/null | grep -qi "nvidia"; then
    HAS_NV_RUNTIME=true
    log "Phát hiện NVIDIA Container Runtime hỗ trợ GPU CUDA trong Docker ✔"
fi

step "2/3. LỰA CHỌN CHẾ ĐỘ TRIỂN KHAI DOCKER"

echo -e "  Chọn mô hình chạy Docker trên Jetson Nano:"
echo -e "    1) ${BOLD}Python AI Server Chuyên Dụng (Port 8000)${NC} [Khuyên dùng - Siêu nhẹ, build cực nhanh]"
echo -e "    2) ${BOLD}Toàn bộ Full Stack (Python AI :8000 + Next.js Web :3000)${NC} qua Docker Compose"
read -rp "  Lựa chọn [1 hoặc 2, mặc định 1]: " DEPLOY_MODE
DEPLOY_MODE=${DEPLOY_MODE:-1}

cd "$APP_DIR"

if [ "$DEPLOY_MODE" = "1" ]; then
    log "Đang build Docker Image cho Python AI Core (vihand-ai:jetson)..."
    $DOCKER_CMD build -f "$SCRIPT_DIR/Dockerfile.ai" -t vihand-ai:jetson .

    # Dừng container cũ nếu đang chạy
    $DOCKER_CMD stop vihand-ai-core 2>/dev/null || true
    $DOCKER_CMD rm vihand-ai-core 2>/dev/null || true

    log "Khởi chạy container vihand-ai-core trên cổng 8000..."
    if [ "$HAS_NV_RUNTIME" = true ]; then
        $DOCKER_CMD run -d \
            --name vihand-ai-core \
            --runtime nvidia \
            -p 8000:8000 \
            --restart unless-stopped \
            vihand-ai:jetson
    else
        $DOCKER_CMD run -d \
            --name vihand-ai-core \
            -p 8000:8000 \
            --restart unless-stopped \
            vihand-ai:jetson
    fi
    log "Container vihand-ai-core đã khởi động thành công!"
else
    log "Khởi chạy toàn bộ hệ thống bằng Docker Compose..."
    if command -v docker-compose &>/dev/null; then
        $DOCKER_CMD-compose -f "$SCRIPT_DIR/docker-compose.yml" up -d --build
    else
        $DOCKER_CMD compose -f "$SCRIPT_DIR/docker-compose.yml" up -d --build
    fi
    log "Hệ thống Full Stack đã khởi động thành công!"
fi

step "3/3. THÔNG TIN TRUY CẬP VÀ ĐỊA CHỈ IP"

IP=$(hostname -I | awk '{print $1}')
echo -e "${GREEN}${BOLD}================================================================${NC}"
echo -e "${GREEN}${BOLD}  🎉 VIHAND GRADE ĐANG CHẠY TRONG DOCKER HOÀN TOÀN CÁCH LY!     ${NC}"
echo -e "${GREEN}${BOLD}================================================================${NC}"
echo -e "  🌐 Địa chỉ IP máy Jetson:  ${CYAN}http://${IP}${NC}"
echo -e "  🐍 Python AI Swagger API:  ${CYAN}http://${IP}:8000/docs${NC}"
if [ "$DEPLOY_MODE" = "2" ]; then
    echo -e "  💻 Giao diện Web:          ${CYAN}http://${IP}:3000${NC}"
fi
echo -e "\n  🔍 Xem log realtime:"
echo -e "     ${YELLOW}$DOCKER_CMD logs -f vihand-ai-core${NC}"
echo -e "\n  🛑 KHI TEST XONG CUỐI GIỜ: Chạy lệnh sau để gỡ sạch và khôi phục 100%:"
echo -e "     ${BOLD}${RED}bash $SCRIPT_DIR/docker_cleanup.sh${NC}\n"
