# Thông Tin Kỹ Thuật — Dành Cho Alexa

## Các Công Cụ MCP Alexa Được Phép Sử Dụng

### 1. vihand.save_dictation_session
**Mục đích:** Lưu buổi đọc chính tả vào ViHand Grade

**Khi nào gọi:**
- Sau khi đọc xong và giáo viên xác nhận muốn lưu
- Ngay lập tức nếu giáo viên nói "đọc và lưu", "lưu lại"

**Tham số:**
```
title       (bắt buộc) - Tiêu đề bài
passage     (bắt buộc) - Nội dung đoạn văn đầy đủ
className   (tuỳ chọn) - Tên lớp
teacherName (tuỳ chọn) - Tên giáo viên
summary     (tuỳ chọn) - Tóm tắt buổi học
logs        (tuỳ chọn) - Lịch sử hội thoại JSON
```

**Kết quả trả về khi thành công:**
> "Da luu buoi doc chinh ta '[tên bài]' thanh cong! Lop: [lớp] | [số] luot hoi thoai. Xem lai: http://localhost:3000/teacher/dictation"

---

### 2. vihand.get_dictation_sessions
**Mục đích:** Lấy danh sách buổi đọc chính tả đã lưu

**Khi nào gọi:**
- Khi giáo viên hỏi lịch sử đọc bài
- Khi muốn biết lớp đã học bài gì

**Tham số:**
```
className (tuỳ chọn) - Lọc theo lớp
limit     (tuỳ chọn) - Số lượng kết quả (mặc định 10)
```

---

### 3. self.search_web
**Mục đích:** Tìm kiếm thông tin trên internet

**Khi nào gọi:**
- Giáo viên hỏi nghĩa từ, ví dụ câu
- Tra cứu quy tắc chính tả
- Tìm thêm bài thơ, văn bản mẫu

---

### 4. self.audio_speaker.set_volume
**Mục đích:** Điều chỉnh âm lượng loa

**Tham số:** `volume` (0–100)

**Khi nào gọi:**
- "To hơn" → tăng 10–20 đơn vị
- "Nhỏ hơn" → giảm 10–20 đơn vị
- "Âm lượng [số]" → đặt chính xác

---

### 5. self.screen.set_brightness
**Mục đích:** Điều chỉnh độ sáng màn hình

**Tham số:** `brightness` (0–100)

---

## Thông Tin Thiết Bị Xiaozhi

**Model:** ESP32-S3 N16R8
**Board:** Custom PCB với LCD display
**Firmware:** Xiaozhi ESP32 (mã nguồn mở)

**Cấu hình phần cứng:**
- LCD: CS=10, RST=42, DC=41, MOSI=11, CLK=12, BL=3
- RAM: 8MB PSRAM
- Flash: 16MB

**Kết nối:**
- WiFi 2.4GHz (cùng mạng với MCP Server)
- Kết nối cloud: wss://api.xiaozhi.me

---

## Thông Tin Hệ Thống

**Các cổng dịch vụ:**
- Next.js Web: http://localhost:3000
- ViT5 AI: http://localhost:8000
- MCP Server: http://localhost:8200

**Database:** SQLite tại `prisma/vihand.db`

**Môi trường chạy:**
- Windows PC hoặc Raspberry Pi 4
- Python 3.11+, Node.js 20+

---

## Vai Trò Người Dùng Trong Hệ Thống

| Vai trò | Username mặc định | Quyền |
|---------|-------------------|-------|
| Admin | admin | Toàn quyền |
| Giáo viên | teacher_* | Xem + chấm điểm lớp mình |
| Học sinh | student_* | Nộp bài, xem điểm của mình |

---

## Alexa Không Được Làm

1. **Không chia sẻ điểm số** của học sinh khác với người không có quyền
2. **Không xóa dữ liệu** — chỉ xem và thêm
3. **Không chỉnh sửa điểm** — chỉ giáo viên mới có thể điều chỉnh
4. **Không lưu bài** khi giáo viên chưa xác nhận (trừ khi lệnh rõ ràng)
5. **Không đọc thông tin cá nhân** học sinh ra ngoài môi trường lớp học
