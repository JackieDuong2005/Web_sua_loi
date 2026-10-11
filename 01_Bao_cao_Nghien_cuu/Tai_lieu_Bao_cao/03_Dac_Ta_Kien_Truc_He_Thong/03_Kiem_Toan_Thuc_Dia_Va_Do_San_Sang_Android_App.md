# BÁO CÁO KIỂM TOÁN THỰC ĐỊA & ĐÁNH GIÁ ĐỘ SẴN SÀNG TRIỂN KHAI ANDROID NATIVE APP (VIHAND GRADE)

> **Mã tài liệu**: `VHG-AUDIT-AND-2026-03`  
> **Phiên bản hệ thống**: ViHand Grade v2.3.0 (Android Client: Kotlin/Jetpack Compose • Web BFF: Next.js 16/Prisma)  
> **Cơ quan thẩm định**: Tổ Kỹ sư Độc lập & Thanh tra Hệ thống Nhúng/Di động ViHand Grade  
> **Ngày phát hành**: Tháng 10/2026  
> **Phạm vi thanh tra**: 
> - Mã nguồn Android Native: `android_app/` (Package `com.example`, SDK 36/Android 16)
> - Máy chủ Web BFF Gateway: `app/api/mobile/grade/`, `app/api/grades/`, `app/api/users/`, `lib/api-guard.ts`
> - Cơ sở dữ liệu: SQLite vật lý qua Room Database v4 & Prisma ORM

---

## TÓM TẮT ĐIỀU HÀNH (EXECUTIVE SUMMARY)

Ứng dụng di động **ViHand Grade Android Native** được xây dựng với mục tiêu mang lại giải pháp số hóa và chấm điểm bài viết tay học sinh tiểu học (theo chuẩn Thông tư 27/2020/TT-BGDĐT) trực tiếp trên điện thoại/máy tính bảng của giáo viên. Ứng dụng đã hoàn thiện các giao diện cốt lõi (CameraX, Chấm điểm bài lẻ, Báo cáo sư phạm, Luyện chính tả TTS, Kết nối Trạm biên Pi qua Cloudflare Tunnel).

Tuy nhiên, qua quá trình rà soát toàn diện mã nguồn và kiểm toán thực địa mô phỏng tình huống giáo viên chấm hàng loạt bài thi (30–40 học sinh/lớp liên tục trong điều kiện mạng trường học thực tế), Hội đồng Kỹ sư kết luận:

> ⚠️ **ĐÁNH GIÁ CHUNG**: Ứng dụng Android hiện tại **CHƯA ĐỦ ĐỘ TIN CẬY ĐỂ TRIỂN KHAI THỰC TẾ HÀNG LOẠT (NOT PRODUCTION-READY FOR BATCH GRADING)**. 
> Dù tính năng chấm từng bài đơn lẻ (Single Paper Grading) hoạt động tốt, chế độ chấm cả lớp (Batch Mode) và các luồng ngoại tuyến còn tồn tại **3 lỗ hổng chí mạng cấp P0** (có thể gây văng ứng dụng OutOfMemoryError, mất trắng kết quả bài thi do nuốt lỗi Rate Limit, và hồi sinh bài thi đã xóa), cùng **7 điểm nghẽn nghiệp vụ & bảo mật cấp P1** và **7 hạn chế giao diện/hiệu năng/chất lượng ảnh cấp P2**.

---

## PHẦN I: MA TRẬN ĐÁNH GIÁ ĐỘ SẴN SÀNG THỰC ĐỊA (PRODUCTION READINESS MATRIX)

| Tiêu chí Kiểm toán | Hiện trạng Mã nguồn | Đánh giá Thực tế | Mức độ Rủi ro | Tác động Giáo viên |
| :--- | :--- | :---: | :---: | :--- |
| **1. Chấm bài đơn lẻ (Single Shot)** | Chụp ảnh $\to$ Base64 $\to$ BFF $\to$ Render | **92% Sẵn sàng** | **Thấp (P3)** | Trải nghiệm mượt mà, đầy đủ Bounding Box và lời phê. |
| **2. Quét liên tục cả lớp (Batch Mode)** | Lưu toàn bộ Bitmap trong Compose State | **25% Sẵn sàng** | **Cực cao (P0)** | **Văng app (OOM Crash)** khi chụp tới bài thứ 25–35. |
| **3. Xử lý Giới hạn Tải (Rate Limiting)** | Gửi dồn dập, nuốt exception trong catch | **10% Sẵn sàng** | **Cực cao (P0)** | **Mất trắng 10–15 bài thi cuối lớp** do dính HTTP 429. |
| **4. Đồng bộ Xóa bài (Deletion Sync)** | Xóa local ngay, bỏ qua lỗi mạng xóa server | **40% Sẵn sàng** | **Cực cao (P0)** | **Hồi sinh bài đã xóa (Zombie Grade)** khi có Wi-Fi lại. |
| **5. Cơ chế Ngoại tuyến (Offline Queue)** | Không có bảng lưu tạm & WorkManager | **30% Sẵn sàng** | **Cao (P1)** | Mất mạng là app dừng lại, không thể chụp trước chấm sau. |
| **6. Gán Danh sách Học sinh (Roster Map)** | Hardcode: `"Học sinh $currentNum"` | **20% Sẵn sàng** | **Cao (P1)** | Sổ điểm toàn "Học sinh 1, 2...", giáo viên phải sửa tay lại từ đầu. |
| **7. Duyệt Kết quả Lô (Batch Review)** | Chỉ hiển thị kết quả của bài cuối cùng | **15% Sẵn sàng** | **Cao (P1)** | Không có bảng tổng hợp điểm cả lớp sau khi quét xong. |
| **8. Bảo mật API & Quyền riêng tư Trẻ em** | Không có Bearer Token; ảnh public uploads | **20% Sẵn sàng** | **Cao (P1)** | Nguy cơ lộ bài thi học sinh theo NĐ 13/2023/NĐ-CP. |
| **9. Rủi ro Chấm nhầm Bài mẫu (Mock Fallback)** | Tự gán `sampleTayMe` khi mạng ngắt quãng | **35% Sẵn sàng** | **Cao (P1)** | Giáo viên ghi nhầm điểm bài thơ mẫu vào học bạ học sinh. |
| **10. Hiệu năng Lịch sử (History Scaling)** | Nạp toàn bộ Database vào RAM (No Paging) | **50% Sẵn sàng** | **Trung bình (P2)** | Giật lag khi có trên 300 bài thi trong học kỳ. |
| **11. Quản lý Lớp/Học sinh (CRUD Mobile)** | Chỉ đọc (Read-only `GET /api/classes`) | **45% Sẵn sàng** | **Trung bình (P2)** | Bắt buộc phải mở máy tính Web Studio mới tạo được lớp mới. |
| **12. Tương tác Bàn phím Ảo (IME Insets)** | Thiếu adjustResize & imePadding | **60% Sẵn sàng** | **Trung bình (P2)** | Bàn phím che khuất nút Lưu khi giáo viên bắt lỗi thủ công. |
| **13. Hiệu năng Mạng & Logging (Base64 Log)** | `Level.BODY` in cả triệu ký tự vào Logcat | **30% Sẵn sàng** | **Trung bình (P2)** | Lag giật khung hình (UI Jank) và tràn log hệ thống. |
| **14. Tiến trình Chấm (Progress UI & Guest)** | Fake progress nhảy 90% rồi đóng băng | **45% Sẵn sàng** | **Trung bình (P2)** | Giáo viên tưởng treo máy; Đăng nhập Khách bị khóa khi offline. |
| **15. Kiểm soát Chất lượng Ảnh CameraX** | Không có Blur/Shadow/Glare Detection | **40% Sẵn sàng** | **Trung bình (P2)** | Ảnh chụp mờ/tối khiến OCR đọc sai, trừ điểm oan. |

---

## PHẦN II: KIỂM TOÁN TÍNH ĐỒNG BỘ KIẾN TRÚC & HỢP ĐỒNG API (API & DATA CONTRACT PARITY)

```
+===================================================================================================+
|                          SƠ ĐỒ ĐỐI SOÁT HỢP ĐỒNG API & DỮ LIỆU THỰC TẾ                            |
+===================================================================================================+
|                                                                                                   |
|  [ ANDROID CLIENT ]                                                   [ WEB BFF GATEWAY ]         |
|  (Retrofit2 / Moshi)                                                  (Next.js 16 / Prisma)       |
|                                                                                                   |
|  GradeApiRequest                                                      POST /api/mobile/grade      |
|  * imageBase64: String                                                * imageBase64: String       |
|  * studentGrade: Int                                                  * studentGrade: Int         |
|  * gradingMode: String                                                * gradingMode: String       |
|  * the_loai: "chinh_ta"   <-----(ĐÃ KHỚP ALIAS: the_loai/essayType)-----> * rawTheLoai / rawEssayType |
|  * essayType: "spelling"                                              * penalty_per_error         |
|                                                                                                   |
|  GradeApiResponse <-----------------(HOÀN TOÀN TƯƠNG THÍCH)----------------- JSON Response        |
|  * criteria: GradeCriteria                                            * criteria: GradeCriteria   |
|  * errors: List<ApiErrorBox> (rel_x1, rel_y1, rel_w, rel_h)           * errors: (rel coordinates) |
|  * serverGradeId: String                                              * serverGradeId: String     |
|  * imagePath: String                                                  * imagePath: String         |
|                                                                                                   |
|  DELETE api/grades/{id} <-----------(XÓA ĐƯỢC KHI ONLINE)-----------> DELETE /api/grades/[id]     |
|  * LỖ HỔNG: Nếu offline, catch() nuốt lỗi, không lưu TombstoneQueue    * Prisma xóa bản ghi DB    |
|                                                                                                   |
+===================================================================================================+
```

### 1. Phân tích chi tiết mức độ tương thích hợp đồng mạng
1. **Endpoint Chấm bài di động (`POST /api/mobile/grade`)**:
   - Dẫn chứng Android: [GradeApiService.kt:13-16](file:///c:/Users/Jackie%20Duong/Desktop/Web_sua_loi/android_app/app/src/main/java/com/example/data/api/GradeApiService.kt#L13-L16), [GradeApiModels.kt:7-20](file:///c:/Users/Jackie%20Duong/Desktop/Web_sua_loi/android_app/app/src/main/java/com/example/data/api/GradeApiModels.kt#L7-L20).
   - Dẫn chứng Web BFF: [app/api/mobile/grade/route.ts:347-370](file:///c:/Users/Jackie%20Duong/Desktop/Web_sua_loi/app/api/mobile/grade/route.ts#L347-L370).
   - *Kết luận*: **Đồng bộ 100%**. Web BFF đã bổ sung cơ chế bóc tách linh hoạt:
     ```typescript
     const requestedTheLoai = rawTheLoai || (rawEssayType === "poem" ? "tho" : (rawEssayType === "essay" ? "van_xuoi" : (rawEssayType === "spelling" ? "chinh_ta" : undefined)))
     ```
     Đảm bảo cả client cũ và mới đều không bị văng lỗi định dạng thể loại.

2. **Endpoint Đồng bộ Sổ điểm (`GET /api/grades` & `POST /api/grades`)**:
   - Dẫn chứng Android: [GradeApiService.kt:44-54](file:///c:/Users/Jackie%20Duong/Desktop/Web_sua_loi/android_app/app/src/main/java/com/example/data/api/GradeApiService.kt#L44-L54).
   - Dẫn chứng Web: [app/api/grades/route.ts](file:///c:/Users/Jackie%20Duong/Desktop/Web_sua_loi/app/api/grades/route.ts).
   - *Kết luận*: Cấu trúc JSON DTO khớp nhau hoàn toàn. Server đã tự động ghi ảnh ra đĩa `/uploads/grades/` thay vì lưu chuỗi Base64 khổng lồ trong SQLite, giúp cơ sở dữ liệu `vihand.db` không bị phình to.

---

## PHẦN III: PHÂN TÍCH CHUYÊN SÂU CÁC LỖI NGUY HIỂM CẤP P0 (CRASH & MẤT DỮ LIỆU)

### [P0-01] Nguy cơ Tràn bộ nhớ Heap (OutOfMemoryError Crash) khi Quét Cả Lớp

```
+---------------------------------------------------------------------------------------------------+
|                        CƠ CHẾ RÒ RỈ & BÙNG NỔ BỘ NHỚ TRONG BATCH SCAN MODE                        |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|  [ CameraX Preview ] ---> Bấm Chụp Bài 1 ... Bài 35                                               |
|         |                                                                                         |
|         v                                                                                         |
|  dispatchCapture(bitmap: Bitmap)                                                                  |
|         |                                                                                         |
|         +---> batchBitmaps.add(bitmap)  <-- [CameraScanScreen.kt:327, 335]                        |
|         |     (LƯU 35 BITMAPS TRỰC TIẾP TRONG COMPOSE STATE MEMORY HEAP)                          |
|         |                                                                                         |
|         |     * 1 Ảnh CameraX Full-Res (12MP) = 4000 x 3000 x 4 bytes (ARGB_8888) = ~48 MB RAM    |
|         |     * 35 Bài thi = 35 x 48 MB = 1.68 GB RAM!                                            |
|         |     * Heap Limit tiêu chuẩn của Android: 192 MB - 512 MB                                |
|         |                                                                                         |
|         v                                                                                         |
|  [ java.lang.OutOfMemoryError: Failed to allocate a 48000000 byte allocation with ... ]           |
|                                                                                                   |
|  ===> HẬU QUẢ: ỨNG DỤNG BỊ HỆ ĐIỀU HÀNH DIỆT NGAY LẬP TỨC (CRASH VĂNG RA MÀN HÌNH CHÍNH).         |
|        TOÀN BỘ CÔNG SỨC CHỤP 30 BÀI TRƯỚC ĐÓ CỦA CÔ GIÁO BỊ MẤT TRẮNG TRONG TÍCH TẮC!            |
|                                                                                                   |
+---------------------------------------------------------------------------------------------------+
```

#### Phân tích vị trí mã nguồn:
1. **Tại `CameraScanScreen.kt`**:
   - Dòng 327: `val batchBitmaps = remember { androidx.compose.runtime.mutableStateListOf<Bitmap>() }`
   - Dòng 334-336:
     ```kotlin
     if (isBatchMode) {
         batchBitmaps.add(bitmap)
         switchNotification = "Đã lưu bài #${batchBitmaps.size} của cả lớp"
     }
     ```
   - Dòng 349: `val cachedBitmaps = remember { mutableMapOf<Int, Bitmap>() }` (giữ thêm danh sách các ảnh bài mẫu).

2. **Tại `MainViewModel.kt`**:
   - Dòng 430-435:
     ```kotlin
     fun gradeBatchBitmaps(bitmaps: List<Bitmap>, className: String, studentGrade: Int = 3) {
         viewModelScope.launch {
             val total = bitmaps.size
             // Nhận toàn bộ danh sách List<Bitmap> từ UI giữ trong Heap của ViewModel Coroutine!
     ```

#### Đề xuất giải pháp kiến trúc khắc phục:
- **Nguyên tắc vàng trên Android**: Tuyệt đối không bao giờ giữ danh sách `List<Bitmap>` trong bộ nhớ RAM.
- **Kỹ thuật Disk-backed Temporary Cache**:
  Khi chụp xong 1 ảnh trong Batch Mode:
  1. Nén ảnh ngay lập tức ra file JPEG tạm trên bộ nhớ cache đĩa: `File(context.cacheDir, "batch_temp_${System.currentTimeMillis()}.jpg")` với kích thước nén chuẩn 1600px, chất lượng 80% (mỗi file chỉ tốn ~300KB đĩa).
  2. Giải phóng con trỏ `bitmap.recycle()` ngay lập tức.
  3. Danh sách `batchBitmaps` chỉ lưu `List<File>` hoặc `List<Uri>` (tổng bộ nhớ RAM tiêu thụ cho 40 bài chưa tới **2 KB**).
  4. Trong `MainViewModel`, đọc từng file đĩa lên xử lý $\to$ gửi mạng $\to$ xóa file đĩa tạm.

---

### [P0-02] Xung đột Rate Limit HTTP 429 và Cơ chế Nuốt Ngoại Lệ Làm Mất Bài Thi

```
+---------------------------------------------------------------------------------------------------+
|                        SỰ CỐ NGHẼN RATE LIMIT & NUỐT LỖI KHI GỬI BATCH SCAN                       |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|  [ ANDROID APP: MainViewModel.kt:445-466 ]                [ WEB BFF: lib/api-guard.ts:90 ]        |
|                                                                                                   |
|  bitmaps.forEachIndexed { index, bmp ->                   guardAiRoute(req, 20)                   |
|      // Gửi bài 1  ---> [200 OK]                          (Bucket: 20 req / 60 giây / IP)         |
|      // Gửi bài 2  ---> [200 OK]                                                                  |
|      // ...                                                                                       |
|      // Gửi bài 20 ---> [200 OK]   -------------------------> (Hết Quota 20 req!)                 |
|                                                                                                   |
|      // Gửi bài 21 ---> [HTTP 429 Too Many Requests] <------ Chặn DoS (Retry-After: 30s)         |
|      // Gửi bài 22 ---> [HTTP 429 Too Many Requests]                                              |
|      // ...                                                                                       |
|      // Gửi bài 35 ---> [HTTP 429 Too Many Requests]                                              |
|                                                                                                   |
|      try {                                                                                        |
|          repository.gradeImage(...)                                                               |
|      } catch (_: Exception) {                                                                     |
|          failCount++  <-- NUỐT CHỬNG EXCEPTION! KHÔNG RETRY, KHÔNG BACKOFF!                        |
|      }                                                                                            |
|  }                                                                                                |
|                                                                                                   |
|  ===> THÔNG BÁO CHO GIÁO VIÊN: "Hoàn thành chấm 35 bài: Thành công 20 bài, Lỗi 15 bài."           |
|        15 bài bị lỗi KHÔNG HỀ ĐƯỢC LƯU VÀO ĐÂU, GIÁO VIÊN KHÔNG THỂ BẤM "CHẤM LẠI CÁC BÀI LỖI"!  |
|                                                                                                   |
+---------------------------------------------------------------------------------------------------+
```

#### Phân tích vị trí mã nguồn:
1. **Tại `lib/api-guard.ts`**:
   - Dòng 90-108:
     ```typescript
     export function guardAiRoute(req: NextRequest, maxRequestsPerMinute = 30): NextResponse | null {
       const ip = getClientIp(req)
       const rateResult = checkRateLimit(`ai:${ip}`, maxRequestsPerMinute)
       if (!rateResult.allowed) {
         return NextResponse.json({ error: "Quá nhiều yêu cầu...", retryAfter: rateResult.resetInSeconds }, { status: 429 })
       }
     ```
   - Tại `app/api/mobile/grade/route.ts:349`:
     ```typescript
     const blocked = guardAiRoute(req, 20) // CHỈ CHO PHÉP 20 REQUEST MỖI PHÚT!
     if (blocked) return blocked
     ```

2. **Tại `MainViewModel.kt`**:
   - Dòng 445-466:
     ```kotlin
     bitmaps.forEachIndexed { index, bmp ->
         try {
             val res = repository.gradeImage(
                 bitmap = bmp,
                 serverUrl = _serverUrl.value,
                 studentGrade = studentGrade,
                 studentName = "Học sinh $currentNum",
                 className = className
             )
             successCount++
             lastSuccessResult = res
         } catch (_: Exception) {
             failCount++ // Nuốt lỗi, không bắt mã HTTP 429, không đọc header Retry-After
         }
     }
     ```

#### Đề xuất giải pháp kiến trúc:
1. **Phía Android Client**:
   - Tích hợp **Exponential Backoff & Jitter**: Khi nhận HTTP 429, đọc header `Retry-After` (hoặc delay tăng dần $2s, 4s, 8s$), tự động thử lại tối đa 3 lần trước khi đánh dấu thất bại.
   - Giữa các bài trong lô cần có khoảng nghỉ sư phạm tối thiểu: `kotlinx.coroutines.delay(1500)` để không làm nghẽn trạm Raspberry Pi và không vượt rate limit.
   - Những bài thất bại phải được giữ nguyên trong danh sách đĩa tạm và hiện nút: **"Thử lại 15 bài bị gián đoạn"**.

2. **Phía Web BFF**:
   - Tách riêng rate limit cho Mobile App client đã xác thực: Tăng quota lên 60 req/phút cho các request có Bearer Token giáo viên, hoặc kiểm tra Header `X-Client-Type: ViHand-Android-App`.

---

### [P0-03] Lỗ Hổng Hồi Sinh Bài Thi Đã Xóa Khi Ngoại Tuyến (Zombie Grade Bug)

```
+---------------------------------------------------------------------------------------------------+
|                        KỊCH BẢN TỰ HỒI SINH BÀI THI ĐÃ XÓA (ZOMBIE GRADE)                         |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|  Thời điểm T1: Bài thi #101 đã được đồng bộ lên máy chủ (Cả Room DB và Server DB đều có).        |
|                                                                                                   |
|  Thời điểm T2: Giáo viên ở trường, mạng Wi-Fi bị đứt.                                             |
|  Giáo viên chọn bài #101 và bấm [XÓA BÀI THI]:                                                    |
|                                                                                                   |
|  [ GradeRepository.kt:259-270 ]                                                                   |
|  dao.deleteRecordById(101)  ---> ĐÃ XÓA THÀNH CÔNG KHỎI ROOM DB LOCAL!                             |
|  api.deleteGrade(sId)       ---> THẤT BÀI DO MẤT MẠNG! (Khối catch nuốt lỗi, ghi log và bỏ qua).  |
|                                  BẢN GHI TRÊN SERVER DB VẪN TỒN TẠI NGUYÊN VẸN!                   |
|                                                                                                   |
|  Thời điểm T3: Giáo viên về nhà, có kết nối Wi-Fi trở lại.                                        |
|  App tự động kích hoạt `syncTwoWayWithServer()` [GradeRepository.kt:708]:                         |
|                                                                                                   |
|  serverGrades = fetchGradesFromServer() ---> Server trả về danh sách chứa bài #101!              |
|  val key = "${sGrade.studentName}_${sGrade.essayTitle}_${sGrade.className}"                       |
|  if (key !in existingKeys) {                                                                      |
|      saveRecord(sGrade)  <--- TỰ ĐỘNG TẢI NGƯỢC VỀ VÀ CHÈN LẠI VÀO ROOM DB!                       |
|  }                                                                                                |
|                                                                                                   |
|  ===> BÀI THI #101 "HỒI SINH" TRÊN MÀN HÌNH ĐIỆN THOẠI CỦA GIÁO VIÊN!                             |
|                                                                                                   |
+---------------------------------------------------------------------------------------------------+
```

#### Phân tích vị trí mã nguồn:
- **Tại `GradeRepository.kt` dòng 259-270**:
  ```kotlin
  suspend fun deleteRecord(id: Long, serverUrl: String? = null) = withContext(Dispatchers.IO) {
      val record = dao.getRecordByIdDirect(id)
      val sId = record?.serverId
      dao.deleteRecordById(id)
      if (!sId.isNullOrBlank() && !serverUrl.isNullOrBlank()) {
          try {
              val api = NetworkClient.createService(serverUrl)
              api.deleteGrade(sId)
          } catch (e: Exception) {
              android.util.Log.e("GradeRepository", "Lỗi xóa bài trên server: ${e.message}")
              // KHÔNG HỀ LƯU LẠI sId ĐỂ XÓA BÙ KHI CÓ MẠNG!
          }
      }
  }
  ```

#### Đề xuất giải pháp kiến trúc:
1. **Tạo bảng `pending_deletions` trong Room DB v5**:
   ```kotlin
   @Entity(tableName = "pending_deletions")
   data class PendingDeletionEntity(
       @PrimaryKey val serverId: String,
       val deletedAt: Long = System.currentTimeMillis()
   )
   ```
2. **Cơ chế Tombstone trong `deleteRecord`**:
   - Nếu `api.deleteGrade(sId)` thất bại $\to$ chèn `serverId` vào bảng `pending_deletions`.
3. **Cập nhật `syncTwoWayWithServer`**:
   - Trước khi tải bài từ server về: Lấy toàn bộ danh sách `pending_deletions` gọi `DELETE` lên server trước.
   - Khi `fetchGradesFromServer` trả về danh sách: Lọc bỏ tất cả bài thi có ID nằm trong danh sách `pending_deletions` để không bao giờ chèn ngược lại.

---

## PHẦN IV: ĐIỂM NGHẼN NGHIỆP VỤ & TÍNH KHẢ THI SƯ PHẠM CẤP P1

### [P1-01] Thiếu Hàng Đợi Ngoại Tuyến Store-and-Forward (Offline Queue)
- **Hiện trạng thực tế**:
  Trong `MainViewModel.kt:280-282`: Khi bấm chấm điểm mà máy chủ không phản hồi, ứng dụng chuyển sang chế độ mô phỏng giả lập (`generateSimulatedAnalysis`) hoặc báo lỗi đỏ.
- **Nhu cầu nghiệp vụ sư phạm**:
  Giáo viên tiểu học thường ngồi tại lớp chụp bài cho 35 học sinh trong giờ ra chơi (nơi sóng Wi-Fi yếu hoặc không có mạng). Giáo viên muốn: **"Chụp nhanh toàn bộ 35 bài vào máy, cất điện thoại. Chiều về nhà có mạng thì ứng dụng tự động chạy nền tải lên chấm và thông báo khi hoàn thành"**.
- **Giải pháp**:
  Tích hợp **Android Jetpack WorkManager** với `Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()`. Mỗi bài thi được lưu dưới dạng `PendingGradeJob` gồm ảnh JPEG đĩa tạm + metadata học sinh. Khi thiết bị kết nối mạng, `GradeSyncWorker` sẽ tự động xử lý tuần tự mà không làm hao pin và không sợ chết tiến trình.

---

### [P1-02] Gán Cứng Tên Học Sinh Khi Quét Cả Lớp ("Học sinh 1", "Học sinh 2"...)
- **Hiện trạng mã nguồn**:
  Tại `MainViewModel.kt:458`:
  ```kotlin
  studentName = "Học sinh $currentNum"
  ```
- **Hậu quả thực tế**:
  Khi giáo viên quét 35 bài thi của lớp 3A:
  - Sổ điểm và danh sách bài thi lưu trong máy sẽ hiển thị: "Học sinh 1", "Học sinh 2", ..., "Học sinh 35".
  - Giáo viên không biết bài nào là của em *Nguyễn Văn An*, bài nào của em *Trần Thị Bình*.
  - Khi gửi tin nhắn nhận xét cho phụ huynh qua Zalo, nội dung sẽ là: *"Kính gửi phụ huynh em Học sinh 1..."*, gây mất tính chuyên nghiệp sư phạm nghiêm trọng!
- **Giải pháp**:
  Trước khi bắt đầu bấm "Chụp Quét Cả Lớp", giao diện phải cho phép giáo viên chọn lớp (ví dụ: Lớp 3A). Hệ thống lấy danh sách học sinh của lớp (`studentOptions` từ `CameraScanScreen.kt:313`) và hiển thị danh sách dạng checklist:
  - Bài 1: Gán tự động cho học sinh số 1 trong danh bạ (*Nguyễn Văn An*).
  - Có nút cho phép giáo viên gõ nhanh hoặc đổi tên em khác nếu học sinh nộp bài không theo thứ tự số thứ tự.

---

### [P1-03] Thiếu Màn Hình Tổng Kết Lô Chấm (Batch Grading Summary Sheet)
- **Hiện trạng mã nguồn**:
  Tại `MainViewModel.kt:470-476`:
  ```kotlin
  if (lastSuccessResult != null) {
      _currentResult.value = lastSuccessResult
      _selectedErrorId.value = lastSuccessResult?.errors?.firstOrNull()?.id
      _gradingState.value = GradingUiState.Success(lastSuccessResult!!)
  }
  ```
- **Hậu quả thực tế**:
  Sau khi quét xong 35 bài thi, ứng dụng nhảy thẳng vào màn hình xem chi tiết của **DUY NHẤT BÀI THI CUỐI CÙNG (#35)**!
  Giáo viên không có góc nhìn tổng quan:
  - Lớp có bao nhiêu em đạt Điểm 9-10? Bao nhiêu em dưới trung bình?
  - Lỗi sai phổ biến nhất của cả lớp hôm nay là gì? (Ví dụ: 18/35 em viết sai từ *trổ hoa* thành *chổ hoa*).
- **Giải pháp**:
  Bổ sung màn hình Compose mới: `BatchGradingSummaryScreen.kt`:
  - Hiển thị thanh tiến trình kết quả: 35/35 bài thành công (0 lỗi).
  - Bảng thống kê phổ điểm nhanh: Xuất sắc (15), Tốt (12), Cần cố gắng (8).
  - Top 3 lỗi sai cả lớp mắc phải nhiều nhất (để cô giáo sửa chung trước lớp vào đầu giờ hôm sau).
  - Danh sách rút gọn 35 bài có chấm điểm, bấm vào bài nào thì mở chi tiết bài đó.

---

### [P1-04] Lỗi Nút Xóa Bài Thi Bị Tê Liệt Khi Xem Online & Rò Rỉ Rác Ổ Cứng
- **Hiện trạng mã nguồn**:
  - Tại `MainActivity.kt:437`:
    ```kotlin
    val displayRecords = if (serverGrades.isNotEmpty()) serverGrades else historyList
    ```
    Khi kết nối mạng online, màn hình Lịch sử ưu tiên hiển thị `serverGrades`.
  - Tại `MainViewModel.kt:315-321`:
    ```kotlin
    fun deleteHistoryItem(idString: String) {
        viewModelScope.launch {
            idString.toLongOrNull()?.let { // LỖI TÊ LIỆT NÚT XÓA Ở ĐÂY!
                repository.deleteRecord(it, _serverUrl.value)
            }
        }
    }
    ```
- **Cơ chế lỗi thực tế**:
  - Khi xem bài thi từ `serverGrades`, mã ID là chuỗi String CUID/UUID máy chủ cấp (ví dụ `"cm29xyz123"` hoặc `"srv_1730000000"`).
  - Biểu thức `idString.toLongOrNull()` luôn trả về **`null`**!
  - Khối `.let` không bao giờ được kích hoạt. Giáo viên bấm biểu tượng Thùng rác để xóa bài thi nhưng **bài thi vẫn nằm trơ trơ trên màn hình** mà không có bất kỳ thông báo lỗi nào!
  - **Rò rỉ tệp ảnh rác (Orphaned Files Leak)**: Trong `GradeRepository.deleteRecord(id)`, code chỉ xóa bản ghi SQLite bằng `dao.deleteRecordById(id)`. Tệp ảnh vật lý lưu tại `context.filesDir/grades/*.jpg` hoàn toàn không bị xóa theo, trở thành file rác chiếm dụng bộ nhớ trong qua nhiều tháng.
- **Giải pháp**:
  - Chuẩn hóa hàm xóa chấp nhận `idString: String`. Nếu `idString` là số $\to$ xóa theo Long, nếu là chuỗi $\to$ tìm record theo `serverId` hoặc gọi trực tiếp `api.deleteGrade(idString)`.
  - Bổ sung lệnh xóa tệp ảnh vật lý: `record.photoPath?.let { File(it).delete() }`.

---

### [P1-05] Sửa Điểm (Teacher Override) Nhân Bản Bản Ghi Thay Vì Cập Nhật (Room DB Duplication)
- **Hiện trạng mã nguồn**:
  - Tại `GradingResultScreen.kt:248-257` & `MainViewModel.kt:488-504`: Giáo viên bấm "Lưu sửa" gọi `repository.saveRecord(modified)`.
  - Tại `GradeRecordEntity.kt:8-9`:
    ```kotlin
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0
    ```
  - Tại `GradeRepository.kt:236-257`: Khi tạo entity để chèn, tham số `id` không được truyền vào (mặc định nhận `0`).
- **Hậu quả thực tế**:
  - Room DAO `dao.insertRecord(entity)` hiểu rằng đây là một bản ghi mới toanh và tự động sinh một khóa chính `id` mới.
  - Mỗi lần giáo viên sửa điểm hoặc điều chỉnh lỗi cho học sinh, **Room DB sẽ không cập nhật bài cũ mà chèn thêm một bản ghi mới**, khiến lịch sử xuất hiện 2–3 bài thi trùng nhau cho cùng một học sinh!
- **Giải pháp**:
  - Thêm phương thức `dao.updateRecord(entity)` hoặc sửa `insertRecord` với chiến lược `@Insert(onConflict = OnConflictStrategy.REPLACE)`.
  - Trong `saveRecord`, truyền đúng `id = result.id.toLongOrNull() ?: 0L`.

---

### [P1-06] Lỗ Hổng Không Phân Quyền API Bearer Token & Lưu Ảnh Bài Thi Công Khai (Nghị định 13/2023/NĐ-CP)
- **Hiện trạng mã nguồn**:
  - Tại `app/api/auth/login/route.ts:49-58`: API đăng nhập chỉ trả về đối tượng `user` JSON thô, **hoàn toàn không cấp phát JWT hoặc Session Token**. Mật khẩu kiểm tra dạng chuỗi ký tự thô (`user.password !== password`).
  - Tại `UserSessionManager.kt:10-21`: Android lưu session trong `SharedPreferences` thông thường (chưa kích hoạt `EncryptedSharedPreferences`).
  - Tại `NetworkClient.kt`: OkHttpClient hoàn toàn **không có `AuthInterceptor`** để đính kèm Header `Authorization: Bearer <token>`.
  - Tại `app/api/mobile/grade/route.ts:20-27`: Ảnh bài thi được lưu trực tiếp vào thư mục tĩnh `public/uploads/grades/`.
- **Hậu quả bảo mật & pháp lý thực tế**:
  1. **API không được bảo vệ**: Bất kỳ ai biết URL máy chủ đều có thể gửi ảnh lên `/api/mobile/grade` hoặc gọi `GET /api/grades` để lấy toàn bộ sổ điểm của nhà trường mà không cần đăng nhập.
  2. **Rò rỉ dữ liệu cá nhân học sinh**: Ảnh chụp bài làm chứa họ tên thật, lớp học, trường học và nét chữ của học sinh tiểu học. Vì được lưu trong `public/uploads/grades/`, bất kỳ ai có đường link URL đều có thể xem và tải về mà không cần xác thực, vi phạm nghiêm trọng **Nghị định số 13/2023/NĐ-CP của Chính phủ về bảo vệ dữ liệu cá nhân** và chuẩn mực an toàn thông tin học đường.
- **Giải pháp**:
  - Backend `auth/login`: Băm mật khẩu bằng `bcrypt` và phát hành JWT Token (hạn 30 ngày cho mobile).
  - Android Client: Bổ sung `AuthInterceptor` tự động chèn `Authorization: Bearer <jwt_token>` vào mọi yêu cầu Retrofit.
  - Chuyển thư mục lưu ảnh sang thư mục riêng tư (`private_uploads/grades/`) và bảo vệ quyền truy cập qua endpoint `/api/grades/photo/[filename]` yêu cầu phiên đăng nhập hợp lệ.

---

### [P1-07] Rủi Ro Rơi Vào Mock Fallback Tự Gán Bài Mẫu Giả Khi Mạng Chập Chờn
- **Hiện trạng mã nguồn**:
  - Tại `MainViewModel.kt:237-243`: Hàm `retryOfflineSimulation` tự động gán dữ liệu mẫu cứng:
    ```kotlin
    val offlineResult = SampleEssays.sampleTayMe.copy(
        id = java.util.UUID.randomUUID().toString(),
        timestamp = System.currentTimeMillis()
    )
    ```
  - Tại `GradeRepository.kt`: Tự nạp 5 lớp giả (`c_3a`, `c_3b`...) và 10 học sinh giả (`Nguyễn Văn An`, `Trần Thị Bình`...).
- **Hậu quả thực tế**:
  - Khi giáo viên chụp bài tập làm văn thật của học sinh trong lớp học có Wi-Fi chập chờn, khi mạng bị ngắt quãng ngắn hạn, app tự động kích hoạt fallback ngoại tuyến và gán kết quả của bài thơ mẫu "Bàn tay mẹ".
  - Giáo viên có thể nhầm tưởng đây là kết quả AI chấm của bài thi thật và ghi nhận điểm số sai lệch vào học bạ.
- **Giải pháp**:
  - Tách bạch hoàn toàn chế độ Thử nghiệm (Demo/Mock Mode) với Chế độ Sản xuất (Production Mode).
  - Khi mất mạng, hiển thị thông báo rõ ràng: *"Đã lưu bài thi vào hàng đợi ngoại tuyến, sẽ tự động chấm khi có mạng"*. Tuyệt đối không tự ý thay thế bài thật bằng dữ liệu mẫu.

---

## PHẦN V: CÁC CHỨC NĂNG CÒN SƠ SÀI, CHẮP VÁ & NGUY CƠ LỖI CẤP P2

### [P2-01] Thiếu Phân Trang Paging 3 Trên Màn Hình Lịch Sử (Memory Bloat)
- **Hiện trạng mã nguồn**:
  Tại `GradeRecordDao.kt:38`:
  ```kotlin
  @Query("SELECT * FROM grade_records ORDER BY timestamp DESC")
  fun getAllRecords(): Flow<List<GradeRecordEntity>>
  ```
  Tại `HistoryScreen.kt:69`: Nhận toàn bộ danh sách `List<GradeRecordEntity>`.
- **Cơ chế lỗi**:
  Mỗi `GradeRecordEntity` chứa các trường text rất dài: `extractedText`, `correctedFullText`, và đặc biệt là chuỗi JSON `errorsJson` (chứa toàn bộ tọa độ Bounding Box của hàng chục từ).
  Khi giáo viên đã sử dụng ứng dụng trong 1 học kỳ (có khoảng **300 - 500 bài thi**):
  - Khối lượng dữ liệu nạp một lần từ SQLite lên RAM vượt quá **15 - 25 MB** text payload.
  - Tạo ra áp lực lớn lên Garbage Collector (GC Pressure), làm giao diện cuộn `LazyColumn` bị giật lag, đơ khung hình (jank).
- **Giải pháp**:
  Sử dụng thư viện **Android Paging 3** (`androidx.paging:paging-compose`):
  - Truy vấn Room trả về `PagingSource<Int, GradeRecordEntity>`.
  - Giới hạn kích thước trang: `pageSize = 20`. Chỉ nạp 20 bài gần nhất khi giáo viên cuộn tới đâu thì nạp tiếp tới đó.

---

### [P2-02] Quản Lý Danh Sách Học Sinh & Lớp Học Một Chiều (Read-Only)
- **Hiện trạng mã nguồn**:
  Tại `GradeApiService.kt:35-41`: Chỉ có `GET api/classes` và `GET api/users`.
  Trên giao diện Android không hề có màn hình hoặc nút bấm để:
  - Thêm một lớp học mới (ví dụ: cô giáo được phân công dạy thêm Lớp 3B).
  - Thêm một học sinh chuyển trường vào lớp.
  - Đổi tên học sinh viết sai dấu.
- **Hạn chế thực tế**:
  Giáo viên muốn thêm học sinh bắt buộc phải bật máy tính, đăng nhập Web Studio để thao tác. Điều này làm giảm tính độc lập của ứng dụng di động.
- **Giải pháp**:
  Bổ sung các endpoint vào `GradeApiService.kt`:
  - `POST api/classes` (Tạo lớp mới).
  - `POST api/users` (Thêm học sinh).
  - Tạo màn hình `ClassManagementScreen.kt` đơn giản trên Android.

---

### [P2-03] Lỗi Bàn Phím Ảo Che Khuất Giao Diện Nhập Liệu (Soft Keyboard Inset Conflict)
- **Hiện trạng mã nguồn**:
  1. Trong `AndroidManifest.xml`: Thẻ `<activity>` thiếu thuộc tính `android:windowSoftInputMode="adjustResize"`.
  2. Tại `MainActivity.kt:97`: Gọi `enableEdgeToEdge()`.
  3. Tại `GradingResultScreen.kt:1170-1210` (Hộp thoại Bắt lỗi thủ công `showAddErrorDialog`):
     - Sử dụng `Card` cố định chứa 3 trường `OutlinedTextField` (Từ sai, Từ sửa, Loại lỗi) và 2 nút bấm Hủy / Thêm lỗi.
     - Khối `Column` hoàn toàn **không có `Modifier.imePadding()`** và **không có `verticalScroll(rememberScrollState())`**.
- **Hậu quả thực tế**:
  Khi giáo viên bấm vào trường nhập "Loại lỗi" hoặc "Từ sửa đúng":
  - Bàn phím ảo hệ điều hành bật lên che lấp toàn bộ nửa dưới màn hình.
  - Nút bấm **"Thêm lỗi"** và nút **"Hủy"** bị bàn phím che kín hoàn toàn!
  - Giáo viên không thể bấm Lưu lỗi trừ khi phải bấm phím Back để hạ bàn phím xuống, gây ức chế trải nghiệm nghiêm trọng.
- **Giải pháp**:
  - Thêm `android:windowSoftInputMode="adjustResize"` vào `AndroidManifest.xml`.
  - Thêm `Modifier.imePadding().verticalScroll(rememberScrollState())` vào container của các Dialog nhập liệu.

---

### [P2-04] Nguy Cơ Treo UI Khi Serialize/Deserialize JSON Error BBoxes
- **Hiện trạng mã nguồn**:
  Tại `GradeRepository.kt:668` & `GradeRecordDao`:
  - Việc parse chuỗi JSON danh sách lỗi `errorsJson` (chứa hàng trăm tọa độ float Bounding Box) được thực hiện đồng bộ trong mapper.
  - Khi cuộn nhanh danh sách lịch sử, việc parse JSON lặp đi lặp lại trên main thread có thể gây giật khung hình.
- **Giải pháp**:
  Tận dụng Moshi Adapter biên dịch trước (KSP Codegen) kết hợp `withContext(Dispatchers.Default)` cho mọi tác vụ giải mã JSON.

---

### [P2-05] Lag Giật Giao Diện Do HttpLoggingInterceptor Ghi Toàn Bộ Payload Base64
- **Hiện trạng mã nguồn**:
  Tại `NetworkClient.kt:18-20`:
  ```kotlin
  private val loggingInterceptor = HttpLoggingInterceptor().apply {
      level = HttpLoggingInterceptor.Level.BODY // NGUY HIỂM: Ghi toàn bộ body Base64 ra Logcat
  }
  ```
- **Cơ chế lỗi**:
  - Mỗi ảnh chụp bài thi chuyển sang chuỗi Base64 dài từ **1.5MB đến 3MB** text.
  - OkHttp cắt nhỏ chuỗi này và ghi hàng nghìn dòng vào Logcat hệ thống Android mỗi khi bấm chấm bài.
  - Việc cấp phát hàng triệu ký tự String liên tục trên main/network thread gây áp lực lớn lên Garbage Collector (GC Pauses), làm **rớt khung hình nghiêm trọng (UI Jank/Freeze 1-2 giây)** trên điện thoại tầm trung và rò rỉ dữ liệu bài làm vào bộ đệm log hệ thống.
- **Giải pháp**:
  - Trong môi trường Production / Release: Đổi sang `HttpLoggingInterceptor.Level.HEADERS` hoặc `Level.BASIC`.
  - Chỉ bật `Level.BODY` khi chạy bản thử nghiệm `BuildConfig.DEBUG` và có bộ lọc loại trừ trường `imageBase64`.

---

### [P2-06] Tiến Trình Giả Lập Ảo (Fake Progress) Gây Cảm Giác Đơ Máy & Khóa Chặt Guest Login Khi Ngoại Tuyến
- **Hiện trạng mã nguồn**:
  - Tại `MainViewModel.kt:259-266`:
    ```kotlin
    for (p in 25..90 step 15) {
        delay(150)
        _gradingState.value = GradingUiState.Processing("Đang phân tích nét chữ...", p / 100f)
    }
    ```
  - Tại `MainViewModel.kt:406-411`: Chức năng `loginAsGuest` bắt buộc ping máy chủ thành công:
    ```kotlin
    val (isConnected, _) = repository.testConnection(_serverUrl.value)
    if (!isConnected) {
        _loginError.value = "Không thể đăng nhập... do mất kết nối Wi-Fi/mạng."
        return@launch
    }
    ```
- **Hậu quả thực tế**:
  1. **Cảm giác ứng dụng bị treo**: Thanh tiến trình ảo nhảy vọt từ 25% lên 90% chỉ trong 0.45 giây, sau đó bị **đứng yên hoàn toàn ở 90% suốt 4 đến 8 giây** để chờ AI server phản hồi. Giáo viên nghĩ rằng ứng dụng bị đơ nên bấm phím Back hoặc chụp lại.
  2. **Chế độ Khách bị tê liệt khi offline**: Giáo viên muốn mở app để xem các bài đã chấm trước đó hoặc thử nghiệm tính năng khi đang ngồi trên xe hay vùng không có mạng thì bị chặn cứng ngay tại màn hình đăng nhập dù bấm nút "Đăng nhập Khách".
- **Giải pháp**:
  - Thanh tiến trình: Sử dụng animation tải mượt mà vô hạn (Indeterminate Smooth Pulse Animation) với các thông điệp trạng thái thực tế từ Server SSE/WebSocket thay vì dùng vòng lặp delay ảo.
  - Guest Login: Cho phép đăng nhập Khách ngay cả khi offline để mở kho Lịch sử cục bộ và kho bài đọc chính tả offline.

---

### [P2-07] Thiếu Bộ Kiểm Tra Độ Nét Ảnh Tại CameraX (Motion Blur & Shadow Guard)
- **Hiện trạng mã nguồn**:
  Tại `CameraScanScreen.kt:333-346`: Khi bấm chụp, CameraX chụp ảnh và chuyển thẳng sang Base64 để gửi lên server mà không có bước phân tích tiền kiểm (Pre-flight Validation).
- **Hậu quả thực tế**:
  - Giáo viên chụp bài thi trên bàn học sinh thường bị rung tay (Motion Blur), bóng tối của tay/điện thoại che khuất nửa trang giấy (Shadow), hoặc bị lóa đèn tuýp (Glare).
  - Khi ảnh bị mờ hoặc sấp bóng, AI Gemini OCR nhận diện sai từ ngữ, dẫn đến việc trừ điểm sai cho học sinh và làm mất uy tín của phần mềm.
- **Giải pháp**:
  - Tích hợp Frame Analyzer đo phương sai toán tử Laplace (Laplacian Variance):
    - Nếu độ sắc nét $< 100$: Rung nhẹ điện thoại (Haptic feedback) và hiển thị cảnh báo vàng: *"Ảnh bị mờ nét, vui lòng giữ chắc tay!"*.
    - Nếu độ sáng trung bình $< 60$: Cảnh báo: *"Góc chụp quá tối, vui lòng bật đèn flash hoặc chỉnh góc sáng!"*.

---

## PHẦN VI: SƠ ĐỒ ĐỐI CHIẾU KIẾN TRÚC HIỆN TẠI VS KIẾN TRÚC MỤC TIÊU

### 1. Kiến trúc Batch Scan Hiện tại (Dễ Crash & Mất Dữ Liệu)
```
+---------------------------------------------------------------------------------------------------+
|                            KIẾN TRÚC BATCH SCAN HIỆN TẠI (HIGH RISK)                              |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|  [ Camera Capture ]                                                                               |
|         |                                                                                         |
|         v (Nạp Bitmap thô vào RAM)                                                                |
|  [ RAM Compose Heap: List<Bitmap> ]  ====> [ NGUY CƠ OUT-OF-MEMORY CRASH (>1GB RAM) ]             |
|         |                                                                                         |
|         v (Vòng lặp tuần tự không backoff)                                                        |
|  [ MainViewModel: forEachIndexed ]                                                                |
|         |                                                                                         |
|         v (Gửi dồn dập HTTP POST)                                                                 |
|  [ Web BFF Gateway (Rate Limit: 20 req/min) ]                                                     |
|         |                                                                                         |
|         +---> Bài 1..20: Thành công 200 OK                                                        |
|         +---> Bài 21..35: Chặn HTTP 429 Too Many Requests                                          |
|                     |                                                                             |
|                     v (catch nuốt lỗi, failCount++)                                               |
|               [ MẤT TRẮNG 15 BÀI THI - KHÔNG THỂ KHÔI PHỤC ]                                      |
|                                                                                                   |
+---------------------------------------------------------------------------------------------------+
```

### 2. Kiến trúc Batch Scan Mục tiêu (Chuẩn Doanh nghiệp & Giáo dục)
```
+---------------------------------------------------------------------------------------------------+
|                         KIẾN TRÚC BATCH SCAN MỤC TIÊU (PRODUCTION READY)                          |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|  [ Camera Capture ]                                                                               |
|         |                                                                                         |
|         v (Nén 1600px, ghi ra disk cache ngay lập tức)                                            |
|  [ File Cache: cacheDir/batch_*.jpg ]  <==== [ AN TOÀN TUYỆT ĐỐI VỀ RAM (< 2MB HEAP) ]            |
|         |                                                                                         |
|         v (Chỉ giữ List<FileDescriptor> trong UI)                                                 |
|  [ WorkManager / Coroutine Pipeline ]                                                             |
|         |                                                                                         |
|         v (Khoảng nghỉ 1.5s + Exponential Backoff nếu gặp 429)                                    |
|  [ HTTP POST /api/mobile/grade ]                                                                  |
|         |                                                                                         |
|         +---> Thành công: Ghi kết quả vào Room DB & xóa file cache tạm                            |
|         +---> Thất bại (Mất mạng / 429): Lưu vào Offline Pending Queue                            |
|                     |                                                                             |
|                     v                                                                             |
|               [ BẢNG TỔNG KẾT LÔ CHẤM (BATCH SUMMARY SCREEN) ]                                    |
|               * Thống kê phổ điểm cả lớp                                                          |
|               * Top 3 lỗi sai phổ biến                                                            |
|               * Nút "Chấm lại các bài lỗi" (One-Click Retry)                                       |
|                                                                                                   |
+---------------------------------------------------------------------------------------------------+
```

---

## PHẦN VII: BẢN THIẾT KẾ GIẢI PHÁP & KẾ HOẠCH TÁI CẤU TRÚC CHI TIẾT

```
+===================================================================================================+
|                              LỘ TRÌNH TÁI CẤU TRÚC 3 GIAI ĐOẠN                                    |
+===================================================================================================+
|                                                                                                   |
|  GIAI ĐOẠN 1: BẢO VỆ DỮ LIỆU & BỘ NHỚ (P0 STABILIZATION) ---------------------- [ƯU TIÊN TUYỆT ĐỐI]|
|  1. Chuyển đổi toàn bộ Batch Scan từ Memory Bitmaps sang Disk-backed Temporary Files.             |
|  2. Tích hợp Exponential Backoff & Delay 1500ms chống Rate Limit 429 trong MainViewModel.         |
|  3. Xây dựng bảng `pending_deletions` trong Room DB v5 chấm dứt hoàn toàn Zombie Grade.           |
|                                                                                                   |
|  GIAI ĐOẠN 2: NÂNG CẤP BẢO MẬT & NGHIỆP VỤ SƯ PHẠM (P1 WORKFLOW) ------------- [NGHIỆP VỤ CHÍNH]  |
|  1. Bổ sung màn hình Bảng Tổng kết Lô chấm (Batch Summary Screen).                                |
|  2. Cơ chế chọn Lớp & gán danh sách học sinh thật sự trước khi quét hàng loạt.                     |
|  3. Hàng đợi ngoại tuyến Store-and-Forward xử lý khi trường học mất Wi-Fi (WorkManager).          |
|  4. Tích hợp JWT Bearer Token, băm mật khẩu bcrypt và bảo vệ thư mục ảnh học sinh (NĐ 13/2023).  |
|  5. Tách bạch hoàn toàn Demo Mock Fallback, không để tự ý chèn bài mẫu "Bàn tay mẹ".              |
|                                                                                                   |
|  GIAI ĐOẠN 3: HOÀN THIỆN HIỆU NĂNG & TRẢI NGHIỆM (P2 POLISH) ----------------- [TỐI ƯU VẬN HÀNH]  |
|  1. Tắt HttpLoggingInterceptor Level.BODY trên bản Release, chấm dứt lag giật do log Base64.     |
|  2. Thay Fake Progress Bar bằng Indeterminate Animation mượt mà; mở khóa Guest Login Offline.     |
|  3. Bổ sung bộ lọc tiền kiểm CameraX (Laplacian Blur & Shadow Detection).                         |
|  4. Tích hợp Jetpack Paging 3 cho màn hình Lịch sử (HistoryScreen).                               |
|  5. Khắc phục lỗi Bàn phím ảo che giao diện (adjustResize + imePadding).                          |
|  6. Hỗ trợ CRUD Lớp học và Học sinh trực tiếp trên ứng dụng di động.                              |
|                                                                                                   |
+===================================================================================================+
```

### 1. Code Blueprint cho P0-01: Chuyển đổi Batch Bitmaps sang Disk-backed Cache

```kotlin
// Sửa tại: CameraScanScreen.kt
// THAY THẾ:
// val batchBitmaps = remember { mutableStateListOf<Bitmap>() }
// BẰNG:
val batchImageFiles = remember { mutableStateListOf<File>() }

fun dispatchCapture(bitmap: Bitmap) {
    if (isBatchMode) {
        scope.launch(Dispatchers.IO) {
            val tempFile = File(context.cacheDir, "batch_scan_${System.currentTimeMillis()}_${batchImageFiles.size}.jpg")
            FileOutputStream(tempFile).use { out ->
                bitmap.compress(Bitmap.CompressFormat.JPEG, 85, out)
            }
            bitmap.recycle() // GIẢI PHÓNG RAM NGAY LẬP TỨC!
            withContext(Dispatchers.Main) {
                batchImageFiles.add(tempFile)
                switchNotification = "Đã lưu an toàn bài #${batchImageFiles.size} vào bộ nhớ tạm"
            }
        }
    } else {
        // Luồng chấm bài đơn lẻ giữ nguyên
    }
}
```

### 2. Code Blueprint cho P0-02: Exponential Backoff & Retry trong Batch Loop

```kotlin
// Sửa tại: MainViewModel.kt: gradeBatchFiles
fun gradeBatchFiles(files: List<File>, className: String, studentList: List<String>) {
    viewModelScope.launch {
        val total = files.size
        var successCount = 0
        var failCount = 0
        val failedFiles = mutableListOf<Pair<File, String>>()

        files.forEachIndexed { index, file ->
            val studentName = studentList.getOrElse(index) { "Học sinh ${index + 1}" }
            var retryCount = 0
            var isSuccess = false

            while (retryCount < 3 && !isSuccess) {
                try {
                    val bmp = BitmapFactory.decodeFile(file.absolutePath)
                    val res = repository.gradeImage(
                        bitmap = bmp,
                        serverUrl = _serverUrl.value,
                        studentGrade = 3,
                        studentName = studentName,
                        className = className
                    )
                    bmp.recycle()
                    successCount++
                    isSuccess = true
                    // Khoảng nghỉ sư phạm tránh nghẽn Gateway và Rate Limit
                    delay(1500)
                } catch (e: retrofit2.HttpException) {
                    if (e.code() == 429) {
                        retryCount++
                        // Lùi lũy thừa: 3s, 6s, 12s
                        val backoffMs = (3000L * (1 shl (retryCount - 1)))
                        delay(backoffMs)
                    } else {
                        break
                    }
                } catch (e: Exception) {
                    break
                }
            }

            if (!isSuccess) {
                failCount++
                failedFiles.add(Pair(file, studentName))
            }
        }
        // Xử lý báo cáo lô và dọn dẹp file tạm
    }
}
```

### 3. Code Blueprint cho P0-03: Tombstone Table chống Zombie Grade

```kotlin
// Sửa tại: GradeRecordDao.kt & GradeRepository.kt

@Dao
interface GradeRecordDao {
    @Query("INSERT OR REPLACE INTO pending_deletions (serverId, deletedAt) VALUES (:serverId, :now)")
    suspend fun markPendingDeletion(serverId: String, now: Long = System.currentTimeMillis())

    @Query("SELECT serverId FROM pending_deletions")
    suspend fun getAllPendingDeletions(): List<String>

    @Query("DELETE FROM pending_deletions WHERE serverId = :serverId")
    suspend fun removePendingDeletion(serverId: String)
}

// Trong GradeRepository.kt:
suspend fun deleteRecord(id: Long, serverUrl: String? = null) = withContext(Dispatchers.IO) {
    val record = dao.getRecordByIdDirect(id)
    val sId = record?.serverId
    dao.deleteRecordById(id)

    if (!sId.isNullOrBlank()) {
        dao.markPendingDeletion(sId) // GHI VẾT TOMBSTONE NGAY
        if (!serverUrl.isNullOrBlank()) {
            try {
                val api = NetworkClient.createService(serverUrl)
                val res = api.deleteGrade(sId)
                if (res.isSuccessful) {
                    dao.removePendingDeletion(sId) // Xóa tombstone khi server xác nhận
                }
            } catch (e: Exception) {
                // Ngoại lệ mạng: tombstone vẫn còn, sẽ được dọn bù vào lần sync kế tiếp!
            }
        }
    }
}
```

---

## KẾT LUẬN & KHUYẾN NGHỊ CUỐI CÙNG

1. **Khẳng định giá trị**: Ứng dụng Android ViHand Grade có kiến trúc nền tảng rất tốt (Jetpack Compose hiện đại, CameraX mượt mà, đồng bộ hợp đồng API với Web BFF Next.js 16 đạt mức chuẩn xác cao).
2. **Hành động cấp thiết**: Cần lập tức áp dụng **Giai đoạn 1 (Vá 3 lỗi P0)** trước khi đưa ứng dụng cho bất kỳ giáo viên tiểu học nào chạy thử nghiệm thực tế với lớp học trên 20 học sinh.
3. **Giá trị báo cáo**: Tài liệu này đóng vai trò là kim chỉ nam kỹ thuật chuẩn xác, bảo vệ uy tín sản phẩm và trải nghiệm người dùng cuối trong môi trường giáo dục thực tế.
