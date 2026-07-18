#!/bin/bash
# ============================================================
# Cài đặt systemd service tự khởi động MCP Server khi RPi bật
# Chạy SAU KHI đã có main.py và .env trong ~/vihand-mcp/
# Chạy: bash ~/vihand-mcp/install_service.sh
# ============================================================

set -e

SERVICE_FILE="/etc/systemd/system/vihand-mcp.service"
CURRENT_USER=$(whoami)
WORK_DIR="$HOME/vihand-mcp"

echo "[1/4] Tạo systemd service..."

sudo tee $SERVICE_FILE > /dev/null <<EOF
[Unit]
Description=ViHand Grade MCP Server for Xiaozhi AI
Documentation=https://github.com/JackieDuong2005/Web_sua_loi
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$WORK_DIR
ExecStart=$WORK_DIR/venv/bin/python3 $WORK_DIR/main.py
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
EOF

echo "    Service file: $SERVICE_FILE"

echo "[2/4] Reload systemd..."
sudo systemctl daemon-reload

echo "[3/4] Kích hoạt service tự khởi động..."
sudo systemctl enable vihand-mcp

echo "[4/4] Khởi động service ngay bây giờ..."
sudo systemctl start vihand-mcp

echo ""
sleep 2
sudo systemctl status vihand-mcp --no-pager

echo ""
echo "======================================================"
echo " Cài đặt service hoàn tất!"
echo ""
echo " Các lệnh quản lý:"
echo "   journalctl -u vihand-mcp -f       # xem log realtime"
echo "   sudo systemctl status vihand-mcp  # kiểm tra trạng thái"
echo "   sudo systemctl restart vihand-mcp # khởi động lại"
echo "   sudo systemctl stop vihand-mcp    # dừng"
echo "======================================================"
