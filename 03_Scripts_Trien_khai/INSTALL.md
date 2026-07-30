# 🚀 Hướng dẫn cài đặt & Triển khai ViHand Grade

## Mục lục

1. [Cài đặt Development (Local)](#1-cài-đặt-development-local)
2. [Triển khai với Docker](#2-triển-khai-với-docker)
3. [Triển khai lên Raspberry Pi 4](#3-triển-khai-lên-raspberry-pi-4)
4. [Cấu hình Cloudflare Tunnel](#4-cấu-hình-cloudflare-tunnel)

---

## 1. Cài đặt Development (Local)

### Yêu cầu hệ thống

- **Node.js** ≥ 20
- **Python** ≥ 3.10
- **npm** hoặc **pnpm**
- **Google Gemini API Key** ([lấy miễn phí tại đây](https://aistudio.google.com/app/apikey))

### Bước 1 — Clone & cài đặt dependencies

```bash
git clone https://github.com/<your-username>/vihand-grade.git
cd vihand-grade
npm install
```

### Bước 2 — Cấu hình biến môi trường

Tạo file `.env.local` từ template:

```bash
cp .env.local.example .env.local
```

Chỉnh sửa `.env.local`:

```env
# Database
DATABASE_URL="file:./dev.db"

# Google Gemini API
GEMINI_API_KEY="your_gemini_api_key_here"

# ViT5 Python Service
VIT5_SERVICE_URL="http://localhost:8000"

# MCP Service
MCP_SERVICE_URL="http://localhost:8200"

# Admin Registration Secret
ADMIN_SECRET_KEY="your_secret_key_here"
```

### Bước 3 — Khởi tạo Database

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

> **Tài khoản mặc định sau seed:**
> | Role | Username | Password |
> |------|----------|----------|
> | Admin | `admin` | `123456` |
> | Giáo viên | `giaovien` | `123456` |
> | Học sinh | `hocsinh` | `123456` |
>
> ⚠️ Đổi mật khẩu mặc định trước khi deploy production.

### Bước 4 — Khởi động Python Service (ViT5)

```bash
cd python_service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Bước 5 — Khởi động MCP Service (tùy chọn — cần cho tính năng đọc chính tả)

```bash
cd mcp_service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8200
```

### Bước 6 — Khởi động Web App

```bash
npm run dev
```

Truy cập tại: **http://localhost:3000**

> **Windows shortcut:** Chạy `start_all.bat` để khởi động tất cả services cùng lúc.

---

## 2. Triển khai với Docker

### Build & chạy container

```bash
# Build image
docker build -t vihand-grade .

# Chạy container
docker run -d \
  -p 7860:7860 \
  -v vihand_data:/data \
  -e GEMINI_API_KEY="your_key" \
  -e DATABASE_URL="file:/data/vihand.db" \
  --name vihand-grade \
  vihand-grade
```

> 💡 Container expose port `7860` (tương thích Hugging Face Spaces).

### Kiểm tra logs

```bash
docker logs -f vihand-grade
```

### Dừng & xóa container

```bash
docker stop vihand-grade
docker rm vihand-grade
```

---

## 3. Triển khai lên Raspberry Pi 4

### Yêu cầu phần cứng

| Thông số | Giá trị |
|----------|---------|
| Model | Raspberry Pi 4 Model B |
| RAM | 4GB LPDDR4 |
| CPU | Quad-core ARM Cortex-A72 @ 1.5GHz |
| Storage | MicroSD ≥ 32GB (Class 10) hoặc SSD USB |
| Tiêu thụ điện | 3–7W |
| Chi phí | ~2–3 triệu VNĐ |

### Sử dụng script tự động

```bash
# Cấp quyền thực thi
chmod +x 03_Scripts_Trien_khai/setup_rpi.sh

# Chạy script cài đặt toàn bộ môi trường
./03_Scripts_Trien_khai/setup_rpi.sh
```

Script `setup_rpi.sh` sẽ tự động:
1. Cập nhật hệ thống (apt update/upgrade)
2. Cài đặt Node.js 20 LTS
3. Cài đặt Python 3.10+ và pip
4. Cài đặt tất cả dependencies
5. Build Next.js production
6. Chạy Prisma migrate
7. Cấu hình `systemd` services cho:
   - `vihand-web` (Next.js, port 3000)
   - `vihand-vit5` (FastAPI ViT5, port 8000)
   - `vihand-mcp` (FastAPI MCP, port 8200)

### Cập nhật lên phiên bản mới

```bash
chmod +x 03_Scripts_Trien_khai/update_rpi.sh
./03_Scripts_Trien_khai/update_rpi.sh
```

### Kiểm tra trạng thái services

```bash
# Xem trạng thái tất cả services
sudo systemctl status vihand-web vihand-vit5 vihand-mcp

# Xem logs realtime
sudo journalctl -u vihand-web -f
```

---

## 4. Cấu hình Cloudflare Tunnel

Để cho phép truy cập từ xa qua tên miền `vihandgrate.click` mà không cần IP tĩnh:

```bash
# Cài đặt cloudflared
chmod +x 03_Scripts_Trien_khai/setup_domain.sh
./03_Scripts_Trien_khai/setup_domain.sh
```

Sau khi chạy xong, hệ thống sẽ:
- Kết nối Raspberry Pi với Cloudflare qua tunnel an toàn
- Tự động gia hạn SSL certificate
- Bảo vệ DDoS và lọc traffic độc hại
- Cho phép truy cập qua HTTPS từ bất kỳ đâu

> 📖 Xem thêm: [Cloudflare Tunnel Documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
