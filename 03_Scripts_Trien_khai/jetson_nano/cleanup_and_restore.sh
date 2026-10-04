#!/bin/bash
# ==============================================================================
# ViHand Grade — NVIDIA Jetson Nano: CLEANUP & RESTORE SCRIPT
# Khôi phục nguyên trạng hệ thống 100% về trước khi test:
#   1. Tắt sạch toàn bộ tiến trình ViHand Grade đang chạy ngầm (port 8000, 3000)
#   2. Gỡ bỏ và xóa Swapfile tạm thời (/swapfile_vihand_temp)
#   3. Dọn dẹp virtualenv, file cache và log thử nghiệm
#   4. Gỡ bỏ systemd service nếu có tạo
#   5. Tuyệt đối KHÔNG đụng chạm đến bất kỳ folder nào khác trên SD card
# ==============================================================================
set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RED='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[⚠]${NC} $1"; }
step() { echo -e "\n${CYAN}${BOLD}═══════════════════════════════════════════════════════════${NC}"; echo -e "${CYAN}${BOLD}  $1${NC}"; echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════${NC}\n"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_DIR="$SCRIPT_DIR/logs"
PID_FILE="$LOG_DIR/vihand_server.pids"
TEMP_SWAP="/swapfile_vihand_temp"

echo -e "\n${RED}${BOLD}================================================================${NC}"
echo -e "${RED}${BOLD}  VIHAND GRADE — KHÔI PHỤC NGUYÊN TRẠNG JETSON NANO (CLEANUP)   ${NC}"
echo -e "${RED}${BOLD}================================================================${NC}\n"

step "1/4. DỪNG CÁC TIẾN TRÌNH SERVER VIHAND ĐANG CHẠY"

# Dừng theo file PID
if [ -f "$PID_FILE" ]; then
    # shellcheck disable=SC1090
    source "$PID_FILE" 2>/dev/null || true
    if [ -n "$PYTHON_PID" ] && kill -0 "$PYTHON_PID" 2>/dev/null; then
        kill "$PYTHON_PID" 2>/dev/null || true
        log "Đã dừng tiến trình Python AI Core (PID: $PYTHON_PID)."
    fi
    if [ -n "$WEB_PID" ] && kill -0 "$WEB_PID" 2>/dev/null; then
        kill "$WEB_PID" 2>/dev/null || true
        log "Đã dừng tiến trình Web App (PID: $WEB_PID)."
    fi
    rm -f "$PID_FILE"
fi

# Quét và tắt sạch theo cổng 8000 và 3000
for PORT in 8000 3000; do
    PID=$(lsof -ti :$PORT 2>/dev/null || true)
    if [ -n "$PID" ]; then
        kill -9 "$PID" 2>/dev/null || true
        log "Đã giải phóng cổng $PORT (kill PID: $PID)."
    fi
done

# Dừng nếu có cài systemd service
if systemctl is-active --quiet vihand-web 2>/dev/null; then
    sudo systemctl stop vihand-web 2>/dev/null || true
fi
if systemctl is-active --quiet vihand-python 2>/dev/null; then
    sudo systemctl stop vihand-python 2>/dev/null || true
fi

for SVC in vihand-web vihand-python; do
    if [ -f "/etc/systemd/system/${SVC}.service" ]; then
        sudo systemctl disable "$SVC" 2>/dev/null || true
        sudo rm -f "/etc/systemd/system/${SVC}.service"
        log "Đã gỡ bỏ dịch vụ systemd: $SVC"
    fi
done
sudo systemctl daemon-reload 2>/dev/null || true

step "2/4. GỠ BỎ SWAPFILE TẠM THỜI (GIẢI PHÓNG DUNG LƯỢNG SD CARD)"

if [ -f "$TEMP_SWAP" ]; then
    log "Đang tắt swap tạm thời $TEMP_SWAP..."
    sudo swapoff "$TEMP_SWAP" 2>/dev/null || true
    sudo rm -f "$TEMP_SWAP"
    log "Đã xóa file $TEMP_SWAP (Giải phóng 3GB trên thẻ nhớ SD)."
else
    log "Không phát hiện swapfile tạm thời của ViHand Grade. Giữ nguyên swap hệ thống."
fi

step "3/4. DỌN DẸP MÔI TRƯỜNG ẢO VENV & CACHE CỤC BỘ"

read -rp "  Bạn có muốn xóa thư mục virtualenv (python_service/venv) để tiết kiệm dung lượng không? [Y/n]: " DEL_VENV
DEL_VENV=${DEL_VENV:-Y}

if [[ "$DEL_VENV" =~ ^[Yy]$ ]]; then
    if [ -d "$APP_DIR/python_service/venv" ]; then
        rm -rf "$APP_DIR/python_service/venv"
        log "Đã xóa $APP_DIR/python_service/venv."
    fi
    rm -rf "$APP_DIR/.next" "$APP_DIR/python_service/__pycache__" "$LOG_DIR" 2>/dev/null || true
    log "Đã dọn dẹp các thư mục build tạm thời và logs."
else
    log "Giữ lại virtualenv để lần sau test nhanh hơn."
fi

step "4/4. KIỂM TRA TRẠNG THÁI CUỐI CÙNG CỦA HỆ THỐNG"

echo -e "  • Bộ nhớ RAM:"
free -h
echo ""
echo -e "  • Kiểm tra các cổng 8000 và 3000:"
netstat -tulpn 2>/dev/null | grep -E ':8000|:3000' || log "Cổng 8000 và 3000 hoàn toàn sạch sẽ, không còn tiến trình nào chiếm dụng."

echo -e "\n${GREEN}${BOLD}================================================================${NC}"
echo -e "${GREEN}${BOLD}  ✅ JETSON NANO ĐÃ ĐƯỢC PHỤC HỒI NGUYÊN TRẠNG THÀNH CÔNG!     ${NC}"
echo -e "${GREEN}${BOLD}  Các folder và dự án khác trên SD card hoàn toàn nguyên vẹn.   ${NC}"
echo -e "${GREEN}${BOLD}================================================================${NC}\n"
