# 📝 ViHand Grade — Đặc Tả Kỹ Thuật

> **Hệ thống Chấm điểm Chính tả Tiếng Việt Thông minh**
> Phiên bản: `v1.0.0` | Cập nhật: 2026-05-16

---

## 1. Tổng quan dự án

### 1.1 Mô tả

**ViHand Grade** là ứng dụng web hỗ trợ giáo viên tiểu học chấm điểm bài chính tả viết tay của học sinh một cách tự động bằng AI. Hệ thống sử dụng Gemini API (multimodal) để nhận dạng chữ viết tay tiếng Việt từ ảnh chụp điện thoại và chấm điểm theo barem chi tiết.

### 1.2 Mục tiêu

| Mục tiêu | Chỉ số |
|---|---|
| Thời gian chấm điểm | < 30 giây/bài |
| Độ chính xác OCR | ≥ 90% ký tự tiếng Việt có dấu |
| Kích thước ảnh đầu vào | JPG/PNG/WebP, tối đa 10MB |
| Hỗ trợ tiền xử lý ảnh | Giấy ô ly, bút chì nhạt, ánh sáng lệch |

### 1.3 Người dùng mục tiêu

| Role | Chức năng chính |
|---|---|
| **Giáo viên** | Upload/chụp ảnh bài viết, xem kết quả AI, lưu điểm, xem báo cáo lớp |
| **Học sinh** | Tra cứu lịch sử điểm và nhận xét |
| **Quản trị viên** | Quản lý tài khoản, lớp học, thống kê hệ thống |

---

## 2. Kiến trúc hệ thống

### 2.1 Sơ đồ tổng thể

```
┌──────────────────────────────────────────────────────────┐
│                   Next.js 16 App                          │
│                                                          │
│  ┌────────────┐    ┌──────────────────────────────────┐  │
│  │  Frontend   │    │         API Routes               │  │
│  │  React 19   │───▶│  /api/auth/login                 │  │
│  │  shadcn/ui  │    │  /api/grade      → Gemini API    │  │
│  │  Tailwind 4 │    │  /api/grades     → Prisma CRUD   │  │
│  │             │    │  /api/preprocess → Image Pipeline │  │
│  └────────────┘    │  /api/users      → User CRUD     │  │
│                    │  /api/classes     → Class CRUD    │  │
│                    └──────────┬───────────────────────┘  │
│                               │                          │
│                    ┌──────────▼──────────┐               │
│                    │   Prisma ORM        │               │
│                    │   SQLite (vihand.db) │               │
│                    └─────────────────────┘               │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │  lib/image-processor.ts (Jimp)                    │    │
│  │  Pipeline: WhiteBalance → Shadow → Grid → CLAHE   │    │
│  │           → Sharpen → Threshold → Quality Report  │    │
│  └──────────────────────────────────────────────────┘    │
└────────────────────────┬─────────────────────────────────┘
                         │ HTTPS
               ┌─────────▼─────────┐
               │  Google Gemini    │
               │  3 Flash Preview  │
               └───────────────────┘
```

### 2.2 Luồng xử lý chính

```
[Giáo viên upload/chụp ảnh]
        │
        ▼
[Tab "Ảnh gốc"] ──────────────────────────┐
        │                                  │
        ▼                                  ▼
[Tab "Đã xử lý"]                    [Nhấn "Chấm điểm"]
  POST /api/preprocess                POST /api/grade
  ├── EXIF auto-rotate (Jimp)         ├── Gửi ảnh gốc (base64)
  ├── Resize max 1600px               ├── Prompt + ảnh → Gemini API
  ├── White Balance                   ├── Parse JSON response
  ├── Grayscale                       └── Trả kết quả chấm điểm
  ├── Shadow Removal                        │
  ├── CLAHE                                 ▼
  ├── Sharpen                        [Hiển thị kết quả]
  ├── Adaptive Threshold               ├── Điểm số + xếp hạng
  └── Quality Assessment               ├── Danh sách lỗi chính tả
                                       ├── Văn bản gốc vs đã sửa
        │                              └── Nhận xét AI
        ▼                                   │
[Hiển thị ảnh đã xử lý]                    ▼
[Hiển thị Quality Report]           [Lưu vào SQLite]
                                     POST /api/grades
```

---

## 3. Cấu trúc thư mục

```
Web_sua_loi/
│
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # Root layout (Roboto font, PWA)
│   ├── page.tsx                      # Trang đăng nhập
│   ├── register/                     # Trang đăng ký
│   ├── manifest.ts                   # PWA manifest
│   ├── sw.js/                        # Service Worker
│   ├── globals.css                   # Tailwind CSS v4
│   │
│   ├── api/                          # API Routes
│   │   ├── auth/login/route.ts       # Xác thực đăng nhập
│   │   ├── grade/route.ts            # Gọi Gemini API chấm điểm
│   │   ├── grades/route.ts           # CRUD bài chấm (GET, POST)
│   │   ├── grades/[id]/route.ts      # Chi tiết bài chấm (GET, PUT, DELETE)
│   │   ├── preprocess/route.ts       # Tiền xử lý ảnh
│   │   ├── users/route.ts            # CRUD người dùng
│   │   └── classes/route.ts          # CRUD lớp học
│   │
│   ├── teacher/                      # Giao diện giáo viên
│   │   ├── layout.tsx                # Sidebar layout
│   │   ├── page.tsx                  # Dashboard (stats, thao tác nhanh)
│   │   ├── grade/page.tsx            # Chấm điểm AI (upload/chụp/text)
│   │   ├── assignments/              # Quản lý bài tập
│   │   └── reports/page.tsx          # Báo cáo lớp
│   │
│   ├── student/                      # Giao diện học sinh
│   │   ├── layout.tsx                # Sidebar layout
│   │   ├── page.tsx                  # Dashboard học sinh
│   │   └── history/page.tsx          # Lịch sử điểm
│   │
│   └── admin/                        # Giao diện quản trị
│       ├── layout.tsx                # Sidebar layout
│       ├── page.tsx                  # Dashboard admin
│       ├── users/page.tsx            # Quản lý tài khoản
│       ├── classes/page.tsx          # Quản lý lớp học
│       ├── settings/                 # Cài đặt hệ thống
│       ├── statistics/               # Thống kê
│       └── system/                   # Giám sát hệ thống
│
├── components/
│   ├── app-sidebar.tsx               # Sidebar navigation (role-based)
│   ├── theme-provider.tsx            # Dark/light mode
│   └── ui/                           # shadcn/ui components (57 files)
│
├── lib/
│   ├── image-processor.ts            # Pipeline tiền xử lý ảnh (Jimp)
│   ├── prisma.ts                     # Prisma client singleton
│   ├── types.ts                      # TypeScript types
│   ├── utils.ts                      # Utility functions
│   └── mock-data.ts                  # Dữ liệu mẫu
│
├── prisma/
│   ├── schema.prisma                 # Database schema
│   └── vihand.db                     # SQLite database file
│
├── image_utils.py                    # Pipeline Python/OpenCV (tham khảo)
├── .env                              # DATABASE_URL
├── .env.local                        # GEMINI_API_KEY
├── package.json
├── next.config.mjs
└── tsconfig.json
```

---

## 4. Tech Stack & Dependencies

### 4.1 Framework & Runtime

| Package | Phiên bản | Mục đích |
|---|---|---|
| `next` | 16.2.4 | Full-stack React framework (App Router) |
| `react` / `react-dom` | 19.x | UI library |
| `typescript` | 5.7.3 | Type safety |

### 4.2 Database & ORM

| Package | Phiên bản | Mục đích |
|---|---|---|
| `prisma` | 5.22.0 | ORM & schema migration |
| `@prisma/client` | 5.22.0 | Database client |
| `better-sqlite3` | 12.9.0 | SQLite native driver |
| SQLite | 3.x | Database engine (file-based) |

### 4.3 AI & Image Processing

| Package | Phiên bản | Mục đích |
|---|---|---|
| `@google/generative-ai` | 0.24.1 | Gemini API SDK |
| `jimp` | 1.6.1 | Image processing (pure JS, no native deps) |
| Gemini Model | `gemini-3-flash-preview` | Multimodal OCR + chấm điểm |

### 4.4 UI Components

| Package | Mục đích |
|---|---|
| `tailwindcss` v4 + `@tailwindcss/postcss` | Styling framework |
| shadcn/ui (Radix UI primitives) | 57 UI components |
| `lucide-react` | Icon library |
| `recharts` | Charts cho báo cáo |
| `next-themes` | Dark/light mode |
| `sonner` | Toast notifications |
| Google Fonts: `Roboto` (latin + vietnamese) | Typography |

### 4.5 Utilities

| Package | Mục đích |
|---|---|
| `date-fns` | Date formatting |
| `zod` | Schema validation |
| `react-hook-form` | Form handling |
| `class-variance-authority` + `clsx` + `tailwind-merge` | CSS class utilities |
| `@vercel/analytics` | Analytics (production) |

---

## 5. Database Schema (Prisma + SQLite)

### 5.1 Model `User`

```prisma
model User {
  id        String   @id @default(cuid())
  name      String                          // Họ tên
  username  String   @unique                // Tên đăng nhập
  password  String   @default("123456")     // Mật khẩu (plain text, v1)
  role      String   @default("student")    // "teacher" | "student" | "admin"
  className String   @default("")           // Lớp (cho học sinh)
  active    Boolean  @default(true)         // Trạng thái tài khoản
  createdAt DateTime @default(now())
}
```

### 5.2 Model `Class`

```prisma
model Class {
  id        String   @id @default(cuid())
  name      String   @unique                // VD: "Lop 3A", "Lop 3B"
  grade     Int      @default(3)            // Khối lớp (1-5)
  teacherId String   @default("")           // ID giáo viên phụ trách
  createdAt DateTime @default(now())
}
```

### 5.3 Model `Grade`

```prisma
model Grade {
  id                String   @id @default(cuid())
  studentName       String                  // Tên học sinh
  assignmentTitle   String                  // Tên bài viết
  className         String   @default("")   // Lớp
  originalText      String                  // Văn bản AI nhận dạng (gốc)
  fixedText         String                  // Văn bản đã sửa lỗi
  corrections       String                  // JSON: danh sách lỗi [{error, suggestion, reason}]
  score             String                  // Điểm dạng "X.X/10"
  scoreNum          Float                   // Điểm số (để sort/filter)
  feedback          String                  // Nhận xét AI
  overallRating     String                  // "Tốt" | "Khá" | "Trung bình" | "Cần cố gắng"
  processingTimeMs  Int      @default(0)    // Thời gian xử lý (ms)
  tokenCount        Int      @default(0)    // Token đã dùng
  imageBase64       String   @default("")   // Ảnh gốc bài viết (base64)
  createdAt         DateTime @default(now())
}
```

---

## 6. API Endpoints

### 6.1 Authentication

| Method | Path | Mô tả | Auth |
|---|---|---|---|
| `POST` | `/api/auth/login` | Đăng nhập (username + password) | ❌ |

> **Cơ chế xác thực v1**: So sánh password plain text, trả user object, lưu vào `localStorage` phía client. Không dùng JWT/session.

### 6.2 Grading

| Method | Path | Mô tả |
|---|---|---|
| `POST` | `/api/grade` | Gọi Gemini API chấm điểm (ảnh base64 hoặc text) |
| `GET` | `/api/grades` | Danh sách bài chấm (filter: search, class, assignment) |
| `POST` | `/api/grades` | Lưu kết quả chấm điểm vào database |
| `GET` | `/api/grades/[id]` | Chi tiết một bài chấm |
| `PUT` | `/api/grades/[id]` | Cập nhật bài chấm |
| `DELETE` | `/api/grades/[id]` | Xóa bài chấm |

### 6.3 Image Processing

| Method | Path | Mô tả |
|---|---|---|
| `POST` | `/api/preprocess` | Tiền xử lý ảnh (9-step pipeline), trả ảnh đã xử lý + quality report |

### 6.4 User & Class Management

| Method | Path | Mô tả |
|---|---|---|
| `GET` | `/api/users` | Danh sách users (filter: role) |
| `POST` | `/api/users` | Tạo tài khoản mới |
| `GET` | `/api/classes` | Danh sách lớp học |
| `POST` | `/api/classes` | Tạo lớp mới |

### 6.5 Grading Response Schema

```json
{
  "fixed_text": "văn bản đã sửa lỗi",
  "original_text": "văn bản gốc AI nhận dạng",
  "corrections": [
    {
      "error": "từ viết sai",
      "suggestion": "từ đúng",
      "reason": "lý do (nhầm tr/ch, thiếu dấu thanh...)"
    }
  ],
  "score": "7.5/10",
  "feedback": "nhận xét chi tiết",
  "overall_rating": "Khá",
  "processingTimeMs": 2340,
  "tokenCount": 512
}
```

---

## 7. Logic nghiệp vụ chấm điểm

### 7.1 Barem điểm (Gemini Prompt)

| Tiêu chí | Điểm tối đa | Chi tiết |
|---|---|---|
| Chính tả & Ngữ pháp | 4.0 điểm | Trừ 0.5đ/lỗi (lỗi trùng chỉ trừ 1 lần) |
| Hình thức | 3.0 điểm | Đánh giá chữ viết, trình bày |
| Nội dung & Ý tưởng | 2.0 điểm | Đủ ý, đúng chủ đề, mạch lạc |
| Sáng tạo | 1.0 điểm | Từ láy, so sánh, nhân hóa |

### 7.2 Phân loại xếp hạng

| Điểm | Xếp loại | Màu | Emoji |
|---|---|---|---|
| ≥ 8.0 | Tốt | Xanh lá | 🌟 |
| ≥ 6.5 | Khá | Xanh dương | 👍 |
| ≥ 5.0 | Trung bình | Vàng | 📝 |
| < 5.0 | Cần cố gắng | Đỏ | 💪 |

---

## 8. Xử lý hình ảnh (Image Pipeline)

### 8.1 Pipeline (`lib/image-processor.ts`)

Viết hoàn toàn bằng TypeScript + Jimp (không cần OpenCV/Python trên server).

```
Input: ảnh base64 (JPG/PNG/WebP)
    │
    ├─ [1] EXIF Auto-rotate (Jimp tự xử lý)
    ├─ [2] Resize: max width 1600px, INTER_AREA
    ├─ [3] White Balance: Gray World Assumption (trên ảnh màu)
    ├─ [4] Grayscale
    ├─ [5] Shadow Removal: boxBlur background normalization
    ├─ [6] CLAHE: Contrast Limited Adaptive Histogram Equalization
    ├─ [7] Sharpen: Unsharp Mask
    ├─ [8] Adaptive Threshold: Gaussian/Mean/Otsu (integral image)
    └─ [9] Quality Assessment: blur, brightness, resolution, text ratio
           │
           ▼
    Output: { processedBase64, qualityReport }
```

### 8.2 Cấu hình (`PreprocessConfig`)

| Tham số | Mặc định | Mô tả |
|---|---|---|
| `resizeMaxWidth` | 1600 | Chiều rộng tối đa (px) |
| `enableWhiteBalance` | true | Cân bằng trắng |
| `enableShadowRemoval` | true | Khử bóng |
| `shadowKernelSize` | 51 | Kernel size cho blur (phải lẻ) |
| `enableClahe` | true | Tăng tương phản cục bộ |
| `claheClipLimit` | 2.0 | CLAHE clip limit |
| `claheTileGridSize` | 8 | Số tile mỗi chiều |
| `enableSharpen` | true | Làm nét chữ |
| `sharpenAmount` | 0.5 | Mức sharpen (0-1) |
| `thresholdMode` | `adaptive_gaussian` | Chế độ nhị phân hoá |
| `adaptiveC` | 10 | Hằng số lọc nhiễu |
| `blurThreshold` | 80 | Ngưỡng cảnh báo mờ |
| `brightnessLow/High` | 50/220 | Ngưỡng sáng |

### 8.3 Quality Report

```json
{
  "is_good": false,
  "warnings": ["Ảnh bị mờ", "Nét chữ quá nhạt"],
  "blur_score": 45.2,
  "brightness": 120.5,
  "resolution": 800,
  "dark_pixel_ratio": 0.015,
  "text_area_ratio": 0.003
}
```

---

## 9. Tích hợp Gemini API

### 9.1 Cấu hình

```typescript
const GEMINI_MODEL = "gemini-3-flash-preview"
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const generationConfig = {
  temperature: 0.1,       // Ưu tiên chính xác
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
}
```

### 9.2 Luồng gọi API

1. Frontend gửi `imageBase64` + `mimeType` (hoặc `studentText`) đến `/api/grade`
2. Server xây dựng parts: `[GRADING_PROMPT, inline_data]`
3. Gọi Gemini API qua REST (`fetch`)
4. Parse JSON từ response (strip markdown fences nếu có)
5. Trả kết quả + `processingTimeMs` + `tokenCount`

### 9.3 Lưu ý hiện tại

- **Ảnh gửi cho Gemini là ảnh GỐC** (chưa qua tiền xử lý), dù user đang ở tab "Đã xử lý"
- Tab "Đã xử lý" chỉ hiển thị preview + quality report cho giáo viên tham khảo

---

## 10. Frontend Architecture

### 10.1 Routing (App Router)

| Path | Component | Role |
|---|---|---|
| `/` | `page.tsx` | Trang đăng nhập |
| `/register` | `register/page.tsx` | Trang đăng ký |
| `/teacher` | `teacher/page.tsx` | Dashboard giáo viên |
| `/teacher/grade` | `teacher/grade/page.tsx` | Chấm điểm AI |
| `/teacher/reports` | `teacher/reports/page.tsx` | Báo cáo lớp |
| `/teacher/assignments` | `teacher/assignments/` | Quản lý bài tập |
| `/student` | `student/page.tsx` | Dashboard học sinh |
| `/student/history` | `student/history/page.tsx` | Lịch sử điểm |
| `/admin` | `admin/page.tsx` | Dashboard admin |
| `/admin/users` | `admin/users/page.tsx` | Quản lý tài khoản |
| `/admin/classes` | `admin/classes/page.tsx` | Quản lý lớp |

### 10.2 Trang chấm điểm AI (`/teacher/grade`)

Giao diện 2 cột:

**Cột trái — Input:**
- Thông tin học sinh (tên, lớp, tên bài) với autocomplete tên HS theo lớp
- 3 tab nhập liệu:
  - **Ảnh gốc**: Chụp camera / upload / drag-drop
  - **Đã xử lý**: Ảnh qua pipeline + quality report
  - **Nhập text**: Nhập/dán văn bản

**Cột phải — Kết quả:**
- Điểm số + xếp hạng
- Nút lưu vào database
- Nhận xét AI
- Danh sách lỗi chính tả (error → suggestion)
- Văn bản đã sửa / văn bản gốc

### 10.3 Authentication (Client-side)

```
Login → localStorage.setItem("vihand_user", JSON.stringify(user))
Redirect → switch(role) { teacher → /teacher, student → /student, admin → /admin }
Sidebar → đọc localStorage, hiện menu theo role
```

### 10.4 PWA Support

- `manifest.ts`: App manifest cho install trên điện thoại
- `sw.js`: Service Worker cho offline caching
- Viewport: `themeColor: '#22c55e'`

---

## 11. Bảo mật & Xác thực

### 11.1 Trạng thái hiện tại (v1.0)

| Khía cạnh | Hiện trạng |
|---|---|
| Password storage | Plain text (so sánh trực tiếp) |
| Session management | `localStorage` (client-side) |
| API protection | Không có middleware auth |
| RBAC | Client-side routing theo `role` field |

### 11.2 Authorization (RBAC)

| Tài nguyên | Admin | Teacher | Student |
|---|---|---|---|
| Quản lý users/classes | ✅ | ❌ | ❌ |
| Chấm điểm AI | ✅ | ✅ | ❌ |
| Lưu kết quả | ✅ | ✅ | ❌ |
| Xem báo cáo lớp | ✅ | ✅ | ❌ |
| Xem điểm bản thân | ✅ | ✅ | ✅ |

---

## 12. Cấu hình & Biến môi trường

### 12.1 `.env.local`

```bash
# Gemini API
GEMINI_API_KEY=your_gemini_api_key

# Database (SQLite via Prisma)
DATABASE_URL="file:./prisma/vihand.db"
```

### 12.2 Yêu cầu chạy

| Thành phần | Yêu cầu |
|---|---|
| Node.js | 18+ |
| Package manager | npm / pnpm |
| Database | SQLite (tự động, không cần cài) |
| API Key | Google Gemini API Key |

### 12.3 Khởi chạy

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev          # http://localhost:3000
```

---

## 13. Module Python tham khảo (`image_utils.py`)

File `image_utils.py` là module Python/OpenCV **tham khảo** với pipeline tương đương `lib/image-processor.ts`. Có thể dùng độc lập để xử lý ảnh ngoài web:

```bash
pip install opencv-python-headless numpy
python image_utils.py anh_bai_viet.jpg --debug
```

Hỗ trợ: `PreprocessConfig`, debug mode lưu ảnh từng bước, CLI test.

---

## 14. Rủi ro & Phương án dự phòng

| Rủi ro | Xác suất | Phương án |
|---|---|---|
| Gemini API rate limit | Trung bình | Retry, thông báo GV chờ |
| Gemini trả JSON lỗi | Thấp | Strip markdown fences, báo lỗi rõ ràng |
| Ảnh chụp kém chất lượng | Cao | Quality Assessment cảnh báo GV trước khi chấm |
| OCR sai dấu tiếng Việt | Trung bình | GV review kết quả trước khi lưu |
| Mất kết nối Internet | Cao | Thông báo lỗi, GV thử lại |

---

*Tài liệu cập nhật: 2026-05-16 — ViHand Grade v1.0.0*
