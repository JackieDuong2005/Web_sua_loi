# BÁO CÁO THẨM ĐỊNH NGHỊCH ĐẢO (ADVERSARIAL CHALLENGE REPORT)
## Kiểm Chuẩn Cú Pháp, Sơ Đồ Mermaid, Dẫn Chứng Dòng Code & API Schemas
**Dự án:** ViHand Grade — Hệ sinh thái Chấm điểm & Trợ lý Sư phạm Thông minh  
**Người thực hiện:** Empirical Challenger (teamwork_preview_challenger)  
**Thời điểm thực hiện:** 2026-10-05T16:35:00Z  
**Đối tượng thẩm định:**
1. `01_Bao_cao_Nghien_cuu/Tai_lieu_Bao_cao/03_Dac_Ta_Kien_Truc_He_Thong/01_Tong_Quan_Kien_Truc_He_Thong_ViHandGrade.md` (`Doc 1`)
2. `01_Bao_cao_Nghien_cuu/Tai_lieu_Bao_cao/03_Dac_Ta_Kien_Truc_He_Thong/02_Dac_Ta_Ky_Thuat_End2End_ViHandGrade.md` (`Doc 2`)

---

## 1. TỔNG QUAN ĐÁNH GIÁ & KẾT LUẬN (EXECUTIVE VERDICT)

- **Mức độ rủi ro tổng thể (Risk Assessment):** **MEDIUM** (Hệ thống sơ đồ Mermaid chuẩn xác 100%, khung kiến trúc vững chắc, nhưng tồn tại một số sai lệch kỹ thuật về trích dẫn số dòng code, đường dẫn file bị rút gọn và thiếu bọc đối tượng (wrapper object) trong schema DTO).
- **Phán quyết chính thức (Formal Verdict):** **REQUEST_CHANGES**  
  *(Yêu cầu hiệu chỉnh 6 điểm sai lệch cụ thể trước khi phát hành chính thức)*.

---

## 2. KẾT QUẢ THỰC NGHIỆM CHI TIẾT THEO 4 TRỤ CỘT

### 2.1. Trụ Cột 1: Cú Pháp & Hiển Thị Sơ Đồ Mermaid (Syntax & Rendering Stress Test)

#### Phương pháp thực nghiệm:
- Xây dựng harness kiểm thử tự động `scripts/build_mermaid_test.py` trích xuất toàn bộ 7 khối Mermaid từ cả 2 tài liệu.
- Nạp vào trình duyệt Chromium thực tế qua Chrome DevTools MCP (`chrome-devtools-mcp`) và thực thi hàm `mermaid.parse(code)` bằng thư viện Mermaid v10 chính thức.

#### Bảng kết quả thực nghiệm 7 sơ đồ:

| Sơ đồ | Vị trí tài liệu | Loại sơ đồ | Tên / Mô tả sơ đồ | Trạng thái Parser | Chi tiết lỗi |
|:---:|:---|:---:|:---|:---:|:---|
| **#1** | Doc 1 (Dòng 338-391) | `graph TD` | Tổng quan Kiến trúc 4 Tầng Hệ thống | **PASS** | None |
| **#2** | Doc 1 (Dòng 400-441) | `sequenceDiagram` | Luồng Quyết định Định tuyến Thông minh | **PASS** | None |
| **#3** | Doc 1 (Dòng 446-467) | `flowchart TD` | Khối Điều kiện Rẽ nhánh Định tuyến | **PASS** | None |
| **#4** | Doc 1 (Dòng 474-516) | `sequenceDiagram` | Luồng Chấm điểm OCR Chữ viết tay Tự động | **PASS** | None |
| **#5** | Doc 1 (Dòng 523-565) | `flowchart TD` | Luồng Luyện viết Chính tả & Edge-TTS | **PASS** | None |
| **#6** | Doc 1 (Dòng 572-621) | `sequenceDiagram` | Luồng Đồng bộ Sổ điểm & Sổ tay Từ khó | **PASS** | None |
| **#7** | Doc 2 (Dòng 737-817) | `erDiagram` | Sơ đồ Quan hệ Thực thể Prisma CSDL Trung tâm | **PASS** | None |

#### Điểm phát hiện phản biện (Adversarial Observations):
1. **Lệch số lượng sơ đồ công bố:** Tại Doc 1 (dòng 333), lời dẫn ghi *"Tất cả 5 sơ đồ dưới đây được thiết kế và kiểm thử nghiêm ngặt..."*, nhưng thực tế Phần III chứa **6 sơ đồ** (Mục 3.2 bao gồm cả sơ đồ 3.2.A Sequence và 3.2.B Flowchart). Cần chuẩn hóa lại thành "Tất cả 6 sơ đồ dưới đây".
2. **Sai lệch luồng phản hồi trong Sơ đồ 6 (Doc 1:593):** Sơ đồ vẽ `WebBFF-->>Repo: Phản hồi thành công { success: true, id: cuid }` và `Repo->>LocalRoom: Cập nhật serverId = newServerGradeId`.
   - **Thực tế codebase:** Route `POST /api/grades` (dòng 144 của `app/api/grades/route.ts`) phản hồi `{ grade }` (HTTP 201).
   - Hàm `syncAllGradesToServer` trong `GradeRepository.kt:610-653` không phân tích `serverId` để cập nhật lại vào Room DB, mà việc chống trùng lặp dựa trên khóa kết hợp ở chiều tải về (Download direction). Sơ đồ đang mô tả phiên bản lý tưởng hóa thay vì hành vi code thực tế.

---

### 2.2. Trụ Cột 2: Đối Soát Dẫn Chứng Dòng Code & Đường Dẫn Tệp (Line Citations & File Paths)

#### Phương pháp thực nghiệm:
Xây dựng script kiểm tra tự động `scripts/verify_deep_citations.py` quét toàn bộ 45 trích dẫn số dòng code dạng `tệp:dòng` và bảng ma trận trong cả 2 tài liệu, kiểm tra sự tồn tại của tệp, tổng số dòng và nội dung mã nguồn thực tế.

#### Kết quả tổng hợp:
- **Tổng số trích dẫn kiểm tra:** **45**
- **Trích dẫn chính xác hoàn toàn:** **38 / 45** (84.4%)
- **Số điểm sai lệch phát hiện:** **7 / 45** (15.6%)

#### Bảng chi tiết các sai lệch cần khắc phục (Defects Found):

| STT | Vị trí tài liệu | Trích dẫn trong tài liệu | Thực tế trong Codebase | Đánh giá & Rủi ro |
|:---:|:---|:---|:---|:---|
| **1** | **Doc 2 (Dòng 988)** | `lib/prisma.ts:49-51` (Bảng hiệu năng) | Tệp `lib/prisma.ts` chỉ có **39 dòng**! Khối thiết lập WAL nằm ở dòng 15–17. | **CRITICAL:** Trích dẫn dòng vượt quá giới hạn tệp (Hallucinated line range). |
| **2** | **Doc 1 (Dòng 256)** | `lib/api-guard.ts (84 dòng)` | Tệp `lib/api-guard.ts` thực tế có **109 dòng**. | **MINOR:** Dòng 13–84 chỉ là logic `checkRateLimit`, dòng 86–108 là `guardAiRoute`. |
| **3** | **Doc 1 (Dòng 739)** | `lib/api-guard.ts` \| Dòng 13-84 (gồm HTTP 429) | HTTP 429 nằm ở dòng **90–105** trong hàm `guardAiRoute`, không nằm trong khoảng 13–84. | **MEDIUM:** Dẫn chứng số dòng không chứa đoạn mã HTTP 429 như mô tả. |
| **4** | **Doc 2 (Dòng 109)** | `AndroidManifest.xml:17` | Thiếu đường dẫn đầy đủ: `android_app/app/src/main/AndroidManifest.xml:17`. | **LOW:** Đường dẫn bị cụt tiền tố thư mục. |
| **5** | **Doc 2 (Dòng 19, 145)**| `CameraScanScreen.kt:964-974` | Nội dung đúng chính xác hàm xoay EXIF, nhưng thiếu tiền tố `android_app/app/src/main/java/com/example/ui/screens/`. | **LOW:** Đường dẫn tệp bị rút gọn. |
| **6** | **Doc 2 (Dòng 145)** | `PhotoBoundingBoxViewer.kt:513-555` | Nội dung đúng chính xác thuật toán chuẩn hóa BBox, nhưng thiếu tiền tố `android_app/app/src/main/java/com/example/ui/components/`. | **LOW:** Đường dẫn tệp bị rút gọn. |
| **7** | **Doc 2 (Dòng 459)** | `yolo_detector.py:115-143` | Nội dung đúng chính xác thuật toán gom dòng, nhưng thiếu tiền tố `python_service/`. | **LOW:** Đường dẫn tệp bị rút gọn. |

---

### 2.3. Trụ Cột 3: Tính Đồng Nhất Schema DTO (DTO Schema Consistency)

#### Phương pháp thực nghiệm:
Đối chiếu từng trường dữ liệu giữa:
- Schema mô tả trong Doc 2 (Mục 5.1 đến 5.5).
- Route Handler trong Next.js (`app/api/**/route.ts`).
- Data class Moshi trong Kotlin Android (`android_app/app/src/main/java/com/example/data/api/GradeApiModels.kt`).

#### Bảng đối soát các Endpoint then chốt:

| Endpoint | Schema trong Doc 2 | Codebase Thực tế | Mức độ Đồng nhất | Ghi chú & Sai lệch |
|:---|:---|:---|:---:|:---|
| `POST /api/mobile/grade` (Request) | 10 trường (`imageBase64`, `studentGrade`, `studentName`...) | `GradeApiRequest` (12 trường) | **ĐỒNG NHẤT** | Moshi có thêm `studentId`, `classId` (optional, server bỏ qua). |
| `POST /api/mobile/grade` (Response) | `GradeApiResponse` (15 trường) | `GradeApiResponse` (15 trường) | **100% PARITY** | Khớp hoàn toàn cả 15 trường và tọa độ `rel_x1`, `rel_y1`, `rel_w`, `rel_h`. |
| `POST /api/grades` (Request) | `ServerGradeSyncRequest` | `ServerGradeSyncRequest` | **100% PARITY** | `scoreNum` không gửi lên từ client, server tự tính (Single Source of Truth). |
| `POST /api/grades` (Response) | Chưa ghi rõ cấu trúc | `{"grade": Grade}` (HTTP 201) | **LỆCH NHẸ** | Doc 1 mô tả `{ success: true, id }`, thực tế trả về `{ grade }`. |
| `POST /api/dictation/generate` (Response) | `{"title", "content", "difficultWords", "summary"}` | `{"success": true, "passage": {...}}` | **LỆCH SCHEMA** | **Doc 2 thiếu đối tượng bọc ngoài `passage`**. Moshi (`GeneratePassageResponse`) yêu cầu bọc trong `passage`. |
| `GET /api/classes` (Response) | Danh mục lớp | `{"classes": [ClassItem]}` | **100% PARITY** | Khớp các trường `studentCount`, `teacherName`. |
| `GET /api/users` (Response) | Danh sách người dùng | `{"users": [StudentItem]}` | **100% PARITY** | Khớp lọc theo `role=student`. |

---

### 2.4. Trụ Cột 4: Xử Lý Biên & Mã Trạng Thái HTTP (Edge Cases & Error Handling)

#### Kết quả đối soát Bảng Mã HTTP (Doc 2 Mục 5.6):
1. **HTTP 429 Too Many Requests:**
   - Cấu trúc phản hồi: `{"error": "Quá nhiều yêu cầu gọi AI...", "retryAfter": N}`
   - Headers: `Retry-After: N`, `X-RateLimit-Limit: 30`, `X-RateLimit-Remaining: 0`
   - **Kết luận:** **ĐÚNG 100%** so với mã nguồn `lib/api-guard.ts:91-105`.
2. **HTTP 400 Bad Request:**
   - Doc 2 ghi `{"error": "Thiếu thông tin..."}`.
   - Tại `app/api/mobile/grade/route.ts:373`, phản hồi trả về `{ "status": "error", "error": "Cần cung cấp ảnh (imageBase64)" }`.
3. **HTTP 403 Forbidden:**
   - Doc 2 chỉ nêu trường hợp sai `ADMIN_SECRET_KEY`.
   - Trong `app/api/auth/login/route.ts:36`, HTTP 403 còn được dùng khi tài khoản bị khóa: `{"error": "Tài khoản đã bị vô hiệu hóa"}`.
4. **HTTP 409 Conflict (Thiếu trong tài liệu):**
   - Trong `app/api/auth/admin-register/route.ts:58`, server trả về HTTP 409 khi trùng username: `{"error": "Tên đăng nhập đã tồn tại..."}`. Bảng Mục 5.6 chưa liệt kê mã 409 này.
5. **HTTP 503 Service Unavailable:**
   - Được định nghĩa chính xác khi các kênh AI/OCR gặp sự cố (Doc 2 Mục 5.6 & `app/api/mobile/grade/route.ts:521`).

---

## 3. ĐỀ XUẤT HIỆU CHỈNH CỤ THỂ (ACTIONABLE PATCH PROPOSALS)

Để đưa bộ 2 tài liệu đặc tả đạt trạng thái hoàn hảo 100% không tì vết, đề xuất các sửa đổi sau:

### Đề xuất 1: Sửa trích dẫn `lib/prisma.ts` trong Doc 2
- **Tại dòng 988 của Doc 2:**
  - *Hiện tại:* `lib/prisma.ts:49-51`
  - *Thay bằng:* `lib/prisma.ts:15-17` (hoặc `lib/prisma.ts:7-22`)

### Đề xuất 2: Sửa mô tả độ dài và số dòng `lib/api-guard.ts` trong Doc 1
- **Tại dòng 256 của Doc 1:**
  - *Hiện tại:* `lib/api-guard.ts (84 dòng)`
  - *Thay bằng:* `lib/api-guard.ts (109 dòng)`
- **Tại dòng 739 của Doc 1:**
  - *Hiện tại:* `Dòng 13-84`
  - *Thay bằng:* `Dòng 13-105` (bao quát cả hàm `checkRateLimit` và `guardAiRoute` trả về HTTP 429)

### Đề xuất 3: Chuẩn hóa đường dẫn đầy đủ trong Doc 2
- Đổi `AndroidManifest.xml:17` $\to$ `android_app/app/src/main/AndroidManifest.xml:17`
- Đổi `CameraScanScreen.kt:964-974` $\to$ `android_app/app/src/main/java/com/example/ui/screens/CameraScanScreen.kt:964-974`
- Đổi `PhotoBoundingBoxViewer.kt:513-555` $\to$ `android_app/app/src/main/java/com/example/ui/components/PhotoBoundingBoxViewer.kt:513-555`
- Đổi `yolo_detector.py:115-143` $\to$ `python_service/yolo_detector.py:115-143`

### Đề xuất 4: Hiệu chỉnh Response Schema của `/api/dictation/generate` trong Doc 2
- **Tại dòng 597 của Doc 2:**
  - *Hiện tại:* `{"title", "content", "difficultWords", "summary"}`
  - *Thay bằng:* `{"success": true, "passage": {"title", "content", "difficultWords", "summary", "gradeLevel", "topic", "source"}}`

### Đề xuất 5: Chuẩn hóa số lượng sơ đồ và chú thích Sơ đồ 6 trong Doc 1
- **Tại dòng 333 của Doc 1:** Cập nhật *"Tất cả 6 sơ đồ dưới đây..."*.
- **Tại Sơ đồ 6 (dòng 593):** Ghi chú rõ phản hồi là `{ grade }` (HTTP 201), và cơ chế khử trùng lặp Room DB hoạt động ở chiều Download dựa trên khóa kết hợp `studentName_essayTitle_className`.

### Đề xuất 6: Bổ sung mã HTTP 409 vào Bảng Mục 5.6 của Doc 2
- Thêm dòng: `| 409 Conflict | Tên đăng nhập đã tồn tại trong CSDL | {"error": "Tên đăng nhập đã tồn tại..."} |`.

---

## 4. KẾT LUẬN CUỐI CÙNG

Cả hai bản tài liệu `01_Tong_Quan_Kien_Truc_He_Thong_ViHandGrade.md` và `02_Dac_Ta_Ky_Thuat_End2End_ViHandGrade.md` có chất lượng học thuật và sư phạm xuất sắc, mô tả chân thực và toàn diện hệ sinh thái ViHand Grade. 100% các sơ đồ Mermaid đều vượt qua kiểm chuẩn cú pháp trong trình duyệt thực tế.

Tuy nhiên, do nguyên tắc khắt khe của **Empirical Challenger** (*"Do NOT trust claims without reproduction"*), các lỗi số dòng và schema bọc ngoài đã được ghi nhận bằng chứng rõ ràng. Sau khi áp dụng 6 đề xuất hiệu chỉnh nêu trên, bộ tài liệu sẽ đạt chuẩn nghiệm thu 100% tuyệt đối.
