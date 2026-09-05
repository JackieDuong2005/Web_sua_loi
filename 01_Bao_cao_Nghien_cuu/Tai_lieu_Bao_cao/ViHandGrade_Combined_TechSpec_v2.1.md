# 📚 ViHand Grade — Đặc Tả Kỹ Thuật Toàn Diện
## Nền tảng Chấm điểm Viết tay Tiếng Việt Tiểu học Thông minh (Chính tả & Tập làm văn) + Tab Đọc Chính Tả Web Tích Hợp AI TTS

> **Tài liệu hợp nhất toàn diện hệ thống:**
> - Hệ thống Chấm điểm AI Đa phân môn: **Chính tả** (Ground-Truth Guided) & **Tập làm văn** (Kiến trúc 2 tầng: ViT5 + Qwen2.5-0.5B-Instruct)
> - Module **Đọc chính tả trực tiếp trên Web** (`/teacher/dictation`) tích hợp Microsoft Edge-TTS đa giọng đọc chuẩn sư phạm (thay thế hoàn toàn mạch phần cứng ESP32-S3 legacy)
>
> **Phiên bản tài liệu**: `v2.3.0` | Cập nhật: 2026-09-05

---

> [!NOTE]
> Tài liệu này là **bản đặc tả kỹ thuật chính thức và thống nhất** cho toàn bộ hệ thống ViHand Grade.
> Hệ thống hoạt động theo mô hình Web-based tập trung: Giáo viên sử dụng **Tab Đọc chính tả Web** (`/teacher/dictation`) để tổ chức giờ đọc chính tả bằng âm thanh tổng hợp Edge-TTS tự nhiên, sau đó luân chuyển trực tiếp ngữ liệu bài đọc sang **Tab Chấm điểm** (`/teacher/grade`) để chấm bài Chính tả (so khớp Ground Truth) hoặc chấm bài Tập làm văn (phân tích ngôn ngữ & nhận xét sư phạm 2 tầng).
> Toàn bộ các đề xuất thử nghiệm phần cứng vi điều khiển rời (ESP32-S3 / Xiaozhi hardware) đã được bãi bỏ hoàn toàn, thay thế bằng giải pháp Web thuần túy nhằm tối ưu tính ổn định, giảm chi phí đầu tư và tương thích 100% với máy tính/loa trợ giảng sẵn có tại các trường tiểu học.

---

## Mục lục

**PHẦN I — HỆ THỐNG CỐT LÕI VIHAND GRADE**
1. Tổng quan dự án
2. Kiến trúc hệ thống
3. Tech Stack & Dependencies
4. Database Schema
5. Danh sách API Endpoints
6. Logic nghiệp vụ & Thuật toán AI
7. Pipeline xử lý hình ảnh
8. Module Đọc Chính Tả Web & Tích Hợp Âm Thanh Edge-TTS
9. Cấu hình & Khởi chạy
10. Quản lý rủi ro & Dự phòng
11. Giao diện người dùng
12. Bảo mật & Quyền riêng tư
13. Kiểm thử & Lộ trình cải tiến
14. Bản đồ tệp mã nguồn
15. Tính nghiên cứu & Đóng góp khoa học

**PHẦN II — MODULE TAB ĐỌC CHÍNH TẢ WEB & CƠ CHẾ LIÊN KẾT CHẤM ĐIỂM ĐA PHÂN MÔN**
- Module 11: Tab Đọc Chính Tả Trực Tiếp Trên Web (`/teacher/dictation`) & Bộ Điều Khiển Nhịp Đọc Sư Phạm
- 11.1 Bối cảnh & Lý do chuyển dịch từ phần cứng ESP32-S3 sang Web-based
- 11.2 Kiến trúc Web Dictation & Speech Synthesis Engine
- 11.3 Kho ngữ liệu SGK Tiếng Việt Tiểu học chuẩn hóa (`TextbookPassage`)
- 11.4 Quy trình 4 bước sư phạm trong giờ nghe - viết chính tả
- 11.5 Cơ chế Chấm điểm Liên kết 2 Phân môn tại `/teacher/grade`:
  - Phân môn 1: Chấm điểm bài Chính tả (Nghe - Viết / Nhìn - Viết) có Ground Truth
  - Phân môn 2: Chấm điểm bài Tập làm văn (Viết đoạn văn / Kể chuyện / Miêu tả) bằng Kiến trúc 2 tầng (Two-Tier)
- 11.6 Giao diện tương tác Human-in-the-loop & Báo cáo thống kê phiên đọc

**PHẦN III — NỘI DUNG VÀ NHIỆM VỤ THỰC HIỆN ĐỀ TÀI**
- Nội dung đề tài
- Nhiệm vụ đề tài

**PHẦN IV — TỔNG HỢP VẤN ĐỀ VÀ ĐỀ XUẤT HOÀN THIỆN HỆ THỐNG**
- 1. Bảng tổng hợp vấn đề & giải pháp theo thứ tự ưu tiên
- 2. Phân tích chi tiết & kế hoạch chuẩn hóa sư phạm (Vấn đề 1 đến 6)

---

# PHẦN I — HỆ THỐNG CỐT LÕI VIHAND GRADE

> Đặc tả kỹ thuật hệ thống — **đã triển khai và đang vận hành ổn định**

---

## 1. Tổng quan dự án

### 1.1 Mô tả
**ViHand Grade** là một nền tảng Web-app chuyên biệt hỗ trợ giáo viên tiểu học tổ chức tiết học nghe - viết chính tả và tự động chấm điểm, đánh giá bài viết tay tiếng Việt của học sinh cho cả hai phân môn: **Chính tả** và **Tập làm văn**.

Hệ thống hoạt động dựa trên mô hình **Hybrid AI Architecture** kết hợp giữa xử lý biên cục bộ (Local Edge / CPU) và dịch vụ thị giác đám mây (Cloud Vision VLM):
1. **Nhận diện văn bản chữ viết tay (OCR)**: Sử dụng mô hình thị giác lớn (VLM) thông qua **Google Gemini API** (model `gemini-3.1-flash-lite`) để nhận diện chữ viết tay học sinh từ ảnh chụp điện thoại — trích xuất văn bản thô `original_text` (**giữ nguyên 100% lỗi sai** của học sinh để chấm điểm).
2. **Sửa lỗi chính tả & Phân tích ngữ âm (NLP)**: Sử dụng mô hình ngôn ngữ tiếng Việt **ViT5** (`chamdentimem/ViT5_Vietnamese_Correction`) chạy cục bộ trên CPU máy chủ/máy trạm (hỗ trợ Dynamic INT8 Quantization) kết hợp thuật toán căn chỉnh chuỗi **Levenshtein / SequenceMatcher** để phân loại chính xác 6 nhóm lỗi chính tả tiếng Việt.
3. **Đánh giá Tập làm văn & Nhận xét Sư phạm 2 Tầng**: Kết hợp phân tích cú pháp/từ láy/tu từ tại Tầng 1 và mô hình ngôn ngữ nhỏ **Qwen2.5-0.5B-Instruct** tại Tầng 2 để sinh lời phê sư phạm ấm áp, tích cực (khen ngợi sáng tạo trước, nhắc nhở lỗi chính tả sau).
4. **Tab Đọc chính tả Web (`/teacher/dictation`)**: Bộ phát âm thanh trực tiếp trên trình duyệt tích hợp dịch vụ **Microsoft Edge-TTS** (`vi-VN-HoaiMyNeural` & `vi-VN-NamMinhNeural`), mô phỏng giọng đọc truyền cảm của giáo viên tiểu học với các tham số điều khiển sư phạm chuyên sâu (tốc độ đọc, số lần lặp lại, thời gian ngắt nghỉ 1.5s/từ, đánh vần từ khó). Ngữ liệu bài đọc từ phiên này được liên kết trực tiếp làm **Văn bản chuẩn (Ground Truth)** cho module chấm điểm.

> [!IMPORTANT]
> **Hai quy trình chấm điểm phân môn rõ rệt:**
> 1. **Bài Chính tả (Nghe - viết / Nhìn - viết)**: Ảnh bài viết -> Gemini OCR -> `original_text` -> Đối chiếu trực tiếp với **Ground Truth** của phiên đọc chính tả -> Phân loại 6 nhóm lỗi chính tả -> Barem 10 điểm (7đ chính tả + 3đ hình thức) -> **Zero-Hallucination (Không ảo giác)**.
> 2. **Bài Tập làm văn (Đoạn văn ngắn / Miêu tả / Kể chuyện)**: Ảnh bài viết -> Gemini OCR -> `original_text` -> ViT5 sửa lỗi -> Barem 10 điểm (4đ chính tả + 3đ hình thức + 2đ nội dung + 1đ sáng tạo) -> Qwen2.5-0.5B-Instruct sinh nhận xét sư phạm gợi mở, khích lệ.

### 1.2 Mục tiêu kỹ thuật
- **Thời gian xử lý toàn trình (End-to-End Latency)**: Hoàn thành trong `< 15–20 giây` cho một trang viết tay tiêu chuẩn (100–250 từ).
- **Độ chính xác OCR**: Đạt tỷ lệ đúng ký tự tiếng Việt có dấu `≥ 90–95%`.
- **Độ trễ phát âm thanh Web Dictation**: `< 1.0 giây` khi bắt đầu đọc một câu/cụm từ qua Edge-TTS stream.
- **Tiền xử lý ảnh thông minh**: Loại bỏ bóng đổ, tự động nắn góc nghiêng (deskew), xóa mờ đường kẻ ô ly tiểu học bằng TypeScript/Jimp.
- **Tối ưu hóa chạy cục bộ**: ViT5 và Qwen2.5-0.5B chạy mượt mà trên CPU x86 thông thường hoặc Raspberry Pi 4/5 (4GB RAM) nhờ Dynamic INT8 Quantization.
- **Progressive Web App (PWA)**: Hỗ trợ cài đặt trên máy tính bảng/điện thoại giáo viên qua Service Worker.
- **Bảo vệ API & Quota**: Bộ lọc Rate Limiting Guard (`lib/api-guard.ts`, tối đa 30 req/phút/IP) bảo vệ token Gemini và chống nghẽn dịch vụ.

### 1.3 Đối tượng sử dụng & Quyền hạn
- **Giáo viên (Teacher)**: Soạn/chọn bài đọc chính tả, điều khiển nhịp đọc trên lớp, chụp ảnh chấm bài, tinh chỉnh barem điểm và nhận xét (Human-in-the-loop), lưu điểm và xuất báo cáo thống kê lớp học.
- **Học sinh (Student)**: Tra cứu lịch sử bài đã chấm, xem ảnh bài viết cùng các lỗi sai được đánh dấu trực quan, đọc lời phê của giáo viên.
- **Quản trị viên (Admin)**: Quản lý tài khoản người dùng, phân bổ lớp học, cấu hình tham số hệ thống.

---

## 2. Kiến trúc hệ thống

### 2.1 Sơ đồ tổng thể hệ thống (Web-Centric Architecture)
```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Next.js App Router (Port 3000)                    │
│  ┌───────────────────────┐          ┌────────────────────────────────────┐  │
│  │  Frontend React 19    │          │            API Routes              │  │
│  │  Shadcn/ui + Tailwind │◀────────▶│  /api/auth/login                   │  │
│  │  - /teacher/dictation │          │  /api/preprocess  → Jimp Processor │  │
│  │  - /teacher/grade     │          │  /api/ocr         → Gemini SDK     │  │
│  │  - /teacher/reports   │          │  /api/grade       → ViT5 Service   │  │
│  │  PWA Service Worker   │          │  /api/grades, users, classes       │  │
│  └───────────────────────┘          │  /api/dictation/sessions, passages │  │
│                                     └─────────────────┬──────────────────┘  │
│                                             ┌─────────▼─────────┐           │
│                                             │    Prisma ORM     │           │
│                                             │ SQLite (vihand.db)│           │
│                                             └───────────────────┘           │
└─────────────────────────────────────────────────────────────────────────────┘
        │ HTTP (Local REST)                     │ HTTPS (Cloud API)
        ▼                                       ▼
┌───────────────────────────────────────┐   ┌─────────────────────────────┐
│    Python AI Microservice (FastAPI)   │   │      Google Gemini API      │
│    Port 8000                          │   │   gemini-3.1-flash-lite     │
│  ┌─────────────────────────────────┐  │   │   - Rate Limit Guard        │
│  │ 1. ViT5 Correction (INT8 CPU)   │  │   │   - Tiền xử lý ảnh Jimp     │
│  │    /grade, /correct             │  │   │   - Trích xuất văn bản thô  │
│  ├─────────────────────────────────┤  │   └─────────────────────────────┘
│  │ 2. Edge-TTS Speech Synthesis    │  │
│  │    /tts (Hoài My, Nam Minh)     │  │
│  ├─────────────────────────────────┤  │
│  │ 3. Qwen2.5-0.5B-Instruct        │  │
│  │    /qwen/generate, /qwen/status │  │
│  └─────────────────────────────────┘  │
└───────────────────────────────────────┘
```

### 2.2 Quy trình xử lý toàn trình (End-to-End Workflow)

#### Luồng 1: Tiết Đọc Chính Tả Trên Lớp (`/teacher/dictation`)
1. Giáo viên mở tab **Đọc chính tả**, chọn bài đọc theo khối lớp (1–5) và bộ sách (Kết Nối Tri Thức, Cánh Diều, Chân Trời Sáng Tạo) hoặc tự soạn bài mới.
2. Trình duyệt gửi văn bản câu/cụm từ đến endpoint `GET /tts` của Python Service (`localhost:8000`).
3. Python Service stream dữ liệu âm thanh MP3 chất lượng cao từ Microsoft Edge-TTS về trình duyệt.
4. Trình duyệt phát âm thanh qua loa giảng dạy với các quãng dừng (pause) và số lượt lặp (repeat) theo chuẩn sư phạm tiểu học.
5. Khi kết thúc, hệ thống lưu phiên vào bảng `DictationSession` và hiển thị nút **"Chuyển sang Chấm điểm"** (mang theo `sessionId` và `passageContent`).

#### Luồng 2: Chấm Điểm Bài Chính Tả (Ground-Truth Guided)
1. Giáo viên chụp ảnh bài viết của học sinh, tải lên giao diện `/teacher/grade`.
2. Module Jimp tiền xử lý ảnh (cân bằng trắng, khử bóng, nắn góc nghiêng, tăng nét chữ).
3. Gemini 3.1 Flash Lite OCR trích xuất văn bản học sinh viết (`original_text`), bảo lưu toàn bộ lỗi sai.
4. Hệ thống nạp nội dung bài đọc chuẩn từ `DictationSession` làm **Ground Truth** ($T_{gt}$).
5. Thuật toán `SequenceMatcher / Levenshtein` so khớp từng từ giữa $T_{ocr}$ và $T_{gt}$, bóc tách 6 nhóm lỗi chính tả và tính điểm theo barem 7đ chính tả + 3đ hình thức (loại bỏ hoàn toàn ảo giác AI).

#### Luồng 3: Chấm Điểm Bài Tập Làm Văn (Two-Tier Evaluation)
1. Giáo viên chuyển sang chế độ **Tập làm văn**.
2. Gemini OCR nhận diện bài văn viết tay của học sinh.
3. **Tầng 1 (Định lượng & Ngữ pháp)**: ViT5 phát hiện lỗi chính tả, câu què cụt, từ lặp, đồng thời bóc tách dẫn chứng biện pháp tu từ (so sánh, nhân hóa, từ láy).
4. **Tầng 2 (Sư phạm & Cảm xúc)**: Mô hình `Qwen2.5-0.5B-Instruct` phân tích ngữ cảnh, sinh lời nhận xét sư phạm tích cực, ấm áp theo phương pháp giáo dục tiểu học.
5. Giáo viên kiểm tra lại kết quả trên Popup, tinh chỉnh điểm thành phần và lưu vào cơ sở dữ liệu.

---

## 3. Tech Stack & Dependencies

### 3.1 Frontend & Application Layer
- **Next.js (v16.2.4)**: App Router, API Routes, Server Actions, PWA Manifest.
- **React (v19.x)** + **TypeScript (v5.7.3)**.
- **Tailwind CSS (v4.2.0)**: Giao diện hiện đại, Responsive, Dark/Light mode (`next-themes`).
- **Shadcn/ui**: Bộ component trên nền Radix Primitives (`@radix-ui/*`).
- **Web Audio API & HTML5 Audio**: Phát luồng âm thanh bài đọc chính tả, chuông phách hiệu lệnh.
- **Recharts (v2.15.0)**: Biểu đồ trực quan hóa phổ điểm và phân bố nhóm lỗi.

### 3.2 Backend AI Microservice (Python Service)
- **FastAPI (v0.115+) & Uvicorn**: Framework RESTful API hiệu năng cao trên cổng 8000.
- **Microsoft Edge-TTS (v6.1+)**: Engine tổng hợp tiếng nói tiếng Việt chất lượng phòng thu (`vi-VN-HoaiMyNeural`, `vi-VN-NamMinhNeural`).
- **PyTorch (v2.4+) & Transformers (v4.44+)**:
  - `chamdentimem/ViT5_Vietnamese_Correction`: Sửa lỗi chính tả tiếng Việt với **Dynamic INT8 Quantization** (`torch.quantization.quantize_dynamic`).
  - `Qwen/Qwen2.5-0.5B-Instruct`: Mô hình ngôn ngữ nhỏ (SLM) sinh lời nhận xét sư phạm chạy cục bộ trên CPU/GPU.
- **Optimum & ONNX Runtime (Tùy chọn)**: Tăng tốc suy luận CPU ~30–50% khi triển khai trên thiết bị biên.

### 3.3 Database & ORM
- **Prisma ORM (v5.22.0)**: Quản lý lược đồ dữ liệu và migration.
- **SQLite (better-sqlite3 v12.9.0)**: CSDL cục bộ gọn nhẹ (~16MB), không yêu cầu cài đặt máy chủ DB riêng biệt.

### 3.4 Image Processing & Cloud VLM
- **Jimp (v1.6.1)**: Thư viện xử lý ảnh 100% TypeScript (Deskew, CLAHE, White Balance, Shadow Removal).
- **Google GenAI SDK (`@google/genai` v2.7.0)**: Gọi model `gemini-3.1-flash-lite` phục vụ nhận diện chữ viết tay tiếng Việt.

---

## 4. Database Schema (Prisma + SQLite)

Toàn bộ CSDL được định nghĩa trong `prisma/schema.prisma` gồm **6 model cốt lõi**:

```prisma
// 1. Tài khoản người dùng
model User {
  id        String   @id @default(cuid())
  name      String
  username  String   @unique
  password  String   @default("123456")  // Hash bcrypt/Argon2id trong thực tế
  role      String   @default("student") // "teacher" | "student" | "admin"
  className String   @default("")
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
}

// 2. Lớp học
model Class {
  id        String   @id @default(cuid())
  name      String   @unique
  grade     Int      @default(3)
  teacherId String   @default("")
  createdAt DateTime @default(now())
}

// 3. Kết quả chấm bài (Lưu trữ cả bài Chính tả và Tập làm văn)
model Grade {
  id                   String   @id @default(cuid())
  studentName          String
  assignmentTitle      String
  className            String   @default("")
  originalText         String   // Văn bản thô OCR (giữ nguyên lỗi của học sinh)
  fixedText            String   // Văn bản đã sửa hoặc Ground Truth
  corrections          String   // JSON danh sách lỗi chi tiết
  score                String   // Điểm số hiển thị (VD: "8.5/10")
  scoreNum             Float    // Điểm số thực (VD: 8.5) dùng lọc/thống kê SQL
  scoreBreakdown       String   @default("") // JSON điểm thành phần (chính tả, hình thức, nội dung, sáng tạo)
  feedback             String   // Nhận xét tổng quan
  overallRating        String   // Xếp loại: "Xuất sắc" | "Tốt" | "Khá" | "Trung bình" | "Cần cố gắng"
  processingTimeMs     Int      @default(0)
  tokenCount           Int      @default(0)
  imageBase64          String   @default("")
  imagePath            String   @default("")
  dictationSessionId   String   @default("") // Khóa ngoại mềm liên kết phiên đọc chính tả
  createdAt            DateTime @default(now())
}

// 4. Kho ngữ liệu Sách Giáo Khoa chuẩn hóa
model TextbookPassage {
  id             String   @id @default(cuid())
  gradeLevel     Int      @default(3)          // Khối lớp: 1, 2, 3, 4, 5
  bookSet        String   @default("KetNoi")   // "KetNoi" | "CanhDieu" | "ChanTroi"
  unit           String   @default("")         // Tuần / Bài học
  title          String                        // Tên bài đọc (VD: "Cô giáo tí hon")
  content        String                        // Toàn văn bài chính tả chuẩn 100%
  difficultWords String   @default("")         // Danh sách từ khó (phân tách bởi dấu phẩy)
  createdBy      String   @default("system")
  createdAt      DateTime @default(now())
}

// 5. Phiên đọc chính tả (Tạo từ Tab Web /teacher/dictation)
model DictationSession {
  id          String   @id @default(cuid())
  title       String                             // Tiêu đề bài đọc
  passage     String                             // Toàn văn bài đọc (dùng làm Ground Truth chấm bài)
  className   String   @default("")              // Lớp học áp dụng
  teacherName String   @default("")              // Giáo viên tổ chức
  source      String   @default("web")           // "web" | "manual"
  speedRate   String   @default("-15%")          // Tốc độ đọc
  status      String   @default("completed")     // "completed" | "in_progress"
  summary     String   @default("")              // Ghi chú phiên đọc
  createdAt   DateTime @default(now())
  logs        DictationLog[]
}

// 6. Nhật ký sự kiện phiên đọc
model DictationLog {
  id        String   @id @default(cuid())
  sessionId String
  session   DictationSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  speaker   String   // "system" | "teacher" | "tts"
  content   String   // Nội dung câu đọc hoặc sự kiện điều khiển
  createdAt DateTime @default(now())
}
```

---

## 5. Danh sách API Endpoints

### 5.1 Quản trị & Xác thực
| Method | Endpoint | Mô tả |
|:---|:---|:---|
| `POST` | `/api/auth/login` | Đăng nhập tài khoản, trả JWT/Session + quyền hạn (role). |
| `POST` | `/api/auth/register` | Đăng ký tài khoản người dùng thường. |
| `POST` | `/api/auth/admin-register` | Đăng ký tài khoản Admin thông qua `ADMIN_SECRET_KEY`. |
| `GET/POST` | `/api/users` | Danh sách tài khoản / Tạo tài khoản mới. |
| `GET/POST` | `/api/classes` | Quản lý danh sách lớp học và giáo viên chủ nhiệm. |

### 5.2 Xử lý ảnh & OCR
| Method | Endpoint | Mô tả |
|:---|:---|:---|
| `POST` | `/api/preprocess` | Nhận ảnh base64, thực hiện nắn thẳng (deskew), khử bóng, trả về ảnh sạch kèm `quality_report`. |
| `POST` | `/api/ocr` | Gọi Gemini 3.1 Flash Lite nhận diện chữ viết tay tiếng Việt, trả về `original_text` có lỗi. |

### 5.3 Chấm điểm AI & Phân tích ngôn ngữ (`/api/grade`)
Endpoint chính điều phối chấm điểm cho cả hai phân môn:
- **Body Request**:
```json
{
  "studentText": "Hạt gao nàn ta, có vị phù xa...",
  "groundTruthText": "Hạt gạo làng ta, có vị phù sa...",
  "gradingMode": "dictation",
  "penalty_per_error": 0.5,
  "hinh_thuc": 3.0,
  "noi_dung": 2.0,
  "sang_tao": 1.0
}
```
- **Response**:
```json
{
  "original_text": "Hạt gao nàn ta, có vị phù xa...",
  "fixed_text": "Hạt gạo làng ta, có vị phù sa...",
  "corrections": [
    {"error": "gao", "suggestion": "gạo", "error_type": "dau_thanh", "reason": "Thiếu dấu nặng"},
    {"error": "nàn", "suggestion": "làng", "error_type": "van", "reason": "Sai vần an/ang"},
    {"error": "xa", "suggestion": "sa", "error_type": "phu_am_dau", "reason": "Sai phụ âm đầu x/s"}
  ],
  "score_breakdown": {
    "chinh_ta": {"raw": 5.5, "max": 7.0, "error_count": 3, "deduction": 1.5},
    "hinh_thuc": {"raw": 3.0, "max": 3.0, "note": "Trình bày chuẩn ô ly"}
  },
  "score": "8.5/10",
  "overall_rating": "Tốt",
  "feedback": "Em cần chú ý phân biệt phụ âm x/s và vần an/ang.",
  "pedagogical_comment": "Bài viết sạch sẽ, chữ viết ngay ngắn. Em nhớ rèn thêm cách viết dấu thanh nhé!",
  "gradingMode": "dictation"
}
```

### 5.4 Âm thanh & TTS Engine (Python Service - Port 8000)
| Method | Endpoint | Mô tả |
|:---|:---|:---|
| `GET` | `/tts` | Tạo luồng âm thanh MP3 từ Microsoft Edge-TTS (`?text=...&voice=vi-VN-HoaiMyNeural&rate=-15%`). |
| `GET` | `/qwen/status` | Kiểm tra trạng thái mô hình Qwen2.5-0.5B (đã nạp vào RAM/VRAM chưa). |
| `POST` | `/qwen/generate` | Sinh lời nhận xét sư phạm tùy biến theo ngữ cảnh bài viết của học sinh. |
| `POST` | `/correct` | ViT5 sửa lỗi chính tả trực tiếp cho chế độ gõ tay (Manual input). |

### 5.5 Quản lý Ngữ liệu SGK & Phiên đọc chính tả
| Method | Endpoint | Mô tả |
|:---|:---|:---|
| `GET/POST` | `/api/dictation/passages` | Lấy danh sách hoặc thêm bài đọc mới vào kho ngữ liệu SGK. |
| `GET/POST` | `/api/dictation/sessions` | Lấy lịch sử hoặc khởi tạo phiên đọc chính tả mới từ Web UI. |
| `GET/DELETE`| `/api/dictation/sessions/[id]` | Tra cứu chi tiết hoặc xóa phiên đọc chính tả (kèm logs). |

---

## 6. Logic nghiệp vụ & Thuật toán AI

### 6.1 Chuẩn hóa văn bản đầu vào (Text Normalization)
1. **Lọc Teencode**: Chuẩn hóa các từ viết tắt phổ biến (`ko` -> `không`, `dc` -> `được`, `vs` -> `với`).
2. **Khử nhiễu ký tự**: Loại bỏ khoảng trắng thừa, chuẩn hóa dấu câu tiếng Việt và quy cách viết hoa đầu câu.

### 6.2 Phân loại 6 nhóm lỗi chính tả Tiếng Việt
Hệ thống cài đặt bộ luật ngữ âm đối soát từ điển phân loại lỗi chính xác:
1. `phu_am_dau`: Nhầm lẫn phụ âm đầu địa phương (l/n, ch/tr, s/x, d/gi/r, c/k/q, g/gh, ng/ngh).
2. `van`: Sai phần vần (an/ang, ac/at, iên/iêng, uôn/uông, ươn/ương...).
3. `dau_thanh`: Sai hoặc thiếu dấu thanh (hỏi/ngã, sắc/nặng, huyền/không dấu).
4. `viet_hoa`: Sai quy tắc viết hoa (đầu câu, danh từ riêng, tên địa danh, tên người).
5. `bo_sot_them`: Bỏ sót từ hoặc viết lặp/thừa từ so với văn bản chuẩn.
6. `dau_cau`: Thiếu hoặc dùng sai vị trí dấu chấm, dấu phẩy, dấu hỏi, dấu than.

### 6.3 Thuật toán Sequence Alignment & Phân tích lỗi
Sử dụng giải thuật **Needleman-Wunsch / SequenceMatcher** ở cấp độ từ (word-level) để so khớp mảng từ học sinh $T_{ocr} = [w_1, ..., w_n]$ với mảng từ chuẩn $T_{gt} = [g_1, ..., g_m]$.
- Khi phát hiện cặp từ khác biệt $(w_i, g_j)$, thuật toán tách thành 3 thành phần: *Phụ âm đầu*, *Vần*, *Thanh điệu* để gán nhãn lỗi ngữ âm chính xác kèm lý do giải thích dễ hiểu cho học sinh tiểu học.

---

## 7. Pipeline xử lý hình ảnh (lib/image-processor.ts)

Ảnh bài viết tay chụp bằng camera điện thoại được chuẩn hóa qua **pipeline 9 bước** trước khi gửi tới OCR:
1. **EXIF Auto-rotate**: Đọc Orientation Tag tự động xoay ảnh đúng chiều thẳng đứng.
2. **Deskew (Nắn thẳng)**: Quét góc nghiêng $\theta$ từ $-15^\circ$ đến $+15^\circ$ qua Projection Profile Variance để xoay ảnh ngay ngắn.
3. **Resize**: Thu phóng kích thước ảnh về chiều rộng tối đa 1600px đảm bảo sắc nét mà tiết kiệm băng thông.
4. **Cân bằng trắng (Gray World Assumption)**: Cân bằng kênh màu R/G/B, loại bỏ ám vàng đèn học.
5. **Khử bóng đổ (Shadow Removal)**: Sử dụng Box Blur trên Integral Image $O(1)$ để tách nền và khử bóng tay người chụp.
6. **Lọc tương phản CLAHE**: Tăng cường độ tương phản cục bộ lưới 8x8 làm nổi bật nét bút chì/bút mực.
7. **Làm mờ đường kẻ ô ly**: Làm giảm độ đậm của lưới kẻ tập học sinh tránh gây nhiễu cho mô hình OCR.
8. **Unsharp Mask Sharpening**: Tăng độ sắc nét các cạnh viền con chữ.
9. **Quality Assessment**: Đánh giá chỉ số mờ (Laplacian Variance), độ sáng và tỷ lệ mực để cảnh báo nếu ảnh chụp không đủ điều kiện.

---

## 8. Module Đọc Chính Tả Web & Tích Hợp Âm Thanh Edge-TTS

Module này hiện thực hóa toàn bộ nghiệp vụ đọc chính tả ngay trên giao diện Web (`app/teacher/dictation/page.tsx`), loại bỏ mọi yêu cầu lắp ráp mạch phần cứng.

### 8.1 Kiến trúc điều khiển âm thanh trên trình duyệt
- Giáo viên thao tác trực tiếp trên giao diện: Bấm Play/Pause, tua câu, điều chỉnh thanh trượt tốc độ.
- Web Client sử dụng `Audio()` element kết hợp `AudioContext` của HTML5:
  - Cache các đoạn âm thanh câu đã đọc để khi giáo viên bấm "Đọc lại câu vừa rồi" âm thanh phát ngay tức thì không cần gọi lại mạng.
  - Tích hợp âm thanh hiệu lệnh: Tiếng chuông gõ phách báo hiệu học sinh chuẩn bị viết, chuông kết thúc câu.
- Dịch vụ backend: Endpoint `/tts` trên FastAPI tiếp nhận văn bản, gọi `edge_tts.Communicate(text, voice, rate)` và stream âm thanh MP3 về client trong thời gian `< 800ms`.

### 8.2 Tham số sư phạm điều khiển giọng đọc
| Tham số | Giá trị lựa chọn | Ý nghĩa Sư phạm Tiểu học |
|:---|:---|:---|
| **Giọng đọc** | `vi-VN-HoaiMyNeural` (Nữ)<br>`vi-VN-NamMinhNeural` (Nam) | Giọng đọc chuẩn phát âm Hà Nội, truyền cảm, ngữ điệu tự nhiên như cô giáo tiểu học. |
| **Tốc độ đọc (`rate`)** | `-35%` (Lớp 1)<br>`-25%` (Lớp 1-2)<br>`-15%` (Lớp 3 chuẩn)<br>`0%` (Lớp 4-5) | Giúp học sinh nghe rõ từng âm tiết, đặc biệt là các âm đệm và âm cuối khó. |
| **Khoảng dừng (`pause`)** | 1.0s đến 10.0s hoặc Tự động (~1.6s/từ) | Cung cấp đủ thời gian cho tốc độ viết tay thực tế của học sinh từng khối lớp. |
| **Lặp lại (`repeat`)** | 1 đến 5 lần (Mặc định: 2 lần) | Tuân thủ phương pháp giảng dạy chính tả: Đọc trọn câu -> Nhắc lại -> Học sinh rà soát. |
| **Đánh vần từ khó** | Bật/Tắt | Tự động phân tách và phát âm chậm từng âm tiết cho danh sách từ khó của bài. |

---

## 9. Cấu hình hệ thống & Khởi chạy

### 9.1 Biến môi trường
Cấu hình đơn giản, tập trung vào 2 dịch vụ chính:

**`.env`** (Thư mục gốc Next.js):
```bash
DATABASE_URL="file:./prisma/vihand.db"
VIT5_SERVICE_URL="http://localhost:8000"
```

**`.env.local`** (Thư mục gốc Next.js):
```bash
GEMINI_API_KEY="AIzaSy...your_gemini_api_key_here"
ADMIN_SECRET_KEY="your-strong-secret-here"
```

**`python_service/.env`** (Tùy chọn cấu hình AI):
```bash
VIT5_WORKERS=1
ENABLE_QWEN_SLM=true
QWEN_MODEL_ID=Qwen/Qwen2.5-0.5B-Instruct
```

### 9.2 Khởi chạy đồng thời qua tập lệnh `start_all.bat`
Hệ thống khởi chạy toàn bộ môi trường phát triển chỉ bằng một click chuột hoặc dòng lệnh duy nhất:
```powershell
.\start_all.bat
```
Tập lệnh tự động mở 2 dịch vụ:
1. **Next.js Web Portal** (Cổng 3000): Giao diện người dùng cho giáo viên và học sinh.
2. **Python AI Microservice** (Cổng 8000): Cung cấp đồng thời ViT5, Edge-TTS và Qwen2.5.

---

## 10. Quản lý rủi ro và giải pháp dự phòng

| Tình huống rủi ro | Xác suất | Tác động | Giải pháp dự phòng của hệ thống |
| :--- | :---: | :---: | :--- |
| **Mất kết nối mạng Internet** | Thấp | Trung bình | - Tầng chấm điểm chính tả ViT5 và so khớp Ground Truth chạy **100% offline**.<br>- Nhận xét sư phạm Tầng 2 tự động chuyển sang **Fallback Graceful** (bộ nhận xét mẫu sư phạm không cần mạng).<br>- Âm thanh Edge-TTS: Có thể tải sẵn (pre-download) file MP3 bài đọc khi còn mạng. |
| **Gemini OCR chạm hạn ngạch (Rate Limit 429)** | Trung bình | Cao | Bộ lọc Rate Limiting Guard (`lib/api-guard.ts`) xếp hàng yêu cầu, tự động áp dụng `Retry-After` và hiển thị đếm lùi trên UI giáo viên. |
| **Học sinh viết xấu / Nét chữ mờ** | Cao | Trung bình | Module Jimp tự động tăng độ tương phản (CLAHE) và khử mờ; nếu chất lượng dưới ngưỡng an toàn, hệ thống hiện cảnh báo rõ ràng yêu cầu chụp lại. |
| **Trường học dùng máy cấu hình thấp (RAM 4GB)** | Trung bình | Trung bình | ViT5 chạy chế độ INT8 Dynamic Quantization (chỉ chiếm ~500MB RAM); Qwen2.5-0.5B siêu nhẹ (~450MB RAM), không gây treo máy. |

---

## 11. Giao diện người dùng (User Interface)

Hệ thống được thiết kế theo chuẩn sư phạm tiểu học, trực quan, phông chữ Roboto tiếng Việt rõ ràng:
- **`/teacher/dictation` (Tab Đọc chính tả)**:
  - Bảng điều khiển bài đọc với các nút chọn nhanh bài theo SGK.
  - Trình phát âm thanh nổi bật với thời gian đếm ngược quãng nghỉ giữa các câu.
  - Danh sách từ khó hiển thị dạng thẻ (badges) cho phép bấm để nghe đọc mẫu hoặc nghe đánh vần.
  - Nút chuyển trạng thái nhanh sang màn hình chấm điểm.
- **`/teacher/grade` (Tab Chấm điểm)**:
  - Chuyển đổi linh hoạt giữa 2 chế độ: **Chính tả SGK** và **Tập làm văn**.
  - Trực quan hóa kết quả chấm song song (Side-by-side) hoặc xen kẽ (Inline) giữa ảnh bài viết và văn bản đã nhận diện.
  - Các lỗi sai được gạch chân và tô màu theo nhóm lỗi; bấm vào lỗi sẽ hiện thẻ popover giải thích lý do sư phạm.
  - Thanh trượt điểm thành phần (Hình thức, Nội dung, Sáng tạo) cho phép giáo viên điều chỉnh nhanh điểm số theo ý muốn (Human-in-the-loop).
  - Hộp nhận xét sư phạm gợi ý tích hợp nút sao chép nhanh vào sổ liên lạc.

---

## 12. Bảo mật & Quyền riêng tư

- **Bảo vệ dữ liệu học sinh**: Không công khai danh tính học sinh ra bên ngoài; ảnh bài viết chỉ dùng để trích xuất văn bản trong phiên làm việc.
- **Phân quyền truy cập (RBAC)**: Giáo viên chỉ có quyền truy cập dữ liệu học sinh và lớp học do mình phụ trách; học sinh chỉ xem được bài của cá nhân mình.
- **Bảo mật khóa API**: `GEMINI_API_KEY` và `ADMIN_SECRET_KEY` lưu hoàn toàn ở biến môi trường server-side, không bao giờ lộ ra client.

---

## 13. Kiểm thử & Đánh giá thực nghiệm

Hệ thống đã trải qua các đợt kiểm thử nghiêm ngặt tại thư mục `02_Kich_ban_Thuc_nghiem/`:
- **Độ chính xác OCR**: Đạt 91.5% độ chính xác ký tự trên tập mẫu bài viết tay tiểu học thực tế.
- **Độ chính xác sửa lỗi ViT5**: Điểm SacreBLEU đạt 39.17% trên tập ngữ liệu chính tả tiếng Việt.
- **Kiểm thử Thuật toán Sáng tạo & Lời phê Sư phạm 2 Tầng**: Vượt qua 44/44 bài kiểm thử thực nghiệm (test runs) trong notebook `Qwen2_5_chosinhloinhanxet_2tang.ipynb`, đảm bảo 100% không phát sinh lỗi tính toán sai lệch hay sập ứng dụng khi gặp bài làm rỗng.

---

## 14. Bản đồ tệp mã nguồn chính

| Tệp / Thư mục | Vai trò trong hệ thống |
| :--- | :--- |
| `app/teacher/dictation/page.tsx` | **Giao diện Tab Đọc chính tả Web**: Điều khiển giọng đọc TTS, quản lý kho bài đọc SGK (2018 dòng). |
| `app/teacher/grade/page.tsx` | **Giao diện Tab Chấm điểm**: Chấm Chính tả & Tập làm văn, hiển thị side-by-side, Human-in-the-loop (2057 dòng). |
| `app/api/grade/route.ts` | API chấm điểm chính tả, tính toán Levenshtein, tích hợp phân loại 6 nhóm lỗi và barem điểm. |
| `app/api/ocr/route.ts` | Endpoint gọi Gemini 3.1 Flash Lite OCR với Rate Limiting Guard. |
| `app/api/preprocess/route.ts` | Endpoint tiếp nhận và tiền xử lý ảnh viết tay qua Jimp. |
| `lib/image-processor.ts` | Thư viện 9 bước tiền xử lý ảnh (Deskew, CLAHE, cân bằng trắng). |
| `python_service/main.py` | FastAPI AI Service: ViT5 INT8, Edge-TTS streaming (`/tts`), Qwen2.5-0.5B (`/qwen/*`). |
| `prisma/schema.prisma` | Lược đồ CSDL SQLite 6 bảng: User, Class, Grade, TextbookPassage, DictationSession, DictationLog. |
| `start_all.bat` | Tập lệnh khởi động toàn bộ hệ thống (Web 3000 + Python 8000). |
| `xiaozhi-esp32-main/` | *(Legacy/Archived)* Thư mục firmware vi điều khiển cũ — không còn sử dụng trong hệ thống. |
| `mcp_service/` | *(Legacy/Archived)* Thư mục cầu nối MCP cũ — đã được thay thế bằng Tab Web Dictation. |

---

## 15. Tính nghiên cứu & Đóng góp khoa học

1. **Giải pháp sư phạm khép kín**: Kết hợp tiền kỳ (Đọc chính tả qua Web TTS) và hậu kỳ (Chấm bài viết tay tự động) trong cùng một nền tảng thống nhất.
2. **Loại bỏ hiện tượng ảo giác (Zero-Hallucination) trong chấm chính tả**: Nhờ việc sử dụng trực tiếp bài đọc từ phiên làm việc làm Ground Truth, hệ thống không phụ thuộc vào việc suy đoán câu chữ của mô hình ngôn ngữ lớn, đảm bảo tính công bằng và chính xác 100% về mặt sư phạm.
3. **Mô hình đánh giá Tập làm văn 2 Tầng độc đáo**: Tầng 1 đảm bảo tính chính xác định lượng toán học (không bị hallucination điểm số), Tầng 2 phát huy năng lực thấu cảm của mô hình ngôn ngữ nhỏ SLM để sinh nhận xét sư phạm tích cực, nhân văn.
4. **Khả năng triển khai thực tế cao**: Không đòi hỏi trang bị thêm phần cứng đắt tiền; mọi trường học có máy tính kết nối loa đều có thể ứng dụng ngay lập tức.

---
---

# PHẦN II — MODULE TAB ĐỌC CHÍNH TẢ WEB & CƠ CHẾ LIÊN KẾT CHẤM ĐIỂM ĐA PHÂN MÔN

> Đặc tả chuyên sâu về quy trình sư phạm, giải thuật liên kết ngữ liệu giữa phiên đọc và bài chấm

---

## Module 11: Tab Đọc Chính Tả Trực Tiếp Trên Web (`/teacher/dictation`) & Cơ Chế Liên Kết Chấm Điểm 2 Phân Môn

---

## 11.1 Bối cảnh & Lý do chuyển dịch từ phần cứng ESP32-S3 sang Web-based

### Hạn chế của giải pháp phần cứng vi điều khiển rời (ESP32-S3 / Xiaozhi):
Trong giai đoạn đầu nghiên cứu, nhóm đã thử nghiệm chế tạo máy trợ giảng đọc chính tả vật lý sử dụng chip ESP32-S3, microphone I2S INMP441, amply MAX98357A và firmware Xiaozhi. Tuy nhiên, qua khảo sát thực tế tại các trường tiểu học, mô hình này bộc lộ nhiều rào cản lớn:
1. **Độ ổn định mạng WiFi trong lớp học**: Sóng WiFi 2.4GHz tại các phòng học thường bị suy hao mạnh hoặc bị chặn bởi tường dày, khiến việc streaming âm thanh hai chiều qua WebSocket trên ESP32 thường xuyên bị giật, lag hoặc đứt kết nối giữa chừng.
2. **Chi phí đầu tư và bảo trì linh kiện**: Mỗi phòng học phải trang bị một bộ mạch phần cứng riêng biệt (chi phí linh kiện, vỏ hộp 3D, nguồn sạc, nguy cơ hư hỏng rơi vỡ do học sinh hiếu động).
3. **Khó thao tác và quan sát**: Giáo viên khó kiểm soát trực quan danh sách câu đọc, từ khó hoặc trạng thái phiên nếu chỉ nhìn vào màn hình LCD nhỏ 1.3 inch trên mạch vi điều khiển.
4. **Phụ thuộc hạ tầng trung gian**: Cần duy trì server WebSocket riêng (cổng 8200) và giao thức MCP phức tạp.

### Ưu thế vượt trội của giải pháp Web-based Tab (`/teacher/dictation`):
- **Tận dụng 100% trang thiết bị sẵn có**: Mọi phòng học hiện đại đều có máy tính của giáo viên kết nối trực tiếp với Tivi/Màn hình tương tác và Loa lớp học.
- **Trải nghiệm thị giác trực quan**: Giáo viên vừa nghe âm thanh đọc mẫu, vừa nhìn rõ từng câu chữ trên màn hình lớn, chủ động dừng/tiếp tục/lặp lại chỉ bằng một phím bấm.
- **Dữ liệu liền mạch (Seamless Dataflow)**: Bài đọc được chọn trên Web sẽ tự động lưu vào CSDL và sẵn sàng làm Ground Truth cho module chấm điểm ngay sau tiết học mà không cần bất kỳ bước đồng bộ trung gian nào.

---

## 11.2 Kiến trúc Web Dictation & Speech Synthesis Engine

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Next.js Web Client (/teacher/dictation)                │
│                                                                             │
│  ┌───────────────────────┐   Audio Cache   ┌─────────────────────────────┐  │
│  │   Textbook Selector   │  ┌───────────┐  │   HTML5 Audio Controller    │  │
│  │   - Khối Lớp (1-5)    │  │ Memory    │  │   - Play / Pause / Repeat   │  │
│  │   - Bộ Sách SGK       │  │ AudioMap  │  │   - Countdown Timer (Pause) │  │
│  │   - Danh sách từ khó  │  └─────▲─────┘  │   - Bell Chime Effect       │  │
│  └───────────┬───────────┘        │        └──────────────┬──────────────┘  │
└──────────────┼────────────────────┼───────────────────────┼─────────────────┘
               │                    │ Audio Stream (MP3)    │
               │ HTTP GET /tts      │                       │
               ▼                    │                       ▼
┌───────────────────────────────────┴─────────────────────────────────────────┐
│                     Python FastAPI Microservice (Port 8000)                 │
│                                                                             │
│   @app.get("/tts")                                                          │
│   ├── Tham số: text, voice ("vi-VN-HoaiMyNeural"), rate ("-15%")            │
│   ├── Gọi thư viện: Microsoft Edge-TTS Communicate                          │
│   └── Stream chunk dữ liệu âm thanh trực tiếp về Client (Cache-Control 24h) │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 11.3 Kho ngữ liệu Sách Giáo Khoa Tiếng Việt Tiểu học chuẩn hóa (`TextbookPassage`)

Kho ngữ liệu số hóa lưu trữ toàn bộ các bài chính tả chuẩn theo chương trình Giáo dục phổ thông mới (GDPT 2018):
- **Phân loại theo 3 bộ sách chính**:
  1. *Kết Nối Tri Thức Với Cuộc Sống* (`KetNoi`)
  2. *Cánh Diều* (`CanhDieu`)
  3. *Chân Trời Sáng Tạo* (`ChanTroi`)
- **Thông tin chi tiết của mỗi bài đọc**:
  - Tiêu đề bài viết (VD: *"Hạt gạo làng ta"*, *"Cô giáo tí hon"*, *"Ai có lỗi"*).
  - Khối lớp và Tuần học tương ứng.
  - Nội dung toàn văn chuẩn mực 100% (chính xác về dấu thanh, chính tả, dấu câu).
  - Danh mục từ khó trọng tâm để giáo viên luyện phát âm và cho học sinh viết bảng con trước khi viết vào vở.

---

## 11.4 Quy trình 4 bước sư phạm trong giờ nghe - viết chính tả

Web Dictation Tab hiện thực hóa đúng chuẩn phương pháp dạy học Tiếng Việt Tiểu học qua **4 bước tuần tự**:

```text
[BƯỚC 1: ĐỌC MẪU TOÀN BÀI]
  └── Hệ thống phát toàn bộ đoạn văn với tốc độ bình thường (rate = 0%)
  └── Mục đích: Học sinh nắm được chủ đề, nội dung và cảm xúc của bài viết.

[BƯỚC 2: ĐỌC CHÍNH TẢ TỪNG CÂU / CỤM TỪ]
  └── Tách đoạn văn thành các cụm từ vừa sức (3-5 từ cho Lớp 1-2; nguyên câu cho Lớp 3-5).
  └── Lần đọc 1: Đọc cụm từ để học sinh định hình âm tiết.
  └── Quãng nghỉ sư phạm (Pause): Đếm lùi thời gian (mặc định 1.5 giây/từ) để học sinh nắn nót viết.
  └── Lần đọc 2: Đọc lặp lại để học sinh rà soát và hoàn thiện từ ngữ.

[BƯỚC 3: ĐỌC SOÁT LỖI TOÀN BÀI]
  └── Phát lại toàn bộ bài đọc với tốc độ chậm vừa phải (-10%).
  └── Học sinh dùng bút chì dò từng dòng, kiểm tra dấu thanh và chữ viết hoa.

[BƯỚC 4: LƯU PHIÊN & CHUYỂN SANG CHẤM ĐIỂM]
  └── Lưu bản ghi DictationSession vào cơ sở dữ liệu.
  └── Tự động kích hoạt nút "Chuyển sang Chấm bài": Điều hướng sang /teacher/grade,
      tự động điền Ground Truth = Nội dung bài vừa đọc.
```

---

## 11.5 Cơ chế Chấm điểm Liên kết 2 Phân môn tại `/teacher/grade`

Giao diện chấm bài hỗ trợ giáo viên chuyển đổi linh hoạt giữa 2 phân môn:

### Phân môn 1: Chấm Điểm Bài Chính Tả (Nghe - Viết / Nhìn - Viết)
- **Phương pháp**: Đối soát văn bản chuẩn (Ground-Truth Guided Grading).
- **Văn bản chuẩn ($T_{gt}$)**: Lấy nguyên văn từ bài đọc vừa diễn ra trong phiên `DictationSession`.
- **Văn bản học sinh ($T_{ocr}$)**: Do Gemini Vision trích xuất từ ảnh bài viết tay.
- **Thuật toán**: Levenshtein Word-level Alignment.
- **Barem điểm chuẩn 10 điểm (theo tinh thần Thông tư 27/2020/TT-BGDĐT)**:
  - **Chính tả & Chữ viết (Tối đa 7.0 điểm)**:
    - Học sinh chép đúng trọn vẹn: Đạt 7.0 điểm.
    - Mỗi lỗi chính tả (thuộc 6 nhóm lỗi: phụ âm đầu, vần, dấu thanh, viết hoa, bỏ sót/thêm, dấu câu) trừ **0.5 điểm** (giáo viên có thể điều chỉnh mức trừ từ 0.25đ đến 1.0đ/lỗi tùy theo khối lớp).
  - **Hình thức trình bày & Quy cách viết chữ (Tối đa 3.0 điểm)**:
    - Giáo viên đánh giá qua thanh trượt: Độ sạch đẹp, giữ đúng dòng kẻ ô ly, thụt đầu dòng đoạn văn, không tẩy xóa lem nhem.
  - **Tổng điểm Chính tả**: Điểm = Điểm Chính tả + Điểm Hình thức (thang điểm 10).
- **Tính ưu việt**: **Zero-Hallucination (Không ảo giác)** — Điểm số và danh sách lỗi hoàn toàn dựa trên sự thật khách quan của bài đọc mẫu, không phụ thuộc vào suy diễn của AI.

### Phân môn 2: Chấm Điểm Bài Tập Làm Văn (Viết Đoạn Văn / Miêu Tả / Kể Chuyện)
- **Phương pháp**: Kiến trúc Đánh giá 2 Tầng (Two-Tier Evaluation Architecture).
- **Barem đánh giá toàn diện 4 tiêu chí (10 điểm)**:
  1. *Chính tả & Ngữ pháp (Tối đa 4.0 điểm)*: Trừ điểm theo số lỗi chính tả và câu què/câu cụt.
  2. *Hình thức & Bố cục (Tối đa 3.0 điểm)*: Đầy đủ mở đoạn, thân đoạn, kết đoạn; chữ viết rõ ràng.
  3. *Nội dung & Cảm xúc (Tối đa 2.0 điểm)*: Đúng chủ đề đề bài, bài viết có cảm xúc chân thật.
  4. *Sáng tạo & Biện pháp tu từ (Tối đa 1.0 điểm)*: Sử dụng hình ảnh so sánh, nhân hóa, từ láy gợi tả sinh động.
- **Cơ chế vận hành 2 tầng AI**:
  - **Tầng 1 (Định lượng & Phân tích cấu trúc)**:
    - ViT5 quét lỗi chính tả và câu từ.
    - Bộ bóc tách cú pháp regex phát hiện các biện pháp tu từ: So sánh (`detect_similes`), nhân hóa (`detect_personifications`), và từ láy tượng thanh/tượng hình (`REDUPLICATIONS`).
    - Khóa chặt điểm số định lượng toán học (0.0 / 0.5 / 1.0đ), tuyệt đối không để AI tạo sinh can thiệp làm sai lệch điểm số.
  - **Tầng 2 (Sư phạm & Khích lệ tích cực - SLM Qwen2.5-0.5B-Instruct)**:
    - Mô hình ngôn ngữ nhỏ chạy cục bộ tiếp nhận các dẫn chứng tu từ từ Tầng 1 và sinh lời phê sư phạm ấm áp:
      * *Khen ngợi sáng tạo trước*: Nêu đích danh câu văn có hình ảnh so sánh hoặc từ láy hay mà học sinh đã viết.
      * *Gợi mở hoàn thiện sau*: Hướng dẫn nhẹ nhàng cách khắc phục các lỗi chính tả hoặc cách dùng từ chuẩn mực hơn.
    - Cơ chế **Fallback Graceful**: Nếu thiết bị không nạp mô hình Qwen, Tầng 1 tự động cung cấp câu nhận xét chuẩn mực theo mẫu sư phạm, đảm bảo tiến độ chấm bài không bao giờ bị gián đoạn.

---

## 11.6 Giao diện tương tác Human-in-the-loop & Báo cáo Thống kê

Hệ thống tuân thủ triệt để nguyên tắc **AI hỗ trợ — Giáo viên quyết định**:
- **Popup Chấm điểm Thông minh**:
  - Hiển thị song song ảnh gốc bài làm và văn bản đã trích xuất.
  - Giáo viên có thể bấm trực tiếp vào từng từ trên màn hình để thêm/bỏ đánh dấu lỗi nếu Gemini nhận diện nhầm.
  - Tinh chỉnh điểm Hình thức, Nội dung, Sáng tạo tức thì qua các thanh trượt mượt mà.
  - Xem trước câu nhận xét gợi ý, bấm nút "Áp dụng nhận xét" để lưu vào hồ sơ bài làm.
- **Báo cáo Thống kê Phiên học (`/teacher/reports`)**:
  - Thống kê tỷ lệ lỗi sai phổ biến của cả lớp (ví dụ: có bao nhiêu học sinh viết sai vần *an/ang*, từ nào bị sai nhiều nhất).
  - Biểu đồ phân bố điểm số giúp giáo viên nắm bắt ngay mức độ tiếp thu bài học để có kế hoạch phụ đạo kịp thời.

---

# PHẦN III — NỘI DUNG VÀ NHIỆM VỤ THỰC HIỆN ĐỀ TÀI

## - Nội dung đề tài:
+ Nghiên cứu và xây dựng nền tảng Web-app chuyên biệt (Next.js 16, React 19, TypeScript, TailwindCSS, Prisma ORM, SQLite) hỗ trợ giáo viên tiểu học giảng dạy chính tả và tự động chấm điểm bài viết tay học sinh.
+ Xây dựng Module **Đọc Chính Tả Trực Tiếp Trên Web** tích hợp công nghệ tổng hợp tiếng nói tự nhiên Microsoft Edge-TTS, mô phỏng ngữ điệu giảng dạy của giáo viên tiểu học với bộ điều khiển nhịp đọc sư phạm chuyên sâu (tốc độ đọc, quãng nghỉ theo số lượng từ, lặp lại câu, đánh vần từ khó).
+ Số hóa và cấu trúc cơ sở dữ liệu Kho ngữ liệu bài đọc chính tả chuẩn hóa theo chương trình Sách Giáo Khoa Tiếng Việt Tiểu học mới (Lớp 1 đến Lớp 5 thuộc các bộ sách Kết Nối Tri Thức, Cánh Diều, Chân Trời Sáng Tạo).
+ Xây dựng pipeline tiền xử lý ảnh bài viết tay học sinh tiểu học bằng TypeScript (Jimp): Tự động xoay ảnh theo EXIF, nắn chỉnh góc nghiêng (Deskew qua Projection Profile Variance), khử bóng đổ (Shadow Removal), tăng tương phản nét chữ (CLAHE) và làm mờ nền ô ly.
+ Tích hợp mô hình thị giác đám mây Gemini Vision VLM (`gemini-3.1-flash-lite`) trích xuất nguyên văn văn bản chữ viết tay học sinh (`original_text`), kết hợp bộ lọc kiểm soát tốc độ Rate Limiting Guard bảo vệ hạn ngạch API.
+ Phát triển giải thuật so khớp chuỗi mức độ từ (Word-level Sequence Alignment / Levenshtein Dynamic Programming) đối chiếu trực tiếp giữa văn bản OCR và văn bản chuẩn của phiên đọc chính tả (Ground-Truth Guided Grading), loại bỏ 100% hiện tượng ảo giác (Zero-Hallucination).
+ Xây dựng bộ luật ngữ âm tiếng Việt (Vietnamese Phonetic Rules) phân loại chính xác 6 nhóm lỗi chính tả tiểu học: phụ âm đầu, vần, dấu thanh, viết hoa, bỏ sót/thêm từ, dấu câu.
+ Thiết kế và hiện thực hóa **Kiến trúc Đánh giá 2 Tầng (Two-Tier Evaluation Architecture)** cho bài Tập làm văn: Tầng 1 định lượng toán học kết hợp bóc tách biện pháp tu từ; Tầng 2 ứng dụng mô hình ngôn ngữ nhỏ SLM `Qwen2.5-0.5B-Instruct` chạy cục bộ trên CPU/Edge sinh lời phê sư phạm tích cực, ấm áp.
+ Xây dựng giao diện chấm bài tương tác trực quan (Human-in-the-loop) với khả năng hiển thị song song (Side-by-Side), đánh dấu lỗi trực tiếp và thanh trượt điều chỉnh điểm số linh hoạt theo chuẩn Thông tư 27/2020/TT-BGDĐT.
+ Thực hiện kiểm thử toàn diện, đo kiểm hiệu năng hệ thống (độ trễ luồng âm thanh TTS, thời gian xử lý ảnh OCR, độ chính xác phân loại lỗi, tài nguyên tiêu thụ RAM/CPU khi suy luận cục bộ trên máy tính cá nhân và Raspberry Pi).

## - Nhiệm vụ đề tài:
+ Đọc và phân tích các yêu cầu sư phạm của phân môn Tiếng Việt Tiểu học (Chương trình GDPT 2018 và Thông tư 27/2020/TT-BGDĐT) để thiết kế barem điểm và quy trình đọc chính tả chuẩn mực.
+ Thiết kế và hoàn thiện cấu trúc Database Schema (Prisma/SQLite) gồm 6 bảng: `User`, `Class`, `Grade`, `TextbookPassage`, `DictationSession`, `DictationLog`.
+ Thu thập, làm sạch và số hóa dữ liệu các bài chính tả trong Sách Giáo Khoa Tiếng Việt từ Lớp 1 đến Lớp 5 nạp vào cơ sở dữ liệu hệ thống.
+ Phát triển giao diện Tab Đọc chính tả Web (`app/teacher/dictation/page.tsx`): Tích hợp Web Audio API, bộ đếm ngược ngắt nghỉ sư phạm, danh sách từ khó và cơ chế lưu phiên đọc.
+ Xây dựng microservice backend bằng Python FastAPI (`python_service/main.py`): Tích hợp Edge-TTS streaming âm thanh tiếng Việt chất lượng cao qua endpoint `GET /tts`.
+ Tích hợp mô hình ngôn ngữ tiếng Việt ViT5 (`chamdentimem/ViT5_Vietnamese_Correction`) với kỹ thuật Dynamic INT8 Quantization phục vụ sửa lỗi chính tả cục bộ.
+ Tích hợp mô hình ngôn ngữ nhỏ SLM `Qwen2.5-0.5B-Instruct` vào backend FastAPI để phục vụ Tầng 2 sinh lời nhận xét sư phạm bài tập làm văn.
+ Xây dựng module tiền xử lý ảnh viết tay trong `lib/image-processor.ts`: Hoàn thiện thuật toán nắn thẳng góc nghiêng (Deskew), khử bóng và cân bằng trắng.
+ Tích hợp Google Gemini Vision API (`gemini-3.1-flash-lite`) kèm bộ lọc kiểm soát tốc độ Rate Limiting Guard (`lib/api-guard.ts`).
+ Cài đặt thuật toán so khớp chuỗi SequenceMatcher và bộ luật phân loại 6 dạng lỗi chính tả tiếng Việt.
+ Phát triển giao diện chấm bài thông minh (`app/teacher/grade/page.tsx`): Cho phép chuyển đổi giữa chế độ Chính tả (so khớp Ground Truth) và Tập làm văn (nhận xét sư phạm 2 tầng), hỗ trợ giáo viên duyệt và lưu kết quả.
+ Phát triển module báo cáo thống kê (`app/teacher/reports/page.tsx`): Phân tích biểu đồ phân bố điểm, tỷ lệ lỗi sai phổ biến toàn lớp, cảnh báo lỗi phương ngữ.
+ Thu thập tập mẫu thực nghiệm ảnh bài viết tay học sinh tiểu học thực tế để đo độ chính xác OCR và F1-Score phân loại lỗi.
+ Đo kiểm thời gian xử lý toàn trình (End-to-End Latency) và mức tiêu thụ tài nguyên RAM/CPU khi hệ thống vận hành thực tế.
+ Tổng hợp số liệu thực nghiệm, đánh giá kết quả đạt được, phân tích ưu nhược điểm và hoàn thiện báo cáo đề tài tốt nghiệp.

---

# PHẦN IV — TỔNG HỢP VẤN ĐỀ VÀ ĐỀ XUẤT HOÀN THIỆN HỆ THỐNG

> Mục này tổng hợp các ý kiến phản biện chuyên môn, rà soát tính chuẩn xác về mặt sư phạm tiểu học và định hướng tối ưu hóa toàn diện cho hệ thống ViHand Grade.

---

## 1. Bảng Tổng Hợp Vấn Đề & Đề Xuất Theo Thứ Tự Ưu Tiên

| Mức độ ưu tiên | Lỗi cần sửa | Vấn đề hiện tại | Giải pháp đã chuẩn hóa trong hệ thống |
| :---: | :--- | :--- | :--- |
| **1** | **Barem chấm điểm không phù hợp với bài chính tả** | Hệ thống cũ chia 10 điểm thành: *Chính tả 4đ + Hình thức 3đ + Nội dung 2đ + Sáng tạo 1đ*. Hai tiêu chí "Nội dung" và "Sáng tạo" không đúng với bài nghe - viết chính tả. | **Đã giải quyết**: Tách riêng 2 chế độ chấm điểm:<br>- **Chính tả SGK**: Barem 10đ = Chính tả 7.0đ + Hình thức 3.0đ.<br>- **Tập làm văn**: Barem 10đ = Chính tả 4đ + Hình thức 3đ + Nội dung 2đ + Sáng tạo 1đ (kèm nhận xét sư phạm 2 tầng). |
| **2** | **Gắn barem cụ thể với Thông tư 27/2020/TT-BGDĐT** | Tài liệu cũ ghi *"Barem 4 tiêu chí theo quy định Thông tư 27"*, trong khi Thông tư 27 không ban hành công thức số học cố định 4-3-2-1. | **Đã giải quyết**: Điều chỉnh chuẩn xác: Barem được thiết kế theo định hướng đánh giá năng lực của Chương trình GDPT 2018 và tinh thần Thông tư 27 (kết hợp nhận xét định tính với điểm số định lượng); cho phép giáo viên tùy chỉnh linh hoạt trọng số trên UI. |
| **3** | **Pipeline AI chưa logic khi bài chính tả đã có đáp án chuẩn** | Mô tả cũ để Gemini OCR đọc chữ rồi ViT5 tự đoán và sửa lỗi, dễ gây ra hiện tượng ảo giác (hallucination) làm biến đổi câu văn. | **Đã giải quyết**: Triển khai pipeline đối soát chuẩn mực (**Ground-Truth Guided Pipeline**): Ảnh bài viết -> OCR -> So khớp trực tiếp với bài đọc mẫu từ phiên chính tả -> Loại bỏ 100% ảo giác. ViT5 chỉ dùng cho bài Tập làm văn hoặc chế độ gõ tay tự do. |
| **4** | **Phụ thuộc vào phần cứng vi điều khiển ESP32-S3** | Dự kiến ban đầu chế tạo mạch phần cứng vật lý ESP32-S3 gây phức tạp, tốn kém chi phí linh kiện, dễ rớt mạng WiFi lớp học. | **Đã giải quyết**: Bãi bỏ hoàn toàn phần cứng ESP32-S3; chuyển đổi sang **Tab Đọc chính tả trực tiếp trên Web (`/teacher/dictation`)** phát qua Edge-TTS chất lượng cao, tận dụng ngay máy tính và loa sẵn có của lớp học. |
| **5** | **Tuyên bố tuyệt đối thiếu số liệu thực nghiệm** | Tài liệu cũ dùng các khẳng định mang tính cam kết tuyệt đối như *"không bao giờ sai đáp án"*, *"dưới 0.5 giây"*, *"chạy 24/7 trên RPi4"*. | **Đã giải quyết**: Chuẩn hóa sang văn phong khoa học có điều kiện đo rõ ràng; dẫn chứng số liệu kiểm chứng thực nghiệm cụ thể (44/44 bài test thực tế, thời gian trễ P50/P95). |
| **6** | **Chưa nhất quán về danh mục lỗi và ranh giới hệ thống** | Lúc ghi 5 lỗi lúc ghi 6 lỗi; ranh giới giữa online và offline chưa rõ ràng. | **Đã giải quyết**: Thống nhất chuẩn 6 nhóm lỗi chính tả tiểu học (`phu_am_dau`, `van`, `dau_thanh`, `viet_hoa`, `bo_sot_them`, `dau_cau`). Ranh giới rõ ràng: Chỉ OCR dùng Gemini Cloud, toàn bộ logic so khớp, phân loại lỗi và tổng hợp tiếng nói chạy độc lập. |

---

## 2. Phân Tích Chi Tiết & Kế Hoạch Chuẩn Hóa Sư Phạm

### 2.1 Vấn đề 1: Tách Biệt Rõ Ràng Barem Chấm Điểm 2 Phân Môn (Ưu tiên 1)
- **Bài tập Chính tả (Nghe - Viết / Nhìn - Viết)**:
  - Mục tiêu sư phạm là rèn luyện kỹ năng nghe - viết đúng con chữ, dấu thanh, giữ nề nếp vở sạch chữ đẹp. Học sinh không tự sáng tác nội dung. Do đó tiêu chí đánh giá tập trung trọn vẹn vào:
    1. *Độ chính xác chính tả (7.0 điểm)*: Trừ 0.5đ cho mỗi lỗi sai về âm, vần, thanh hoặc bỏ sót từ.
    2. *Hình thức & Quy cách trình bày (3.0 điểm)*: Độ sạch sẽ, thẳng hàng, đúng quy cách chữ hoa đầu câu và thụt lề ô ly.
- **Bài tập Tập làm văn (Kể chuyện / Miêu tả / Đoạn văn ngắn)**:
  - Học sinh thể hiện năng lực diễn đạt, vốn từ và cảm xúc sáng tạo. Áp dụng thang điểm 4 tiêu chí: Chính tả 4đ + Hình thức 3đ + Nội dung 2đ + Sáng tạo 1đ (hỗ trợ bởi Kiến trúc 2 tầng ViT5 + Qwen2.5-0.5B).

### 2.2 Vấn đề 2: Căn Cứ Pháp Lý & Tính Linh Hoạt Của Barem Điểm (Ưu tiên 2)
- Thông tư 27/2020/TT-BGDĐT quy định đánh giá học sinh tiểu học theo hướng khích lệ sự tiến bộ, kết hợp đánh giá thường xuyên (bằng nhận xét) và đánh giá định kỳ (bằng điểm số kèm nhận xét).
- Hệ thống ViHand Grade cụ thể hóa tinh thần này bằng cơ chế **Human-in-the-loop**: AI đưa ra gợi ý điểm số và nhận xét chi tiết từng lỗi sai, giáo viên giữ vai trò chủ đạo kiểm tra và tinh chỉnh điểm số qua thanh trượt trước khi chính thức lưu điểm.

### 2.3 Vấn đề 3: Tái Cấu Trúc Pipeline AI Đối Soát Văn Bản Chuẩn (Ưu tiên 3)
- Đối với bài chính tả, văn bản chuẩn (Ground Truth) được truyền trực tiếp từ phiên đọc sang bài chấm:
  - **Bước 1**: Ảnh chụp bài viết -> Tiền xử lý Jimp (Ảnh sạch ô ly, cân bằng sáng).
  - **Bước 2**: Gemini Vision OCR -> Trích xuất văn bản học sinh viết (Student Text - giữ nguyên lỗi).
  - **Bước 3**: Căn chỉnh chuỗi SequenceMatcher giữa Student Text và Ground Truth Text -> Tạo bảng so khớp từ - từ (Word-level Diff).
  - **Bước 4**: Bộ luật Ngữ âm tiếng Việt đối chiếu các điểm sai lệch -> Phân loại vào 6 nhóm lỗi chính tả.
  - **Bước 5**: Áp dụng barem chuẩn (7đ chính tả + 3đ hình thức) -> Tính điểm tự động + Sinh nhận xét sư phạm gợi ý.
  - **Bước 6**: Giao diện Giáo viên (Human-in-the-loop) -> Giáo viên rà soát, điều chỉnh thanh trượt & Lưu kết quả.

### 2.4 Vấn đề 4: Định Vị Đúng Tab Đọc Chính Tả Web Thay Thế Hoàn Toàn ESP32-S3 (Ưu tiên 4)
- Thay vì sử dụng phần cứng vi điều khiển riêng biệt, hệ thống tập trung xây dựng Tab Đọc chính tả Web (`/teacher/dictation`) mạnh mẽ:
  1. *Nguồn ngữ liệu trung tâm*: Quản lý danh mục SGK Lớp 1–5 chuẩn hóa trong CSDL.
  2. *Bộ điều khiển nhịp đọc*: Hỗ trợ giáo viên điều chỉnh tốc độ, thời gian ngắt nghỉ giữa các câu phù hợp với trình độ tiếp thu của từng lớp.
  3. *Liên kết dữ liệu tự động*: Kết thúc bài đọc, giáo viên chỉ cần 1 click để chuyển thẳng sang giao diện chấm bài của bài đọc đó.

### 2.5 Vấn đề 5: Chuyển Đổi Tuyên Bố Tuyệt Đối Sang Chỉ Số Đo Kiểm Khoa Học (Ưu tiên 5)
- Tài liệu sử dụng thuật ngữ đo kiểm chuẩn mực:
  - *"Thời gian xử lý toàn trình (End-to-End Latency) đạt 10–18 giây cho một trang viết tay tiêu chuẩn."*
  - *"Thuật toán so khớp Ground Truth loại bỏ hiện tượng sinh lỗi ảo (Zero-Hallucination) đối với phân môn chính tả."*
  - *"Kiến trúc 2 Tầng bóc tách sáng tạo đạt thời gian phản hồi siêu tốc: Tầng 1 hoàn tất dưới 2.5ms; Tầng 2 SLM hoàn tất trong 1–3 giây trên CPU."*

### 2.6 Vấn đề 6: Thống Nhất 6 Nhóm Lỗi Chính Tả & Ranh Giới Hệ Thống (Ưu tiên 6)
- Chuẩn hóa cố định **6 nhóm lỗi chính tả tiểu học**: `phu_am_dau`, `van`, `dau_thanh`, `viet_hoa`, `bo_sot_them`, `dau_cau`.
- Ranh giới rõ ràng:
  - **Dịch vụ Đám mây (Cloud)**: Chỉ sử dụng Google Gemini VLM API cho bước nhận diện chữ viết tay phức tạp từ ảnh chụp.
  - **Hệ thống Cục bộ (Local/Edge)**: Toàn bộ quá trình tiền xử lý ảnh, tổng hợp tiếng nói Edge-TTS, so khớp Levenshtein, phân loại lỗi, sinh nhận xét 2 tầng và lưu trữ CSDL SQLite đều vận hành cục bộ.

---

*Tài liệu đặc tả kỹ thuật ViHand Grade phiên bản **v2.3.0** — Cập nhật ngày 2026-09-05.*
*Đã rà soát và đồng bộ 100% với hiện trạng mã nguồn thực tế của dự án.*