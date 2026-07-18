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

RPI_IP="192.168.1.XXX"    # ← SỬA LẠI IP CỦA RPi
RPI_USER="pi"              # ← SỬA NẾU KHÁC
REMOTE_DIR="~/vihand-mcp"

echo "=== Copy MCP Service lên Raspberry Pi ==="
echo "    RPi: $RPI_USER@$RPI_IP:$REMOTE_DIR"

# Tạo thư mục trên RPi
ssh $RPI_USER@$RPI_IP "mkdir -p $REMOTE_DIR"

# Copy các file cần thiết (bỏ .env để không ghi đè token)
scp mcp_service/main.py           $RPI_USER@$RPI_IP:$REMOTE_DIR/
scp mcp_service/requirements.txt  $RPI_USER@$RPI_IP:$REMOTE_DIR/
scp mcp_service/setup_rpi.sh      $RPI_USER@$RPI_IP:$REMOTE_DIR/
scp mcp_service/install_service.sh $RPI_USER@$RPI_IP:$REMOTE_DIR/
scp mcp_service/.env.rpi          $RPI_USER@$RPI_IP:$REMOTE_DIR/

echo ""
echo "=== Hoàn tất copy! Các bước tiếp theo trên RPi ==="
echo ""
echo "  1. SSH vào RPi:"
echo "     ssh $RPI_USER@$RPI_IP"
echo ""
echo "  2. Chạy setup:"
echo "     bash ~/vihand-mcp/setup_rpi.sh"
echo ""
echo "  3. Cấu hình .env:"
echo "     cp ~/vihand-mcp/.env.rpi ~/vihand-mcp/.env"
echo "     nano ~/vihand-mcp/.env"
echo "     # Dán token MCP_ENDPOINT và đặt VIHAND_API_URL"
echo ""
echo "  4. Cài service tự khởi động:"
echo "     bash ~/vihand-mcp/install_service.sh"
echo ""
echo "  5. Xem log:"
echo "     journalctl -u vihand-mcp -f"
