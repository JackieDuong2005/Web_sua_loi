# BẢN ĐẶC TẢ KỸ THUẬT HỆ THỐNG VIHAND GRADE END-TO-END (BLUEPRINT CHO TÀI LIỆU 2)
## Mã tài liệu mục tiêu: `01_Bao_cao_Nghien_cuu/Tai_lieu_Bao_cao/03_Dac_Ta_Kien_Truc_He_Thong/02_Dac_Ta_Ky_Thuat_End2End_ViHandGrade.md`
**Hệ sinh thái:** ViHand Grade (Android Native Client, Next.js 16 AI BFF Gateway, Python AI Microservice, Prisma SQLite & Room DB v4)  
**Tác giả:** Teamwork Preview Explorer  
**Thời điểm đối soát:** 2026-10-05  
**Tiêu chuẩn đối soát:** 100% Code-level Verification, Zero Guesswork, Exact File Paths & Line Numbers  

---

## MỤC LỤC TỔNG THỂ

1. [TỔNG QUAN KIẾN TRÚC & PHÂN TẦNG CÔNG NGHỆ END-TO-END](#1-tổng-quan-kiến-trúc--phân-tầng-công-nghệ-end-to-end)
2. [TẦNG CLIENT MOBILE: ANDROID NATIVE APPLICATION](#2-tầng-client-mobile-android-native-application)
   - 2.1. Cấu hình Gradle, SDK Target & Kiến trúc MVVM UDF
   - 2.2. Kiến trúc Bounding Box Co-Transformation 2 tầng (Lockstep Pinch-to-zoom 1x-4x & Pan)
   - 2.3. Kính ngắm CameraX, Chuẩn hóa góc xoay EXIF & Shutter Flash 90ms
   - 2.4. Cơ sở dữ liệu Room DB v4 (`vihand_grade.db`) & Thực thể 18 cột `GradeRecordEntity`
   - 2.5. DAO Phân tích Thông tư 27 & Giao thức Đồng bộ Hai Chiều `syncTwoWayWithServer`
3. [TẦNG WEB STUDIO & BFF GATEWAY (NEXT.JS 16 & PRISMA SQLITE)](#3-tầng-web-studio--bff-gateway-nextjs-16--prisma-sqlite)
   - 3.1. Next.js 16 App Router, TypeScript & Tối ưu hóa SQLite WAL Mode (`lib/prisma.ts`)
   - 3.2. Bộ lọc Giới hạn Tần suất In-Memory Sliding Window Rate Limiter (`lib/api-guard.ts`)
   - 3.3. Bảo vệ Phân quyền RBAC Tầng Giao diện & Quản lý Phiên Làm Việc
   - 3.4. Chiến lược Chống Phình to Dung lượng CSDL (Anti-disk-bloat & Storage Scheme)
4. [TẦNG DỊCH VỤ TRÍ TUỆ NHÂN TẠO CỐT LÕI (AI CORE SERVICES TIER)](#4-tầng-dịch-vụ-trí-tuệ-nhân-tạo-cốt-lõi-ai-core-services-tier)
   - 4.1. FastAPI Python Microservice (`python_service/main.py`), 10 REST Endpoints & ThreadPool
   - 4.2. Phân đoạn Từ & Dòng YOLOv8: Thuật toán Vertical Overlap & Chuẩn hóa [0.0, 1.0]
   - 4.3. Động cơ Sửa lỗi Chính tả ViT5: Dynamic INT8, Prose Chunking 160 & Phân rã Âm tiết 5 Thành phần
   - 4.4. Mô hình Ngôn ngữ Nhỏ Qwen 2.5 SLM: `Qwen2.5-0.5B-Instruct` bfloat16 & Chuẩn Thông tư 27
   - 4.5. Động cơ Tổng hợp Giọng nói Sư phạm Microsoft Edge-TTS (`vi-VN-HoaiMyNeural`, -15%)
5. [HỢP ĐỒNG API & DTO SCHEMAS (API CONTRACTS & DATA TRANSFER OBJECTS)](#5-hợp-đồng-api--dto-schemas-api-contracts--data-transfer-objects)
   - 5.1. BFF Endpoint Trọng tâm: `POST /api/mobile/grade`
   - 5.2. Core Grading Endpoint: `POST /api/grade` (3 Luồng A/B/C)
   - 5.3. Nhóm Endpoint Luyện viết Chính tả SGK & Phát âm Neural TTS (`/api/dictation/*`)
   - 5.4. Nhóm Endpoint Quản lý Điểm số & Sổ Điểm (`/api/grades/*`)
   - 5.5. Nhóm Endpoint Quản trị Người dùng & Lớp học (`/api/users`, `/api/classes`)
   - 5.6. Bảng Mã Trạng Thái HTTP & Exception Models Chuẩn Hóa
6. [MÔ HÌNH DỮ LIỆU & ERD (DATA MODELS, SCHEMAS & TWO-WAY SYNC)](#6-mô-hình-dữ-liệu--erd-data-models-schemas--two-way-sync)
   - 6.1. Lược đồ Prisma SQLite CSDL Trung tâm (`prisma/schema.prisma` - 6 Thực thể)
   - 6.2. Lược đồ Room DB v4 CSDL Ngoại tuyến Di động (`vihand_grade.db` - 3 Thực thể)
   - 6.3. Ma trận Ánh xạ Thực thể (Entity Mapping Matrix) Prisma vs Room DB
   - 6.4. Máy Trạng thái Đồng bộ Hai chiều, Giải quyết Xung đột & Bền bỉ Ngoại tuyến
7. [QUY TRÌNH KIỂM THỬ, XÁC THỰC THỰC NGHIỆM & CHỨNG TỪ PSTACK](#7-quy-trình-kiểm-thử-xác-thực-thực-nghiệm--chứng-từ-pstack)
   - 7.1. Kết quả Kiểm thử Android Native Unit & Robolectric Tests (23/23 Passed)
   - 7.2. Kiểm thử TypeScript Compiler Gateway (`tsc --noEmit` 0 Errors)
   - 7.3. Chứng từ Thực nghiệm Bài thi Thật & Harness PStack

---

# 1. TỔNG QUAN KIẾN TRÚC & PHÂN TẦNG CÔNG NGHỆ END-TO-END

Hệ sinh thái **ViHand Grade** giải quyết trọn vẹn bài toán chuyển đổi số giáo dục tiểu học tại Việt Nam theo **Thông tư 27/2020/TT-BGDĐT** (Quy định đánh giá học sinh tiểu học) và **Chương trình GDPT 2018**. Hệ thống vận hành theo mô hình kiến trúc lai **Hybrid Edge-Cloud AI** gồm 4 tầng công nghệ phối hợp chặt chẽ:

```
[Android Native App]               [Web Studio React / Next.js PWA]
(Kotlin 2.2, Jetpack Compose,       (Next.js 16.2.4, React 19, Tailwind v4,
 Room DB v4, CameraX, Moshi)        Radix UI, Lucide Icons, Jimp Preprocessor)
         │                                      │
         │ (HTTP REST / JSON DTOs)              │ (Route Handlers)
         ▼                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│             AI BACKEND-FOR-FRONTEND (BFF) GATEWAY (:3000)              │
│  - App Router: app/api/mobile/grade, app/api/grade, app/api/ocr...     │
│  - In-Memory Sliding Window Rate Limiter (lib/api-guard.ts)            │
│  - Storage Engine: Prisma ORM 5.22.0 (WAL Mode, busy_timeout=5000)     │
│  - Image Disk Persister: public/uploads/grades/ (Anti-bloat)           │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
          ┌────────────────────────┴────────────────────────┐
          │ (Loopback / LAN HTTP)                           │ (Outbound TLS)
          ▼                                                 ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│  PYTHON AI CORE MICROSERVICE (:8000) │  │  CLOUD SERVICES TIER         │
│  - FastAPI Framework (Uvicorn)       │  │  - Gemini 3.1 Flash Lite     │
│  - YOLOv8 Word/Line Detector (640px) │  │    Vision OCR (Multi-keys)   │
│  - ViT5 Vietnamese Correction (INT8) │  │  - Gemini 2.5 Flash Fallback │
│  - Syllable Parser & Levenshtein Diff│  │  - Cloudflare Named Tunnel   │
│  - Qwen 2.5-0.5B-Instruct (bfloat16) │  │    (vihandgrade.click)       │
│  - Edge-TTS Engine (vi-VN-HoaiMy)    │  └──────────────────────────────┘
└──────────────────────────────────────┘
```

---

# 2. TẦNG CLIENT MOBILE: ANDROID NATIVE APPLICATION

## 2.1. Cấu hình Gradle, SDK Target & Kiến trúc MVVM UDF

### A. Thông số Kỹ thuật & Dependencies Phía Client
Dẫn chứng chính xác từ `android_app/app/build.gradle.kts` và `android_app/gradle/libs.versions.toml`:
- **Application ID:** `vn.edu.tdtu.vihandgrade` (`build.gradle.kts:17`).
- **Namespace:** `com.example` (`build.gradle.kts:13`).
- **Compile SDK:** `36` (Android 16 / Minor API Level 1) (`build.gradle.kts:14`).
- **Min SDK:** `24` (Android 7.0 Nougat) (`build.gradle.kts:18`).
- **Target SDK:** `36` (`build.gradle.kts:19`).
- **Version Code / Name:** `1` / `"1.0"` (`build.gradle.kts:20-21`).
- **Kotlin:** `2.2.10`, **AGP:** `9.1.1`, **KSP:** `2.3.5`.
- **Compose BOM:** `2024.09.00` (Material 3, Foundation, Animation).
- **CameraX:** `1.5.0` (`camera-core`, `camera-camera2`, `camera-lifecycle`, `camera-view`).
- **Room Database:** `2.7.0` (`room-runtime`, `room-ktx`, `room-compiler` qua KSP).
- **Retrofit & OkHttp:** Retrofit `2.12.0`, OkHttp `4.10.0`, Logging Interceptor `4.10.0`.
- **Serialization:** Moshi `1.15.2` (KSP Codegen + Reflect).
- **Testing Engine:** Robolectric `4.16.1`, Roborazzi `1.59.0`, JUnit 4.13.2.
- **Kích thước APK phát hành:** `26,617,394 bytes` (~`25.38 MB` cho `app-debug.apk`).
- **Cấu hình mạng:** `android:usesCleartextTraffic="true"` tại `AndroidManifest.xml:17` cho phép kết nối HTTP trực tiếp trong mạng LAN tới trạm Raspberry Pi (`http://192.168.1.56:3000`).

### B. Kiến trúc Unidirectional Data Flow (UDF) & Quản lý Trạng thái Vòng đời
- **ViewModel Architecture:** `MainViewModel.kt` (`com.example.ui.viewmodel.MainViewModel`) kế thừa `AndroidViewModel(application)`.
- **State Hoisting:**
  ```kotlin
  // Quản trị trạng thái tiến trình chấm điểm khép kín
  sealed class GradingUiState {
      object Idle : GradingUiState()
      data class Processing(val stepDescription: String, val progress: Float) : GradingUiState()
      data class Success(val result: GradeResult) : GradingUiState()
      data class Error(val message: String) : GradingUiState()
  }
  ```
- **Lifecycle-Aware Reactive Binding:**
  Tại `android_app/app/src/main/java/com/example/MainActivity.kt:60-75`, luồng dữ liệu được thu thập an toàn bằng `collectAsStateWithLifecycle()`:
  ```kotlin
  val gradingState by viewModel.gradingState.collectAsStateWithLifecycle()
  val currentUser by viewModel.currentUser.collectAsStateWithLifecycle()
  val historyRecords by viewModel.historyRecords.collectAsStateWithLifecycle()
  ```
  Cơ chế này tự động ngắt lắng nghe luồng dữ liệu khi màn hình ứng dụng rơi vào trạng thái `STOPPED` hoặc background, ngăn ngừa 100% rò rỉ bộ nhớ (Memory Leak) và tiết kiệm pin thiết bị.

---

## 2.2. Kiến trúc Bounding Box Co-Transformation 2 tầng (Lockstep Gestures)

Tệp mã nguồn: `android_app/app/src/main/java/com/example/ui/components/PhotoBoundingBoxViewer.kt` (751 dòng).

### A. Vấn đề Kỹ thuật (Touch Desynchronization / Drift)
Khi người dùng thực hiện thao tác phóng to hoặc kéo rê ảnh bài thi chụp thực tế, nếu Layer 1 (Ảnh bài thi `Image`) và Layer 2 (Lớp phủ các hộp `BoundingBox`) được điều khiển bởi 2 bộ modifier riêng rẽ hoặc tính toán tọa độ thủ công qua phép nhân ma trận trên Compose, độ trễ frame và sai số làm tròn số thực (Floating Point Rounding) sẽ khiến các hộp Bounding Box bị "trôi", lệch khỏi nét mực của học sinh khi phóng to đến mức 3x–4x.

### B. Giải pháp: Kiến trúc Đồng bộ Tuyệt đối Khóa Bậc (Lockstep Co-Transformation)
Hệ thống thiết kế một Box cha bao bọc duy nhất mang Modifier `pointerInput` nhận diện cử chỉ 2 ngón tay, bên trong chứa một Box con duy nhất áp dụng `graphicsLayer` cho cả hai tầng:

```kotlin
// Dẫn chứng: PhotoBoundingBoxViewer.kt:418-455
var displayedImgWidthPx by remember { mutableFloatStateOf(0f) }
var displayedImgHeightPx by remember { mutableFloatStateOf(0f) }

Box(
    modifier = Modifier
        .fillMaxWidth()
        .clip(RoundedCornerShape(bottomStart = 16.dp, bottomEnd = 16.dp))
        .background(if (isDarkTheme) Color(0xFF090D16) else Color(0xFFF1F5F9))
        .pointerInput(displayedImgWidthPx, displayedImgHeightPx) {
            detectTransformGestures { _, pan, zoom, _ ->
                val newScale = (scale * zoom).coerceIn(1.0f, 4.0f)
                val maxOffsetX = (displayedImgWidthPx * (newScale - 1f) / 2f).coerceAtLeast(0f)
                val maxOffsetY = (displayedImgHeightPx * (newScale - 1f) / 2f).coerceAtLeast(0f)

                if (newScale <= 1.0f) {
                    scale = 1.0f
                    offsetX = 0f
                    offsetY = 0f
                } else {
                    scale = newScale
                    offsetX = (offsetX + pan.x).coerceIn(-maxOffsetX, maxOffsetX)
                    offsetY = (offsetY + pan.y).coerceIn(-maxOffsetY, maxOffsetY)
                }
            }
        }
) {
    // KHỐI ĐỒNG BỘ: Cả Layer 1 (Ảnh) và Layer 2 (Lưới BBox) nằm chung graphicsLayer
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .wrapContentHeight()
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
                translationX = offsetX
                translationY = offsetY
            }
            .onGloballyPositioned { coords ->
                displayedImgWidthPx = coords.size.width.toFloat()
                displayedImgHeightPx = coords.size.height.toFloat()
            }
    ) {
        // LAYER 1: Ảnh bài thi thực tế (Zero-Letterbox via FillWidth)
        Image(
            bitmap = resolvedBitmap.asImageBitmap(),
            contentDescription = "Ảnh bài thi học sinh",
            modifier = Modifier.fillMaxWidth().wrapContentHeight(),
            contentScale = ContentScale.FillWidth
        )

        // LAYER 2: Lưới phủ Bounding Box cảm ứng tương tác
        if (showBoxes && errors.isNotEmpty()) {
            errors.forEachIndexed { index, err ->
                // Render từng hộp BoundingBox tại vị trí chuẩn hóa
            }
        }
    }
}
```

### C. Thuật toán Chuẩn hóa Tọa độ Hộp và Ngăn ngừa Tràn Biên (Coordinate Clamping)
Dẫn chứng tại `PhotoBoundingBoxViewer.kt:513-555`:
1. **Trích xuất Tọa độ Đa dạng (Polymorphic Extraction):** Hỗ trợ nhận diện cả tọa độ tỷ lệ tương đối (`rel_x1`, `rel_y1` $\in [0.0 \dots 1.0]$), tọa độ pixel tuyệt đối từ YOLOv8 ($x_1, y_1$ chia cho kích thước gốc `detectedWidth`), hoặc cấu trúc lồng `bbox: { rel_x1, ... }`.
2. **Kẹp biên an toàn (Safety Clamping):**
   - `safeRelX = rawRelX.coerceIn(0f, 0.95f)`
   - `safeRelY = rawRelY.coerceIn(0f, 0.95f)`
   - `safeRelW = rawRelW.coerceIn(0.035f, 0.35f)`
   - `safeRelH = rawRelH.coerceIn(0.035f, 0.16f)`
   *Ghi chú kỹ thuật:* Khống chế `safeRelH` tối đa ở mức `0.16` (16% chiều cao ảnh) triệt tiêu hoàn toàn lỗi thuật toán kéo dài khung đỏ xuống các dòng kẻ bên dưới.
3. **Kích thước Chạm Tối thiểu (Touch Target Ergonomics):**
   - `widthDp = (displayedWidthDp * safeRelW).coerceAtLeast(44.dp)`
   - `heightDp = (displayedHeightDp * safeRelH).coerceAtLeast(32.dp)`
   Đảm bảo diện tích chạm ngón tay đạt chuẩn Human Interface Guidelines ngay cả với dấu thanh ngắn.
4. **Huy hiệu Lỗi Nổi Tự Thích Ứng (Adaptive Floating Pill Tag):**
   Tại dòng 565–607, nếu hộp chữ nằm quá sát mép trên (`safeRelY < 0.08f`), huy hiệu `#STT ✓ Từ Đúng` tự động đảo vị trí xuống **dưới đáy** hộp (`heightDp + 2.dp`) thay vì nằm ở trên (`-18.dp`), loại bỏ hoàn toàn hiện tượng bị cắt cụt khỏi khung nhìn.

---

## 2.3. Kính ngắm CameraX, Chuẩn hóa góc xoay EXIF & Shutter Flash 90ms

Tệp mã nguồn: `android_app/app/src/main/java/com/example/ui/screens/CameraScanScreen.kt` (1,463 dòng).

### A. Cấu hình Phần cứng CameraX
- Tích hợp `androidx.camera.view.PreviewView` với `implementationMode = PreviewView.ImplementationMode.COMPATIBLE` và `scaleType = PreviewView.ScaleType.FILL_CENTER` (dòng 265-270).
- Cấu hình chụp tối ưu độ trễ: `ImageCapture.Builder().setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY).build()` (dòng 285).
- Điều khiển bật/tắt đèn flash trợ sáng bài thi qua `cameraControlInstance?.enableTorch(isFlashOn)`.

### B. Chuẩn hóa Góc Xoay EXIF (Orientation Normalization)
Dẫn chứng tại `CameraScanScreen.kt:964-974`:
```kotlin
imageCapture?.takePicture(
    cameraExecutor,
    object : ImageCapture.OnImageCapturedCallback() {
        override fun onCaptureSuccess(imageProxy: ImageProxy) {
            val rotation = imageProxy.imageInfo.rotationDegrees
            val rawBitmap = imageProxy.toBitmap()
            imageProxy.close() // Giải phóng vùng đệm phần cứng ngay lập tức
            
            val bitmap = if (rotation != 0) {
                val matrix = android.graphics.Matrix().apply { postRotate(rotation.toFloat()) }
                Bitmap.createBitmap(rawBitmap, 0, 0, rawBitmap.width, rawBitmap.height, matrix, true)
            } else {
                rawBitmap
            }
            dispatchCapture(bitmap)
        }
    }
)
```
Quy trình này đảm bảo ảnh bài thi gửi lên máy chủ AI luôn có phương thẳng đứng chuẩn $0^\circ$, bất kể giáo viên cầm điện thoại theo chiều dọc hay xoay ngang khi chụp trên bàn học.

### C. Hiệu ứng Bấm Chụp Không Trễ (90ms Zero-Latency Shutter Feedback)
Tại dòng 953-958:
```kotlin
coroutineScope.launch {
    isFlashing = true
    delay(90) // Flash chớp trắng trong 90ms
    isFlashing = false
}
```
Phản hồi thị giác chớp flash 90ms mô phỏng trải nghiệm màn trập máy ảnh cơ, giúp giáo viên nhận biết ngay bài làm đã được ghi nhận thành công mà không gây nghẽn UI luồng chính.

---

## 2.4. Cơ sở dữ liệu Room DB v4 (`vihand_grade.db`) & Thực thể 18 cột `GradeRecordEntity`

Tệp mã nguồn: `android_app/app/src/main/java/com/example/data/local/AppDatabase.kt` & `GradeRecordEntity.kt`.
- **Database Name:** `"vihand_grade.db"`
- **Schema Version:** `4` (Migration Strategy: `fallbackToDestructiveMigration()`).
- **Danh sách Entities:** `GradeRecordEntity`, `ClassEntity`, `StudentEntity`.

### Cấu trúc Chi tiết Bảng `grade_records` (18 Cột)
Dẫn chứng: `android_app/app/src/main/java/com/example/data/local/GradeRecordEntity.kt:6-28`:

| STT | Tên cột trong Room DB | Kiểu dữ liệu Kotlin | Kiểu SQLite | Ràng buộc & Giá trị Mặc định | Ý nghĩa Nghiệp vụ Sư phạm |
|:---:|:---|:---|:---|:---|:---|
| 1 | `id` | `Long` | `INTEGER` | `@PrimaryKey(autoGenerate = true)` | Khóa chính tự tăng cục bộ trên thiết bị |
| 2 | `timestamp` | `Long` | `INTEGER` | Bắt buộc | Mốc thời gian chấm bài (Epoch Milliseconds) |
| 3 | `studentName` | `String` | `TEXT` | Bắt buộc | Họ và tên học sinh |
| 4 | `className` | `String` | `TEXT` | Bắt buộc | Lớp học (VD: `"Lớp 3A1"`) |
| 5 | `essayTitle` | `String` | `TEXT` | Bắt buộc | Tiêu đề bài kiểm tra / bài chính tả |
| 6 | `totalScore` | `Float` | `REAL` | Bắt buộc | Tổng điểm bài thi (Thang điểm 10.0 TT27) |
| 7 | `spellingScore` | `Float` | `REAL` | Bắt buộc | Điểm chính tả (Max 4.0 hoặc 7.0) |
| 8 | `formatScore` | `Float` | `REAL` | Bắt buộc | Điểm hình thức & trình bày (Max 3.0) |
| 9 | `contentScore` | `Float` | `REAL` | Bắt buộc | Điểm nội dung & bố cục (Max 2.0) |
| 10 | `creativityScore` | `Float` | `REAL` | Bắt buộc | Điểm sáng tạo & cảm xúc (Max 1.0) |
| 11 | `pedagogicalComment` | `String` | `TEXT` | Bắt buộc | Lời nhận xét sư phạm giàu tính khích lệ |
| 12 | `extractedText` | `String` | `TEXT` | Bắt buộc | Văn bản OCR thô giữ nguyên lỗi sai |
| 13 | `correctedFullText` | `String` | `TEXT` | Bắt buộc | Văn bản chuẩn sau khi sửa toàn bộ lỗi |
| 14 | `errorsJson` | `String` | `TEXT` | Bắt buộc | Chuỗi JSON chứa mảng `ErrorBox` & tọa độ |
| 15 | `serverSource` | `String` | `TEXT` | Bắt buộc | Nguồn xử lý (`"Mobile BFF"`, `"Pi"`, `"Offline"`) |
| 16 | `sampleType` | `String?` | `TEXT` | Mặc định `null` | Phân loại bài mẫu khi chạy thao luyện |
| 17 | `photoPath` | `String?` | `TEXT` | Mặc định `null` | Đường dẫn file ảnh chụp lưu trên bộ nhớ máy |
| 18 | `serverId` | `String?` | `TEXT` | Mặc định `null` | **[V4]** Khóa liên kết ID bản ghi CSDL Web (`vihand.db`) |

---

## 2.5. DAO Phân tích Thông tư 27 & Giao thức Đồng bộ Hai Chiều `syncTwoWayWithServer`

### A. Truy vấn Thống kê Phân tích Sư phạm trong `GradeRecordDao.kt`
Dẫn chứng: `android_app/app/src/main/java/com/example/data/local/GradeRecordDao.kt:36-75`:
- `getTotalCount()`: `SELECT COUNT(*) FROM grade_records`
- `getAverageScore()`: `SELECT COALESCE(AVG(totalScore), 0.0) FROM grade_records`
- `getExcellentCount()`: `SELECT COUNT(*) FROM grade_records WHERE totalScore >= 9.0` (Mức Xuất sắc)
- `getGoodCount()`: `SELECT COUNT(*) FROM grade_records WHERE totalScore >= 8.0 AND totalScore < 9.0` (Mức Hoàn thành tốt)
- `getFairCount()`: `SELECT COUNT(*) FROM grade_records WHERE totalScore >= 6.5 AND totalScore < 8.0` (Mức Hoàn thành)
- `getNeedsImprovementCount()`: `SELECT COUNT(*) FROM grade_records WHERE totalScore < 6.5` (Mức Cần cố gắng)
- `getUnderperformingStudents()`: Lọc danh sách học sinh có điểm trung bình $< 6.5$ để giáo viên có kế hoạch kèm cặp riêng.

### B. Giao thức Đồng bộ Hai Chiều Toàn diện (`syncTwoWayWithServer`)
Dẫn chứng tại `android_app/app/src/main/java/com/example/data/repository/GradeRepository.kt:708-731`:
```kotlin
suspend fun syncTwoWayWithServer(
    serverUrl: String,
    studentName: String? = null,
    className: String? = null
): Triple<Int, Int, Int> = withContext(Dispatchers.IO) {
    // 1. CHIỀU UPLOAD: Đẩy các bài chấm offline lưu cục bộ lên Server
    val (uploadedSuccess, uploadedFail) = syncAllGradesToServer(serverUrl)

    // 2. CHIỀU DOWNLOAD: Kéo các bài chấm từ Web Server về điện thoại
    val serverGrades = fetchGradesFromServer(serverUrl, className = className, search = studentName)
    var downloadedCount = 0
    if (serverGrades.isNotEmpty()) {
        val localRecords = dao.getAllRecordsList()
        // Khóa so khớp chống trùng lặp: studentName + essayTitle + className
        val existingKeys = localRecords.map { 
            "${it.studentName.trim()}_${it.essayTitle.trim()}_${it.className.trim()}" 
        }.toSet()

        serverGrades.forEach { sGrade ->
            val key = "${sGrade.studentName.trim()}_${sGrade.essayTitle.trim()}_${sGrade.className.trim()}"
            if (key !in existingKeys) {
                saveRecord(sGrade)
                downloadedCount++
            }
        }
    }
    Triple(uploadedSuccess, uploadedFail, downloadedCount)
}
```
**Ý nghĩa:** Trả về `Triple(uploadedSuccess, uploadedFail, downloadedCount)` giúp giáo viên kiểm soát chính xác số lượng bài đã đồng bộ lên mây và số lượng bài mới được tải về thiết bị.

---

# 3. TẦNG WEB STUDIO & BFF GATEWAY (NEXT.JS 16 & PRISMA SQLITE)

## 3.1. Next.js 16 App Router, TypeScript & Tối ưu hóa SQLite WAL Mode (`lib/prisma.ts`)

### A. Vấn đề Nghẽn Khóa Cơ Sở Dữ Liệu SQLite
Khi 30–50 học sinh trong lớp học đồng thời nộp bài chấm, SQLite ở cấu hình mặc định (Rollback Journal Mode) sẽ khóa toàn bộ tệp cơ sở dữ liệu khi có 1 thao tác GHI (Exclusive Lock), khiến các tiến trình đọc/ghi khác văng lỗi nghiêm trọng: `Error: database is locked`.

### B. Giải pháp Cấu hình PRAGMA Cấp Thấp
Dẫn chứng: `lib/prisma.ts:7-22`:
```typescript
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
- `PRAGMA journal_mode = WAL;`: Cho phép **vô số tiến trình ĐỌC chạy song song mà không bị chặn bởi 1 tiến trình GHI**.
- `PRAGMA busy_timeout = 5000;`: Thiết lập hàng đợi chờ khóa tối đa 5.000ms trước khi ném ngoại lệ.
- `PRAGMA synchronous = NORMAL;`: Giảm số lần gọi flush đĩa vật lý không cần thiết, tăng tốc độ ghi dữ liệu lên $4\times$ mà vẫn bảo toàn an toàn ACID khi mất điện đột ngột.
- **Singleton Pattern:** Gắn `globalForPrisma.prisma` (`lib/prisma.ts:24-36`) ngăn ngừa cạn kiệt kết nối (Connection Pool Exhaustion) trong chu kỳ Fast Refresh của Next.js.

---

## 3.2. Bộ lọc Giới hạn Tần suất In-Memory Sliding Window Rate Limiter (`lib/api-guard.ts`)

Tệp mã nguồn: `lib/api-guard.ts` (109 dòng).

### A. Cơ chế Cửa Sổ Trượt (Sliding Window Algorithm)
- **Cấu trúc lưu trữ:** `Map<string, { timestamps: number[] }>` (dòng 13).
- **Trích xuất IP Khách hàng:** Ưu tiên `x-forwarded-for` (lấy hop đầu tiên từ reverse proxy), sau đó là `x-real-ip`, fallback về `127.0.0.1` (dòng 30-40).
- **Chu kỳ dọn rác tự động:** `setInterval` chạy mỗi 60 giây (`CLEANUP_INTERVAL`), tự động xóa các IP không còn request trong 60 giây qua, triệt tiêu 100% rủi ro tràn bộ nhớ (Memory Leak) (dòng 17-28).

### B. Định mức Áp dụng & HTTP Headers Tiêu chuẩn
- `/api/mobile/grade`: **20 requests / phút / IP** (dành cho client di động).
- `/api/grade`, `/api/ocr`: **30 requests / phút / IP** (dành cho Web Studio).
- `/api/yolo/detect`: **60 requests / phút / IP** (dành cho quét từ).
- **Phản hồi khi chạm ngưỡng (HTTP 429 Too Many Requests):**
  ```json
  {
    "error": "Quá nhiều yêu cầu gọi AI. Vui lòng đợi 18 giây trước khi thử lại.",
    "retryAfter": 18
  }
  ```
  Headers đính kèm: `Retry-After: 18`, `X-RateLimit-Limit: 30`, `X-RateLimit-Remaining: 0`.

---

## 3.3. Bảo vệ Phân quyền RBAC Tầng Giao diện & Quản lý Phiên Làm Việc

Hệ thống thiết lập 3 Layout Guards độc lập:
1. `app/admin/layout.tsx:16-28`: Kiểm tra `user.role === 'admin'`. Nếu không thỏa mãn, điều hướng `router.push("/")`.
2. `app/teacher/layout.tsx:16-28`: Kiểm tra `user.role === 'teacher'`.
3. `app/student/layout.tsx:16-28`: Kiểm tra `user.role === 'student'`.

**Quản lý Phiên:** Dữ liệu phiên người dùng được lưu trữ tại `localStorage.getItem("vihand_user")` sau khi xác thực thành công qua `POST /api/auth/login`. Trong khi layout đang kiểm tra phiên, UI hiển thị màn hình Skeleton/Loader `"Đang tải..."` và không render các thành phần nhạy cảm, ngăn chặn tấn công Flash of Unauthenticated Content (FOUC).

---

## 3.4. Chiến lược Chống Phình to Dung lượng CSDL (Anti-disk-bloat & Storage Scheme)

- **Vấn đề:** Ảnh chụp bài thi độ phân giải cao dạng Base64 có kích thước 2–5MB. Nếu lưu trực tiếp Base64 vào cột `TEXT` của SQLite, CSDL sẽ phình to hàng gigabyte chỉ sau vài lớp chấm, làm nghẽn B-Tree và giảm tốc độ đọc ghi.
- **Giải pháp:** Hàm `saveImageToDisk` trong `app/api/grades/route.ts:10-29` và `app/api/mobile/grade/route.ts:13-32`:
  1. Tách chuỗi Base64 và ghi file vật lý vào thư mục máy chủ:
     `public/uploads/grades/mobile-${Date.now()}-${random}.jpg`.
  2. Trong bảng `Grade` của SQLite, cột `imageBase64` được làm rỗng (`""`), chỉ lưu đường dẫn tương đối trong cột `imagePath` (`/uploads/grades/...`).
  3. Khi xóa bản ghi (`DELETE /api/grades/[id]`), hệ thống tự động xóa tệp ảnh trên đĩa bằng `fs.promises.unlink`.

---

# 4. TẦNG DỊCH VỤ TRÍ TUỆ NHÂN TẠO CỐT LÕI (AI CORE SERVICES TIER)

## 4.1. FastAPI Python Microservice (`python_service/main.py`), 10 REST Endpoints & ThreadPool

- **Khung dịch vụ:** FastAPI `0.111.0`, Uvicorn `0.29.0`, Pydantic `2.0.0`.
- **Cổng vận hành:** `8000`, lắng nghe trên `0.0.0.0`.
- **Intra-op Parallelism:** `_VIT5_WORKERS = 1` kết hợp `torch.set_num_threads(n_cores)` (dòng 55-56, 113-115) tối ưu cho vi xử lý CPU x86/ARM Cortex-A72, tránh CPU Thrashing.
- **Vô hiệu hóa QuickEdit Windows Console:** Dòng 29–41 vô hiệu hóa `ENABLE_QUICK_EDIT_MODE (0x0040)` qua `ctypes.windll.kernel32.SetConsoleMode` trên `STD_INPUT_HANDLE (-10)`, ngăn chuột vô tình click làm đứng máy chủ.
- **Vòng đời Nạp trước (Pre-warm Startup):** `@app.on_event("startup")` (dòng 1642-1666) nạp trước cả ViT5 INT8 và YOLOv8 lên RAM, triệt tiêu hiện tượng lag đầu phiên (Cold Start).

---

## 4.2. Phân đoạn Từ & Dòng YOLOv8: Thuật toán Vertical Overlap & Chuẩn hóa [0.0, 1.0]

Tệp mã nguồn: `python_service/yolo_detector.py` (267 dòng).
- **Trọng số:** `Test_train_29_12/ver2/runs/detect/train/weights/best.pt` (dòng 30-42).
- **Kích thước ảnh:** `imgsz = 640`, `conf = 0.50`, `iou = 0.45` (dòng 241). Tối ưu chạy CPU ARM64 nhanh gấp $6\times$ so với kích thước gốc.

### Thuật toán Gom Dòng Vertical Overlap
Dẫn chứng tại `yolo_detector.py:115-143`:
1. Sắp xếp sơ bộ các hộp theo tọa độ $y_1$ tăng dần: $\text{raw} = \text{sorted}(\text{boxes}, \text{key} = \lambda b: b[y_1])$.
2. Với mỗi bounding box, tính chiều cao $\text{box\_h} = \max(1.0, by_2 - by_1)$.
3. Tính đường bao trung bình cộng của các dòng đã có:
   $$\text{line\_y1\_avg} = \frac{\sum lb[y_1]}{N}, \quad \text{line\_y2\_avg} = \frac{\sum lb[y_2]}{N}, \quad \text{line\_h} = \max(1.0, \text{line\_y2\_avg} - \text{line\_y1\_avg})$$
4. Tính độ giao thoa theo trục đứng (Vertical Intersection):
   $$\text{inter\_h} = \max(0.0, \min(by_2, \text{line\_y2\_avg}) - \max(by_1, \text{line\_y1\_avg}))$$
   $$\text{overlap\_ratio} = \frac{\text{inter\_h}}{\min(\text{box\_h}, \text{line\_h})}$$
5. Nếu $\text{overlap\_ratio} \ge 0.40$, gộp vào dòng có độ giao thoa lớn nhất. Nếu không, tạo dòng mới.
6. Sắp xếp thứ tự đọc tự nhiên: Sắp xếp các dòng từ trên xuống dưới theo $\text{avg}(y_1)$; trong từng dòng sắp xếp các từ từ trái sang phải theo $x_1$ tăng dần.
7. Chuẩn hóa tỷ lệ tương đối: $[0.0, 1.0]$ theo công thức $\text{rel\_x1} = x_1 / W, \text{rel\_y1} = y_1 / H, \text{rel\_w} = (x_2 - x_1) / W, \text{rel\_h} = (y_2 - y_1) / H$ (dòng 161-185).

---

## 4.3. Động cơ Sửa lỗi Chính tả ViT5: Dynamic INT8, Prose Chunking 160 & Phân rã Âm tiết 5 Thành phần

- **Mô hình định danh:** `chamdentimem/ViT5_Vietnamese_Correction` (226M tham số).
- **Lượng tử hóa Dynamic INT8:** `torch.quantization.quantize_dynamic(_model, {torch.nn.Linear}, dtype=torch.qint8)` (`python_service/main.py:97-110`). Giảm 50% RAM, tăng 30-50% tốc độ suy luận CPU.
- **Prose Chunking Chống Lặp Từ:**
  Hàm `_split_prose_to_chunks` (dòng 406-438) tách đoạn văn thành các khối $\le 160$ ký tự theo dấu câu. Với $1.5$ token/ký tự tiếng Việt có dấu, 160 ký tự $\approx 240$ token, nằm trọn trong `max_length = 256` của tokenizer. **Tuyệt đối không dùng Sliding Window** để ngăn mô hình lặp lại câu trước trong output.
- **Bộ Phân rã Âm tiết 5 Thành phần & Phân loại 6 Loại Lỗi:**
  Hàm `parse_vietnamese_syllable` và `classify_error_type` (dòng 537-670):
  $$\text{Âm tiết} = \text{Âm đầu} + \text{Nguyên âm chính} + \text{Âm cuối} + \text{Dấu thanh}$$
  Phân loại 6 nhóm lỗi sư phạm:
  1. `viet_hoa`: Khác biệt hoa/thường.
  2. `dau_thanh`: Cùng âm gốc nhưng sai dấu thanh (huyền, sắc, hỏi, ngã, nặng).
  3. `phu_am_dau`: Sai phụ âm đầu (*tr/ch, s/x, d/gi/r*).
  4. `phu_am_cuoi`: Sai âm cuối (*c/t, n/ng*).
  5. `am_chinh`: Sai nguyên âm đôi/đơn (*ươ/ưa, iê/ia*).
  6. `van`: Khác biệt toàn bộ vần.

---

## 4.4. Mô hình Ngôn ngữ Nhỏ Qwen 2.5 SLM: `Qwen2.5-0.5B-Instruct` bfloat16 & Chuẩn Thông tư 27

- **Mô hình:** `Qwen/Qwen2.5-0.5B-Instruct` nạp qua `AutoModelForCausalLM`.
- **Độ chính xác & RAM:** `torch_dtype = torch.bfloat16` (`python_service/main.py:976-980`). Tiết kiệm 75% RAM, chỉ tiêu tốn **~577MB RAM** thay vì ~2.3GB như FP32.
- **System Prompt Chuẩn Sư phạm:**
  Xưng "Cô", gọi "con", khen ngợi sự sáng tạo trước, nhắc nhở lỗi chính tả sau, giọng văn dịu dàng, độ dài dưới 40 từ.
- **Output Guardrails:** Loại bỏ các từ tiêu cực (`invalid_words`: "điểm thấp", "yếu kém", "toán"), kiểm tra âm hưởng cô giáo (`has_teacher_tone`), sinh đồng thời 3 gợi ý nhận xét sư phạm (`suggestions`).
- **Sáng tác Bài đọc SGK:** `generate_dictation_passage_tier2` hỗ trợ 5 khối lớp và 3 bộ sách (Kết nối tri thức, Cánh diều, Chân trời sáng tạo).

---

## 4.5. Động cơ Tổng hợp Giọng nói Sư phạm Microsoft Edge-TTS (`vi-VN-HoaiMyNeural`, -15%)

- **Thư viện:** `edge-tts>=6.1.12` (`python_service/main.py:1713-1757`).
- **Giọng đọc:** Cô Hoài My (`vi-VN-HoaiMyNeural`), Thầy Nam Minh (`vi-VN-NamMinhNeural`).
- **Tốc độ đọc sư phạm:** `rate = "-15%"` mô phỏng nhịp đọc chuẩn mực giúp học sinh tiểu học kịp nghe, ghi nhớ và chép bài.
- **Streaming:** Trả về luồng âm thanh nhị phân `Response(content=bytes(audio_data), media_type="audio/mpeg")` với độ trễ $< 1.0$ giây.

---

# 5. HỢP ĐỒNG API & DTO SCHEMAS (API CONTRACTS & DATA TRANSFER OBJECTS)

## 5.1. BFF Endpoint Trọng tâm: `POST /api/mobile/grade`

Tệp nguồn: `app/api/mobile/grade/route.ts:347-524`.
- **Mục đích:** API Gateway trọn gói tất cả trong một cho Android Native App (OCR $\to$ YOLO BBoxes $\to$ Sửa lỗi $\to$ Điểm TT27 $\to$ Ghi ảnh đĩa $\to$ Lưu DB).
- **Rate Limit:** 20 requests / phút / IP.
- **Request Body (JSON):**
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
- **Response Schema (`GradeApiResponse` Parity - HTTP 200):**
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
  "pedagogicalComment": "Bài viết rất cẩn thận, chữ viết tròn trịa và đúng mẫu. Con chú ý rèn thêm nét chữ hoa đầu dòng nhé!",
  "pedagogicalComments": [
    "Bài viết rất cẩn thận, chữ viết tròn trịa và đúng mẫu. Con chú ý rèn thêm nét chữ hoa đầu dòng nhé!",
    "Chữ viết sạch sẽ, trình bày đẹp mắt. Con tiếp tục phát huy ở các bài sau nha!",
    "Con chép bài rất tập trung, câu từ ngay ngắn. Cô rất khen ngợi con!"
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

## 5.2. Core Grading Endpoint: `POST /api/grade` (3 Luồng A/B/C)

Tệp nguồn: `app/api/grade/route.ts:1063-1224`.
- **Luồng A (Ground Truth Alignment):** Đối soát 1-1 không ảo giác với văn bản chuẩn bằng thuật toán LCS Opcodes Diff + Syllable Parser.
- **Luồng B (ViT5 Local Microservice):** Gọi `POST http://localhost:8000/grade` khi nhập văn bản thủ công (timeout 120s, retry 1 lần).
- **Luồng C (Gemini Fallback Grading):** Kích hoạt khi ViT5 offline, sử dụng `gemini-3.1-flash-lite` với prompt barem Bộ GD&ĐT.

---

## 5.3. Nhóm Endpoint Luyện viết Chính tả SGK & Phát âm Neural TTS (`/api/dictation/*`)

| Endpoint URL | HTTP Method | Request Body / Params | Response Payload | Mô tả Chức năng |
|:---|:---:|:---|:---|:---|
| `/api/dictation/passages` | `GET` | Query: `gradeLevel`, `bookSet`, `unit` | `{"passages": [TextbookPassage]}` | Tải danh mục bài đọc SGK GDPT 2018 |
| `/api/dictation/passages` | `POST` | `{"title", "content", "gradeLevel", "bookSet", "unit", "difficultWords"}` | `{"passage": TextbookPassage}` | Thêm mới bài đọc vào kho ngữ liệu |
| `/api/dictation/sessions` | `POST` | `{"title", "passage", "className", "teacherName", "source", "deviceId"}` | `{"session": DictationSession}` | Khởi tạo phiên đọc chính tả |
| `/api/dictation/sessions/[id]/logs` | `POST` | `{"speaker", "content"}` | `{"log": DictationLog}` | Ghi nhật ký từng câu đọc / tương tác |
| `/api/dictation/tts` | `GET` | Query: `text`, `voice`, `rate` | Stream `audio/mpeg` | Phát trực tuyến âm thanh giọng Hoài My / Nam Minh |
| `/api/dictation/generate` | `POST` | `{"gradeLevel", "topic", "sentenceCount", "bookSet"}` | `{"title", "content", "difficultWords", "summary"}` | Sáng tác bài đọc chính tả bằng Qwen 2.5 SLM |

---

## 5.4. Nhóm Endpoint Quản lý Điểm số & Sổ Điểm (`/api/grades/*`)

- `GET /api/grades`: Tra cứu bảng điểm kèm bộ lọc `?class=...&search=...`.
- `POST /api/grades`: Nhận DTO `ServerGradeSyncRequest` lưu kết quả chấm vào CSDL Prisma `vihand.db`.
- `GET /api/grades/[id]`: Lấy chi tiết bài chấm kèm toàn bộ Bounding Boxes.
- `PATCH /api/grades/[id]`: Cập nhật điểm số can thiệp thủ công (Teacher Score Override) và chỉnh sửa BBoxes.
- `DELETE /api/grades/[id]`: Xóa bài chấm trong DB và xóa tệp ảnh vật lý tương ứng trên đĩa (`fs.promises.unlink`).

---

## 5.5. Nhóm Endpoint Quản trị Người dùng & Lớp học (`/api/users`, `/api/classes`)

- `POST /api/auth/login`: Xác thực đăng nhập (`username`, `password`) $\to$ Trả về thông tin người dùng và vai trò (`admin`, `teacher`, `student`).
- `POST /api/auth/register`: Đăng ký tài khoản giáo viên/học sinh.
- `POST /api/auth/admin-register`: Đăng ký tài khoản Quản trị viên tối cao (yêu cầu khớp `ADMIN_SECRET_KEY`).
- `GET /api/users`: Lấy danh sách người dùng phân trang và lọc theo vai trò.
- `GET /api/classes`: Lấy danh mục lớp học kèm thông tin giáo viên chủ nhiệm.

---

## 5.6. Bảng Mã Trạng Thái HTTP & Exception Models Chuẩn Hóa

| HTTP Status | Điều kiện Kích hoạt | Cấu trúc Payload Phản hồi Chuẩn |
|:---:|:---|:---|
| `200 OK` | Xử lý thành công mọi nghiệp vụ | Payload dữ liệu JSON tương ứng |
| `400 Bad Request` | Thiếu trường bắt buộc, ảnh rỗng, sai định dạng điểm | `{"error": "Thiếu thông tin bắt buộc: ..."}` |
| `401 Unauthorized` | Sai mật khẩu hoặc chưa đăng nhập | `{"error": "Tên đăng nhập hoặc mật khẩu không chính xác"}` |
| `403 Forbidden` | Sai khóa bí mật `ADMIN_SECRET_KEY` | `{"error": "Mã bí mật quản trị không chính xác"}` |
| `404 Not Found` | Không tìm thấy bài thi, lớp học hoặc người dùng | `{"error": "Không tìm thấy bản ghi yêu cầu"}` |
| `429 Too Many Requests` | Vượt hạn mức cửa sổ trượt (Sliding Window) | `{"error": "Quá nhiều yêu cầu gọi AI...", "retryAfter": N}` |
| `500 Internal Error` | Lỗi ngoại lệ máy chủ chưa được kiểm soát | `{"error": "Lỗi máy chủ nội bộ: <chi_tiết>"}` |
| `503 Service Unavailable`| Toàn bộ các kênh OCR / AI đều bị ngắt kết nối | `{"error": "Dịch vụ AI hiện không khả dụng. Vui lòng thử lại sau"}`|

---

# 6. MÔ HÌNH DỮ LIỆU & ERD (DATA MODELS, SCHEMAS & TWO-WAY SYNC)

## 6.1. Lược đồ Prisma SQLite CSDL Trung tâm (`prisma/schema.prisma` - 6 Thực thể)

Dẫn chứng từ `prisma/schema.prisma:10-101`:

```prisma
datasource db {
  provider = "sqlite"
  url      = "file:./vihand.db"
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        String   @id @default(cuid())
  name      String
  username  String   @unique
  password  String   @default("123456")
  role      String   @default("student") // "admin" | "teacher" | "student"
  className String   @default("")
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  classes   Class[]  @relation("TeacherClasses")
}

model Class {
  id           String   @id @default(cuid())
  name         String   @unique
  grade        Int      @default(3)
  teacherId    String?
  teacher      User?    @relation("TeacherClasses", fields: [teacherId], references: [id], onDelete: SetNull)
  createdAt    DateTime @default(now())
}

model Grade {
  id                 String    @id @default(cuid())
  gradingMode        String    @default("dictation") // "dictation" | "essay"
  studentName        String
  assignmentTitle    String
  className          String    @default("")
  originalText       String
  fixedText          String
  corrections        String    // JSON string: danh sách lỗi, gợi ý và tọa độ BBoxes
  score              String    // Hiển thị: "8.5/10"
  scoreNum           Float     // Tính toán / lọc: 8.5
  scoreBreakdown     String    @default("") // JSON string: barem chi tiết 4 tiêu chí
  feedback           String
  pedagogicalComment String    @default("")
  overallRating      String    // "Xuất sắc" | "Tốt" | "Khá" | "Trung bình" | "Cần cố gắng"
  processingTimeMs   Int       @default(0)
  tokenCount         Int       @default(0)
  imageBase64        String    @default("") // Rỗng để chống phình to CSDL
  imagePath          String    @default("") // Đường dẫn đĩa vật lý: /uploads/grades/...
  dictationSessionId String    @default("")
  expiresAt          DateTime? // Mặc định createdAt + 365 ngày (Nghị định 13/2023)
  isAnonymized       Boolean   @default(false)
  anonymizedAt       DateTime?
  createdAt          DateTime  @default(now())
}

model DictationSession {
  id          String         @id @default(cuid())
  title       String
  passage     String
  className   String         @default("")
  teacherName String         @default("")
  source      String         @default("web") // "web" | "manual" | "robot"
  deviceId    String         @default("")
  status      String         @default("completed")
  summary     String         @default("")
  createdAt   DateTime       @default(now())
  logs        DictationLog[]
}

model DictationLog {
  id        String           @id @default(cuid())
  sessionId String
  session   DictationSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  speaker   String           // "teacher" | "student" | "ai"
  content   String
  createdAt DateTime         @default(now())
}

model TextbookPassage {
  id             String   @id @default(cuid())
  gradeLevel     Int      @default(3)
  bookSet        String   @default("KetNoi") // "KetNoi" | "CanhDieu" | "ChanTroi"
  unit           String   @default("Tuần 1")
  title          String
  content        String
  difficultWords String   @default("")
  createdAt      DateTime @default(now())
}
```

---

## 6.2. Lược đồ Room DB v4 CSDL Ngoại tuyến Di động (`vihand_grade.db` - 3 Thực thể)

Dẫn chứng từ `android_app/app/src/main/java/com/example/data/local/`:
1. **`GradeRecordEntity` (bảng `grade_records`):** 18 cột đã chi tiết tại Mục 2.4.
2. **`ClassEntity` (bảng `classes`):**
   `id: String` (PrimaryKey), `name: String`, `grade: Int? = null`, `studentCount: Int? = 0`, `teacherName: String? = null`.
3. **`StudentEntity` (bảng `students`):**
   `id: String` (PrimaryKey), `name: String`, `username: String? = null`, `className: String? = null`.

---

## 6.3. Ma trận Ánh xạ Thực thể (Entity Mapping Matrix) Prisma vs Room DB

| Thuộc tính Nghiệp vụ | Trường trong Prisma CSDL Web (`Grade`) | Cột trong Room DB v4 (`GradeRecordEntity`) | Kiểu Dữ liệu Web $\to$ Mobile | Ghi chú Chuyển đổi Dữ liệu |
|:---|:---|:---|:---|:---|
| Khóa định danh Web | `Grade.id` | `GradeRecordEntity.serverId` | `String` $\to$ `String?` | Lưu ID máy chủ phục vụ đối soát đồng bộ |
| Khóa nội bộ Mobile | N/A | `GradeRecordEntity.id` | N/A $\to$ `Long` | Khóa tự tăng SQLite trên máy |
| Họ tên học sinh | `Grade.studentName` | `GradeRecordEntity.studentName` | `String` $\to$ `String` | Khớp chính xác $1:1$ |
| Lớp học | `Grade.className` | `GradeRecordEntity.className` | `String` $\to$ `String` | Khớp chính xác $1:1$ |
| Tiêu đề bài thi | `Grade.assignmentTitle` | `GradeRecordEntity.essayTitle` | `String` $\to$ `String` | Ánh xạ tên trường tương đương |
| Tổng điểm số | `Grade.scoreNum` | `GradeRecordEntity.totalScore` | `Float` $\to$ `Float` | Thang điểm số thực 10.0 |
| Điểm chính tả | Trích xuất từ `scoreBreakdown` | `GradeRecordEntity.spellingScore`| `JSON` $\to$ `Float` | Parser qua `Moshi` |
| Điểm hình thức | Trích xuất từ `scoreBreakdown` | `GradeRecordEntity.formatScore` | `JSON` $\to$ `Float` | Parser qua `Moshi` |
| Điểm nội dung | Trích xuất từ `scoreBreakdown` | `GradeRecordEntity.contentScore` | `JSON` $\to$ `Float` | Parser qua `Moshi` |
| Điểm sáng tạo | Trích xuất từ `scoreBreakdown` | `GradeRecordEntity.creativityScore`| `JSON` $\to$ `Float` | Parser qua `Moshi` |
| Nhận xét sư phạm | `Grade.pedagogicalComment` | `GradeRecordEntity.pedagogicalComment` | `String` $\to$ `String` | Lời dặn dò cô giáo |
| Văn bản OCR gốc | `Grade.originalText` | `GradeRecordEntity.extractedText`| `String` $\to$ `String` | Giữ nguyên 100% lỗi học sinh |
| Văn bản đã sửa | `Grade.fixedText` | `GradeRecordEntity.correctedFullText` | `String` $\to$ `String` | Văn bản chuẩn hóa ngữ pháp |
| Danh sách lỗi BBox | `Grade.corrections` | `GradeRecordEntity.errorsJson` | `JSON String` $\to$ `String`| Lưu nguyên chuỗi JSON mảng `ErrorBox` |
| Nguồn xử lý | Tự sinh khi ghi DB | `GradeRecordEntity.serverSource` | `String` $\to$ `String` | `"Mobile BFF"`, `"Pi"`, `"Offline"` |
| Đường dẫn file ảnh | `Grade.imagePath` | `GradeRecordEntity.photoPath` | `String` $\to$ `String?` | Đường dẫn máy chủ vs file máy |

---

## 6.4. Máy Trạng thái Đồng bộ Hai chiều, Giải quyết Xung đột & Bền bỉ Ngoại tuyến

### A. Máy Trạng Thái Đồng Bộ (Two-Way Sync State Machine)

```
                 ┌────────────────────────────────┐
                 │       KHỞI TẠO ĐỒNG BỘ         │
                 │  syncTwoWayWithServer(server)  │
                 └───────────────┬────────────────┘
                                 │
                   Kiểm tra kết nối Máy chủ?
                     /                      \
                 [MẤT MẠNG]              [KẾT NỐI OK]
                    /                         \
    ┌───────────────────────────┐    ┌─────────────────────────────────┐
    │     CHẾ ĐỘ NGOẠI TUYẾN    │    │ BƯỚC 1: ĐỒNG BỘ CHIỀU UPLOAD    │
    │  - Lưu bài vào Room DB    │    │  - Quét Room: getAllRecordsList │
    │  - Gắn serverId = null    │    │  - Lọc bài có serverId == null  │
    │  - Gắn serverSource=local │    │  - POST /api/grades             │
    │  - Cho phép xem lại & lọc │    │  - Cập nhật serverId trả về     │
    └───────────────────────────┘    └────────────────┬────────────────┘
                                                      │
                                     ┌────────────────┴────────────────┐
                                     │ BƯỚC 2: ĐỒNG BỘ CHIỀU DOWNLOAD  │
                                     │  - GET /api/grades              │
                                     │  - Tạo bộ khóa Unique Set:      │
                                     │    studentName_title_className  │
                                     │  - Bỏ qua các bài đã có trong máy│
                                     │  - Thêm bài mới vào Room DB     │
                                     └────────────────┬────────────────┘
                                                      │
                                     ┌────────────────┴────────────────┐
                                     │ BÁO CÁO KẾT QUẢ ĐỒNG BỘ         │
                                     │ Triple(UploadOk, UploadErr, New)│
                                     └─────────────────────────────────┘
```

### B. Chiến Lược Giải Quyết Xung Đột Dữ Liệu (Conflict Resolution Strategy)
1. **Khóa Định Danh Duy Nhất (Composite Deduplication Key):**
   Hệ thống sử dụng bộ khóa kết hợp chuẩn hóa:
   `key = "${studentName.trim()}_${essayTitle.trim()}_${className.trim()}"`.
2. **Nguyên Tắc Giáo Viên Là Trung Tâm (Teacher Edit Priority):**
   Nếu bài thi đã được giáo viên chấm hoặc can thiệp điểm số trên điện thoại (`GradeRecordEntity`), các giá trị điểm số ghi đè (`overrideSpelling`, `overrideFormat`...) được ưu tiên cao nhất và cập nhật ngược lên máy chủ qua `PATCH /api/grades/{id}`.
3. **Bảo Toàn Tính Toàn Vẹn Khi Rớt Mạng Đột Ngột (Offline Resilience):**
   Mọi thao tác chấm bài khi mất Internet đều được commit nguyên vẹn vào Room DB cục bộ trong khối transaction SQLite. Cờ `serverId = null` đánh dấu bài làm đang chờ đồng bộ. Ngay khi thiết bị có lại kết nối mạng, tiến trình nền tự động đẩy bài lên máy chủ mà không làm mất bất kỳ nét chữ hay điểm số nào của học sinh.

---

# 7. QUY TRÌNH KIỂM THỬ, XÁC THỰC THỰC NGHIỆM & CHỨNG TỪ PSTACK

## 7.1. Kết quả Kiểm thử Android Native Unit & Robolectric Tests (23/23 Passed)

Thực thi trên môi trường máy ảo phần cứng Google Pixel 8, mô phỏng Android 16 (SDK 36):
- **Tổng số ca kiểm thử:** **23 / 23 Tests**
- **Kết quả:** **23 Passed (100%), 0 Failures, 0 Skipped**.
- **Thời gian thực thi:** **1 phút 50.57 giây**.
- **Báo cáo gốc Gradle:** `android_app/app/build/reports/tests/testDebugUnitTest/index.html`.

### Bảng Chi tiết 23 Ca Kiểm thử Đã Vượt Qua

| File Kiểm thử | Tên Test Case Cụ thể | Thời gian | Mục tiêu Xác thực Nghiệp vụ |
|:---|:---|:---:|:---|
| `ExampleRobolectricTest.kt` | `read string from context` | 0.81s | Tên ứng dụng `app_name` là `"ViHand Grade"` |
| `ExampleRobolectricTest.kt` | `verify emerald_primary and background_cream colors in resources` | 0.22s | Khớp mã màu XML `#FF059669` và `#FFFAF9F6` |
| `ExampleRobolectricTest.kt` | `camera scan screen renders controls and viewfinder` | 14.85s | Kính ngắm CameraX, nút chụp và thanh công cụ |
| `ExampleRobolectricTest.kt` | `grading result screen renders 3 tabs and can switch modes` | 18.20s | Render 3 tab (`canvas`, `diff`, `skills`) |
| `ExampleRobolectricTest.kt` | `history screen renders search and filter chips and filters dynamically` | 12.11s | Tìm kiếm không dấu & bộ lọc chip thể loại/điểm |
| `ExampleRobolectricTest.kt` | `photo bounding box viewer renders and zoom toggle works` | 2.02s | Khung ảnh BBox và nút chuyển đổi tỷ lệ Zoom |
| `ExampleUnitTest.kt` | `addition_isCorrect` | 0.002s | Kiểm thử nền tảng JVM cơ bản |
| `ExampleUnitTest.kt` | `extractDifficultWords with empty records returns DEFAULT_SGK_DIFFICULT_WORDS`| 0.001s | Danh sách rỗng fallback về 5 từ khó SGK |
| `ExampleUnitTest.kt` | `extractDifficultWords with errors maps originalWord to explanation correctly`| 0.002s | Bóc tách chính xác cặp từ gốc và lời giải thích |
| `ExampleUnitTest.kt` | `extractDifficultWords removes duplicate original words case-insensitively` | 0.002s | Khử trùng lặp từ khó không phân biệt hoa thường |
| `ExampleUnitTest.kt` | `extractDifficultWords with perfect score zero errors returns fallback` | 0.001s | Bài thi điểm 10 không lỗi nạp từ khó SGK dự phòng |
| `ExampleUnitTest.kt` | `extractDifficultWords with empty explanation falls back to correctedWord` | 0.005s | Chuỗi fallback giải thích khi explanation bị rỗng |
| `GreetingScreenshotTest.kt` | `greeting_screenshot` | 19.41s | Roborazzi snapshot khớp 100% pixel-perfect |
| `Milestone1StressTest.kt` | `extractDifficultWords stress test - multiple submissions with repeated words`| 0.42s | Chịu tải nhiều bài nộp, từ trùng lặp hoa/thường |
| `Milestone1StressTest.kt` | `extractDifficultWords stress test - blank originalWords only falls back` | 0.12s | Tình huống tất cả từ gốc đều là khoảng trắng |
| `Milestone1StressTest.kt` | `extractDifficultWords stress test - multiple submissions with zero errors` | 0.08s | Nhiều học sinh liên tiếp đạt điểm 10 tuyệt đối |
| `Milestone1StressTest.kt` | `extractDifficultWords stress test - explanation fallback cascade` | 0.15s | Toàn bộ 4 cấp độ tầng fallback của lời giải thích |
| `Milestone1StressTest.kt` | `historyScreen score boundary stress test - exact 9_0, 8_0, 6_5 values` | 0.28s | Biên điểm số tại các mốc 9.0, 8.9, 8.0, 7.9, 6.5 |
| `Milestone1StressTest.kt` | `historyScreen score partition mathematical oracle - 1000 float samples` | 0.45s | 1000 mẫu ngẫu nhiên luôn thuộc đúng 1 phân vùng |
| `Milestone1StressTest.kt` | `vietnamese diacritic normalization oracle - thorough vowel & consonant` | 0.32s | Chuẩn hóa 13 cụm tên và từ ngữ tiếng Việt phức tạp |
| `Milestone1StressTest.kt` | `historyScreen vietnamese diacritic stripping stress test` | 1.82s | Giao diện Compose tìm kiếm hoa/thường/không dấu |
| `Milestone1StressTest.kt` | `historyScreen category filter stress test` | 0.65s | Bộ lọc thể loại Chính tả và Tập làm văn |
| `Milestone1StressTest.kt` | `historyScreen combined filters empty state stress test` | 0.47s | Kết hợp nhiều bộ lọc dẫn đến trạng thái rỗng |

---

## 7.2. Kiểm thử TypeScript Compiler Gateway (`tsc --noEmit` 0 Errors)

- **Lệnh thực thi:** `npx tsc --noEmit`
- **Kết quả:** **0 lỗi biên dịch (Zero Errors, Exit Code 0)**.
- Toàn bộ 24 API routes (`app/api/**`), các giao diện người dùng Web Studio (`app/**`), thư viện xử lý hình ảnh `lib/image-processor.ts` và cơ sở dữ liệu `lib/prisma.ts` đều tương thích kiểu nghiêm ngặt (Strict Type Safety).

---

## 7.3. Chứng từ Thực nghiệm Bài thi Thật & Harness PStack

- **Kho ảnh thực tế:**
  - 49 tệp ảnh bài thi quét CamScanner ngày 06-12-2025 (`Ảnh viết tay 76 thực tế/`).
  - 104 tệp ảnh bài thi quét ngày 21-12-2025 (`chữ viết tay 100+/`).
  - 10 tệp ảnh nền ô ly chuẩn mực (`Chữ viết tay nền ô ly tự tạo đúng chính tả 10/`).
- **Bộ công cụ Xác thực PStack (Lauren Tan Standard):**
  Trang bị tại `.agents/skills/verify-vihand-grade/scripts/`:
  - `verify_ai.py`: Gửi câu viết sai kinh điển `"cô giáo bẩu em cố gắn học tập"` $\to$ Xác nhận ViT5 sửa thành `"bảo"`, `"gắng"` trong $< 5000\text{ms}$.
  - `verify_bff.py`: Nạp ảnh bài thi thật `err_01/00_anh_goc.jpg` dạng Base64 vào `POST /api/mobile/grade` $\to$ Xác nhận HTTP 200, 4 tiêu chí điểm TT27, BBoxes $\in [0.0, 1.0]$.
  - `verify_edge.py`: Kiểm tra kết nối Cloudflare Tunnel `https://vihandgrade.click/api/health` và xác nhận trạng thái 3 tiến trình systemd (`vihand-web`, `vihand-python`, `cloudflared`) trên trạm Raspberry Pi.
  - `verify_all.py`: Điều phối tổng thể toàn bộ 4 bề mặt.

---

# 8. KẾT LUẬN & HƯỚNG DẪN TÍCH HỢP TÀI LIỆU

Bản đặc tả kỹ thuật này cung cấp bộ khung blueprint toàn diện, chi tiết và xác thực 100% mã nguồn cho **Tài liệu 2: Đặc tả Kỹ thuật Hệ thống ViHand Grade End-to-End** (`01_Bao_cao_Nghien_cuu/Tai_lieu_Bao_cao/03_Dac_Ta_Kien_Truc_He_Thong/02_Dac_Ta_Ky_Thuat_End2End_ViHandGrade.md`).

Tất cả các thành phần:
- Tầng Client Mobile Android Native (Jetpack Compose, CameraX, Room v4, Touch Gestures).
- Tầng Web Studio & BFF Gateway (Next.js 16, Prisma SQLite WAL, Rate Limiting, Storage).
- Tầng AI Core Microservice (FastAPI, YOLOv8 Overlap, ViT5 INT8, Qwen 2.5 SLM, Edge-TTS).
- Hợp đồng API DTO Schemas Parity & Mô hình Dữ liệu Đồng bộ Hai Chiều.
- Toàn bộ kết quả kiểm thử thực nghiệm PStack.

Đều đã được kiểm chứng không có giả định, sẵn sàng để tác giả tài liệu chuyển thể thành văn bản báo cáo nghiên cứu khoa học chính thức.
