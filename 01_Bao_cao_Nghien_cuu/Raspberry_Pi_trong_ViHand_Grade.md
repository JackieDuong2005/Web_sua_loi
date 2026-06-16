# Raspberry Pi 4 trong Hệ thống ViHand Grade

---

## 1. Tổng quan thiết bị Raspberry Pi 4

**Raspberry Pi 4 Model B** là máy tính nhúng (Single-Board Computer) thế hệ thứ 4 do Raspberry Pi Foundation (Anh) sản xuất, ra mắt năm 2019. Đây là một bo mạch đơn hoàn chỉnh tích hợp CPU, RAM, GPU, cổng USB, HDMI, Ethernet và WiFi — tất cả trên một mạch in có kích thước bằng thẻ tín dụng (~85 × 56 mm).

### 1.1. Đặc điểm phần cứng (cấu hình sử dụng trong dự án)

| Thành phần | Thông số |
|---|---|
| **Model** | Raspberry Pi 4 Model B |
| **CPU** | Broadcom BCM2711, Quad-core Cortex-A72 (ARM v8) 64-bit |
| **Tốc độ xung nhịp** | 1.8 GHz (sau ép xung nhẹ) |
| **Kiến trúc** | ARM64 (aarch64) |
| **RAM** | 4 GB LPDDR4-3200 SDRAM |
| **Lưu trữ** | MicroSD 32GB Class 10 |
| **GPU** | VideoCore VI (OpenGL ES 3.1, Vulkan 1.0) |
| **Kết nối mạng** | Gigabit Ethernet / WiFi 802.11ac (2.4GHz + 5GHz) |
| **Bluetooth** | 5.0 |
| **Cổng USB** | 2× USB 3.0 + 2× USB 2.0 |
| **Cổng HDMI** | 2× Micro-HDMI (hỗ trợ 4K@60fps) |
| **Nguồn điện** | USB-C 5V/3A (15W) |
| **Tiêu thụ điện** | ~5–7W (rất tiết kiệm điện) |
| **Hệ điều hành** | Raspberry Pi OS Lite 64-bit (Debian Bookworm) |
| **Giá thành** | ~1.500.000 VNĐ (~60 USD) |

> **So sánh chi phí:** Raspberry Pi 4 (~1.5 triệu VNĐ) tiết kiệm **90% chi phí** so với máy tính phát triển thông thường (~15 triệu VNĐ), trong khi hiệu năng vận hành thực tế chênh lệch không đáng kể (chỉ +0.21 giây so với máy tính Windows trong End-to-End latency).

---

## 2. Vai trò của Raspberry Pi trong hệ thống ViHand Grade

Raspberry Pi 4 đóng vai trò là **máy chủ ứng dụng (Application Server)** đặt cố định tại phòng giáo viên hoặc văn phòng nhà trường, phục vụ toàn bộ giáo viên và học sinh qua mạng WiFi nội bộ (LAN) hoặc Internet (qua Cloudflare Tunnel).

### 2.1. Sơ đồ vị trí trong kiến trúc hệ thống

```
  [Giáo viên / Học sinh]          [Google Cloud]
   📱 Điện thoại                  ┌─────────────────┐
   💻 Máy tính         ──HTTPS──→ │  Gemini API      │
         │                        │  (Trích xuất OCR)│
         │ HTTP/LAN               └────────▲─────────┘
         ▼                                 │ HTTPS
  ┌──────────────────┐                     │
  │  Raspberry Pi 4  │─────────────────────┘
  │  (Máy chủ Edge)  │
  │  ┌────────────┐  │
  │  │ Next.js 16 │  │  ← Serve giao diện Web
  │  │ Python ViT5│  │  ← Sửa lỗi NLP cục bộ
  │  │ SQLite DB  │  │  ← Lưu trữ dữ liệu
  │  │ Jimp       │  │  ← Tiền xử lý ảnh
  │  │ Cloudflare │  │  ← Đường hầm Internet
  │  └────────────┘  │
  └──────────────────┘
```

### 2.2. Các nhiệm vụ cụ thể

#### **Nhiệm vụ 1: Serve ứng dụng Web (Next.js Server)**
RPi4 chạy ứng dụng Next.js 16 ở chế độ production (`npm run start`), xử lý toàn bộ các HTTP request từ giáo viên và học sinh — bao gồm render giao diện (SSR), định tuyến API, và phản hồi dữ liệu JSON.

- **Page load latency thực tế trên RPi4:** ~153ms (trung bình), tất cả < 200ms
- **Số người dùng đồng thời:** 5–10 user

#### **Nhiệm vụ 2: Tiền xử lý ảnh (Image Preprocessing Pipeline)**
Mỗi khi giáo viên upload ảnh bài viết, RPi4 chạy **pipeline 9 bước** xử lý ảnh pixel-level được lập trình bằng TypeScript thuần (thư viện Jimp):

| Bước | Thuật toán | Kỹ thuật tối ưu |
|---|---|---|
| 1 | EXIF Auto-rotate | — |
| 2 | Resize (max 1600px) | INTER_AREA |
| 3 | White Balance | Gray World Assumption |
| 4 | Grayscale | — |
| 5 | Shadow Removal | Box Blur + **Integral Image O(1)/pixel** |
| 6 | CLAHE | Adaptive Histogram Equalization (8×8 tile) |
| 7 | Sharpen | Unsharp Masking |
| 8 | Quality Assessment | Đánh giá blur, brightness, resolution |
| 9 | Adaptive Threshold | Mean-based + **Integral Image O(1)/pixel** |

> **Điểm kỹ thuật nổi bật:** Bước Shadow Removal (Box Blur kernel 51×51) và Adaptive Threshold đều sử dụng **cấu trúc Integral Image (Summed-Area Table)**, tối ưu độ phức tạp từ O(W×H×ks²) xuống **O(1) mỗi pixel** — giúp pipeline chạy đủ nhanh ngay trên ARM64 của RPi4.

- **Thời gian tiền xử lý trên RPi4:** < 250ms (không đáng kể so với Gemini API ~4.89s)

#### **Nhiệm vụ 3: Lưu trữ cơ sở dữ liệu (SQLite)**
RPi4 lưu toàn bộ dữ liệu vào file SQLite (`prisma/vihand.db`) — không cần database server riêng. Lý do chọn SQLite thay PostgreSQL/MySQL:
- **Không chạy service ngầm** → tiết kiệm RAM quý giá của RPi4 (4GB)
- **File-based** → sao lưu đơn giản bằng `cp`
- **Phù hợp tải nhỏ** → 5–10 giáo viên đồng thời, không cần concurrent writes cao

#### **Nhiệm vụ 4: Điều phối Hybrid AI (Gemini + ViT5)**
RPi4 điều phối toàn bộ luồng xử lý AI:
1. Nhận ảnh từ giáo viên, gọi Gemini API để lấy văn bản thô (OCR).
2. Chuyển văn bản thô cho dịch vụ Python nội bộ chạy mô hình ViT5 (Edge AI) để sửa lỗi chính tả.
3. Chạy thuật toán Levenshtein so khớp để đếm lỗi và tính điểm dựa trên kết quả sửa đổi.
4. Trả JSON kết quả cuối cùng về giao diện giáo viên.

GEMINI_API_KEY được lưu tại `.env.local` trên RPi4 — **giáo viên không bao giờ thấy API key** vì toàn bộ giao tiếp với Google diễn ra phía server. Đồng thời, mô hình ViT5 được tải trực tiếp vào RAM của Pi 4, không cần gửi văn bản của học sinh ra ngoài để chấm.

---

## 3. Các công nghệ chạy trên Raspberry Pi 4

### 3.1. Hệ điều hành

| Thành phần | Lựa chọn | Lý do |
|---|---|---|
| **OS** | Raspberry Pi OS Lite 64-bit (Debian Bookworm) | Không có desktop GUI → tiết kiệm ~200MB RAM |
| **Kiến trúc** | ARM64 (aarch64) | Hỗ trợ đầy đủ Node.js 20 LTS |
| **Timezone** | Asia/Ho_Chi_Minh | Đồng bộ thời gian cho log và database |

### 3.2. Runtime & Framework

| Công nghệ | Phiên bản | Vai trò |
|---|---|---|
| **Node.js** | v20 LTS | JavaScript runtime — chạy server chính |
| **Python** | 3.10 | Chạy Microservice ViT5 và thuật toán Levenshtein |
| **Next.js** | 16.2.4 | Full-stack framework (App Router) |
| **npm** | Đi kèm Node.js | Quản lý gói và chạy scripts |

> **Tại sao Node.js thay vì Python/Java?** Node.js có hiệu năng I/O async xuất sắc, phù hợp cho tác vụ chủ yếu là I/O-bound (chờ Gemini API). Hơn nữa, toàn bộ codebase (frontend + backend + image pipeline) đều dùng TypeScript/JavaScript — giảm độ phức tạp triển khai.

### 3.3. Cơ sở dữ liệu

| Công nghệ | Phiên bản | Vai trò |
|---|---|---|
| **SQLite** | 3.x | Database engine nhúng, file-based |
| **Prisma ORM** | 5.22.0 | Schema migration, type-safe queries |
| **better-sqlite3** | 12.9.0 | Native SQLite driver hiệu năng cao |

### 3.4. Xử lý ảnh

| Công nghệ | Phiên bản | Vai trò |
|---|---|---|
| **Jimp** | 1.6.1 | Thư viện xử lý ảnh thuần JavaScript |

> **Tại sao Jimp thay vì OpenCV?** OpenCV là thư viện C++ cần biên dịch riêng cho ARM64, dễ gặp lỗi dependency trên RPi OS. Jimp chạy 100% JavaScript thuần, không cần native binding → cài đặt `npm install` là xong, không cần build tools phức tạp.

### 3.5. Networking & Truy cập từ xa

| Công nghệ | Vai trò |
|---|---|
| **IP tĩnh (LAN)** | Địa chỉ cố định trong WiFi trường (VD: `192.168.1.100:3000`) |
| **Cloudflare Tunnel** | Đường hầm HTTPS miễn phí, không cần mở port router |
| **systemd service** | Tự động khởi động ViHand Grade khi RPi4 bật nguồn |
| **UFW Firewall** | Bảo vệ, chỉ mở port SSH và 3000 |

**Cloudflare Tunnel** là giải pháp then chốt: thay vì cần cấu hình port forwarding trên router trường (thường bị cấm), cloudflared tạo kết nối ra Cloudflare Edge → giáo viên ở nhà truy cập qua URL HTTPS an toàn.

### 3.6. Quản lý tiến trình (Process Management)

```ini
# /etc/systemd/system/vihand.service
[Unit]
Description=ViHand Grade - Next.js Server
After=network-online.target

[Service]
WorkingDirectory=/home/pi/vihand-grade
ExecStart=/usr/bin/node node_modules/.bin/next start
Restart=always
RestartSec=10
Environment=NODE_OPTIONS=--max-old-space-size=512

[Install]
WantedBy=multi-user.target
```

- **`Restart=always`**: Tự động khởi động lại nếu ứng dụng bị crash
- **`NODE_OPTIONS=--max-old-space-size=512`**: Giới hạn heap Node.js ở 512MB để tránh OOM killer

### 3.7. Tối ưu hóa đặc biệt cho RPi4

| Kỹ thuật | Chi tiết |
|---|---|
| **Swap 2GB** | RPi4 mặc định chỉ có 100MB swap — không đủ để `npm run build`. Mở rộng lên 2GB để build Next.js thành công |
| **Production mode** | Chạy `next start` (production) thay `next dev` — tiết kiệm đáng kể CPU và RAM |
| **Tailwind CSS purge** | CSS bundle chỉ vài chục KB — giảm băng thông serve qua Cloudflare Tunnel |
| **Integral Image** | Tối ưu thuật toán tiền xử lý ảnh xuống O(1)/pixel — pipeline chạy < 250ms trên ARM64 |
| **SQLite** | Không có database process nền — tiết kiệm ~100–200MB RAM so với PostgreSQL |

---

## 4. Kết quả hiệu năng thực nghiệm

### 4.1. Hiệu năng tải trang

| Trang | Latency (ms) | Ghi chú |
|---|---|---|
| `/` (Đăng nhập) | ~120ms | Static, prerendered |
| `/teacher/grade` | ~180ms | Dynamic SSR |
| `/student` | ~150ms | Dynamic SSR |
| `/admin` | ~160ms | Dynamic SSR |
| **Trung bình** | **~153ms** | Tất cả < 200ms ✅ |

### 4.2. Hiệu năng End-to-End chấm điểm

| Chỉ số | Giá trị |
|---|---|
| Tỷ lệ thành công | **100%** (10/10 ảnh) |
| Latency Min | ~3.8 giây |
| Latency Max | ~7.5 giây |
| **Latency Mean** | **~5.1 giây** |
| RAM idle | ~420MB / 4GB |
| RAM peak (khi chấm) | ~580MB / 4GB |
| Nhiệt độ CPU idle | ~45°C |
| Nhiệt độ CPU peak | ~58°C (ngưỡng throttling: 80°C) ✅ |

### 4.3. So sánh với máy tính phát triển (Windows)

| Tiêu chí | Windows (i5–i7) | Raspberry Pi 4 | Chênh lệch |
|---|---|---|---|
| Page load latency | ~80ms | ~153ms | +73ms (chấp nhận) |
| End-to-End latency | ~4.89s | ~5.1s | **+0.21s (<5%)** |
| Nhiệt độ peak | — | ~58°C | An toàn |
| **Chi phí phần cứng** | ~15 triệu VNĐ | **~1.5 triệu VNĐ** | **Tiết kiệm 90%** |

> **Kết luận thực nghiệm:** Raspberry Pi 4 hoàn toàn đáp ứng yêu cầu vận hành thực tế. Dù phải gánh thêm mô hình ViT5 nội bộ cho việc chấm điểm (Edge AI), lượng RAM tiêu thụ vẫn nằm trong chuẩn an toàn nhờ lượng tử hóa INT8. Hệ thống có thể hoạt động 24/7 ổn định khi được trang bị tản nhiệt quạt đúng cách.

---

## 5. Sơ đồ triển khai thực tế

```
                    [INTERNET]
  📱 GV ở nhà  ──┐
  💻 Phụ huynh ──┤──→ Cloudflare CDN (HTTPS) ──┐
  📱 HS ở nhà  ──┘                              │ Tunnel (mã hóa)
                                                │
    [MẠNG WiFi TRƯỜNG HỌC]                      │
  📱 GV trong trường ──┐                        ▼
  💻 Máy tính GV    ───┤──→ ┌─────────────────────────┐
  📱 HS trong trường ──┘    │   Raspberry Pi 4 (4GB)  │
   http://192.168.1.100:3000 │                         │
                             │  ✦ Next.js 16 (Web)    │
                             │  ✦ Python ViT5         │──→ Google
                             │  ✦ SQLite (Database)   │   Gemini API
                             │  ✦ Jimp (Ảnh)          │
                             │  ✦ Cloudflare Tunnel   │
                             └─────────────────────────┘
```

| Người dùng | Kết nối | Địa chỉ truy cập |
|---|---|---|
| GV/HS **trong trường** | WiFi trường | `http://192.168.1.100:3000` |
| GV/HS **ở nhà** | 4G / Internet | `https://xxx.trycloudflare.com` |

---

*Tài liệu: ViHand Grade — Raspberry Pi 4 Deployment*
*Cập nhật: 06/2026*
