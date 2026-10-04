# BÁO CÁO THẨM ĐỊNH ĐỘC LẬP & PHẢN BIỆN ĐỐI KHÁNG (REVIEW & ADVERSARIAL AUDIT REPORT)

**Người thẩm định**: Subagent `reviewer_2` (UI/UX & Roadmap Reviewer)  
**Tài liệu được thẩm định**: `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\orchestrator_1\AUDIT_REPORT.md`  
**Căn cứ nhiệm vụ gốc**: `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\ORIGINAL_REQUEST.md`  
**Thời điểm hoàn tất**: 2026-09-30T14:45:00Z  
**Phạm vi thẩm định**: Acceptance Criteria 3 (UI/UX), Acceptance Criteria 4 (Feature Parity Matrix), Acceptance Criteria 5 (Actionable Roadmap) và Kiểm tra Tính toàn vẹn (Integrity Check).

---

## 1. OBSERVATION (QUAN SÁT THỰC CHỨNG TẠI CODEBASE)

Qua việc trực tiếp đối soát nội dung trong `AUDIT_REPORT.md` với cây thư mục mã nguồn thực tế tại Web App (`app/`, `components/`, `lib/`) và Android Native App (`android_app/app/src/main/`), người thẩm định đã xác thực các quan sát khách quan sau:

### 1.1. Về Ngôn ngữ Thiết kế, Design Tokens & Typography (AC 3)
1. **Design Tokens & Theme Colors**:
   - Web App (`app/globals.css:1-60`) và Android App (`android_app/.../ui/theme/Color.kt:1-84`): Màu chủ đạo Emerald `#059669` được định nghĩa chính xác thành `EmeraldPrimary = Color(0xFF059669)` trên Android. Màu nền `BackgroundCream = Color(0xFFFAF9F6)` và `BackgroundDark = Color(0xFF141724)` khớp hoàn toàn giữa hai nền tảng.
   - Tồn dư XML Legacy: Tại `android_app/app/src/main/res/values/colors.xml:3-9`, các màu mặc định của template Android (`purple_500`, `teal_200`) vẫn tồn tại, chưa được cập nhật theo bộ nhận diện ViHand Grade.
2. **Mã màu Phân loại Lỗi Sư phạm (Pedagogical Error Themes)**:
   - Web App (`app/teacher/grade/page.tsx:125-234`) định nghĩa đủ **9 nhóm lỗi**: `phu_am_dau`, `dau_thanh`, `van`, `am_chinh`, `phu_am_cuoi`, `viet_hoa`, `bo_sot_them`, `thay_the_tu`, `dau_cau`.
   - Android App (`android_app/.../ui/theme/Color.kt:37-61` và `PhotoBoundingBoxViewer.kt:97-124`):
     - Chỉ khai báo **6 nhóm lỗi**.
     - Bị **lệch mã màu lỗi viết hoa**: Web dùng Blue-600 (`#2563eb`), Android dùng Amber-500 (`#F59E0B`).
     - Thiếu hoàn toàn 3 nhóm: `bo_sot_them` (Pink-500), `thay_the_tu` (Indigo-600), `dau_cau` (Teal-600); tại `PhotoBoundingBoxViewer.kt:122`, các lỗi này rơi vào nhánh `else -> Color(0xFF64748B)` (màu xám Slate).
3. **Typography & Font Tiểu học HP001**:
   - Web App (`app/globals.css:6-48`) nạp **7 biến thể font `@font-face`**: `HP001` (4 hàng normal/bold), `HP001-5hang` (5 hàng normal/bold), `HP001-OLy`, `HP001-OLy2`, `HP001-5OLy`.
   - Android App (`android_app/.../ui/theme/Type.kt:12-15` & `res/font/`): Chỉ có **2 file font** `hp001_normal.ttf` và `hp001_bold.ttf`. Thiếu biến thể 5 hàng dành cho lớp 1.
   - Kho font gốc tại thư mục dự án `Font Tieu hoc/fONT TIEU HOC/` chứa đầy đủ cả 7 file TTF (bao gồm `HP001_5_hang_normal.ttf` dung lượng 90,388 bytes).
4. **Loading & Feedback UX**:
   - Web dùng icon Stepper (`components/teacher/grade-stepper-icons.tsx`) kết hợp Spinner.
   - Android tích hợp Universal Processing Dialog (`MainActivity.kt:476-522`) với `CircularProgressIndicator` và `LinearProgressIndicator` gắn liền tiến độ `state.progress`.
   - Phản hồi người dùng: Android sử dụng `SnackbarHost` (`GradingResultScreen.kt:295`), `Toast.makeText` (`ReportsAnalyticsScreen.kt:122`), và `AlertDialog` (`MainActivity.kt:525`).
5. **Mobile Touch UX & Bounding Box**:
   - Cử chỉ thu phóng: `PhotoBoundingBoxViewer.kt:368-408` hoàn toàn không có `detectTransformGestures`. Chỉ có nút toggle `isZoomed` mở rộng khung hình sang `540.dp` kết hợp `horizontalScroll`.
   - Kích thước điểm chạm: `PhotoBoundingBoxViewer.kt:510-511` ép kích thước `widthDp = (displayedWidthDp * safeRelW).coerceAtLeast(16.dp)` và `heightDp = ...coerceAtLeast(14.dp)`, vi phạm khuyến nghị tối thiểu 48dp x 48dp của WCAG/Android Accessibility Guidelines.
   - Tàn dư chuỗi kỹ thuật trên UI:
     - `HomeScreen.kt:144`: Chuỗi `"vihandgrade.click • Trạm Pi 4 Online"`.
     - `PhotoBoundingBoxViewer.kt:312`: Chuỗi `"YOLOv8 DETECTED • ${result.errors.size} LỖI"`.
     - `HistoryScreen.kt:119`: Chuỗi `"Tổng số ${records.size} bài thi đã lưu trong CSDL Room"`.
     - `MainActivity.kt:587`: Nút `"Chấm Offline 🧪"`.
     - `StudentHomeScreen.kt:338-344`: Hardcode danh sách 5 từ khó tĩnh (`listOf(Pair("ru bé ngủ say", ...))`).

---

### 1.2. Về Ma trận Tính năng trên 7 Màn hình Chính (AC 4)
Đối soát trực tiếp 7 nhóm màn hình trong Section 5 (R4.1) của `AUDIT_REPORT.md`:
1. **Đăng nhập / Xác thực**: Web `app/page.tsx:1-170` vs Android `LoginScreen.kt:1-367`. Android có thêm tính năng dùng thử Guest (dòng 281-308) và cấu hình Server URL trực tiếp trên UI (dòng 313-364).
2. **Dashboard (Tổng quan)**: 4 KPI Cards khớp giữa Web `app/teacher/page.tsx:156-171` và Android `HomeScreen.kt:225-250`.
3. **Chấm bài (Grading Studio)**: Android có CameraX Viewfinder (`CameraScanScreen.kt:100-280`), Flash/Torch toggle (dòng 293-304), Batch Scan Mode (dòng 326-346); Bounding Box Canvas (`PhotoBoundingBoxViewer.kt`), Diff Viewer (`GradingResultScreen.kt:1438-1520`), Barem 4 tiêu chí (`CriteriaScoreCard.kt:1-229`), Slider sửa điểm (dòng 2151-2162).
4. **Lịch sử bài chấm (History)**: `HistoryScreen.kt:50-80` hiển thị danh sách bài chấm nhưng **thiếu hoàn toàn** thanh tìm kiếm, bộ lọc thể loại và bộ lọc mức điểm (vốn có trên Web `app/student/history/page.tsx:59-61, 105-125`). Tính năng chia sẻ Zalo sao chép văn bản vào Clipboard (`GradingResultScreen.kt:1275-1277`).
5. **Báo cáo & Lớp học**: Android vượt trội với thuật toán lọc Top 5 học sinh có điểm < 6.5 (`ReportsViewModel.kt:177-194`). Android thiếu màn hình CRUD lớp học/học sinh độc lập (chỉ đọc qua API).
6. **Luyện viết chính tả (Dictation)**: Web áp dụng `splitIntoPedagogicalClauses` (`app/teacher/dictation/page.tsx:170-225`) ngắt cụm 3-5 từ và nghỉ thích ứng `Math.max(5, Math.round(wCount * 1.6))` (dòng 597-599). Android (`DictationScreen.kt:160-165, 322`) chỉ cắt theo dấu chấm/xuống dòng và nghỉ cố định 10 giây. Cả hai cùng tích hợp Edge-TTS Neural; Android có fallback sang Native TTS.
7. **Cài đặt & Tài khoản**: Khớp về chuyển đổi Dark/Light theme (`ProfileSettingsScreen.kt:177-235`), kiểm tra trạng thái máy chủ (dòng 264-345); Android có thêm xem trước Font HP001 (dòng 238-261).

---

### 1.3. Về Lộ trình Phát triển Khả thi qua 3 Giai đoạn (AC 5)
Lộ trình trong Section 7 được cấu trúc thành 3 giai đoạn:
- **Phase 1: Ổn định Core AI, An ninh & Chuẩn hóa API Sync (Tuần 1 - 2)**: 5 hạng mục kèm 5 tiêu chí nghiệm thu độc lập.
- **Phase 2: Hoàn thiện Tính năng Quản lý & Luyện tập Sư phạm (Tuần 3 - 4)**: 4 hạng mục kèm 4 tiêu chí nghiệm thu độc lập.
- **Phase 3: Đồng bộ UX & Tối ưu Trải nghiệm Cảm ứng (Tuần 5 - 6)**: 4 hạng mục kèm 4 tiêu chí nghiệm thu độc lập.

---

## 2. LOGIC CHAIN (CHUỖI SUY LUẬN & ĐÁNH GIÁ CHẤT LƯỢNG)

1. **Từ Quan sát 1.1 đến Đánh giá AC 3**:
   - Báo cáo đã phân tích chi tiết và chính xác từng khía cạnh UI/UX: Design System, Tokens, Typography, Loading, Error feedback và Mobile touch.
   - Các trích dẫn số dòng code trên cả hai nền tảng khớp 100% với thực tế, không có hiện tượng bịa đặt hay suy diễn thiếu căn cứ.
   - Báo cáo chỉ ra đúng các điểm yếu về Accessibility (điểm chạm 16dp) và khiếm khuyết cử chỉ (chưa có Pinch-to-zoom).
2. **Từ Quan sát 1.2 đến Đánh giá AC 4**:
   - Ma trận Feature Parity bao phủ đầy đủ 7 nhóm màn hình theo yêu cầu.
   - Đánh giá khách quan cả hai chiều: ghi nhận chính xác các tính năng Android vượt trội (CameraX, Batch Scan, Fallback TTS, phát hiện học sinh yếu < 6.5) đồng thời chỉ rõ những lỗ hổng còn thiếu trên Android (bộ lọc lịch sử, CRUD lớp học, ngắt cụm chính tả).
3. **Từ Quan sát 1.3 đến Đánh giá AC 5**:
   - Lộ trình 3 giai đoạn có sự phân định ranh giới rõ ràng: Phase 1 giải quyết các vấn đề sống còn (An ninh, Lỗi xóa bài P0, Lệch Payload); Phase 2 bổ sung nghiệp vụ sư phạm và CSDL ngoại tuyến; Phase 3 hoàn thiện trải nghiệm thị giác và cảm ứng.
   - 13 tiêu chí nghiệm thu (Acceptance Criteria) đều ở dạng có thể kiểm thử độc lập (verifiable) và khả thi trong triển khai kỹ thuật.
4. **Kiểm tra Tính Toàn Vẹn (Integrity Check)**:
   - Không phát hiện mã giả mạo (facade dummy), không có kết quả test hardcode trong phân tích, không có dữ liệu kiểm thử bịa đặt.
   - Toàn bộ dẫn chứng đều được kiểm tra chéo thành công bằng công cụ đọc mã nguồn.

---

## 3. ADVERSARIAL CRITIQUE & CHALLENGES (PHẢN BIỆN ĐỐI KHÁNG)

Mặc dù báo cáo đạt chất lượng xuất sắc, dưới góc độ phản biện đối kháng (Adversarial Critic), người thẩm định đưa ra **4 thách thức kỹ thuật trọng yếu** cần lưu ý khi triển khai thực tế lộ trình:

```
[BẢN ĐỒ RỦI RO KỸ THUẬT KHI TRIỂN KHAI LỘ TRÌNH ROADMAP]
  ├── Rủi ro 1 [HIGH]: Phụ thuộc hai chiều AuthInterceptor vs Web BFF
  ├── Rủi ro 2 [MEDIUM]: Xung đột vùng chạm (Hitbox Collision) khi mở rộng 48dp
  ├── Rủi ro 3 [MEDIUM]: Migration CSDL Room Database khi bổ sung Entity mới
  └── Rủi ro 4 [LOW]: Xung đột cử chỉ Gesture Transform và Scroll trong Compose
```

### Thách thức 1 (Mức độ: HIGH) — Phụ thuộc Đồng bộ Xác thực Hai Chiều (JWT Sync Risk)
- **Giả định bị chất vấn**: Phase 1 đặt mục tiêu bổ sung `AuthInterceptor` và xử lý JWT Token trên Android.
- **Kịch bản gãy vỡ (Attack Scenario)**: Hiện tại máy chủ Web BFF (`app/api/*`) hoàn toàn **chưa có JWT Middleware** và `POST /api/auth/login` không trả về Token. Nếu đội ngũ phát triển Android cài đặt `AuthInterceptor` bắt buộc có JWT Bearer Token trước khi Web BFF sẵn sàng, toàn bộ các cuộc gọi API trên Android sẽ thất bại ngay lập tức (`HTTP 401` giả lập hoặc client-side block).
- **Phạm vi ảnh hưởng**: Ngừng trệ toàn bộ tính năng chấm bài và đồng bộ dữ liệu.
- **Biện pháp giảm thiểu (Mitigation)**: Trong Phase 1, `AuthInterceptor` trên Android phải được cấu hình ở chế độ **Optional / Graceful Degradation** (nếu có token thì đính kèm `Authorization: Bearer <token>`, nếu chưa có token thì cho phép request đi qua bình thường) cho đến khi Web BFF hoàn tất cập nhật JWT.

### Thách thức 2 (Mức độ: MEDIUM) — Xung đột Vùng Chạm Bounding Box (Hitbox Overlap Collision)
- **Giả định bị chất vấn**: Phase 3 yêu cầu "Mở rộng kích thước vùng chạm Bounding Box đạt chuẩn 48dp x 48dp".
- **Kịch bản gãy vỡ (Attack Scenario)**: Trong chữ viết tay của học sinh tiểu học, khoảng cách giữa các từ trên cùng một dòng hoặc giữa hai dòng liền kề thường rất hẹp (từ 5dp đến 20dp). Nếu mỗi Bounding Box được bọc một hit box vô hình kích thước 48dp x 48dp, các vùng chạm của các từ đứng cạnh nhau sẽ **chồng lấn lên nhau (overlapping hitboxes)**. Khi giáo viên bấm vào một từ, hệ thống có thể chọn nhầm từ bên cạnh hoặc gây ra tình trạng giật/loạn sự kiện chạm trong Jetpack Compose.
- **Phạm vi ảnh hưởng**: Trải nghiệm sửa bài bị ức chế, bấm sai lỗi chính tả.
- **Biện pháp giảm thiểu (Mitigation)**: Không mở rộng box bằng cách tăng kích thước layout cứng; thay vào đó, xử lý sự kiện chạm tại Container cha bằng thuật toán **Khoảng cách Euclid gần nhất (Nearest Centroid Tap Detection)**: khi chạm vào Canvas, tính khoảng cách từ tọa độ chạm `(x, y)` tới tâm của tất cả các Bounding Box lân cận và kích hoạt Box có tâm gần nhất trong bán kính 28dp.

### Thách thức 3 (Mức độ: MEDIUM) — Rủi ro Di chuyển Dữ liệu Room DB (Room Database Migration)
- **Giả định bị chất vấn**: Phase 2 bổ sung `ClassEntity` và `StudentEntity` vào `AppDatabase.kt`.
- **Kịch bản gãy vỡ (Attack Scenario)**: Nếu nâng cấp phiên bản Room DB từ `version = 1` lên `version = 2` mà không định nghĩa `Migration(1, 2)` cụ thể hoặc vô tình kích hoạt `fallbackToDestructiveMigration()`, toàn bộ dữ liệu lịch sử bài thi (`grade_records`) mà giáo viên đã chấm và lưu trên máy sẽ bị xóa sạch khi ứng dụng được cập nhật.
- **Phạm vi ảnh hưởng**: Mất mát dữ liệu bài thi ngoại tuyến của người dùng.
- **Biện pháp giảm thiểu (Mitigation)**: Bắt buộc viết migration script tường minh `MIGRATION_1_2: Migration(1, 2)` với câu lệnh `database.execSQL("CREATE TABLE IF NOT EXISTS...")` và bổ sung unit test kiểm tra tính toàn vẹn của bảng `grade_records` trước khi release Phase 2.

### Thách thức 4 (Mức độ: LOW) — Xung đột Cử chỉ Giữa Zoom và Scroll
- **Giả định bị chất vấn**: Phase 3 tích hợp `detectTransformGestures` trên ảnh bài thi thật.
- **Kịch bản gãy vỡ (Attack Scenario)**: `PhotoBoundingBoxViewer` nằm bên trong màn hình chi tiết có cuộn dọc hoặc ngang. Trong Compose, nếu cử chỉ thu phóng 2 ngón tay không ngắt được sự kiện cuộn của parent composable, thao tác chụm ngón tay sẽ bị khựng hoặc làm trượt trang thay vì phóng to ảnh.
- **Biện pháp giảm thiểu (Mitigation)**: Đặt cờ trạng thái `isTransforming` trong quá trình người dùng chạm 2 ngón tay để tạm thời vô hiệu hóa khả năng cuộn của container cha.

---

## 4. REVIEW SUMMARY & FINDINGS

### Tóm tắt Đánh giá Chất lượng
- **AC 3 (UI/UX)**: ĐẠT XUẤT SẮC (Khảo sát toàn diện, dẫn chứng chính xác từng file và dòng code).
- **AC 4 (Feature Parity Matrix)**: ĐẠT XUẤT SẮC (Bao quát 7 màn hình, 28 hạng mục chi tiết, đánh giá khách quan ưu thế và khoảng cách).
- **AC 5 (Actionable Roadmap)**: ĐẠT TỐT (3 Phase khoa học, tiêu chí nghiệm thu độc lập và rõ ràng; đã bổ sung các lưu ý phòng ngừa rủi ro kiến trúc).
- **Tính toàn vẹn (Integrity)**: TUÂN THỦ TUYỆT ĐỐI (Không có dấu hiệu hardcode, facade hay làm tắt).

### Phân loại Phát hiện (Findings)

#### [Minor] Finding 1: Cần lưu ý chế độ tương thích ngược khi triển khai AuthInterceptor (Phase 1)
- **Vấn đề**: Android không thể ép buộc Bearer Token nếu Web BFF chưa hoàn thiện JWT.
- **Vị trí**: Mục 7.1 (`AUDIT_REPORT.md:355`).
- **Khuyến nghị**: Ghi chú rõ `AuthInterceptor` hoạt động ở chế độ Non-blocking/Optional trong Phase 1.

#### [Minor] Finding 2: Giải pháp chống chồng lấn vùng chạm Bounding Box (Phase 3)
- **Vấn đề**: Mở rộng cố định 48dp x 48dp sẽ gây chồng lấn các từ viết tay liền kề.
- **Vị trí**: Mục 7.3 (`AUDIT_REPORT.md:391`).
- **Khuyến nghị**: Sử dụng thuật toán bắt chạm theo tâm gần nhất (Nearest Centroid) thay vì tăng kích thước khung Box.

---

## 5. CAVEATS (GIỚI HẠN & GIẢ ĐỊNH)

1. Quá trình kiểm tra độc lập được thực hiện thông qua phân tích tĩnh mã nguồn (Static Code Analysis & Pattern Matching) trên cây thư mục dự án, không chạy ứng dụng Android trên máy ảo hay thiết bị vật lý thật do môi trường CLI không hỗ trợ GUI emulator.
2. Kiểm tra hiệu năng 60fps cho cử chỉ Pinch-to-zoom (Phase 3) là mục tiêu thiết kế, cần được đo đạc lại trên thiết bị phần cứng thực tế trong giai đoạn kiểm thử chấp nhận người dùng (UAT).

---

## 6. CONCLUSION & VERDICT

Báo cáo thẩm định `AUDIT_REPORT.md` là một sản phẩm kỹ thuật mẫu mực: trung thực, chi tiết, bám sát từng dòng mã nguồn thực tế của cả Android Native App và Web App, đáp ứng hoàn toàn các tiêu chuẩn nghiệm thu AC 3, AC 4, và AC 5 của nhiệm vụ gốc. Các phản biện đối kháng được nêu trong báo cáo này đóng vai trò gia cố sự an toàn kỹ thuật cho đội ngũ phát triển khi bước vào giai đoạn thực thi.

```
================================================================================
FINAL REVIEW VERDICT: APPROVE
================================================================================
```

---

## 7. VERIFICATION METHOD (PHƯƠNG PHÁP KIỂM CHỨNG ĐỘC LẬP DÀNH CHO BÊN THỨ BA)

Bất kỳ kiểm toán viên nào cũng có thể kiểm chứng lại toàn bộ các phát hiện trên bằng các bước sau:

1. **Xác thực 7 font HP001 trên Web vs 2 font trên Android**:
   - Web: Xem file `app/globals.css`, kiểm tra 7 khai báo `@font-face` từ dòng 6 đến 48.
   - Android: Xem file `android_app/app/src/main/java/com/example/ui/theme/Type.kt` dòng 12-15 và kiểm tra thư mục `android_app/app/src/main/res/font/`.
2. **Xác thực 9 mã màu lỗi trên Web vs 6 mã màu trên Android**:
   - Web: Xem `app/teacher/grade/page.tsx` từ dòng 125 đến 234 (`ERROR_THEMES`).
   - Android: Xem `android_app/app/src/main/java/com/example/ui/theme/Color.kt` từ dòng 37 đến 61 và `PhotoBoundingBoxViewer.kt` dòng 97-124.
3. **Xác thực kích thước điểm chạm Bounding Box bị co nhỏ dưới 48dp**:
   - Android: Xem `android_app/app/src/main/java/com/example/ui/components/PhotoBoundingBoxViewer.kt` dòng 510-511 (`coerceAtLeast(16.dp)`).
4. **Xác thực thuật toán ngắt cụm Dictation**:
   - Web: Xem `app/teacher/dictation/page.tsx` dòng 170-225 (`splitIntoPedagogicalClauses`) và dòng 597-599 (`Math.max(5, Math.round(wCount * 1.6))`).
   - Android: Xem `android_app/app/src/main/java/com/example/ui/screens/DictationScreen.kt` dòng 160-165 (`split("\n", ".")`) và dòng 322 (`pauseCountdown = 10`).
