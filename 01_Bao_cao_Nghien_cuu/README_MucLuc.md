# MỤC LỤC TÀI LIỆU NGHIÊN CỨU — ViHand Grade

> Cập nhật lần cuối: 2026-07-16

---

## 📂 Cấu trúc thư mục `01_Bao_cao_Nghien_cuu/`

```
01_Bao_cao_Nghien_cuu/
├── README_MucLuc.md                    ← File này — Mục lục tổng hợp
│
├── Chuong_1_Gioi_thieu.md             ← Chương 1: Giới thiệu đề tài
├── Chuong_2_Co_so_ly_thuyet.md        ← Chương 2: Cơ sở lý thuyết
├── Chuong_3_Thiet_ke_He_thong.md      ← Chương 3: Thiết kế hệ thống
├── Chuong_4_Xay_dung_Ung_dung.md      ← Chương 4: Xây dựng ứng dụng
├── Chuong_5_Ket_qua_Thuc_nghiem.md    ← Chương 5: Kết quả thực nghiệm
├── Chuong_6_Ket_luan_Huong_phat_trien.md ← Chương 6: Kết luận
│
├── Luudo_Giaithuat.md                 ← Lưu đồ: Pipeline ảnh, Levenshtein, RBAC, Fallback
├── Luudo_Xiaozhi_MCP.md               ← Lưu đồ: Module Xiaozhi Dictation Robot (MCP)
│
├── Tiền xử lý/                        ← Module Tiền xử lý ảnh (Đặc tả & Lưu đồ)
│   ├── Dac_Ta_Ky_Thuat_Tien_Xu_Ly_Anh.md          ← Đặc tả kỹ thuật: Pipeline 9 bước (Toán học & Code)
│   ├── Dac_Ta_Ky_Thuat_AI_MobileNetV3_Attention_UNet.md ← Đặc tả mô hình AI: MobileNetV3 + Attention U-Net
│   ├── Hinh_3_2_Tien_xu_ly_anh.png                ← Sơ đồ luồng xử lý ảnh
│   └── SoDo_Module2_XuLyAnh_Pipeline.png          ← Sơ đồ chi tiết Module 2
│
├── Lưu đồ giải thuật/                 ← Ảnh PNG các lưu đồ đã render
│   ├── H3.3_Giai_thuat_SequenceMatcher.png
│   ├── H3.4_Rulebase_Phan_loai_Loi.png
│   ├── H3.5_Rulebase_Tinh_diem_Xep_loai.png
│   ├── Hinh_3_1_Hybrid_AI_Pipeline.png
│   ├── Hinh_3_2_Tien_xu_ly_anh.png
│   ├── Hinh_3_3_Cham_diem_Levenshtein.png
│   ├── Hinh_3_4_Phan_quyen_RBAC.png
│   ├── Hinh_3_5_Levenshtein_Algorithm.png
│   ├── Hinh_3_6_Fallback.png
│   ├── Hinh_4_1_Tech_Stack.png
│   ├── Hinh_4_2_Quy_trinh_Phat_trien.png
│   ├── Hinh_4_3_Mo_hinh_Mang.png
│   ├── Hinh_4_4_Database_Schema.png
│   ├── Hinh_4_5_API_Endpoints.png
│   └── grading_flowchart.png
│
└── Tai_lieu_Bao_cao/                  ← Tài liệu kỹ thuật bổ sung
    ├── ViHandGrade_TechSpec.md        ← Đặc tả kỹ thuật toàn hệ thống
    ├── ViHandGrade_Xiaozhi_DictationRobot_Spec.md ← Đặc tả Xiaozhi Robot
    └── 8 - Báo cáo tổng kết - Thiết bị chấm điểm.docx
```

---

## 📖 Tóm tắt từng chương

### Chương 1 — Giới thiệu đề tài
**File:** `Chuong_1_Gioi_thieu.md`

Trình bày bối cảnh thực tiễn: giáo viên tiểu học mất 3–5 phút chấm một bài chính tả viết tay. Phân tích cơ hội từ AI (Gemini OCR, ViT5, Xiaozhi ESP32-S3). Định nghĩa mục tiêu, phạm vi, phương pháp và cấu trúc báo cáo.

**Nội dung chính:**
- Thực trạng và vấn đề cần giải quyết
- Mục tiêu tổng quát và cụ thể (kèm chỉ số đo lường)
- Phạm vi chức năng và phần cứng
- Phương pháp nghiên cứu lý thuyết và thực nghiệm

---

### Chương 2 — Cơ sở lý thuyết
**File:** `Chuong_2_Co_so_ly_thuyet.md`

Tổng hợp nền tảng lý thuyết cho hệ thống: xử lý ảnh số, mô hình NLP tiếng Việt, thuật toán so khớp chuỗi, và kiến trúc hệ thống nhúng AI.

**Nội dung chính:**
- Tổng quan về OCR và thách thức với chữ viết tay tiếng Việt
- Mô hình ViT5 (VietAI) và cơ chế Seq2Seq
- Thuật toán Levenshtein Distance và SequenceMatcher
- Kiến trúc Hybrid AI (Edge + Cloud)
- Thiết bị nhúng Xiaozhi ESP32-S3 và giao thức MCP

---

### Chương 3 — Thiết kế hệ thống
**File:** `Chuong_3_Thiet_ke_He_thong.md`

Thiết kế chi tiết kiến trúc tổng thể và các module xử lý cốt lõi.

**Nội dung chính:**
- Kiến trúc Client-Server với Hybrid AI Pipeline
- Chi tiết 9 bước tiền xử lý ảnh (EXIF → Deskew → Resize → White Balance → Grayscale → Shadow Removal → CLAHE → Unsharp Mask → Adaptive Threshold)
- Quy trình chấm điểm: OCR Gemini → ViT5 → Levenshtein → Rule-based Scoring
- Phân quyền RBAC cho Admin / Giáo viên / Học sinh

**Lưu đồ tương ứng:**
- Hình 3.1: Hybrid AI Pipeline tổng thể
- Hình 3.2: Chi tiết 9 bước tiền xử lý ảnh
- Hình 3.3: Giải thuật chấm điểm và phân loại lỗi
- Hình 3.4: Phân quyền RBAC
- Hình 3.5: Giải thuật Levenshtein Distance
- Hình 3.6: Cơ chế Fallback sang Gemini

---

### Chương 4 — Xây dựng ứng dụng
**File:** `Chuong_4_Xay_dung_Ung_dung.md`

Mô tả quá trình hiện thực hóa từ thiết kế thành ứng dụng vận hành thực tế.

**Nội dung chính:**
- Mục tiêu và chỉ số đo lường (KPI) của hệ thống
- Lợi ích và hạn chế của hệ thống
- Công nghệ: Next.js 16 + React 19 + TypeScript + Tailwind CSS + shadcn/ui + SQLite + Prisma + FastAPI + PyTorch
- Database schema (5 bảng: User, Class, Grade, DictationSession, DictationLog)
- API Endpoints (OCR, Preprocess, Grade, CRUD)
- Triển khai trên Raspberry Pi 4 + Cloudflare Tunnel
- Cơ chế xoay vòng Gemini API Key (Key Rotation)

---

### Chương 5 — Kết quả thực nghiệm
**File:** `Chuong_5_Ket_qua_Thuc_nghiem.md`

Đánh giá định lượng hệ thống qua các bộ thử nghiệm thực tế.

**Nội dung chính:**
- Kết quả OCR theo chất lượng ảnh (điều kiện lý tưởng / bình thường / kém)
- Độ chính xác phân loại lỗi chính tả theo loại (phụ âm đầu, vần, dấu thanh, viết hoa)
- Thời gian xử lý trung bình theo từng bước pipeline
- So sánh điểm AI vs. chấm tay giáo viên (MAE, RMSE)
- Hiệu năng hệ thống trên Raspberry Pi 4 (CPU, RAM, nhiệt độ)
- Đánh giá trải nghiệm người dùng (giáo viên)

---

### Chương 6 — Kết luận và hướng phát triển
**File:** `Chuong_6_Ket_luan_Huong_phat_trien.md`

Tổng kết kết quả, đánh giá mức độ đạt mục tiêu, và đề xuất các hướng phát triển tiếp theo.

**Nội dung chính:**
- Kết quả đạt được so với mục tiêu ban đầu
- Hạn chế hiện tại và giải pháp đề xuất
- Hướng phát triển: mô hình ViT5 phiên bản lớn hơn, hỗ trợ đa môn học, tích hợp hệ thống trường học cấp quận

---

## 📊 Lưu đồ giải thuật

### Nhóm A — Module Chấm điểm (Image → OCR → AI Grading)
> File nguồn: `Luudo_Giaithuat.md`

| Hình | Tên lưu đồ | Mô tả |
|------|-----------|-------|
| 3.1 | Hybrid AI Pipeline tổng thể | Từ chụp ảnh → tiền xử lý → OCR → ViT5 → chấm điểm → lưu DB |
| 3.2 | Tiền xử lý ảnh số (9 bước) | Chi tiết EXIF, Deskew, Resize, White Balance, Grayscale, Shadow, CLAHE, Sharpen, Adaptive Threshold |
| 3.3 | Giải thuật chấm điểm & phân loại lỗi | ViT5 → SequenceMatcher → 5 loại lỗi → tính điểm → feedback |
| 3.4 | Phân quyền RBAC | Đăng nhập → xác định role → điều hướng Admin/Teacher/Student |
| 3.5 | Levenshtein Distance (Quy hoạch động) | Khởi tạo bảng D → vòng lặp → backtrace |
| 3.6 | Cơ chế Fallback | ViT5 timeout → gọi Gemini text-only fallback |

### Nhóm B — Module Xiaozhi Dictation Robot (MCP)
> File nguồn: `Luudo_Xiaozhi_MCP.md`

| Hình | Tên lưu đồ | Mô tả |
|------|-----------|-------|
| X.1 | Kiến trúc tổng thể Xiaozhi Module | ESP32 → xiaozhi.me Cloud → MCP Server → Next.js API → SQLite |
| X.2 | Quy trình 3 bước Alexa (chi tiết) | Bước 1: Thu thập thông tin → Bước 2: Soạn & Đọc → Bước 3: Nhắc lưu |
| X.3 | MCP JSON-RPC Handshake (Sequence Diagram) | initialize → tools/list → tools/call → save → TTS phản hồi |
| X.4 | Database Schema Module Xiaozhi | ER Diagram: DictationSession ↔ DictationLog ↔ Grade |
| X.5 | Dashboard lọc & tìm kiếm | Bộ lọc lớp + thời gian + tìm kiếm tại /teacher/dictation |
| X.6 | Toàn hệ thống tích hợp | Sơ đồ tổng hợp 5 module: Xiaozhi + Ảnh + OCR + AI + Web |

---

## 🔗 Liên kết tham khảo nhanh

### Các file code chính tương ứng với từng module

| Module | File code chính |
|--------|----------------|
| Tiền xử lý ảnh | `lib/image-processor.ts` |
| OCR API | `app/api/ocr/route.ts` |
| Chấm điểm API | `app/api/grade/route.ts` |
| Python AI Service | `python_service/` |
| MCP Server Xiaozhi | `mcp_service/main.py` |
| Dictation API | `app/api/dictation/sessions/route.ts` |
| Teacher Dashboard | `app/teacher/dictation/page.tsx` |
| Database Schema | `prisma/schema.prisma` |
| Role Prompt Alexa | `knowledge_base/00_role_xiaozhi.md` |
| Knowledge Base Alexa | `knowledge_base/vihand_grade_knowledge_base.md` |

---

## 📌 Ghi chú render Mermaid

Các lưu đồ trong file `.md` sử dụng cú pháp **Mermaid**. Để xem đồ họa:

1. **GitHub:** Tự động render khi push lên repository.
2. **VS Code:** Cài extension `Markdown Preview Mermaid Support`.
3. **Online:** Copy nội dung vào [mermaid.live](https://mermaid.live).
4. **Export PNG:** Dùng [mermaid.live](https://mermaid.live) → nút Download SVG/PNG.
