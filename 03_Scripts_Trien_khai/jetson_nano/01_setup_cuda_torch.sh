#!/bin/bash
# ==============================================================================
# ViHand Grade — NVIDIA Jetson Nano: BƯỚC 1: CÀI ĐẶT PYTORCH HỖ TRỢ CUDA GPU
# (Tận dụng GPU Maxwell 128 CUDA cores để tăng tốc suy luận YOLOv8 & ViT5)
# ==============================================================================
set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RED='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[⚠]${NC} $1"; }
err()  { echo -e "${RED}[✗] $1${NC}"; exit 1; }
step() { echo -e "\n${CYAN}${BOLD}═══════════════════════════════════════════════════════════${NC}"; echo -e "${CYAN}${BOLD}  $1${NC}"; echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════${NC}\n"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
VENV_DIR="$APP_DIR/python_service/venv"

step "BƯỚC 1/3: KIỂM TRA MÔI TRƯỜNG CUDA & JETPACK"

PY_VER=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
log "Phiên bản Python hệ thống: Python $PY_VER"

if command -v nvcc &>/dev/null; then
    log "Trình biên dịch CUDA (nvcc):"
    nvcc --version | grep "release"
elif [ -d /usr/local/cuda ]; then
    export PATH=/usr/local/cuda/bin:$PATH
    export LD_LIBRARY_PATH=/usr/local/cuda/lib64:$LD_LIBRARY_PATH
    log "Đã nạp đường dẫn CUDA vào PATH."
else
    warn "Không tìm thấy nvcc hoặc /usr/local/cuda. GPU có thể chạy ở chế độ hạn chế."
fi

step "BƯỚC 2/3: THIẾT LẬP PYTHON VENV & CÀI ĐẶT PYTORCH CUDA"

mkdir -p "$APP_DIR/python_service"
if [ ! -d "$VENV_DIR" ]; then
    log "Tạo virtualenv tại $VENV_DIR..."
    python3 -m venv "$VENV_DIR"
fi

# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"
pip install --upgrade pip setuptools wheel --quiet

log "Kiểm tra xem PyTorch CUDA đã được cài đặt chưa..."
CUDA_READY=false
if python3 -c "import torch; exit(0 if torch.cuda.is_available() else 1)" 2>/dev/null; then
    CUDA_READY=true
    log "PyTorch với CUDA đã có sẵn trong môi trường!"
fi

if [ "$CUDA_READY" = false ]; then
    log "Đang cài đặt PyTorch tương thích phần cứng Jetson Nano..."
    # Hướng dẫn và cài đặt wheel tối ưu
    echo -e "  Chọn phương án cài đặt PyTorch:"
    echo -e "    1) Tự động cài PyTorch từ nguồn NVIDIA JetPack chính hãng"
    echo -e "    2) Cài đặt PyTorch tiêu chuẩn (Hỗ trợ thử nghiệm)"
    echo -e "    3) Tôi đã có file wheel .whl trong máy, chỉ định đường dẫn"
    read -rp "  Lựa chọn [1-3, mặc định 1]: " TORCH_CHOICE
    TORCH_CHOICE=${TORCH_CHOICE:-1}

    case "$TORCH_CHOICE" in
        1)
            log "Đang kiểm tra phiên bản JetPack và Python để tải wheel PyTorch CUDA chính hãng..."
            pip install Cython numpy --quiet
            
            # Nhận diện L4T version từ nv_tegra_release
            L4T_MAJOR=$(awk -F ' ' '/# R/ {print $2}' /etc/nv_tegra_release 2>/dev/null | tr -d 'R' || echo "32")
            PY_MAJOR_MINOR=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
            log "Tegra L4T Major: R$L4T_MAJOR | Python: $PY_MAJOR_MINOR"
            
            TORCH_WHEEL_URL=""
            if [ "$L4T_MAJOR" = "32" ]; then
                # JetPack 4.6.x (Jetson Nano gốc, Maxwell sm_53)
                if [ "$PY_MAJOR_MINOR" = "3.8" ]; then
                    TORCH_WHEEL_URL="https://nvidia.box.com/shared/static/p57jwntv436lfrd78inwl7mk6vmm3udq.whl"
                elif [ "$PY_MAJOR_MINOR" = "3.6" ]; then
                    TORCH_WHEEL_URL="https://developer.download.nvidia.com/compute/redist/jp/v461/pytorch/torch-1.10.0a0+git36449ea-cp36-cp36m-linux_aarch64.whl"
                fi
            elif [ "$L4T_MAJOR" = "35" ]; then
                # JetPack 5.x (Jetson Xavier / Orin, Python 3.8)
                TORCH_WHEEL_URL="https://developer.download.nvidia.com/compute/redist/jp/v50/pytorch/torch-1.12.0a0+2c916ef.nv22.4-cp38-cp38-linux_aarch64.whl"
            fi
            
            if [ -n "$TORCH_WHEEL_URL" ]; then
                log "Tải và cài đặt PyTorch CUDA từ NVIDIA: $TORCH_WHEEL_URL"
                pip install "$TORCH_WHEEL_URL" || {
                    warn "Tải từ link NVIDIA không thành công. Thử cài đặt tiêu chuẩn từ PyPI..."
                    pip install torch torchvision --quiet
                }
            else
                log "Không có link cố định cho R$L4T_MAJOR/Py$PY_MAJOR_MINOR, tiến hành cài đặt PyTorch tiêu chuẩn..."
                pip install torch torchvision --quiet
            fi
            ;;
        2)
            log "Cài đặt PyTorch từ PyPI (CPU fallback / tiêu chuẩn)..."
            pip install torch torchvision --quiet
            ;;
        3)
            read -rp "  Nhập đường dẫn file .whl: " WHEEL_PATH
            [ -f "$WHEEL_PATH" ] && pip install "$WHEEL_PATH" || warn "File không tồn tại."
            ;;
    esac
fi

step "BƯỚC 3/3: XÁC THỰC VÀ ĐO HIỆU NĂNG TÍNH TOÁN GPU"

python3 -c "
import torch
print(f'• PyTorch Version: {torch.__version__}')
cuda_avail = torch.cuda.is_available()
print(f'• CUDA Available : {cuda_avail}')
if cuda_avail:
    device_name = torch.cuda.get_device_name(0)
    cc = torch.cuda.get_device_capability(0)
    print(f'• GPU Device Name: {device_name}')
    print(f'• Compute Capab. : {cc[0]}.{cc[1]}')
    print(f'• Device Count   : {torch.cuda.device_count()}')
    
    # Test tensor allocation trên GPU
    x = torch.randn(1000, 1000, device='cuda')
    y = torch.matmul(x, x)
    print('• Tensor GPU Test: THÀNH CÔNG (Matmul 1000x1000 hoàn tất trên CUDA!)')
else:
    print('• Chú ý: Đang chạy ở chế độ CPU fallback.')
"

deactivate

echo -e "\n${GREEN}${BOLD}✅ [BƯỚC 1 HOÀN TẤT] Môi trường PyTorch trên Jetson Nano đã sẵn sàng!${NC}"
echo -e "  Tiếp theo: Chạy ${YELLOW}bash 02_setup_yolo_detector.sh${NC}\n"
