# BÁO CÁO THANH TRA & ĐỐI SOÁT HỢP ĐỒNG API VÀ CẤU TRÚC DỮ LIỆU
## Hệ sinh thái ViHand Grade: Android Native App (`android_app/`) vs Web App BFF (`app/api/*`)

- **Người thực hiện**: Explorer Subagent 1 (API & Data Schema Specialist)
- **Đối tượng kiểm toán**: Android Native Kotlin codebase (`android_app/`) và Next.js Route Handlers (`app/api/*`, `prisma/schema.prisma`, `lib/types.ts`)
- **Thời điểm hoàn thành**: 2026-09-30T14:35:00Z
- **Phiên bản báo cáo**: 1.0 — Final Audit Report

---

## 1. OBSERVATION (Các Quan Sát Thực Nghiệm Cốt Lõi)

### 1.1. Cấu trúc Lớp Mạng Android Native App (`android_app/`)
1. **Kiến trúc Mạng**:
   - Sử dụng **Retrofit 2.11.0** kết hợp **Moshi 1.15.2** (`KotlinJsonAdapterFactory`) và **OkHttp 4.12.0** (`android_app/app/build.gradle.kts:109, 125, 128`).
   - Cấu hình Singleton Client tại `android_app/app/src/main/java/com/example/data/api/NetworkClient.kt:11-45`:
     - `DEFAULT_BASE_URL = "https://vihandgrade.click/"`
     - Timeouts: Connect 15s, Read 60s, Write 60s, Call 90s.
     - Interceptor duy nhất: `HttpLoggingInterceptor(Level.BODY)`. **Hoàn toàn không có `AuthInterceptor` hay bất kỳ cơ chế đính kèm Header Authorization / Bearer token nào** (`NetworkClient.kt:22-28`).
2. **Khai báo Endpoint Retrofit**:
   - Giao diện `GradeApiService.kt:12-62` khai báo 9 phương thức Retrofit:
     - `@POST("api/mobile/grade")` -> `submitForGrading(@Body request: GradeApiRequest): Response<GradeApiResponse>` (Dòng 13-16)
     - `@GET("api/health")` -> `checkHealth(): Response<Map<String, Any>>` (Dòng 18-19)
     - `@POST("api/auth/login")` -> `login(@Body request: LoginRequest): Response<LoginResponse>` (Dòng 22-25)
     - `@GET("api/dictation/passages")` -> `getDictationPassages(@Query("gradeLevel") Int?, @Query("bookSet") String?): Response<DictationPassagesResponse>` (Dòng 28-32)
     - `@GET("api/classes")` -> `getClasses(): Response<ClassesResponse>` (Dòng 35-36)
     - `@GET("api/users")` -> `getStudents(@Query("role") String = "student"): Response<StudentsResponse>` (Dòng 38-41)
     - `@POST("api/grades")` -> `syncGrade(@Body request: ServerGradeSyncRequest): Response<Map<String, Any>>` (Dòng 44-47)
     - `@GET("api/grades")` -> `getGrades(@Query("class") String?, @Query("search") String?): Response<ServerGradesResponse>` (Dòng 50-54)
     - `@PATCH("api/grades/{id}")` -> `updateGrade(@Path("id") String, @Body request: UpdateGradeRequest): Response<Map<String, Any>>` (Dòng 57-61)
   - Endpoint thứ 10 được gọi trực tiếp bằng `android.media.MediaPlayer` để stream luồng âm thanh nhị phân:
     - `GET /api/dictation/tts?text=...&voice=...&rate=...` tại `android_app/app/src/main/java/com/example/ui/screens/DictationScreen.kt:234`.
3. **Cơ chế Lưu trữ & Phiên đăng nhập Local trên Android**:
   - `UserSessionManager.kt:10-40`: Chỉ lưu các trường phẳng vào SharedPreferences (`user_id`, `name`, `username`, `role`, `class_name`, `classes`). Không lưu access token hay refresh token.
   - `AppDatabase.kt` / `GradeRecordDao.kt:9-85` / `GradeRecordEntity.kt:6-26`: Lưu trữ cục bộ toàn bộ kết quả chấm, bài thi, ảnh JPEG trên bộ nhớ trong (`filesDir/grades/`).

---

### 1.2. Cấu trúc Web BFF API (`app/api/*`) & Cơ sở Dữ liệu Prisma (`prisma/schema.prisma`)
1. **Danh mục Route Backend**:
   - Quét toàn bộ thư mục `app/api/` phát hiện chính xác **24 route handlers (`route.ts`)**, cung cấp tổng cộng **38 HTTP endpoint verbs**:
     - `app/api/mobile/grade/route.ts` (POST)
     - `app/api/grade/route.ts` (POST)
     - `app/api/grade/comments/route.ts` (POST)
     - `app/api/grades/route.ts` (GET, POST)
     - `app/api/grades/[id]/route.ts` (GET, PATCH, DELETE)
     - `app/api/health/route.ts` (GET)
     - `app/api/auth/login/route.ts` (POST)
     - `app/api/auth/register/route.ts` (POST)
     - `app/api/auth/admin-register/route.ts` (POST)
     - `app/api/classes/route.ts` (GET, POST)
     - `app/api/classes/[id]/route.ts` (PATCH, DELETE)
     - `app/api/users/route.ts` (GET, POST)
     - `app/api/users/[id]/route.ts` (PATCH, DELETE)
     - `app/api/dictation/passages/route.ts` (GET, POST, PATCH, DELETE)
     - `app/api/dictation/tts/route.ts` (GET)
     - `app/api/dictation/generate/route.ts` (POST)
     - `app/api/dictation/sessions/route.ts` (GET, POST)
     - `app/api/dictation/sessions/[id]/route.ts` (GET, DELETE)
     - `app/api/dictation/sessions/[id]/logs/route.ts` (GET, POST)
     - `app/api/ocr/route.ts` (POST)
     - `app/api/yolo/detect/route.ts` (POST)
     - `app/api/preprocess/route.ts` (POST)
     - `app/api/vit5-warmup/route.ts` (GET)
     - `app/api/admin/retention/route.ts` (GET, POST)
2. **Mô hình Dữ liệu Prisma SQLite (`prisma/schema.prisma:10-101`)**:
   - `User`: `id`, `name`, `username`, `password` (lưu dạng plaintext không hash!), `role`, `className`, `active`, `createdAt`, `classes Class[]`.
   - `Class`: `id`, `name`, `grade`, `teacherId`, `teacher User?`, `createdAt`.
   - `Grade`: `id`, `gradingMode`, `studentName`, `assignmentTitle`, `className`, `originalText`, `fixedText`, `corrections`, `score`, `scoreNum`, `scoreBreakdown`, `feedback`, `pedagogicalComment`, `overallRating`, `processingTimeMs`, `tokenCount`, `imageBase64`, `imagePath`, `dictationSessionId`, `expiresAt`, `isAnonymized`, `anonymizedAt`, `createdAt`.
   - `TextbookPassage`: `id`, `gradeLevel`, `bookSet`, `unit`, `title`, `content`, `difficultWords`, `createdAt`.
   - `DictationSession` & `DictationLog`: Theo dõi phiên đọc và lịch sử tương tác.
3. **Cơ chế Bảo vệ API & Rate Limiting (`lib/api-guard.ts:49-108`)**:
   - `guardAiRoute(req, maxRequestsPerMinute)`: Rate limiter dạng sliding window theo IP (`x-forwarded-for` hoặc `x-real-ip`). Trả về mã `HTTP 429` kèm header `Retry-After`.
   - Hoàn toàn **không có bất kỳ middleware xác thực JWT / Bearer Token** nào trong toàn bộ `app/api/`.

---

## 2. COMPREHENSIVE API PARITY MATRIX (Ma Trận Đối Soát Chi Tiết Toàn Bộ Endpoints)

Phân loại nghiêm ngặt theo 4 trạng thái:
1. **Đồng nhất hoàn toàn**: Hợp đồng dữ liệu khớp 100%, endpoint hoạt động ổn định giữa hai nền tảng.
2. **Lệch Payload**: Endpoint tồn tại ở cả 2 phía nhưng có sự sai lệch về trường dữ liệu, khác biệt kiểu dữ liệu (data type) hoặc tên gọi (naming divergence).
3. **Android chưa tích hợp**: Endpoint đã có sẵn trên Web BFF nhưng Android App chưa cài đặt hàm gọi.
4. **Endpoint mồ côi**: Android gửi yêu cầu đến endpoint không tồn tại hoặc sai lệch hoàn toàn về luồng xử lý trên Web BFF.

### Bảng Ma Trận Đối Soát Hợp Đồng API (39 Endpoint Verbs)

| STT | HTTP Method | Endpoint URL Path | Request Body / Params | Response Schema | Trạng Thái | Dẫn Chứng File & Dòng Code (Android Native vs Web BFF) |
|:---:|:---:|:---|:---|:---|:---:|:---|
| 1 | `POST` | `/api/mobile/grade` | **Android**: `GradeApiRequest` (imageBase64, studentGrade, gradingMode, studentName, className, studentId, classId, hinh_thuc, noi_dung, penalty_per_error, essayType)<br>**Web**: `{ imageBase64, studentGrade, gradingMode, studentName, className, the_loai, hinh_thuc, noi_dung, penalty_per_error }` | **Web trả về**: `{ status, essayTitle, studentName, className, criteria, pedagogicalComment, pedagogicalComments, extractedText, correctedFullText, errors, processingTimeMs, serverSource, serverGradeId, imagePath, createdAt }`<br>**Android**: `GradeApiResponse` | **Lệch Payload** | **Android**: `GradeApiService.kt:13-16`, `GradeApiModels.kt:7-66`, `GradeRepository.kt:114-124`<br>**Web**: `app/api/mobile/grade/route.ts:347-521`<br>*(Chi tiết lệch: Xem mục 3.1)* |
| 2 | `GET` | `/api/health` | Không có tham số | `{ status: "ok", timestamp: string, service: string, server: string, tunnel: string }` | **Đồng nhất hoàn toàn** | **Android**: `GradeApiService.kt:18-19`, `GradeRepository.kt:268-274`<br>**Web**: `app/api/health/route.ts:3-11` |
| 3 | `POST` | `/api/auth/login` | `{ username: string, password: string }` | `{ user: { id, name, username, role, className, classes: string[] } }` | **Đồng nhất hoàn toàn** | **Android**: `GradeApiService.kt:22-25`, `GradeApiModels.kt:165-184`, `GradeRepository.kt:433-446`<br>**Web**: `app/api/auth/login/route.ts:4-63` |
| 4 | `GET` | `/api/dictation/passages` | `gradeLevel: Int?`, `bookSet: String?` (Web hỗ trợ thêm `q: String?`) | `{ passages: TextbookPassage[] }` (id, gradeLevel, bookSet, unit, title, content, difficultWords, createdAt) | **Đồng nhất hoàn toàn** | **Android**: `GradeApiService.kt:28-32`, `GradeApiModels.kt:71-85`, `DictationScreen.kt:140-153`<br>**Web**: `app/api/dictation/passages/route.ts:8-34` |
| 5 | `GET` | `/api/classes` | Không có tham số | `{ classes: ClassItem[] }` (id, name, grade, studentCount, teacherName, avgScore, gradeCount) | **Đồng nhất hoàn toàn** | **Android**: `GradeApiService.kt:35-36`, `GradeApiModels.kt:90-102`, `GradeRepository.kt:400-412`<br>**Web**: `app/api/classes/route.ts:5-47` |
| 6 | `GET` | `/api/users` | `role: String = "student"` (Web hỗ trợ thêm `search: String?`) | `{ users: User[] }` (id, name, username, role, className) | **Đồng nhất hoàn toàn** | **Android**: `GradeApiService.kt:38-41`, `GradeApiModels.kt:104-115`, `GradeRepository.kt:414-431`<br>**Web**: `app/api/users/route.ts:5-33`<br>*(Cảnh báo: Web trả về cả `password` plaintext)* |
| 7 | `POST` | `/api/grades` | **Android**: `ServerGradeSyncRequest` (gradingMode, studentName, assignmentTitle, className, originalText, fixedText, score, scoreBreakdown, corrections, pedagogicalComment, feedback)<br>**Web**: body nhận thêm `overallRating`, `processingTimeMs`, `tokenCount`, `imageBase64`, `dictationSessionId` | `{ grade: Grade }` (HTTP 201) | **Lệch Payload** | **Android**: `GradeApiService.kt:44-47`, `GradeApiModels.kt:118-130`, `GradeRepository.kt:477-522`<br>**Web**: `app/api/grades/route.ts:65-149`<br>*(Chi tiết lệch: Xem mục 3.2)* |
| 8 | `GET` | `/api/grades` | `class: String?`, `search: String?` (Web hỗ trợ thêm `assignment: String?`) | `{ grades: Grade[] }` | **Đồng nhất hoàn toàn** | **Android**: `GradeApiService.kt:50-54`, `GradeApiModels.kt:135-159`, `GradeRepository.kt:524-568`<br>**Web**: `app/api/grades/route.ts:32-62` |
| 9 | `PATCH` | `/api/grades/{id}` | `{ corrections: string, score: string, scoreBreakdown: string, pedagogicalComment: string, feedback: string }` | `{ success: true, grade: Grade }` | **Đồng nhất hoàn toàn** | **Android**: `GradeApiService.kt:57-61`, `GradeApiModels.kt:189-196`, `GradeRepository.kt:448-475`<br>**Web**: `app/api/grades/[id]/route.ts:41-70` |
| 10 | `GET` | `/api/dictation/tts` | `text: String`, `voice: String`, `rate: String` (Web hỗ trợ thêm `lang: String`) | Binary audio stream (`audio/mpeg`) | **Đồng nhất hoàn toàn** | **Android**: `DictationScreen.kt:232-267`<br>**Web**: `app/api/dictation/tts/route.ts:11-95` |
| 11 | `POST` | `/api/grade` *(gọi từ client mobile)* | Android gửi ảnh `imageBase64`, nhưng Web yêu cầu `studentText` (bắt buộc) | Web trả về `HTTP 400: Cần cung cấp văn bản học sinh (studentText)` | **Endpoint mồ côi** *(về mặt ngữ nghĩa kiến trúc)* | **Android**: `android_app/IMPLEMENTATION_PLAN.md:11, 35-37`, `HUONG_DAN_TRIEN_KHAI_APK_EUREKA.md:40`<br>**Web**: `app/api/grade/route.ts:1011, 1034-1039`<br>*(Đã được khắc phục chuyển hướng sang `/api/mobile/grade`)* |
| 12 | `POST` | `/api/grade` | `{ studentText, groundTruthText, geminiFixedText, the_loai, imageBase64, hinh_thuc, noi_dung, penalty_per_error, gradingMode, source, yoloData, ... }` | `{ original_text, fixed_text, corrections, score_breakdown, score, overall_rating, feedback, pedagogical_comment, pedagogical_comments, ... }` | **Android chưa tích hợp** | **Web**: `app/api/grade/route.ts:1011-1223` |
| 13 | `POST` | `/api/grade/comments` | `{ gradingMode, studentText, fixedText, creativity_score, evidence, errors, current_comments }` | `{ success: true, pedagogical_comments: string[], source: string }` | **Android chưa tích hợp** | **Web**: `app/api/grade/comments/route.ts:89-221` |
| 14 | `GET` | `/api/grades/[id]` | Param URL: `id` | `{ grade: Grade }` hoặc HTTP 404 | **Android chưa tích hợp** | **Web**: `app/api/grades/[id]/route.ts:26-38` |
| 15 | `DELETE` | `/api/grades/[id]` | Param URL: `id` | `{ success: true }` | **Android chưa tích hợp** | **Web**: `app/api/grades/[id]/route.ts:7-23`<br>*(Android chỉ xóa Room cục bộ tại `GradeRepository.kt:257`)* |
| 16 | `POST` | `/api/auth/register` | `{ name, username, password, confirmPassword, role, className }` | `{ message: string, user: { id, name, username, role } }` | **Android chưa tích hợp** | **Web**: `app/api/auth/register/route.ts:4-115` |
| 17 | `POST` | `/api/auth/admin-register` | `{ name, username, password, confirmPassword, secretKey }` | `{ message: string, user: { id, name, username, role } }` | **Android chưa tích hợp** | **Web**: `app/api/auth/admin-register/route.ts:7-109` |
| 18 | `POST` | `/api/classes` | `{ name, grade, teacherId }` | `{ class: Class }` (HTTP 201) | **Android chưa tích hợp** | **Web**: `app/api/classes/route.ts:50-85` |
| 19 | `PATCH` | `/api/classes/[id]` | Param URL: `id`, Body: partial Class fields | `{ class: Class }` | **Android chưa tích hợp** | **Web**: `app/api/classes/[id]/route.ts:19-34` |
| 20 | `DELETE` | `/api/classes/[id]` | Param URL: `id` | `{ success: true }` | **Android chưa tích hợp** | **Web**: `app/api/classes/[id]/route.ts:5-16` |
| 21 | `POST` | `/api/users` | `{ name, username, role, className, password }` | `{ user: User }` (HTTP 201) | **Android chưa tích hợp** | **Web**: `app/api/users/route.ts:36-73` |
| 22 | `PATCH` | `/api/users/[id]` | Param URL: `id`, Body: partial User fields | `{ user: User }` | **Android chưa tích hợp** | **Web**: `app/api/users/[id]/route.ts:19-34` |
| 23 | `DELETE` | `/api/users/[id]` | Param URL: `id` | `{ success: true }` | **Android chưa tích hợp** | **Web**: `app/api/users/[id]/route.ts:5-16` |
| 24 | `POST` | `/api/dictation/passages` | `{ gradeLevel, bookSet, unit, title, content, difficultWords }` | `{ passage: TextbookPassage }` (HTTP 201) | **Android chưa tích hợp** | **Web**: `app/api/dictation/passages/route.ts:40-65` |
| 25 | `PATCH` | `/api/dictation/passages` | `{ id, title, content, difficultWords, unit, gradeLevel, bookSet }` | `{ passage: TextbookPassage }` | **Android chưa tích hợp** | **Web**: `app/api/dictation/passages/route.ts:71-97` |
| 26 | `DELETE` | `/api/dictation/passages` | Query: `?id=xxx` | `{ success: true }` | **Android chưa tích hợp** | **Web**: `app/api/dictation/passages/route.ts:103-118` |
| 27 | `POST` | `/api/dictation/generate` | `{ gradeLevel, topic, sentenceCount, bookSet }` | `{ success: true, passage: { title, content, difficultWords, summary, gradeLevel, topic, source } }` | **Android chưa tích hợp** | **Web**: `app/api/dictation/generate/route.ts:95-171` |
| 28 | `GET` | `/api/dictation/sessions` | Query: `className`, `source`, `limit` | `{ sessions: DictationSession[] }` | **Android chưa tích hợp** | **Web**: `app/api/dictation/sessions/route.ts:5-35` |
| 29 | `POST` | `/api/dictation/sessions` | `{ title, passage, className, teacherName, source, deviceId, status, summary, logs }` | `{ session: DictationSession }` (HTTP 201) | **Android chưa tích hợp** | **Web**: `app/api/dictation/sessions/route.ts:39-86` |
| 30 | `GET` | `/api/dictation/sessions/[id]` | Param URL: `id` | `{ session: DictationSession }` | **Android chưa tích hợp** | **Web**: `app/api/dictation/sessions/[id]/route.ts:5-36` |
| 31 | `DELETE` | `/api/dictation/sessions/[id]` | Param URL: `id` | `{ success: true }` | **Android chưa tích hợp** | **Web**: `app/api/dictation/sessions/[id]/route.ts:39-58` |
| 32 | `GET` | `/api/dictation/sessions/[id]/logs` | Param URL: `id` | `{ logs: DictationLog[] }` | **Android chưa tích hợp** | **Web**: `app/api/dictation/sessions/[id]/logs/route.ts:52-72` |
| 33 | `POST` | `/api/dictation/sessions/[id]/logs` | Param URL: `id`, Body: `{ speaker, content }` | `{ log: DictationLog }` (HTTP 201) | **Android chưa tích hợp** | **Web**: `app/api/dictation/sessions/[id]/logs/route.ts:5-49` |
| 34 | `POST` | `/api/ocr` | `{ imageBase64, mimeType }` | `{ text, gemini_fixed_text, the_loai, tokenCount, processingTimeMs }` | **Android chưa tích hợp** | **Web**: `app/api/ocr/route.ts:140-193` |
| 35 | `POST` | `/api/yolo/detect` | `{ imageBase64, conf_threshold, iou_threshold, imgsz }` | `{ success: true, total_words, total_lines, boxes, lines, image_dimensions, inference_time_ms, engine, server }` | **Android chưa tích hợp** | **Web**: `app/api/yolo/detect/route.ts:10-103` |
| 36 | `POST` | `/api/preprocess` | `{ imageBase64, gradeLevel, className }` | `{ processedImageBase64, quality }` | **Android chưa tích hợp** | **Web**: `app/api/preprocess/route.ts:4-40` |
| 37 | `GET` | `/api/vit5-warmup` | Không có tham số | `{ status: "ready" \| "failed", detail }` | **Android chưa tích hợp** | **Web**: `app/api/vit5-warmup/route.ts:10-37` |
| 38 | `GET` | `/api/admin/retention` | Không có tham số | `{ success: true, policy, stats: { totalGrades, activeGrades, anonymizedGrades, expiredGradesCount, estimatedFreedDiskMB } }` | **Android chưa tích hợp** | **Web**: `app/api/admin/retention/route.ts:11-64` |
| 39 | `POST` | `/api/admin/retention` | `{ action: "preview" \| "anonymize" \| "hard_delete", retentionDays: number }` | `{ success: true, processedCount, filesDeletedCount, freedMB, message }` | **Android chưa tích hợp** | **Web**: `app/api/admin/retention/route.ts:66-187` |

---

## 3. CHI TIẾT CÁC LỆCH PAYLOAD & DIVERGENCE GIỮA HAI NỀN TẢNG

### 3.1. Sai lệch tại Endpoint Chấm Bài Mobile: `POST /api/mobile/grade`
- **Tên trường thể loại bài viết bị phân kỳ**:
  - Android Model `GradeApiRequest` gửi `@Json(name = "essayType") val essayType: String = "spelling"` (`GradeApiModels.kt:18`).
  - Web Server tại `app/api/mobile/grade/route.ts:362` bóc tách `the_loai: requestedTheLoai` và tại dòng 414 gán: `const the_loai = requestedTheLoai || ocrResult.the_loai`.
  - **Hệ quả**: Web BFF hoàn toàn **bỏ qua trường `essayType`** của Android. Nếu người dùng chọn thể loại thơ/văn xuôi trên điện thoại, máy chủ không nhận được cấu hình này mà bắt buộc phải tự động đoán lại bằng Gemini OCR.
- **Trường dư thừa không được lưu trữ**:
  - Android gửi `studentId: String? = null` và `classId: String? = null` (`GradeApiModels.kt:13, 14`).
  - Web BFF `app/api/mobile/grade/route.ts:356-366` không hề trích xuất `studentId` hoặc `classId`. Khi lưu vào bảng `Grade` trong CSDL Prisma (`app/api/mobile/grade/route.ts:468-490`), chỉ lưu `studentName` và `className` dạng văn bản thường, làm mất liên kết quan hệ khóa ngoại (foreign key relation) với bảng `User` và `Class`.

### 3.2. Sai lệch tại Endpoint Đồng Bộ Sổ Điểm: `POST /api/grades`
- **Các trường bị bỏ sót khi Mobile đồng bộ lên Server**:
  - Khi Android thực hiện đồng bộ bài chấm từ Room DB lên máy chủ qua `GradeRepository.kt:496-508`, request DTO `ServerGradeSyncRequest` (`GradeApiModels.kt:118-130`) không gửi các trường:
    1. `overallRating`: Máy chủ Prisma gán mặc định `overallRating: ""` (`app/api/grades/route.ts:132`), làm mất xếp loại "Hoàn thành tốt / Hoàn thành / Cần cố gắng".
    2. `processingTimeMs`: Máy chủ gán `0` (`app/api/grades/route.ts:133`).
    3. `tokenCount`: Máy chủ gán `0` (`app/api/grades/route.ts:134`).
    4. `imageBase64` / `imagePath`: Android không gửi Base64 ảnh bài thi (`app/api/grades/route.ts:135-136`), dẫn đến bản ghi trên Web server không có ảnh gốc để hiển thị trên trình duyệt.
- **Kiểu dữ liệu Corrections & ScoreBreakdown**:
  - Android gửi `corrections: String = "[]"` và `scoreBreakdown: String` dưới dạng chuỗi thô JSON đã serialize (`GradeRepository.kt:490, 505`).
  - Mặc dù Web có xử lý ép kiểu an toàn (`typeof corrections === "string" ? corrections : JSON.stringify(...)` tại `app/api/grades/route.ts:126`), việc không dùng cấu trúc Object/Array DTO chuẩn làm mất tính ràng buộc kiểu (type safety) của OpenAPI/REST contract.

---

## 4. XÁC THỰC, BẢO MẬT, MÃ TRẠNG THÁI & CƠ CHẾ NGOẠI TUYẾN

### 4.1. Xác thực & Quản lý Phiên (Authentication & Token Management)
- **Tình trạng hiện tại: CỰC KỲ LỎNG LẺO (ZERO-TOKEN ARCHITECTURE)**:
  - Máy chủ `POST /api/auth/login` (`app/api/auth/login/route.ts:4-63`) chỉ so khớp `user.password !== password` trực tiếp từ bảng `User` trong SQLite (mật khẩu đang lưu dạng chuỗi thô không băm, ví dụ `"123456"` tại `prisma/schema.prisma:14`).
  - Khi đăng nhập thành công, máy chủ **KHÔNG tạo ra JWT Token, Session Cookie hay Bearer Token**.
  - Phía Android (`UserSessionManager.kt:10-20`), ứng dụng chỉ ghi nhận trạng thái cờ `is_logged_in = true` và lưu các thuộc tính văn bản của người dùng vào SharedPreferences.
  - Phía Web BFF: **Tất cả các endpoint CRUD (`/api/grades`, `/api/classes`, `/api/users`, `/api/dictation/*`) đều mở công khai (public unauthenticated)**. Bất kỳ client nào cũng có thể gửi request đọc/ghi/xóa dữ liệu mà không cần gửi bất kỳ token xác thực nào trong Request Header.
- **Rò rỉ Mật khẩu Học sinh tại `GET /api/users`**:
  - Tuyến `app/api/users/route.ts:11-28` khi trả về danh sách người dùng (`users`) đã không dùng `select: { id: true, name: true, username: true, role: true, className: true }`, dẫn đến việc **toàn bộ mật khẩu học sinh và giáo viên bị trả về dạng bản rõ trong JSON response**.

### 4.2. Mã Trạng Thái HTTP & Lược đồ Xử lý Lỗi (Error Handling Schemas)
- **Lược đồ phản hồi lỗi chuẩn của Web BFF**:
  - Đa số các endpoint trả về JSON định dạng: `{ error: string }`.
  - Riêng endpoint `POST /api/mobile/grade` trả về: `{ status: "error", error: string, processingTimeMs: number }`.
- **Bảng đối soát mã trạng thái HTTP**:
  - `HTTP 400 Bad Request`: Thiếu trường bắt buộc (`studentText`, `imageBase64`, `username`, `password`, v.v.).
  - `HTTP 401 Unauthorized`: Sai tài khoản hoặc mật khẩu (`app/api/auth/login/route.ts:20, 28`).
  - `HTTP 403 Forbidden`: Tài khoản bị vô hiệu hóa (`app/api/auth/login/route.ts:36`) hoặc sai mã bí mật admin (`app/api/auth/admin-register/route.ts:16`).
  - `HTTP 404 Not Found`: Không tìm thấy bản ghi (`/api/grades/[id]`, `/api/dictation/sessions/[id]`).
  - `HTTP 409 Conflict`: Trùng tên đăng nhập (`/api/auth/register:55`) hoặc trùng tên lớp (`/api/classes:66`).
  - `HTTP 429 Too Many Requests`: Vượt quá ngưỡng rate limit của `guardAiRoute` (20 req/min với Mobile, 30 req/min với Web). Trả về header `Retry-After: <seconds>` (`lib/api-guard.ts:98`).
  - `HTTP 500 Internal Server Error`: Lỗi ngoại lệ hệ thống hoặc CSDL SQLite.
  - `HTTP 503 Service Unavailable`: Hết quota Gemini Vision OCR hoặc dịch vụ AI Python microservice (YOLO/ViT5) không phản hồi.

### 4.3. Cơ chế Lưu trữ Đệm & Fallback Ngoại tuyến (Offline Caching Policies)
1. **Bộ đệm CSDL Phòng thủ trên Android (Room Database)**:
   - Bản ghi chấm bài được tự động lưu vào Room DB `grade_records` (`GradeRepository.kt:225-229`) ngay sau khi nhận phản hồi từ server. Nếu sau đó mất mạng, toàn bộ lịch sử điểm số và các ô Bounding Box vẫn xem lại được trên `HistoryScreen` và `ReportsAnalyticsScreen`.
2. **Kho Ngữ liệu SGK Ngoại tuyến (Curriculum Fallback)**:
   - `LocalDictationPassages.kt` cung cấp sẵn dữ liệu đầy đủ cho Lớp 1–5 của cả 3 bộ sách (Kết nối tri thức, Cánh diều, Chân trời sáng tạo).
   - Khi vào `DictationScreen.kt:130-156`, app lập tức nạp ngữ liệu offline vào UI. Tiến trình mạng chạy nền để đồng bộ thêm từ server; nếu lỗi kết nối (`IOException`), app giữ nguyên ngữ liệu offline mà không hiện thông báo lỗi gián đoạn.
3. **Động cơ Giọng đọc Ngoại tuyến (Audio Fallback)**:
   - `DictationScreen.kt:207-280`: Ưu tiên stream giọng đọc AI trực tuyến (Edge-TTS Neural Voice / Google TTS).
   - Khi mất mạng hoặc `MediaPlayer` gặp sự cố, hệ thống tự động bắt sự kiện `onErrorListener` và chuyển hướng tức thì sang `TextToSpeech` cục bộ của thiết bị Android (`Locale("vi", "VN")`), đảm bảo học sinh không bao giờ bị ngừng tiết học chính tả.
4. **Mô phỏng Chấm điểm Thông minh (Simulated Grading Fallback)**:
   - `GradeRepository.kt:305-367` (`generateSimulatedAnalysis`): Khi mất kết nối trạm Raspberry Pi / Server Next.js, app tự động kích hoạt chế độ mô phỏng sư phạm chuẩn Thông tư 27 của Bộ GD&ĐT với đầy đủ 4 tiêu chí chấm, nhận xét sư phạm và tọa độ Bounding Box mẫu để phục vụ công tác giảng dạy demo không gián đoạn.

---

## 5. ACTIONABLE RECOMMENDATIONS FOR API UNIFICATION (Khuyến Nghị Nâng Cấp)

### P0 (Khẩn cấp & An ninh Hệ thống):
1. **Bảo mật và Triển khai JWT Authentication**:
   - Thêm `jsonwebtoken` hoặc Web Crypto HMAC trên Web BFF (`/api/auth/login`) để tạo Token có hạn sử dụng (ví dụ 30 ngày cho thiết bị trường học).
   - Băm mật khẩu người dùng bằng `bcrypt` hoặc `argon2` thay vì lưu plaintext trong SQLite.
   - Thêm `AuthInterceptor` vào `NetworkClient.kt` trên Android để tự động gắn header `Authorization: Bearer <token>`.
2. **Ẩn trường `password` tại `GET /api/users`**:
   - Cập nhật truy vấn Prisma trong `app/api/users/route.ts:11` thành:
     ```typescript
     select: { id: true, name: true, username: true, role: true, className: true, active: true, createdAt: true }
     ```
     Ngăn chặn hoàn toàn việc rò rỉ mật khẩu của toàn bộ học sinh và giáo viên trong trường.

### P1 (Đồng bộ Chuẩn Hóa Payload & Hợp Đồng Dữ liệu):
3. **Thống nhất `essayType` và `the_loai` trên `/api/mobile/grade`**:
   - Cập nhật `app/api/mobile/grade/route.ts:362`:
     ```typescript
     const requestedTheLoai = body.the_loai || (body.essayType === "poem" ? "tho" : "van_xuoi")
     ```
   - Cập nhật Android `GradeApiRequest` để hỗ trợ cả hai trường `the_loai` và `essayType`.
4. **Bổ sung các trường đồng bộ cho `ServerGradeSyncRequest`**:
   - Mở rộng DTO `ServerGradeSyncRequest` trên Android để gửi kèm `overallRating`, `processingTimeMs`, `tokenCount`, và tùy chọn gửi ảnh bài thi để đồng bộ hoàn chỉnh với Web Studio.

### P2 (Mở rộng Tính Năng Quản Lý trên Mobile):
5. **Tích hợp các Endpoint Quản lý Lớp & Học sinh**:
   - Triển khai gọi `POST /api/classes` và `POST /api/users` trên Android để giáo viên có thể tạo thêm học sinh mới hoặc thêm lớp học ngay trên máy tính bảng di động mà không cần mở trình duyệt web máy tính.
6. **Xử lý Mã lỗi HTTP 429 (Rate Limit Aware)**:
   - Trên Android `GradeRepository.kt`, khi nhận mã phản hồi HTTP 429, bóc tách giá trị header `Retry-After` và hiển thị đếm ngược thời gian chờ trực quan cho giáo viên, thay vì ném lỗi kết nối chung chung.

---

## 6. LOGIC CHAIN (Chuỗi Suy Luận Kỹ Thuật)

```
[Khởi điểm kiểm toán]
  │
  ├── 1. Phân tích mã nguồn mạng Android:
  │      - Đọc `GradeApiService.kt:12-62` ──> Phát hiện 9 Retrofit verbs
  │      - Đọc `DictationScreen.kt:234` ──────> Phát hiện 1 MediaPlayer streaming verb (/api/dictation/tts)
  │      - Đọc `NetworkClient.kt:22-28` ──────> Phát hiện OkHttpClient thiếu hoàn toàn AuthInterceptor
  │      - Đọc `UserSessionManager.kt:10-20` ──> Phát hiện Session không lưu token
  │      └──> TỔNG CỘNG ANDROID SỬ DỤNG 10 ENDPOINTS
  │
  ├── 2. Phân tích mã nguồn Web BFF:
  │      - Quét toàn bộ `app/api/**/route.ts` ──> Phát hiện chính xác 24 tệp route với 38 HTTP verbs
  │      - Đọc `prisma/schema.prisma` ─────────> Nắm rõ 6 models dữ liệu chính (User, Class, Grade, ...)
  │      - Đọc `lib/api-guard.ts` ─────────────> Xác nhận chỉ có rate limiter IP, hoàn toàn không có JWT guard
  │      └──> TỔNG CỘNG WEB BFF CUNG CẤP 38 HTTP VERBS
  │
  ├── 3. Đối soát chéo từng cặp endpoint (Android vs Web BFF):
  │      - 8 endpoints đồng nhất hoàn toàn về cấu trúc và nghiệp vụ (health, login, passages, classes, users, grades GET, grades PATCH, tts GET).
  │      - 2 endpoints lệch payload:
  │          • /api/mobile/grade: Android gửi essayType / studentId / classId nhưng Web đọc the_loai và bỏ qua các IDs.
  │          • /api/grades POST: Android thiếu overallRating, processingTimeMs, tokenCount, imageBase64.
  │      - 1 endpoint mồ côi về luồng xử lý: /api/grade trước đây Android gọi thiếu studentText gây lỗi 400.
  │      - 28 endpoints trên Web mà Android chưa tích hợp (CRUD chi tiết, quản trị lưu trữ trẻ em, tạo ngữ liệu Qwen, ...).
  │
  └── [Kết luận]: Hệ thống có nền tảng tích hợp cốt lõi hoạt động được (P0 core grading & auth cơ bản đã thông luồng), nhưng tồn tại lỗ hổng bảo mật nghiêm trọng do thiếu token xác thực và rò rỉ password, cùng với sự sai lệch trường dữ liệu tại 2 endpoint trọng yếu cần được tái cấu trúc theo khuyến nghị P0 và P1.
```

---

## 7. CAVEATS (Phạm Vi Chưa Khảo Sát & Giả Định)

1. **Phạm vi mạng nội bộ Cloudflare Tunnel**: Giả định trạm biên Raspberry Pi và Cloudflare Tunnel hoạt động với tên miền `https://vihandgrade.click/`. Nếu triển khai nội bộ IP mạng LAN (ví dụ `http://192.168.1.56:3000`), chính sách CORS của Next.js mặc định chấp nhận cùng dải mạng.
2. **Phiên bản Python Microservice (`VIT5_SERVICE_URL:8000`)**: Bản báo cáo tập trung vào hợp đồng giữa Android App và Next.js Web BFF. Các cuộc gọi hạ tầng từ Web BFF sang Python Service (`/detect-words`, `/qwen/generate`, `/tts`) được xem là các lời gọi backend-to-backend nội bộ và không tính vào hợp đồng trực tiếp của Android Client.

---

## 8. CONCLUSION (Đánh Giá Tổng Kết)

1. **Về Tính Năng Cốt Lõi (AI Grading & Offline Sync)**:
   - Quá trình chuyển đổi sang endpoint chuyên dụng `POST /api/mobile/grade` đã giải quyết dứt điểm lỗi `HTTP 400` lịch sử, cho phép Android nhận diện văn bản tay, bóc tách Bounding Box tọa độ thực tế và nhận xét sư phạm theo Thông tư 27 thành công.
   - Luồng đồng bộ 2 chiều qua `GET /api/grades`, `POST /api/grades`, và `PATCH /api/grades/{id}` hoạt động thông suốt với cơ sở dữ liệu SQLite `vihand.db`.
2. **Về Sự Lệch Chuẩn Hợp Đồng (Payload Divergence)**:
   - Tồn tại 2 vị trí lệch payload cần đồng bộ hóa: `the_loai` vs `essayType` trên `/api/mobile/grade` và thiếu trường `overallRating`/`imageBase64` trên `POST /api/grades`.
3. **Về An Ninh & Xác Thực**:
   - Cần ưu tiên P0 triển khai JWT Bearer Token trên cả hai phía và loại bỏ trường `password` khỏi response của `GET /api/users` trước khi triển khai thực tế tại các trường học.

---

## 9. VERIFICATION METHOD (Phương Pháp Xác Thực Độc Lập)

Bất kỳ kiểm toán viên hoặc kỹ sư nào cũng có thể kiểm chứng độc lập báo cáo này bằng các thao tác sau:

1. **Kiểm tra khai báo Endpoint phía Android**:
   ```powershell
   Select-String -Path "android_app\app\src\main\java\com\example\data\api\GradeApiService.kt" -Pattern "@(GET|POST|PATCH|DELETE)"
   ```
   *Kết quả xác thực*: Trả về chính xác 9 dòng khai báo Retrofit từ dòng 13 đến dòng 57.

2. **Kiểm tra Endpoint Stream TTS**:
   ```powershell
   Select-String -Path "android_app\app\src\main\java\com\example\ui\screens\DictationScreen.kt" -Pattern "api/dictation/tts"
   ```
   *Kết quả xác thực*: Trả về dòng 234 cấu hình URL luồng âm thanh trực tiếp.

3. **Kiểm tra sự thiếu vắng Token Interceptor trong Android**:
   ```powershell
   Select-String -Path "android_app\app\src\main\java\com\example\data\api\NetworkClient.kt" -Pattern "addInterceptor"
   ```
   *Kết quả xác thực*: Chỉ phát hiện `loggingInterceptor`, không có Auth Interceptor.

4. **Kiểm tra rò rỉ Password tại Web BFF**:
   ```powershell
   Get-Content "app\api\users\route.ts" | Select-String -Pattern "prisma.user.findMany" -Context 0, 15
   ```
   *Kết quả xác thực*: Truy vấn không có mệnh đề `select`, trả về toàn bộ model `User` bao gồm cột `password`.

5. **Kiểm tra tính năng BFF Mobile Grade trên Web**:
   ```powershell
   Get-Content "app\api\mobile\grade\route.ts" | Select-String -Pattern "the_loai"
   ```
   *Kết quả xác thực*: Dòng 362 và 414 chỉ bóc tách `the_loai`, không có `essayType`.
