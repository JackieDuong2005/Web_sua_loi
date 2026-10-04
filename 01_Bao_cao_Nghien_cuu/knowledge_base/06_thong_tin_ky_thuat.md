# Thông Tin Kỹ Thuật — Hệ Thống ViHand Grade

## Kiến Trúc Dịch Vụ & Cổng Mạng

**1. Next.js Web Application & BFF Gateway**
- Cổng: `http://localhost:3000`
- Công nghệ: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Radix UI
- Vai trò: Giao diện người dùng (Giáo viên, Học sinh, Admin), quản lý lớp học, phát đọc chính tả (Edge-TTS) và API Gateway điều phối chấm điểm.

**2. Python AI Service (ViT5 + Qwen SLM)**
- Cổng: `http://localhost:8000`
- Công nghệ: FastAPI, PyTorch, HuggingFace Transformers, ViT5 Seq2Seq (`chamdentimem/ViT5_Vietnamese_Correction`), Qwen 2.5 SLM
- Vai trò: Sửa lỗi chính tả tiếng Việt theo ngữ cảnh câu, tính điểm Levenshtein, sáng tác bài đọc chính tả đạt chuẩn GDPT 2018.

**3. Cơ sở dữ liệu**
- Loại: SQLite
- ORM: Prisma ORM 5.x
- Đường dẫn: `prisma/vihand.db`
- Quản lý: Lớp học (`Class`), người dùng (`User`), kết quả chấm (`Grade`), phiên đọc chính tả (`DictationSession`), kho ngữ liệu SGK (`TextbookPassage`).

---

## Môi Trường & Triển Khai

- **Hệ điều hành:** Windows 10/11 (Development) hoặc Linux / Raspberry Pi 4 (Production).
- **Runtime:** Node.js v20+, Python 3.10+.
- **Tập lệnh khởi động:**
  - `start_all.bat`: Tự động khởi động đồng thời Web (port 3000) và Python AI Service (port 8000).
  - `setup_api_key.bat`: Thiết lập `GEMINI_API_KEY` cho hệ thống.
