#!/bin/bash
# ==============================================================================
# ViHand Grade — Raspberry Pi 4: BƯỚC 0: KHỞI TẠO HỆ THỐNG VÀ CẤU HÌNH SWAP
# ==============================================================================
set -e

# Màu sắc
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RED='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[⚠]${NC} $1"; }
err()  { echo -e "${RED}[✗] $1${NC}"; exit 1; }
step() { echo -e "\n${CYAN}${BOLD}═══════════════════════════════════════════════════════════${NC}"; echo -e "${CYAN}${BOLD}  $1${NC}"; echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════${NC}\n"; }

[ "$EUID" -ne 0 ] && err "Vui lòng chạy script với quyền sudo: sudo bash 00_init_system.sh"

step "KIỂM TRA PHẦN CỨNG & HỆ ĐIỀU HÀNH RASPBERRY PI 4"

ARCH=$(uname -m)
log "Kiến trúc CPU: $ARCH"
if [ "$ARCH" != "aarch64" ]; then
    warn "Khuyến nghị sử dụng Raspberry Pi OS 64-bit (aarch64) để đạt hiệu năng tối đa với PyTorch và Node 20."
fi

TOTAL_RAM=$(free -m | awk '/^Mem:/{print $2}')
log "Dung lượng RAM vật lý: ${TOTAL_RAM}MB"

step "BƯỚC 1/3: CẬP NHẬT PACKAGE VÀ CÀI ĐẶT CÔNG CỤ NỀN TẢNG"

apt update && apt upgrade -y
apt install -y git curl wget build-essential python3 python3-pip python3-venv python3-dev \
               ca-certificates gnupg ufw net-tools libjpeg-dev zlib1g-dev libffi-dev \
               htop iotop jq bc

log "Các gói hệ thống đã được cài đặt thành công."

step "BƯỚC 2/3: CẤU HÌNH SWAP 3072MB (CHỐNG TRÀN RAM KHI BUILD VÀ NẠP MODEL)"

# Tối thiểu 3072MB swap cho Pi4 để build Next.js và tải đồng thời ViT5 + YOLO
SWAP_SIZE=3072

if [ -f /etc/dphys-swapfile ]; then
    log "Phát hiện dphys-swapfile, đang nâng cấp dung lượng swap..."
    dphys-swapfile swapoff 2>/dev/null || true
    sed -i "s/^CONF_SWAPSIZE=.*/CONF_SWAPSIZE=$SWAP_SIZE/" /etc/dphys-swapfile
    dphys-swapfile setup
    dphys-swapfile swapon
    log "Swap dphys-swapfile đã cấu hình: ${SWAP_SIZE}MB"
else
    log "Cấu hình /swapfile chuẩn Linux..."
    swapoff /swapfile 2>/dev/null || true
    if [ ! -f /swapfile ] || [ "$(stat -c%s /swapfile 2>/dev/null)" -lt $((SWAP_SIZE * 1024 * 1024)) ]; then
        rm -f /swapfile
        fallocate -l ${SWAP_SIZE}M /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=$SWAP_SIZE
        chmod 600 /swapfile
        mkswap /swapfile
    fi
    swapon /swapfile
    grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
    log "Swapfile đã kích hoạt: ${SWAP_SIZE}MB"
fi

# Tối ưu swappiness cho thẻ nhớ SD / SSD USB
sysctl vm.swappiness=20 > /dev/null
grep -q 'vm.swappiness' /etc/sysctl.conf || echo 'vm.swappiness=20' >> /etc/sysctl.conf

step "BƯỚC 3/3: BÁO CÁO TRẠNG THÁI TÀI NGUYÊN"

free -h
echo ""
TEMP=$(vcgencmd measure_temp 2>/dev/null || echo "N/A")
log "Nhiệt độ chip SoC hiện tại: $TEMP"

echo -e "\n${GREEN}${BOLD}✅ [BƯỚC 0 HOÀN TẤT] Hệ thống đã sẵn sàng cho Bước 1 (Cài đặt Python AI Core).${NC}\n"
