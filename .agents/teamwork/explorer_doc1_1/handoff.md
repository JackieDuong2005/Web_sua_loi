# BÁO CÁO BÀN GIAO (HANDOFF REPORT) — EXPLORER DOC 1

- **Người thực hiện:** Teamwork Explorer (`explorer_doc1_1`)
- **Vai trò:** Chuyên gia Thiết kế Kiến trúc Hệ thống & Mermaid Blueprints (System Architecture Design & Mermaid Blueprints)
- **Tài liệu mục tiêu:** `01_Bao_cao_Nghien_cuu/Tai_lieu_Bao_cao/03_Dac_Ta_Kien_Truc_He_Thong/01_Tong_Quan_Kien_Truc_He_Thong_ViHandGrade.md`
- **Sản phẩm bàn giao:** `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_doc1_1\blueprint.md`
- **Thời điểm hoàn thành:** 2026-10-05T15:45:00Z

---

## 1. OBSERVATION (QUAN SÁT THỰC TẾ)

Dựa trên việc đọc và khảo sát trực tiếp các báo cáo kỹ thuật và mã nguồn dự án:
1. **Kiến trúc Android Native Client (`android_app/`):**
   - Định cấu hình tại `android_app/app/build.gradle.kts`: `compileSdk = 36`, `minSdk = 24`, `targetSdk = 36`, Application ID `vn.edu.tdtu.vihandgrade`.
   - Cơ chế co-transformation trong `PhotoBoundingBoxViewer.kt:145-150` và `422-443`: Bọc cả ảnh bài thi và lưới Bounding Box trong cùng một `graphicsLayer { scaleX = scale; scaleY = scale; translationX = offsetX; translationY = offsetY }`, hỗ trợ cử chỉ 2 ngón tay `detectTransformGestures` phóng to từ $1.0\times$ đến $4.0\times$.
   - Cơ sở dữ liệu Room v4 tại `AppDatabase.kt:12-16`: Database version 4, thực thể `GradeRecordEntity` (bổ sung cột `serverId`), `ClassEntity`, `StudentEntity`.
   - Kết quả kiểm thử tự động tại `android_app/app/build/reports/tests/testDebugUnitTest/index.html`: **23/23 Tests Passed (100%)** trên môi trường Robolectric SDK 36 Pixel 8.
2. **Kiến trúc Next.js 16 Web Studio & BFF Gateway (`app/`):**
   - App Router với 24 route handlers độc lập, không dùng Server Actions.
   - Endpoint All-in-one cho Android tại `app/api/mobile/grade/route.ts:347-524`: Tích hợp bộ lọc tần suất `guardAiRoute(req, 20)`, chạy song song `runGeminiOCR` và `detectYoloBoxes`, gọi in-process trực tiếp `handleGradePost` của `app/api/grade/route.ts:225-240`.
   - Cơ chế SQLite WAL và busy timeout tại `lib/prisma.ts:7-22`: `PRAGMA journal_mode = WAL;`, `PRAGMA busy_timeout = 5000;`, `PRAGMA synchronous = NORMAL;`.
   - Tách tệp ảnh vật lý ra đĩa tại `app/api/grades/route.ts:10-29`: Lưu file ảnh tại `public/uploads/grades/...`, để rỗng cột `imageBase64` trong DB.
   - Cơ chế bảo vệ quyền riêng tư trẻ em theo Nghị định 13/2023/NĐ-CP tại `app/api/admin/retention/route.ts:66-187`: Gán `expiresAt = +365 ngày`, Soft purge xóa ảnh vật lý và ẩn danh hóa tên `isAnonymized = true`.
3. **Kiến trúc Python AI Core (`python_service/`):**
   - FastAPI server chạy tại cổng `8000` (`python_service/main.py:1871-1874`).
   - YOLOv8 Word Detector tại `python_service/yolo_detector.py:115-143`: Thuật toán gom dòng Vertical Overlap (ngưỡng 0.40), kích thước ảnh `imgsz = 640`, tọa độ tương đối $[0.0, 1.0]$.
   - Động cơ sửa lỗi chính tả ViT5 (`python_service/main.py:97-110, 406-438`): Dynamic INT8 Quantization, Prose chunking $\le 160$ ký tự, Levenshtein Syllable Matcher phân loại 6 nhóm lỗi ngữ âm (`phu_am_dau`, `dau_thanh`, `van`, `am_chinh`, `phu_am_cuoi`, `viet_hoa`).
   - Mô hình Qwen 2.5-0.5B-Instruct SLM (`python_service/main.py:921-987, 1050-1057`): Precision `bfloat16` (~577MB RAM), sinh 3 phương án nhận xét sư phạm theo Thông tư 27/2020/TT-BGDĐT.
   - Microsoft Edge-TTS (`python_service/main.py:1713-1757`): Giọng `vi-VN-HoaiMyNeural` & `NamMinhNeural`, tốc độ `rate = "-15%"`.
4. **Trạm Biên Edge Appliance & Mạng Bảo Mật (`03_Scripts_Trien_khai/`):**
   - Thiết lập Swap 3072MB tại `03_Scripts_Trien_khai/rpi4/00_init_system.sh:39-65` với `vm.swappiness = 20`.
   - Giới hạn CGroups trong systemd service templates: `vihand-python` (`MemoryMax=2500M`, `CPUQuota=90%`), `vihand-web` (`MemoryMax=2048M`, `CPUQuota=85%`).
   - Tường lửa UFW tại `03_Scripts_Trien_khai/rpi4/04_setup_network_firewall.sh:24-34`: Chặn cổng 8000 từ bên ngoài, chỉ mở cổng 3000 và 22.
   - Cloudflare Named Tunnel tại `03_Scripts_Trien_khai/rpi4/05_setup_cloudflare_tunnel.sh`: Tên miền `https://vihandgrade.click`, kết nối mã hóa outbound TLS không cần mở cổng modem.

---

## 2. LOGIC CHAIN (CHUỖI LẬP LUẬN TỪ QUAN SÁT ĐẾN THIẾT KẾ)

1. **Từ Quan sát 1 & 2:** Nhận thấy hệ thống có 2 nền tảng Client (Android Native Compose & Web Studio Next.js 16) cùng chia sẻ một cổng BFF trung gian `/api/mobile/grade` và `/api/grade`. Do đó, tài liệu kiến trúc Document 1 bắt buộc phải định hình rõ **Kiến trúc 4 Tầng (4-Tier Architecture)**:
   - Tầng 1: Client Mobile & Web Studio
   - Tầng 2: Cổng Giao tiếp AI BFF Gateway
   - Tầng 3: Lõi Trí tuệ Nhân tạo Đa Dịch vụ Microservices
   - Tầng 4: Cơ sở Dữ liệu & Trạm Tính toán Biên Edge Appliance.
2. **Từ Quan sát 2 & 3:** Nhận thấy có sự phân hóa rõ rệt trong nghiệp vụ đánh giá: Chế độ Chính tả bắt buộc có văn bản bài đọc chuẩn SGK (Ground Truth) để đối soát chuỗi 1-1 không ảo giác (`tokenCount = 0`), trong khi chế độ Tập làm văn cần chuỗi xử lý AI đa tầng (ViT5 sửa lỗi + Qwen SLM sinh lời phê). Do đó, Phần I của bản thiết kế đã hệ thống hóa hoàn chỉnh khung đánh giá theo **Thông tư 27/2020/TT-BGDĐT** (Đánh giá thường xuyên vs định kỳ, nhận xét định tính khích lệ, barem phân môn Chính tả 7đ-3đ và Tập làm văn 4đ-3đ-2đ-1đ).
3. **Từ Quan sát 3 & 4:** Nhận thấy trạm biên phần cứng (Raspberry Pi 4 4GB RAM) có giới hạn tài nguyên khắt khe. Các giải pháp kỹ thuật thực tế (Dynamic INT8, Swap 3072MB, Cgroups limits, Prose chunking $\le 160$ chars, YOLO imgsz=640) là những điểm sáng kỹ thuật mang tính sống còn. Do đó, Phần IV và Phần V đã quy hoạch chi tiết các thuộc tính chất lượng (Ngân sách độ trễ ~4s, Ngân sách bộ nhớ RAM 4GB, Ma trận dự phòng 3 cấp độ, An toàn dữ liệu trẻ em theo Nghị định 13/2023/NĐ-CP).
4. **Về Biểu đồ Mermaid:** Đã tổng hợp thành công 5 sơ đồ Mermaid hợp lệ, chuẩn xác và trực quan:
   - Sơ đồ 1: Tổng quan Kiến trúc 4 Tầng Hệ sinh thái (`graph TD`).
   - Sơ đồ 2: Mô hình Cộng tác Hybrid Edge-Cloud & Định tuyến Dự phòng Zero-Token (`sequenceDiagram` & `flowchart TD`).
   - Sơ đồ 3: Quy trình Nghiệp vụ Chấm điểm OCR Chữ viết tay Tự động (`sequenceDiagram`).
   - Sơ đồ 4: Quy trình Nghiệp vụ Luyện viết Chính tả Sư phạm & Âm thanh Neural TTS (`flowchart TD`).
   - Sơ đồ 5: Quy trình Nghiệp vụ Đồng bộ Sổ điểm & Sổ tay Từ khó Hai chiều (`sequenceDiagram`).

---

## 3. CAVEATS (GIỚI HẠN & ĐIỀU KIỆN BIÊN)

- Bản thiết kế này tập trung chuyên sâu vào **Tổng quan Kiến trúc Hệ thống (Document 1)**. Các chi tiết triển khai cấp mã nguồn chi tiết từng hàm, toàn bộ schema DTO JSON và mã nguồn các test case chuyên sâu sẽ được tài liệu kỹ thuật end-to-end (Document 2) kế thừa và mở rộng.
- Các biểu đồ Mermaid đã được thiết kế sử dụng các cú pháp tiêu chuẩn (`graph TD`, `flowchart TD`, `sequenceDiagram`), không sử dụng các tính năng thử nghiệm beta chưa ổn định nhằm bảo đảm tính tương thích tối đa với mọi engine Markdown (VS Code, GitHub, Docusaurus).

---

## 4. CONCLUSION (KẾT LUẬN & ĐÁNH GIÁ SẴN SÀNG)

Bản thiết kế đặc tả tổng quan kiến trúc hệ thống tại file:
`c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_doc1_1\blueprint.md`
đã hoàn thành **100% các tiêu chí nghiệm thu**:
1. Thể hiện đầy đủ bối cảnh giáo dục tiểu học, chuyển đổi số và khung đánh giá sư phạm Thông tư 27/2020/TT-BGDĐT.
2. Mô tả chi tiết, mạch lạc toàn bộ Kiến trúc 4 Tầng của hệ thống ViHand Grade.
3. Chứa đầy đủ 5 sơ đồ Mermaid hợp lệ mô tả kiến trúc tổng thể, luồng định tuyến hybrid, và 3 quy trình nghiệp vụ cốt lõi.
4. Đặc tả rõ các thuộc tính chất lượng: An toàn thông tin trẻ em (Nghị định 13/2023), Tần suất truy cập (Sliding window rate limit), Tính sẵn sàng cao (Dự phòng đa tầng), Ngân sách độ trễ và bộ nhớ.
5. Thiết lập ma trận truy xuất nguồn mã 100% từ codebase thực tế và phương pháp xác thực PStack.

Bản blueprint này là căn cứ vững chắc, hoàn chỉnh để tác vụ kế tiếp biên soạn trực tiếp file tài liệu chính thức:
`01_Bao_cao_Nghien_cuu/Tai_lieu_Bao_cao/03_Dac_Ta_Kien_Truc_He_Thong/01_Tong_Quan_Kien_Truc_He_Thong_ViHandGrade.md`.

---

## 5. VERIFICATION METHOD (PHƯƠNG THỨC XÁC THỰC ĐỘC LẬP)

Để độc lập xác thực tính chính xác và đầy đủ của bản thiết kế:
1. **Kiểm tra tệp Blueprint:** Mở và đọc nội dung tệp `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_doc1_1\blueprint.md`.
2. **Kiểm tra tính hợp lệ cú pháp Mermaid:** Sử dụng trình xem Markdown hoặc Mermaid Live Editor để kiểm tra render 5 khối sơ đồ Mermaid trong tệp `blueprint.md`.
3. **Đối soát thông số thực tế với Codebase:**
   - Đối soát `android_app/app/build.gradle.kts:14, 18-19` (SDK 36, min SDK 24).
   - Đối soát `lib/prisma.ts:7-22` (WAL mode, busy timeout 5000ms).
   - Đối soát `python_service/main.py:97-110` (Dynamic INT8 ViT5).
   - Đối soát `03_Scripts_Trien_khai/rpi4/00_init_system.sh:39-65` (Swap 3072MB).
   - Đối soát `app/api/admin/retention/route.ts:66-187` (Nghị định 13/2023, 365 ngày).
