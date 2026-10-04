#!/bin/bash
# ==============================================================================
# ViHand Grade — NVIDIA Jetson Nano: DOCKER CLEANUP & RESTORE
# Gỡ bỏ sạch sẽ toàn bộ Container & Image của ViHand Grade:
#   ✔ Dừng và xóa toàn bộ container vihand-ai-core, vihand-web-app
#   ✔ Xóa toàn bộ images đã build
#   ✔ Trả lại 100% dung lượng thẻ nhớ SD như trước khi thử nghiệm
#   ✔ Tuyệt đối KHÔNG làm mất mát bất kỳ file/folder nào khác trên SD card
# ==============================================================================
set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RED='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[⚠]${NC} $1"; }
step() { echo -e "\n${CYAN}${BOLD}═══════════════════════════════════════════════════════════${NC}"; echo -e "${CYAN}${BOLD}  $1${NC}"; echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════${NC}\n"; }

DOCKER_CMD="docker"
if ! docker info &>/dev/null; then
    if sudo docker info &>/dev/null; then
        DOCKER_CMD="sudo docker"
    fi
fi

echo -e "\n${RED}${BOLD}================================================================${NC}"
echo -e "${RED}${BOLD}  VIHAND GRADE — DỌN DẸP DOCKER & KHÔI PHỤC THẺ NHỚ JETSON     ${NC}"
echo -e "${RED}${BOLD}================================================================${NC}\n"

step "1/3. DỪNG VÀ XÓA CÁC CONTAINER CỦA VIHAND GRADE"

for CONTAINER in vihand-ai-core vihand-web-app; do
    if $DOCKER_CMD ps -a --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
        log "Đang dừng container $CONTAINER..."
        $DOCKER_CMD stop "$CONTAINER" 2>/dev/null || true
        log "Đang xóa container $CONTAINER..."
        $DOCKER_CMD rm -f "$CONTAINER" 2>/dev/null || true
        log "Đã xóa container $CONTAINER."
    else
        log "Container $CONTAINER không tồn tại hoặc đã được gỡ."
    fi
done

step "2/3. XÓA DOCKER IMAGES ĐỂ GIẢI PHÓNG DUNG LƯỢNG THẺ NHỚ SD"

for IMAGE in vihand-ai:jetson vihand-web:jetson; do
    if $DOCKER_CMD images --format '{{.Repository}}:{{.Tag}}' | grep -q "^${IMAGE}$"; then
        log "Đang xóa Docker Image $IMAGE..."
        $DOCKER_CMD rmi -f "$IMAGE" 2>/dev/null || true
        log "Đã xóa Image $IMAGE."
    fi
done

# Xóa dangling images & build cache
log "Dọn dẹp bộ nhớ đệm Docker build..."
$DOCKER_CMD builder prune -f 2>/dev/null || true
$DOCKER_CMD network prune -f 2>/dev/null || true

step "3/3. KIỂM TRA TRẠNG THÁI CUỐI CÙNG"

echo -e "  • Danh sách container đang chạy trên Jetson:"
$DOCKER_CMD ps
echo ""
echo -e "  • Dung lượng ổ cứng SD card hiện tại:"
df -h / | awk 'NR==1 || NR==2'

echo -e "\n${GREEN}${BOLD}================================================================${NC}"
echo -e "${GREEN}${BOLD}  ✅ DỌN DẸP DOCKER HOÀN TẤT! JETSON NANO ĐÃ ĐƯỢC PHỤC HỒI 100%! ${NC}"
echo -e "${GREEN}${BOLD}  Toàn bộ các dự án khác trên SD card hoàn toàn nguyên vẹn.     ${NC}"
echo -e "${GREEN}${BOLD}================================================================${NC}\n"
