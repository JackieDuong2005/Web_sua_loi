#!/bin/bash
# ============================================================
# Lệnh triển khai nhanh từ Windows sang RPi qua SSH
# Chạy file này trên Windows (Git Bash, WSL, hoặc PowerShell với OpenSSH)
#
# Trước khi chạy:
#   1. Thay RPI_IP bên dưới bằng IP thực của RPi
#   2. Thay RPI_USER nếu không phải "pi"
#   3. Đảm bảo SSH đã bật trên RPi: sudo systemctl enable ssh
# ============================================================

RPI_IP="192.168.1.56"         # ← IP của RPi (đã cập nhật)
RPI_USER="jackie"             # ← User trên RPi (đã cập nhật)
REMOTE_DIR="~/vihand-grade"   # ← Thư mục project trên RPi

echo "============================================================"
echo "  VIHAND GRADE — Deploy Script"
echo "  Target: $RPI_USER@$RPI_IP:$REMOTE_DIR"
echo "============================================================"
echo ""

# ─────────────────────────────────────────────
# BƯỚC 1: Copy .env.local lên RPi
# ─────────────────────────────────────────────
echo ">>> [1/3] Copy .env.local lên Raspberry Pi..."

# Kiểm tra file .env.local tồn tại ở local
if [ ! -f ".env.local" ]; then
  echo "    ❌ KHÔNG tìm thấy file .env.local ở thư mục hiện tại!"
  echo "    Hãy chạy script này từ thư mục gốc của project."
  exit 1
fi

# Tạo file .env.local trên RPi với DATABASE_URL đúng đường dẫn Linux
# Lấy các key từ file .env.local local, chỉ thay DATABASE_URL
GEMINI_KEYS=$(grep "^GEMINI_API_KEYS=" .env.local | cut -d'=' -f2-)
VIT5_URL=$(grep "^VIT5_SERVICE_URL=" .env.local | cut -d'=' -f2-)

if [ -z "$GEMINI_KEYS" ]; then
  echo "    ⚠️  Không tìm thấy GEMINI_API_KEYS trong .env.local!"
  echo "    Kiểm tra lại file .env.local của bạn."
  exit 1
fi

# Ghi file .env.local lên RPi qua SSH (DATABASE_URL dùng đường dẫn Linux)
ssh $RPI_USER@$RPI_IP "cat > $REMOTE_DIR/.env.local << 'ENVEOF'
# Gemini API Keys — xoay vòng ngẫu nhiên mỗi lần chấm điểm
GEMINI_API_KEYS=$GEMINI_KEYS

# ViT5 Python Microservice URL (engine chính)
VIT5_SERVICE_URL=${VIT5_URL:-http://localhost:8000}

# SQLite database URL for Prisma (Linux path)
DATABASE_URL=\"file:/home/jackie/vihand-grade/prisma/vihand.db\"
ENVEOF"

if [ $? -eq 0 ]; then
  echo "    ✅ .env.local đã được tạo thành công trên RPi!"
else
  echo "    ❌ Lỗi khi tạo .env.local trên RPi!"
  exit 1
fi

echo ""

# ─────────────────────────────────────────────
# BƯỚC 2: Copy MCP Service lên RPi
# ─────────────────────────────────────────────
echo ">>> [2/3] Copy MCP Service lên Raspberry Pi..."

REMOTE_MCP="~/vihand-mcp"
ssh $RPI_USER@$RPI_IP "mkdir -p $REMOTE_MCP"

if [ -f "mcp_service/main.py" ]; then
  scp mcp_service/main.py             $RPI_USER@$RPI_IP:$REMOTE_MCP/
  scp mcp_service/requirements.txt    $RPI_USER@$RPI_IP:$REMOTE_MCP/
  [ -f "mcp_service/setup_rpi.sh" ]      && scp mcp_service/setup_rpi.sh      $RPI_USER@$RPI_IP:$REMOTE_MCP/
  [ -f "mcp_service/install_service.sh" ] && scp mcp_service/install_service.sh $RPI_USER@$RPI_IP:$REMOTE_MCP/
  [ -f "mcp_service/.env.rpi" ]           && scp mcp_service/.env.rpi           $RPI_USER@$RPI_IP:$REMOTE_MCP/
  echo "    ✅ MCP Service đã được copy xong!"
else
  echo "    ⚠️  Không tìm thấy mcp_service/main.py — bỏ qua bước này."
fi

echo ""

# ─────────────────────────────────────────────
# BƯỚC 3: Xác nhận trên RPi
# ─────────────────────────────────────────────
echo ">>> [3/3] Kiểm tra .env.local trên RPi..."
echo ""

ssh $RPI_USER@$RPI_IP "
  echo '--- Nội dung .env.local trên RPi ---'
  if [ -f $REMOTE_DIR/.env.local ]; then
    # Ẩn bớt API key để bảo mật
    sed 's/\(GEMINI_API_KEYS=.\{20\}\).*/\1.../' $REMOTE_DIR/.env.local
    echo ''
    echo '✅ File .env.local tồn tại và hợp lệ!'
  else
    echo '❌ File .env.local KHÔNG tồn tại!'
  fi
"

echo ""
echo "============================================================"
echo "  ✅ HOÀN TẤT DEPLOY!"
echo "============================================================"
echo ""
echo "  Các bước tiếp theo trên RPi (nếu cần):"
echo ""
echo "  1. SSH vào RPi:"
echo "     ssh $RPI_USER@$RPI_IP"
echo ""
echo "  2. Restart Next.js app để nhận .env.local mới:"
echo "     cd ~/vihand-grade && npm run build && npm start"
echo "     (hoặc nếu dùng PM2: pm2 restart vihand-grade)"
echo ""
echo "  3. Xem log lỗi (nếu có):"
echo "     pm2 logs vihand-grade"
echo "     journalctl -u vihand-grade -f"
echo ""
