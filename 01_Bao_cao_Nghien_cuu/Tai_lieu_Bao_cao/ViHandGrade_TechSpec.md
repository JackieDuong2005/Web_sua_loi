# 📝 ViHand Grade — Đặc Tả Kỹ Thuật Chi Tiết

> **Hệ thống Chấm điểm Chính tả Tiếng Việt Thông minh**
> Phiên bản: `v1.2.0` | Cập nhật mới nhất: 2026-07-09

---

## 1. Tổng quan dự án

### 1.1 Mô tả
**ViHand Grade** là một nền tảng Web-app chuyên biệt hỗ trợ giáo viên tiểu học chấm điểm và đánh giá tự động bài chính tả viết tay của học sinh. 

Hệ thống hoạt động dựa trên mô hình **Hybrid AI Architecture**:
1. **Trích xuất văn bản (OCR)**: Sử dụng mô hình thị giác lớn (VLM) thông qua **Google Gemini API** (`gemini-3.1-flash-lite`) để nhận diện chữ viết tay tiếng Việt từ ảnh chụp điện thoại (OCR thuần túy, giữ nguyên lỗi viết sai của học sinh).
2. **Sửa lỗi & Chấm điểm (NLP)**: Sử dụng mô hình ngôn ngữ tiếng Việt **ViT5** chạy cục bộ kết hợp thuật toán so khớp chuỗi **Levenshtein** cấp độ từ (word-level) để tự động phát hiện lỗi chính tả, xếp loại, tính toán điểm số theo barem, và tạo lời nhận xét mang tính sư phạm.

### 1.2 Mục tiêu kỹ thuật
*   **Thời gian xử lý**: Toàn bộ pipeline xử lý ảnh, OCR và chấm điểm hoàn thành trong `< 30 giây` cho một trang viết bình thường.
*   **Độ chính xác nhận diện (OCR)**: Đạt tỷ lệ đúng ký tự tiếng Việt có dấu `≥ 90%` trong điều kiện ảnh chụp thực tế.
*   **Khả năng tương thích ảnh đầu vào**: Hỗ trợ định dạng JPG, PNG, WebP với dung lượng tối đa `10MB`.
*   **Tiền xử lý thông minh**: Loại bỏ bóng đổ, tự động chỉnh góc nghiêng (deskew), tăng độ sắc nét chữ viết trên nền giấy ô ly tiểu học, và xử lý được ảnh chụp thiếu sáng hoặc lệch sáng.
*   **Tối ưu phần cứng**: Hệ thống chạy mượt mà ngay cả trên thiết bị cấu hình thấp hoặc máy chủ biên (như Raspberry Pi 4/5) thông qua các kỹ thuật tối ưu hóa mô hình.

### 1.3 Đối tượng sử dụng & Quyền hạn
*   **Giáo viên (Teacher)**: Quyền chủ đạo. Thực hiện chụp/upload ảnh bài viết, cấu hình barem chấm, xem kết quả sửa lỗi của AI, chỉnh sửa điểm số thủ công, lưu kết quả chấm vào cơ sở dữ liệu, quản lý danh sách lớp học và học sinh.
*   **Học sinh (Student)**: Tra cứu lịch sử điểm số, xem các lỗi sai đã mắc phải, đọc lời nhận xét của giáo viên để cải thiện kỹ năng.
*   **Quản trị viên (Admin)**: Quản lý danh sách tài khoản (Giáo viên, Học sinh), kích hoạt/khóa tài khoản, cấu hình tham số hệ thống.

---

## 2. Kiến trúc hệ thống

### 2.1 Sơ đồ tổng thể hệ thống
```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Next.js App Router (Port 3000)                    │
│                                                                             │
│  ┌───────────────────────┐          ┌────────────────────────────────────┐  │
│  │       Frontend        │          │            API Routes              │  │
│  │       React 19        │          │  /api/auth/login                   │  │
│  │  Shadcn/ui & Tailwind │◀────────▶│  /api/preprocess  → Jimp Processor │  │
│  │  (Giao diện Responsive)│          │  /api/ocr         → Gemini SDK     │  │
│  │                       │          │  /api/grade       → ViT5 Service   │  │
│  └───────────────────────┘          │  /api/grades      → CRUD database  │  │
│                                     │  /api/users, /api/classes          │  │
│                                     └─────────────────┬──────────────────┘  │
│                                                       │                     │
│                                             ┌─────────▼─────────┐           │
│                                             │    Prisma ORM     │           │
│                                             │ SQLite (vihand.db)│           │
│                                             └───────────────────┘           │
└───────────────────────────────────────────────────────┬─────────────────────┘
                                                        │
                                    HTTP (Local)        │ HTTPS (External)
                                 ┌──────────────────────┼──────────────────────┐
                                 │                      │                      │
                       ┌─────────▼─────────┐  ┌─────────▼─────────┐            │
                       │   ViT5 Service    │  │ Google Gemini API │            │
                       │ (Python/FastAPI)  │  │ (Key Rotation &   │            │
                       │ (Port 8000)       │  │  Fallback Mode)   │            │
                       └───────────────────┘  └───────────────────┘            │
```

### 2.2 Quy trình xử lý Hybrid AI (Hybrid Pipeline)
Hệ thống xử lý bài chấm qua 4 giai đoạn tuần tự:
1.  **Giai đoạn 1: Preprocess (TypeScript/Jimp)**
    *   Nhận ảnh chụp base64 từ client.
    *   Tự động sửa góc xoay EXIF của ảnh chụp dọc/ngang.
    *   Dò tìm góc nghiêng văn bản bằng thuật toán Projection Profile và xoay thẳng ảnh (Deskew).
    *   Cân bằng trắng, chuyển đổi sang ảnh xám (grayscale), loại bỏ bóng đổ cục bộ.
    *   Áp dụng thuật toán CLAHE tăng cường độ tương phản cho nét mực nhạt và làm nét chữ.
    *   Nhị phân hóa thích ứng (Adaptive Thresholding) để thu được ảnh chữ đen nền trắng sạch nhất.
    *   Đánh giá các chỉ số chất lượng ảnh để đưa ra cảnh báo độ mờ hoặc ảnh thiếu sáng.
2.  **Giai đoạn 2: Trích xuất OCR (Gemini API)**
    *   Gửi ảnh đã tiền xử lý kèm prompt chuyên dụng đến Gemini API.
    *   Gemini nhận diện chữ viết tay tiếng Việt gốc (chưa sửa lỗi) để lưu trữ vào trường `original_text`.
    *   Xoay vòng API Keys tự động để tránh bị lỗi giới hạn lưu lượng (Rate Limit 429).
3.  **Giai đoạn 3: Chấm điểm và sửa lỗi (ViT5 Service & SequenceMatcher)**
    *   Next.js gửi văn bản gốc trích xuất từ Gemini tới Microservice ViT5 chạy bằng FastAPI.
    *   ViT5 tiến hành chuẩn hóa văn bản, sửa lỗi teencode và chạy suy luận để tạo văn bản đúng chính tả (`fixed_text`).
    *   Thuật toán `SequenceMatcher` ở cấp độ từ so sánh văn bản gốc và văn bản sửa để tìm ra vị trí các từ sai chính tả, phân loại loại lỗi (phụ âm đầu, vần, dấu thanh, viết hoa, thiếu/thừa từ).
    *   *Phương án dự phòng (Fallback)*: Nếu dịch vụ ViT5 không thể kết nối hoặc gặp lỗi xử lý, Next.js sẽ chuyển đổi quy trình chấm điểm sang dùng Gemini API để thực hiện sửa lỗi chính tả bằng Prompt chuyên dụng.
4.  **Giai đoạn 4: Hiển thị & Lưu trữ**
    *   Kết quả chấm điểm chi tiết (Điểm chính tả, Điểm hình thức, Điểm nội dung, Điểm sáng tạo, lời nhận xét và danh sách lỗi cụ thể) hiển thị trực quan lên UI.
    *   Giáo viên có quyền điều chỉnh điểm số thủ công trước khi bấm "Lưu bài chấm" vào SQLite thông qua Prisma.

---

## 3. Cấu trúc thư mục dự án

```text
Web_sua_loi/
├── app/                              # Next.js App Router (Frontend + API Routes)
│   ├── actions/                      # Các Server Actions dùng cho tương tác DB trực tiếp
│   ├── admin/                        # Giao diện dành cho Quản trị viên hệ thống
│   │   └── page.tsx                  # Quản lý tài khoản người dùng, lớp học, thống kê hệ thống
│   ├── admin-register/               # Trang đăng ký nhanh tài khoản Admin
│   ├── register/                     # Trang đăng ký tài khoản cho Giáo viên/Học sinh
│   ├── student/                      # Giao diện dành cho Học sinh tra cứu bài chấm
│   │   └── page.tsx
│   ├── teacher/                      # Giao diện chính của Giáo viên
│   │   ├── page.tsx                  # Bảng điều khiển, danh sách lớp học
│   │   └── grade/                    # Module chấm điểm (Upload ảnh, sửa lỗi, xem kết quả)
│   ├── api/                          # Next.js API Routes (Bản chất là Backend Backend-of-Frontend)
│   │   ├── auth/login/route.ts       # Xác thực người dùng, trả về thông tin Role
│   │   ├── classes/route.ts          # API REST quản lý dữ liệu lớp học
│   │   ├── grade/route.ts            # API tích hợp chấm điểm (Gọi ViT5 & Fallback Gemini)
│   │   ├── grades/route.ts           # API REST quản lý các bản ghi chấm điểm học sinh
│   │   ├── ocr/route.ts              # API gọi Gemini Vision trích xuất chữ viết tay kèm Key Rotation
│   │   ├── preprocess/route.ts       # API thực hiện Image Processing Pipeline bằng Jimp
│   │   ├── users/route.ts            # API REST quản lý người dùng
│   │   └── vit5-warmup/route.ts      # API gọi khởi động sớm model ViT5 để tránh trễ ở lượt đầu
│   ├── globals.css                   # Định nghĩa style css toàn cục và variables Tailwind
│   ├── layout.tsx                    # Layout bọc toàn bộ ứng dụng
│   └── page.tsx                      # Trang chủ / Trang đăng nhập
│
├── components/                       # Các Reusable Components xây dựng trên shadcn/ui
│   └── ui/                           # Button, Card, Dialog, Table, Toast, Input...
│
├── lib/
│   ├── image-processor.ts            # Image Pipeline đầy đủ (EXIF, Deskew, CLAHE, Threshold...)
│   ├── prisma.ts                     # Prisma Client Singleton kết nối DB
│   └── mock-data.ts                  # Dữ liệu giả lập dùng để fallback hoặc test UI
│
├── prisma/
│   ├── schema.prisma                 # Định nghĩa thực thể Database Schema
│   ├── seed.ts                       # Dữ liệu khởi tạo mẫu cho hệ thống
│   └── vihand.db                     # File cơ sở dữ liệu SQLite cục bộ
│
├── python_service/                   # ViT5 Inference Microservice
│   ├── main.py                       # FastAPI Server triển khai mô hình ViT5 và so khớp Levenshtein
│   └── requirements.txt              # Khai báo thư viện Python cần thiết (transformers, torch, fastapi...)
│
├── .env                              # Cấu hình biến môi trường (DATABASE_URL, VIT5_SERVICE_URL)
├── .env.local                        # Cấu hình bảo mật phía server (GEMINI_API_KEYS hỗ trợ dạng danh sách)
├── start_all.bat                     # File Batch chạy đồng thời cả API Python và Server Next.js trên Windows
├── package.json                      # Quản lý thư viện JS/TS và scripts của Next.js
└── tsconfig.json                     # Cấu hình TypeScript compiler
```

---

## 4. Tech Stack & Dependencies

### 4.1 Frontend & Backend Framework
*   **Next.js (v16.2.4)**: Sử dụng cấu trúc App Router mới nhất, tối ưu SEO, hỗ trợ các API Routes và Server Actions.
*   **React (v19.x)**: Thư viện dựng giao diện người dùng.
*   **TypeScript (v5.7.3)**: Đảm bảo kiểm soát kiểu chặt chẽ, hạn chế lỗi runtime trong toàn dự án.
*   **Tailwind CSS (v4.0)**: CSS Framework cho phép tùy biến giao diện nhanh chóng, Responsive hoàn chỉnh.
*   **Shadcn/ui**: Bộ component giao diện cao cấp xây dựng trên nền Radix Primitives.

### 4.2 Database & ORM
*   **Prisma ORM (v5.22.0)**: Trình quản lý ánh xạ thực thể cơ sở dữ liệu và tự động sinh truy vấn.
*   **SQLite (better-sqlite3 v12.9.0)**: Hệ quản trị cơ sở dữ liệu dạng file gọn nhẹ, không yêu cầu cài đặt máy chủ DB độc lập, phù hợp chạy cục bộ hoặc trên thiết bị nhúng.

### 4.3 AI & Image Processing
*   **Jimp (v1.6.0)**: Thư viện xử lý ảnh 100% bằng JavaScript thuần, chạy được trên môi trường Node.js mà không phụ thuộc vào các thư viện gốc (C++) như OpenCV hay Sharp.
*   **@google/genai (v0.1.1)**: SDK chính thức thế hệ mới của Google để gọi các mô hình Gemini.
*   **PyTorch & Transformers (Phía Python)**: Thư viện tải và chạy suy luận mô hình ViT5.
*   **FastAPI (Phía Python)**: Web framework hiệu năng cao được sử dụng để xây dựng API cho mô hình ViT5.

---

## 5. Database Schema (Prisma + SQLite)

Database bao gồm 3 bảng dữ liệu chính được định nghĩa trong `prisma/schema.prisma`:

```prisma
// 1. Quản lý thông tin tài khoản người dùng
model User {
  id        String   @id @default(cuid())
  name      String                                // Họ và tên đầy đủ
  username  String   @unique                      // Tên đăng nhập duy nhất
  password  String   @default("123456")           // Mật khẩu (Dạng plain-text để demo đơn giản)
  role      String   @default("student")          // Phân quyền: "teacher" | "student" | "admin"
  className String   @default("")                 // Tên lớp học trực thuộc (nếu là học sinh)
  active    Boolean  @default(true)               // Trạng thái tài khoản hoạt động
  createdAt DateTime @default(now())              // Ngày tạo tài khoản
}

// 2. Quản lý thông tin lớp học
model Class {
  id        String   @id @default(cuid())
  name      String   @unique                      // Tên lớp (Ví dụ: "3A1", "4B2")
  grade     Int      @default(3)                  // Khối lớp: 1, 2, 3, 4, 5
  teacherId String   @default("")                 // ID của giáo viên chủ nhiệm lớp
  createdAt DateTime @default(now())
}

// 3. Lưu trữ kết quả chấm bài của học sinh
model Grade {
  id                String   @id @default(cuid())
  studentName       String                        // Họ tên học sinh được chấm bài
  assignmentTitle   String                        // Tiêu đề bài viết (Ví dụ: "Nghe viết: Ai có lỗi")
  className         String   @default("")         // Lớp của học sinh tại thời điểm chấm
  originalText      String                        // Văn bản gốc do Gemini OCR trích xuất (chứa lỗi chính tả)
  fixedText         String                        // Văn bản đã được sửa đúng lỗi hoàn toàn
  corrections       String                        // Chuỗi JSON lưu danh sách chi tiết các lỗi sai
  score             String                        // Điểm số hiển thị (Ví dụ: "8.5/10")
  scoreNum          Float                         // Điểm số dạng số thực để lọc và vẽ biểu đồ (Ví dụ: 8.5)
  scoreBreakdown    String   @default("")         // JSON chi tiết điểm thành phần (chính tả, hình thức, nội dung, sáng tạo)
  feedback          String                        // Nhận xét mang tính giáo dục học sinh tiểu học
  overallRating     String                        // Phân loại học tập: "Xuất sắc" | "Tốt" | "Khá" | "Trung bình" | "Cần cố gắng"
  processingTimeMs  Int      @default(0)          // Thời gian hệ thống xử lý bài chấm (ms)
  tokenCount        Int      @default(0)          // Tổng số Token đã tiêu tốn cho bài chấm này (nếu có dùng API)
  imageBase64       String   @default("")         // Lưu ảnh gốc dạng base64 để xem lại trên giao diện lịch sử chấm
  createdAt         DateTime @default(now())
}
```

---

## 6. Danh sách API Endpoints

### 6.1 Xác thực & Quản trị tài khoản
*   `POST /api/auth/login`
    *   **Mô tả**: Nhận tên đăng nhập và mật khẩu, kiểm tra tài khoản, trả về thông tin User kèm Role để điều hướng UI.
    *   **Body**: `{"username": "...", "password": "..."}`
    *   **Response (200)**: `{"user": {"id": "...", "name": "...", "role": "teacher|student|admin", "className": "..."}}`
*   `GET /api/users` & `POST /api/users`
    *   **Mô tả**: CRUD thông tin tài khoản người dùng (chỉ dành cho tài khoản Admin).
*   `GET /api/classes` & `POST /api/classes`
    *   **Mô tả**: Quản lý thông tin các lớp học trong trường.

### 6.2 Pipeline tiền xử lý ảnh và OCR chữ viết
*   `POST /api/preprocess`
    *   **Mô tả**: Nhận ảnh chụp thô từ client, thực hiện toàn bộ 9 bước tiền xử lý ảnh bằng Jimp, trả về ảnh dạng base64 sạch bóng đổ, thẳng hàng và báo cáo chất lượng.
    *   **Body**: `{"imageBase64": "..."}`
    *   **Response (200)**: `{"processedBase64": "...", "quality": {"is_good": true, "warnings": [], "blur_score": 120.4, ...}}`
*   `POST /api/ocr`
    *   **Mô tả**: Gửi ảnh đã xử lý đến Gemini Vision (`gemini-3.1-flash-lite`) để nhận diện chữ viết tay thô (original_text) và lấy gợi ý sửa lỗi tham khảo (gemini_fixed_text). Hỗ trợ cơ chế tự động xoay vòng API Keys.
    *   **Body**: `{"imageBase64": "...", "mimeType": "image/jpeg"}`
    *   **Response (200)**: `{"text": "văn bản thô...", "gemini_fixed_text": "văn bản đã sửa bởi Gemini...", "tokenCount": 1052, "processingTimeMs": 2410}`

### 6.3 Chấm điểm & Sửa lỗi chính tả
*   `POST /api/grade`
    *   **Mô tả**: Nhận văn bản thô trích xuất từ ảnh, gọi Microservice ViT5 để sửa lỗi chính tả, sau đó tính toán điểm số và lỗi chi tiết bằng thuật toán so khớp. Nếu dịch vụ ViT5 không phản hồi (timeout hoặc chưa khởi chạy), API sẽ tự động chuyển sang gọi Gemini API làm fallback.
    *   **Body**:
        ```json
        {
          "studentText": "văn bản thô của học sinh...",
          "penalty_per_error": 0.5,
          "hinh_thuc": 2.5,
          "noi_dung": 1.5
        }
        ```
    *   **Response (200)**:
        ```json
        {
          "original_text": "văn bản gốc của học sinh...",
          "fixed_text": "văn bản đã sửa lỗi hoàn chỉnh...",
          "corrections": [
            {
              "error": "từ viết sai",
              "suggestion": "từ đúng",
              "error_type": "phu_am_dau | van | dau_thanh | viet_hoa | bo_sot_them | dau_cau",
              "is_dialect": false,
              "reason": "Giải thích lỗi cho học sinh..."
            }
          ],
          "score_breakdown": {
            "chinh_ta":  { "raw": 3.0, "max": 4.0, "error_count": 2, "deduction": 1.0 },
            "hinh_thuc": { "raw": 2.5, "max": 3.0, "note": "Giáo viên đánh giá" },
            "noi_dung":  { "raw": 1.5, "max": 2.0, "note": "Giáo viên đánh giá" },
            "sang_tao":  { "raw": 1.0, "max": 1.0, "note": "Có điệp ngữ và biện pháp nghệ thuật" }
          },
          "score": "8.0/10",
          "overall_rating": "Tốt",
          "feedback": "Lời nhận xét động viên học sinh...",
          "engine": "vit5+levenshtein"
        }
        ```

### 6.4 Lưu trữ kết quả chấm bài
*   `GET /api/grades` & `POST /api/grades`
    *   **Mô tả**: Nhận và lưu kết quả chấm bài hoàn thiện của học sinh hoặc truy vấn lịch sử chấm điểm theo bộ lọc Tên học sinh, Lớp học và Tiêu đề bài viết.

---

## 7. Logic nghiệp vụ chấm điểm & Thuật toán AI

### 7.1 Chuẩn hóa văn bản trước khi xử lý (Pre-processing)
Trước khi đưa văn bản vào mô hình ViT5 suy luận sửa lỗi, văn bản thô được chạy qua hai bước làm sạch để nâng cao độ chính xác:
1.  **Lọc Teencode**: Áp dụng từ điển ánh xạ `TEENCODE_DICT` để chuẩn hóa các lỗi viết tắt phổ biến thường gặp của học sinh thế hệ mới (Ví dụ: `ko` → `không`, `zậy` → `dậy`, `ko` → `không`, `dc` → `được`, `vs` → `với`).
2.  **Chuẩn hóa dấu câu**: Loại bỏ các khoảng trắng thừa đứng trước dấu câu, sửa lỗi lặp dấu câu không cố ý (Ví dụ: `câu hỏi  ??` → `câu hỏi?`, `bài làm ...` → `bài làm.`).

### 7.2 Mô hình sửa lỗi ViT5 & Tối ưu hóa trên CPU
Hệ thống sử dụng mô hình chuyên biệt `chamdentimem/ViT5_Vietnamese_Correction`. Nhằm cho phép chạy mượt mà ngay trên các CPU máy tính bàn thông thường hoặc phần cứng nhúng (như Raspberry Pi), hệ thống áp dụng các kỹ thuật:
*   **Dynamic INT8 Quantization**: Chuyển đổi trọng số mô hình từ số thực 32-bit (`FP32`) sang số nguyên 8-bit (`INT8`) thông qua hàm `torch.quantization.quantize_dynamic`. Giúp giảm dung lượng mô hình trên RAM hơn 2 lần và đẩy nhanh tốc độ tính toán ma trận trên nhân CPU.
*   **CPU Multi-threading**: Tận dụng tối đa số lượng nhân vật lý của máy chủ (`torch.set_num_threads(n_cores)`) để tăng luồng suy luận.
*   **Không block tiến trình FastAPI**: Chạy tác vụ suy luận của PyTorch bên trong một ThreadPool chuyên biệt (`ThreadPoolExecutor(max_workers=1)`), đảm bảo server FastAPI vẫn phản hồi nhanh các request kiểm tra sức khỏe hệ thống (`/health`) trong khi model đang chạy suy luận.

### 7.3 Giải thuật cắt đoạn văn xuôi (Prose Chunking)
Do giới hạn ngữ cảnh của mô hình ViT5 và tránh hiện tượng mô hình sinh từ ngẫu nhiên (hallucination):
*   Đoạn văn xuôi được chia nhỏ thành các chunk có độ dài tối đa là **160 ký tự**. Phép chia thực hiện thông qua dò dấu câu phân tách (dấu chấm, chấm hỏi, chấm than, dấu phẩy).
*   **Nguyên tắc thiết kế quan trọng**: **KHÔNG sử dụng kỹ thuật cửa sổ trượt (sliding window)** có chứa phần đuôi của câu trước. Việc chứa câu trước trong dữ liệu đầu vào của chunk sau rất dễ làm mô hình ViT5 bị rối và lặp lại câu đó trong kết quả đầu ra (vòng lặp vô hạn).
*   Mức 160 ký tự tương đương khoảng `240 tokens` trong bộ từ điển tiếng Việt của ViT5, nằm hoàn toàn bên trong cửa sổ ngữ cảnh `256 tokens` của tokenizer mà không sợ bị cắt đứt chữ.

### 7.4 Thuật toán lọc Hallucination & Vòng lặp
Nếu mô hình ViT5 rơi vào trạng thái lỗi sinh từ ngẫu nhiên (hallucination), hệ thống sẽ chủ động phát hiện và bỏ qua kết quả sửa lỗi của ViT5 để quay về nguyên bản thô thông qua các điều kiện lọc:
1.  **Vòng lặp cụm từ (Repetition Loop)**: Phát hiện nếu có một cụm từ dài từ 3-5 từ lặp lại liên tiếp `≥ 3 lần` ở chuỗi kết quả.
2.  **Độ dài kết quả đột biến**: Nếu kết quả sửa lỗi dài hơn `1.5 lần` so với văn bản gốc đầu vào (mô hình tự vẽ thêm nội dung không có thực) hoặc ngắn hơn `0.5 lần` (mô hình bị cắt đứt nội dung).

### 7.5 Xử lý thể loại văn bản (Thơ ca vs Văn xuôi)
Hệ thống tự động phát hiện định dạng bài viết:
*   Nếu độ dài trung bình của các dòng văn bản (trừ tiêu đề) `< 40 ký tự`, hệ thống tự phân loại là **Thơ ca**.
*   Khi chấm bài **Thơ ca**, ViT5 sẽ sửa lỗi độc lập trên từng dòng để đảm bảo không phá vỡ cấu trúc nhịp điệu và cách xuống dòng của thể thơ.
*   Khi chấm bài **Văn xuôi**, hệ thống sẽ gộp các dòng liên tục không thụt lề thành các đoạn văn lớn trước khi chia chunk và sửa lỗi.

### 7.6 Loại bỏ từ viết lặp do học sinh (Adjacent Duplicates Removal)
Trẻ em thường mắc lỗi viết lặp từ do chia trí (Ví dụ: "đồng đồng", "là là"). Hàm `remove_adjacent_duplicates` được thiết kế để loại bỏ các từ trùng lặp đứng cạnh nhau này. 
Tuy nhiên, thuật toán có danh sách loại trừ `INTATIONAL_REPEATS` chứa các từ láy hoặc cấu trúc ngữ pháp lặp có ý nghĩa văn học trong tiếng Việt (Ví dụ: "mãi mãi", "xa xa", "nhanh nhanh", "năm năm") để tránh việc xóa nhầm các từ viết đúng này.

### 7.7 Thuật toán so khớp lỗi chính tả (Levenshtein Word-Level)
Sử dụng `difflib.SequenceMatcher` để so sánh mảng từ của văn bản học sinh (`student_words`) và mảng từ của văn bản đã được AI sửa đúng (`ai_words`):
*   **Thay thế từ (Replace)**: So sánh từ sai và từ đúng tương ứng. Chuẩn hóa hai từ về dạng không dấu (`remove_accents`).
    *   Nếu hai từ không dấu giống nhau hoàn toàn: Lỗi viết hoa/thường (`viet_hoa`).
    *   Nếu hai từ không dấu khác nhau nhưng có cùng phụ âm đầu, vần: Lỗi dấu thanh (`dau_thanh`).
    *   Nếu hai từ không dấu khác nhau ở ký tự đầu và thuộc các cặp phụ âm dễ nhầm lẫn trong tiếng Việt (c/k/q, g/gh, d/gi/r, s/x, ch/tr, l/n, z/d): Lỗi phụ âm đầu (`phu_am_dau`).
    *   Các trường hợp còn lại: Lỗi vần (`van`).
*   **Xoá từ (Delete)**: Học sinh viết thiếu từ so với văn bản chuẩn → Lỗi bỏ sót chữ (`bo_sot_them`).
*   **Thêm từ (Insert)**: Học sinh viết thừa từ so với văn bản chuẩn → Lỗi viết thừa chữ (`bo_sot_them`).

### 7.8 Barem chấm điểm chi tiết (Thang 10)
1.  **Chính tả & Ngữ pháp (Tối đa 4.0 điểm)**:
    *   Bắt đầu từ `4.0` điểm tuyệt đối.
    *   Mỗi lỗi chính tả phát hiện ra sẽ bị trừ điểm theo cấu hình `penalty_per_error` (mặc định trừ `0.5đ` mỗi lỗi).
    *   Điểm sàn tối thiểu của phần này là `0.0` điểm (không có điểm âm).
2.  **Hình thức (Tối đa 3.0 điểm)**: Giáo viên nhập tay tùy ý hoặc hệ thống đặt mặc định `2.5` điểm.
3.  **Nội dung (Tối đa 2.0 điểm)**: Giáo viên nhập tay tùy ý hoặc hệ thống đặt mặc định `1.5` điểm.
4.  **Sáng tạo (Tối đa 1.0 điểm)**: Được đánh giá tự động dựa trên cấu trúc câu chữ trong văn bản đã sửa lỗi:
    *   Nhận `1.0` điểm: Nếu bài viết có cả cấu trúc điệp ngữ (một từ lặp lại `≥ 3 lần` trong toàn bài) và có hình ảnh gợi tả, so sánh nghệ thuật (chứa các từ khóa: *như là, tựa như, lấp lánh, dịu dàng, rực rỡ...*).
    *   Nhận `0.5` điểm: Nếu chỉ có một trong hai điều kiện trên hoặc bài viết có dung lượng đủ dài (`≥ 40 từ`) thể hiện sự cố gắng diễn đạt tốt.
    *   Nhận `0.0` điểm: Các câu viết ngắn, đơn giản thông thường.

### 7.9 Xếp loại & Tạo nhận xét động
*   **Xếp loại học sinh**: Xuất sắc (`≥ 9.0đ`), Tốt (`7.0 - 8.9đ`), Khá (`5.0 - 6.9đ`), Trung bình (`3.0 - 4.9đ`), Cần cố gắng (`< 3.0đ`).
*   **Nhận xét (Feedback)**: Sử dụng các mẫu câu động viên sư phạm tiếng Việt phù hợp với lứa tuổi tiểu học dựa trên số lỗi chính tả:
    *   *0 lỗi*: "Bài viết xuất sắc! Con không mắc lỗi chính tả nào. Tiếp tục phát huy nhé!"
    *   *1-2 lỗi*: "Bài viết tốt! Con chỉ mắc [số_lỗi] lỗi nhỏ. Chú ý sửa những từ đã được đánh dấu để bài viết hoàn thiện hơn nhé."
    *   *Trên 2 lỗi*: "Con còn mắc [số_lỗi] lỗi chính tả trong bài. Con hãy xem lại từng lỗi được chỉ ra và luyện tập thêm nhé! Cố gắng lên!"

---

## 8. Pipeline xử lý hình ảnh (TypeScript/Jimp)

Thiết kế chi tiết của 9 bước trong file `lib/image-processor.ts`:

### 8.1 Sửa góc xoay EXIF và Chỉnh góc nghiêng (Deskew)
1.  **EXIF Auto-rotate**: Đọc mã nhị phân ảnh JPEG, tìm marker APP1 `0xFFE1` và phân tích Exif Orientation Tag `0x0112`. Sau đó, tiến hành xoay ảnh bằng Jimp (90°, 180°, 270°) để ảnh về đúng chiều đứng của trang giấy trước khi bắt đầu tính toán độ rộng/chiều cao thực tế.
2.  **Dò góc nghiêng (Deskew)**:
    *   Thu nhỏ ảnh xám tạm thời xuống chiều rộng tối đa **400px** để giảm độ phức tạp thuật toán và đảm bảo xử lý nhanh trên các CPU yếu.
    *   Nhị phân hóa bằng thuật toán Otsu.
    *   Quét từng hàng của ảnh nhị phân: hàng nào có tỷ lệ pixel đen vượt quá **35%** sẽ được xác định là đường kẻ ô ly của vở học sinh và được chuyển toàn bộ thành màu trắng (loại bỏ nhiễu đường kẻ).
    *   Áp dụng thuật toán Projection Profile Variance: Chiếu ảnh nhị phân theo góc quét $\theta$ từ `-15°` đến `+15°`.
    *   Tính phương sai mật độ pixel đen trên các hàng. Góc có phương sai lớn nhất tương ứng với góc chữ viết thẳng hàng nhất.
    *   *Quá trình tìm kiếm 2 pha*: Pha 1 quét bước rộng `1.0°` để xác định khoảng góc tốt nhất. Pha 2 quét tinh chỉnh bước nhỏ `0.1°` trong phạm vi `±1.0°` xung quanh góc tìm được ở Pha 1. Xoay ảnh Jimp theo góc tìm được để chỉnh thẳng.

### 8.2 Tăng cường chất lượng ảnh
3.  **Resize**: Giới hạn độ rộng tối đa của ảnh ở mức **1600px** (giữ nguyên tỷ lệ khung hình) để giảm dung lượng file gửi qua mạng và giảm chi phí Token của Gemini API mà không làm giảm khả năng nhận diện ký tự của OCR.
4.  **Cân bằng màu (White Balance)**: Áp dụng thuật toán **Gray World Assumption**. Tính giá trị trung bình của cả 3 kênh màu đỏ, xanh lá, xanh dương trên toàn ảnh, sau đó điều chỉnh hệ số nhân của từng kênh để loại bỏ sắc vàng của bóng đèn hoặc ánh sáng lệch màu.
5.  **Grayscale**: Chuyển ảnh màu sang ảnh xám 1 kênh màu sử dụng công thức chuẩn:
    $$Y = 0.299R + 0.587G + 0.114B$$
6.  **Xóa bóng đổ (Shadow Removal)**:
    *   Ước lượng ảnh nền (background illumination) bằng cách áp dụng bộ lọc Box Blur với kích thước kernel rất lớn (mặc định **51px**).
    *   Tối ưu hóa Box Blur: Sử dụng cấu trúc dữ liệu **Ảnh tích phân (Integral Image)**. Cho phép tính tổng pixel của bất kỳ vùng cửa sổ nào chỉ với 4 phép tra cứu bảng, đưa độ phức tạp thuật toán về $O(1)$ cho mỗi pixel bất kể kích thước kernel lớn cỡ nào.
    *   Lấy ảnh xám gốc chia cho ảnh nền ước lượng để triệt tiêu toàn bộ các vùng tối/bóng đổ do tay học sinh hoặc điện thoại che khi chụp ảnh.
7.  **CLAHE (Contrast Limited Adaptive Histogram Equalization)**:
    *   Chia ảnh thành lưới **8x8** vùng cục bộ.
    *   Tính toán histogram và giới hạn mức đỉnh histogram ở hệ số **2.0** (Clip Limit) để ngăn chặn việc tăng cường quá mức các nhiễu nền hoặc nét mờ của giấy ô ly.
    *   Phân phối lại lượng pixel vượt giới hạn đều cho toàn bộ histogram, tính CDF và nội suy song tuyến (bilinear interpolation) tại biên các vùng lưới để loại bỏ hiện tượng phân mảnh ảnh.
8.  **Làm nét (Sharpen)**: Áp dụng Unsharp Mask để làm sắc nét các góc cạnh nét chữ viết tay:
    $$\text{Output} = \text{Original} + \text{Amount} \times (\text{Original} - \text{BoxBlur}_{3\times3})$$
9.  **Nhị phân hóa (Thresholding)**: Thực hiện nhị phân hóa thích ứng Gaussian (`adaptive_gaussian`) sử dụng ảnh tích phân nhanh với hằng số hiệu chỉnh $C=20$ để chuyển đổi ảnh sang hai màu đen trắng thuần túy, làm nổi bật nét bút mực viết tay và xóa bỏ hoàn toàn đường kẻ ô ly nhạt màu nền.

### 8.3 Chỉ số đánh giá chất lượng ảnh (Quality Assessment)
Hệ thống tính toán các chỉ số chất lượng trước khi thực hiện nhị phân hóa để kiểm tra tính hợp lệ của ảnh đầu vào:
*   **Độ mờ (Blur Score)**: Sử dụng phương sai của bộ lọc Laplace (Laplacian Variance). Nếu điểm số `< 80`, hệ thống ghi nhận cảnh báo ảnh bị nhòe/mờ.
*   **Độ sáng (Brightness)**: Giá trị xám trung bình của ảnh. Đưa ra cảnh báo nếu ảnh quá tối (`< 50`) hoặc bị cháy sáng (`> 220`).
*   **Nét chữ nhạt**: Đếm tỷ lệ các pixel có giá trị xám `< 100`. Nếu tỷ lệ `< 0.02`, đưa ra cảnh báo nét chữ quá mờ, khó nhận dạng chính xác.
*   **Diện tích vùng chữ**: Đo lường tỷ lệ diện tích các nét chữ nhị phân trên tổng thể trang giấy. Cảnh báo nếu tỷ lệ `< 0.005` (có thể do chụp ảnh quá xa hoặc không có chữ viết trong ảnh).

---

## 9. Cấu hình hệ thống & Khởi chạy

### 9.1 Cấu hình biến môi trường
Dự án yêu cầu thiết lập hai file biến môi trường chính ở thư mục gốc:

**File `.env`:**
```bash
# Đường dẫn kết nối cơ sở dữ liệu SQLite thông qua Prisma ORM
DATABASE_URL="file:./prisma/vihand.db"

# Đường dẫn kết nối tới Microservice chạy mô hình ViT5 cục bộ
VIT5_SERVICE_URL="http://localhost:8000"
```

**File `.env.local`:**
```bash
# Danh sách API Keys của Google Gemini (Phân tách bằng dấu phẩy để hệ thống tự xoay vòng)
GEMINI_API_KEYS="AIzaSyA1...key1,AIzaSyB2...key2,AIzaSyC3...key3"
```

### 9.2 Hướng dẫn khởi chạy toàn bộ hệ thống
Để khởi động hệ thống nhanh chóng trên Windows, chạy file Batch được cung cấp sẵn ở thư mục gốc:

```powershell
.\start_all.bat
```

File Batch này thực hiện:
1.  Kích hoạt thư mục `python_service`, cài đặt thư viện cần thiết (`pip install -r requirements.txt`) nếu chạy lần đầu, và khởi chạy FastAPI bằng Uvicorn trên cổng `8000`.
2.  Chạy server Next.js ở chế độ phát triển (`npm run dev`) trên cổng `3000`.

*Chạy thủ công bằng Terminal:*
*   **Chạy Python ViT5 Service**:
    ```bash
    cd python_service
    uvicorn main:app --host 0.0.0.0 --port 8000
    ```
*   **Chạy Next.js Web App**:
    ```bash
    npm run dev
    ```

---

## 10. Quản lý rủi ro và các giải pháp dự phòng

| Tình huống rủi ro | Xác suất | Tác động | Giải pháp xử lý dự phòng của hệ thống |
| :--- | :---: | :---: | :--- |
| **Dịch vụ ViT5 chưa khởi động hoặc bị sập** | Trung bình | Cao | API `/api/grade` tự động thực hiện **gọi lại lần hai sau 10 giây** (phòng trường hợp model đang load lần đầu). Nếu vẫn không được, hệ thống tự động **chuyển sang chế độ Fallback gọi Gemini API** để sửa lỗi chính tả bằng Prompt đặc tả barem. |
| **Gemini API Key bị lỗi giới hạn lượt dùng (Rate Limit 429)** | Cao | Cao | Sử dụng cấu trúc **API Key Rotation**: Hệ thống tự động phân tách danh sách khóa trong biến môi trường, xáo trộn ngẫu nhiên (shuffle) và thử khóa tiếp theo ngay khi nhận được mã lỗi `429` hoặc `RESOURCE_EXHAUSTED`. |
| **Ảnh chụp chất lượng quá kém (mờ, rung tay, tối)** | Trung bình | Trung bình | Image Pipeline thực hiện lọc bóng đổ và làm nét tối đa. Đồng thời, bộ đánh giá chất lượng ảnh gửi các cảnh báo chi tiết lên UI (như "Ảnh bị mờ", "Ảnh thiếu sáng") để giáo viên biết và chụp lại ảnh nét hơn nếu kết quả nhận diện không ưng ý. |
| **Bài viết dài gây timeout cổng Next.js API (mặc định 30s)** | Thấp | Trung bình | Định cấu hình tham số `export const maxDuration = 300` trên API Route của Next.js để tăng giới hạn thời gian chờ phản hồi tối đa lên **5 phút (300 giây)**. |

---

*Tài liệu Đặc tả Kỹ thuật của dự án ViHand Grade đã được cập nhật hoàn chỉnh và đồng bộ theo mã nguồn thực tế của hệ thống.*
