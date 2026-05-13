# 📝 ViHand Grade — Đặc Tả Kỹ Thuật

> **Hệ thống Chấm điểm Chính tả Tiếng Việt Thông minh**  
> Phiên bản: `v1.0.0` | Cập nhật: 2025 | Môi trường triển khai: Raspberry Pi 4

---

## Mục lục

1. [Tổng quan dự án](#1-tổng-quan-dự-án)
2. [Kiến trúc hệ thống](#2-kiến-trúc-hệ-thống)
3. [Cấu trúc thư mục](#3-cấu-trúc-thư-mục)
4. [Tech Stack & Dependencies](#4-tech-stack--dependencies)
5. [Database Schema](#5-database-schema)
6. [API Endpoints](#6-api-endpoints)
7. [Logic nghiệp vụ chấm điểm](#7-logic-nghiệp-vụ-chấm-điểm)
8. [Xử lý hình ảnh (Image Pipeline)](#8-xử-lý-hình-ảnh-image-pipeline)
9. [Tích hợp Gemini API](#9-tích-hợp-gemini-api)
10. [Frontend Architecture](#10-frontend-architecture)
11. [Tối ưu Raspberry Pi 4](#11-tối-ưu-raspberry-pi-4)
12. [Bảo mật & Xác thực](#12-bảo-mật--xác-thực)
13. [Cấu hình triển khai](#13-cấu-hình-triển-khai)
14. [Kế hoạch kiểm thử](#14-kế-hoạch-kiểm-thử)
15. [Rủi ro & Phương án dự phòng](#15-rủi-ro--phương-án-dự-phòng)

---

## 1. Tổng quan dự án

### 1.1 Mô tả

**ViHand Grade** là ứng dụng web hỗ trợ giáo viên tiểu học chấm điểm bài chính tả viết tay của học sinh một cách tự động, chính xác và minh bạch. Hệ thống sử dụng AI đa phương thức (multimodal) để nhận dạng chữ viết tay tiếng Việt từ ảnh chụp và đánh giá theo quy định của Thông tư 27/2020/TT-BGDĐT.

### 1.2 Mục tiêu

| Mục tiêu | Chỉ số đo lường |
|---|---|
| Giảm thời gian chấm điểm | < 30 giây/bài |
| Độ chính xác nhận dạng OCR | ≥ 90% ký tự tiếng Việt có dấu |
| Hỗ trợ đồng thời | ≤ 10 giáo viên/thời điểm trên Pi 4 |
| Uptime mục tiêu | ≥ 99% trong giờ học |
| Kích thước ảnh đầu vào | JPG/PNG, tối đa 10MB |

### 1.3 Người dùng mục tiêu

- **Giáo viên tiểu học**: Tải ảnh, xem kết quả AI, chỉnh sửa và lưu điểm.
- **Học sinh**: Tra cứu lịch sử điểm số và nhận xét.
- **Quản trị viên**: Quản lý tài khoản, xuất báo cáo lớp học.

### 1.4 Phạm vi phiên bản v1.0

- ✅ Nhận dạng và chấm điểm chính tả
- ✅ Dashboard giáo viên
- ✅ Báo cáo điểm học sinh
- ✅ Lưu trữ cục bộ trên Pi
- ❌ Nhận dạng bài toán (v2.0)
- ❌ Ứng dụng mobile native (v2.0)

---

## 2. Kiến trúc hệ thống

### 2.1 Sơ đồ tổng thể

```
┌─────────────────────────────────────────────────────────┐
│                     RASPBERRY PI 4                       │
│                                                         │
│  ┌──────────┐    ┌──────────────┐    ┌───────────────┐ │
│  │  Nginx   │───▶│   Gunicorn   │───▶│   FastAPI     │ │
│  │ :80/:443 │    │  4 workers   │    │   main.py     │ │
│  └──────────┘    └──────────────┘    └───────┬───────┘ │
│        │                                     │         │
│  Static│Files                     ┌──────────▼──────┐  │
│  /static│                         │  Business Logic │  │
│        │               ┌──────────┤  - Grading      │  │
│  ┌─────▼──────┐        │          │  - Image Proc   │  │
│  │  Frontend  │        │          └──────────┬──────┘  │
│  │ HTMX+Tail  │        │                     │         │
│  │ wind+Daisy │   ┌────▼───────┐    ┌────────▼──────┐ │
│  └────────────┘   │  SQLite DB │    │  OpenCV Proc  │ │
│                   │ vihand.db  │    │ image_utils.py│ │
│                   └────────────┘    └───────────────┘ │
└─────────────────────────────┬───────────────────────────┘
                              │ HTTPS (Gemini API)
                    ┌─────────▼─────────┐
                    │  Google Gemini    │
                    │  1.5 Flash API    │
                    └───────────────────┘
```

### 2.2 Luồng xử lý chính (Grading Flow)

```
[Giáo viên upload ảnh]
        │
        ▼
[Nginx nhận request]
        │
        ▼
[FastAPI: validate file (type, size)]
        │
        ▼
[image_utils.py]
  ├── Auto-rotate (EXIF)
  ├── Grayscale conversion
  ├── Binarization (Otsu threshold)
  ├── Deskew (straighten text lines)
  └── Resize → max width 1600px
        │
        ▼
[Gemini 1.5 Flash API]
  ├── Prompt: OCR + extract text
  ├── Prompt: compare with template
  └── Response: JSON {errors[], score, comment}
        │
        ▼
[Grading Engine]
  ├── Apply Thông tư 27 rules
  ├── Deduplicate identical errors
  └── Calculate final score (0–10, integer)
        │
        ▼
[Lưu vào SQLite: grades table]
        │
        ▼
[HTMX: cập nhật UI không reload trang]
```

---

## 3. Cấu trúc thư mục

```
vihand-grade/
│
├── app/                          # Mã nguồn chính
│   ├── __init__.py
│   ├── main.py                   # FastAPI app, routes
│   ├── database.py               # SQLite schema & session
│   ├── models.py                 # Pydantic models (request/response)
│   ├── grading.py                # Logic chấm điểm Thông tư 27
│   ├── image_utils.py            # OpenCV preprocessing pipeline
│   └── gemini_client.py          # Wrapper Gemini API
│
├── templates/                    # Jinja2 templates
│   ├── base.html                 # Layout chung, HTMX CDN
│   ├── login.html                # Đăng nhập
│   ├── teacher/
│   │   ├── dashboard.html        # Trang chủ giáo viên
│   │   ├── upload.html           # Form tải ảnh
│   │   ├── result.html           # Kết quả chấm (HTMX partial)
│   │   └── class_report.html     # Báo cáo tổng lớp
│   └── student/
│       ├── dashboard.html        # Trang học sinh
│       └── grade_history.html    # Bảng lịch sử điểm
│
├── static/                       # Tài nguyên tĩnh (Nginx serve)
│   ├── css/
│   │   └── tailwind.min.css      # Tailwind + DaisyUI (CDN build)
│   ├── js/
│   │   ├── htmx.min.js
│   │   └── app.js                # Custom JS nhỏ
│   └── uploads/                  # Ảnh gốc đã upload (tạm)
│       └── processed/            # Ảnh sau xử lý OpenCV
│
├── tests/
│   ├── test_grading.py
│   ├── test_image_utils.py
│   └── test_api.py
│
├── scripts/
│   ├── setup_pi.sh               # Cài đặt môi trường Pi
│   ├── create_swap.sh            # Tạo swap 1024MB
│   └── backup_db.sh              # Backup SQLite định kỳ
│
├── config/
│   ├── nginx.conf                # Cấu hình Nginx reverse proxy
│   ├── gunicorn.conf.py          # Cấu hình Gunicorn
│   └── systemd/
│       └── vihand.service        # Systemd service file
│
├── .env.example                  # Biến môi trường mẫu
├── .gitignore
├── requirements.txt
├── requirements-pi.txt           # Dependencies tối ưu cho ARM64
└── README.md
```

---

## 4. Tech Stack & Dependencies

### 4.1 Backend

| Package | Phiên bản | Mục đích |
|---|---|---|
| `fastapi` | ≥ 0.111 | Web framework async |
| `uvicorn` | ≥ 0.29 | ASGI server |
| `gunicorn` | ≥ 22.0 | Process manager |
| `python-multipart` | ≥ 0.0.9 | File upload handling |
| `jinja2` | ≥ 3.1 | Template engine |
| `aiosqlite` | ≥ 0.20 | Async SQLite driver |
| `google-generativeai` | ≥ 0.7 | Gemini API SDK |
| `opencv-python-headless` | ≥ 4.9 | Image processing (no GUI) |
| `Pillow` | ≥ 10.3 | Image format handling |
| `python-jose` | ≥ 3.3 | JWT authentication |
| `passlib[bcrypt]` | ≥ 1.7 | Password hashing |
| `pydantic` | ≥ 2.7 | Data validation |
| `python-dotenv` | ≥ 1.0 | Environment config |
| `httpx` | ≥ 0.27 | Async HTTP client |

### 4.2 Frontend (No-Build, CDN)

| Resource | Cách dùng |
|---|---|
| HTMX `2.x` | `<script src="/static/js/htmx.min.js">` |
| Tailwind CSS `3.x` | CDN build hoặc pre-built file |
| DaisyUI `4.x` | Component library trên Tailwind |
| Alpine.js `3.x` | Micro-interactions (optional) |

### 4.3 Infrastructure (Raspberry Pi)

| Thành phần | Chi tiết |
|---|---|
| OS | Raspberry Pi OS Lite 64-bit (Bookworm) |
| Python | 3.11+ |
| Nginx | 1.24+ |
| SQLite | 3.40+ (built-in) |
| RAM | 4GB (Pi 4) |
| Swap | 1024MB (file-based) |
| Storage | MicroSD ≥ 32GB Class 10 + USB SSD backup |

---

## 5. Database Schema

### 5.1 Thiết kế tổng quan

Database: `vihand.db` (SQLite), lưu tại `/opt/vihand-grade/data/vihand.db`

### 5.2 Bảng `users`

```sql
CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username    TEXT    NOT NULL UNIQUE,
    full_name   TEXT    NOT NULL,
    role        TEXT    NOT NULL CHECK(role IN ('teacher', 'student', 'admin')),
    password    TEXT    NOT NULL,            -- bcrypt hash
    class_id    INTEGER REFERENCES classes(id),
    is_active   BOOLEAN NOT NULL DEFAULT 1,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
```

### 5.3 Bảng `classes`

```sql
CREATE TABLE IF NOT EXISTS classes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL UNIQUE,     -- VD: "4A", "5B"
    grade_level INTEGER NOT NULL CHECK(grade_level BETWEEN 1 AND 5),
    teacher_id  INTEGER REFERENCES users(id),
    school_year TEXT    NOT NULL,            -- VD: "2024-2025"
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 5.4 Bảng `assignments`

```sql
CREATE TABLE IF NOT EXISTS assignments (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    title           TEXT    NOT NULL,
    template_text   TEXT    NOT NULL,        -- Văn bản mẫu để so sánh
    class_id        INTEGER NOT NULL REFERENCES classes(id),
    teacher_id      INTEGER NOT NULL REFERENCES users(id),
    subject         TEXT    NOT NULL DEFAULT 'chinh_ta',
    max_score       INTEGER NOT NULL DEFAULT 10,
    deadline        DATETIME,
    instructions    TEXT,                    -- Hướng dẫn thêm cho GV
    is_active       BOOLEAN NOT NULL DEFAULT 1,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_assignments_class ON assignments(class_id);
CREATE INDEX idx_assignments_teacher ON assignments(teacher_id);
```

### 5.5 Bảng `submissions`

```sql
CREATE TABLE IF NOT EXISTS submissions (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id       INTEGER NOT NULL REFERENCES assignments(id),
    student_id          INTEGER NOT NULL REFERENCES users(id),
    image_original_path TEXT    NOT NULL,    -- Đường dẫn ảnh gốc
    image_processed_path TEXT,              -- Đường dẫn ảnh sau xử lý
    image_size_kb       INTEGER,            -- Kích thước file gốc (KB)
    uploaded_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
    status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK(status IN ('pending','processing','graded','error'))
);

CREATE INDEX idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX idx_submissions_student ON submissions(student_id);
CREATE INDEX idx_submissions_status ON submissions(status);
```

### 5.6 Bảng `grades`

```sql
CREATE TABLE IF NOT EXISTS grades (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id       INTEGER NOT NULL UNIQUE REFERENCES submissions(id),
    student_id          INTEGER NOT NULL REFERENCES users(id),
    assignment_id       INTEGER NOT NULL REFERENCES assignments(id),

    -- Kết quả AI
    ai_recognized_text  TEXT,               -- Văn bản OCR từ Gemini
    ai_errors_json      TEXT,               -- JSON: danh sách lỗi chi tiết
    ai_score            INTEGER,            -- Điểm AI đề xuất (0-10)
    ai_comment          TEXT,               -- Nhận xét AI

    -- Kết quả sau khi GV chỉnh sửa
    final_score         INTEGER NOT NULL,   -- Điểm cuối cùng (0-10)
    teacher_comment     TEXT,               -- Nhận xét của giáo viên
    is_ai_modified      BOOLEAN DEFAULT 0, -- GV có sửa điểm AI không?

    -- Metadata xử lý
    gemini_model        TEXT DEFAULT 'gemini-1.5-flash',
    processing_time_ms  INTEGER,            -- Thời gian xử lý (ms)
    token_count         INTEGER,            -- Số token đã dùng

    graded_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_grades_student ON grades(student_id);
CREATE INDEX idx_grades_assignment ON grades(assignment_id);
CREATE INDEX idx_grades_score ON grades(final_score);
```

### 5.7 Bảng `error_types` (Lookup)

```sql
CREATE TABLE IF NOT EXISTS error_types (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    code            TEXT NOT NULL UNIQUE,   -- VD: "am_dau", "van", "thanh"
    name_vi         TEXT NOT NULL,          -- VD: "Lỗi âm đầu"
    deduction       REAL NOT NULL,          -- Điểm trừ: 1.0 hoặc 0.5
    applies_to_grade TEXT DEFAULT 'all'    -- "all", "4-5" (lớp 4 và 5)
);

-- Dữ liệu mặc định
INSERT INTO error_types (code, name_vi, deduction, applies_to_grade) VALUES
    ('am_dau',      'Lỗi âm đầu',              1.0, 'all'),
    ('van',         'Lỗi vần',                 1.0, 'all'),
    ('thanh',       'Lỗi thanh điệu',          1.0, 'all'),
    ('viet_hoa',    'Lỗi viết hoa',            0.5, '4-5'),
    ('dau_cau',     'Lỗi dấu câu',             0.5, '4-5');
```

### 5.8 Entity Relationship Diagram

```
classes ──────< assignments ──────< submissions ──────── grades
   │                                     │                 │
   └── users(teacher)                users(student)   error_types
            │
         users(student) >──── classes
```

---

## 6. API Endpoints

### 6.1 Authentication

| Method | Path | Mô tả | Auth |
|---|---|---|---|
| `POST` | `/auth/login` | Đăng nhập, trả về JWT | ❌ |
| `POST` | `/auth/logout` | Xóa session | ✅ |
| `GET` | `/auth/me` | Thông tin user hiện tại | ✅ |

### 6.2 Teacher Endpoints

| Method | Path | Mô tả | Auth |
|---|---|---|---|
| `GET` | `/teacher/dashboard` | Trang chủ giáo viên | ✅ Teacher |
| `GET` | `/teacher/assignments` | Danh sách bài tập | ✅ Teacher |
| `POST` | `/teacher/assignments` | Tạo bài tập mới | ✅ Teacher |
| `GET` | `/teacher/assignments/{id}` | Chi tiết bài tập | ✅ Teacher |
| `POST` | `/teacher/grade` | Upload ảnh + chấm điểm | ✅ Teacher |
| `PUT` | `/teacher/grades/{id}` | Sửa điểm/nhận xét | ✅ Teacher |
| `GET` | `/teacher/class-report` | Báo cáo tổng lớp | ✅ Teacher |
| `GET` | `/teacher/export/csv` | Xuất điểm CSV | ✅ Teacher |

### 6.3 Student Endpoints

| Method | Path | Mô tả | Auth |
|---|---|---|---|
| `GET` | `/student/dashboard` | Trang học sinh | ✅ Student |
| `GET` | `/student/grades` | Lịch sử điểm (HTMX partial) | ✅ Student |
| `GET` | `/student/grades/{id}` | Chi tiết bài đã chấm | ✅ Student |

### 6.4 Admin Endpoints

| Method | Path | Mô tả | Auth |
|---|---|---|---|
| `GET` | `/admin/users` | Quản lý người dùng | ✅ Admin |
| `POST` | `/admin/users` | Tạo tài khoản | ✅ Admin |
| `POST` | `/admin/users/bulk` | Import danh sách CSV | ✅ Admin |
| `DELETE` | `/admin/users/{id}` | Vô hiệu hóa tài khoản | ✅ Admin |
| `GET` | `/admin/system-stats` | Thống kê hệ thống Pi | ✅ Admin |

### 6.5 Response Format chuẩn

```json
// Thành công
{
  "status": "success",
  "data": { ... },
  "message": null
}

// Lỗi
{
  "status": "error",
  "data": null,
  "message": "Mô tả lỗi",
  "error_code": "INVALID_IMAGE_FORMAT"
}
```

### 6.6 Grading Response Schema

```json
{
  "status": "success",
  "data": {
    "grade_id": 42,
    "recognized_text": "Con chim hót trên cành cây xanh...",
    "errors": [
      {
        "position": 12,
        "original": "hót",
        "expected": "hót",
        "error_type": "thanh",
        "error_name": "Lỗi thanh điệu",
        "deduction": 1.0,
        "is_duplicate": false
      }
    ],
    "error_count": {
      "total": 3,
      "unique": 2,
      "am_dau": 1,
      "van": 0,
      "thanh": 1,
      "viet_hoa": 1,
      "dau_cau": 0
    },
    "ai_score": 7,
    "final_score": 7,
    "ai_comment": "Bài viết tương đối tốt, cần chú ý thanh điệu.",
    "processing_time_ms": 2340,
    "token_count": 512
  }
}
```

---

## 7. Logic nghiệp vụ chấm điểm

### 7.1 Căn cứ pháp lý

Áp dụng theo **Thông tư 27/2020/TT-BGDĐT** của Bộ Giáo dục và Đào tạo về đánh giá học sinh tiểu học.

### 7.2 Quy tắc trừ điểm

```python
GRADING_RULES = {
    "base_score": 10,
    "errors": {
        "am_dau":  {"deduction": 1.0, "applies_to": [1, 2, 3, 4, 5]},
        "van":     {"deduction": 1.0, "applies_to": [1, 2, 3, 4, 5]},
        "thanh":   {"deduction": 1.0, "applies_to": [1, 2, 3, 4, 5]},
        "viet_hoa":{"deduction": 0.5, "applies_to": [4, 5]},  # Chỉ lớp 4-5
        "dau_cau": {"deduction": 0.5, "applies_to": [4, 5]},  # Chỉ lớp 4-5
    },
    "dedup_rule": True,    # Lỗi giống nhau hoàn toàn chỉ trừ 1 lần
    "min_score": 0,        # Điểm tối thiểu
    "round_to_int": True,  # Không có điểm thập phân
}
```

### 7.3 Pseudocode tính điểm

```python
def calculate_score(errors: list[Error], grade_level: int) -> int:
    """
    errors: Danh sách lỗi từ Gemini
    grade_level: Lớp học (1-5)
    Returns: Điểm nguyên từ 0-10
    """
    base = 10
    seen_errors = set()  # Để dedup

    for error in errors:
        rule = GRADING_RULES["errors"][error.type]

        # Kiểm tra có áp dụng cho lớp này không
        if grade_level not in rule["applies_to"]:
            continue

        # Tạo key dedup: (loại lỗi + từ bị lỗi)
        dedup_key = f"{error.type}:{error.original.lower()}"

        if dedup_key in seen_errors:
            error.is_duplicate = True
            continue  # Bỏ qua lỗi trùng lặp

        seen_errors.add(dedup_key)
        base -= rule["deduction"]

    # Clamp về khoảng [0, 10] và làm tròn xuống
    return max(0, int(base))
```

### 7.4 Phân loại xếp hạng

| Điểm | Xếp loại | Màu hiển thị | Emoji |
|---|---|---|---|
| 9 – 10 | Hoàn thành tốt | Xanh lá (`#22c55e`) | 🌟 |
| 7 – 8 | Hoàn thành | Xanh dương (`#3b82f6`) | 👍 |
| 5 – 6 | Hoàn thành (cần cố gắng) | Vàng (`#f59e0b`) | 📝 |
| 0 – 4 | Chưa hoàn thành | Đỏ (`#ef4444`) | 💪 |

---

## 8. Xử lý hình ảnh (Image Pipeline)

### 8.1 Pipeline OpenCV (`image_utils.py`)

```
Input: raw image file (JPG/PNG, ≤10MB)
    │
    ├─ [1] Validate: kiểm tra định dạng, kích thước
    │
    ├─ [2] Auto-rotate: đọc EXIF orientation, xoay về đúng chiều
    │
    ├─ [3] Grayscale: cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    │
    ├─ [4] Noise reduction: cv2.GaussianBlur (kernel 3x3, nhẹ)
    │
    ├─ [5] Binarization: cv2.threshold với Otsu's method
    │       → thresh_type: cv2.THRESH_BINARY + cv2.THRESH_OTSU
    │
    ├─ [6] Deskew: tính góc nghiêng qua HoughLines, xoay chỉnh
    │       → Giới hạn góc chỉnh: ±15 độ (tránh xoay quá mức)
    │
    ├─ [7] Resize: max width = 1600px, giữ aspect ratio
    │       → cv2.resize với INTER_LANCZOS4
    │
    ├─ [8] Save processed: lưu vào /static/uploads/processed/
    │       → Format: JPEG quality=85, tiết kiệm băng thông
    │
    └─ [9] Encode Base64: để gửi qua Gemini API
           → Giải phóng bộ nhớ numpy array ngay sau bước này
```

### 8.2 Giới hạn xử lý

| Tham số | Giá trị | Lý do |
|---|---|---|
| Max input size | 10 MB | Tránh RAM overflow trên Pi |
| Output width | 1600 px | Đủ để Gemini nhận dạng rõ |
| JPEG quality | 85% | Cân bằng chất lượng/băng thông |
| Max deskew angle | ±15° | Tránh xử lý ảnh sai |
| Timeout | 10 giây | Tránh treo process |

### 8.3 Quản lý bộ nhớ

```python
# Quan trọng: Giải phóng ngay sau khi dùng xong
img_array = cv2.imread(path)
processed = process_pipeline(img_array)
del img_array          # Giải phóng ảnh gốc
b64_data = encode_base64(processed)
del processed          # Giải phóng ảnh đã xử lý
gc.collect()           # Gợi ý Python GC
```

---

## 9. Tích hợp Gemini API

### 9.1 Cấu hình

```python
MODEL = "gemini-1.5-flash"
GENERATION_CONFIG = {
    "temperature": 0.1,       # Ưu tiên độ chính xác hơn sáng tạo
    "top_p": 0.95,
    "top_k": 40,
    "max_output_tokens": 2048,
    "response_mime_type": "application/json",  # Bắt buộc JSON output
}
```

### 9.2 System Prompt

```
Bạn là hệ thống chấm điểm chính tả tiếng Việt cho học sinh tiểu học.
Nhiệm vụ: Nhận dạng chữ viết tay trong ảnh và so sánh với văn bản mẫu.

Quy tắc:
1. Nhận dạng chính xác từng từ, kể cả dấu thanh tiếng Việt
2. Phân biệt rõ 5 loại lỗi: am_dau, van, thanh, viet_hoa, dau_cau
3. Chỉ đánh lỗi khi khác biệt rõ ràng, không phạt nét chữ xấu
4. Trả về đúng định dạng JSON, không thêm text bên ngoài JSON
```

### 9.3 User Prompt Template

```
Văn bản mẫu:
---
{template_text}
---

Hãy nhận dạng toàn bộ chữ viết trong ảnh và so sánh với văn bản mẫu trên.

Trả về JSON với cấu trúc sau:
{
  "recognized_text": "toàn bộ văn bản nhận dạng được",
  "errors": [
    {
      "position": <vị trí từ, đếm từ 1>,
      "original": "<từ học sinh viết>",
      "expected": "<từ đúng trong mẫu>",
      "error_type": "<am_dau|van|thanh|viet_hoa|dau_cau>",
      "context": "<câu chứa lỗi>"
    }
  ],
  "overall_comment": "<nhận xét ngắn gọn bằng tiếng Việt, thân thiện với học sinh>"
}
```

### 9.4 Error Handling & Retry

```python
MAX_RETRIES = 3
RETRY_DELAY = [1, 2, 4]   # Exponential backoff (giây)

# Các trường hợp cần xử lý:
RECOVERABLE_ERRORS = [
    "RATE_LIMIT_EXCEEDED",    # Retry sau delay
    "SERVICE_UNAVAILABLE",    # Retry
    "TIMEOUT",                # Retry
]
NON_RECOVERABLE = [
    "INVALID_API_KEY",        # Alert admin
    "IMAGE_TOO_LARGE",        # Báo lỗi cho GV
    "CONTENT_FILTERED",       # Ảnh không phù hợp
]
```

### 9.5 Chi phí token ước tính

| Thành phần | Token ước tính |
|---|---|
| System prompt | ~150 tokens |
| User prompt + template | ~200 tokens |
| Ảnh 1600px (vision) | ~500–800 tokens |
| Response JSON | ~300–500 tokens |
| **Tổng/bài** | **~1150–1650 tokens** |

---

## 10. Frontend Architecture

### 10.1 Layout hệ thống

```
base.html (layout chung)
├── Navbar: logo, user info, logout
├── Sidebar: menu điều hướng
└── main: nội dung theo role

Teacher view:
├── Dashboard: stats cards (tổng bài, trung bình điểm)
├── Upload Form: drag-drop zone (HTMX)
│   └── hx-post="/teacher/grade"
│       hx-target="#result-container"
│       hx-swap="innerHTML"
├── Result Partial: hiện kết quả AI
│   ├── Bảng lỗi
│   ├── Input sửa điểm/nhận xét
│   └── Nút "Lưu điểm"
└── Class Report: bảng điểm cả lớp

Student view:
├── Dashboard: điểm gần nhất, thống kê
└── Grade History: bảng lịch sử (HTMX infinite scroll)
```

### 10.2 HTMX Key Interactions

```html
<!-- Upload và chấm điểm không reload -->
<form hx-post="/teacher/grade"
      hx-target="#result-section"
      hx-swap="innerHTML"
      hx-indicator="#loading-spinner"
      enctype="multipart/form-data">

<!-- Cập nhật điểm inline -->
<button hx-put="/teacher/grades/{{grade.id}}"
        hx-include="[name='final_score'],[name='comment']"
        hx-target="#grade-row-{{grade.id}}"
        hx-swap="outerHTML">
  Lưu điểm
</button>

<!-- Load thêm lịch sử (Infinite scroll) -->
<tr hx-get="/student/grades?page={{next_page}}"
    hx-trigger="revealed"
    hx-swap="afterend">
```

### 10.3 Color System (CSS Variables)

```css
:root {
  --color-primary:    #4ade80;   /* Xanh lá pastel */
  --color-secondary:  #60a5fa;   /* Xanh dương pastel */
  --color-accent:     #fbbf24;   /* Vàng ấm */
  --color-success:    #22c55e;
  --color-warning:    #f59e0b;
  --color-error:      #ef4444;
  --color-base-100:   #fefce8;   /* Nền vàng kem nhẹ */
  --color-base-200:   #f0fdf4;   /* Nền xanh cực nhạt */
  --font-display:     'Nunito', sans-serif;   /* Thân thiện, tròn */
  --font-body:        'Be Vietnam Pro', sans-serif;
}
```

---

## 11. Tối ưu Raspberry Pi 4

### 11.1 Gunicorn Configuration (`gunicorn.conf.py`)

```python
# gunicorn.conf.py
import multiprocessing

# Số CPU cores của Pi 4 = 4
workers = multiprocessing.cpu_count()          # = 4
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 50          # Tối đa kết nối mỗi worker
max_requests = 500               # Restart worker sau 500 request (chống memory leak)
max_requests_jitter = 50
timeout = 60                     # Timeout cho Gemini API call
graceful_timeout = 30
keepalive = 5

# Memory
worker_tmp_dir = "/dev/shm"      # Dùng RAM disk cho tmp files

# Logging
accesslog = "/var/log/vihand/access.log"
errorlog = "/var/log/vihand/error.log"
loglevel = "warning"             # Giảm log I/O
```

### 11.2 Nginx Configuration (`nginx.conf`)

```nginx
server {
    listen 80;
    server_name vihand.local;

    # Serve static files trực tiếp (không qua Python)
    location /static/ {
        alias /opt/vihand-grade/static/;
        expires 7d;
        add_header Cache-Control "public, immutable";
        gzip on;
        gzip_types text/css application/javascript;
    }

    # Proxy sang Gunicorn
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;

        # Quan trọng cho Pi: giới hạn upload size
        client_max_body_size 10M;

        # Buffer để tránh nghẽn kết nối chậm (WiFi trường học)
        proxy_buffering on;
        proxy_buffer_size 8k;
        proxy_buffers 16 8k;
        proxy_busy_buffers_size 64k;
    }
}
```

### 11.3 Swap File Setup (`create_swap.sh`)

```bash
#!/bin/bash
# Tạo swap 1024MB cho Pi 4
SWAP_FILE="/swapfile"
SWAP_SIZE=1024  # MB

sudo fallocate -l ${SWAP_SIZE}M $SWAP_FILE
sudo chmod 600 $SWAP_FILE
sudo mkswap $SWAP_FILE
sudo swapon $SWAP_FILE

# Thêm vào /etc/fstab để tự động mount khi khởi động
echo "$SWAP_FILE none swap sw 0 0" | sudo tee -a /etc/fstab

# Tối ưu swappiness cho server (ưu tiên RAM hơn swap)
echo "vm.swappiness=10" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### 11.4 Systemd Service (`vihand.service`)

```ini
[Unit]
Description=ViHand Grade - Vietnamese Handwriting Grader
After=network.target

[Service]
Type=notify
User=vihand
Group=vihand
WorkingDirectory=/opt/vihand-grade
Environment="PATH=/opt/vihand-grade/venv/bin"
EnvironmentFile=/opt/vihand-grade/.env
ExecStart=/opt/vihand-grade/venv/bin/gunicorn \
    -c /opt/vihand-grade/config/gunicorn.conf.py \
    app.main:app
ExecReload=/bin/kill -s HUP $MAINPID
Restart=on-failure
RestartSec=5s

# Giới hạn tài nguyên để tránh sập toàn bộ Pi
MemoryMax=1.5G
CPUQuota=90%

[Install]
WantedBy=multi-user.target
```

### 11.5 Biến môi trường (`.env`)

```bash
# Gemini API
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-1.5-flash

# App
SECRET_KEY=your_random_secret_key_64chars
APP_ENV=production
DEBUG=false
BASE_URL=http://vihand.local

# Database
DATABASE_URL=sqlite:////opt/vihand-grade/data/vihand.db

# Upload limits
MAX_UPLOAD_SIZE_MB=10
UPLOAD_DIR=/opt/vihand-grade/static/uploads

# Session
ACCESS_TOKEN_EXPIRE_MINUTES=480   # 8 tiếng (1 ngày học)
```

---

## 12. Bảo mật & Xác thực

### 12.1 Authentication Flow

```
1. User POST /auth/login {username, password}
2. Server: verify bcrypt hash
3. Server: issue JWT (exp: 8 giờ)
4. Client: lưu JWT trong HttpOnly Cookie (không dùng localStorage)
5. Mỗi request: server verify JWT từ cookie
6. HTMX requests: cookie tự động đính kèm
```

### 12.2 Authorization (RBAC)

| Tài nguyên | Admin | Teacher | Student |
|---|---|---|---|
| Quản lý users | ✅ | ❌ | ❌ |
| Tạo/xem assignments | ✅ | ✅ (của mình) | ❌ |
| Upload & chấm điểm | ✅ | ✅ | ❌ |
| Sửa điểm | ✅ | ✅ (của mình) | ❌ |
| Xem điểm của mình | ✅ | ✅ | ✅ |
| Xuất báo cáo | ✅ | ✅ (lớp mình) | ❌ |

### 12.3 Input Validation

```python
# Pydantic model cho upload
class GradeRequest(BaseModel):
    assignment_id: int
    student_id: int
    template_text: str = Field(..., min_length=10, max_length=2000)

# File validation trong FastAPI
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

async def validate_image(file: UploadFile):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(400, "Chỉ chấp nhận JPG, PNG, WebP")
    content = await file.read(MAX_FILE_SIZE + 1)
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(413, "File quá lớn (tối đa 10MB)")
    return content
```

---

## 13. Cấu hình triển khai

### 13.1 Yêu cầu phần cứng

| Thành phần | Tối thiểu | Khuyến nghị |
|---|---|---|
| Raspberry Pi | Pi 4 - 4GB | Pi 4 - 8GB |
| MicroSD | 32GB Class 10 | 64GB A2 |
| Storage phụ | Không | USB SSD 128GB (backup) |
| Kết nối mạng | LAN/WiFi | LAN (ổn định hơn) |
| Nguồn điện | 5V/3A USB-C | Pi Official Power Supply |

### 13.2 Quy trình cài đặt (`setup_pi.sh`)

```bash
#!/bin/bash
# 1. Cập nhật hệ thống
sudo apt update && sudo apt upgrade -y

# 2. Cài Python dependencies
sudo apt install -y python3.11 python3.11-venv \
    libopencv-dev python3-opencv \
    nginx sqlite3 git

# 3. Tạo user riêng cho app
sudo useradd -r -s /bin/false vihand
sudo mkdir -p /opt/vihand-grade
sudo chown vihand:vihand /opt/vihand-grade

# 4. Setup virtual environment
python3.11 -m venv /opt/vihand-grade/venv
source /opt/vihand-grade/venv/bin/activate
pip install -r requirements-pi.txt

# 5. Khởi tạo database
python -c "from app.database import init_db; init_db()"

# 6. Cài Nginx & systemd
sudo cp config/nginx.conf /etc/nginx/sites-available/vihand
sudo ln -s /etc/nginx/sites-available/vihand /etc/nginx/sites-enabled/
sudo cp config/systemd/vihand.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable vihand nginx
sudo systemctl start vihand nginx
```

### 13.3 Backup Strategy

```bash
# Chạy hàng ngày qua cron: 23:00
# backup_db.sh
BACKUP_DIR="/backup/vihand"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
sqlite3 /opt/vihand-grade/data/vihand.db ".backup '$BACKUP_DIR/vihand_$DATE.db'"

# Giữ tối đa 30 bản backup
ls -t $BACKUP_DIR/*.db | tail -n +31 | xargs rm -f

# Sync sang USB nếu có
if [ -d "/media/vihand/backup" ]; then
    rsync -a $BACKUP_DIR/ /media/vihand/backup/
fi
```

---

## 14. Kế hoạch kiểm thử

### 14.1 Unit Tests

| Module | Test Cases |
|---|---|
| `grading.py` | Tính điểm đúng, dedup lỗi, clamp 0-10, quy tắc theo lớp |
| `image_utils.py` | Resize đúng kích thước, xử lý ảnh hỏng, giải phóng bộ nhớ |
| `gemini_client.py` | Mock API response, retry logic, parse JSON lỗi |
| `database.py` | CRUD operations, foreign key constraints |

### 14.2 Integration Tests

```python
# test_api.py - test flow hoàn chỉnh
async def test_full_grading_flow():
    # 1. Login
    token = await login("teacher01", "password")
    
    # 2. Upload ảnh test
    with open("tests/fixtures/sample_chinh_ta.jpg", "rb") as f:
        response = await client.post("/teacher/grade",
            files={"image": f},
            data={"assignment_id": 1},
            headers={"Authorization": f"Bearer {token}"}
        )
    
    assert response.status_code == 200
    data = response.json()["data"]
    assert "final_score" in data
    assert 0 <= data["final_score"] <= 10
```

### 14.3 Performance Tests (Raspberry Pi)

| Kịch bản | Chỉ số mục tiêu |
|---|---|
| 1 request chấm điểm | < 30 giây (bao gồm Gemini API) |
| 4 request đồng thời | < 45 giây cho tất cả |
| 10 request liên tiếp | RAM < 1.5GB, không swap quá 200MB |
| Cold start app | < 10 giây |

---

## 15. Rủi ro & Phương án dự phòng

| Rủi ro | Xác suất | Tác động | Phương án |
|---|---|---|---|
| Mất kết nối Internet (không gọi được Gemini API) | Cao | Cao | Cache kết quả, hàng đợi xử lý khi có mạng trở lại |
| Gemini API rate limit | Trung bình | Trung bình | Retry exponential backoff, thông báo GV chờ |
| Pi quá nhiệt (>80°C) | Thấp | Cao | Giám sát nhiệt độ, tự giảm workers, cảnh báo admin |
| MicroSD hỏng | Thấp | Rất Cao | Backup tự động hàng ngày ra USB SSD |
| Gemini nhận dạng sai | Trung bình | Trung bình | GV chỉnh sửa được kết quả trước khi lưu |
| RAM đầy | Thấp | Cao | Swap 1GB + giới hạn MemoryMax trong systemd |

---

## Phụ lục

### A. Mẫu file `requirements.txt`

```
fastapi>=0.111.0
uvicorn[standard]>=0.29.0
gunicorn>=22.0.0
python-multipart>=0.0.9
jinja2>=3.1.4
aiosqlite>=0.20.0
google-generativeai>=0.7.0
opencv-python-headless>=4.9.0.80
Pillow>=10.3.0
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4
pydantic>=2.7.0
python-dotenv>=1.0.1
httpx>=0.27.0
```

### B. Checklist trước khi go-live

- [ ] Đã tạo swap 1024MB
- [ ] Đã cấu hình `.env` với API key thật
- [ ] Đã chạy `init_db()` và có dữ liệu mẫu
- [ ] Đã test upload ảnh thực tế từ điện thoại
- [ ] Nginx phục vụ được static files
- [ ] Systemd service tự khởi động sau reboot
- [ ] Cron job backup đã hoạt động
- [ ] Tài khoản admin mặc định đã đổi mật khẩu
- [ ] Đã test trên ít nhất 20 bài chính tả thực tế
- [ ] GV đã được hướng dẫn sử dụng

---

*Tài liệu này được tạo cho dự án ViHand Grade — Phiên bản 1.0.0*  
*Liên hệ kỹ thuật: [developer@vihandgrade.edu.vn](mailto:developer@vihandgrade.edu.vn)*
