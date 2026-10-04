#!/bin/bash
# ==============================================================================
# ViHand Grade — NVIDIA Jetson Nano: BƯỚC 2: CÀI ĐẶT YOLOV8 WORD DETECTOR
# Kiểm thử nạp trọng số best.pt và đo thời gian suy luận trên GPU CUDA vs CPU
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
WEIGHTS_PATH="$APP_DIR/Test_train_29_12/ver2/runs/detect/train/weights/best.pt"

[ ! -d "$VENV_DIR" ] && err "Chưa tìm thấy virtualenv tại $VENV_DIR. Hãy chạy 01_setup_cuda_torch.sh trước."

step "BƯỚC 1/3: CÀI ĐẶT THƯ VIỆN ULTRALYTICS & PILLOW"

# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"
pip install ultralytics pillow --quiet
log "Cài đặt Ultralytics thành công: $(python3 -c "import ultralytics; print(ultralytics.__version__)")"

step "BƯỚC 2/3: KIỂM TRA FILE TRỌNG SỐ YOLOV8"

if [ ! -f "$WEIGHTS_PATH" ]; then
    err "Không tìm thấy file trọng số YOLOv8 tại: $WEIGHTS_PATH"
fi
log "File trọng số YOLOv8: $WEIGHTS_PATH ($(du -h "$WEIGHTS_PATH" | cut -f1))"

step "BƯỚC 3/3: ĐO THỜI GIAN NẠP MODEL & SUY LUẬN TRÊN JETSON NANO"

python3 -c "
import time, torch
from ultralytics import YOLO
from PIL import Image
import numpy as np

weights = '$WEIGHTS_PATH'
print('⏳ Đang nạp model YOLOv8...')
t0 = time.time()
model = YOLO(weights)
load_time = (time.time() - t0) * 1000
print(f'✅ Nạp model hoàn tất trong: {load_time:.1f}ms')

# Tạo ảnh giả lập bài thi học sinh (640x640)
dummy_img = Image.fromarray(np.random.randint(0, 255, (640, 640, 3), dtype=np.uint8))

device = 'cuda:0' if torch.cuda.is_available() else 'cpu'
print(f'🚀 Chạy suy luận thử nghiệm trên thiết bị: {device}')

# Warmup run
_ = model(dummy_img, device=device, verbose=False)

# Benchmark 5 runs
latencies = []
for i in range(5):
    t_start = time.time()
    res = model(dummy_img, device=device, verbose=False)
    lat = (time.time() - t_start) * 1000
    latencies.append(lat)
    print(f'  • Lần {i+1}: {lat:.1f}ms')

avg_lat = sum(latencies) / len(latencies)
fps = 1000.0 / avg_lat
print('─────────────────────────────────────────')
print(f'📊 Độ trễ trung bình: {avg_lat:.1f}ms/ảnh')
print(f'⚡ Tốc độ xử lý       : {fps:.2f} FPS')
print('─────────────────────────────────────────')
"

deactivate

echo -e "\n${GREEN}${BOLD}✅ [BƯỚC 2 HOÀN TẤT] YOLOv8 Word Detector đã sẵn sàng trên Jetson Nano!${NC}"
echo -e "  Tiếp theo: Chạy ${YELLOW}bash 03_setup_vit5_service.sh${NC}\n"
