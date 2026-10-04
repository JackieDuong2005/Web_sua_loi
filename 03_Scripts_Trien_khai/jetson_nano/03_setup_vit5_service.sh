#!/bin/bash
# ==============================================================================
# ViHand Grade — NVIDIA Jetson Nano: BƯỚC 3: CÀI ĐẶT VIT5 SPELL CORRECTION
# Kiểm thử nạp ViT5 và so sánh hiệu năng giữa CPU INT8 vs GPU CUDA FP16
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

[ ! -d "$VENV_DIR" ] && err "Chưa tìm thấy virtualenv tại $VENV_DIR. Hãy chạy 01_setup_cuda_torch.sh trước."

step "BƯỚC 1/3: CÀI ĐẶT HUGGINGFACE TRANSFORMERS & SENTENCEPIECE"

# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"
pip install "transformers==4.47.1" "tokenizers>=0.21.0" "sentencepiece>=0.2.0" safetensors --quiet
log "Cài đặt Transformers thành công: $(python3 -c "import transformers; print(transformers.__version__)")"

step "BƯỚC 2/3: TẢI MODEL VIT5 VỀ BỘ NHỚ ĐỆM LOCAL"

python3 -c "
import time, torch
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

model_id = 'chamdentimem/ViT5_Vietnamese_Correction'
print(f'⏳ Đang tải Tokenizer và Trọng số: {model_id}...')
t0 = time.time()
tokenizer = AutoTokenizer.from_pretrained(model_id, use_fast=False)
model = AutoModelForSeq2SeqLM.from_pretrained(model_id)
print(f'✅ Nạp model thành công trong {(time.time() - t0):.1f}s')
"

step "BƯỚC 3/3: SO SÁNH HIỆU NĂNG: CPU INT8 VS GPU CUDA FP16 TRÊN JETSON"

python3 -c "
import time, torch
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

model_id = 'chamdentimem/ViT5_Vietnamese_Correction'
tokenizer = AutoTokenizer.from_pretrained(model_id, use_fast=False)
raw_model = AutoModelForSeq2SeqLM.from_pretrained(model_id)
raw_model.eval()

sample_text = 'Bé chăm chỉ họk tập và vâng lời cha mẹ cô giáo.'
inputs = tokenizer(sample_text, return_tensors='pt')

print('─────────────────────────────────────────')
print(f'📝 Câu đầu vào: \"{sample_text}\"')
print('─────────────────────────────────────────')

# 1. Chế độ CPU Dynamic INT8 Quantization
print('🧪 [Chế độ 1]: CPU Dynamic INT8 Quantization...')
int8_model = torch.quantization.quantize_dynamic(raw_model, {torch.nn.Linear}, dtype=torch.qint8)
t_start = time.time()
with torch.no_grad():
    out_ids = int8_model.generate(**inputs, max_new_tokens=32)
res_text_cpu = tokenizer.decode(out_ids[0], skip_special_tokens=True)
lat_cpu = (time.time() - t_start) * 1000
print(f'  • Kết quả: \"{res_text_cpu}\"')
print(f'  • Độ trễ: {lat_cpu:.1f}ms')

# 2. Chế độ GPU CUDA (nếu khả dụng)
if torch.cuda.is_available():
    print('🧪 [Chế độ 2]: GPU CUDA FP16 (NVIDIA Maxwell)...')
    gpu_model = raw_model.to('cuda').half()
    gpu_inputs = {k: v.to('cuda') for k, v in inputs.items()}
    
    # Warmup
    _ = gpu_model.generate(**gpu_inputs, max_new_tokens=32)
    
    t_start = time.time()
    with torch.no_grad():
        out_ids_gpu = gpu_model.generate(**gpu_inputs, max_new_tokens=32)
    res_text_gpu = tokenizer.decode(out_ids_gpu[0], skip_special_tokens=True)
    lat_gpu = (time.time() - t_start) * 1000
    print(f'  • Kết quả: \"{res_text_gpu}\"')
    print(f'  • Độ trễ: {lat_gpu:.1f}ms')
    print('─────────────────────────────────────────')
    speedup = lat_cpu / lat_gpu if lat_gpu > 0 else 1.0
    print(f'🚀 Tăng tốc GPU so với CPU: {speedup:.2f}x')
else:
    print('ℹ️ GPU CUDA chưa khả dụng trong PyTorch hiện tại, sử dụng CPU INT8 mặc định.')
print('─────────────────────────────────────────')
"

deactivate

echo -e "\n${GREEN}${BOLD}✅ [BƯỚC 3 HOÀN TẤT] ViT5 Spell Correction đã sẵn sàng trên Jetson Nano!${NC}"
echo -e "  Tiếp theo: Chạy ${YELLOW}bash 04_setup_qwen_slm.sh${NC}\n"
