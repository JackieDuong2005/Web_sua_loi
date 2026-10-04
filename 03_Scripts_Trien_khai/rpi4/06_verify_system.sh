#!/bin/bash
# ==============================================================================
# ViHand Grade — Raspberry Pi 4: BƯỚC 6: XÁC THỰC TOÀN DIỆN HỆ THỐNG END-TO-END
# (Kiểm thử cả 4 bề mặt: Web BFF, ViT5 Engine, YOLOv8 Detector, Edge-TTS)
# ==============================================================================
set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RED='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[⚠]${NC} $1"; }
err()  { echo -e "${RED}[✗] $1${NC}"; }
step() { echo -e "\n${CYAN}${BOLD}═══════════════════════════════════════════════════════════${NC}"; echo -e "${CYAN}${BOLD}  $1${NC}"; echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════${NC}\n"; }

PASSED=0
TOTAL=0

check() {
    TOTAL=$((TOTAL + 1))
    local test_name="$1"
    local cmd="$2"
    echo -n "  • Kiểm tra $test_name... "
    if eval "$cmd" > /dev/null 2>&1; then
        echo -e "${GREEN}THÀNH CÔNG ✔${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}THẤT BẠI ✘${NC}"
    fi
}

step "PHẦN 1: KIỂM TRA TRẠNG THÁI SYSTEMD SERVICES"

check "Dịch vụ Python AI (vihand-python.service)" "systemctl is-active --quiet vihand-python"
check "Dịch vụ Next.js Web (vihand-web.service)" "systemctl is-active --quiet vihand-web"
if systemctl is-enabled --quiet cloudflared 2>/dev/null; then
    check "Dịch vụ Cloudflare Tunnel (cloudflared.service)" "systemctl is-active --quiet cloudflared"
fi

step "PHẦN 2: KIỂM THỬ ENDPOINT PYTHON AI CORE (PORT 8000)"

check "FastAPI Documentation (:8000/docs)" "curl -s -f --max-time 5 http://localhost:8000/docs"
check "YOLOv8 Word Detector status (:8000/yolo/status)" "curl -s -f --max-time 5 http://localhost:8000/yolo/status"
check "Qwen2.5 SLM status (:8000/qwen/status)" "curl -s -f --max-time 5 http://localhost:8000/qwen/status"

echo -n "  • Kiểm tra ViT5 Sửa lỗi chính tả tiếng Việt (chờ nạp model)... "
VIT5_OUT=$(curl -s --max-time 45 -X POST http://localhost:8000/correct \
    -H "Content-Type: application/json" \
    -d '{"text": "Em bé chăm chỉ họk tập"}' 2>/dev/null || echo "")

if echo "$VIT5_OUT" | grep -qi "học tập"; then
    echo -e "${GREEN}THÀNH CÔNG ✔ (Đã sửa 'họk tập' -> 'học tập')${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${YELLOW}CẢNH BÁO ⚠ (Output: $VIT5_OUT)${NC}"
fi
TOTAL=$((TOTAL + 1))

echo -n "  • Kiểm tra Microsoft Edge-TTS phát âm audio MP3... "
TTS_CODE=$(curl -s -o /tmp/test_tts.mp3 -w "%{http_code}" --max-time 10 "http://localhost:8000/tts?text=Xin%20chao%20Viet%20Nam" 2>/dev/null || echo "500")
if [ "$TTS_CODE" = "200" ] && [ -s /tmp/test_tts.mp3 ]; then
    echo -e "${GREEN}THÀNH CÔNG ✔ ($(wc -c < /tmp/test_tts.mp3) bytes MP3)${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "${RED}THẤT BẠI ✘ (HTTP: $TTS_CODE)${NC}"
fi
TOTAL=$((TOTAL + 1))
rm -f /tmp/test_tts.mp3

step "PHẦN 3: KIỂM THỬ WEB APP NEXT.JS & BFF GATEWAY (PORT 3000)"

check "Next.js Trang chủ (:3000)" "curl -s -f --max-time 10 http://localhost:3000/"
check "API Warmup ViT5 qua Next.js Gateway" "curl -s -f --max-time 15 http://localhost:3000/api/vit5-warmup"

step "TỔNG KẾT KẾT QUẢ KIỂM THỬ"

echo -e "  Kết quả: ${BOLD}${PASSED}/${TOTAL}${NC} bài kiểm tra đạt chuẩn."
if [ "$PASSED" -eq "$TOTAL" ]; then
    echo -e "\n${GREEN}${BOLD}🎉 TẤT CẢ CÁC THÀNH PHẦN CỦA HỆ THỐNG VIHAND GRADE HOẠT ĐỘNG HOÀN HẢO!${NC}\n"
else
    echo -e "\n${YELLOW}${BOLD}⚠ Một số dịch vụ chưa phản hồi. Vui lòng kiểm tra log chi tiết:${NC}"
    echo "  sudo journalctl -u vihand-python -n 30"
    echo "  sudo journalctl -u vihand-web -n 30"
fi
