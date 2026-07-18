# Tổng Quan Hệ Thống ViHand Grade

## Hệ thống là gì?

ViHand Grade là nền tảng chấm điểm chính tả thông minh dành riêng cho học sinh tiểu học Việt Nam (lớp 1–5). Hệ thống kết hợp AI đọc chính tả (Alexa/Xiaozhi), nhận dạng chữ viết tay (ViT5), và giao diện quản lý cho giáo viên.

## Các thành phần chính

### 1. Alexa — Trợ lý đọc chính tả AI
- Tích hợp vào thiết bị Xiaozhi ESP32-S3
- Wake word: "Alexa"
- Chức năng: Tự soạn đoạn văn chính tả phù hợp từng lớp, đọc chậm rãi cho học sinh nghe, lưu buổi học vào hệ thống
- Ngôn ngữ: Tiếng Việt

### 2. ViHand Grade Web — Giao diện giáo viên
- URL: http://localhost:3000
- Vai trò giáo viên: Xem danh sách bài làm, chấm điểm, xem lịch sử đọc chính tả
- Vai trò học sinh: Nộp bài chụp ảnh chữ viết tay
- Vai trò admin: Quản lý lớp học, tài khoản

### 3. ViT5 AI Service — Chấm điểm chữ viết tay
- Chạy tại: http://localhost:8000
- Nhận ảnh chụp bài làm học sinh
- OCR nhận dạng chữ viết tay → So sánh với đáp án → Chấm điểm tự động
- Trả về: điểm số (0–10), danh sách lỗi, nhận xét chi tiết

### 4. MCP Server — Cầu nối Xiaozhi ↔ Database
- Chạy tại: http://localhost:8200
- Kết nối WebSocket đến xiaozhi.me cloud
- Nhận lệnh từ LLM Xiaozhi → Lưu dữ liệu vào SQLite

## Luồng hoạt động tổng thể

```
Giáo viên nói với Alexa
    → Alexa soạn/đọc bài chính tả
    → Học sinh nghe và viết vào vở
    → Alexa hỏi: "Có muốn lưu bài không?"
    → Giáo viên xác nhận → Bài được lưu vào ViHand Grade

Sau buổi học:
    → Giáo viên chụp ảnh bài viết học sinh
    → Upload lên ViHand Grade
    → ViT5 AI chấm điểm tự động
    → Giáo viên xem kết quả và phản hồi
```

## Công nghệ sử dụng

| Thành phần | Công nghệ |
|-----------|-----------|
| Web frontend | Next.js 14, TypeScript |
| Database | SQLite (qua Prisma ORM) |
| AI chấm điểm | Python, ViT5 model |
| MCP Server | Python, FastAPI, WebSockets |
| Thiết bị | Xiaozhi ESP32-S3 |
| Cloud AI | xiaozhi.me LLM |
