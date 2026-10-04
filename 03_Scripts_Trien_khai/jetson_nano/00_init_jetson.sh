#!/bin/bash
# ==============================================================================
# ViHand Grade — NVIDIA Jetson Nano: BƯỚC 0: TỐI ƯU HÓA PHẦN CỨNG & CẤU HÌNH SWAP
# Thiết lập chế độ MAXN (10W), kích hoạt jetson_clocks, tạo Swap 4GB và cài jtop
# ==============================================================================
set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RED='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[⚠]${NC} $1"; }
err()  { echo -e "${RED}[✗] $1${NC}"; exit 1; }
step() { echo -e "\n${CYAN}${BOLD}═══════════════════════════════════════════════════════════${NC}"; echo -e "${CYAN}${BOLD}  $1${NC}"; echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════${NC}\n"; }

[ "$EUID" -ne 0 ] && err "Vui lòng chạy script với quyền sudo: sudo bash 00_init_jetson.sh"

step "BƯỚC 1/4: KIỂM TRA PHẦN CỨNG NVIDIA TEGRA & PHIÊN BẢN JETPACK"

if [ -f /etc/nv_tegra_release ]; then
    log "Phát hiện thông tin Tegra L4T:"
    head -n 1 /etc/nv_tegra_release
else
    warn "Không tìm thấy /etc/nv_tegra_release. Bạn có chắc chắn đang chạy trên NVIDIA Jetson không?"
fi

TOTAL_RAM=$(free -m | awk '/^Mem:/{print $2}')
log "RAM vật lý chia sẻ CPU/GPU: ${TOTAL_RAM}MB"

UBUNTU_VER=$(lsb_release -rs 2>/dev/null || echo "18.04")
GLIBC_VER=$(ldd --version 2>/dev/null | head -n 1 | grep -oP '\d+\.\d+' || echo "2.27")
log "Hệ điều hành: Ubuntu $UBUNTU_VER | GLIBC: $GLIBC_VER"

if [ "$UBUNTU_VER" = "18.04" ] || (( $(echo "$GLIBC_VER < 2.28" | bc -l 2>/dev/null || echo 0) )); then
    warn "JetPack 4.6 gốc chạy trên Ubuntu 18.04 (GLIBC 2.27)."
    warn "Lưu ý kiến trúc: Next.js 16 và Node.js 20 yêu cầu GLIBC >= 2.28 (Ubuntu 20.04+)."
    warn "Khuyến nghị triển khai Jetson Nano làm 'Trạm AI chuyên dụng' (chạy FastAPI port 8000 với CUDA GPU),"
    warn "kết nối với Web App chạy trên Raspberry Pi 4 hoặc nâng cấp Jetson lên Ubuntu 20.04 Focal."
fi

step "BƯỚC 2/4: THIẾT LẬP CHẾ ĐỘ NĂNG LƯỢNG HIỆU NĂNG TỐI ĐA (MAXN 10W)"

if command -v nvpmodel &>/dev/null; then
    log "Kích hoạt nvpmodel Mode 0 (MAXN 10W - Cả 4 lõi CPU Cortex-A57 @ 1.43GHz + GPU @ 921MHz)..."
    nvpmodel -m 0
    nvpmodel -q
else
    warn "Không tìm thấy lệnh nvpmodel."
fi

if command -v jetson_clocks &>/dev/null; then
    log "Khóa xung nhịp CPU và GPU ở mức cao nhất (jetson_clocks)..."
    jetson_clocks --show
    jetson_clocks
    log "Đã kích hoạt xung nhịp tối đa."
else
    warn "Không tìm thấy lệnh jetson_clocks."
fi

step "BƯỚC 3/4: TẠO SWAPFILE 4096MB (4GB) TRÊN JETSON NANO"

SWAP_SIZE=4096
swapoff /swapfile 2>/dev/null || true
if [ ! -f /swapfile ] || [ "$(stat -c%s /swapfile 2>/dev/null)" -lt $((SWAP_SIZE * 1024 * 1024)) ]; then
    log "Đang tạo /swapfile dung lượng ${SWAP_SIZE}MB..."
    rm -f /swapfile
    fallocate -l ${SWAP_SIZE}M /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=$SWAP_SIZE
    chmod 600 /swapfile
    mkswap /swapfile
fi
swapon /swapfile
grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
log "Swapfile 4GB đã kích hoạt thành công."

step "BƯỚC 4/4: CÀI ĐẶT JETSON-STATS (JTOP) & CÔNG CỤ BÁO CÁO HIỆU NĂNG"

apt update && apt install -y python3-pip python3-dev build-essential git curl libjpeg-dev zlib1g-dev htop jq bc
log "Cài đặt jetson-stats để giám sát GPU, CPU, nhiệt độ và công suất..."
pip3 install jetson-stats --quiet || pip install jetson-stats --quiet

log "Trạng thái tài nguyên hiện tại:"
free -h

echo -e "\n${GREEN}${BOLD}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  ✅ [BƯỚC 0 HOÀN TẤT] Jetson Nano đã được tối ưu hiệu năng!${NC}"
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════════════${NC}"
echo -e "  💡 Gõ lệnh ${CYAN}jtop${NC} trên terminal bất cứ lúc nào để xem trực quan CPU/GPU/VRAM."
echo -e "  Tiếp theo: Chạy ${YELLOW}sudo bash 01_setup_cuda_torch.sh${NC}\n"
