#!/bin/bash
# ================================================================
#  ViHand Grade — Script cập nhật hệ thống trên Raspberry Pi 4
#  Chạy lệnh: bash update_rpi.sh
# ================================================================

set -e  # Dừng ngay nếu có lỗi

CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}"
echo "═══════════════════════════════════════════"
echo "   VIHAND GRADE — CẬP NHẬT RASPBERRY PI 4"
echo "═══════════════════════════════════════════"
echo -e "${NC}"

cd ~/vihand-grade

# ── Bước 1: Kéo code mới từ GitHub ─────────────────────────────
echo -e "${CYAN}[1/5] Kéo code mới từ GitHub...${NC}"
git checkout -- .       # Reset các thay đổi local (vd: package-lock.json)
git pull origin main
echo -e "${GREEN}✅ Code đã cập nhật xong${NC}"

# ── Bước 2: Đảm bảo file .env tồn tại ──────────────────────────
echo -e "${CYAN}[2/5] Kiểm tra file .env...${NC}"
if [ ! -f .env ]; then
    if [ -f .env.local ]; then
        cp .env.local .env
        echo -e "${GREEN}✅ Đã tạo .env từ .env.local${NC}"
    else
        echo -e "${RED}❌ Không tìm thấy .env.local! Tạo .env thủ công...${NC}"
        echo 'DATABASE_URL=file:./prisma/vihand.db' > .env
        echo -e "${YELLOW}⚠️  Nhớ thêm GEMINI_API_KEY vào file .env!${NC}"
    fi
else
    # Kiểm tra DATABASE_URL có trong .env không
    if ! grep -q 'DATABASE_URL' .env; then
        echo 'DATABASE_URL=file:./prisma/vihand.db' >> .env
        echo -e "${GREEN}✅ Đã thêm DATABASE_URL vào .env${NC}"
    else
        echo -e "${GREEN}✅ File .env hợp lệ${NC}"
    fi
fi

# ── Bước 3: Cài dependencies ────────────────────────────────────
echo -e "${CYAN}[3/5] Cài đặt dependencies...${NC}"
npm install
npx prisma generate
npx prisma db push
echo -e "${GREEN}✅ Dependencies và Database đã cập nhật${NC}"

# ── Bước 4: Build ứng dụng ──────────────────────────────────────
echo -e "${CYAN}[4/5] Build ứng dụng (5-10 phút, hãy kiên nhẫn...)${NC}"
rm -rf .next
export NODE_OPTIONS="--max-old-space-size=1024"
npm run build
echo -e "${GREEN}✅ Build thành công!${NC}"

# ── Bước 5: Khởi động lại service ───────────────────────────────
echo -e "${CYAN}[5/5] Khởi động lại service vihand...${NC}"
sudo systemctl restart vihand
sleep 3  # Chờ service khởi động

# Kiểm tra kết quả
if sudo systemctl is-active --quiet vihand; then
    echo -e "${GREEN}✅ Service đang chạy!${NC}"
else
    echo -e "${RED}❌ Service không khởi động được. Kiểm tra log:${NC}"
    echo "   sudo journalctl -u vihand -n 20 --no-pager"
    exit 1
fi

# ── Tổng kết ────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}   CẬP NHẬT HOÀN TẤT!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo ""
IP=$(hostname -I | awk '{print $1}')
echo -e "  🌐 Truy cập web tại: ${CYAN}http://${IP}:3000${NC}"
echo ""
echo -e "  📋 Xem log nếu cần: sudo journalctl -u vihand -f"
echo ""
