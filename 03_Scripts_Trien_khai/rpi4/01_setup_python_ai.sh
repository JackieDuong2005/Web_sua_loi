#!/bin/bash
# ==============================================================================
# ViHand Grade — Raspberry Pi 4: BƯỚC 1: CÀI ĐẶT PYTHON AI CORE MICROSERVICE
# (ViT5 INT8 Spell Correction, YOLOv8 Word Detector, Qwen2.5 SLM, Edge-TTS)
# ==============================================================================
set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RED='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[⚠]${NC} $1"; }
err()  { echo -e "${RED}[✗] $1${NC}"; exit 1; }
step() { echo -e "\n${CYAN}${BOLD}═══════════════════════════════════════════════════════════${NC}"; echo -e "${CYAN}${BOLD}  $1${NC}"; echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════${NC}\n"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
PYTHON_DIR="$APP_DIR/python_service"
VENV_DIR="$PYTHON_DIR/venv"

step "KIỂM TRA THƯ MỤC DỰ ÁN & PYTHON SERVICE"

log "Thư mục gốc ứng dụng: $APP_DIR"
log "Thư mục Python service: $PYTHON_DIR"

[ ! -d "$PYTHON_DIR" ] && err "Không tìm thấy thư mục python_service tại $PYTHON_DIR"

step "BƯỚC 1/4: TẠO VIRTUAL ENVIRONMENT PYTHON"

if [ ! -d "$VENV_DIR" ]; then
    log "Đang tạo virtual environment tại $VENV_DIR..."
    python3 -m venv "$VENV_DIR"
    log "Virtual environment đã tạo xong."
else
    log "Virtual environment đã tồn tại tại $VENV_DIR."
fi

# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"
pip install --upgrade pip setuptools wheel --quiet
log "Pip phiên bản: $(pip --version)"

step "BƯỚC 2/4: CÀI ĐẶT PYTORCH CPU & COMPUTER VISION / NLP LIBRARIES"

log "Cài đặt PyTorch CPU-only tối ưu cho ARM64..."
# PyPI cung cấp sẵn wheel aarch64 manylinux cho Linux ARM64
pip install torch torchvision --quiet || pip install torch torchvision --extra-index-url https://download.pytorch.org/whl/cpu --quiet

log "Cài đặt các gói phụ thuộc từ requirements.txt..."
pip install -r "$PYTHON_DIR/requirements.txt" --quiet

log "Thư viện đã cài đặt:"
python3 -c "
import torch, transformers, ultralytics, edge_tts
print(f'  • PyTorch: {torch.__version__} (Device: cpu, Threads: {torch.get_num_threads()})')
print(f'  • Transformers: {transformers.__version__}')
print(f'  • Ultralytics YOLO: {ultralytics.__version__}')
print(f'  • Edge-TTS: Sẵn sàng')
"

step "BƯỚC 3/4: TẢI TRƯỚC MODEL VIT5 VỀ BỘ NHỚ ĐỆM (PRE-DOWNLOAD)"

log "Đang tải trước mô hình ViT5 chamdentimem/ViT5_Vietnamese_Correction..."
python3 -c "
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import torch
model_name = 'chamdentimem/ViT5_Vietnamese_Correction'
print('  -> Đang tải Tokenizer & Model...')
tokenizer = AutoTokenizer.from_pretrained(model_name, use_fast=False)
model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
print('  -> Test Dynamic INT8 Quantization...')
qmodel = torch.quantization.quantize_dynamic(model, {torch.nn.Linear}, dtype=torch.qint8)
print('  [✔] Model ViT5 INT8 nạp thành công!')
"

step "BƯỚC 4/4: KIỂM TRA TRỌNG SỐ YOLOV8 WORD DETECTOR"

YOLO_WEIGHTS="$APP_DIR/Test_train_29_12/ver2/runs/detect/train/weights/best.pt"
if [ -f "$YOLO_WEIGHTS" ]; then
    log "Tìm thấy file trọng số YOLOv8: $YOLO_WEIGHTS ($(du -h "$YOLO_WEIGHTS" | cut -f1))"
    python3 -c "
from ultralytics import YOLO
import sys
model = YOLO('$YOLO_WEIGHTS')
print('  [✔] YOLOv8 Model nạp thành công!')
"
else
    warn "Không tìm thấy file best.pt tại: $YOLO_WEIGHTS"
    warn "Hệ thống sẽ chạy ở chế độ dự phòng OCR khi thiếu YOLO."
fi

deactivate

echo -e "\n${GREEN}${BOLD}✅ [BƯỚC 1 HOÀN TẤT] Python AI Service đã được cài đặt và kiểm thử thành công.${NC}\n"
