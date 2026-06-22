# 📝 ViHand Grade — Đặc Tả Kỹ Thuật

> **Hệ thống Chấm điểm Chính tả Tiếng Việt Thông minh**
> Phiên bản: `v1.2.0` | Cập nhật: 2026-06-17

---

## 1. Tổng quan dự án

### 1.1 Mô tả

**ViHand Grade** là ứng dụng web hỗ trợ giáo viên tiểu học chấm điểm bài chính tả viết tay của học sinh một cách tự động bằng AI. Hệ thống sử dụng kiến trúc Hybrid AI: dùng Gemini API để nhận dạng chữ viết tay tiếng Việt từ ảnh chụp điện thoại (OCR thuần túy) và mô hình ViT5 chạy cục bộ để chấm điểm, sửa lỗi theo barem chi tiết.

### 1.2 Mục tiêu

| Mục tiêu | Chỉ số |
|---|---|
| Thời gian chấm điểm | < 30 giây/bài |
| Độ chính xác OCR | ≥ 90% ký tự tiếng Việt có dấu |
| Kích thước ảnh đầu vào | JPG/PNG/WebP, tối đa 10MB |
| Hỗ trợ tiền xử lý ảnh | Giấy ô ly, bút chì nhạt, ánh sáng lệch, xoay/nghiêng |

### 1.3 Người dùng mục tiêu

| Role | Chức năng chính |
|---|---|
| **Giáo viên** | Upload/chụp ảnh bài viết, xem kết quả AI, lưu điểm, xem báo cáo lớp |
| **Học sinh** | Tra cứu lịch sử điểm và nhận xét |
| **Quản trị viên** | Quản lý tài khoản, lớp học, thống kê hệ thống |

---

## 2. Kiến trúc hệ thống

### 2.1 Sơ đồ tổng thể

```text
┌─────────────────────────────────────────────────────────────┐
│                       Next.js 16 App                        │
│                                                             │
│  ┌────────────┐    ┌─────────────────────────────────────┐  │
│  │  Frontend   │    │            API Routes              │  │
│  │  React 19   │───▶│  /api/auth/login                   │  │
│  │  shadcn/ui  │    │  /api/ocr        → Gemini API      │  │
│  │  Tailwind 4 │    │  /api/grade      → ViT5 (Local)    │  │
│  │             │    │  /api/grades     → Prisma CRUD     │  │
│  └────────────┘    │  /api/preprocess → Image Pipeline  │  │
│                    │  /api/users      → User CRUD       │  │
│                    │  /api/classes    → Class CRUD      │  │
│                    └──────────┬──────────────────────────┘  │
│                               │                             │
│                    ┌──────────▼──────────┐                  │
│                    │     Prisma ORM      │                  │
│                    │ SQLite (vihand.db)  │                  │
│                    └─────────────────────┘                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  lib/image-processor.ts (Jimp)                       │    │
│  │  Pipeline: EXIF → Deskew → WhiteBalance → Grayscale  │    │
│  │           → Shadow → CLAHE → Sharpen → Threshold     │    │
│  └─────────────────────────────────────────────────────┘    │
└────────┬────────────────────────────────┬───────────────────┘
         │ HTTP (Local)                   │ HTTPS
┌────────▼──────────┐            ┌────────▼────────────────┐
│   ViT5 Service    │            │   Google Gemini API     │
│ (Python/FastAPI)  │            │ (gemini-3.1-flash-lite) │
└───────────────────┘            └─────────────────────────┘
```

### 2.2 Luồng xử lý chính (Hybrid Pipeline)

```text
[Giáo viên upload/chụp ảnh]
        │
        ▼
[Tiền xử lý ảnh - POST /api/preprocess]
  ├── EXIF auto-rotate
  ├── Deskew (Chỉnh góc nghiêng)
  ├── White Balance & Grayscale
  ├── Shadow Removal & CLAHE
  ├── Sharpen & Adaptive Threshold
  └── Quality Assessment
        │
        ▼
[Trích xuất văn bản - POST /api/ocr]
  ├── Gửi ảnh (base64) + Prompt OCR thuần túy → Gemini API
  └── Trả về văn bản gốc (Không tự ý sửa lỗi)
        │
        ▼
[Chấm điểm - POST /api/grade]
  ├── Gửi văn bản gốc → ViT5 Python Service (Local)
  ├── ViT5 sửa lỗi + thuật toán Levenshtein so khớp
  ├── (Dự phòng) Nếu ViT5 lỗi → Fallback gọi Gemini
  └── Trả về kết quả: Lỗi chính tả, Điểm số, Nhận xét
        │
        ▼
[Hiển thị & Lưu kết quả - POST /api/grades]
```

---

## 3. Cấu trúc thư mục

```text
Web_sua_loi/
│
├── app/                              # Next.js App Router
│   ├── api/                          # API Routes
│   │   ├── auth/login/route.ts       # Xác thực đăng nhập
│   │   ├── grade/route.ts            # Gọi ViT5 (hoặc Gemini fallback)
│   │   ├── ocr/route.ts              # Gọi Gemini API trích xuất chữ
│   │   ├── grades/route.ts           # CRUD bài chấm
│   │   ├── preprocess/route.ts       # Tiền xử lý ảnh
│   │   ├── users/route.ts            # CRUD người dùng
│   │   └── classes/route.ts          # CRUD lớp học
│   ├── teacher/                      # Giao diện giáo viên
│   ├── student/                      # Giao diện học sinh
│   └── admin/                        # Giao diện quản trị
│
├── components/                       # Giao diện dùng chung (shadcn/ui)
│
├── lib/
│   ├── image-processor.ts            # Pipeline tiền xử lý ảnh (Jimp)
│   ├── prisma.ts                     # Prisma client singleton
│   └── mock-data.ts                  # Dữ liệu mẫu
│
├── prisma/
│   ├── schema.prisma                 # Database schema
│   └── vihand.db                     # SQLite database file
│
├── python_service/                   # ViT5 Engine Service
│   ├── main.py                       # FastAPI server cho ViT5
│   └── requirements.txt
│
├── .env                              # DATABASE_URL, VIT5_SERVICE_URL
├── .env.local                        # GEMINI_API_KEYS (Hỗ trợ nhiều key)
└── ...
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
| `better-sqlite3` | 12.9.0 | SQLite native driver |

### 4.3 AI & Image Processing

| Package | Mục đích |
|---|---|
| `@google/genai` | SDK gọi Gemini API mới |
| `jimp` (v1) | Xử lý ảnh (Jimp + thuật toán pixel-level) |
| Python / FastAPI | Host mô hình ViT5 cục bộ |
| **Gemini Model** | `gemini-3.1-flash-lite` (Dùng cho OCR và Fallback) |
| **ViT5 Model** | `ViT5` (Chấm điểm chính tả, sửa lỗi tiếng Việt) |

---

## 5. Database Schema (Prisma + SQLite)

### 5.1 Model `Grade`

```prisma
model Grade {
  id                String   @id @default(cuid())
  studentName       String                  // Tên học sinh
  assignmentTitle   String                  // Tên bài viết
  className         String   @default("")   // Lớp
  originalText      String                  // Văn bản AI nhận dạng (gốc)
  fixedText         String                  // Văn bản đã sửa lỗi
  corrections       String                  // JSON: danh sách lỗi [{error, suggestion, reason, ...}]
  score             String                  // Điểm dạng "X.X/10"
  scoreNum          Float                   // Điểm số (để sort/filter)
  scoreBreakdown    String   @default("")   // Cấu trúc điểm chi tiết (JSON)
  feedback          String                  // Nhận xét AI
  overallRating     String                  // "Xuất sắc" | "Tốt" | "Khá" | "Trung bình" | "Cần cố gắng"
  processingTimeMs  Int      @default(0)    // Thời gian xử lý (ms)
  tokenCount        Int      @default(0)    // Token đã dùng
  imageBase64       String   @default("")   // Ảnh gốc bài viết (base64)
  createdAt         DateTime @default(now())
}
```

---

## 6. API Endpoints

### 6.1 Authentication
- Trạng thái hiện tại: Mật khẩu dạng plain-text (so sánh trực tiếp), lưu ở `localStorage` phía client.

### 6.2 Hybrid AI Grading Pipeline

| Method | Path | Mô tả |
|---|---|---|
| `POST` | `/api/ocr` | Gọi Gemini API (`gemini-3.1-flash-lite`) để lấy văn bản thuần tuý. |
| `POST` | `/api/grade` | Gửi văn bản tới mô hình ViT5 (Python service). Hỗ trợ cấu hình `penalty_per_error`, `hinh_thuc`, `noi_dung`. Fallback sang Gemini nếu ViT5 chết. |
| `POST` | `/api/preprocess`| Tiền xử lý ảnh với pipeline 9-bước + Deskew. |

### 6.3 Grading Response Schema

```json
{
  "original_text": "văn bản gốc chưa sửa",
  "fixed_text": "văn bản đã sửa hoàn chỉnh",
  "corrections": [
    {
      "error": "từ viết sai",
      "suggestion": "từ đúng",
      "error_type": "phu_am_dau",
      "is_dialect": false,
      "reason": "giải thích ngắn gọn"
    }
  ],
  "score_breakdown": {
    "chinh_ta":  { "raw": 3.0, "max": 4.0, "error_count": 2, "deduction": 1.0 },
    "hinh_thuc": { "raw": 2.5, "max": 3.0, "note": "" },
    "noi_dung":  { "raw": 2.0, "max": 2.0, "note": "" },
    "sang_tao":  { "raw": 0.5, "max": 1.0, "note": "" }
  },
  "score": "8.0/10",
  "overall_rating": "Tốt",
  "feedback": "Nhận xét...",
  "engine": "vit5+levenshtein"
}
```

---

## 7. Logic nghiệp vụ chấm điểm

### 7.1 Barem điểm (Thang 10)

| Tiêu chí | Điểm tối đa | Chi tiết |
|---|---|---|
| Chính tả & Ngữ pháp | 4.0 điểm | Điểm sàn 0đ. Trừ điểm tuỳ chỉnh (Mặc định trừ 0.5đ/lỗi, cấu hình được) |
| Hình thức | 3.0 điểm | Giáo viên có thể nhập điểm thủ công, mặc định tự tính. |
| Nội dung & Ý tưởng | 2.0 điểm | Giáo viên có thể nhập điểm thủ công, mặc định tự tính. |
| Sáng tạo | 1.0 điểm | Đánh giá qua sử dụng từ láy, nhân hoá, so sánh. |

---

## 8. Xử lý hình ảnh (Image Pipeline)

### 8.1 Pipeline (`lib/image-processor.ts`)
Viết hoàn toàn bằng TypeScript + Jimp. Tối ưu chạy nhẹ trên server/edge (VD: Raspberry Pi).

```text
Input: ảnh base64 (JPG/PNG/WebP)
    │
    ├─ [0]   EXIF Auto-rotate
    ├─ [0.5] Deskew (Tự động phát hiện và xoay góc nghiêng)
    ├─ [1]   Resize: max width 1600px
    ├─ [2]   White Balance: Gray World Assumption
    ├─ [3]   Grayscale
    ├─ [4]   Shadow Removal: BoxBlur background normalization
    ├─ [5]   CLAHE: Tăng tương phản cục bộ
    ├─ [6]   Sharpen: Unsharp Mask
    ├─ [7]   Quality Assessment: Kiểm tra độ mờ, vùng sáng tối, vùng chữ
    └─ [8]   Adaptive Threshold (Gaussian/Mean) hoặc Otsu
           │
           ▼
    Output: { processedBase64, qualityReport }
```

---

## 9. Cấu hình & Khởi chạy

### 9.1 `.env.local`

```bash
# Hỗ trợ xoay vòng API Keys (phân tách bằng dấu phẩy)
GEMINI_API_KEYS="key1,key2,key3"

# Dịch vụ ViT5
VIT5_SERVICE_URL="http://localhost:8000"

# Cơ sở dữ liệu
DATABASE_URL="file:./prisma/vihand.db"
```

### 9.2 Khởi chạy toàn bộ hệ thống (Windows)

Dự án cung cấp file `start_all.bat` để tự động khởi chạy cả Next.js và ViT5:

```bash
.\start_all.bat
```
Hoặc thủ công:
1. Chạy ViT5 Service: `cd python_service && uvicorn main:app --port 8000`
2. Chạy Web: `npm run dev`

---

## 10. Rủi ro & Phương án dự phòng

| Rủi ro | Xác suất | Phương án |
|---|---|---|
| ViT5 Service chết/chưa bật | Trung bình | Tự động **fallback sang Gemini** để chấm điểm chữ (`/api/grade`). |
| Gemini API rate limit / 503 | Cao | Hỗ trợ cấu hình nhiều API Key, hệ thống tự động **xoay vòng (rotate)** các key khi cạn Quota. |
| Nhận dạng chữ quá kém | Cao | Pipeline xử lý ảnh + Deskew sẽ dọn dẹp trước. Cảnh báo "Quality Report" trên giao diện. |

---

*Tài liệu cập nhật: 2026-06-17 — ViHand Grade v1.2.0*
