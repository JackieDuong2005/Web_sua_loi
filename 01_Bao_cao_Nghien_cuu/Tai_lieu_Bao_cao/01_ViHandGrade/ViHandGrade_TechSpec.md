# 📝 ViHand Grade — Đặc Tả Kỹ Thuật Chi Tiết

> **Hệ thống Chấm điểm Chính tả Tiếng Việt Thông minh tích hợp Trợ lý AI Xiaozhi**
> Phiên bản: `v2.0.0` | Cập nhật mới nhất: 2026-08-22

---

## 1. Tổng quan dự án

### 1.1 Mô tả
**ViHand Grade** là một nền tảng Web-app chuyên biệt hỗ trợ giáo viên tiểu học chấm điểm và đánh giá tự động bài chính tả viết tay của học sinh, đồng thời tích hợp **Trợ lý AI Xiaozhi** để tổ chức buổi đọc chính tả tương tác ngay tại lớp.

Hệ thống hoạt động dựa trên mô hình **Hybrid AI Architecture** với ba tầng dịch vụ chính:
1. **Trích xuất văn bản (OCR)**: Sử dụng mô hình thị giác lớn (VLM) thông qua **Google Gemini API** để nhận diện chữ viết tay tiếng Việt từ ảnh chụp điện thoại (OCR thuần túy, giữ nguyên lỗi viết sai của học sinh).
2. **Sửa lỗi & Chấm điểm (NLP)**: Sử dụng mô hình ngôn ngữ tiếng Việt **ViT5** chạy cục bộ kết hợp thuật toán so khớp chuỗi **Levenshtein** cấp độ từ (word-level) để tự động phát hiện lỗi chính tả, xếp loại, tính toán điểm số theo barem, và tạo lời nhận xét mang tính sư phạm.
3. **Trợ lý đọc chính tả (Xiaozhi AI)**: Trợ lý AI giọng nói thông qua giao thức **MCP (Model Context Protocol)** kết nối với nền tảng `xiaozhi.me`, cho phép AI tên "Alexa" soạn và đọc bài chính tả tương tác, sau đó tự động lưu phiên vào cơ sở dữ liệu.

### 1.2 Mục tiêu kỹ thuật
*   **Thời gian xử lý**: Toàn bộ pipeline xử lý ảnh, OCR và chấm điểm hoàn thành trong `< 30 giây` cho một trang viết bình thường.
*   **Độ chính xác nhận diện (OCR)**: Đạt tỷ lệ đúng ký tự tiếng Việt có dấu `≥ 90%` trong điều kiện ảnh chụp thực tế.
*   **Khả năng tương thích ảnh đầu vào**: Hỗ trợ định dạng JPG, PNG, WebP với dung lượng tối đa `10MB`.
*   **Tiền xử lý thông minh**: Loại bỏ bóng đổ, tự động chỉnh góc nghiêng (deskew), tăng độ sắc nét chữ viết trên nền giấy ô ly tiểu học, và xử lý được ảnh chụp thiếu sáng hoặc lệch sáng.
*   **Tối ưu phần cứng**: Hệ thống chạy mượt mà ngay cả trên thiết bị cấu hình thấp hoặc máy chủ biên (như Raspberry Pi 4/5) thông qua Dynamic INT8 Quantization và ONNX export.
*   **PWA (Progressive Web App)**: Ứng dụng hỗ trợ cài đặt như app native trên thiết bị di động, với Service Worker và Web App Manifest.

### 1.3 Đối tượng sử dụng & Quyền hạn
*   **Giáo viên (Teacher)**: Quyền chủ đạo. Thực hiện chụp/upload ảnh bài viết, cấu hình barem chấm, xem kết quả sửa lỗi của AI, chỉnh sửa điểm số thủ công, lưu kết quả chấm vào cơ sở dữ liệu, quản lý danh sách lớp học và học sinh, xem lịch sử phiên đọc chính tả Xiaozhi, xem báo cáo thống kê lớp học.
*   **Học sinh (Student)**: Tra cứu lịch sử điểm số, xem các lỗi sai đã mắc phải, đọc lời nhận xét của giáo viên để cải thiện kỹ năng.
*   **Quản trị viên (Admin)**: Quản lý danh sách tài khoản (Giáo viên, Học sinh), kích hoạt/khóa tài khoản, cấu hình tham số hệ thống.

---

## 2. Kiến trúc hệ thống

### 2.1 Sơ đồ tổng thể hệ thống
```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Next.js App Router (Port 3000)                    │
│  ┌───────────────────────┐          ┌────────────────────────────────────┐  │
│  │  Frontend React 19    │          │            API Routes              │  │
│  │  Shadcn/ui + Tailwind │◀────────▶│  /api/auth/login                   │  │
│  │  PWA (manifest.ts +  │          │  /api/preprocess  → Jimp Processor │  │
│  │   Service Worker)    │          │  /api/ocr         → Gemini SDK     │  │
│  └───────────────────────┘          │  /api/grade       → ViT5 Service   │  │
│                                     │  /api/grades, users, classes       │  │
│                                     │  /api/dictation/sessions → DB      │  │
│                                     └─────────────────┬──────────────────┘  │
│                                             ┌─────────▼─────────┐           │
│                                             │    Prisma ORM     │           │
│                                             │ SQLite (vihand.db)│           │
│                                             └───────────────────┘           │
└─────────────────────────────────────────────────────────────────────────────┘
        │ HTTP (Local)          │ HTTPS (External)      │ WebSocket (Cloud)
┌───────▼──────────┐   ┌────────▼──────────┐   ┌───────▼──────────────────┐
│  ViT5 Service    │   │  Google Gemini API │   │  Xiaozhi MCP Server     │
│ (Python/FastAPI) │   │  Key Rotation &   │   │  (Python/FastAPI         │
│  Port 8000       │   │  Fallback Mode    │   │   + WebSocket)           │
│ Dynamic INT8     │   └───────────────────┘   │   Port 8200              │
│ Quantization     │                           │   ↕ wss://xiaozhi.me    │
└──────────────────┘                           └──────────────────────────┘
                                                        │
                                               [Xiaozhi ESP32 Robot]
```

### 2.2 Quy trình xử lý Hybrid AI (Hybrid Pipeline)
Hệ thống xử lý bài chấm qua 4 giai đoạn tuần tự:
1.  **Giai đoạn 1: Preprocess (TypeScript/Jimp)** — Nhận ảnh base64, sửa EXIF, Deskew, CLAHE, Adaptive Thresholding.
2.  **Giai đoạn 2: Trích xuất OCR (Gemini API)** — Gửi ảnh đã xử lý đến Gemini Vision. Xoay vòng API Keys tự động (Rate Limit 429).
3.  **Giai đoạn 3: Chấm điểm và sửa lỗi (ViT5 Service & SequenceMatcher)** — ViT5 sửa lỗi chính tả, SequenceMatcher phân loại lỗi. Fallback sang Gemini nếu ViT5 không khả dụng.
4.  **Giai đoạn 4: Hiển thị & Lưu trữ** — Kết quả hiển thị UI, giáo viên điều chỉnh thủ công, lưu SQLite qua Prisma. Liên kết với phiên Xiaozhi qua `dictationSessionId`.

### 2.3 Luồng tích hợp Xiaozhi AI Dictation
```text
[Giáo viên nói lệnh] → [Xiaozhi ESP32 Robot] → [xiaozhi.me Cloud LLM]
                                                         ↕ JSON-RPC / WebSocket
                                               [MCP Server (Port 8200)]
                                                         ↓ REST HTTP
                                               [Next.js /api/dictation/sessions]
                                                         ↓ Prisma ORM
                                               [SQLite: DictationSession + DictationLog]
```

**Quy trình 3 bước sư phạm của Alexa:**
1. **Thu thập thông tin**: Hỏi về chủ đề, số câu, khối lớp, tốc độ đọc.
2. **Soạn & Đọc bài**: Soạn bài phù hợp và đọc theo yêu cầu.
3. **Lưu trữ**: Hỏi xác nhận trước khi lưu vào hệ thống.

---

## 3. Cấu trúc thư mục dự án

```text
Web_sua_loi/
├── app/                              # Next.js App Router (Frontend + API Routes)
│   ├── admin/page.tsx                # Giao diện Quản trị viên (User/Class management)
│   ├── admin-register/               # Trang đăng ký nhanh tài khoản Admin
│   ├── register/                     # Trang đăng ký cho Giáo viên/Học sinh
│   ├── student/page.tsx              # Giao diện Học sinh tra cứu bài chấm
│   ├── teacher/
│   │   ├── page.tsx                  # Bảng điều khiển, danh sách lớp học & học sinh
│   │   ├── layout.tsx                # Layout với Sidebar navigation
│   │   ├── grade/page.tsx            # Module chấm điểm (Upload ảnh, sửa lỗi, kết quả)
│   │   ├── dictation/page.tsx        # Module quản lý phiên đọc chính tả Xiaozhi
│   │   └── reports/page.tsx          # Module báo cáo thống kê lớp học (Recharts)
│   ├── api/
│   │   ├── auth/login/route.ts       # Xác thực người dùng, trả về Role
│   │   ├── classes/route.ts          # CRUD lớp học
│   │   ├── grade/route.ts            # Chấm điểm (ViT5 + Fallback Gemini)
│   │   ├── grades/route.ts           # CRUD kết quả chấm điểm
│   │   ├── ocr/route.ts              # Gemini Vision OCR + Key Rotation
│   │   ├── preprocess/route.ts       # Image Processing Pipeline (Jimp)
│   │   ├── users/route.ts            # CRUD người dùng
│   │   ├── vit5-warmup/route.ts      # Khởi động sớm model ViT5
│   │   └── dictation/sessions/
│   │       ├── route.ts              # GET danh sách & POST tạo phiên đọc
│   │       └── [id]/route.ts         # GET chi tiết & DELETE cascade một phiên
│   ├── manifest.ts                   # Web App Manifest (PWA)
│   ├── sw.js/                        # Service Worker (PWA offline)
│   ├── icon/                         # PWA icons (192px, 512px)
│   ├── globals.css                   # CSS global & Tailwind variables
│   ├── layout.tsx                    # Root layout
│   └── page.tsx                      # Trang chủ / Đăng nhập
│
├── components/
│   ├── app-sidebar.tsx               # Sidebar navigation chính
│   ├── help-guide.tsx                # Hướng dẫn sử dụng hệ thống
│   ├── theme-provider.tsx            # Dark/Light mode provider
│   └── ui/                           # Shadcn/ui components (Button, Card, Dialog...)
│
├── lib/
│   ├── image-processor.ts            # Image Pipeline (EXIF, Deskew, CLAHE, Threshold)
│   ├── prisma.ts                     # Prisma Client Singleton
│   ├── types.ts                      # TypeScript types & interfaces toàn hệ thống
│   ├── utils.ts                      # Hàm tiện ích (cn - class merge)
│   └── mock-data.ts                  # Dữ liệu giả lập cho fallback/test
│
├── prisma/
│   ├── schema.prisma                 # Database Schema (5 models)
│   ├── migrations/                   # Lịch sử migration database
│   ├── seed.ts                       # Dữ liệu mẫu khởi tạo
│   ├── seed-admin.js                 # Script tạo nhanh Admin
│   ├── seed-test-users.js            # Script tạo data test
│   └── vihand.db                     # SQLite database file (~16MB)
│
├── python_service/                   # ViT5 Inference Microservice (Port 8000)
│   ├── main.py                       # FastAPI: ViT5, INT8 Quantization, Levenshtein
│   ├── convert_to_onnx.py            # Script convert PyTorch → ONNX → INT8
│   ├── start_service.ps1             # PowerShell startup script
│   └── requirements.txt              # Python deps: transformers, torch, fastapi
│
├── mcp_service/                      # Xiaozhi AI MCP Bridge Server (Port 8200)
│   ├── main.py                       # FastAPI + WebSocket client → xiaozhi.me
│   ├── .env                          # MCP_ENDPOINT & VIHAND_API_URL
│   ├── .env.example                  # Template cấu hình
│   ├── .env.rpi                      # Cấu hình riêng cho Raspberry Pi
│   ├── requirements.txt              # fastapi, uvicorn, httpx, websockets
│   ├── install_service.sh            # Cài đặt như systemd service (Linux)
│   └── setup_rpi.sh                  # Setup đầy đủ trên Raspberry Pi
│
├── xiaozhi-esp32-main/               # Firmware nguồn mở Xiaozhi ESP32 (ESP-IDF)
├── He_thong_iots_Do_an_nhung/        # Tài liệu hệ thống IoT nhúng
├── Font Tieu hoc/                    # Bộ font chữ tiểu học
├── knowledge_base/                   # Cơ sở tri thức nội bộ
├── anhdaduocOCR/                     # Ảnh mẫu test OCR pipeline
├── 01_Bao_cao_Nghien_cuu/            # Tài liệu báo cáo nghiên cứu
├── 02_Kich_ban_Thuc_nghiem/          # Kịch bản thực nghiệm
├── 03_Scripts_Trien_khai/            # Scripts triển khai
├── .env                              # DATABASE_URL, VIT5_SERVICE_URL
├── .env.local                        # GEMINI_API_KEYS (bảo mật)
├── Dockerfile                        # Docker image definition
├── .dockerignore                     # Docker build excludes
├── start_all.bat                     # Khởi động 3 dịch vụ đồng thời (Windows)
├── package.json                      # JS/TS dependencies & scripts
└── tsconfig.json                     # TypeScript compiler config
```

---

## 4. Tech Stack & Dependencies

### 4.1 Frontend & Backend Framework
*   **Next.js (v16.2.4)**: App Router, API Routes, Server Actions, PWA support qua `manifest.ts` và Service Worker.
*   **React (v19.x)**: UI library.
*   **TypeScript (v5.7.3)**: Strict type checking.
*   **Tailwind CSS (v4.2.0)**: CSS framework, Responsive, Dark Mode.
*   **Shadcn/ui**: Component library trên nền Radix Primitives.
*   **Recharts (v2.15.0)**: Biểu đồ thống kê lớp học.
*   **next-themes (v0.4.6)**: Dark/Light mode.

### 4.2 Database & ORM
*   **Prisma ORM (v5.22.0)**: Entity mapping, auto-generated queries, migration qua `prisma/migrations/`.
*   **SQLite (better-sqlite3 v12.9.0)**: File-based DB gọn nhẹ, phù hợp embedded. DB hiện tại ~16MB.
*   **@prisma/adapter-better-sqlite3 & @prisma/adapter-libsql**: Adapter cho cả SQLite cục bộ và LibSQL cloud.

### 4.3 AI & Image Processing
*   **Jimp (v1.6.1)**: Image processing 100% JavaScript, không cần native bindings.
*   **@google/genai (v2.7.0)**: Google Gemini SDK thế hệ mới (nâng cấp từ v0.1.1).
*   **@google/generative-ai (v0.24.1)**: SDK bổ sung tương thích ngược Gemini Legacy.
*   **PyTorch & Transformers**: ViT5 inference với Dynamic INT8 Quantization.
*   **FastAPI**: Web framework cho cả ViT5 Service và MCP Server.
*   **Optimum + ONNX Runtime (Tùy chọn)**: Export ViT5 sang ONNX để tăng tốc CPU thêm ~30-50%.

### 4.4 MCP & Xiaozhi Integration
*   **websockets (≥12.0)**: WebSocket client kết nối `wss://api.xiaozhi.me/mcp/`.
*   **httpx (≥0.27.0)**: Async HTTP client gọi REST Next.js từ MCP Server.
*   **JSON-RPC 2.0**: Giao thức giữa xiaozhi.me Cloud LLM và MCP Server.

### 4.5 Utility Libraries
*   **date-fns (v4.1.0)**: Định dạng ngày tháng.
*   **lucide-react (v0.564.0)**: Icon set.
*   **sonner (v1.7.1)**: Toast notifications.
*   **zod (v3.24.1)**: Schema validation.
*   **react-hook-form**: Form management.
*   **@vercel/analytics**: Analytics tracking.

---

## 5. Database Schema (Prisma + SQLite)

Database bao gồm **5 model** định nghĩa trong `prisma/schema.prisma`:

```prisma
// 1. Tài khoản người dùng
model User {
  id        String   @id @default(cuid())
  name      String
  username  String   @unique
  password  String   @default("123456")
  role      String   @default("student") // "teacher" | "student" | "admin"
  className String   @default("")
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
}

// 2. Thông tin lớp học
model Class {
  id        String   @id @default(cuid())
  name      String   @unique              // VD: "3A1", "4B2"
  grade     Int      @default(3)          // Khối lớp: 1-5
  teacherId String   @default("")
  createdAt DateTime @default(now())
}

// 3. Kết quả chấm bài học sinh
model Grade {
  id                   String   @id @default(cuid())
  studentName          String
  assignmentTitle      String
  className            String   @default("")
  originalText         String                 // Văn bản gốc OCR (có lỗi)
  fixedText            String                 // Văn bản đã sửa
  corrections          String                 // JSON danh sách lỗi chi tiết
  score                String                 // VD: "8.5/10"
  scoreNum             Float                  // Để lọc và vẽ biểu đồ
  scoreBreakdown       String   @default("") // JSON điểm thành phần
  feedback             String
  overallRating        String                 // "Xuất sắc"|"Tốt"|"Khá"|"Trung bình"|"Cần cố gắng"
  processingTimeMs     Int      @default(0)
  tokenCount           Int      @default(0)
  imageBase64          String   @default("") // Ảnh gốc để xem lại
  dictationSessionId   String   @default("") // Liên kết Xiaozhi session (tùy chọn)
  createdAt            DateTime @default(now())
}

// 4. Phiên đọc chính tả Xiaozhi
model DictationSession {
  id          String   @id @default(cuid())
  title       String                         // VD: "Nghe viết: Ai có lỗi"
  passage     String                         // Đoạn văn Xiaozhi đã đọc
  className   String   @default("")
  teacherName String   @default("")
  status      String   @default("completed") // "completed" | "in_progress"
  summary     String   @default("")          // Tóm tắt (Alexa tự tạo)
  createdAt   DateTime @default(now())
  logs        DictationLog[]
}

// 5. Nhật ký hội thoại từng lượt trong phiên
model DictationLog {
  id        String   @id @default(cuid())
  sessionId String
  session   DictationSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  speaker   String           // "xiaozhi" | "teacher" | "student" | "alexa"
  content   String
  createdAt DateTime @default(now())
}
```

---

## 6. Danh sách API Endpoints

### 6.1 Xác thực & Quản trị tài khoản
*   `POST /api/auth/login` — Đăng nhập, trả về User + Role.
*   `GET/POST /api/users` — CRUD tài khoản (Admin only).
*   `GET/POST /api/classes` — Quản lý lớp học.

### 6.2 Pipeline tiền xử lý ảnh và OCR
*   `POST /api/preprocess`
    *   **Body**: `{"imageBase64": "..."}`
    *   **Response**: `{"processedBase64": "...", "quality": {"is_good": true, "warnings": [], "blur_score": 120.4}}`
*   `POST /api/ocr`
    *   **Body**: `{"imageBase64": "...", "mimeType": "image/jpeg"}`
    *   **Response**: `{"text": "...", "gemini_fixed_text": "...", "tokenCount": 1052, "processingTimeMs": 2410}`

### 6.3 Chấm điểm & Sửa lỗi chính tả
*   `POST /api/grade`
    *   **Body**:
        ```json
        {
          "studentText": "văn bản thô...",
          "penalty_per_error": 0.5,
          "hinh_thuc": 2.5,
          "noi_dung": 1.5
        }
        ```
    *   **Response**:
        ```json
        {
          "original_text": "...", "fixed_text": "...",
          "corrections": [{"error": "...", "suggestion": "...", "error_type": "phu_am_dau|van|dau_thanh|viet_hoa|bo_sot_them|dau_cau", "is_dialect": false, "reason": "..."}],
          "score_breakdown": {"chinh_ta": {"raw": 3.0, "max": 4.0, "error_count": 2, "deduction": 1.0}, "hinh_thuc": {"raw": 2.5, "max": 3.0}, "noi_dung": {"raw": 1.5, "max": 2.0}, "sang_tao": {"raw": 1.0, "max": 1.0}},
          "score": "8.0/10", "overall_rating": "Tốt", "feedback": "...", "engine": "vit5+levenshtein"
        }
        ```

### 6.4 Lưu trữ kết quả chấm bài
*   `GET/POST /api/grades` — Lưu/truy vấn lịch sử chấm điểm.

### 6.5 Quản lý phiên đọc chính tả Xiaozhi
*   `GET /api/dictation/sessions` — Danh sách phiên (filter: `className`, `limit`).
*   `POST /api/dictation/sessions` — Tạo phiên mới (từ MCP Server). **Response 201**.
*   `GET /api/dictation/sessions/[id]` — Chi tiết phiên + toàn bộ logs.
*   `DELETE /api/dictation/sessions/[id]` — Xoá phiên + cascade xoá logs.

---

## 7. Logic nghiệp vụ chấm điểm & Thuật toán AI

### 7.1 Chuẩn hóa văn bản trước khi xử lý
1.  **Lọc Teencode**: Từ điển `TEENCODE_DICT` (`ko`→`không`, `dc`→`được`, `vs`→`với`...).
2.  **Chuẩn hóa dấu câu**: Loại khoảng trắng thừa, sửa lặp dấu câu (`câu hỏi ??`→`câu hỏi?`).

### 7.2 Mô hình ViT5 & Tối ưu hóa CPU
Mô hình: `chamdentimem/ViT5_Vietnamese_Correction`.

*   **Dynamic INT8 Quantization**: `torch.quantization.quantize_dynamic` → giảm RAM 2x, tăng tốc CPU.
*   **CPU Multi-threading**: `torch.set_num_threads(n_cores)` — tận dụng toàn bộ nhân vật lý.
*   **ThreadPool Async**: `ThreadPoolExecutor(max_workers=1)` — không block FastAPI event loop.
*   **ONNX Export (tùy chọn)**: `convert_to_onnx.py` — giảm ~50% kích thước, tăng ~30-50% tốc độ.

### 7.3 Giải thuật cắt đoạn văn xuôi (Prose Chunking)
*   Chunk tối đa **160 ký tự** (~240 tokens), chia theo dấu câu.
*   **KHÔNG dùng sliding window**: Tránh ViT5 lặp lại câu trước (vòng lặp vô hạn).
*   Window 256 tokens của tokenizer: 160 ký tự đảm bảo không bị cắt đứt.

### 7.4 Thuật toán lọc Hallucination
1.  **Repetition Loop**: Cụm 3-5 từ lặp `≥ 3 lần` → reject.
2.  **Độ dài đột biến**: Kết quả > `1.5x` hoặc < `0.5x` độ dài gốc → fallback về text gốc.

### 7.5 Phát hiện thể loại văn bản
*   Dòng trung bình `< 40 ký tự` → **Thơ ca** (sửa độc lập từng dòng).
*   Ngược lại → **Văn xuôi** (gộp đoạn, chia chunk, sửa lỗi).

### 7.6 Loại bỏ từ viết lặp (Adjacent Duplicates Removal)
Hàm `remove_adjacent_duplicates` xóa từ trùng cạnh nhau, nhưng bỏ qua danh sách `INTENTIONAL_REPEATS` (từ láy có nghĩa: "mãi mãi", "xa xa", "năm năm"...).

### 7.7 Thuật toán so khớp lỗi (Levenshtein Word-Level)
`difflib.SequenceMatcher` so sánh `student_words` vs `ai_words`:
*   **Replace**: Không dấu giống → `viet_hoa`; cùng phụ âm đầu/vần → `dau_thanh`; khác ký tự đầu (c/k/q, g/gh, d/gi/r, s/x, ch/tr, l/n) → `phu_am_dau`; còn lại → `van`.
*   **Delete**: Thiếu từ → `bo_sot_them`.
*   **Insert**: Thừa từ → `bo_sot_them`.

### 7.8 Barem chấm điểm (Thang 10)
| Thành phần | Tối đa | Cách tính |
| :--- | :---: | :--- |
| Chính tả & Ngữ pháp | 4.0đ | `4.0 - (error_count × penalty_per_error)`, sàn 0.0 |
| Hình thức | 3.0đ | Giáo viên nhập (mặc định 2.5đ) |
| Nội dung | 2.0đ | Giáo viên nhập (mặc định 1.5đ) |
| Sáng tạo | 1.0đ | Tự động: điệp ngữ + hình ảnh nghệ thuật = 1.0đ; một điều kiện = 0.5đ; còn lại = 0.0đ |

### 7.9 Xếp loại & Tạo nhận xét động
*   **Xếp loại**: Xuất sắc (≥9.0), Tốt (7.0-8.9), Khá (5.0-6.9), Trung bình (3.0-4.9), Cần cố gắng (<3.0).
*   **Feedback**: Template động theo số lỗi (0 lỗi / 1-2 lỗi / >2 lỗi).

---

## 8. Pipeline xử lý hình ảnh (TypeScript/Jimp — 9 bước)

File: `lib/image-processor.ts`

### 8.1 Sửa góc xoay EXIF và Deskew
1.  **EXIF Auto-rotate**: Đọc marker APP1 `0xFFE1`, phân tích Orientation Tag `0x0112`, xoay ảnh (90°/180°/270°) về chiều đúng.
2.  **Deskew**: Thu nhỏ về 400px → Otsu threshold → Xóa đường kẻ ô ly (hàng >35% pixel đen) → Projection Profile Variance quét θ từ -15° đến +15° → Tìm 2 pha (bước 1.0° rồi 0.1°) → Xoay ảnh.

### 8.2 Tăng cường chất lượng ảnh
3.  **Resize**: Giới hạn tối đa **1600px** chiều rộng.
4.  **White Balance**: Gray World Assumption — cân bằng kênh R/G/B.
5.  **Grayscale**: $Y = 0.299R + 0.587G + 0.114B$
6.  **Shadow Removal**: Box Blur kernel 51px dùng Integral Image $O(1)$ → chia ảnh gốc/ảnh nền.
7.  **CLAHE**: Lưới 8×8, Clip Limit 2.0, bilinear interpolation tại biên.
8.  **Sharpen**: Unsharp Mask — $\text{Output} = \text{Original} + k \times (\text{Original} - \text{BoxBlur}_{3\times3})$
9.  **Adaptive Thresholding**: Gaussian adaptive, Integral Image nhanh, C=20.

### 8.3 Chỉ số chất lượng ảnh (Quality Assessment)
| Chỉ số | Ngưỡng cảnh báo |
| :--- | :--- |
| Blur Score (Laplacian Variance) | `< 80` → cảnh báo mờ |
| Brightness (giá trị xám trung bình) | `< 50` (tối) hoặc `> 220` (cháy sáng) |
| Tỷ lệ pixel đen `< 100` | `< 0.02` → nét chữ quá nhạt |
| Tỷ lệ diện tích chữ | `< 0.005` → ảnh quá xa/không có chữ |

---

## 9. Module Xiaozhi AI Dictation

### 9.1 Kiến trúc MCP Server
`mcp_service/main.py` hoạt động như **WebSocket client** kết nối vào `wss://api.xiaozhi.me/mcp/?token=...`, nhận JSON-RPC từ xiaozhi.me Cloud, xử lý tool calls, gọi REST API Next.js.

| Thành phần | Công nghệ | Cổng |
| :--- | :--- | :---: |
| MCP Server | Python FastAPI + websockets | 8200 |
| Xiaozhi Cloud | WebSocket JSON-RPC | wss |
| ViHand API | Next.js REST | 3000 |
| Xiaozhi Robot | ESP32 firmware | WiFi |

### 9.2 MCP Tools
| Tool | Mô tả | Kích hoạt khi |
| :--- | :--- | :--- |
| `vihand.save_dictation_session` | Lưu phiên đọc chính tả vào DB | Giáo viên xác nhận ("Có", "Lưu lại", "Ok") |
| `vihand.get_dictation_sessions` | Xem lịch sử phiên đã lưu | Giáo viên hỏi lịch sử |

### 9.3 Vai trò AI "Alexa"
*   **Danh tính**: Alexa — trợ giảng AI, xưng "em", gọi GV là "thầy/cô".
*   **Nguyên tắc**: Hỏi thông tin trước khi đọc; hỏi xác nhận trước khi lưu; không xóa dữ liệu đã lưu.
*   **Reconnect**: Exponential backoff (5s → tối đa 60s) khi WebSocket ngắt kết nối.

### 9.4 Giao diện Dictation Dashboard (`teacher/dictation`)
*   Danh sách phiên với filter: lớp học, khoảng thời gian (hôm nay/tuần/tháng), tìm kiếm tiêu đề.
*   Xem chi tiết nhật ký hội thoại theo phiên.
*   Xoá phiên (cascade xoá logs).

---

## 10. Cấu hình hệ thống & Khởi chạy

### 10.1 Biến môi trường

**`.env`** (thư mục gốc):
```bash
DATABASE_URL="file:./prisma/vihand.db"
VIT5_SERVICE_URL="http://localhost:8000"
```

**`.env.local`** (thư mục gốc):
```bash
GEMINI_API_KEYS="AIzaSyA1...key1,AIzaSyB2...key2,AIzaSyC3...key3"
```

**`mcp_service/.env`**:
```bash
MCP_ENDPOINT=wss://api.xiaozhi.me/mcp/?token=<JWT_TOKEN>
VIHAND_API_URL=http://localhost:3000
```

### 10.2 Khởi chạy trên Windows (3 dịch vụ)
```powershell
.\start_all.bat
```
| Dịch vụ | Cổng | Ghi chú |
| :--- | :---: | :--- |
| Next.js Web App | 3000 | `npm run dev` |
| ViT5 Python Service | 8000 | FastAPI + PyTorch |
| Xiaozhi MCP Server | 8200 | FastAPI + WebSocket, chạy /HIGH priority |

> **⚠️ Quan trọng**: Không click vào cửa sổ "Xiaozhi MCP Server" — Windows Quick Edit Mode có thể đóng băng asyncio Python. `start_all.bat` đã tự tắt Quick Edit Mode qua registry.

### 10.3 Khởi chạy thủ công
```bash
# ViT5 Service
cd python_service && uvicorn main:app --host 0.0.0.0 --port 8000

# MCP Server
cd mcp_service && pip install -r requirements.txt && python -u main.py

# Next.js
npm run dev
```

### 10.4 Triển khai trên Raspberry Pi & Docker
*   `mcp_service/setup_rpi.sh` — Cài đặt đầy đủ môi trường trên RPi.
*   `mcp_service/install_service.sh` — Cài MCP Server như `systemd` service (auto-start).
*   `mcp_service/.env.rpi` — Config đặc thù cho RPi.
*   `Dockerfile` — Docker container cho toàn bộ hệ thống.

---

## 11. Quản lý rủi ro và giải pháp dự phòng

| Tình huống rủi ro | Xác suất | Tác động | Giải pháp |
| :--- | :---: | :---: | :--- |
| **ViT5 Service chưa khởi động hoặc sập** | Trung bình | Cao | Retry sau 10s. Nếu vẫn lỗi → **Fallback Gemini API** sửa lỗi chính tả. |
| **Gemini API Rate Limit 429** | Cao | Cao | **Key Rotation**: Shuffle danh sách keys, tự động thử key tiếp theo khi gặp 429/RESOURCE_EXHAUSTED. |
| **Ảnh chụp chất lượng kém** | Trung bình | Trung bình | Image Pipeline lọc tối đa. Quality Assessment gửi cảnh báo chi tiết lên UI để GV chụp lại. |
| **Bài viết dài gây timeout Next.js (30s)** | Thấp | Trung bình | `export const maxDuration = 300` trên API Route → tăng timeout lên 5 phút. |
| **Xiaozhi MCP bị ngắt WebSocket** | Trung bình | Thấp | **Exponential backoff reconnect**: 5s → tối đa 60s. Ngắt mỗi ~60s là bình thường (xiaozhi.me reset). |
| **Windows Quick Edit Mode đóng băng Python asyncio** | Cao (Windows) | Cao | `start_all.bat` tự tắt qua registry. Hướng dẫn reboot máy để áp dụng hoàn toàn. |

---

*Tài liệu Đặc tả Kỹ thuật của dự án ViHand Grade đã được cập nhật hoàn chỉnh lên phiên bản **v2.0.0**, đồng bộ với toàn bộ mã nguồn thực tế của hệ thống tính đến ngày 2026-08-22.*