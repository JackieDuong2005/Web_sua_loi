#!/bin/bash
# ==============================================================================
# ViHand Grade — NVIDIA Jetson Nano: BƯỚC 4: CẤU HÌNH QWEN2.5 SLM & EDGE-TTS
# Kiểm tra bộ nhớ RAM/VRAM khả dụng và thiết lập mô hình ngôn ngữ nhỏ sư phạm
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
ENV_FILE="$APP_DIR/.env.local"

step "BƯỚC 1/3: CÀI ĐẶT EDGE-TTS & PHẦN PHỤ TRỢ"

# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"
pip install edge-tts fastapi "uvicorn[standard]" pydantic --quiet
log "Edge-TTS và FastAPI đã được cài đặt."

step "BƯỚC 2/3: KIỂM TRA BỘ NHỚ VÀ ĐÁNH GIÁ KHẢ NĂNG CHẠY QWEN2.5-0.5B"

FREE_MEM=$(free -m | awk '/^Mem:/{print $7}')
log "RAM trống hiện tại: ${FREE_MEM}MB"

if [ "$FREE_MEM" -lt 1200 ]; then
    warn "RAM khả dụng (${FREE_MEM}MB) thấp hơn 1200MB."
    warn "Mô hình Qwen2.5-0.5B chiếm khoảng 1.1GB RAM. Khi chạy kèm ViT5 có thể kích hoạt Swap."
    echo -e "  Khuyến nghị:"
    echo -e "    • Bật Qwen SLM (ENABLE_QWEN_SLM=1) nếu đã tạo Swap >= 4GB."
    echo -e "    • Tắt Qwen SLM (ENABLE_QWEN_SLM=0) để hệ thống siêu nhẹ, dùng Fallback Tầng 1 SGK."
fi

read -rp "  Bạn có muốn kích hoạt Qwen2.5 SLM trên Jetson Nano không? [Y/n]: " ENABLE_QWEN
ENABLE_QWEN=${ENABLE_QWEN:-Y}

if [[ "$ENABLE_QWEN" =~ ^[Yy]$ ]]; then
    log "Đang kiểm tra tải trước Qwen/Qwen2.5-0.5B-Instruct..."
    python3 -c "
import time, torch
from transformers import AutoTokenizer, AutoModelForCausalLM

model_id = 'Qwen/Qwen2.5-0.5B-Instruct'
print(f'⏳ Nạp thử nghiệm {model_id}...')
t0 = time.time()
tok = AutoTokenizer.from_pretrained(model_id)
dev = 'cuda' if torch.cuda.is_available() else 'cpu'
m = AutoModelForCausalLM.from_pretrained(model_id, torch_dtype=torch.float16 if dev=='cuda' else torch.float32)
m = m.to(dev)
print(f'✅ Nạp Qwen SLM thành công trên {dev} trong {(time.time()-t0):.1f}s!')

# Test sinh câu nhận xét
prompt = '<|im_start|>system\nBạn là giáo viên tiểu học.<|im_end|>\n<|im_start|>user\nViết lời khen học sinh viết chữ đẹp.<|im_end|>\n<|im_start|>assistant\n'
inputs = tok(prompt, return_tensors='pt').to(dev)
out = m.generate(**inputs, max_new_tokens=40, do_sample=False)
print('📝 Output Qwen:', tok.decode(out[0], skip_special_tokens=True).split('assistant')[-1].strip())
"
    QWEN_VAL=1
else
    log "Đã tắt Qwen SLM. Hệ thống sẽ sử dụng ngân hàng nhận xét sư phạm Tầng 1 (cực nhanh, 0MB RAM)."
    QWEN_VAL=0
fi

deactivate

step "BƯỚC 3/3: CẬP NHẬT CẤU HÌNH VÀO .env.local"

if [ -f "$ENV_FILE" ]; then
    if grep -q "ENABLE_QWEN_SLM" "$ENV_FILE"; then
        sed -i "s|^ENABLE_QWEN_SLM=.*|ENABLE_QWEN_SLM=$QWEN_VAL|" "$ENV_FILE"
    else
        echo "ENABLE_QWEN_SLM=$QWEN_VAL" >> "$ENV_FILE"
    fi
    log "Đã thiết lập ENABLE_QWEN_SLM=$QWEN_VAL trong $ENV_FILE"
fi

echo -e "\n${GREEN}${BOLD}✅ [BƯỚC 4 HOÀN TẤT] Cấu hình Qwen SLM và Edge-TTS đã hoàn tất!${NC}"
echo -e "  Tiếp theo: Chạy ${YELLOW}bash 05_setup_webapp.sh${NC}\n"
