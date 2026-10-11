# BÁO CÁO GIÁM SÁT TOÀN VẸN VÀ KIỂM ĐỊNH TẬP TRUNG (FORENSIC AUDIT REPORT)
**Dự án**: ViHand Grade — Hệ sinh thái Chấm điểm & Đánh giá Sư phạm Chữ viết tay Tiểu học  
**Đối tượng Giám định**: Bộ 2 Tài liệu Đặc tả Kiến trúc và Kỹ thuật Toàn diện Hệ thống  
**Thời điểm Giám định**: 2026-10-06T00:05:00Z  
**Kiểm định viên (Auditor)**: `auditor_forensic_2`  
**Chế độ Kiểm định (Integrity Mode)**: `development` (Theo `ORIGINAL_REQUEST.md:82`)  
**Phán quyết Cuối cùng (Verdict)**: **CLEAN** (Hoàn toàn trung thực, đạt chuẩn 100% không vi phạm)

---

## 1. TỔNG QUAN PHẠM VI GIÁM ĐỊNH (AUDIT SCOPE & METHODOLOGY)

Kiểm định viên tiến hành rà soát độc lập, đối soát chứng từ thực nghiệm và phân tích mã nguồn đối với hai văn kiện đặc tả kỹ thuật chính thức:
1. `01_Bao_cao_Nghien_cuu/Tai_lieu_Bao_cao/03_Dac_Ta_Kien_Truc_He_Thong/01_Tong_Quan_Kien_Truc_He_Thong_ViHandGrade.md` (76,351 bytes, 763 dòng)
2. `01_Bao_cao_Nghien_cuu/Tai_lieu_Bao_cao/03_Dac_Ta_Kien_Truc_He_Thong/02_Dac_Ta_Ky_Thuat_End2End_ViHandGrade.md` (67,023 bytes, 1,009 dòng)

### Phương pháp Luận Giám định:
- **Trust Nothing — Verify Everything**: Không chấp nhận các khẳng định một chiều; toàn bộ thông số, đường dẫn tệp, số dòng mã, lược đồ CSDL và kết quả kiểm thử đều phải được đối chiếu trực tiếp với mã nguồn vật lý và thực thi độc lập.
- **2-Phase Investigation**:
  - Phase 1 (Mode-Agnostic): Quét tìm tất cả các mẫu cấm kỵ (Hardcoded outputs, Facade implementations, Pre-populated artifacts, Fabricated citations).
  - Phase 2 (Mode-Specific Flagging): Áp dụng chuẩn `development` mode theo `ORIGINAL_REQUEST.md` (phát hiện và veto triệt để mọi hành vi gian lận dữ liệu, tạo văn bản giả mạo, hoặc trích dẫn ảo giác).

---

## 2. KẾT QUẢ ĐỐI SOÁT CÁC MẪU CẤM KỴ (PROHIBITED PATTERNS CHECK)

| # | Mẫu Cấm Kỵ (Prohibited Pattern) | Trạng Thái | Bằng Chứng Thực Nghiệm |
|---|---|:---:|---|
| 1 | **Hardcoded test results** (Kết quả test giả định/gắn cứng) | **PASS (CLEAN)** | Không có chuỗi test giả mạo; toàn bộ 23 test cases Android khớp chính xác từng mili-giây với báo cáo HTML thực tế của Gradle. Kết quả `npx tsc --noEmit` đạt 0 lỗi biên dịch qua thực thi trực tiếp. |
| 2 | **Facade implementations** (Văn bản rỗng/hình thức/TODO/TBD) | **PASS (CLEAN)** | Quét tự động toàn bộ 1,772 dòng tài liệu: 0 xuất hiện `TODO`, `FIXME`, `TBD`, `LOREM IPSUM`, `PLACEHOLDER`, `DUMMY`, `CHƯA CẬP NHẬT`. Mọi phần đều được viết sâu sắc, giàu chi tiết kỹ thuật. |
| 3 | **Fabricated verification outputs** (Tài liệu/chứng từ ngụy tạo) | **PASS (CLEAN)** | Tệp ảnh kiểm thử thực nghiệm `02_Kich_ban_Thuc_nghiem/tien_xu_ly_anh/err_01/00_anh_goc.jpg` (152,543 bytes) và kích thước tệp APK `app-debug.apk` (26,617,394 bytes) khớp chính xác 100% đến từng byte trên đĩa cứng. |
| 4 | **Self-certifying / Circular tests** (Kiểm thử vòng lặp tự chứng thực) | **PASS (CLEAN)** | Các bài kiểm thử độc lập đo lường hành vi thực tế trên JVM / Robolectric và Next.js BFF Gateway. |
| 5 | **Execution delegation** (Ủy thác sai lệch) | **PASS (CLEAN)** | Không phát hiện hành vi vi phạm ủy thác. |

---

## 3. KIỂM ĐỊNH ĐỘ XÁC THỰC CỦA 6 PATCHES SỬA LỖI (PATCH AUTHENTICITY AUDIT)

Kiểm định viên đã đối chiếu độc lập từng bản vá do `worker_doc_writer_2` thực hiện so với mã nguồn thực tế:

### Patch 1: Cấu hình WAL Mode trong `lib/prisma.ts`
- **Tài liệu**: Document 2 cập nhật trích dẫn tại bảng tổng kết Concurrency về `lib/prisma.ts:15-17` (thay vì dòng 49-51 trước đây).
- **Mã nguồn thực tế**:
  ```typescript
  // lib/prisma.ts (tổng 39 dòng)
  15:     await client.$queryRawUnsafe("PRAGMA journal_mode = WAL;")
  16:     await client.$queryRawUnsafe("PRAGMA busy_timeout = 5000;")
  17:     await client.$queryRawUnsafe("PRAGMA synchronous = NORMAL;")
  ```
- **Kết luận**: **CHÍNH XÁC 100%**.

### Patch 2: Số dòng & Phạm vi Rate Limiter trong `lib/api-guard.ts`
- **Tài liệu**: Document 1 cập nhật số dòng thành `109 dòng` (dòng 256) và phạm vi logic thành `Dòng 13-105` (dòng 739).
- **Mã nguồn thực tế**:
  - Tổng số dòng của `lib/api-guard.ts`: 109 dòng.
  - Dòng 13: `const rateLimitStore = new Map<string, RateLimitRecord>()`.
  - Dòng 86: `export function guardAiRoute(req: NextRequest, maxRequestsPerMinute = 30): NextResponse | null`.
  - Dòng 105: Đóng khối `if (!rateResult.allowed)`.
- **Kết luận**: **CHÍNH XÁC 100%**.

### Patch 3: Cấu trúc Response Payload `POST /api/dictation/generate`
- **Tài liệu**: Document 2 dòng 597 cập nhật DTO thành `{"success": true, "passage": {"title", "content", "difficultWords", "summary", "gradeLevel", "topic", "source"}}`.
- **Mã nguồn thực tế**:
  - `app/api/dictation/generate/route.ts:130-141` trả về `{ success: true, passage: { title, content, difficultWords, summary, gradeLevel, topic, source } }`.
  - `android_app/.../GradeApiModels.kt:225-229`: `data class GeneratePassageResponse(@Json(name = "success") val success: Boolean? = true, @Json(name = "passage") val passage: GeneratedPassageData? = null, ...)`.
- **Kết luận**: **CHÍNH XÁC 100%**.

### Patch 4: Chuẩn hóa Đường dẫn Kho lưu trữ & Tên NetworkClient
- **Tài liệu**: Document 2 chuẩn hóa toàn bộ các đường dẫn tương đối đầy đủ và cập nhật tên client mạng thành `NetworkClient.kt`.
- **Mã nguồn thực tế**:
  - `android_app/app/src/main/AndroidManifest.xml:17` -> `android:usesCleartextTraffic="true"`.
  - `android_app/app/src/main/java/com/example/ui/screens/CameraScanScreen.kt:964-974` -> `imageCapture?.takePicture`, xử lý EXIF `rotationDegrees`.
  - `android_app/app/src/main/java/com/example/ui/components/PhotoBoundingBoxViewer.kt:513-555` -> Thuật toán kẹp tọa độ `safeRelX, safeRelY, safeRelW, safeRelH`.
  - `python_service/yolo_detector.py:115-143` -> Thuật toán gom dòng Vertical Overlap.
  - `android_app/app/src/main/java/com/example/data/api/NetworkClient.kt` -> Tệp thực tế (46 dòng), thay vì tên cũ `ApiClient.kt`.
- **Kết luận**: **CHÍNH XÁC 100%**.

### Patch 5: Đồng bộ Số lượng Sơ đồ Mermaid trong Phần 3 của Tài liệu 1
- **Tài liệu**: Document 1 dòng 333 cập nhật thành `"Tất cả 6 sơ đồ dưới đây..."`.
- **Thực tế tài liệu**: Phần 3 chứa chính xác 6 khối ````mermaid` độc lập:
  1. `3.1. Sơ đồ Kiến trúc Tổng quan 4 Tầng Hệ thống (graph TD - 53 dòng)`
  2. `3.2.A. Sơ đồ Tuần tự Quyết định Định tuyến Thông minh (sequenceDiagram - 41 dòng)`
  3. `3.2.B. Sơ đồ Khối Điều kiện Rẽ nhánh (flowchart TD - 21 dòng)`
  4. `3.3. Sơ đồ Quy trình Nghiệp vụ 1: Luồng Chấm điểm OCR Chữ viết tay Tự động (sequenceDiagram - 42 dòng)`
  5. `3.4. Sơ đồ Quy trình Nghiệp vụ 2: Luồng Luyện viết Chính tả Sư phạm & TTS (flowchart TD - 42 dòng)`
  6. `3.5. Sơ đồ Quy trình Nghiệp vụ 3: Luồng Đồng bộ Sổ điểm & Sổ tay Từ khó (sequenceDiagram - 49 dòng)`
- **Kết luận**: **CHÍNH XÁC 100%**.

### Patch 6: Bổ sung Mã Trạng thái HTTP 409 Conflict
- **Tài liệu**: Document 2 bổ sung hàng `409 Conflict` tại bảng Section 5.6: `| 409 Conflict | Trùng username đã tồn tại trong CSDL (app/api/auth/admin-register/route.ts:58) | {"error": "Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác."} |`.
- **Mã nguồn thực tế**:
  - `app/api/auth/admin-register/route.ts:54-59`: `if (existing) { return NextResponse.json({ error: "Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác." }, { status: 409 }) }`.
- **Kết luận**: **CHÍNH XÁC 100%**.

---

## 4. ĐỐI SOÁT CHI TIẾT CÁC TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA AUDIT)

### Tiêu chí 1: Vị trí tệp và Cấu trúc thư mục
- Cả hai tệp đều nằm chính xác tại:
  `01_Bao_cao_Nghien_cuu/Tai_lieu_Bao_cao/03_Dac_Ta_Kien_Truc_He_Thong/`
- Không có tệp rác, không lưu sai đường dẫn.
- **Đánh giá**: **PASS**.

### Tiêu chí 2: Nội dung Tài liệu 1 (Tổng quan Kiến trúc Hệ thống)
- Chứa đầy đủ bối cảnh giáo dục tiểu học Thông tư 27/2020/TT-BGDĐT và GDPT 2018.
- Kiến trúc tổng thể 4 tầng (Client Mobile/Web, Gateway BFF, AI Microservices Core, Database & Edge Computing).
- Mô hình Hybrid Edge-Cloud & Zero-Token offline fallback.
- Quy chuẩn 3 luồng dữ liệu nghiệp vụ cốt lõi (Chấm điểm OCR, Luyện viết chính tả sư phạm Neural TTS, Sổ tay từ khó cá nhân hóa).
- Đánh giá chất lượng hệ thống: RBAC, Data Protection Nghị định 13/2023/NĐ-CP, UFW Firewall, Cloudflare Tunnel, SLA độ trễ.
- 6 sơ đồ Mermaid cú pháp chuẩn xác, hiển thị đầy đủ ngữ nghĩa luồng điều khiển.
- **Đánh giá**: **PASS**.

### Tiêu chí 3: Nội dung Tài liệu 2 (Đặc tả Kỹ thuật End-to-End)
- Chi tiết kỹ thuật từng tầng công nghệ: Android Jetpack Compose, Room DB v4, CameraX, Moshi, Retrofit2, Next.js 16 App Router, Prisma ORM WAL mode, FastAPI Python, YOLOv8, ViT5 Dynamic INT8, Qwen 2.5 SLM, Edge-TTS.
- Toàn bộ DTOs và API payloads (`/api/mobile/grade`, `/api/dictation/*`, `/api/grades/*`, `/api/users`, `/api/classes`).
- Lược đồ CSDL:
  - Room DB v4: 3 thực thể (`GradeRecordEntity` 18 cột, `ClassEntity`, `StudentEntity`).
  - Prisma SQLite: 6 thực thể (`User`, `Class`, `Grade`, `DictationSession`, `DictationLog`, `TextbookPassage`) kèm sơ đồ quan hệ ERD Mermaid 80 dòng.
  - Ma trận ánh xạ thực thể (Entity Mapping Matrix) 14 thuộc tính giữa Prisma và Room DB v4.
- Luồng xử lý hình ảnh $\to$ Bounding Box $\to$ Điểm số TT27 được phân tích chi tiết toán học và thuật toán (Vertical Overlap, Co-transformation 2 lớp trong Compose, Safe Clamping).
- **Đánh giá**: **PASS**.

### Tiêu chí 4: Tính Trung thực và Tuyệt đối Không Ảo giác (Zero Assumed Metrics)
Kiểm định viên đã kiểm tra chéo các thông số kỹ thuật then chốt:
1. **Dung lượng APK**: `26,617,394 bytes` (~25.38 MB) -> Khớp chính xác với kích thước tệp `android_app/app/build/outputs/apk/debug/app-debug.apk` trên đĩa.
2. **Kiểm thử Android**: `23/23 tests Passed`, thời gian `1m 50.57s` -> Khớp chính xác từng con số trong `android_app/app/build/reports/tests/testDebugUnitTest/index.html`.
3. **Kiểm thử TypeScript**: `npx tsc --noEmit` -> Thực thi trực tiếp trong môi trường kiểm định, trả về Exit Code 0, Zero Compiler Errors.
4. **Cấu hình Swap & Kernel**: `SWAP_SIZE=3072`, `vm.swappiness=20` -> Khớp chính xác `03_Scripts_Trien_khai/rpi4/00_init_system.sh:39, 63`.
5. **Cấu hình CGroups Systemd**: `MemoryHigh=2000M` (Python) và `MemoryHigh=1600M` (Web) -> Khớp chính xác các file mẫu dịch vụ trong `03_Scripts_Trien_khai/shared/`.
6. **Benchmark ViT5**: `| ChamDenTimEm ViT5 | 1.047.6 | 234.8 | 1.002.1 |` -> Khớp chính xác bảng thực nghiệm dòng 47 trong `02_Kich_ban_Thuc_nghiem/benchmark/benchmark_results/benchmark_20260622_152534.md`.

---

## 5. BẢNG TỔNG HỢP KẾT QUẢ KIỂM TOÁN (AUDIT SUMMARY MATRIX)

| Hạng Mục Kiểm Tra | Tiêu Chí Đánh Giá | Kết Quả Thực Tế | Trạng Thái |
|---|---|---|:---:|
| **Vị trí tệp** | Nằm trong thư mục chỉ định | 2/2 file đúng thư mục | **PASS** |
| **Quy mô tài liệu** | Toàn diện, đầy đủ | Doc 1: 76KB (763 dòng), Doc 2: 67KB (1,009 dòng) | **PASS** |
| **Sơ đồ Mermaid** | Cú pháp chuẩn, đầy đủ luồng | 7 sơ đồ (6 Doc 1 + 1 Doc 2), 0 lỗi cú pháp | **PASS** |
| **Lược đồ CSDL** | Khớp Room DB v4 và Prisma | Room v4 (18 cột) + Prisma (6 model) khớp 100% | **PASS** |
| **Hợp đồng API** | Request / Response / Status codes | Khớp route handlers và DTOs thực tế | **PASS** |
| **Truy xuất nguồn mã** | Không trích dẫn ảo giác | Toàn bộ đường dẫn và dòng mã tồn tại thật | **PASS** |
| **6 Bản vá của Worker** | Khắc phục triệt để các sai lệch | Cả 6 bản vá đều xác thực 100% | **PASS** |
| **Kiểm định mã cấm kỵ** | Không chứa dữ liệu giả mạo | 0 vi phạm (Zero placeholder, Zero fabrication) | **PASS** |

---

## 6. PHÁN QUYẾT CHÍNH THỨC (FINAL VERDICT)

Căn cứ vào toàn bộ kết quả kiểm toán thực nghiệm, đối chiếu mã nguồn và phân tích chứng từ:

$$\text{KẾT LUẬN CUỐI CÙNG: } \mathbf{CLEAN}$$

Bộ hai tài liệu đặc tả kiến trúc và kỹ thuật của hệ sinh thái **ViHand Grade** đạt mức độ hoàn thiện cao nhất, trung thực tuyệt đối với mã nguồn thực tế của dự án, tuân thủ nghiêm ngặt chuẩn mực công nghệ và phương pháp luận kiểm thử sư phạm. Không có bất kỳ vi phạm tính toàn vẹn nào.
