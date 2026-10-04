# BÁO CÁO KIỂM TOÁN LIÊM CHÍNH ĐỘC LẬP (FORENSIC INTEGRITY AUDIT REPORT)

**Hồ sơ kiểm toán**: `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\orchestrator_1\AUDIT_REPORT.md`  
**Yêu cầu gốc**: `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\ORIGINAL_REQUEST.md`  
**Kiểm toán viên**: Forensic Integrity Auditor (`auditor_1`)  
**Chế độ liêm chính (Integrity Mode)**: `demo` (căn cứ theo `ORIGINAL_REQUEST.md:8`)  
**Thời điểm hoàn tất**: 2026-09-30T14:58:00Z  
**Phán quyết kiểm toán nhị phân**: **`VERDICT: CLEAN`**

---

## 1. OBSERVATION (QUAN SÁT THỰC NGHIỆM TRỰC TIẾP & BẰNG CHỨNG)

Kiểm toán viên đã tiến hành khảo sát và kiểm chứng độc lập trên toàn bộ mã nguồn của cả hai nền tảng Android Native App (`android_app/`) và Web Next.js BFF (`app/`), ghi nhận các quan sát thực nghiệm sau:

### 1.1. Đối Soát Ma Trận 39 Endpoints Trong Bảng 2.2
- **Khảo sát cây thư mục Web BFF (`app/api/`)**:
  - Quét hệ thống tìm kiếm file ghi nhận chính xác **24 tệp `route.ts`**:
    `admin/retention`, `auth/admin-register`, `auth/login`, `auth/register`, `classes/[id]`, `classes`, `dictation/generate`, `dictation/passages`, `dictation/sessions/[id]/logs`, `dictation/sessions/[id]`, `dictation/sessions`, `dictation/tts`, `grade/comments`, `grade`, `grades/[id]`, `grades`, `health`, `mobile/grade`, `ocr`, `preprocess`, `users/[id]`, `users`, `vit5-warmup`, `yolo/detect`.
  - Quét Regex `export async function (GET|POST|PATCH|DELETE)` trên 24 tệp này phát hiện chính xác **38 server handler verbs** với số dòng code bắt đầu khớp 100% với Bảng 2.2 của `AUDIT_REPORT.md`:
    1. `app/api/grade/route.ts:1011` (`POST`)
    2. `app/api/yolo/detect/route.ts:10` (`POST`)
    3. `app/api/grade/comments/route.ts:89` (`POST`)
    4. `app/api/vit5-warmup/route.ts:10` (`GET`)
    5. `app/api/admin/retention/route.ts:11` (`GET`) & `line 66` (`POST`)
    6. `app/api/auth/register/route.ts:4` (`POST`)
    7. `app/api/users/[id]/route.ts:5` (`DELETE`) & `line 19` (`PATCH`)
    8. `app/api/auth/admin-register/route.ts:7` (`POST`)
    9. `app/api/users/route.ts:5` (`GET`) & `line 36` (`POST`)
    10. `app/api/auth/login/route.ts:4` (`POST`)
    11. `app/api/health/route.ts:3` (`GET`)
    12. `app/api/classes/[id]/route.ts:5` (`DELETE`) & `line 19` (`PATCH`)
    13. `app/api/classes/route.ts:5` (`GET`) & `line 50` (`POST`)
    14. `app/api/grades/route.ts:32` (`GET`) & `line 65` (`POST`)
    15. `app/api/dictation/tts/route.ts:11` (`GET`)
    16. `app/api/grades/[id]/route.ts:7` (`DELETE`), `line 26` (`GET`), `line 41` (`PATCH`)
    17. `app/api/dictation/passages/route.ts:8` (`GET`), `line 40` (`POST`), `line 71` (`PATCH`), `line 103` (`DELETE`)
    18. `app/api/mobile/grade/route.ts:347` (`POST`)
    19. `app/api/dictation/sessions/[id]/route.ts:5` (`GET`) & `line 39` (`DELETE`)
    20. `app/api/dictation/generate/route.ts:95` (`POST`)
    21. `app/api/dictation/sessions/route.ts:5` (`GET`) & `line 39` (`POST`)
    22. `app/api/preprocess/route.ts:4` (`POST`)
    23. `app/api/dictation/sessions/[id]/logs/route.ts:5` (`POST`) & `line 52` (`GET`)
    24. `app/api/ocr/route.ts:140` (`POST`)
  - **Endpoint thứ 39 (STT 11 trong Bảng 2.2)**: Là trường hợp invocation đặc thù từ client di động (`POST /api/grade` gửi `imageBase64`), được ghi nhận chính xác trong tài liệu `android_app/IMPLEMENTATION_PLAN.md:11` và `android_app/HUONG_DAN_TRIEN_KHAI_APK_EUREKA.md:40`. Server Next.js yêu cầu bắt buộc `studentText` (`app/api/grade/route.ts:1034-1039`), do đó client gửi ảnh Base64 sẽ nhận `HTTP 400`. Báo cáo đã phân loại chính xác đây là "Endpoint mồ côi (về mặt kiến trúc mobile)".
  - **Kết luận**: Không có bất kỳ endpoint nào bị hallucinate (0% fabricated).

### 1.2. Đối Soát Lớp Mạng Android & 9 Retrofit Annotations
- Tệp `android_app/app/src/main/java/com/example/data/api/GradeApiService.kt:13-62` khai báo chính xác 9 Retrofit annotations:
  - Dòng 13: `@POST("api/mobile/grade")`
  - Dòng 18: `@GET("api/health")`
  - Dòng 22: `@POST("api/auth/login")`
  - Dòng 28: `@GET("api/dictation/passages")`
  - Dòng 35: `@GET("api/classes")`
  - Dòng 38: `@GET("api/users")`
  - Dòng 44: `@POST("api/grades")`
  - Dòng 50: `@GET("api/grades")`
  - Dòng 57: `@PATCH("api/grades/{id}")`
- Tệp `DictationScreen.kt:234`: `val streamUrl = "$cleanBaseUrl/api/dictation/tts?text=$encodedText&voice=$selectedVoice&rate=$rateStr"` (lời gọi GET stream âm thanh trực tiếp qua MediaPlayer).
- Tệp `NetworkClient.kt:18-28`: OkHttpClient chỉ có duy nhất `HttpLoggingInterceptor(Level.BODY)`. Hoàn toàn không có `AuthInterceptor` hay cơ chế đính kèm Header Authorization.

### 1.3. Xác Thực Lệch Payload `the_loai` vs `essayType` & Bỏ Rơi Khóa Ngoại
- **Phía Android**: `GradeApiModels.kt:18`:
  ```kotlin
  @Json(name = "essayType") val essayType: String = "spelling"
  ```
- **Phía Web Server**: `app/api/mobile/grade/route.ts:362`:
  ```typescript
  const { the_loai: requestedTheLoai, ... } = body
  ```
  Và tại dòng 414:
  ```typescript
  const the_loai = requestedTheLoai || ocrResult.the_loai
  ```
  Server chỉ bóc tách `the_loai`, hoàn toàn không đọc `essayType`. Khi Android gửi `essayType = "poem"`, `requestedTheLoai` bị `undefined`, server buộc phải phụ thuộc vào phán đoán tự động của Gemini OCR.
- **Về quan hệ khóa ngoại**: Android gửi `studentId` và `classId` (`GradeApiModels.kt:13-14`), nhưng tại `app/api/mobile/grade/route.ts:468-490`, lệnh `prisma.grade.create` chỉ lưu `studentName` và `className` dạng chuỗi thô, không liên kết khóa ngoại vào bảng `User` hoặc `Class`.

### 1.4. Xác Thực Lỗ Hổng Bảo Mật Plaintext Passwords tại `GET /api/users`
- Tệp `app/api/users/route.ts:11-26`:
  ```typescript
  const users = await prisma.user.findMany({
    where: { ... },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json({ users })
  ```
  Truy vấn không có mệnh đề `select`, trả về toàn bộ các cột trong CSDL.
- Tệp `prisma/schema.prisma:14`:
  ```prisma
  model User {
    id        String   @id @default(cuid())
    name      String
    username  String   @unique
    password  String   @default("123456")
    role      String   @default("student")
  ```
  Mật khẩu lưu dạng văn bản rõ (plaintext). Bất kỳ ai gửi request tới `GET /api/users` đều nhận được mật khẩu của toàn bộ tài khoản học sinh và giáo viên.

### 1.5. Xác Thực Lỗi Đồng Bộ Xóa Bài Thi (P0 Sync Bug)
- Tệp `MainViewModel.kt:315-321`:
  ```kotlin
  fun deleteHistoryItem(idString: String) {
      viewModelScope.launch {
          idString.toLongOrNull()?.let {
              repository.deleteRecord(it)
          }
      }
  }
  ```
- Tệp `GradeRepository.kt:256-258`:
  ```kotlin
  suspend fun deleteRecord(id: Long) = withContext(Dispatchers.IO) {
      dao.deleteRecordById(id)
  }
  ```
  Hàm chỉ xóa trong Room DB cục bộ (`grade_records`), hoàn toàn không gửi HTTP `DELETE` lên máy chủ.
- Tệp `GradeRepository.kt:588-596` (`syncTwoWayWithServer`):
  ```kotlin
  val localRecords = dao.getAllRecordsList()
  val existingKeys = localRecords.map { "${it.studentName.trim()}_${it.essayTitle.trim()}_${it.className.trim()}" }.toSet()
  serverGrades.forEach { sGrade ->
      val key = "${sGrade.studentName.trim()}_${sGrade.essayTitle.trim()}_${sGrade.className.trim()}"
      if (key !in existingKeys) {
          saveRecord(sGrade)
          downloadedCount++
      }
  }
  ```
  Khi người dùng bấm "Đồng bộ 2 chiều", bước 2 kéo danh sách bài thi từ server về. Do bài thi chưa từng bị xóa trên server, `key !in existingKeys` trả về `true`, `saveRecord(sGrade)` khôi phục lại bản ghi vừa xóa vào điện thoại.

### 1.6. Xác Thực Trải Nghiệm Cảm Ứng Bounding Box & Touch Target Violation
- **Pinch-to-zoom**: Tìm kiếm chuỗi `detectTransformGestures` trong `android_app/app/src/main/` trả về **0 kết quả**. Trong `PhotoBoundingBoxViewer.kt:368-408`, ứng dụng chỉ cung cấp một nút bấm `IconButton` (dòng 368) chuyển đổi trạng thái `isZoomed`, áp dụng `horizontalScroll(rememberScrollState())` và ép cứng chiều rộng `width(540.dp)`.
- **Kích thước điểm chạm**: Tại `PhotoBoundingBoxViewer.kt:510-511`:
  ```kotlin
  val widthDp = (displayedWidthDp * safeRelW).coerceAtLeast(16.dp)
  val heightDp = (displayedHeightDp * safeRelH).coerceAtLeast(14.dp)
  ```
  Vùng chạm của từ ngắn (1-2 ký tự) bị co nhỏ xuống 16dp x 14dp, vi phạm tiêu chuẩn tiếp cận tối thiểu 48dp x 48dp của Android Accessibility Guidelines.

### 1.7. Xác Thực Thuật Toán Ngắt Câu Dictation & Nghỉ 10s
- Tệp `DictationScreen.kt:160-165`:
  ```kotlin
  val sentences = remember(selectedPassage) {
      selectedPassage.content
          .split("\n", ".")
          .map { it.trim() }
          .filter { it.isNotEmpty() }
  }
  ```
  Cắt văn bản thô sơ bằng `split("\n", ".")`.
- Tệp `DictationScreen.kt:322`:
  ```kotlin
  pauseCountdown = 10
  ```
  Thời gian nghỉ cố định 10 giây giữa các câu, không có tính năng thích ứng theo độ dài từ ngữ như Web (`app/teacher/dictation/page.tsx:170-225`).

### 1.8. Xác Thực Cấu Trúc CSDL Cục Bộ Room DB
- Tệp `android_app/.../data/local/AppDatabase.kt:8`:
  ```kotlin
  @Database(entities = [GradeRecordEntity::class], version = 2, exportSchema = false)
  ```
  Chỉ có duy nhất bảng `grade_records`. Hoàn toàn không có bảng cho Class hoặc Student.
- Tệp `GradeRepository.kt:697-717`: Khi ngoại tuyến, ứng dụng fallback về danh sách tĩnh `defaultClasses` (5 lớp) và `defaultStudents` (10 học sinh).

### 1.9. Xác Thực Thuật Toán Lọc Học Sinh Yếu Kém (`underperformingStudents`)
- Tệp `ReportsViewModel.kt:177-194`:
  ```kotlin
  val studentGroups = records.groupBy { it.studentName }
  val underperforming = studentGroups
      .map { (name, recs) ->
          val avg = recs.map { it.totalScore }.average().toFloat()
          val cls = recs.firstOrNull()?.className ?: ""
          Triple(name, cls, avg)
      }
      .filter { it.third < 6.5f }
      .sortedBy { it.third }
      .take(5)
      .map { (name, cls, avg) ->
          UnderperformingStudentData(
              name = name,
              className = cls,
              averageScore = avg
          )
      }
  ```
  Thuật toán tự động tính điểm trung bình của từng học sinh, lọc những em có điểm < 6.5f và lấy Top 5 để đưa vào `StudentFocusItem` trên `ReportsAnalyticsScreen.kt:434-500`.

### 1.10. Xác Thực Bảng Màu Lỗi Sư Phạm & Chuỗi Kỹ Thuật Lộ Trên UI
- **Mã màu lỗi `viet_hoa`**:
  - Android (`Color.kt:58`): `val ErrorVietHoa = Color(0xFFF59E0B)` (Amber-500).
  - Web (`app/teacher/grade/page.tsx:196`): `badgeText: "#2563eb"` (Blue-600).
  - Android thiếu 3 mã màu lỗi: `bo_sot_them` (Pink-500), `thay_the_tu` (Indigo-600), `dau_cau` (Teal-600), bị rơi vào nhánh fallback màu xám Slate `#64748B` tại `PhotoBoundingBoxViewer.kt:122`.
- **Chuỗi kỹ thuật trên UI**:
  - `HomeScreen.kt:144`: `"vihandgrade.click • Trạm Pi 4 Online"`
  - `PhotoBoundingBoxViewer.kt:312`: `"YOLOv8 DETECTED • ${result.errors.size} LỖI"`
  - `HistoryScreen.kt:119`: `"Tổng số ${records.size} bài thi đã lưu trong CSDL Room"`
  - `MainActivity.kt:587`: `"Chấm Offline 🧪"`
  - `StudentHomeScreen.kt:338-344`: Hardcode mảng tĩnh 5 từ khó (`"ru bé ngủ say"`, `"thay cho gió trời"`, ...).

### 1.11. Thực Nghiệm Xây Dựng Dự Án & Chạy Kiểm Thử (Build & Test Execution)
- **Kiểm thử Web App**:
  - Lệnh: `npx tsc --noEmit` tại thư mục gốc.
  - Kết quả: **Mã thoát (Exit Code): 0**. Biên dịch TypeScript hoàn tất với 0 lỗi cú pháp hay kiểu dữ liệu.
- **Kiểm thử Android App**:
  - Lệnh: `.\gradlew testDebugUnitTest` tại thư mục `android_app/`.
  - Kết quả: **BUILD SUCCESSFUL in 1m 15s** (Mã thoát: 0). Chạy thành công 5/5 unit & Robolectric tests (`ExampleRobolectricTest`: 3 tests, `ExampleUnitTest`: 1 test, `GreetingScreenshotTest`: 1 test) với tỷ lệ thành công 100%.

---

## 2. LOGIC CHAIN (CHUỖI LẬP LUẬN TỪ QUAN SÁT ĐẾN KẾT LUẬN)

1. **Về Tính Xác Thực Của Dẫn Chứng (Non-Hallucination & Empirical Evidence)**:
   - Toàn bộ 39 dòng đối soát trong Bảng 2.2 của `AUDIT_REPORT.md` đều tương ứng 1:1 với các hàm `export async function` thật trong 24 tệp `route.ts` hoặc các annotations Retrofit trong `GradeApiService.kt`. Không có endpoint nào bị đặt tên bừa bãi hay suy đoán vô căn cứ.
   - Các trích dẫn số dòng code, tên hàm, tên biến và cấu trúc DTO JSON ở cả 2 phía Kotlin và Next.js/Prisma đều khớp chính xác từng ký tự với mã nguồn đang nằm trên ổ đĩa.
2. **Về Tiêu Chí Liêm Chính Theo Chế Độ `demo` (Integrity Forensics)**:
   - *Không có Hardcoded Test Results*: Các bộ kiểm thử của dự án thực thi thật qua Robolectric và TypeScript compiler, không có hàm test nào so sánh với kết quả ảo được gắn sẵn.
   - *Không có Facade Implementation Được Đóng Gói Nhập Nhèm*: Báo cáo không hề che giấu các phần code mẫu/mock mà ngược lại còn chủ động bóc tách và vạch trần các đoạn dead code, mock static (như `generateSimulatedAnalysis` không được gọi, hay `StudentHomeScreen` hardcode 5 từ khó) để đưa vào danh mục cần cải tiến.
   - *Không có Bịa Đặt Kết Quả / File Rác*: Không tìm thấy bất kỳ file log tiền chế nào được sinh ra để ngụy tạo kết quả kiểm tra.
   - *Không Che Giấu Lỗi*: Báo cáo đã phơi bày trực diện các lỗi nghiêm trọng nhất của hệ thống: P0 Lỗ hổng Plaintext Password, P0 Zero-Token Auth, P0 Lỗi đồng bộ xóa bài thi, P1 Lệch Payload thể loại, P1 Vi phạm kích thước điểm chạm 16dp.
3. **Về Mức Độ Hoàn Thiện Các Yêu Cầu (Acceptance Criteria Compliance)**:
   - **R1 (API Parity Matrix)**: Đầy đủ 39 endpoints, phân loại 4 trạng thái, đầy đủ schema request/response và dòng code 2 phía.
   - **R2 (Business Logic Parity)**: Đánh giá tường tận cả 3 luồng tính năng: Chấm điểm AI (YOLO + Gemini + Barem điểm), Quản lý học sinh/phổ điểm/lịch sử, và Luyện viết chính tả.
   - **R3 (UI/UX Parity)**: So sánh thấu đáo từ hệ màu cốt lõi, bảng màu 9 lỗi sư phạm, typography font HP001, loading/feedback cho đến touch target size và tàn dư chuỗi kỹ thuật trên UI.
   - **R4.1 (Feature Parity Matrix)**: Bao phủ 7 màn hình chính với 28 tính năng cụ thể.
   - **R4.2 (Gap Analysis)**: Phân tầng khoa học thành 3 cấp độ P0 (Blocker), P1 (High), P2 (Medium).
   - **R4.3 (Actionable Roadmap)**: Chia làm 3 Phase rõ ràng, mỗi Phase đều có mục tiêu, hạng mục chi tiết và tiêu chí nghiệm thu độc lập.

---

## 3. CAVEATS (GIỚI HẠN & GIẢ ĐỊNH KIỂM TOÁN)

1. **Phạm vi kiểm thử runtime**: Quá trình kiểm toán tập trung xác thực tính toàn vẹn của mã nguồn, các giao thức mạng, schema CSDL và kiểm thử đơn vị tự động (Host Unit Tests & Robolectric). Kiểm toán viên chưa tiến hành đo đạc FPS bằng công cụ đo phần cứng (như Android GPU Profiler) trên một thiết bị Android vật lý thực tế dưới các điều kiện mạng 3G/4G chập chờn.
2. **Khuyến nghị gia cố kỹ thuật từ Adversarial Reviewers**:
   - *Hitbox Overlap (P3)*: Khi mở rộng vùng chạm Bounding Box lên chuẩn 48dp, cần áp dụng thuật toán tìm tâm gần nhất (Nearest Centroid) để tránh xung đột sự kiện chạm giữa các từ viết tay liền kề.
   - *Room DB Migration (P2)*: Bắt buộc định nghĩa script `MIGRATION_1_2` tường minh khi bổ sung `ClassEntity` và `StudentEntity` để tránh việc `fallbackToDestructiveMigration()` xóa sạch bảng `grade_records`.
   - *AuthInterceptor Graceful Fallback (P1)*: Cấu hình `AuthInterceptor` ở chế độ không chặn (non-blocking) cho đến khi Web BFF hoàn thiện middleware JWT.

---

## 4. CONCLUSION (KẾT LUẬN & PHÁN QUYẾT KIỂM TOÁN)

Báo cáo `AUDIT_REPORT.md` tại thư mục `.agents/teamwork/orchestrator_1/` là một sản phẩm trí tuệ đạt chuẩn mực kiểm toán cao nhất:
- **Tính phi ảo giác (Non-hallucination)**: 100% bằng chứng và số liệu được đối chiếu thực nghiệm trùng khớp tuyệt đối với codebase.
- **Tính liêm chính sư phạm & kỹ thuật**: Không ngụy tạo kết quả, không che đậy khuyết điểm, chỉ rõ cả những ưu thế cạnh tranh vượt trội lẫn các lỗ hổng rủi ro cao.
- **Tuân thủ toàn diện**: Đáp ứng 100% các tiêu chí chấp thuận (R1, R2, R3, R4.1, R4.2, R4.3) theo đúng cam kết trong `ORIGINAL_REQUEST.md`.

### PHÁN QUYẾT CHÍNH THỨC:
```
================================================================================
                    FORENSIC AUDIT FINAL VERDICT
================================================================================
                                VERDICT: CLEAN
================================================================================
Báo cáo AUDIT_REPORT.md hoàn toàn trong sạch, trung thực, chính xác tuyệt đối
và được PHÊ DUYỆT BÀN GIAO CHÍNH THỨC cho người dùng.
================================================================================
```

---

## 5. VERIFICATION METHOD (HƯỚNG DẪN TÁI KIỂM CHỨNG ĐỘC LẬP)

Bất kỳ kiểm toán viên hoặc kỹ sư độc lập nào cũng có thể kiểm chứng lại toàn bộ các phát hiện trên thông qua các câu lệnh chuẩn sau:

1. **Kiểm tra 38 HTTP Handlers trên Web BFF**:
   ```powershell
   Get-ChildItem -Path "app\api" -Filter "route.ts" -Recurse | Select-String -Pattern "export async function (GET|POST|PATCH|DELETE)"
   ```
2. **Kiểm tra 9 Retrofit Endpoints trên Android**:
   ```powershell
   Select-String -Path "android_app\app\src\main\java\com\example\data\api\GradeApiService.kt" -Pattern "@(GET|POST|PATCH|DELETE)"
   ```
3. **Kiểm tra Lỗi Rò Rỉ Mật Khẩu tại `GET /api/users`**:
   ```powershell
   Get-Content "app\api\users\route.ts" | Select-String -Pattern "findMany" -Context 0, 15
   ```
4. **Kiểm tra Lỗi Đồng Bộ Xóa Bài (P0 Sync Bug)**:
   ```powershell
   Select-String -Path "android_app\app\src\main\java\com\example\data\repository\GradeRepository.kt" -Pattern "deleteRecordById"
   Select-String -Path "android_app\app\src\main\java\com\example\data\repository\GradeRepository.kt" -Pattern "key !in existingKeys"
   ```
5. **Kiểm tra Thiếu Cử Chỉ Thu Phóng `detectTransformGestures`**:
   ```powershell
   Select-String -Path "android_app\app\src\main\java\com\example\ui\components\PhotoBoundingBoxViewer.kt" -Pattern "detectTransformGestures"
   ```
   *(Kết quả: Không có kết quả nào)*.
6. **Chạy Kiểm Thử Biên Dịch Mã Nguồn**:
   - Web TypeScript check: `npx tsc --noEmit`
   - Android Unit Tests: `cd android_app; .\gradlew testDebugUnitTest`
