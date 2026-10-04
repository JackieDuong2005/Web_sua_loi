# 🚀 Hướng Dẫn Triển Khai Hệ Thống ViHand Grade Trên Trạm Biên

Thư mục này chứa toàn bộ các kịch bản tự động hóa triển khai, tối ưu hóa phần cứng, cấu hình mạng và đo đạc hiệu năng thực nghiệm cho hệ thống **ViHand Grade** trên 2 nền tảng phần cứng biên:
1. **Raspberry Pi 4 Model B (4GB / 8GB RAM)**: Đóng gói thành thiết bị trường học Appliance hoàn chỉnh "cắm điện là chạy".
2. **NVIDIA Jetson Nano (4GB RAM)**: Thiết lập module hóa từng phần nhỏ lẻ, tối ưu nhân GPU Maxwell 128 CUDA Cores và tích hợp bộ công cụ đo lường hiệu năng benchmark (FPS, Latency, CPU/GPU, VRAM, Nhiệt độ) phục vụ nghiên cứu khoa học.

---

## 📁 Cấu Trúc Thư Mục

```
03_Scripts_Trien_khai/
├── README.md                                  # Tài liệu hướng dẫn tổng quan này
│
├── rpi4/                                      # [NHÁNH 1] RASPBERRY PI 4 (APPLIANCE HOÀN CHỈNH)
│   ├── 00_init_system.sh                      # 1. Cập nhật OS, tạo Swap 3GB, cài base tools
│   ├── 01_setup_python_ai.sh                  # 2. Cài Python 3.10+, venv, Torch CPU, ViT5, YOLO, Qwen, TTS
│   ├── 02_setup_webapp.sh                     # 3. Cài Node.js 20 LTS, build Next.js, Prisma SQLite
│   ├── 03_setup_services.sh                   # 4. Đăng ký systemd: vihand-web + vihand-python
│   ├── 04_setup_network_firewall.sh           # 5. WiFi auto-connect, Static IP, UFW firewall
│   ├── 05_setup_cloudflare_tunnel.sh          # 6. Cloudflare Named Tunnel (HTTPS domain cố định)
│   ├── 06_verify_system.sh                    # 7. Test tự động toàn bộ API & Pipeline end-to-end
│   ├── install_all.sh                         # Master script chạy 1 lệnh tự động hóa 00->06
│   └── update_rpi.sh                          # Script cập nhật code Git, xoay vòng API Keys, restart
│
├── jetson_nano/                               # [NHÁNH 2] NVIDIA JETSON NANO (BENCHMARK & TỐI ƯU GPU)
│   ├── 00_init_jetson.sh                      # 1. Bật MAXN 10W, jetson_clocks, swap 4GB, jtop
│   ├── 01_setup_cuda_torch.sh                 # 2. Cài đặt PyTorch tương thích CUDA Tegra JetPack
│   ├── 02_setup_yolo_detector.sh              # 3. Cài đặt Ultralytics YOLOv8, nạp model best.pt
│   ├── 03_setup_vit5_service.sh               # 4. Cài đặt Transformers ViT5 (INT8 / CUDA FP16)
│   ├── 04_setup_qwen_slm.sh                   # 5. Cấu hình Qwen2.5-0.5B (cân chỉnh RAM cho Jetson)
│   ├── 05_setup_webapp.sh                     # 6. Cài đặt Node.js 20 LTS, build Next.js Web
│   ├── 06_setup_services.sh                   # 7. Systemd services tối ưu CPU core affinity
│   ├── benchmark_yolo.py                      # 8a. Benchmark YOLO: FPS, latency, GPU load, box count
│   ├── benchmark_vit5.py                      # 8b. Benchmark ViT5: Latency ms/token theo độ dài câu
│   ├── benchmark_system_monitor.sh            # 8c. Ghi log tegrastats: CPU, GPU, RAM, VRAM, Temp, Watt
│   └── run_full_benchmark.sh                  # 8d. Master Benchmark: chạy chuỗi test và xuất báo cáo
│
└── shared/                                    # TÀI NGUYÊN & TEMPLATE CHUNG
    ├── .env.example                           # Mẫu biến môi trường chuẩn hóa cho trạm biên
    ├── vihand-web.service.template            # File mẫu systemd cho Web App
    ├── vihand-python.service.template         # File mẫu systemd cho Python AI Core
    └── cloudflared.service.template           # File mẫu systemd cho Cloudflare Tunnel
```

---

## 🍓 Hướng Dẫn Dành Cho Raspberry Pi 4

### Cách 1: Cài đặt tự động 1-Click (Khuyến nghị)
Sau khi clone repository về Raspberry Pi, chạy script điều phối:
```bash
cd ~/vihand-grade/03_Scripts_Trien_khai/rpi4
chmod +x *.sh
sudo bash install_all.sh
```
*Script sẽ hỏi các thông tin cần thiết (Gemini API Key, WiFi, tên miền Cloudflare) và tự động hoàn thành 100% các bước.*

### Cách 2: Cài đặt từng phần theo tiến trình
Nếu muốn kiểm soát chi tiết hoặc gỡ lỗi từng thành phần:
```bash
cd ~/vihand-grade/03_Scripts_Trien_khai/rpi4
chmod +x *.sh

# Bước 0: Tạo Swap 3GB & cập nhật OS
sudo bash 00_init_system.sh

# Bước 1: Thiết lập Python AI Core (ViT5, YOLOv8, Qwen SLM, Edge-TTS)
bash 01_setup_python_ai.sh

# Bước 2: Thiết lập Web App Next.js & Prisma SQLite
bash 02_setup_webapp.sh

# Bước 3: Đăng ký dịch vụ tự khởi động Systemd
sudo bash 03_setup_services.sh

# Bước 4: Cấu hình WiFi tự kết nối & tường lửa UFW
sudo bash 04_setup_network_firewall.sh

# Bước 5: (Tùy chọn) Gắn tên miền HTTPS qua Cloudflare Named Tunnel
sudo bash 05_setup_cloudflare_tunnel.sh

# Bước 6: Kiểm tra tự động toàn bộ hệ thống
bash 06_verify_system.sh
```

### Quản lý & Cập nhật trên Raspberry Pi 4
```bash
# Xem trạng thái các dịch vụ
sudo systemctl status vihand-web vihand-python

# Xem nhật ký realtime của Web App
sudo journalctl -u vihand-web -f

# Xem nhật ký của Python AI Core
sudo journalctl -u vihand-python -f

# Cập nhật code mới từ GitHub & restart nhẹ nhàng
bash ~/vihand-grade/03_Scripts_Trien_khai/rpi4/update_rpi.sh

# Cập nhật nóng danh sách Gemini API Keys
bash ~/vihand-grade/03_Scripts_Trien_khai/rpi4/update_rpi.sh --keys-only
```

---

## ⚡ Hướng Dẫn Dành Cho NVIDIA Jetson Nano

### 1. Cài đặt từng bước (Modular Setup)
Jetson Nano chia sẻ RAM giữa CPU và GPU (4GB Unified Memory). Cần cài đặt theo từng bước để theo dõi tài nguyên:
```bash
cd ~/vihand-grade/03_Scripts_Trien_khai/jetson_nano
chmod +x *.sh *.py

# Bước 0: Bật chế độ MAXN 10W, khóa xung jetson_clocks, tạo Swap 4GB
sudo bash 00_init_jetson.sh

# Bước 1: Cài đặt PyTorch tương thích CUDA (Maxwell sm_53)
bash 01_setup_cuda_torch.sh

# Bước 2: Cài đặt Ultralytics và kiểm thử YOLOv8 trên CUDA
bash 02_setup_yolo_detector.sh

# Bước 3: Cài đặt Transformers và đo đạc ViT5 (INT8 vs CUDA FP16)
bash 03_setup_vit5_service.sh

# Bước 4: Đánh giá bộ nhớ và cấu hình Qwen2.5 SLM + Edge-TTS
bash 04_setup_qwen_slm.sh

# Bước 5: Cài đặt Next.js Web App & Prisma SQLite
bash 05_setup_webapp.sh

# Bước 6: Đăng ký Systemd Services tối ưu phần cứng
sudo bash 06_setup_services.sh
```

> [!IMPORTANT]
> **Lưu ý kiến trúc hệ điều hành trên Jetson Nano:**
> - Bản gốc JetPack 4.6 (L4T 32.7) sử dụng **Ubuntu 18.04 LTS (GLIBC 2.27)**. Next.js 16 và Node.js 20 yêu cầu **GLIBC >= 2.28**.
> - **Mô hình khuyến nghị thực tế:** Sử dụng Jetson Nano làm **Trạm Xử Lý AI Chuyên Dụng (AI Node - Port 8000)** với nhân GPU CUDA Maxwell, trong khi Web App Next.js chạy trên Raspberry Pi 4 hoặc máy tính LAN trường học.
> - Nếu muốn chạy cả Web App lẫn AI Core trên cùng một Jetson Nano, khuyến nghị cài đặt bản ROM **Ubuntu 20.04 LTS (Focal)** cho Jetson Nano (Q-engineering) hoặc sử dụng dòng **Jetson Orin Nano** (JetPack 5/6 hỗ trợ sẵn Ubuntu 20.04/22.04).

### 2. Triển Khai Bằng Docker (Cách Ly Tuyệt Đối 100% — Khuyên Dùng)
Dành riêng cho trường hợp **trên thẻ nhớ SD của Jetson Nano đã có các project/folder khác không được phép đụng vào**:

1. **Khởi chạy bằng Docker:**
   ```bash
   cd ~/vihand-grade/03_Scripts_Trien_khai/jetson_nano/docker
   bash docker_run.sh
   ```
   *Script sẽ hỏi bạn muốn chạy chỉ AI Server (:8000) hay cả Full Stack (:3000), tự động build và chạy container cách ly.*

2. **Dọn dẹp và khôi phục thẻ nhớ 100% (Cuối ngày khi test xong):**
   ```bash
   bash docker_cleanup.sh
   ```
   *Tự động dừng, xóa container và xóa toàn bộ image, trả lại dung lượng thẻ nhớ SD sạch bóng như ban đầu.*

### 3. Chế độ Test Thử Nghiệm Không Cần Docker (Safe Sandbox)
Nếu không muốn dùng Docker:
- **Chạy server cách ly:** `bash ~/vihand-grade/03_Scripts_Trien_khai/jetson_nano/run_isolated_server.sh`
- **Dọn dẹp cuối giờ:** `sudo bash ~/vihand-grade/03_Scripts_Trien_khai/jetson_nano/cleanup_and_restore.sh`

### 4. Thực nghiệm & Đo đạc Thông số Benchmark
Phục vụ viết báo cáo nghiên cứu khoa học hoặc đối sánh giải thuật:

```bash
# Kích hoạt môi trường virtualenv
source ~/vihand-grade/python_service/venv/bin/activate
cd ~/vihand-grade/03_Scripts_Trien_khai/jetson_nano

# 1. Chạy riêng benchmark YOLOv8 (FPS, Latency ms, VRAM)
python3 benchmark_yolo.py --iterations 20

# 2. Chạy riêng benchmark ViT5 (Độ trễ câu 10, 25, 50, 100 từ, Throughput tok/s)
python3 benchmark_vit5.py --iterations 5

# 3. CHẠY TOÀN BỘ CHUỖI BENCHMARK & XUẤT BÁO CÁO NCKH
bash run_full_benchmark.sh
```

*Sau khi chạy `run_full_benchmark.sh`, file báo cáo Markdown chuẩn `FINAL_BENCHMARK_REPORT.md` kèm file CSV log `system_benchmark_metrics.csv` sẽ được tự động sinh ra.*

---

## 🔒 Kiến Trúc Bảo Mật Trạm Biên

1. **Phân vùng Cổng Mạng:**
   - Cổng **3000 (Next.js Web & AI BFF Gateway)**: Mở cho mạng LAN trường học và kết nối Cloudflare Tunnel. Thực hiện toàn bộ việc kiểm soát quyền truy cập, xác thực JWT session của giáo viên và học sinh.
   - Cổng **8000 (FastAPI AI Core)**: **Đóng hoàn toàn với mạng ngoài (localhost only)**. Mọi yêu cầu từ client bắt buộc phải đi qua Next.js BFF để ngăn chặn tấn công khai thác mô hình AI.
2. **Cơ chế Fallback thông minh:**
   - Khi mô hình ViT5 hoặc YOLOv8 trạm biên bị quá tải hoặc quá nhiệt, Next.js AI Gateway tự động chuyển tiếp request sang Google Gemini API (xoay vòng qua danh sách `GEMINI_API_KEYS`).
   - Đảm bảo trải nghiệm chấm thi của giáo viên không bị gián đoạn.
