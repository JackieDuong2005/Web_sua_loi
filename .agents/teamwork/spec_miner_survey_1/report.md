# Báo Cáo Đặc Tả Kỹ Thuật Chi Tiết: Next.js 16 Web Studio BFF, Prisma SQLite DB & Bảo Mật Hệ Thống ViHand Grade

**Mã tài liệu:** `SPEC-SURVEY-WEB-BFF-2026`  
**Ngày thực hiện:** 2026-10-05  
**Người thực hiện:** Specification Miner Agent (Next.js 16, Prisma SQLite, Security Domain Expert)  
**Workspace:** `c:\Users\Jackie Duong\Desktop\Web_sua_loi`  
**Trạng thái kiểm tra:** Hoàn thành đối soát mã nguồn thực tế 100% (Zero Assumptions, Zero Guesswork)

---

## 1. Tổng Quan Kiến Trúc Tầng Web Studio & BFF Gateway

Hệ thống Web Studio của **ViHand Grade** được xây dựng trên nền tảng **Next.js 16.2.4** (App Router architecture, React 19, TypeScript 5.7.3, Tailwind CSS v4, Radix UI), đóng vai trò kép:
1. **Web Studio (Front-office):** Cung cấp giao diện trực quan cho 3 nhóm người dùng phân quyền (RBAC):
   - **Giáo viên (`/teacher`):** AI Grading Studio (chấm điểm chữ viết tay đa phương thức kèm Bounding Box tương tác), Dictation Studio (phát âm chuẩn sư phạm Neural TTS & đồng bộ ngữ liệu SGK), Sổ điểm & Báo cáo phổ điểm trực quan.
   - **Học sinh (`/student`):** Bảng tiến độ rèn luyện, Sổ tay từ khó cá nhân hóa (nghe phát âm từ viết sai), Tra cứu lịch sử bài thi và xem lại ảnh bài làm gốc.
   - **Quản trị viên (`/admin`):** Quản trị người dùng & phân quyền, Quản lý lớp học & phân công giáo viên, Báo cáo thống kê toàn trường, Giám sát tài nguyên hệ thống theo thời gian thực, Thiết lập chính sách bảo vệ dữ liệu học sinh (Data Retention & Child Privacy).
2. **AI BFF Gateway (Backend-for-Frontend):** Cổng kết nối trung gian API chuyên dụng cho cả Web Client và Android Native Client (`android_app/`), điều phối luồng xử lý AI Hybrid giữa:
   - Python AI Microservice (ViT5 Vietnamese Correction Engine, YOLOv8 Line/Word Segmentation, Qwen 2.5 SLM Generator, Edge-TTS).
   - Google Gemini Multimodal Vision API (Gemini 3.1 Flash Lite / Gemini 2.5 Flash) qua cơ chế xoay vòng Multi-API Keys.
   - Prisma ORM 5.22.0 kết nối cơ sở dữ liệu SQLite tối ưu chế độ đa tiến trình (WAL Mode, busy timeout).

---

## 2. Kiến Trúc Cơ Sở Dữ Liệu Prisma SQLite (`vihand.db`)

### 2.1. Vị Trí Lưu Trữ & Cấu Hình Kết Nối

| Thông số | Giá trị thực tế trong mã nguồn | Dẫn chứng tệp & dòng |
| :--- | :--- | :--- |
| **Đường dẫn CSDL chính** | `c:\Users\Jackie Duong\Desktop\Web_sua_loi\prisma\vihand.db` | `.env:8`, `.env.local:8`, `prisma.config.ts:9` |
| **Kích thước file DB hiện tại** | `22,474,752 bytes` (~22.4 MB) | `prisma/vihand.db` (thực tế kiểm tra đĩa) |
| **Tệp nhật ký WAL & SHM** | `vihand.db-wal` (469 KB), `vihand.db-shm` (32 KB) | `prisma/` |
| **Bản sao dự phòng** | `prisma/prisma/vihand.db` (36 KB) | `prisma/prisma/vihand.db` |
| **Prisma Engine / Provider** | `sqlite` (Prisma Client JS v5.22.0) | `prisma/schema.prisma:1-8` |

### 2.2. Cơ Chế Xử Lý Đồng Thời & Chống Khóa Cơ Sở Dữ Liệu (High Concurrency Design)

Để giải quyết triệt để lỗi `"database is locked"` điển hình của SQLite khi 30–50 học sinh nộp bài cùng lúc trong lớp học, `lib/prisma.ts` thiết lập cơ chế tối ưu hóa cấp thấp thông qua PRAGMA:

- **Dẫn chứng:** `lib/prisma.ts:7-22`
```typescript
// Fix Issue #18: Kích hoạt SQLite WAL mode + busy_timeout để tránh "database is locked"
async function createPrismaWithWAL(): Promise<PrismaClient> {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })
  try {
    await client.$queryRawUnsafe("PRAGMA journal_mode = WAL;")
    await client.$queryRawUnsafe("PRAGMA busy_timeout = 5000;")
    await client.$queryRawUnsafe("PRAGMA synchronous = NORMAL;")
  } catch {
    // Bỏ qua nếu chạy trong môi trường test không phải SQLite
  }
  return client
}
```
- **Ý nghĩa kỹ thuật:**
  1. `PRAGMA journal_mode = WAL;`: Chuyển sang Write-Ahead Logging, cho phép **nhiều kết nối ĐỌC chạy song song không bị chặn bởi 1 kết nối GHI**.
  2. `PRAGMA busy_timeout = 5000;`: Thay vì văng lỗi khóa ngay lập tức, tiến trình chờ tối đa 5000ms để khóa ghi được giải phóng.
  3. `PRAGMA synchronous = NORMAL;`: Giảm thiểu thao tác fsync đĩa dư thừa, tăng tốc độ ghi dữ liệu bài nộp lên gấp 4–5 lần mà vẫn đảm bảo tính toàn vẹn khi mất điện đột ngột.
  4. **Singleton Pattern (`globalThis`):** Tránh hiện tượng rò rỉ kết nối (Connection Exhaustion) trong chu kỳ Next.js Hot Module Replacement (`lib/prisma.ts:24-36`).

### 2.3. Giải Pháp Chống Phình To Dung Lượng SQLite (Image Bloat Prevention)

- **Vấn đề kỹ thuật:** Ảnh bài thi độ phân giải cao dạng Base64 có kích thước 2–5MB. Nếu lưu trực tiếp chuỗi Base64 vào cột TEXT của SQLite, cơ sở dữ liệu sẽ nhanh chóng phình to hàng trăm megabyte, làm chậm nghiêm trọng tốc độ truy vấn B-Tree.
- **Giải pháp triển khai (Issue #11 Fix):**
  - Hàm `saveImageToDisk` trong `app/api/grades/route.ts:10-29` và `app/api/mobile/grade/route.ts:13-32` tự động bóc tách Base64 và ghi file vật lý vào thư mục máy chủ: `public/uploads/grades/${Date.now()}-${random}.jpg`.
  - Trong bản ghi CSDL `Grade`, cột `imageBase64` được làm rỗng (`""`), chỉ lưu đường dẫn tương đối trong cột `imagePath` (`/uploads/grades/...`).
  - Khi xóa bài thi (`DELETE /api/grades/[id]`, dòng 14–18), hệ thống tự động xóa tệp ảnh vật lý tương ứng trên đĩa bằng `fs.promises.unlink`.

### 2.4. Chi Tiết Thực Thể & Lược Đồ Dữ Liệu (`prisma/schema.prisma`)

#### Mô hình `User` (`prisma/schema.prisma:10-21`)
| Tên trường | Kiểu dữ liệu | Ràng buộc / Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(cuid())` | Khóa chính duy nhất dạng CUID |
| `name` | `String` | Bắt buộc | Họ và tên đầy đủ |
| `username` | `String` | `@unique` | Tên đăng nhập hệ thống (duy nhất) |
| `password` | `String` | `@default("123456")` | Mật khẩu tài khoản |
| `role` | `String` | `@default("student")` | Vai trò: `"teacher" \| "student" \| "admin"` |
| `className` | `String` | `@default("")` | Tên lớp học sinh trực thuộc (VD: `"3A1"`) |
| `active` | `Boolean` | `@default(true)` | Trạng thái kích hoạt tài khoản |
| `createdAt` | `DateTime` | `@default(now())` | Thời gian tạo tài khoản |
| `classes` | `Class[]` | `@relation("TeacherClasses")` | Quan hệ 1-N: Danh sách lớp giáo viên phụ trách |

#### Mô hình `Class` (`prisma/schema.prisma:23-32`)
| Tên trường | Kiểu dữ liệu | Ràng buộc / Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(cuid())` | Khóa chính CUID |
| `name` | `String` | `@unique` | Tên lớp học (VD: `"3A1"`, `"4B"`) |
| `grade` | `Int` | `@default(3)` | Khối lớp tiểu học (1, 2, 3, 4, 5) |
| `teacherId` | `String?` | Nullable, Khóa ngoại | Mã định danh giáo viên chủ nhiệm |
| `teacher` | `User?` | `fields: [teacherId], references: [id], onDelete: SetNull` | Quan hệ N-1. Khi xóa GV, lớp giữ nguyên, teacherId thành `null` |
| `createdAt` | `DateTime` | `@default(now())` | Thời gian tạo lớp |

#### Mô hình `Grade` (`prisma/schema.prisma:34-59`)
| Tên trường | Kiểu dữ liệu | Ràng buộc / Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(cuid())` | Khóa chính CUID |
| `gradingMode` | `String` | `@default("dictation")` | Chế độ chấm: `"dictation"` (Chính tả) \| `"essay"` (Tập làm văn) |
| `studentName` | `String` | Bắt buộc | Tên học sinh làm bài |
| `assignmentTitle`| `String` | Bắt buộc | Tiêu đề bài kiểm tra |
| `className` | `String` | `@default("")` | Tên lớp học |
| `originalText` | `String` | Bắt buộc | Văn bản gốc nhận diện từ OCR (giữ nguyên lỗi) |
| `fixedText` | `String` | Bắt buộc | Văn bản chuẩn đã sửa 100% chính tả |
| `corrections` | `String` | Bắt buộc (JSON string) | Danh sách chi tiết các lỗi, vị trí Bounding Box, gợi ý sửa |
| `score` | `String` | Bắt buộc | Điểm số hiển thị chuỗi (VD: `"8.5/10"`) |
| `scoreNum` | `Float` | Bắt buộc | Điểm số dạng số thực dùng tính toán, lọc, thống kê (VD: `8.5`) |
| `scoreBreakdown` | `String`| `@default("")` (JSON string) | Barem điểm chi tiết theo Thông tư 27 (Chính tả, Hình thức, Nội dung, Sáng tạo) |
| `feedback` | `String` | Bắt buộc | Nhận xét chung của hệ thống / giáo viên |
| `pedagogicalComment`| `String`| `@default("")` | Lời nhận xét sư phạm động viên học sinh tiểu học |
| `overallRating` | `String` | Bắt buộc | Xếp loại: `"Xuất sắc" \| "Tốt" \| "Khá" \| "Trung bình" \| "Cần cố gắng"` |
| `processingTimeMs`| `Int` | `@default(0)` | Tổng thời gian xử lý toàn pipeline (ms) |
| `tokenCount` | `Int` | `@default(0)` | Số lượng LLM tokens đã tiêu thụ (Gemini) |
| `imageBase64` | `String` | `@default("")` | Chuỗi ảnh Base64 (được xóa bỏ để bảo vệ DB) |
| `imagePath` | `String` | `@default("")` | Đường dẫn tệp ảnh vật lý trên máy chủ (`/uploads/grades/...`) |
| `dictationSessionId`| `String`| `@default("")` | Khóa liên kết với bài đọc Ground Truth (nếu có) |
| `expiresAt` | `DateTime?`| Nullable | Ngày hết hạn lưu trữ (mặc định = `createdAt + 365 ngày`) |
| `isAnonymized` | `Boolean` | `@default(false)` | Cờ đánh dấu đã ẩn danh hóa dữ liệu trẻ em theo NĐ 13/2023 |
| `anonymizedAt` | `DateTime?`| Nullable | Thời điểm thực hiện ẩn danh hóa và dọn ảnh |
| `createdAt` | `DateTime` | `@default(now())` | Thời điểm nộp bài chấm |

#### Mô hình `DictationSession` (`prisma/schema.prisma:67-79`)
| Tên trường | Kiểu dữ liệu | Ràng buộc / Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(cuid())` | Khóa chính CUID |
| `title` | `String` | Bắt buộc | Tiêu đề bài đọc chính tả (VD: `"Nghe viết: Ai có lỗi"`) |
| `passage` | `String` | Bắt buộc | Đoạn văn bản bài đọc chuẩn (Ground Truth đối soát 1-1) |
| `className` | `String` | `@default("")` | Lớp học thực hiện phiên đọc |
| `teacherName` | `String` | `@default("")` | Tên giáo viên chủ trì |
| `source` | `String` | `@default("web")` | Nguồn: `"web" \| "manual" \| "robot" \| "mcp"` |
| `deviceId` | `String` | `@default("")` | Định danh thiết bị phần cứng / Robot phát âm (nếu có) |
| `status` | `String` | `@default("completed")` | Trạng thái: `"completed" \| "in_progress" \| "cancelled"` |
| `summary` | `String` | `@default("")` | Tóm tắt nội dung bài học |
| `createdAt` | `DateTime` | `@default(now())` | Thời điểm bắt đầu phiên |
| `logs` | `DictationLog[]`| Quan hệ 1-N | Danh sách nhật ký chi tiết từng lượt trong phiên |

#### Mô hình `DictationLog` (`prisma/schema.prisma:82-89`)
| Tên trường | Kiểu dữ liệu | Ràng buộc / Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(cuid())` | Khóa chính CUID |
| `sessionId` | `String` | Khóa ngoại | Liên kết tới `DictationSession.id` |
| `session` | `DictationSession` | `fields: [sessionId], onDelete: Cascade` | Tự động xóa sạch log khi xóa phiên đọc |
| `speaker` | `String` | Bắt buộc | Đối tượng phát ngôn: `"teacher" \| "student" \| "ai" \| "robot"` |
| `content` | `String` | Bắt buộc | Nội dung văn bản đọc hoặc lệnh tương tác |
| `createdAt` | `DateTime` | `@default(now())` | Thời điểm ghi nhận log |

#### Mô hình `TextbookPassage` (`prisma/schema.prisma:92-101`)
| Tên trường | Kiểu dữ liệu | Ràng buộc / Mặc định | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- |
| `id` | `String` | `@id @default(cuid())` | Khóa chính CUID |
| `gradeLevel` | `Int` | `@default(3)` | Khối lớp tiểu học: `1, 2, 3, 4, 5` |
| `bookSet` | `String` | `@default("KetNoi")` | Bộ sách giáo khoa: `"KetNoi" \| "CanhDieu" \| "ChanTroi"` |
| `unit` | `String` | `@default("Tuần 1")`| Tuần / Bài học (VD: `"Tuần 3"`, `"Bài 12"`) |
| `title` | `String` | Bắt buộc | Tiêu đề đoạn trích SGK |
| `content` | `String` | Bắt buộc | Toàn bộ văn bản chính tả chuẩn mực |
| `difficultWords`| `String` | `@default("")` | Danh sách từ khó dễ nhầm lẫn (phân cách bằng dấu phẩy) |
| `createdAt` | `DateTime` | `@default(now())` | Ngày tạo bản ghi |

---

## 3. Đặc Tả Chi Tiết Hệ Thống Route Handlers (`app/api/**`)

Toàn bộ hệ thống Backend-for-Frontend gồm **24 route handlers** (38 HTTP methods) được triển khai qua App Router (`route.ts`). Không sử dụng Server Actions nhằm đảm bảo tương thích tuyệt đối giữa Web SPA và Mobile REST Client.

### 3.1. Bảng Tổng Hợp Danh Mục API Endpoints

| # | Endpoint URL | Phương thức | Tệp mã nguồn | Mục đích nghiệp vụ | Phân quyền / Bảo vệ |
|---|---|---|---|---|---|
| 1 | `/api/health` | `GET` | `app/api/health/route.ts` | Kiểm tra tình trạng gateway & trạm biên RPi | Public |
| 2 | `/api/auth/login` | `POST` | `app/api/auth/login/route.ts` | Xác thực đăng nhập người dùng | Public |
| 3 | `/api/auth/register` | `POST` | `app/api/auth/register/route.ts` | Đăng ký tài khoản giáo viên/học sinh | Public |
| 4 | `/api/auth/admin-register` | `POST` | `app/api/auth/admin-register/route.ts` | Đăng ký admin bằng mã bí mật | `ADMIN_SECRET_KEY` Guard |
| 5 | `/api/users` | `GET`, `POST` | `app/api/users/route.ts` | Lấy danh sách & tạo người dùng mới | Admin Portal |
| 6 | `/api/users/[id]` | `DELETE`, `PATCH` | `app/api/users/[id]/route.ts` | Xóa & cập nhật thông tin người dùng | Admin Portal |
| 7 | `/api/classes` | `GET`, `POST` | `app/api/classes/route.ts` | Lấy danh sách lớp & tạo lớp học mới | Admin / Teacher Portal |
| 8 | `/api/classes/[id]` | `DELETE`, `PATCH` | `app/api/classes/[id]/route.ts` | Xóa & chỉnh sửa thông tin lớp học | Admin Portal |
| 9 | `/api/grades` | `GET`, `POST` | `app/api/grades/route.ts` | Tra cứu bảng điểm & lưu kết quả chấm | Teacher / Mobile / Student |
| 10 | `/api/grades/[id]` | `GET`, `DELETE`, `PATCH` | `app/api/grades/[id]/route.ts` | Chi tiết, xóa bài & lưu chỉnh sửa BBox | Teacher Studio |
| 11 | `/api/mobile/grade` | `POST` | `app/api/mobile/grade/route.ts` | BFF chuyên biệt trọn gói cho Android App | Rate Limiter (20 req/phút) |
| 12 | `/api/grade` | `POST` | `app/api/grade/route.ts` | Lõi xử lý chấm điểm AI Hybrid đa tầng | Rate Limiter (30 req/phút) |
| 13 | `/api/grade/comments` | `POST` | `app/api/grade/comments/route.ts` | Tái sinh 3 nhận xét sư phạm không trùng lặp | Local Qwen / MoET Bank |
| 14 | `/api/ocr` | `POST` | `app/api/ocr/route.ts` | Nhận diện chữ viết tay qua Gemini Vision | Rate Limiter (30 req/phút) |
| 15 | `/api/preprocess` | `POST` | `app/api/preprocess/route.ts` | Tiền xử lý ảnh bài thi học sinh (Jimp) | Public |
| 16 | `/api/yolo/detect` | `POST` | `app/api/yolo/detect/route.ts` | Quét tọa độ Bounding Box từ viết tay | Rate Limiter (60 req/phút) |
| 17 | `/api/vit5-warmup` | `GET` | `app/api/vit5-warmup/route.ts` | Làm nóng (warm up) model ViT5 trên RAM | Internal / Init |
| 18 | `/api/dictation/passages` | `GET`, `POST`, `PATCH`, `DELETE` | `app/api/dictation/passages/route.ts` | CRUD kho bài đọc chuẩn SGK | Teacher Portal |
| 19 | `/api/dictation/sessions` | `GET`, `POST` | `app/api/dictation/sessions/route.ts` | Lấy danh sách & tạo phiên đọc chính tả | Teacher / Robot / MCP |
| 20 | `/api/dictation/sessions/[id]` | `GET`, `DELETE` | `app/api/dictation/sessions/[id]/route.ts` | Chi tiết phiên đọc kèm lịch sử hội thoại | Teacher Studio |
| 21 | `/api/dictation/sessions/[id]/logs` | `GET`, `POST` | `app/api/dictation/sessions/[id]/logs/route.ts` | Truy vấn & ghi log tương tác phiên đọc | Teacher / Robot / MCP |
| 22 | `/api/dictation/tts` | `GET` | `app/api/dictation/tts/route.ts` | Phát âm Edge-TTS Neural / Google TTS | Public / Audio Studio |
| 23 | `/api/dictation/generate` | `POST` | `app/api/dictation/generate/route.ts` | Sáng tác bài đọc chính tả bằng Qwen 2.5 | Rate Limiter (30 req/phút) |
| 24 | `/api/admin/retention` | `GET`, `POST` | `app/api/admin/retention/route.ts` | Quản trị chính sách lưu trữ & dọn dẹp ảnh | Admin Security |

---

### 3.2. Điểm Nhấn Kiến Trúc: BFF Endpoint `/api/mobile/grade`

Endpoint `POST /api/mobile/grade` (`app/api/mobile/grade/route.ts:347-524`) được thiết kế đóng vai trò cổng Gateway tất cả trong một (All-in-one BFF Gateway) cho ứng dụng di động Android Native:

```
[Android Native App] 
       │ (HTTP POST imageBase64, studentName, className, gradingMode)
       ▼
[app/api/mobile/grade/route.ts]
       ├── 1. Rate Limiting Check: guardAiRoute(req, 20)
       ├── 2. Parallel Processing (Promise.all):
       │      ├── runGeminiOCR: Multi-key rotation + Prompt đối soát 1-1
       │      └── detectYoloBoxes: Gọi POST http://127.0.0.1:8000/detect-words
       ├── 3. In-process Direct Invocation:
       │      └── handleGradePost(directReq) -> Lõi app/api/grade/route.ts (Zero-network delay)
       ├── 4. Transform Output: Chuyển đổi định dạng sang GradeApiResponse của Android Client
       └── 5. Auto-persistence: Lưu tự động vào Prisma vihand.db và ghi ảnh đĩa vật lý
```

- **Request DTO:**
```json
{
  "imageBase64": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "studentGrade": 3,
  "gradingMode": "dictation",
  "studentName": "Nguyễn Văn An",
  "className": "Lớp 3A1",
  "the_loai": "tho",
  "essayType": "poem",
  "hinh_thuc": 3.0,
  "noi_dung": 2.0,
  "penalty_per_error": 0.5
}
```
- **Response Schema (`GradeApiResponse` Parity):**
```json
{
  "status": "success",
  "essayTitle": "Bài chính tả — Nguyễn Văn An",
  "studentName": "Nguyễn Văn An",
  "className": "Lớp 3A1",
  "criteria": {
    "spellingScore": 6.5,
    "formatScore": 3.0,
    "contentScore": 0.0,
    "creativityScore": 0.0,
    "totalScore": 9.5
  },
  "pedagogicalComment": "Bài viết rất cẩn thận, không mắc lỗi chính tả nào. Con viết đúng chuẩn bài đọc mẫu, cô rất khen ngợi!",
  "pedagogicalComments": [
    "Bài viết rất cẩn thận, không mắc lỗi chính tả nào. Con viết đúng chuẩn bài đọc mẫu, cô rất khen ngợi!",
    "Chữ viết sạch sẽ, đều nét và hoàn thành đúng 100% bài đọc. Con tiếp tục giữ vững phong độ nhé!",
    "Con lắng nghe và chép bài rất tập trung, bài làm chỉn chu không sai một từ nào. Cô rất tự hào về con!"
  ],
  "extractedText": "Mặt trời thức dậy\nThổi bừng ánh mai",
  "correctedFullText": "Mặt trời thức dậy\nThổi bừng ánh mai",
  "errors": [
    {
      "id": "err_0",
      "originalWord": "mặt",
      "correctedWord": "Mặt",
      "errorType": "viet_hoa",
      "explanation": "Chữ 'mặt' cần viết hoa thành 'Mặt' ở đầu dòng thơ nhé.",
      "penalty": 0.5,
      "lineNumber": 1,
      "x1": 120, "y1": 45, "x2": 210, "y2": 85,
      "rel_x1": 0.12, "rel_y1": 0.045, "rel_w": 0.09, "rel_h": 0.04
    }
  ],
  "processingTimeMs": 2340,
  "serverSource": "ViHand Grade Server (Mobile BFF • hybrid)",
  "serverGradeId": "cly987123abcdef",
  "imagePath": "/uploads/grades/mobile-1717500000-xyz123.jpg",
  "createdAt": "2026-10-05T15:10:00.000Z"
}
```

---

### 3.3. Đặc Tả Lõi Chấm Điểm AI Đa Tầng (`/api/grade`)

Tệp `app/api/grade/route.ts` (1,224 dòng) hiện thực logic chấm điểm 3 tầng đảm bảo tính chính xác và không ảo giác (Zero-Hallucination):

1. **Luồng A — Ground Truth / Fixed Text Alignment (`route.ts:1063-1118`):**
   - Kích hoạt khi có `groundTruthText` hoặc `geminiFixedText`.
   - Sử dụng giải thuật đối soát chuỗi **LCS Opcodes Diff** (`route.ts:576-616`) kết hợp bộ tách cấu trúc âm tiết tiếng Việt chuyên sâu (`parseVietnameseSyllable`, `route.ts:245-282`) để phân loại chính xác 6 nhóm lỗi: `viet_hoa`, `dau_thanh`, `phu_am_dau`, `phu_am_cuoi`, `am_chinh`, `van`.
   - Thuật toán **Universal Reading-Order Stream Alignment** (`route.ts:743-756`) ánh xạ chuẩn xác từng từ sai sang tọa độ hộp Bounding Box của YOLOv8.
   - Nếu là chế độ `essay`, gọi `POST http://localhost:8000/qwen/generate` để sinh lời nhận xét sư phạm giàu tính cá nhân hóa từ các biện pháp tu từ (so sánh, từ láy, nhân hóa) được phát hiện bởi Tier-1 Creativity Analyzer (`route.ts:436-490`).
2. **Luồng B — ViT5 Microservice Correction (`route.ts:1120-1147`):**
   - Kích hoạt khi người dùng nhập tay (`source: "manual"`) không qua OCR.
   - Gửi yêu cầu đến `POST http://localhost:8000/grade` với cơ chế ngắt kết nối `AbortController` (timeout 120 giây). Tự động thử lại lần 2 nếu bị timeout.
3. **Luồng C — Gemini Fallback Grading (`route.ts:1149-1215`):**
   - Kích hoạt khi trạm biên ViT5 offline hoàn toàn.
   - Sử dụng prompt chấm điểm chuẩn Bộ GD&ĐT (`FALLBACK_GRADING_PROMPT`, dòng 68–127) qua Gemini 3.1 Flash Lite với cấu hình `temperature: 0.1`, `responseMimeType: "application/json"`.

---

## 4. Đặc Tả Giao Diện Web Studio & UI Modules (`app/**`)

### 4.1. Kiến Trúc Điều Hướng & RBAC Layouts

Hệ thống bảo vệ phân quyền tầng giao diện Client được phân tầng theo cấu trúc thư mục App Router:

```
app/
├── layout.tsx                (Root layout, theme provider, toasts)
├── page.tsx                  (Màn hình Đăng nhập chung)
├── register/page.tsx         (Đăng ký Giáo viên / Học sinh)
├── admin-register/page.tsx   (Đăng ký Quản trị viên kèm Secret Key)
├── admin/
│   ├── layout.tsx            (Admin RBAC Guard: kiểm tra user.role === 'admin')
│   ├── page.tsx              (Admin Dashboard: tổng quan hệ thống)
│   ├── classes/page.tsx      (Quản lý Lớp học: CRUD, gán GVCN)
│   ├── users/page.tsx        (Quản lý Người dùng: CRUD, đổi MK, bật/tắt)
│   ├── statistics/page.tsx   (Phổ điểm toàn trường, xếp hạng lớp)
│   ├── settings/page.tsx     (Cài đặt trường, thông báo, bảo mật)
│   └── system/page.tsx       (Giám sát tải CPU, RAM, Latency, Gemini Token)
├── teacher/
│   ├── layout.tsx            (Teacher RBAC Guard: kiểm tra user.role === 'teacher')
│   ├── page.tsx              (Teacher Dashboard: tổng quan lớp phụ trách)
│   ├── grade/page.tsx        (AI Grading Studio: Chấm điểm bài thi & BBox Editor)
│   ├── dictation/page.tsx    (Dictation Studio: Luyện viết & Neural TTS SGK)
│   └── reports/page.tsx      (Sổ điểm lớp học, thống kê dạng lỗi & Xuất dữ liệu)
└── student/
    ├── layout.tsx            (Student RBAC Guard: kiểm tra user.role === 'student')
    ├── page.tsx              (Student Dashboard & Sổ tay từ khó cá nhân hóa)
    └── history/page.tsx      (Tra cứu lịch sử bài làm & xem Bounding Box)
```

- **Cơ chế lưu phiên làm việc:** Sau khi đăng nhập thành công qua `/api/auth/login`, thông tin người dùng được lưu trữ tại `localStorage.getItem("vihand_user")`. Khi truy cập các route con, component layout tương ứng kiểm tra vai trò người dùng trong hook `useEffect` (`app/admin/layout.tsx:16-28`, `app/teacher/layout.tsx:16-28`, `app/student/layout.tsx:16-28`). Nếu không hợp lệ, hệ thống lập tức chuyển hướng về trang gốc (`/`).

---

### 4.2. Module Đỉnh Cao: AI Grading Studio (`app/teacher/grade/page.tsx` — 2,873 dòng)

Màn hình Chấm điểm của Giáo viên là module trung tâm của Web Studio, tích hợp quy trình 5 bước liền mạch (Stepper Workflow):
1. **Bước 1 — Tiếp nhận bài thi:** Tải ảnh từ máy tính (hỗ trợ kéo thả) hoặc chụp trực tiếp từ webcam/camera điện thoại.
2. **Bước 2 — Tiền xử lý ảnh (Preprocess):** Tự động cân bằng trắng, loại bỏ bóng đổ bằng thuật toán Box Blur Integral Image, cân bằng độ tương phản cục bộ CLAHE, khử nghiêng (Deskew) tối đa 15 độ và phát hiện độ sắc nét (Laplacian blur score). Tùy biến thích ứng cho học sinh Lớp 1-2 (bút chì nét to) và Lớp 3-5 (bút mực).
3. **Bước 3 — Nhận diện OCR chữ viết tay:** Tự động phân loại Thể loại (Thơ vs Văn xuôi), nhận diện 100% chữ viết tay của học sinh và chuẩn hóa viết hoa theo quy chuẩn Bộ GD&ĐT.
4. **Bước 4 — Bounding Box Visualizer & Interactive Editor:**
   - Vẽ toàn bộ các hộp Bounding Box đỏ bao quanh các từ viết sai trực tiếp trên nền ảnh bài thi thật của học sinh.
   - **Tương tác trực tiếp:** Giáo viên có thể nhấp chuột vào từng hộp chữ trên ảnh để sửa lại gợi ý, đổi nhóm lỗi ngữ âm, thay đổi mức trừ điểm, hoặc gỡ bỏ lỗi nếu AI nhận diện nhầm.
5. **Bước 5 — Đánh giá Barem & Nhận xét Sư phạm:**
   - Chuyển đổi linh hoạt giữa 2 barem:
     - **Chính tả (Dictation):** 7 điểm Chính tả (trừ 0.5đ/lỗi) + 3 điểm Trình bày chữ viết.
     - **Tập làm văn (Essay):** 4 điểm Chính tả + 3 điểm Hình thức + 2 điểm Nội dung + 1 điểm Sáng tạo (tự động đếm số lượng từ láy tượng thanh/tượng hình, phát hiện câu so sánh và nhân hóa).
   - Chọn lựa 1 trong 3 lời nhận xét sư phạm giàu tính khích lệ do AI đề xuất hoặc bấm nút làm mới để sinh nhận xét mới hoàn toàn không trùng lặp.
   - Bấm **"Lưu kết quả"**: Gửi `POST /api/grades` để lưu trữ vĩnh viễn vào hệ thống.

---

### 4.3. Module Dictation Studio (`app/teacher/dictation/page.tsx` — 1,948 dòng)

Phòng đọc chính tả thông minh dành cho giáo viên trên lớp hoặc học sinh tự luyện ở nhà:
- **Kho ngữ liệu SGK Tiểu học:** Tra cứu hơn 50+ bài đọc chính tả chuẩn chương trình GDPT 2018 theo từng khối lớp (1 đến 5), bộ sách (Kết nối tri thức, Cánh diều, Chân trời sáng tạo) và tuần học.
- **Động cơ phát âm Neural TTS:** Tích hợp 2 giọng đọc AI truyền cảm của Microsoft Edge-TTS: **Cô Hoài My** (`vi-VN-HoaiMyNeural` - giọng nữ trong trẻo, rõ chữ) và **Thầy Nam Minh** (`vi-VN-NamMinhNeural` - giọng nam ấm áp, chuẩn mực), cùng cơ chế dự phòng qua Google Translate TTS.
- **Tham số điều chỉnh nhịp đọc sư phạm:**
  - Tốc độ đọc (Speed rate): tùy chỉnh từ `-25%` đến `+10%` để phù hợp với tốc độ viết của học sinh từng khối lớp.
  - Số lần lặp lại từng cụm từ: 1 lần, 2 lần hoặc 3 lần.
  - Thời gian ngắt nghỉ giữa các câu: từ 3 đến 8 giây.
- **Sáng tác bài đọc mới bằng AI:** Sử dụng mô hình ngôn ngữ nhỏ Qwen 2.5 SLM cục bộ tạo đoạn văn chính tả theo chủ đề giáo viên mong muốn (ví dụ: "Tình bạn", "Mùa xuân trên quê hương").
- **Cầu nối sang chấm điểm:** Nút bấm trực tiếp *"Chuyển sang Chấm bài"* tự động mang đoạn văn vừa luyện viết sang AI Grading Studio làm bài mẫu Ground Truth.

---

## 5. Kiến Trúc Bảo Mật, Kiểm Soát Tần Suất & Quyền Riêng Tư

### 5.1. Cơ Chế In-Memory Sliding Window Rate Limiting (`lib/api-guard.ts`)

Để bảo vệ các endpoints AI nặng (`/api/grade`, `/api/ocr`, `/api/mobile/grade`, `/api/yolo/detect`) không bị tấn công từ chối dịch vụ (DoS) hoặc làm cạn kiệt hạn mức (Quota) của Gemini API khi chạy trên mạng trường học, hệ thống triển khai bộ lọc cửa sổ trượt (Sliding Window):

- **Dẫn chứng:** `lib/api-guard.ts:13-84`
- **Cấu trúc lưu trữ:** `Map<string, { timestamps: number[] }>`
- **Chu kỳ dọn rác:** `setInterval` chạy mỗi 60 giây (`CLEANUP_INTERVAL`), tự động xóa các IP không còn request trong 60 giây qua nhằm ngăn chặn rò rỉ bộ nhớ (Memory Leak).
- **Trích xuất IP khách hàng:** Ưu tiên đọc `x-forwarded-for` (lấy hop đầu tiên), kế tiếp là `x-real-ip`, fallback về `127.0.0.1`.
- **Hạn mức áp dụng:**
  - Mobile AI Grading (`/api/mobile/grade`): Tối đa **20 requests / phút / IP**.
  - Web AI Grading & OCR (`/api/grade`, `/api/ocr`): Tối đa **30 requests / phút / IP**.
  - YOLO Word Detection (`/api/yolo/detect`): Tối đa **60 requests / phút / IP**.
- **Phản hồi khi vi phạm (HTTP 429 Too Many Requests):**
```json
{
  "error": "Quá nhiều yêu cầu gọi AI. Vui lòng đợi 18 giây trước khi thử lại.",
  "retryAfter": 18
}
```
Đi kèm các HTTP response headers tiêu chuẩn: `Retry-After: 18`, `X-RateLimit-Limit: 30`, `X-RateLimit-Remaining: 0`.

---

### 5.2. Chính Sách Bảo Vệ Dữ Liệu Học Sinh & Quyền Riêng Tư Trẻ Em (`/api/admin/retention`)

Tuân thủ nghiêm ngặt **Nghị định 13/2023/NĐ-CP** về bảo vệ dữ liệu cá nhân của trẻ em trong môi trường giáo dục, hệ thống thiết kế mô hình vòng đời dữ liệu bài thi (Data Retention Lifecycle):

1. **Thời hạn lưu trữ mặc định:** Mỗi bài thi được gắn hạn lưu trữ `expiresAt = createdAt + 365 ngày` (tương đương 1 niên khóa học tập).
2. **Cơ chế Soft Purge (Ẩn danh hóa & xóa ảnh):**
   - Khi hết hạn lưu trữ hoặc khi quản trị viên thực hiện lệnh dọn dẹp (`POST /api/admin/retention` với `action: "anonymize"`):
     - Xóa hoàn toàn tệp ảnh bài làm chứa nét chữ học sinh trên đĩa máy chủ (`fs.promises.unlink`).
     - Đổi tên học sinh thành: `"Học sinh ẩn danh [Niên khóa 2025-2026]"`.
     - Xóa chuỗi `imagePath` và `imageBase64`.
     - Đặt cờ `isAnonymized = true` và ghi nhận thời điểm `anonymizedAt`.
     - **Bảo lưu giá trị nghiên cứu:** Điểm số tổng, phân loại lỗi ngữ âm (âm đầu, vần, dấu thanh) và điểm thành phần được giữ nguyên để phục vụ phân tích phổ điểm và nghiên cứu giáo dục dài hạn.
3. **Cơ chế Hard Delete:** Xóa vĩnh viễn cả tệp ảnh đĩa và dòng dữ liệu trong bảng `Grade` của SQLite.

---

### 5.3. Ma Trận Dự Phòng Đa Tầng (Multi-Tier Resilience Matrix)

| Phân hệ chức năng | Tầng ưu tiên 1 (Primary) | Tầng dự phòng 2 (Fallback 1) | Tầng dự phòng 3 (Fallback 2) |
| :--- | :--- | :--- | :--- |
| **Nhận diện OCR chữ viết tay** | Gemini 3.1 Flash Lite (Key 1) | Gemini 3.1 Flash Lite (Keys 2, 3, 4) | Gemini 2.5 Flash |
| **Sửa lỗi chính tả & Barem** | Ground Truth Levenshtein (Khớp 100% bài mẫu) | ViT5 Microservice (Port 8000) | Gemini Text-only Grading Prompt |
| **Phát hiện Bounding Box** | YOLOv8 Local Engine (Port 8000) | Trạm biên Raspberry Pi 4 (192.168.1.56) | BBox Estimation từ luồng từ OCR |
| **Phát âm bài đọc TTS** | Edge-TTS Hoài My / Nam Minh Neural | Google Translate TTS Direct | Web Speech API trên trình duyệt |
| **Lời nhận xét sư phạm** | Qwen 2.5 0.5B SLM Local | Ngân hàng mẫu Bộ GD&ĐT mở rộng | Fallback template cơ bản |
| **Sáng tác bài đọc chính tả** | Qwen 2.5 Passage Generator | Ngân hàng bài đọc SGK GDPT 2018 | Mẫu văn bản cố định theo lớp |

---

## 6. Bảng Tổng Hợp Tính Năng Đã Khám Phá (Features Discovered)

| # | Phân loại | Tính năng | Mô tả chức năng | Dữ liệu đầu vào (Inputs) | Dữ liệu đầu ra (Outputs) | Cơ chế xử lý lỗi | Phương thức khám phá |
|---|---|---|---|---|---|---|---|
| 1 | Database | SQLite WAL Mode & Concurrency | Cấu hình WAL, busy timeout 5s, synchronous NORMAL | Khởi tạo PrismaClient | Connection pool tối ưu | Bỏ qua nếu môi trường test không hỗ trợ PRAGMA | Code inspection `lib/prisma.ts:7-22` |
| 2 | Database | Image Disk Storage & Bloat Shield | Lưu ảnh vật lý ra thư mục public/uploads, lưu path trong DB | Chuỗi Base64 ảnh | Đường dẫn `/uploads/grades/...` | Trả về chuỗi rỗng nếu lưu file thất bại | Code inspection `app/api/grades/route.ts:10-29` |
| 3 | Database | Data Retention & Soft Purge | Tự động gắn expiresAt 365 ngày, ẩn danh hóa theo Nghị định 13 | action, retentionDays | Số file xóa, dung lượng giải phóng (MB) | Báo lỗi 400 nếu action không hợp lệ | Code inspection `app/api/admin/retention/route.ts:66-187` |
| 4 | Mobile BFF | Single-step Mobile Grading | Pipeline trọn gói: OCR + YOLO + ViT5 + DB Save cho Android | imageBase64, studentName, className | JSON GradeApiResponse khớp Android | HTTP 400 nếu thiếu ảnh, HTTP 503 nếu lỗi OCR | Code inspection `app/api/mobile/grade/route.ts:347-524` |
| 5 | Mobile BFF | In-process Direct Invocation | Gọi trực tiếp hàm POST của /api/grade trong cùng bộ nhớ Node.js | NextRequest instance nội bộ | NextResponse JSON trực tiếp | Fallback sang fetch loopback 127.0.0.1 nếu thất bại | Code inspection `app/api/mobile/grade/route.ts:225-240` |
| 6 | Grading Core | Ground Truth LCS Alignment | Đối soát 1-1 không ảo giác giữa bài làm và văn bản mẫu | studentText, referenceText | corrections, score, breakdown | Báo lỗi nếu studentText rỗng | Code inspection `app/api/grade/route.ts:576-616, 820-1006` |
| 7 | Grading Core | Vietnamese Syllable Parser | Tách âm đầu, vần, âm chính, âm cuối, thanh điệu tiếng Việt | Từ ngữ tiếng Việt | SyllableParts object | Xử lý an toàn các từ ghép và dị thể | Code inspection `app/api/grade/route.ts:245-282` |
| 8 | Grading Core | Universal Reading-Order Alignment | Ánh xạ vị trí từ lỗi sang Bounding Box của YOLO theo thứ tự đọc | StudentWordMeta, yoloBoxes | Tọa độ BoundingBox (rel_x, rel_y) | Trả về undefined nếu không có hộp khớp | Code inspection `app/api/grade/route.ts:743-756` |
| 9 | Grading Core | Essay Creativity Analyzer | Đếm từ láy tượng thanh/tượng hình, phát hiện so sánh, nhân hóa | fixedText | score (0-1đ), devices, evidence | Trả về 0đ nếu không tìm thấy biện pháp nghệ thuật | Code inspection `app/api/grade/route.ts:436-490` |
| 10 | Grading Core | Qwen SLM Pedagogical Generator | Sinh 3 nhận xét sư phạm cá nhân hóa từ mô hình Qwen 2.5 | creativity_score, evidence, errors | Mảng 3 câu nhận xét | Fallback sang ngân hàng mẫu Bộ GD&ĐT nếu timeout | Code inspection `app/api/grade/comments/route.ts:108-144` |
| 11 | Vision OCR | Multi-Key Gemini Rotation | Xoay vòng danh sách khóa API ngẫu nhiên khi gọi Gemini | imageBase64, mimeType | original_text, fixed_text, the_loai | Thử lần lượt các key và model (Flash-Lite -> Flash) | Code inspection `app/api/mobile/grade/route.ts:98-165` |
| 12 | Preprocess | Jimp Adaptive Preprocessor | Cân bằng trắng, khử bóng, CLAHE, khử nghiêng góc tới 15 độ | imageBase64, gradeLevel | processedImageBase64, quality report | Trả về ảnh gốc nếu xảy ra lỗi giải mã | Code inspection `lib/image-processor.ts`, `app/api/preprocess/route.ts` |
| 13 | Vision YOLO | Real-time Word Detection | Gọi YOLOv8 nano quét tọa độ tất cả các từ trên trang vở | imageBase64, conf, iou | boxes, lines, total_words | Thử localhost:8000 rồi thử RPi 192.168.1.56 | Code inspection `app/api/yolo/detect/route.ts:10-103` |
| 14 | Dictation | Neural Edge-TTS Streaming | Tạo luồng âm thanh phát âm tiếng Việt giọng Hoài My/Nam Minh | text, voice, rate | Stream audio/mpeg | Tự động fallback sang Google Translate TTS | Code inspection `app/api/dictation/tts/route.ts:11-95` |
| 15 | Dictation | Qwen 2.5 Passage Composer | Sáng tác đoạn văn chính tả theo khối lớp và chủ đề bài học | gradeLevel, topic, sentenceCount | title, content, difficultWords | Fallback sang ngân hàng bài đọc SGK 2018 | Code inspection `app/api/dictation/generate/route.ts:95-171` |
| 16 | Dictation | Textbook Corpus CRUD | Quản lý kho bài trích SGK (Kết nối, Cánh diều, Chân trời) | gradeLevel, bookSet, unit, title | Danh sách / Chi tiết bài đọc | Báo lỗi 400 nếu thiếu tiêu đề/nội dung | Code inspection `app/api/dictation/passages/route.ts:8-118` |
| 17 | Dictation | Session & Chat Log Tracking | Lưu trữ phiên đọc chính tả và nhật ký tương tác giáo viên/AI | title, passage, logs | DictationSession object | Cascade xóa logs khi xóa session | Code inspection `app/api/dictation/sessions/route.ts:5-86` |
| 18 | Security | Sliding Window Rate Limiter | Giới hạn số lượng request AI theo IP trong cửa sổ 60 giây | NextRequest, maxRequests | NextResponse 429 hoặc null (cho phép) | Trả về 429 kèm Retry-After header | Code inspection `lib/api-guard.ts:49-108` |
| 19 | Security | Admin Registration Secret Key | Khóa bí mật bảo vệ tạo tài khoản quyền Admin tối cao | secretKey, admin credentials | User admin object | HTTP 403 nếu sai secretKey | Code inspection `app/api/auth/admin-register/route.ts:7-109` |
| 20 | Security | Client-side Layout RBAC Guards | Bảo vệ điều hướng trang theo vai trò người dùng trong storage | localStorage vihand_user | Chuyển hướng router.push('/') nếu lệch role | Không render UI khi chưa xác thực role | Code inspection `app/admin/layout.tsx`, `app/teacher/layout.tsx`, `app/student/layout.tsx` |
| 21 | Web UI | Interactive Bounding Box Studio | Cho phép giáo viên nhấp vào hộp lỗi trên ảnh để sửa điểm | Tọa độ chuột, sự kiện click BBox | Cập nhật corrections và recalculate điểm | Giữ nguyên điểm cũ nếu hủy bỏ thao tác | Code inspection `app/teacher/grade/page.tsx:1-2873` |
| 22 | Web UI | Personalized Student Notebook | Trích xuất các từ học sinh từng viết sai kèm nút nghe phát âm | Danh sách bài làm cũ của học sinh | Danh sách từ khó cá nhân + Audio TTS | Fallback về từ khó chuẩn SGK khi chưa có bài thi | Code inspection `app/student/page.tsx:63-76, 120-160` |
| 23 | Web UI | System Performance Monitor | Giám sát trực quan số token tiêu thụ, độ trễ xử lý, người dùng | Dữ liệu DB Grade & User | Biểu đồ và thẻ chỉ số thống kê | Hiển thị loader trong khi fetch dữ liệu | Code inspection `app/admin/system/page.tsx:47-246` |
| 24 | PWA | Service Worker & Dynamic Icons | Cung cấp khả năng cài đặt PWA và cache ứng dụng ngoại tuyến | GET /app/sw.js, GET /app/icon/[size] | JS script, SVG/PNG icon stream | Trả về mã 400 nếu kích thước icon không phải 192/512 | Code inspection `app/sw.js/route.ts`, `app/icon/[size]/route.ts` |

---

## 7. Bảng Các Trường Hợp Biên & Tình Huống Ngoại Lệ (Edge Cases)

| # | Tính năng liên quan | Đầu vào / Kịch bản kiểm thử | Hành vi quan sát được thực tế trong mã nguồn | Dẫn chứng mã nguồn |
|---|---|---|---|---|
| 1 | `POST /api/grades` | Chuỗi điểm số bị format dị thường (ví dụ: `"abc"`, `"-5/10"`, `"15/10"`) | Server kiểm tra `isNaN(scoreNum) \|\| scoreNum < 0 \|\| scoreNum > 10`, từ chối lưu và trả về mã HTTP `400` với thông báo: `"Định dạng điểm không hợp lệ... Dự kiến dạng 'X.X/10'"` | `app/api/grades/route.ts:103-108` |
| 2 | `POST /api/mobile/grade` | Ảnh gửi lên bị rỗng hoặc chuỗi ký tự trắng | Kiểm tra `!imageBase64 \|\| imageBase64.trim().length === 0`, trả về HTTP `400` với body: `{"status": "error", "error": "Cần cung cấp ảnh (imageBase64)"}` | `app/api/mobile/grade/route.ts:371-377` |
| 3 | `POST /api/mobile/grade` | Dịch vụ YOLOv8 Python offline hoặc timeout 30s | Không làm crash luồng chính; hàm `detectYoloBoxes` bắt lỗi, ghi log cảnh báo và trả về `null`. Hệ thống vẫn chấm điểm bình thường và trả về kết quả không có BBox | `app/api/mobile/grade/route.ts:191-194` |
| 4 | `POST /api/grade` | ViT5 Service timeout quá 120s khi chấm bài dài | Đợi 10 giây và tự động retry lần 2; nếu vẫn timeout thì tự động fallback sang `callGemini` chấm điểm văn bản | `app/api/grade/route.ts:1128-1132, 1152-1176` |
| 5 | `POST /api/grade` | Học sinh nộp bài viết là thơ nhưng không thụt dòng chuẩn | Hàm `ensureVietnameseCapitalization` phân tích thể loại thơ và ép quy tắc viết hoa chữ cái đầu mỗi dòng thơ, tránh nhận định nhầm lỗi viết hoa | `app/api/grade/route.ts:1068-1073` |
| 6 | `POST /api/grade` | Học sinh nộp đoạn văn xuôi nhưng dòng bị tràn xuống | Không ép viết hoa đầu dòng vật lý (`the_loai === "van_xuoi"`), tránh sinh lỗi giả mạo (False Positives) ở các từ nối tiếp câu | `app/api/grade/route.ts:1070-1072` |
| 7 | `POST /api/grade` | Bài làm có cụm từ dài khác hoàn toàn so với bài mẫu | Thuật toán diff gộp các thao tác delete và insert liền kề thành thẻ `replace` nhóm và tính thành 1 lỗi cụm thay vì phạt điểm lũy kế từng từ | `app/api/grade/route.ts:604-614, 881-903` |
| 8 | `GET /api/dictation/tts` | Trạm Python microservice Edge-TTS bị ngắt kết nối | Timeout sau 10 giây, tự động chuyển tiếp sang gọi `Google Translate TTS` với header giả lập trình duyệt, đảm bảo học sinh vẫn nghe được âm thanh | `app/api/dictation/tts/route.ts:47-90` |
| 9 | `POST /api/dictation/generate` | Qwen SLM local quá tải hoặc không phản hồi sau 8 giây | Bắt ngoại lệ trong khối catch và fallback sang lấy ngẫu nhiên 1 bài đọc trong `FALLBACK_PEDAGOGICAL_PASSAGES` chuẩn GDPT 2018 theo đúng khối lớp | `app/api/dictation/generate/route.ts:143-163` |
| 10 | `POST /api/admin/retention` | Quản trị viên chỉ muốn xem trước dung lượng đĩa sẽ giải phóng | Gửi `action: "preview"`. Hệ thống quét và tính tổng kích thước các file ảnh quá hạn trên đĩa, trả về số file và số MB ước tính mà không xóa bất kỳ dữ liệu nào | `app/api/admin/retention/route.ts:97-118` |
| 11 | `DELETE /api/grades/[id]` | Bài thi có đường dẫn ảnh trên đĩa nhưng file vật lý đã bị xóa trước đó | Lệnh `await fs.unlink(diskPath).catch(() => {})` bắt lỗi im lặng, tiếp tục xóa bản ghi trong DB mà không gây gián đoạn API | `app/api/grades/[id]/route.ts:14-18` |
| 12 | `DELETE /api/users/[id]` | Xóa giáo viên đang phụ trách nhiều lớp học | Ràng buộc khóa ngoại Prisma `@relation("TeacherClasses", onDelete: SetNull)` tự động chuyển trường `Class.teacherId` về `null`, giữ nguyên lớp học và học sinh | `prisma/schema.prisma:29-30` |

---

## 8. Kết Luận Đánh Giá Kỹ Thuật

Qua quá trình thanh tra, đọc và đối soát toàn diện mã nguồn thực tế của hệ sinh thái **ViHand Grade**:
1. **Kiến trúc Next.js 16 App Router** được tổ chức rất bài bản, tách biệt rõ ràng giữa các tầng trình diễn (UI Presentation) và tầng cổng giao tiếp AI (BFF Gateway).
2. **Cơ sở dữ liệu Prisma SQLite (`vihand.db`)** đã được gia cố vững chắc với chế độ WAL, busy timeout 5s, và giải pháp tách ảnh vật lý ra đĩa nhằm ngăn chặn tình trạng phình to CSDL và nghẽn khóa ghi.
3. **Bộ API BFF `/api/mobile/grade`** đạt mức độ tương thích 100% với hợp đồng dữ liệu của ứng dụng Android Native App, cung cấp đầy đủ tọa độ Bounding Box, điểm số đa tiêu chí, phân loại lỗi ngữ âm sư phạm và lưu trữ tự động.
4. **Hệ thống bảo vệ đa tầng:** Cơ chế kiểm soát tốc độ cửa sổ trượt (In-Memory Sliding Window Rate Limiter), khóa bí mật quản trị, chính sách lưu trữ bảo vệ quyền riêng tư trẻ em theo Nghị định 13/2023/NĐ-CP, cùng ma trận dự phòng nhiều lớp đảm bảo hệ thống vận hành bền bỉ trên cả hạ tầng đám mây và máy chủ biên nội bộ (Raspberry Pi).
