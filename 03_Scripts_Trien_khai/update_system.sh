#!/bin/bash
# ╔══════════════════════════════════════════════════════════════════════╗
# ║   ViHand Grade — Script cập nhật tổng hợp cho Raspberry Pi 4        ║
# ║                                                                      ║
# ║   CÁCH DÙNG:                                                         ║
# ║     chmod +x update_system.sh                                        ║
# ║     ./update_system.sh              # Cập nhật toàn bộ hệ thống      ║
# ║     ./update_system.sh --keys-only  # Chỉ cập nhật API keys          ║
# ║     ./update_system.sh --code-only  # Chỉ pull code + rebuild        ║
# ║     ./update_system.sh --status     # Kiểm tra trạng thái hệ thống   ║
# ╚══════════════════════════════════════════════════════════════════════╝

# ── Màu sắc terminal ──────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# ── Hàm log ───────────────────────────────────────────────────────────
ok()     { echo -e "${GREEN}  ✔  $1${NC}"; }
warn()   { echo -e "${YELLOW}  ⚠  $1${NC}"; }
err()    { echo -e "${RED}  ✘  $1${NC}"; }
info()   { echo -e "${CYAN}  ➜  $1${NC}"; }
banner() {
  echo ""
  echo -e "${CYAN}${BOLD}╔══════════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}${BOLD}║  $1$(printf '%*s' $((51 - ${#1})) '')║${NC}"
  echo -e "${CYAN}${BOLD}╚══════════════════════════════════════════════════════╝${NC}"
  echo ""
}
divider() { echo -e "${DIM}  ──────────────────────────────────────────────────${NC}"; }

# ── Cấu hình ──────────────────────────────────────────────────────────
APP_DIR="/home/$(whoami)/vihand-grade"
ENV_FILE="$APP_DIR/.env.local"
SERVICE_NAME="vihand"

# ══════════════════════════════════════════════════════════════════════
# PHẦN A: Kiểm tra trạng thái hệ thống
# ══════════════════════════════════════════════════════════════════════
check_status() {
  banner "TRẠNG THÁI HỆ THỐNG VIHAND GRADE"

  # Service
  echo -e "${BOLD}  📋 Service systemd:${NC}"
  if systemctl is-active --quiet "$SERVICE_NAME"; then
    ok "vihand.service đang CHẠY"
    uptime_info=$(systemctl show vihand --property=ActiveEnterTimestamp --value 2>/dev/null || echo "N/A")
    info "Khởi động từ: $uptime_info"
  else
    err "vihand.service KHÔNG chạy"
    warn "Chạy: sudo systemctl start vihand"
  fi

  divider

  # Network
  echo -e "${BOLD}  🌐 Mạng:${NC}"
  IP=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "Không xác định")
  ok "IP nội bộ: $IP"
  if curl -s --max-time 3 "http://localhost:3000" > /dev/null 2>&1; then
    ok "Web đang phản hồi tại http://localhost:3000"
  else
    warn "Web không phản hồi tại cổng 3000"
  fi

  divider

  # API Keys
  echo -e "${BOLD}  🔑 API Keys:${NC}"
  if [ -f "$ENV_FILE" ]; then
    KEY_LINE=$(grep "^GEMINI_API_KEYS" "$ENV_FILE" 2>/dev/null || echo "")
    if [ -n "$KEY_LINE" ]; then
      KEY_COUNT=$(echo "$KEY_LINE" | cut -d'=' -f2- | tr ',' '\n' | wc -l)
      ok "$KEY_COUNT API key đang được cấu hình:"
      echo "$KEY_LINE" | cut -d'=' -f2- | tr ',' '\n' | nl | while read n key; do
        key_trimmed=$(echo "$key" | xargs)
        printf "      ${DIM}%d. ${key_trimmed:0:18}...${key_trimmed: -4}${NC}\n" "$n"
      done
    else
      warn "Không tìm thấy GEMINI_API_KEYS trong .env.local"
    fi
  else
    err "File .env.local không tồn tại tại $ENV_FILE"
  fi

  divider

  # Disk & Memory
  echo -e "${BOLD}  💾 Tài nguyên:${NC}"
  df -h "$APP_DIR" 2>/dev/null | awk 'NR==2 {printf "  Ổ đĩa: %s dùng / %s tổng (%s)\n", $3, $2, $5}'
  free -h | awk '/^Mem:/ {printf "  RAM:   %s dùng / %s tổng\n", $3, $2}'

  echo ""
}

# ══════════════════════════════════════════════════════════════════════
# PHẦN B: Cập nhật API Keys
# ══════════════════════════════════════════════════════════════════════
update_api_keys() {
  banner "CẬP NHẬT API KEYS"

  # Hiển thị keys hiện tại
  if [ -f "$ENV_FILE" ]; then
    CURRENT_KEYS=$(grep "^GEMINI_API_KEYS" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2-)
    if [ -n "$CURRENT_KEYS" ]; then
      info "Keys hiện tại:"
      echo "$CURRENT_KEYS" | tr ',' '\n' | nl | while read n key; do
        key_trimmed=$(echo "$key" | xargs)
        printf "    ${DIM}%d. ${key_trimmed:0:20}...${NC}\n" "$n"
      done
      echo ""
    fi
  fi

  # Hỏi người dùng muốn làm gì
  echo -e "${BOLD}  Bạn muốn:${NC}"
  echo "    1) Nhập danh sách keys mới hoàn toàn"
  echo "    2) Thêm key vào danh sách hiện tại"
  echo "    3) Xóa một key khỏi danh sách"
  echo "    4) Giữ nguyên keys hiện tại (bỏ qua)"
  echo ""
  read -rp "  Chọn [1-4]: " KEY_CHOICE

  case "$KEY_CHOICE" in
    1)
      echo ""
      echo -e "${CYAN}  Nhập các API keys, mỗi key một dòng.${NC}"
      echo -e "${CYAN}  Nhấn ENTER trên dòng trống khi hoàn tất:${NC}"
      echo ""
      NEW_KEYS=""
      KEY_NUM=1
      while true; do
        read -rp "  Key $KEY_NUM (Enter để kết thúc): " key_input
        [ -z "$key_input" ] && break
        # Validate key format cơ bản (bắt đầu bằng AIza...)
        if [[ "$key_input" =~ ^AIza[0-9A-Za-z_-]{35}$ ]]; then
          if [ -z "$NEW_KEYS" ]; then
            NEW_KEYS="$key_input"
          else
            NEW_KEYS="$NEW_KEYS,$key_input"
          fi
          ok "Key $KEY_NUM hợp lệ"
          KEY_NUM=$((KEY_NUM + 1))
        else
          warn "Key không đúng định dạng Gemini (bỏ qua): ${key_input:0:20}..."
        fi
      done

      if [ -z "$NEW_KEYS" ]; then
        warn "Không có key hợp lệ nào được nhập. Giữ nguyên keys cũ."
        NEW_KEYS="$CURRENT_KEYS"
      fi
      ;;

    2)
      echo ""
      read -rp "  Nhập key mới cần thêm: " new_key
      if [[ "$new_key" =~ ^AIza[0-9A-Za-z_-]{35}$ ]]; then
        if [ -n "$CURRENT_KEYS" ]; then
          NEW_KEYS="$CURRENT_KEYS,$new_key"
        else
          NEW_KEYS="$new_key"
        fi
        ok "Đã thêm key mới vào danh sách"
      else
        warn "Key không đúng định dạng. Giữ nguyên keys cũ."
        NEW_KEYS="$CURRENT_KEYS"
      fi
      ;;

    3)
      echo ""
      if [ -z "$CURRENT_KEYS" ]; then
        warn "Không có keys nào để xóa."
        return
      fi
      echo -e "${CYAN}  Chọn số thứ tự key muốn xóa:${NC}"
      echo "$CURRENT_KEYS" | tr ',' '\n' | nl | while read n key; do
        key_trimmed=$(echo "$key" | xargs)
        printf "    %d. ${key_trimmed:0:20}...${NC}\n" "$n"
      done
      echo ""
      read -rp "  Xóa key số: " del_num
      NEW_KEYS=$(echo "$CURRENT_KEYS" | tr ',' '\n' | grep -v "^$" | \
                 awk -v del="$del_num" 'NR!=del' | paste -sd ',' -)
      ok "Đã xóa key số $del_num"
      ;;

    4|*)
      info "Giữ nguyên API keys, bỏ qua bước này."
      return
      ;;
  esac

  # Ghi file .env.local
  CURRENT_DB_URL=$(grep "^DATABASE_URL" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2- \
                   || echo "file:/home/$(whoami)/vihand-grade/prisma/vihand.db")

  mkdir -p "$(dirname "$ENV_FILE")"
  cat > "$ENV_FILE" << ENVEOF
# Gemini API Keys — xoay vòng ngẫu nhiên mỗi lần chấm điểm
# Cập nhật lúc: $(date '+%Y-%m-%d %H:%M:%S')
GEMINI_API_KEYS=${NEW_KEYS}

# SQLite database
DATABASE_URL=${CURRENT_DB_URL}
ENVEOF

  chmod 600 "$ENV_FILE"
  KEY_COUNT=$(echo "$NEW_KEYS" | tr ',' '\n' | wc -l)
  ok "Đã lưu $KEY_COUNT API key vào $ENV_FILE"
}

# ══════════════════════════════════════════════════════════════════════
# PHẦN C: Pull code và Rebuild
# ══════════════════════════════════════════════════════════════════════
update_code() {
  banner "CẬP NHẬT CODE & REBUILD"

  if [ ! -d "$APP_DIR/.git" ]; then
    err "Không tìm thấy thư mục git tại $APP_DIR"
    err "Đảm bảo ứng dụng đã được cài đặt đúng."
    exit 1
  fi

  cd "$APP_DIR"

  # Bước 1: Pull code
  info "[1/4] Kéo code mới nhất từ GitHub..."
  git fetch origin main 2>&1 | tail -3
  LOCAL=$(git rev-parse HEAD)
  REMOTE=$(git rev-parse origin/main)
  if [ "$LOCAL" = "$REMOTE" ]; then
    ok "Code đã là mới nhất (không có thay đổi)"
  else
    git checkout -- .
    git pull origin main
    COMMIT_MSG=$(git log -1 --pretty=format:"%s (%cr)" 2>/dev/null || echo "N/A")
    ok "Code đã cập nhật: $COMMIT_MSG"
  fi

  # Bước 2: Install dependencies
  info "[2/4] Cài đặt dependencies..."
  npm install --prefer-offline 2>&1 | tail -3
  ok "Dependencies sẵn sàng"

  # Bước 3: Cập nhật database schema
  info "[3/4] Đồng bộ database schema..."
  DB_URL=$(grep "^DATABASE_URL" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2- \
           || echo "file:./prisma/vihand.db")
  export DATABASE_URL="$DB_URL"
  npx prisma generate --schema=./prisma/schema.prisma 2>&1 | tail -2
  npx prisma db push --schema=./prisma/schema.prisma --accept-data-loss --skip-generate 2>&1 | tail -3
  ok "Database schema đã cập nhật"

  # Bước 4: Build
  info "[4/4] Build ứng dụng Next.js (có thể mất 5–10 phút)..."
  rm -rf .next
  export NODE_OPTIONS="--max-old-space-size=1024"
  if npm run build 2>&1; then
    ok "Build thành công!"
  else
    err "Build thất bại! Xem log ở trên để biết chi tiết."
    exit 1
  fi
}

# ══════════════════════════════════════════════════════════════════════
# PHẦN D: Khởi động lại service
# ══════════════════════════════════════════════════════════════════════
restart_service() {
  banner "KHỞI ĐỘNG LẠI SERVICE"

  info "Đang khởi động lại $SERVICE_NAME..."
  sudo systemctl restart "$SERVICE_NAME"
  sleep 4

  if systemctl is-active --quiet "$SERVICE_NAME"; then
    ok "Service $SERVICE_NAME đang chạy thành công!"
  else
    err "Service không khởi động được!"
    echo -e "${YELLOW}  Xem log để tìm lỗi:${NC}"
    echo "    sudo journalctl -u $SERVICE_NAME -n 30 --no-pager"
    exit 1
  fi
}

# ══════════════════════════════════════════════════════════════════════
# PHẦN E: Tóm tắt kết quả
# ══════════════════════════════════════════════════════════════════════
show_summary() {
  echo ""
  echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}${BOLD}║          ✅  CẬP NHẬT HOÀN TẤT!                     ║${NC}"
  echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════════╝${NC}"
  echo ""
  IP=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "N/A")
  echo -e "  🌐  Truy cập ứng dụng: ${CYAN}${BOLD}http://${IP}:3000${NC}"
  echo ""
  if [ -f "$ENV_FILE" ]; then
    KEY_COUNT=$(grep "^GEMINI_API_KEYS" "$ENV_FILE" | cut -d'=' -f2- | tr ',' '\n' | wc -l)
    echo -e "  🔑  Đang dùng ${BOLD}${KEY_COUNT} API key${NC} (xoay vòng tự động)"
  fi
  echo -e "  📋  Xem log:       ${DIM}sudo journalctl -u vihand -f${NC}"
  echo -e "  🔄  Chạy lại:      ${DIM}./update_system.sh${NC}"
  echo -e "  📊  Kiểm tra:      ${DIM}./update_system.sh --status${NC}"
  echo ""
}

# ══════════════════════════════════════════════════════════════════════
# MAIN — Điều phối theo tham số đầu vào
# ══════════════════════════════════════════════════════════════════════

# Header chính
echo -e "${CYAN}${BOLD}"
echo "  ╔══════════════════════════════════════════════════════╗"
echo "  ║       ViHand Grade — Raspberry Pi Updater v2.0      ║"
echo "  ╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo -e "  ${DIM}Thư mục ứng dụng: $APP_DIR${NC}"
echo -e "  ${DIM}Thời gian: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo ""

case "${1:-}" in
  --status)
    check_status
    ;;

  --keys-only)
    update_api_keys
    # Restart nhẹ để áp dụng keys mới (không cần rebuild)
    echo ""
    read -rp "  Khởi động lại service để áp dụng keys mới? [Y/n]: " do_restart
    if [[ "${do_restart:-Y}" =~ ^[Yy]$ ]]; then
      restart_service
    fi
    show_summary
    ;;

  --code-only)
    update_code
    restart_service
    show_summary
    ;;

  ""|--all)
    # Chế độ mặc định: cập nhật cả keys + code
    update_api_keys
    divider
    update_code
    restart_service
    show_summary
    ;;

  --help|-h)
    echo -e "  ${BOLD}CÁCH DÙNG:${NC}"
    echo ""
    echo "    ./update_system.sh              Cập nhật toàn bộ (keys + code + rebuild)"
    echo "    ./update_system.sh --keys-only  Chỉ cập nhật API keys"
    echo "    ./update_system.sh --code-only  Chỉ pull code mới + rebuild"
    echo "    ./update_system.sh --status     Kiểm tra trạng thái hệ thống"
    echo "    ./update_system.sh --help       Xem hướng dẫn này"
    echo ""
    ;;

  *)
    err "Tham số không hợp lệ: $1"
    echo "  Chạy: ./update_system.sh --help để xem hướng dẫn"
    exit 1
    ;;
esac
