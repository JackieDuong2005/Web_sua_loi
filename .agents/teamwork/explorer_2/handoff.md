# BÁO CÁO THANH TRA KỸ THUẬT & ĐỐI SOÁT NGHIỆP VỤ CỐT LÕI (CORE AI & BUSINESS LOGIC AUDIT REPORT)
**Dự án**: Hệ sinh thái ViHand Grade (Android Native App vs. Next.js Web BFF / Python AI Core)  
**Chuyên viên thanh tra**: Explorer 2 (Core AI & Business Logic Specialist)  
**Thời điểm hoàn tất**: 2026-09-30T14:40:00Z  
**Phạm vi thanh tra**: 3 luồng tính năng cốt lõi (AI Grading & OCR, Management & Analytics, Dictation & Audio Sync)  

---

## 1. OBSERVATION (QUAN SÁT THỰC NGHIỆM CHI TIẾT)

### 1.1. Flow 1: Luồng Chấm Điểm Bài Thi Tự Động (AI Grading & OCR)

#### A. Kiến trúc xử lý AI & Mô hình AI sử dụng
1. **Mô hình OCR & Bóc tách văn bản**:
   - Web / Backend (`app/api/ocr/route.ts:18` & `app/api/mobile/grade/route.ts:45, 98-165`): Sử dụng Google Gemini Vision (`gemini-3.1-flash-lite`, fallback `gemini-2.5-flash`), temperature `0.05`, topP `0.95`, maxOutputTokens `8192`. Prompt định hướng phân biệt thể loại `"tho" | "van_xuoi"`, ép buộc ràng buộc đối soát 1-1 giữa `original_text` và `fixed_text`.
   - Android (`android_app/app/build.gradle.kts:86-147`): **Không tích hợp bất kỳ mô hình OCR nào chạy trên máy (On-Device)**. Không có dependency TFLite hay ML Kit Text Recognition. Ảnh chụp từ CameraX được gửi lên endpoint từ xa qua Retrofit `@POST("api/mobile/grade")` (`GradeApiService.kt:13-16`).

2. **Mô hình Bounding Box Detection**:
   - Backend (`python_service/yolo_detector.py:30-42, 72-101`): YOLOv8 detect nạp trọng số `best.pt` từ `Test_train_29_12/ver2/runs/detect/train/weights/best.pt`. Sử dụng thuật toán **Vertical Overlap** gom dòng (ngưỡng overlap `0.4`), sort theo thứ tự đọc tự nhiên và chuẩn hóa tọa độ tương đối `[0..1]`.
   - Backend Next.js Gateway (`app/api/mobile/grade/route.ts:170-195`): Chạy song song `Promise.all([runGeminiOCR, detectYoloBoxes])` để tối ưu thời gian phản hồi (giảm tổng độ trễ xuống ~2.5-4s).
   - Android Client (`PhotoBoundingBoxViewer.kt:97-150` & `ErrorBox` trong `GradeModels.kt:3-19`): Nhận danh sách `errors` chứa tọa độ chuẩn hóa `rel_x1, rel_y1, rel_w, rel_h`, render trực tiếp lên Jetpack Compose `Canvas` và ảnh chụp bài thi.

3. **Mô hình Sửa lỗi Chính tả (Spelling Correction)**:
   - Backend Python (`python_service/main.py:78-117`): Model `chamdentimem/ViT5_Vietnamese_Correction` được nạp qua Transformers, áp dụng **Dynamic INT8 Quantization** (`torch.quantization.quantize_dynamic` trên lớp `torch.nn.Linear`, `dtype=torch.qint8`) để chạy mượt mà trên CPU/Raspberry Pi.
   - Thuật toán so khớp lỗi:
     - Khi đã có văn bản chuẩn (Ground Truth từ SGK hoặc Gemini fixed_text): Next.js thực thi `gradeWithLevenshtein` (`app/api/grade/route.ts:820-1006`) bằng thuật toán LCS Diff Opcodes (`getDiffOpcodes`, tương đương `difflib.SequenceMatcher`), đối soát từng từ 1-1, phân loại âm tiết theo từ điển âm vần tiếng Việt (`classifyErrorType`).
     - Khi nhập văn bản tay: Chạy ViT5 thông qua `gradeWithViT5` (`app/api/grade/route.ts:132-167`).

4. **Barem Điểm & 6 Nhóm Lỗi Sư Phạm**:
   - **4 Tiêu chí đánh giá chuẩn Bộ GD&ĐT** (`app/api/grade/route.ts:946-1006`):
     - *Chính tả & Ngữ pháp* (`chinh_ta`): Tối đa 4.0đ (trong chế độ Tập làm văn `essay`) hoặc tối đa 7.0đ (trong chế độ Chính tả `dictation`). Trừ điểm: `errorCount * penalty_per_error` (mặc định 0.5đ/lỗi).
     - *Hình thức* (`hinh_thuc`): Tối đa 3.0đ (chữ viết, trình bày sạch đẹp, giữ lề vở ô ly).
     - *Nội dung* (`noi_dung`): Tối đa 2.0đ (trong chế độ `essay`).
     - *Sáng tạo & Cảm xúc* (`sang_tao`): Tối đa 1.0đ. Phân tích tự động cấp 1 (`analyzeCreativityTier1`) qua phát hiện từ láy tượng thanh (`REDUPLICATIONS_TUONG_THANH`), tượng hình (`REDUPLICATIONS_TUONG_HINH`), so sánh (`SIMILE_REGEX`) và nhân hóa (`PERSONIFICATION_OBJECTS/ACTIONS`).
   - **6 Nhóm lỗi sư phạm** (`app/api/grade/route.ts:284-307` & `PhotoBoundingBoxViewer.kt:97-150`):
     - 1. Phụ âm đầu (`phu_am_dau`): Rose-500 `#F43F5E` (tr/ch, s/x, d/gi/r, l/n, c/k).
     - 2. Dấu thanh (`dau_thanh`): Purple-500 `#A855F7` (Hỏi/Ngã, Sắc/Nặng).
     - 3. Vần (`van`): Orange-500 `#F97316` (an/ang, iên/iêng, uôn/uông).
     - 4. Nguyên âm / Âm chính (`am_chinh`): Emerald-500 `#10B981` (o/ô, u/ư, a/ă/â).
     - 5. Âm cuối (`phu_am_cuoi`): Sky-500 `#0EA5E9` (t/c, n/ng, p/m).
     - 6. Viết hoa (`viet_hoa`): Amber-500 `#F59E0B` (đầu câu, đầu dòng thơ, tên riêng).

5. **Tiền xử lý ảnh (Pre-processing)**:
   - **Web App** (`lib/image-processor.ts:558-636`): Pipeline 9 bước hoàn chỉnh viết bằng Jimp thuần:
     - Bước 0: EXIF Auto-rotation (đọc trực tiếp byte TIFF header).
     - Bước 0.5: Deskew (tính Projection Profile variance của ảnh nhị phân xoay, lọc đường kẻ ô ly > 35%).
     - Bước 1: Resize (chiều rộng tối đa 1600px).
     - Bước 2: White Balance (Gray World Assumption).
     - Bước 3: Grayscale conversion.
     - Bước 4: Shadow Removal (boxBlur background estimation qua integral image).
     - Bước 5: CLAHE (Contrast Limited Adaptive Histogram Equalization, 8x8 tiles).
     - Bước 6: Sharpen Text (Unsharp Mask với kernel 3x3).
     - Bước 7: Quality Assessment (Laplacian variance đo độ mờ, kiểm tra độ sáng, tỷ lệ nét chì nhạt thích ứng khối 1-2 vs 3-5).
     - Bước 8: Adaptive / Otsu Thresholding.
   - **Android App** (`GradeRepository.kt:280-303`): **Chỉ áp dụng thu nhỏ kích thước và nén JPEG**:
     - Kiểm tra nếu width/height > 1600px -> Scale down bằng `Bitmap.createScaledBitmap()`.
     - Nén JPEG chất lượng 85 (`bitmap.compress(Bitmap.CompressFormat.JPEG, 85)`).
     - Chuyển thành chuỗi Base64 (`Base64.NO_WRAP`).
     - **Không có Deskew, không có CLAHE, không có Shadow Removal, không có Quality Assessment trên máy khách**.
   - Lưu ý đặc biệt: `app/api/mobile/grade/route.ts:398` nhận Base64 từ Android và đưa thẳng vào Gemini OCR + YOLOv8 mà không gọi qua `lib/image-processor.ts`.

6. **Lưu trữ Kết quả & Ảnh**:
   - **Web / Server** (`app/api/mobile/grade/route.ts:13-32, 468-493` & `schema.prisma:34-59`):
     - Ảnh vật lý được lưu vào thư mục `public/uploads/grades/mobile-{timestamp}-{hash}.jpg`.
     - Không lưu chuỗi Base64 nặng vào SQLite (`imageBase64: ""` để chống tràn dung lượng DB - Issue #11).
     - Bảng `Grade` trong Prisma lưu `imagePath: "/uploads/grades/..."`, `scoreBreakdown`, `corrections` (dạng JSON string), `dictationSessionId`, `expiresAt` (365 ngày), `isAnonymized: false`.
   - **Android Native** (`GradeRepository.kt:51-63, 224-232, 234-254`):
     - Ảnh chụp lưu vào thư mục cache nội bộ: `context.filesDir/grades/grade_{timestamp}_{UUID}.jpg` (JPEG chất lượng 90).
     - Kết quả lưu vào cơ sở dữ liệu Room cục bộ `AppDatabase` (bảng `grade_records`, `GradeRecordEntity.kt:6-27`).
     - Hỗ trợ cơ chế đồng bộ hai chiều `syncTwoWayWithServer()` (`GradeRepository.kt:576-599`): Đẩy các bài offline lên server qua `POST /api/grades`, sau đó kéo toàn bộ bài từ server qua `GET /api/grades` về lưu vào Room DB nội bộ theo khóa deduplicate `"${studentName}_${essayTitle}_${className}"`.

---

### 1.2. Flow 2: Luồng Quản Lý Học Sinh, Lớp Học, Thống Kê Phổ Điểm & Lịch Sử

1. **Cấu trúc Dữ liệu & Thao tác CRUD**:
   - **Web Side** (`prisma/schema.prisma:10-32`):
     - `model User`: Quản lý tài khoản (id, name, username, password, role `"teacher"|"student"|"admin"`, className, active, quan hệ `classes: Class[]`).
     - `model Class`: Quản lý lớp học (id, name, grade, teacherId nullable với `onDelete: SetNull`, quan hệ `teacher: User?`).
     - API Endpoints:
       - `GET /api/classes`, `POST /api/classes` (`app/api/classes/route.ts`).
       - `PATCH /api/classes/[id]`, `DELETE /api/classes/[id]` (`app/api/classes/[id]/route.ts`).
       - `GET /api/users?role=&search=`, `POST /api/users` (`app/api/users/route.ts`).
       - `PATCH /api/users/[id]`, `DELETE /api/users/[id]` (`app/api/users/[id]/route.ts`).
   - **Android Side** (`AppDatabase.kt:8` & `GradeRepository.kt:400-431, 697-717`):
     - **Không có bảng Room Database nào cho Class hoặc Student** (Room DB chỉ có duy nhất bảng `grade_records`).
     - Danh sách lớp học và học sinh được lấy từ server qua Retrofit (`getClasses()`, `getStudents()`).
     - **Khi ngoại tuyến / lỗi mạng**: Ứng dụng Android fallback về 2 danh sách tĩnh hardcoded trong mã nguồn: `defaultClasses` (5 lớp: 3A, 3B, 4A, 4B, 5A) và `defaultStudents` (10 học sinh mẫu) tại `GradeRepository.kt:697-717`.
     - **Android hoàn toàn chưa có giao diện hoặc logic CRUD để tạo, sửa, xóa lớp học hoặc học sinh**.

2. **Thống kê Phổ điểm & Phân tích Lỗi**:
   - **Web Side** (`app/teacher/reports/page.tsx:151-200`):
     - Tính điểm trung bình toàn bài.
     - Phổ điểm chia thành 4 khoảng: `9-10` (Xuất sắc), `7-8` (Hoàn thành tốt), `5-6` (Hoàn thành), `0-4` (Chưa đạt).
     - Biểu đồ BarChart vẽ bằng thư viện Recharts.
     - Phân tích tần suất 6 nhóm lỗi GDPT 2018 bằng cách parse JSON cột `corrections`.
     - Lọc dữ liệu theo phân môn: "Tất Cả Bài", "Chính Tả SGK", "Tập Làm Văn".
     - Xuất báo cáo dạng file CSV với UTF-8 BOM `\uFEFF`.
   - **Android Side** (`ReportsViewModel.kt:42-207` & `GradeRecordDao.kt:33-76`):
     - Truy vấn thống kê trực tiếp từ SQLite Room DB qua Flow/StateFlow.
     - Phổ điểm chia thành 4 mức: Xuất sắc (`>= 9.0`), Tốt (`8.0 - 8.9`), Khá (`6.5 - 7.9`), Cần cố gắng (`< 6.5`).
     - Tự động lọc Top 5 nhóm lỗi xuất hiện nhiều nhất từ chuỗi `errorsJson`.
     - **Tính năng độc quyền trên Android**: Tự động nhóm học sinh theo tên, phát hiện danh sách Top 5 học sinh có điểm trung bình `< 6.5` cần rèn luyện (`underperformingStudents`).
     - Lọc theo lớp học (`selectedClass`) và khoảng thời gian (`Tuần này`, `Tháng này`, `Học kỳ 1`, `Cả năm`, `Tất cả`).
     - Xuất CSV qua Android MediaStore API (hỗ trợ Scoped Storage trên Android 10+).

3. **Lịch sử Bài thi & Re-grading**:
   - **Web Side** (`app/teacher/reports/page.tsx:117-126` & `app/api/grades/[id]/route.ts:6-23, 40-70`):
     - Giáo viên có thể xem chi tiết bài chấm, xóa bài chấm (`DELETE /api/grades/[id]` - xóa cả bản ghi và file ảnh trên đĩa).
     - Tại trang chấm bài (`app/teacher/grade/page.tsx`), giáo viên có thể chỉnh sửa Bounding Box và cập nhật điểm lại vào database qua `PATCH /api/grades/[id]`.
   - **Android Side** (`HistoryScreen.kt`, `MainViewModel.kt:315-321` & `GradeRepository.kt:448-474`):
     - Hiển thị danh sách từ Room DB. Phân quyền: Học sinh chỉ xem được bài của chính mình (`MainViewModel.kt:69-82`), Giáo viên xem được toàn bộ.
     - Xóa bài thi (`MainViewModel.kt:315`): **Chỉ xóa cục bộ trong Room DB (`dao.deleteRecordById`) mà KHÔNG gọi `DELETE /api/grades/{id}` lên server**! Nếu sau đó người dùng bấm đồng bộ, bài thi đã xóa sẽ bị kéo từ server về lại máy.
     - Re-grading: Android đã hỗ trợ cập nhật Bounding Box cảm ứng và gửi lên server qua `PATCH /api/grades/{id}` (`GradeRepository.kt:448-474`).

---

### 1.3. Flow 3: Luồng Luyện Viết Chính Tả (Dictation) & Đồng Bộ Dữ Liệu

1. **Nhịp điệu Đọc Chính tả Sư phạm (Reading Rhythm)**:
   - **Web App** (`app/teacher/dictation/page.tsx:170-225, 578-615`):
     - Thuật toán `splitIntoPedagogicalClauses`: Tách văn bản theo câu, sau đó băm nhỏ thành các cụm từ ngữ pháp ngắn từ 3-5 từ (`chunkMode === "short"`) hoặc 5-7 từ (`chunkMode === "standard"`).
     - Vòng lặp phát âm: Lặp lại mỗi cụm đúng `repeatCount` lần (mặc định 2 lần).
     - Thời gian nghỉ viết thích ứng (`pauseSetting === "auto"`): `pauseTime = Math.max(5, Math.round(wCount * 1.6))` (từ 5 đến 8+ giây tùy độ dài từ).
     - Hiển thị giao diện "Bảng Xanh" chiếu toàn màn hình cho lớp học quan sát.
     - Câu kết thúc: Tự động phát âm lời dặn dò "Đã hoàn thành bài đọc chính tả. Các em hãy soát lại bài."
   - **Android App** (`DictationScreen.kt:159-165, 310-335`):
     - Tách đoạn văn bản: Chỉ cắt đơn giản theo ký tự xuống dòng `\n` hoặc dấu chấm `.`:
       `val sentences = selectedPassage.content.split("\n", ".").filter { it.isNotEmpty() }`.
       **Chưa áp dụng thuật toán băm cụm từ sư phạm 3-5 từ như bản Web**.
     - Nhịp điệu: Đọc lần 1 -> nghỉ ngắn 2.8 giây (`delay(2800)`) -> đọc lần 2 -> đếm ngược nghỉ cố định 10 giây (`pauseCountdown = 10`) cho học sinh viết -> chuyển sang câu kế tiếp.
     - Hỗ trợ thanh tiến trình và hiển thị số lần đọc (Lần 1 / Lần 2).

2. **Động cơ TTS (Text-To-Speech Engine)**:
   - **Web Backend** (`app/api/dictation/tts/route.ts:1-96` & `python_service/main.py`):
     - Động cơ chính: Microsoft Edge-TTS Neural Voice chạy qua Python microservice (`vi-VN-HoaiMyNeural` - Nữ giọng Bắc truyền cảm; `vi-VN-NamMinhNeural` - Nam giọng Bắc chuẩn mực).
     - Động cơ phụ: Google Translate TTS và Web Speech API của trình duyệt.
   - **Android Native** (`DictationScreen.kt:187-280`):
     - **Ưu tiên 1**: Tạo luồng âm thanh thời gian thực từ Web Server qua `MediaPlayer` kết nối endpoint `/api/dictation/tts?text=...&voice=vi-VN-HoaiMyNeural`.
     - **Ưu tiên 2 (Offline Fallback)**: Tự động chuyển đổi sang động cơ TTS nội bộ của hệ điều hành Android (`android.speech.tts.TextToSpeech`) khi mất kết nối mạng hoặc khi người dùng chọn `voice == "local_tts"`.

3. **Kho Ngữ liệu Sách Giáo Khoa (SGK Lớp 1-5)**:
   - **Web Side** (`prisma/schema.prisma:92-101` & `app/api/dictation/passages/route.ts`):
     - Bảng `TextbookPassage` trong SQLite/Prisma lưu trữ đầy đủ `gradeLevel` (1-5), `bookSet` (Kết Nối, Cánh Diều, Chân Trời), `unit`, `title`, `content`, `difficultWords`.
     - Đầy đủ API CRUD quản lý bài đọc.
     - Tích hợp tính năng AI sáng tác bài đọc chính tả mới theo chủ đề thông qua Gemini (`/api/dictation/generate`).
   - **Android Side** (`LocalDictationPassages.kt:1-179` & `DictationScreen.kt:137-156`):
     - Chứa sẵn 15 bài đọc mẫu offline chuẩn SGK bao phủ từ Lớp 1 đến Lớp 5 cho cả 3 bộ sách.
     - Khi có mạng, tự động gọi `GET /api/dictation/passages` để làm mới danh sách.
     - **Hạn chế**: Không có tính năng thêm/sửa/xóa bài đọc, không có tính năng AI sinh bài đọc mới.

4. **Lưu trữ & Đồng bộ Phiên đọc Chính tả (Dictation Session Sync)**:
   - **Web Side** (`prisma/schema.prisma:67-89` & `app/api/dictation/sessions/route.ts`):
     - Quản lý phiên đọc hoàn chỉnh: `DictationSession` và `DictationLog`.
     - Khi chấm bài thi, trường `Grade.dictationSessionId` liên kết trực tiếp bài làm của học sinh với bài đọc mẫu chuẩn làm Ground Truth để chấm điểm không ảo giác.
   - **Android Side**:
     - **Hoàn toàn chưa lưu trữ phiên đọc (Sessionless)**. Sau khi đọc xong, trạng thái biến mất, không lưu vào Room DB và không gửi log lên endpoint `/api/dictation/sessions`.

---

## 2. LOGIC CHAIN (CHUỖI SUY LUẬN LOGIC TỪ QUAN SÁT ĐẾN KẾT LUẬN)

```
[QUAN SÁT THỰC NGHIỆM]
1. Android app/build.gradle.kts không có thư viện TFLite, OpenCV, hay mô hình AI cục bộ nào.
2. GradeRepository.kt gửi Base64 lên /api/mobile/grade qua Retrofit.
3. Khi mất mạng, GradeRepository.kt gọi generateSimulatedAnalysis() trả về dữ liệu giả lập có sẵn.
   └──> [SUY LUẬN LOGIC 1]:
        Android hoàn toàn đóng vai trò Thin-Client (Edge-capture, Server-AI).
        Không có Edge AI on-device thực sự; "Edge AI Offline" hiện tại là cơ chế Mock Simulation để phục vụ demo.

4. lib/image-processor.ts có pipeline 9 bước (Deskew, CLAHE, White Balance, Shadow Removal, Pencil check).
5. Android chỉ nén JPEG chất lượng 85 và resize <= 1600px trước khi gửi Base64.
6. app/api/mobile/grade/route.ts không cho ảnh đi qua lib/image-processor.ts mà nạp thẳng vào Gemini/YOLO.
   └──> [SUY LUẬN LOGIC 2]:
        Tồn tại khoảng cách chất lượng đầu vào giữa Web và Mobile. Nếu ảnh chụp từ điện thoại bị nghiêng
        hoặc bóng đổ mạnh, độ chính xác của Gemini OCR và YOLO sẽ bị suy giảm vì thiếu pipeline xử lý ảnh.

7. Web Prisma có User, Class, Grade, DictationSession, DictationLog, TextbookPassage.
8. Android AppDatabase chỉ có duy nhất bảng grade_records.
9. GradeRepository.kt fallback về defaultClasses và defaultStudents khi lỗi mạng.
   └──> [SUY LUẬN LOGIC 3]:
        Cấu trúc dữ liệu Room DB của Android bị thiếu các thực thể quản lý (Class, Student, DictationSession).
        Khả năng hoạt động ngoại tuyến bị phân mảnh: chỉ lưu được kết quả chấm bài, không quản lý được lớp/học sinh khi mất mạng.

10. MainViewModel.kt xóa bản ghi chỉ bằng dao.deleteRecordById().
11. syncTwoWayWithServer() kéo toàn bộ bài từ server về nếu thiếu.
   └──> [SUY LUẬN LOGIC 4]:
        Lỗi đồng bộ dữ liệu: Xóa trên Android là xóa "ảo" (chỉ xóa local), không xóa trên server.
        Sau khi bấm sync, bài thi bị xóa sẽ "đội mồ sống lại" do server vẫn còn lưu.

12. Web có thuật toán băm câu thành cụm từ ngữ pháp 3-5 từ (splitIntoPedagogicalClauses) và tạm dừng thích ứng.
13. Android chỉ split theo dòng \n và dấu chấm . và dừng cố định 10s.
   └──> [SUY LUẬN LOGIC 5]:
        Trải nghiệm luyện viết chính tả trên Android chưa chuẩn phương pháp sư phạm tiểu học
        (đoạn văn dài hơn 7 từ nếu không ngắt nhỏ sẽ khiến học sinh tiểu học không kịp chép).
```

---

## 3. BẢNG ĐỐI CHIẾU CHI TIẾT TỪNG FLOW (SIDE-BY-SIDE LOGIC & ALGORITHM COMPARISON)

### 3.1. Bảng Đối Soát Flow 1: AI Grading & OCR

| Tiêu chí | Web BFF / Python AI Core | Android Native App | Đánh giá mức độ đồng nhất | Dẫn chứng Code & Dòng |
| :--- | :--- | :--- | :--- | :--- |
| **Kiến trúc thực thi AI** | Server-side: Gemini Vision OCR + YOLOv8 ONNX/PyTorch + ViT5 Dynamic INT8 Quantization. | Client-side: Thu nhận ảnh CameraX/Gallery, gửi Base64 lên Server BFF qua HTTP POST. | ✅ **Đồng nhất về mặt tích hợp** (BFF Gateway xử lý trọn gói cho Mobile). | `app/api/mobile/grade/route.ts:398` vs `GradeRepository.kt:114` |
| **Tiền xử lý ảnh (Pre-processing)** | 9 bước Jimp thuần: EXIF Rotate, Deskew, Resize, White Balance, Grayscale, Shadow Removal, CLAHE, Sharpen, Threshold. | Resize `<= 1600px`, Nén JPEG 85%, Base64 encoding. | ⚠️ **Lệch năng lực**: Android thiếu Deskew & CLAHE, ảnh gửi lên server chưa qua tiền xử lý. | `lib/image-processor.ts:558-636` vs `GradeRepository.kt:280-303` |
| **Mô phỏng ngoại tuyến (Offline Mode)** | Không có (báo lỗi HTTP 503 khi mất kết nối). | Có hàm `generateSimulatedAnalysis` trả về bài chấm mẫu 7.5đ kèm cảnh báo trạm Pi offline. | ⚠️ **Cơ chế khác biệt**: Android có simulation giả lập, Web không có. | `GradeRepository.kt:305-367` |
| **Barem tính điểm (Scoring Rubric)** | 4 tiêu chí (Chính tả 4.0, Hình thức 3.0, Nội dung 2.0, Sáng tạo 1.0) hoặc 2 tiêu chí (Chính tả 7.0, Hình thức 3.0). | 4 tiêu chí: Spelling 4.0, Format 3.0, Content 2.0, Creativity 1.0. | ✅ **Đồng nhất 100%** cấu trúc barem điểm. | `app/api/grade/route.ts:946-991` vs `GradeModels.kt:21-43` & `CriteriaScoreCard.kt:124-165` |
| **Phân loại lỗi chính tả** | 6 nhóm chuẩn GDPT: `phu_am_dau`, `dau_thanh`, `van`, `am_chinh`, `phu_am_cuoi`, `viet_hoa`. | Ánh xạ đúng 6 nhóm lỗi và đồng bộ mã màu UI (Rose, Purple, Orange, Emerald, Sky, Amber). | ✅ **Đồng nhất 100%** danh mục và bảng màu sư phạm. | `app/api/grade/route.ts:284-307` vs `PhotoBoundingBoxViewer.kt:97-150` |
| **Lưu trữ ảnh bài thi** | Lưu file vật lý tại `public/uploads/grades/mobile-*.jpg`, xóa base64 trong DB để chống bloat. | Lưu file JPEG tại `context.filesDir/grades/grade_*.jpg`, lưu ảnh Bitmap trong bộ nhớ đệm. | ✅ **Đồng nhất triết lý** lưu ảnh ra đĩa và giải phóng database. | `app/api/mobile/grade/route.ts:13-32` vs `GradeRepository.kt:51-63` |
| **Lưu trữ cơ sở dữ liệu** | Prisma ORM -> SQLite `prisma/vihand.db` (bảng `Grade`). | Room ORM -> SQLite `vihand_grade.db` (bảng `grade_records`). | ✅ **Đồng nhất cơ chế**: Đều dùng SQLite, có cơ chế đồng bộ 2 chiều. | `prisma/schema.prisma:34-59` vs `GradeRecordEntity.kt:6-27` |

---

### 3.2. Bảng Đối Soát Flow 2: Quản Lý Học Sinh, Lớp Học & Thống Kê

| Tiêu chí | Web BFF / Next.js Web App | Android Native App | Đánh giá mức độ đồng nhất | Dẫn chứng Code & Dòng |
| :--- | :--- | :--- | :--- | :--- |
| **Thực thể Lớp học (Class)** | Bảng `Class` trong Prisma, quan hệ `@relation("TeacherClasses")` với User, đầy đủ CRUD. | Không có bảng Room. Dùng model `ClassItem`, fallback về danh sách tĩnh `defaultClasses`. | ❌ **Thiếu hụt (Gap)**: Android chưa có Room table và CRUD lớp học. | `prisma/schema.prisma:23-32` vs `GradeRepository.kt:400-412, 697-703` |
| **Thực thể Học sinh (Student)** | Bảng `User` trong Prisma (role="student", className), đầy đủ API `/api/users`. | Không có bảng Room. Dùng model `StudentItem`, fallback về `defaultStudents`. | ❌ **Thiếu hụt (Gap)**: Android chưa có Room table và CRUD học sinh. | `prisma/schema.prisma:10-21` vs `GradeRepository.kt:414-431, 705-716` |
| **Phổ điểm thống kê** | 4 khoảng: `9-10`, `7-8`, `5-6`, `0-4`. Hiển thị bằng Recharts BarChart. | 4 mức: `>= 9.0`, `8.0-8.9`, `6.5-7.9`, `< 6.5`. Hiển thị bằng Jetpack Compose Card. | ⚠️ **Lệch nhẹ về ngưỡng**: Web dùng 7-8 & 5-6, Android dùng 8.0 & 6.5. | `app/teacher/reports/page.tsx:155-166` vs `ReportsViewModel.kt:144-147` |
| **Học sinh cần rèn luyện** | Chưa có chức năng lọc tự động trên giao diện Web. | Tự động tính điểm TB theo học sinh, lọc Top 5 học sinh `< 6.5đ` (`underperformingStudents`). | 🌟 **Android vượt trội**: Đã hiện thực hóa tính năng sư phạm quan trọng này. | `ReportsViewModel.kt:177-194` & `GradeRecordDao.kt:74-76` |
| **Bộ lọc thống kê** | Lọc theo Phân môn (Chính tả / Tập làm văn) và tìm kiếm chuỗi. | Lọc theo Lớp học (`selectedClass`) và Thời gian (Tuần, Tháng, Học kỳ 1, Cả năm). | ⚠️ **Lệch trục lọc**: Web lọc theo môn, Android lọc theo thời gian và lớp. | `app/teacher/reports/page.tsx:129-133` vs `ReportsViewModel.kt:60-70` |
| **Xuất báo cáo CSV** | UTF-8 BOM CSV, tải về qua Browser Blob URL. | UTF-8 BOM CSV, lưu trực tiếp vào thư mục Downloads qua MediaStore Scoped Storage. | ✅ **Đồng nhất 100%** chuẩn định dạng và mã hóa UTF-8. | `app/teacher/reports/page.tsx:202-221` vs `ReportsViewModel.kt:219-257` |
| **Xóa bài thi (Delete)** | Gọi `DELETE /api/grades/[id]`, xóa bản ghi trong Prisma và xóa file ảnh trên đĩa server. | Gọi `dao.deleteRecordById(id)`, chỉ xóa trong Room DB trên máy, không gọi xóa server. | ❌ **Lỗi đồng bộ (Sync Bug)**: Xóa trên mobile bị tải lại khi sync hai chiều. | `app/api/grades/[id]/route.ts:6-23` vs `MainViewModel.kt:315-321` |

---

### 3.3. Bảng Đối Soát Flow 3: Luyện Viết Chính Tả (Dictation) & TTS

| Tiêu chí | Web BFF / Next.js Web App | Android Native App | Đánh giá mức độ đồng nhất | Dẫn chứng Code & Dòng |
| :--- | :--- | :--- | :--- | :--- |
| **Thuật toán ngắt cụm từ đọc** | `splitIntoPedagogicalClauses`: băm nhỏ câu thành cụm 3-5 từ theo ngữ pháp tiếng Việt. | `content.split("\n", ".")`: chỉ cắt theo dòng và dấu chấm nguyên câu. | ❌ **Lệch thuật toán**: Android đọc cả câu dài, học sinh tiểu học khó viết kịp. | `app/teacher/dictation/page.tsx:170-225` vs `DictationScreen.kt:160-165` |
| **Nhịp điệu lặp lại & Tạm dừng** | Lặp 2 lần; tạm dừng thích ứng `Math.max(5, wCount * 1.6)` giây (5-8+ giây) hoặc 10s/15s. | Lặp 2 lần; lần 1 nghỉ 2.8s, lần 2 đếm ngược cố định 10s. | ⚠️ **Tương đồng mục đích nhưng khác công thức**: Android dùng thời gian cố định. | `app/teacher/dictation/page.tsx:583-606` vs `DictationScreen.kt:310-335` |
| **Động cơ TTS (Phát âm)** | Edge-TTS Neural (`vi-VN-HoaiMyNeural`, `NamMinhNeural`) qua Python; fallback Google TTS. | Stream trực tiếp từ `/api/dictation/tts`; fallback sang Android Native `TextToSpeech`. | ✅ **Đồng nhất & Bổ trợ hoàn hảo**: Android stream giọng chuẩn, tự offline bằng native TTS. | `app/api/dictation/tts/route.ts:15-90` vs `DictationScreen.kt:208-280` |
| **Kho bài đọc SGK (Corpus)** | Model `TextbookPassage` (Lớp 1-5, 3 bộ sách), đầy đủ CRUD API và AI generation. | `LocalDictationPassages.kt` (15 bài pre-seeded), đồng bộ từ `/api/dictation/passages`. | ⚠️ **Thiếu hụt tính năng**: Android chỉ đọc bài có sẵn, không tạo/sửa được bài đọc. | `prisma/schema.prisma:92-101` vs `LocalDictationPassages.kt:1-179` |
| **Lưu trữ phiên đọc (Session)** | Model `DictationSession` và `DictationLog`, lưu tiến trình, liên kết với ID chấm bài. | Không lưu phiên đọc (Sessionless), chỉ phát âm trên giao diện rồi kết thúc. | ❌ **Thiếu hụt (Gap)**: Android chưa ghi lại lịch sử các buổi đọc chính tả. | `app/api/dictation/sessions/route.ts:39-86` vs `DictationScreen.kt` |

---

## 4. CAVEATS (GIỚI HẠN & GIẢ ĐỊNH TRONG THANH TRA)

1. **Giới hạn phạm vi thanh tra**: Thanh tra được thực hiện dưới chế độ Read-Only Inspection trên mã nguồn thực tế của dự án. Không thực hiện can thiệp sửa mã nguồn trong đợt thanh tra này.
2. **Hạ tầng Raspberry Pi cục bộ**: Trạm phần cứng Raspberry Pi 4 ARM64 kết nối qua Cloudflare Tunnel (`https://vihandgrade.click/`) có thể thay đổi địa chỉ IP hoặc độ trễ tùy theo điều kiện mạng thực tế của người dùng.
3. **Mô hình AI trên máy di động**: Mặc dù trong tài liệu kiến trúc có đề cập đến kế hoạch đưa mô hình TFLite/NCNN lên thiết bị di động, nhưng trong mã nguồn `android_app` hiện tại hoàn toàn chưa có mã nhúng mô hình AI on-device.

---

## 5. CONCLUSION (KẾT LUẬN & ĐỀ XUẤT HÀNH ĐỘNG CỤ THỂ)

### 5.1. Đánh giá Tổng Quan
- **Độ hoàn thiện của Core AI**: Kiến trúc Backend Next.js + Python ViT5/YOLOv8 hoạt động cực kỳ tinh gọn, thiết kế API Gateway `/api/mobile/grade` đã chuẩn hóa hoàn hảo để phục vụ Android Native App.
- **Tính năng nổi bật của Android App**:
  - Tích hợp CameraX mượt mà, hỗ trợ xoay ảnh theo ma trận góc cảm biến.
  - Hiển thị Bounding Box đa màu sắc chuẩn xác theo 6 danh mục lỗi GDPT 2018.
  - Phân tích Top 5 học sinh cần rèn luyện (`underperformingStudents`) vượt trội hơn bản Web.
  - Cơ chế âm thanh Hybrid (Stream Edge-TTS Neural + Fallback Native TextToSpeech) hoạt động ổn định và thông minh.
- **3 Khoảng cách kỹ thuật (Gaps) lớn nhất cần khắc phục trên Android**:
  1. *Lỗi đồng bộ xóa bài (P0)*: `deleteHistoryItem` chỉ xóa ở Room DB mà không gọi `DELETE /api/grades/{id}` lên máy chủ.
  2. *Thiếu bảng dữ liệu lớp học & học sinh trong Room (P1)*: Cần tạo `ClassEntity` và `StudentEntity` để lưu trữ ngoại tuyến thay vì hardcode `defaultClasses`.
  3. *Chưa áp dụng thuật toán ngắt cụm 3-5 từ cho Dictation (P1)*: Cần port hàm `splitIntoPedagogicalClauses` từ TypeScript sang Kotlin để nhịp điệu đọc chuẩn sư phạm tiểu học.

---

## 6. VERIFICATION METHOD (PHƯƠNG PHÁP XÁC MINH ĐỘC LẬP)

Để độc lập kiểm chứng các quan sát và kết luận trong báo cáo này:

1. **Xác minh không có TFLite/OpenCV trên Android**:
   ```powershell
   Select-String -Path "android_app/app/build.gradle.kts" -Pattern "tflite|tensorflow|opencv"
   ```
   *Kết quả mong đợi*: Không có kết quả nào được tìm thấy.

2. **Xác minh xử lý ảnh và Base64 trên Android**:
   Xem trực tiếp các dòng từ 280 đến 303 tại `android_app/app/src/main/java/com/example/data/repository/GradeRepository.kt`:
   Xác nhận hàm `encodeBitmapToBase64` chỉ thực hiện `Bitmap.createScaledBitmap` và `Bitmap.compress(JPEG, 85)`.

3. **Xác minh Pipeline 9 bước trên Web**:
   Xem trực tiếp các dòng từ 558 đến 636 tại `lib/image-processor.ts`:
   Xác nhận có đủ 9 bước xử lý ảnh với Jimp thuần.

4. **Xác minh cơ chế xóa bài thi chỉ diễn ra cục bộ**:
   Xem các dòng 315-321 trong `android_app/app/src/main/java/com/example/ui/viewmodel/MainViewModel.kt` và các dòng 256-258 trong `GradeRepository.kt`:
   Xác nhận chỉ gọi `dao.deleteRecordById(it)` và không có bất kỳ lệnh gọi HTTP DELETE nào đến máy chủ.

5. **Xác minh thuật toán đọc chính tả**:
   So sánh hàm `splitIntoPedagogicalClauses` tại `app/teacher/dictation/page.tsx:170-225` với `selectedPassage.content.split("\n", ".")` tại `android_app/app/src/main/java/com/example/ui/screens/DictationScreen.kt:160-165`.
