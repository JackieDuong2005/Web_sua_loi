# 📋 HƯỚNG DẪN TỪNG BƯỚC THỰC NGHIỆM JETSON NANO NGÀY MAI
## Dự án: ViHand Grade — Hệ thống Chấm Điểm & Sửa Lỗi Chính Tả Chữ Viết Tay
> **Mục tiêu tối thượng:** Chạy thử nghiệm hệ thống như một Server trên NVIDIA Jetson Nano nhưng **BẢO ĐẢM 100% AN TOÀN**, tuyệt đối không đụng chạm hay gây ảnh hưởng đến các thư mục/dự án khác trên thẻ nhớ SD, và cuối giờ dọn dẹp sạch sẽ hoàn toàn về nguyên trạng ban đầu.

---

## 🧭 LỘ TRÌNH TỔNG QUAN TRONG NGÀY
```
┌────────────────┐     ┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│ GIAI ĐOẠN 1    │ ──> │ GIAI ĐOẠN 2    │ ──> │ GIAI ĐOẠN 3    │ ──> │ GIAI ĐOẠN 4    │
│ Cắm nguồn, kết │     │ Chạy Server    │     │ Chấm thi thử   │     │ Dọn dẹp sạch   │
│ nối mạng lấy IP│     │ bằng Docker    │     │ nghiệm thực tế │     │ khôi phục 100% │
└────────────────┘     └────────────────┘     └────────────────┘     └────────────────┘
```

---

## ⚡ GIAI ĐOẠN 1: BẬT MÁY VÀ XÁC ĐỊNH ĐỊA CHỈ IP JETSON

1. **Cắm nguồn và mạng:**
   - Cắm nguồn cho Jetson Nano (khuyến nghị dùng nguồn Jack DC tròn 5V/4A kèm jumper J48, hoặc cắm cáp Micro-USB 5V/2.5A).
   - Cắm dây mạng LAN vào cùng router/switch với laptop/điện thoại của bạn, hoặc kết nối vào WiFi.

2. **Lấy địa chỉ IP của Jetson Nano:**
   - Mở Terminal trên Jetson Nano (hoặc SSH từ laptop vào) và gõ:
     ```bash
     hostname -I
     ```
   - *Ví dụ kết quả hiển thị:* `192.168.1.50` (Hãy ghi nhớ số IP này để dùng cho điện thoại/laptop kết nối).

3. **Di chuyển vào thư mục dự án ViHand Grade:**
   ```bash
   cd ~/vihand-grade
   # (hoặc đường dẫn thư mục code trên máy: cd /path/to/Web_sua_loi)
   ```

---

## 🐳 GIAI ĐOẠN 2: KHỞI ĐỘNG SERVER BẰNG DOCKER (CÁCH LY TUYỆT ĐỐI)

> **Vì sao dùng Docker?** Docker tạo một "phòng thí nghiệm ảo" độc lập. Thư viện Python, PyTorch, YOLO hay Node.js của ViHand Grade chỉ nằm trong container, **không can thiệp vào `/usr/lib` hay thư mục của người khác**.

1. **Di chuyển vào thư mục Docker của Jetson:**
   ```bash
   cd 03_Scripts_Trien_khai/jetson_nano/docker
   chmod +x *.sh
   ```

2. **Chạy kịch bản khởi động tự động:**
   ```bash
   bash docker_run.sh
   ```

3. **Lựa chọn chế độ khi script hỏi:**
   ```
     1) Python AI Server Chuyên Dụng (Port 8000) [Khuyên dùng - Siêu nhẹ, build 3 phút]
     2) Toàn bộ Full Stack (Python AI :8000 + Next.js Web :3000) qua Docker Compose
   ```
   - **👉 Khuyến nghị bấm `1` (Mặc định):**
     - Máy sẽ chỉ chạy phần AI Core (YOLOv8 + ViT5 + Edge-TTS) trên cổng `8000`.
     - Tiết kiệm RAM tối đa cho Jetson Nano (chỉ dùng khoảng 1.2GB RAM).
     - Tự động tận dụng 128 Maxwell CUDA Cores của GPU Jetson.
     - Laptop hoặc App Android bên ngoài chỉ cần trỏ API về cổng 8000 này.

---

## 🧪 GIAI ĐOẠN 3: LÁI THỬ NGHIỆM & CHẤM ĐIỂM BÀI THI

### 3.1. Kiểm tra nhanh trên trình duyệt Laptop / Điện thoại
Cùng mạng LAN, mở trình duyệt gõ:
- **Tài liệu Swagger API:** `http://<IP_JETSON>:8000/docs`
- **Kiểm tra sức khỏe:** `http://<IP_JETSON>:8000/health`
- **Trạng thái mô hình YOLO:** `http://<IP_JETSON>:8000/yolo/status`

### 3.2. Xem log trực tiếp của server (Nếu muốn kiểm tra lỗi)
Trên terminal Jetson, gõ:
```bash
docker logs -f vihand-ai-core
```
*(Nhấn `Ctrl + C` để thoát màn hình xem log mà không tắt server).*

### 3.3. Test chấm bài từ Mobile App hoặc BFF
- Cấu hình endpoint trên App Android: `http://<IP_JETSON>:8000`
- Chụp ảnh bài thi và gửi yêu cầu, theo dõi tốc độ suy luận của GPU Jetson Nano.

---

## 🧹 GIAI ĐOẠN 4: CUỐI GIỜ — THU HỒI & KHÔI PHỤC THẺ NHỚ 100%

> **⚠️ BẮT BUỘC THỰC HIỆN TRƯỚC KHI TẮT MÁY / TRẢ MÁY:**  
> Đảm bảo thẻ nhớ SD không lưu lại rác build, không chiếm dung lượng và trả lại trạng thái ban đầu cho các dự án khác.

1. **Chạy script dọn dẹp 1-Click:**
   ```bash
   cd ~/vihand-grade/03_Scripts_Trien_khai/jetson_nano/docker
   bash docker_cleanup.sh
   ```

2. **Kịch bản sẽ tự động hoàn tất:**
   - 🛑 Dừng và xóa container `vihand-ai-core` (và `vihand-web-app`).
   - 🗑️ Xóa toàn bộ Docker Image đã build (`vihand-ai:jetson`).
   - 🧹 Xóa bộ nhớ cache build của Docker.
   - 📊 In ra dung lượng ổ cứng để bạn xác nhận thẻ nhớ đã sạch sẽ 100%.

3. **Tắt máy an toàn:**
   ```bash
   sudo shutdown -h now
   ```

---

## 💡 PHƯƠNG ÁN DỰ PHÒNG: NẾU KHÔNG DÙNG DOCKER

Nếu máy Jetson Nano chưa có Docker hoặc Docker gặp lỗi quyền hạn:
1. **Khởi chạy Sandbox cách ly (Không xâm lấn):**
   ```bash
   cd ~/vihand-grade/03_Scripts_Trien_khai/jetson_nano
   bash run_isolated_server.sh
   ```
2. **Cuối giờ dọn dẹp và xóa hoàn toàn:**
   ```bash
   sudo bash cleanup_and_restore.sh
   ```

---

## 🛠️ XỬ LÝ NHANH SỰ CỐ THƯỜNG GẶP (CHEATSHEET)

| Hiện tượng | Nguyên nhân | Cách xử lý ngay tại chỗ |
| :--- | :--- | :--- |
| **Bị treo máy khi build hoặc nạp model** | Jetson Nano bị tràn 4GB RAM vật lý | Tạo nhanh Swap 3GB: `sudo fallocate -l 3G /swapfile_temp && sudo chmod 600 /swapfile_temp && sudo mkswap /swapfile_temp && sudo swapon /swapfile_temp` |
| **Cổng 8000 báo "Address already in use"** | Có tiến trình cũ chưa tắt | Giải phóng ngay: `sudo kill -9 $(sudo lsof -t -i:8000)` |
| **Lỗi `permission denied` khi chạy Docker** | User hiện tại chưa nằm trong nhóm docker | Chạy bằng quyền sudo: `sudo bash docker_run.sh` hoặc gõ `sudo usermod -aG docker $USER` rồi đăng nhập lại. |
| **Máy tự sập nguồn khi chạy AI nặng** | Nguồn Micro-USB không đủ dòng (cần >2.5A) | Chuyển Jumper J48 để dùng nguồn tổ ong / adapter DC 5V/4A hoặc giảm xung: `sudo nvpmodel -m 1` (chế độ 5W). |
| **Kiểm tra GPU có đang chạy không** | Cần xem xung nhịp GPU realtime | Gõ lệnh: `jtop` (sau đó nhấn phím `1` hoặc `2` để xem % GPU). |

---

*Chúc buổi thực nghiệm của bạn thành công rực rỡ và an toàn tuyệt đối!*
