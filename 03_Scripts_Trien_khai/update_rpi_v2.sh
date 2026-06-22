#!/bin/bash
# ╔══════════════════════════════════════════════════════════════════════╗
# ║   ViHand Grade — Script cập nhật v2 cho Raspberry Pi 4              ║
# ║   Hỗ trợ: Next.js webapp + Python FastAPI service (ViT5)            ║
# ║                                                                      ║
# ║   CÁCH DÙNG:                                                         ║
# ║     chmod +x update_rpi_v2.sh && ./update_rpi_v2.sh                 ║
# ║     ./update_rpi_v2.sh --web-only     # Chỉ cập nhật Next.js        ║
# ║     ./update_rpi_v2.sh --python-only  # Chỉ cập nhật Python service ║
# ║     ./update_rpi_v2.sh --quick        # Chỉ restart, không build    ║
# ║     ./update_rpi_v2.sh --status       # Kiểm tra trạng thái         ║
# ╚══════════════════════════════════════════════════════════════════════╝

set -e

# ── Màu sắc terminal ──────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

ok()     { echo -e "${GREEN}  ✔  $1${NC}"; }
warn()   { echo -e "${YELLOW}  ⚠  $1${NC}"; }
err()    { echo -e "${RED}  ✘  $1${NC}"; exit 1; }
info()   { echo -e "${CYAN}  ➜  $1${NC}"; }
banner() {
  echo ""
  echo -e "${CYAN}${BOLD}╔══════════════════════════════════════════════════════╗${NC}"
  printf "${CYAN}${BOLD}║  %-52s║${NC}\n" "$1"
  echo -e "${CYAN}${BOLD}╚══════════════════════════════════════════════════════╝${NC}"
  echo ""
}
divider() { echo -e "${DIM}  ──────────────────────────────────────────────────${NC}"; }

# ── Cấu hình ──────────────────────────────────────────────────────────
APP_DIR="$HOME/vihand-grade"
ENV_FILE="$APP_DIR/.env.local"
WEB_SERVICE="vihand"
PYTHON_SERVICE="vihand-python"
NODE_MEM="--max-old-space-size=1024"
PYTHON_VENV="$APP_DIR/python_service/venv"

# ══════════════════════════════════════════════════════════════════════
# PHẦN A: Kiểm tra trạng thái
# ══════════════════════════════════════════════════════════════════════
check_status() {
  banner "TRẠNG THÁI HỆ THỐNG VIHAND GRADE v2"

  echo -e "${BOLD}  📋 Services:${NC}"
  for svc in "$WEB_SERVICE" "$PYTHON_SERVICE"; do
    if systemctl is-active --quiet "$svc" 2>/dev/null; then
      ok "$svc đang CHẠY"
    else
      warn "$svc không chạy (hoặc chưa cài)"
    fi
  done

  divider
  echo -e "${BOLD}  🌐 Mạng:${NC}"
  IP=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "N/A")
  ok "IP nội bộ: $IP"
  curl -s --max-time 3 "http://localhost:3000" > /dev/null 2>&1 \
    && ok "Next.js phản hồi tại :3000" \
    || warn "Next.js không phản hồi tại :3000"
  curl -s --max-time 3 "http://localhost:8000/health" > /dev/null 2>&1 \
    && ok "Python service phản hồi tại :8000" \
    || warn "Python service không phản hồi tại :8000"

  divider
  echo -e "${BOLD}  🔑 API Keys:${NC}"
  if [ -f "$ENV_FILE" ]; then
    KEY_LINE=$(grep "^GEMINI_API_KEYS\|^GEMINI_API_KEY" "$ENV_FILE" 2>/dev/null | head -1 || echo "")
    if [ -n "$KEY_LINE" ]; then
      KEY_COUNT=$(echo "$KEY_LINE" | cut -d'=' -f2- | tr ',' '\n' | wc -l)
      ok "$KEY_COUNT API key được cấu hình"
    else
      warn "Chưa có GEMINI_API_KEY trong .env.local"
    fi
  else
    warn ".env.local chưa tồn tại"
  fi

  divider
  echo -e "${BOLD}  💾 Tài nguyên:${NC}"
  df -h "$APP_DIR" 2>/dev/null | awk 'NR==2 {printf "  Ổ đĩa: %s / %s (%s)\n", $3, $2, $5}'
  free -h | awk '/^Mem:/ {printf "  RAM:   %s / %s\n", $3, $2}'
  echo -e "  Nhiệt độ: $(vcgencmd measure_temp 2>/dev/null || echo 'N/A')"
  echo ""
}

# ══════════════════════════════════════════════════════════════════════
# PHẦN B: Pull code từ GitHub
# ══════════════════════════════════════════════════════════════════════
pull_code() {
  banner "KÉO CODE MỚI TỪ GITHUB"

  [ ! -d "$APP_DIR/.git" ] && err "Không tìm thấy repo git tại $APP_DIR"

  cd "$APP_DIR"

  # Bảo toàn .env.local
  [ -f .env.local ] && cp .env.local /tmp/.env.local.bak

  info "Fetch origin/main..."
  git fetch origin main 2>&1 | tail -2

  LOCAL=$(git rev-parse HEAD)
  REMOTE=$(git rev-parse origin/main)

  if [ "$LOCAL" = "$REMOTE" ]; then
    ok "Code đã là mới nhất — không có commit mới."
    CODE_UPDATED=false
  else
    BEHIND=$(git rev-list HEAD..origin/main --count)
    info "Có $BEHIND commit mới, đang pull..."
    git checkout -- .
    git pull origin main
    COMMIT_MSG=$(git log -1 --pretty=format:"%s (%cr)" 2>/dev/null || echo "N/A")
    ok "Đã cập nhật: $COMMIT_MSG"
    CODE_UPDATED=true
  fi

  # Phục hồi .env.local nếu bị overwrite
  if [ -f /tmp/.env.local.bak ] && [ ! -f .env.local ]; then
    cp /tmp/.env.local.bak .env.local
    warn "Đã phục hồi .env.local từ backup"
  fi
  rm -f /tmp/.env.local.bak

  # Kiểm tra .env.local
  if [ ! -f "$ENV_FILE" ]; then
    warn ".env.local không tồn tại! Tạo mẫu..."
    cat > "$ENV_FILE" <<'EOF'
# ViHand Grade — Environment Variables
# Điền API key của bạn vào đây:
GEMINI_API_KEY=AIza...
GEMINI_API_KEYS=AIza...

# SQLite database path
DATABASE_URL=file:./prisma/vihand.db
EOF
    warn "Đã tạo .env.local mẫu — hãy điền API key trước khi chạy!"
  fi
}

# ══════════════════════════════════════════════════════════════════════
# PHẦN C: Cập nhật Next.js webapp
# ══════════════════════════════════════════════════════════════════════
update_web() {
  banner "CẬP NHẬT NEXT.JS WEBAPP"
  cd "$APP_DIR"

  # Install deps
  info "[1/3] Cài đặt npm dependencies..."
  if [ "$CODE_UPDATED" = true ] || [ ! -d node_modules ]; then
    npm install 2>&1 | tail -3
    ok "npm install hoàn tất"
  else
    ok "Bỏ qua npm install (không có thay đổi package.json)"
  fi

  # Prisma
  info "[2/3] Đồng bộ database schema..."
  export DATABASE_URL=$(grep "^DATABASE_URL" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2- \
                        || echo "file:./prisma/vihand.db")
  npx prisma generate --schema=./prisma/schema.prisma 2>&1 | tail -2
  npx prisma db push --schema=./prisma/schema.prisma --accept-data-loss --skip-generate 2>&1 | tail -2
  ok "Database schema đã đồng bộ"

  # Build
  info "[3/3] Build Next.js (mất ~5-10 phút trên RPi4)..."
  rm -rf .next
  export NODE_OPTIONS="$NODE_MEM"
  if npm run build 2>&1; then
    ok "Build Next.js thành công!"
  else
    err "Build Next.js thất bại! Kiểm tra lỗi ở trên."
  fi
}

# ══════════════════════════════════════════════════════════════════════
# PHẦN D: Cập nhật Python service (ViT5)
# ══════════════════════════════════════════════════════════════════════
update_python() {
  banner "CẬP NHẬT PYTHON SERVICE (ViT5)"
  cd "$APP_DIR/python_service"

  # Tạo venv nếu chưa có
  if [ ! -d "$PYTHON_VENV" ]; then
    info "Tạo Python virtual environment..."
    python3 -m venv "$PYTHON_VENV"
    ok "Đã tạo venv tại $PYTHON_VENV"
  fi

  # Activate venv
  source "$PYTHON_VENV/bin/activate"

  # Upgrade pip
  info "[1/2] Upgrade pip..."
  pip install --upgrade pip --quiet

  # Cài requirements
  info "[2/2] Cài đặt Python dependencies..."
  if [ -f requirements.txt ]; then
    # --extra-index-url cho PyTorch CPU-only (nhẹ hơn cho RPi4)
    pip install -r requirements.txt \
      --extra-index-url https://download.pytorch.org/whl/cpu \
      --quiet 2>&1 | tail -5
    ok "Python dependencies đã cài xong"
  else
    warn "Không tìm thấy requirements.txt trong python_service/"
  fi

  deactivate
}

# ══════════════════════════════════════════════════════════════════════
# PHẦN E: Khởi động lại services
# ══════════════════════════════════════════════════════════════════════
restart_services() {
  banner "KHỞI ĐỘNG LẠI SERVICES"

  # Restart Next.js service
  if systemctl is-enabled --quiet "$WEB_SERVICE" 2>/dev/null; then
    info "Khởi động lại $WEB_SERVICE..."
    sudo systemctl restart "$WEB_SERVICE"
    sleep 5
    if systemctl is-active --quiet "$WEB_SERVICE"; then
      ok "$WEB_SERVICE đang chạy"
    else
      warn "$WEB_SERVICE không khởi động được. Xem: sudo journalctl -u $WEB_SERVICE -n 20"
    fi
  else
    warn "Service $WEB_SERVICE chưa cài (systemd). Khởi động nền..."
    export NODE_OPTIONS="$NODE_MEM"
    nohup npm --prefix "$APP_DIR" run start > /tmp/vihand-web.log 2>&1 &
    ok "Next.js đang chạy (PID: $!). Log: /tmp/vihand-web.log"
  fi

  # Restart Python service
  if systemctl is-enabled --quiet "$PYTHON_SERVICE" 2>/dev/null; then
    info "Khởi động lại $PYTHON_SERVICE..."
    sudo systemctl restart "$PYTHON_SERVICE"
    sleep 3
    if systemctl is-active --quiet "$PYTHON_SERVICE"; then
      ok "$PYTHON_SERVICE đang chạy"
    else
      warn "$PYTHON_SERVICE không khởi động. Xem: sudo journalctl -u $PYTHON_SERVICE -n 20"
    fi
  else
    warn "Service $PYTHON_SERVICE chưa cài. Khởi động nền..."
    source "$PYTHON_VENV/bin/activate" 2>/dev/null || true
    nohup python3 "$APP_DIR/python_service/main.py" > /tmp/vihand-python.log 2>&1 &
    ok "Python service đang chạy (PID: $!). Log: /tmp/vihand-python.log"
    deactivate 2>/dev/null || true
  fi
}

# ══════════════════════════════════════════════════════════════════════
# PHẦN F: Tóm tắt kết quả
# ══════════════════════════════════════════════════════════════════════
show_summary() {
  IP=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "N/A")
  TUNNEL_URL=$(sudo journalctl -u cloudflared -n 20 --no-pager 2>/dev/null \
    | grep -oP 'https://[a-z0-9\-]+\.trycloudflare\.com' | tail -1)

  echo ""
  echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}${BOLD}║          ✅  CẬP NHẬT HOÀN TẤT!   🎉               ║${NC}"
  echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "  🌐 LAN (Web)    : ${CYAN}http://${IP}:3000${NC}"
  echo -e "  🐍 Python API   : ${CYAN}http://${IP}:8000${NC}"
  [ -n "$TUNNEL_URL" ] && echo -e "  🌍 Internet     : ${CYAN}${TUNNEL_URL}${NC}"
  echo ""
  echo -e "  📋 Log Next.js  : ${DIM}sudo journalctl -u ${WEB_SERVICE} -f${NC}"
  echo -e "  📋 Log Python   : ${DIM}sudo journalctl -u ${PYTHON_SERVICE} -f${NC}"
  echo -e "  🔄 Chạy lại    : ${DIM}./update_rpi_v2.sh${NC}"
  echo -e "  📊 Kiểm tra    : ${DIM}./update_rpi_v2.sh --status${NC}"
  echo ""
}

# ══════════════════════════════════════════════════════════════════════
# MAIN — Header + Điều phối
# ══════════════════════════════════════════════════════════════════════
echo -e "${CYAN}${BOLD}"
echo "  ╔══════════════════════════════════════════════════════╗"
echo "  ║   ViHand Grade — Raspberry Pi 4 Updater v2.0        ║"
echo "  ║   Next.js + Python ViT5 Service                     ║"
echo "  ╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo -e "  ${DIM}App dir : $APP_DIR${NC}"
echo -e "  ${DIM}Thời gian: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo ""

# Kiểm tra thư mục app
[ ! -d "$APP_DIR" ] && err "Không tìm thấy '$APP_DIR'. Hãy chạy setup_rpi.sh trước."

CODE_UPDATED=false

case "${1:-}" in
  --status)
    check_status
    ;;

  --quick)
    banner "QUICK RESTART"
    restart_services
    show_summary
    ;;

  --web-only)
    pull_code
    update_web
    restart_services
    show_summary
    ;;

  --python-only)
    pull_code
    update_python
    restart_services
    show_summary
    ;;

  ""|--all)
    # Cập nhật đầy đủ
    pull_code
    update_web
    update_python
    restart_services
    show_summary
    ;;

  --help|-h)
    echo -e "  ${BOLD}CÁCH DÙNG:${NC}"
    echo ""
    echo "    ./update_rpi_v2.sh               Cập nhật toàn bộ (code + web + python + restart)"
    echo "    ./update_rpi_v2.sh --web-only    Chỉ cập nhật Next.js webapp"
    echo "    ./update_rpi_v2.sh --python-only Chỉ cập nhật Python ViT5 service"
    echo "    ./update_rpi_v2.sh --quick       Chỉ restart services (không pull, không build)"
    echo "    ./update_rpi_v2.sh --status      Kiểm tra trạng thái hệ thống"
    echo "    ./update_rpi_v2.sh --help        Xem hướng dẫn này"
    echo ""
    ;;

  *)
    echo -e "${RED}  Tham số không hợp lệ: $1${NC}"
    echo "  Chạy: ./update_rpi_v2.sh --help"
    exit 1
    ;;
esac
