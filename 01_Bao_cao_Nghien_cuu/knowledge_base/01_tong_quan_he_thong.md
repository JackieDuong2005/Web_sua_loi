# Tổng Quan Hệ Thống ViHand Grade

## Hệ thống là gì?

ViHand Grade là nền tảng chấm điểm chính tả thông minh dành riêng cho học sinh tiểu học Việt Nam (lớp 1–5). Hệ thống kết hợp AI đọc chính tả (Edge-TTS), nhận dạng chữ viết tay (Gemini Flash Lite + ViT5), và giao diện quản lý cho giáo viên.

## Các thành phần chính

### 1. Phân hệ Đọc chính tả AI (Web Dictation)
- Tích hợp trực tiếp trên Web: `/teacher/dictation`
- Chức năng: Sáng tác bài đọc với Qwen 2.5 SLM, kho ngữ liệu SGK chuẩn, phát âm chuẩn sư phạm qua Edge-TTS, lưu phiên đọc tự động làm Ground Truth đối chiếu.
- Ngôn ngữ: Tiếng Việt

### 2. ViHand Grade Web — Giao diện giáo viên & học sinh
- URL: http://localhost:3000
- Vai trò giáo viên: Quản lý lớp, phát đọc chính tả, chấm bài tự động và xuất báo cáo
- Vai trò học sinh: Xem lịch sử bài làm, nhận xét và trực quan hóa lỗi sai
- Vai trò admin: Quản trị tài khoản, lớp học, cấu hình hệ thống

### 3. ViT5 & AI Service — Nhận dạng & Sửa lỗi chính tả
- Chạy tại: http://localhost:8000
- OCR nhận dạng chữ viết tay (Gemini Vision) và sửa lỗi ngữ cảnh (ViT5 Seq2Seq)
- Trả về: điểm số (0–10), danh sách từ khó, nhận xét sư phạm chi tiết

## Luồng hoạt động tổng thể

```
Giáo viên mở tab Đọc chính tả
    → AI phát đọc bài chính tả chuẩn nhịp ngắt sư phạm
    → Học sinh nghe và viết vào vở
    → Hệ thống lưu phiên đọc làm văn bản đối chiếu (Ground Truth)

Sau buổi viết:
    → Chụp ảnh bài làm của học sinh
    → AI tiền xử lý ảnh 9 bước và nhận dạng văn bản
    → ViT5 so khớp với bài đọc mẫu và chấm điểm tự động
    → Giáo viên xem kết quả, chỉnh sửa nếu cần và gửi phản hồi
```

## Công nghệ sử dụng

| Thành phần | Công nghệ |
|-----------|-----------|
| Web fullstack | Next.js 16, TypeScript, Tailwind CSS 4 |
| Database | SQLite (qua Prisma ORM) |
| AI chấm điểm | Python FastAPI, ViT5 model, Gemini Vision |
| AI phát đọc | Edge-TTS Web Streaming, Qwen 2.5 SLM |
