# HƯỚNG DẪN TRIỂN KHAI VIHAND GRADE TRÊN RASPBERRY PI 4

---

## 1. Yêu cầu phần cứng

| Thiết bị | Thông số | Bắt buộc | Ghi chú |
|---|---|---|---|
| Raspberry Pi 4 Model B | **4GB RAM** | ✅ | Bản 8GB tốt hơn nếu có |
| MicroSD Card | ≥ 32GB, **Class 10 / A2** | ✅ | Khuyến nghị SSD USB để bền hơn |
| Nguồn USB-C | 5V / 3A (15W) chính hãng | ✅ | Nguồn yếu gây lỗi ngẫu nhiên |
| Vỏ case + quạt tản nhiệt | Quạt kép hoặc heatsink nhôm | ✅ | **Bắt buộc** khi chạy 24/7 |
| Cáp Ethernet CAT5e+ | Kết nối mạng LAN | ⭐ | Ổn định hơn WiFi cho API calls |
| Màn hình + bàn phím | Chỉ cần lúc cài đặt ban đầu | ❌ | Sau đó SSH từ xa |

**Tổng chi phí ước tính:** ~1.900.000 VNĐ

---

## 2. Cài đặt hệ điều hành

### 2.1. Tải Raspberry Pi Imager
- Tải từ: https://www.raspberrypi.com/software/
- Cài đặt trên PC Windows/Mac

### 2.2. Ghi hệ điều hành vào SD Card
1. Mở **Raspberry Pi Imager**
2. Chọn **Raspberry Pi OS Lite (64-bit)** — không cần desktop
3. Chọn SD Card
4. Nhấn ⚙️ (Settings) để cấu hình trước:
   - ✅ Đặt hostname: `vihand`
   - ✅ Bật SSH (dùng password)
   - ✅ Đặt username: `pi`, password: `<mật_khẩu_của_bạn>`
   - ✅ Cấu hình WiFi (nếu không dùng Ethernet)
   - ✅ Đặt timezone: `Asia/Ho_Chi_Minh`
5. Nhấn **Write** và đợi hoàn tất

### 2.3. Khởi động Raspberry Pi
1. Gắn SD Card vào RPi4
2. Cắm Ethernet + nguồn
3. Đợi ~1 phút để khởi động
4. Tìm IP của RPi trên router hoặc dùng: `ping vihand.local`

### 2.4. Kết nối SSH từ PC
```bash
ssh pi@vihand.local
# hoặc
ssh pi@<IP_của_RPi>
```

---

## 3. Cài đặt tự động (khuyến nghị)

### 3.1. Copy project lên RPi
Từ PC Windows, mở PowerShell:
```powershell
# Copy toàn bộ project lên RPi (thay <IP> bằng IP thực)
scp -r "C:\Users\Jackie Duong\Desktop\Web_sua_loi" pi@<IP>:~/vihand-grade
```

### 3.2. Chạy script cài đặt
SSH vào RPi rồi chạy:
```bash
cd ~/vihand-grade
chmod +x setup_rpi.sh
sudo ./setup_rpi.sh
```

Script sẽ tự động:
1. ✅ Cập nhật hệ thống
2. ✅ Cài Node.js 20 LTS
3. ✅ Cấu hình Swap 2GB
4. ✅ Cài npm dependencies
5. ✅ Tạo `.env.local` (hỏi API key)
6. ✅ Setup database (Prisma + SQLite)
7. ✅ Build production
8. ✅ Tạo systemd service tự khởi động

**Thời gian cài đặt:** ~15–20 phút

---

## 4. Cài đặt thủ công (từng bước)

Nếu muốn kiểm soát từng bước, làm theo hướng dẫn dưới đây.

### 4.1. Cập nhật hệ thống
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl build-essential python3
```

### 4.2. Cài Node.js 20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v  # Kiểm tra: v20.x
```

### 4.3. Tăng Swap lên 2GB
RPi4 mặc định chỉ có 100MB swap — không đủ để build Next.js:
```bash
sudo dphys-swapfile swapoff
sudo sed -i 's/CONF_SWAPSIZE=.*/CONF_SWAPSIZE=2048/' /etc/dphys-swapfile
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
free -h  # Kiểm tra: Swap ~2GB
```

### 4.4. Cài đặt project
```bash
cd ~/vihand-grade
npm install
```

### 4.5. Cấu hình API key
```bash
echo "GEMINI_API_KEY=AIzaSy..." > .env.local
chmod 600 .env.local
```

### 4.6. Setup database
```bash
npx prisma generate
npx prisma db push
```

### 4.7. Build production
```bash
npm run build
# Mất ~5-10 phút trên RPi4, kiên nhẫn!
```

### 4.8. Chạy server
```bash
# Test trước
npm run start

# Nếu OK, tạo service (xem mục 5)
```

---

## 5. Quản lý service

### 5.1. Các lệnh thường dùng
```bash
# Xem trạng thái
sudo systemctl status vihand

# Xem log realtime
sudo journalctl -u vihand -f

# Khởi động lại
sudo systemctl restart vihand

# Dừng
sudo systemctl stop vihand

# Tắt tự khởi động
sudo systemctl disable vihand
```

### 5.2. Kiểm tra hoạt động
```bash
# Kiểm tra port
curl http://localhost:3000

# Kiểm tra RAM
free -h

# Kiểm tra nhiệt độ CPU
vcgencmd measure_temp
```

---

## 6. Cấu hình mạng — Truy cập từ WiFi trường & Internet

### 6.1. Tổng quan 2 chế độ truy cập

| Chế độ | Ai truy cập được | Địa chỉ | Cần gì |
|---|---|---|---|
| **WiFi trường (LAN)** | GV, HS kết nối WiFi trường | `http://192.168.x.x:3000` | Chỉ cần IP tĩnh |
| **Internet (WAN)** | Bất kỳ ai, ở bất kỳ đâu | `https://xxx.trycloudflare.com` | Cloudflare Tunnel (miễn phí) |

### 6.2. Cấu hình tự động
```bash
chmod +x setup_network.sh
sudo ./setup_network.sh
```
Script sẽ tự động: đặt IP tĩnh → mở firewall → cài Cloudflare Tunnel → tạo service tự khởi động.

### 6.3. Cấu hình IP tĩnh (truy cập trong WiFi trường)

RPi4 cần IP cố định để GV/HS luôn truy cập cùng 1 địa chỉ:

```bash
sudo nano /etc/dhcpcd.conf
```

Thêm vào cuối file (thay IP phù hợp mạng trường):
```
interface wlan0
static ip_address=192.168.1.100/24
static routers=192.168.1.1
static domain_name_servers=8.8.8.8 8.8.4.4
```

```bash
sudo reboot
```

Sau khi khởi động lại, mọi thiết bị kết nối WiFi trường truy cập:
```
http://192.168.1.100:3000
```

> **Mẹo:** In QR code chứa URL này dán lên bảng lớp để GV/HS quét nhanh bằng điện thoại.

### 6.4. Cloudflare Tunnel — Truy cập từ mọi nơi qua Internet

**Vấn đề:** Mạng trường thường không cho phép mở port trên router (port forwarding).
**Giải pháp:** Cloudflare Tunnel tạo đường hầm bảo mật từ RPi4 ra internet — **miễn phí, không cần cấu hình router.**

#### Cài đặt:
```bash
# Tải cloudflared (ARM64 cho RPi4)
sudo curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 \
  -o /usr/local/bin/cloudflared
sudo chmod +x /usr/local/bin/cloudflared

# Test nhanh
cloudflared tunnel --url http://localhost:3000
# → Hiện URL dạng: https://abc-xyz-123.trycloudflare.com
# → Bất kỳ ai có URL này đều truy cập được!
```

#### Chạy tự động khi khởi động:
```bash
sudo nano /etc/systemd/system/cloudflared.service
```

```ini
[Unit]
Description=Cloudflare Tunnel for ViHand Grade
After=network-online.target vihand.service
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/local/bin/cloudflared tunnel --url http://localhost:3000 --no-autoupdate
Restart=always
RestartSec=15
User=nobody

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable cloudflared
sudo systemctl start cloudflared

# Xem URL tunnel
sudo journalctl -u cloudflared | grep trycloudflare
```

> **Lưu ý:** URL trycloudflare.com **thay đổi mỗi lần restart**. Nếu muốn URL cố định, dùng Cloudflare Tunnel với tài khoản Cloudflare (miễn phí) — xem mục 6.5.

### 6.5. Domain cố định với Cloudflare (tùy chọn nâng cao)

Nếu muốn URL đẹp và cố định (VD: `vihand.yourschool.edu.vn`):

```bash
# 1. Đăng ký tài khoản Cloudflare (miễn phí): https://dash.cloudflare.com
# 2. Thêm domain vào Cloudflare
# 3. Đăng nhập cloudflared
cloudflared tunnel login

# 4. Tạo tunnel cố định
cloudflared tunnel create vihand
cloudflared tunnel route dns vihand vihand.yourschool.edu.vn

# 5. Tạo file cấu hình
cat > ~/.cloudflared/config.yml << EOF
tunnel: vihand
credentials-file: /home/pi/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: vihand.yourschool.edu.vn
    service: http://localhost:3000
  - service: http_status:404
EOF

# 6. Cài service
sudo cloudflared service install
sudo systemctl start cloudflared
```

### 6.6. Mở Firewall
```bash
sudo apt install -y ufw
sudo ufw allow ssh
sudo ufw allow 3000/tcp
sudo ufw --force enable
sudo ufw status
```

---

## 7. Tối ưu hiệu năng

### 7.1. Dùng SSD thay SD Card
```bash
# 1. Gắn SSD USB vào RPi
# 2. Clone SD card sang SSD
sudo apt install -y rpi-clone
sudo rpi-clone sda

# 3. Đổi boot sang USB trong raspi-config
sudo raspi-config
# → Advanced Options → Boot Order → USB Boot
```

### 7.2. Tối ưu Node.js cho ARM
```bash
# Giới hạn RAM cho Node.js (tránh OOM)
echo 'export NODE_OPTIONS="--max-old-space-size=512"' >> ~/.bashrc
source ~/.bashrc
```

### 7.3. Giám sát tài nguyên
```bash
# Cài htop
sudo apt install -y htop

# Xem realtime
htop
```

---

## 8. Khắc phục sự cố

| Vấn đề | Nguyên nhân | Giải pháp |
|---|---|---|
| `npm install` bị killed | Hết RAM | Tăng swap lên 2GB (mục 4.3) |
| `npm run build` quá chậm | RPi4 CPU yếu | Kiên nhẫn (~10 phút), hoặc build trên PC rồi copy `.next/` |
| Nhiệt độ > 80°C | Thiếu tản nhiệt | Gắn quạt, kiểm tra: `vcgencmd measure_temp` |
| Không truy cập từ WiFi trường | IP sai hoặc firewall | Kiểm tra `ip addr show wlan0` và `sudo ufw status` |
| Tunnel URL không hiện | Cloudflared lỗi | `sudo journalctl -u cloudflared -n 30` |
| Gemini API timeout | Mạng WiFi trường yếu | Dùng Ethernet, kiểm tra: `ping google.com` |
| Service không khởi động | Lỗi path | `sudo journalctl -u vihand -n 50` |
| SQLite database locked | Nhiều request đồng thời | Bình thường với SQLite, tự retry |
| SD Card hỏng sau vài tháng | Ghi quá nhiều | Chuyển sang SSD USB (mục 7.1) |
| URL tunnel đổi mỗi lần restart | Dùng Quick Tunnel | Chuyển sang Named Tunnel (mục 6.5) |

---

## 9. Hiệu năng thực tế trên RPi4

| Chỉ số | Giá trị dự kiến |
|---|---|
| RAM idle | ~300–500 MB |
| RAM khi chấm bài | ~500–800 MB |
| CPU idle | ~5–10% |
| CPU khi chấm bài | ~30–50% (tiền xử lý ảnh) |
| Thời gian chấm bài | **~12–16 giây** (giống PC — bottleneck là Gemini API) |
| Số user đồng thời | 5–10 user |
| Uptime | 24/7 nếu có tản nhiệt tốt |
| Điện tiêu thụ | ~5–7W (rất tiết kiệm) |

> **Lưu ý:** Thời gian chấm bài trên RPi4 **gần bằng PC** vì 90% thời gian là chờ Gemini API phản hồi qua internet. RPi4 chỉ xử lý tiền xử lý ảnh (nhẹ) và serve giao diện web.

---

## 10. Sơ đồ triển khai

```
                    ┌─────────────────────────────────────┐
                    │      INTERNET (Cloudflare Tunnel)    │
                    │                                      │
                    │  📱 GV ở nhà ──────┐                │
                    │  💻 Phụ huynh ─────┤                │
                    │  📱 HS ở nhà ──────┤                │
                    │                    ▼                 │
                    │  ┌──────────────────────────┐       │
                    │  │   Cloudflare CDN (HTTPS)  │       │
                    │  │  vihand.trycloudflare.com │       │
                    │  └────────────┬─────────────┘       │
                    └───────────────┼──────────────────────┘
                                    │ Tunnel (mã hóa)
┌───────────────────────────────────┼──────────────────────┐
│          MẠNG WiFi TRƯỜNG HỌC    │                       │
│                                   │                       │
│  📱 GV trong trường ──┐          │                       │
│  💻 Máy tính GV ──────┤          ▼                       │
│  📱 HS trong trường ──┤   ┌─────────────┐               │
│                        ├──→│ Raspberry   │               │
│   http://192.168.1.    │   │  Pi 4 (4GB) │               │
│        100:3000        │   │             │               │
│                        │   │ ✦ Next.js   │               │
│                        │   │ ✦ SQLite    │──→ Google     │
│                        │   │ ✦ Jimp      │   Gemini API  │
│                        │   │ ✦ Tunnel    │   (chấm điểm) │
│                        │   └─────────────┘               │
└──────────────────────────────────────────────────────────┘
```

### Luồng truy cập:

| Người dùng | Kết nối | Địa chỉ truy cập |
|---|---|---|
| GV/HS **trong trường** | WiFi trường | `http://192.168.1.100:3000` |
| GV/HS **ở nhà** | 4G / WiFi nhà | `https://xxx.trycloudflare.com` |
| Phụ huynh | Bất kỳ internet | `https://xxx.trycloudflare.com` |

---

*Tài liệu hướng dẫn triển khai — ViHand Grade trên Raspberry Pi 4*
*Cập nhật: 23/05/2026*
