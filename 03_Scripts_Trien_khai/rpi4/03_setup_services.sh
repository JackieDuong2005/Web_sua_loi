#!/bin/bash
# ==============================================================================
# ViHand Grade — Raspberry Pi 4: BƯỚC 3: CẤU HÌNH SYSTEMD SERVICES
# (vihand-python.service trên cổng 8000 & vihand-web.service trên cổng 3000)
# ==============================================================================
set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RED='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✔]${NC} $1"; }
warn() { echo -e "${YELLOW}[⚠]${NC} $1"; }
err()  { echo -e "${RED}[✗] $1${NC}"; exit 1; }
step() { echo -e "\n${CYAN}${BOLD}═══════════════════════════════════════════════════════════${NC}"; echo -e "${CYAN}${BOLD}  $1${NC}"; echo -e "${CYAN}${BOLD}═══════════════════════════════════════════════════════════${NC}\n"; }

[ "$EUID" -ne 0 ] && err "Vui lòng chạy script với quyền sudo: sudo bash 03_setup_services.sh"

APP_USER="${SUDO_USER:-$(logname 2>/dev/null || whoami)}"
[ "$APP_USER" = "root" ] && APP_USER="$(ls -ld "$APP_DIR" | awk '{print $3}')"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEMPLATE_DIR="$APP_DIR/03_Scripts_Trien_khai/shared"
PYTHON_VENV="$APP_DIR/python_service/venv"
NODE_BIN="$(command -v node || which node 2>/dev/null || echo "/usr/bin/node")"
PORT=3000

step "BƯỚC 1/3: SINH CẤU HÌNH SYSTEMD TỪ TEMPLATE"

log "Người dùng vận hành: $APP_USER"
log "Thư mục ứng dụng: $APP_DIR"
log "Node binary: $NODE_BIN"
log "Python venv: $PYTHON_VENV"

[ ! -x "$NODE_BIN" ] && err "Không tìm thấy node binary tại $NODE_BIN"
[ ! -d "$PYTHON_VENV" ] && err "Không tìm thấy Python venv tại $PYTHON_VENV. Hãy chạy 01_setup_python_ai.sh trước."

# Đảm bảo phân quyền chính xác cho người dùng vận hành
log "Phân quyền thư mục ứng dụng cho người dùng $APP_USER..."
chown -R "$APP_USER:$APP_USER" "$APP_DIR"
chmod 775 "$APP_DIR/prisma" 2>/dev/null || true
chmod 664 "$APP_DIR/prisma/vihand.db"* 2>/dev/null || true

# 1. Tạo vihand-python.service
PYTHON_SVC="/etc/systemd/system/vihand-python.service"
sed -e "s|{{APP_USER}}|$APP_USER|g" \
    -e "s|{{APP_DIR}}|$APP_DIR|g" \
    -e "s|{{PYTHON_VENV}}|$PYTHON_VENV|g" \
    "$TEMPLATE_DIR/vihand-python.service.template" > "$PYTHON_SVC"
chmod 644 "$PYTHON_SVC"
log "Đã tạo $PYTHON_SVC"

# 2. Tạo vihand-web.service
WEB_SVC="/etc/systemd/system/vihand-web.service"
sed -e "s|{{APP_USER}}|$APP_USER|g" \
    -e "s|{{APP_DIR}}|$APP_DIR|g" \
    -e "s|{{NODE_BIN}}|$NODE_BIN|g" \
    -e "s|{{PORT}}|$PORT|g" \
    "$TEMPLATE_DIR/vihand-web.service.template" > "$WEB_SVC"
chmod 644 "$WEB_SVC"
log "Đã tạo $WEB_SVC"

step "BƯỚC 2/3: NẠP VÀ KÍCH HOẠT DỊCH VỤ TỰ ĐỘNG KHỞI ĐỘNG (AUTO-START)"

systemctl daemon-reload
systemctl enable vihand-python vihand-web
log "Đã kích hoạt tự động chạy vihand-python và vihand-web khi bật nguồn Pi."

step "BƯỚC 3/3: KHỞI ĐỘNG CÁC DỊCH VỤ"

log "Khởi động vihand-python (FastAPI)..."
systemctl restart vihand-python
sleep 5

if systemctl is-active --quiet vihand-python; then
    log "vihand-python đang hoạt động ✔"
else
    warn "vihand-python chưa sẵn sàng. Kiểm tra log: sudo journalctl -u vihand-python -n 20"
fi

log "Khởi động vihand-web (Next.js)..."
systemctl restart vihand-web
sleep 6

if systemctl is-active --quiet vihand-web; then
    log "vihand-web đang hoạt động ✔"
else
    warn "vihand-web chưa sẵn sàng. Kiểm tra log: sudo journalctl -u vihand-web -n 20"
fi

IP=$(hostname -I | awk '{print $1}')
echo -e "\n${GREEN}${BOLD}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  ✅ [BƯỚC 3 HOÀN TẤT] CÁC DỊCH VỤ ĐÃ HOẠT ĐỘNG!${NC}"
echo -e "${GREEN}${BOLD}═══════════════════════════════════════════════════════${NC}"
echo -e "  🌐 Truy cập Web App:   ${CYAN}http://${IP}:${PORT}${NC}"
echo -e "  🐍 Python AI API Docs: ${CYAN}http://${IP}:8000/docs${NC}"
echo -e "  📋 Kiểm tra trạng thái: ${YELLOW}sudo systemctl status vihand-web vihand-python${NC}"
echo -e "  📜 Xem log realtime:   ${YELLOW}sudo journalctl -u vihand-web -f${NC}\n"
