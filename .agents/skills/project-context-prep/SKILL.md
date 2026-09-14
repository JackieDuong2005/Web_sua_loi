---
name: project-context-prep
description: >
  Chuẩn bị context toàn diện về codebase ViHand Grade (hoặc project đang mở) trước khi bắt đầu làm việc —
  quét cấu trúc thư mục, nhận diện tech stack (Next.js, FastAPI, Prisma, Jimp, MCP), xác định các entry points,
  các module chính và lưu ý bảo mật. Kích hoạt khi người dùng yêu cầu làm quen hoặc chuẩn bị: "chuẩn bị context",
  "prep project", "/prep", "đọc hiểu project trước khi làm", "tổng quan codebase". KHÔNG tự động chạy nếu người
  dùng chỉ hỏi câu hỏi lập trình cụ thể.
---

# Project Context Prep (ViHand Grade)

Mục tiêu: Trong 1 lượt duy nhất, xây dựng bức tranh chính xác và toàn diện về project để agent làm việc hiệu quả ngay sau đó — không đoán mò, không đọc nhầm thư mục ngoại lai/rác, nắm vững luồng xử lý AI và kiến trúc hệ thống.

Đầu ra là **một bản tóm tắt trong chat** (không tự tiện tạo file rác trong workspace), có cấu trúc rõ ràng để người dùng nhanh chóng xác nhận.

---

## Khi nào dùng skill này

- Kích hoạt khi người dùng nói: `"chuẩn bị context"`, `"prep project này"`, `"/prep"`, `"đọc hiểu project trước"`, `"cho tôi tổng quan codebase"`.
- KHÔNG chạy toàn bộ quy trình nếu người dùng chỉ hỏi câu hỏi đơn lẻ (như *"file X ở đâu?"*, *"sửa lỗi syntax dòng này"*).
- Tham khảo nhanh kiến trúc chi tiết tại: [architecture_cheat_sheet.md](./references/architecture_cheat_sheet.md).

---

## Quy trình 4 bước thực hiện

### Bước 1 — Quét cấu trúc siêu tốc (Deterministic & Noise-free)

Chạy script quét chuyên dụng nằm trong skill (đã được tối ưu hóa riêng cho môi trường Windows và dự án ViHand Grade, thực thi trong <0.1s):

```powershell
python .agents/skills/project-context-prep/scripts/scan_project.py . --max-depth 3
```

> ⚠️ **Lưu ý môi trường:** Trên Windows, luôn dùng lệnh `python` (không dùng `python3`). Script đã tự động bỏ qua các thư mục nặng như `xiaozhi-esp32-main`, `02_Kich_ban_Thuc_nghiem`, `Poster nckh`, `node_modules`, `.next`.

Output trả về JSON cấu trúc gồm:
- `tech_stack_detected`: Chi tiết phiên bản Next.js, React, Tailwind, Prisma, Gemini SDK, FastAPI, v.v.
- `core_anchor_points`: Danh sách các điểm neo cốt lõi của ứng dụng (Grading pipeline, ViT5 server, MCP server, DB schema).
- `manifests_found` & `config_files_found`: Các file cấu hình và khai báo thư viện.
- `largest_source_files`: Các file chứa logic lớn nhất của ViHand Grade.
- `directory_tree_depth_limited`: Cây thư mục sạch đã lọc toàn bộ noise.

---

### Bước 2 — Đọc có chọn lọc theo Anchor Points

Dựa vào báo cáo Bước 1, đọc có chọn lọc theo thứ tự ưu tiên sau (chỉ cần đọc phần đầu và các function/interface chính, không cần đọc toàn bộ hàng nghìn dòng):

1. **README.md** — Mục đích đề tài, các tác giả, cấu hình triển khai cơ bản.
2. **Core AI Grading Pipeline**:
   - [`app/api/grade/route.ts`](file:///c:/Users/Jackie%20Duong/Desktop/Web_sua_loi/app/api/grade/route.ts) — Luồng chấm bài 4 bước (Jimp -> Gemini OCR -> ViT5 Spelling -> Scoring).
   - [`lib/image-processor.ts`](file:///c:/Users/Jackie%20Duong/Desktop/Web_sua_loi/lib/image-processor.ts) — Pipeline tiền xử lý ảnh 9 bước (Jimp).
3. **Mô hình Dữ liệu & AI Services**:
   - [`prisma/schema.prisma`](file:///c:/Users/Jackie%20Duong/Desktop/Web_sua_loi/prisma/schema.prisma) — Các bảng `User`, `Class`, `GradeRecord`, `DictationSession`.
   - [`python_service/main.py`](file:///c:/Users/Jackie%20Duong/Desktop/Web_sua_loi/python_service/main.py) — FastAPI endpoint `/predict` chạy mô hình ViT5.
   - [`mcp_service/main.py`](file:///c:/Users/Jackie%20Duong/Desktop/Web_sua_loi/mcp_service/main.py) — MCP Server cho tính năng đọc chính tả.
4. **Giao diện người dùng chính**:
   - [`app/teacher/grade/page.tsx`](file:///c:/Users/Jackie%20Duong/Desktop/Web_sua_loi/app/teacher/grade/page.tsx) — Canvas và bảng chấm điểm của giáo viên.
   - [`app/teacher/dictation/page.tsx`](file:///c:/Users/Jackie%20Duong/Desktop/Web_sua_loi/app/teacher/dictation/page.tsx) — Phát âm và điều khiển bài đọc chính tả.

---

### Bước 3 — Ghi nhận các điểm lưu ý kỹ thuật

Trong lúc quan sát codebase, chú ý:
- Trạng thái các biến môi trường trong `.env` (`GEMINI_API_KEY`, `HF_TOKEN`, `DATABASE_URL`).
- Database SQLite `prisma/vihand.db` là dữ liệu thực — tuyệt đối không xóa hoặc làm hỏng khi migrate.
- Các script khởi động hệ thống (`start_all.bat`, `scripts/start.sh`).

---

### Bước 4 — Trình bày tóm tắt trong Chat

Trình bày tóm tắt cho người dùng theo mẫu chuẩn sau:

```markdown
## 📌 Tổng quan dự án ViHand Grade

- **Mục tiêu**: Hệ thống AI nhận dạng chữ viết tay tiếng Việt, sửa lỗi chính tả và chấm điểm tự động cho học sinh tiểu học (Đề tài NCKH Sinh viên TĐT).
- **Tech Stack chính**:
  - **Frontend / Fullstack**: Next.js 16 (App Router), React 19, Tailwind CSS 4, Radix UI.
  - **AI Pipeline**: Google Gemini Flash Lite (Vision OCR) + ViT5 Seq2Seq (Sửa chính tả) + Jimp (Tiền xử lý ảnh 9 bước).
  - **Database**: SQLite qua Prisma ORM 5.
  - **Dịch vụ phụ trợ**: Python FastAPI (port 8000), MCP Dictation Server (Edge-TTS).

### 🏗️ Cấu trúc & Module trọng yếu:
1. `app/api/grade/route.ts` & `lib/image-processor.ts`: Pipeline chấm điểm và xử lý ảnh.
2. `python_service/`: Server AI ViT5 chạy cục bộ.
3. `mcp_service/`: Server MCP sinh giọng đọc chính tả từ kho SGK.
4. `prisma/schema.prisma`: Cơ sở dữ liệu lớp học, tài khoản và kết quả chấm.
5. `app/teacher/` & `app/student/`: Giao diện tương tác theo vai trò.

### 💡 Trạng thái & Hướng làm việc tiếp theo:
[Nêu ngắn gọn nhận xét về tính năng hoặc module người dùng đang quan tâm]
```

Kết thúc bằng câu hỏi điều phối: *"Tôi đã nắm rõ toàn bộ kiến trúc ViHand Grade — bạn muốn chúng ta bắt đầu triển khai/xử lý phần nào?"*
