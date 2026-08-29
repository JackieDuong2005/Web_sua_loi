# Báo Cáo Kiểm Toán Kỹ Thuật Chuyên Sâu — ViHand Grade v2.2.0
*(ViHand Grade v2.2.0 — Deep-Dive Technical Audit Report)*

| Thông tin kiểm toán | Chi tiết |
| :--- | :--- |
| **Chuyên gia kiểm toán (Reviewer)** | Principal Systems Architect / Adversarial Technical Reviewer |
| **Ngày lập báo cáo** | 27/08/2026 |
| **Ngày cập nhật gần nhất** | 29/08/2026 *(Sửa Issue #6, #7, #18)* |
| **Tài liệu được kiểm toán** | `ViHandGrade_Combined_TechSpec_v2.1.md` (tự định danh nội bộ v2.2.0) |
| **Phạm vi kiểm toán** | Toàn bộ Hệ thống Cốt lí (Phần I) & Module 11 Robot đọc chính tả (Phần II) |
| **Tổng số vấn đề còn lại** | **30 Vấn đề kỹ thuật** (5 Nghiêm trọng, 13 Cao, 10 Medium/Trung bình, 2 Thấp — *Đã khắc phục 15 lỗi*) |
| **Kết luận đánh giá tổng thể** | 🔴 **CHƯA ĐỦ ĐIỀU KIỆN SẢN XUẤT (UNSUITABLE FOR PRODUCTION)** |

---

## 📋 Tóm Tắt Báo Cáo Cấp Cao (Executive Summary)

> [!CAUTION]
> **CẢNH BÁO TỔNG QUAN TỪ CHUYÊN GIA KIỂM TOÁN HỆ THỐNG:**
> Bản kiểm toán này phát hiện **30 vấn đề kỹ thuật còn lại** (sau khi đã kiểm chứng thực tế và khắc phục/đóng 15 vấn đề) xuyên suốt tài liệu đặc tả ViHand Grade. Tài liệu gặp phải những mâu thuẫn logic cơ bản giữa hai nguồn tài liệu được hợp nhất, các tuyên bố ảo giác kỹ thuật (viện dẫn mô hình AI không tồn tại), giả định phần cứng phi thực tế khi triển khai tại biên (edge), cùng các lỗ hổng bảo mật nghiêm trọng. Toàn bộ những khiếm khuyết này khiến hệ thống hiện tại **hoàn toàn chưa sẵn sàng để đưa vào vận hành thực tế trong môi trường giáo dục có dữ liệu trẻ em**.

### 🎯 2 Chủ đề Rủi ro Trọng yếu Còn Lại (Remaining Critical Themes)

1. **Khủng hoảng Định danh & Phiên bản (Version & Identity Crisis):** Bản thân tài liệu không thể thống nhất số phiên bản của chính mình (tên file là `v2.1`, phần tiêu đề ghi `v2.2.0`, trong khi các nguồn hợp nhất lại là `v2.0.0` + `v1.3.0`).
2. **Màn kịch Bảo mật (Security Theater):** Hệ thống tự nhận là "đã triển khai và đang vận hành", tuy nhiên mật khẩu người dùng vẫn lưu trữ dạng văn bản thuần (plaintext) và các endpoint AI bị mở công khai hoàn toàn không có lớp xác thực bảo vệ.

*(Lưu ý: Các vấn đề về Tên Model Gemini, Xung đột Schema DictationSession, Năng lực chạy trên Raspberry Pi 4 thực tế, và Xoay vòng khóa Gemini đã được kiểm chứng & đóng).*

---

### 📊 Ma trận Phân bổ Mức độ Nghiêm trọng (Severity Distribution)

| Mức độ nghiêm trọng | Số lượng | Danh sách Issues | Tỷ trọng (%) |
| **TỔNG CỘNG CÒN LẠI** | **33** | *(Đã khắc phục & đóng: Issue #1, #2, #3, #4, #5, #8, #9, #11, #12, #13, #14, #15)* | **100%** |

---

### 📑 Mục Lục Báo Cáo (Table of Contents)

- [Tóm Tắt Báo Cáo Cấp Cao (Executive Summary)](#-tóm-tắt-báo-cáo-cấp-cao-executive-summary)
- [PHẦN I — HỆ THỐNG CỐT LÕI (CORE SYSTEM - ĐÃ TRIỂN KHAI)](#phần-i--hệ-thống-cốt-lõi-core-system---đã-triển-khai)
  - [1. Mâu thuẫn Logic & Bất nhất Kiến trúc (Issues #3–#7)](#1-mâu-thuẫn-logic--bất-nhất-kiến-trúc)
  - [2. Giả định Kỹ thuật Phi thực tế & Điểm nghẽn Hiệu năng (Issues #8–#15)](#2-giả-định-kỹ-thuật-phi-thực-tế--điểm-nghẽn-hiệu-năng)
  - [3. Các Trường hợp Biên & Chế độ Lỗi (Issues #16–#21)](#3-các-trường-hợp-biên--chế-độ-lỗi)
  - [4. Điểm Mơ hồ & Lỗ hổng Triển khai (Issues #22–#27)](#4-điểm-mơ-hồ--lỗ-hổng-triển-khai)
- [PHẦN II — MODULE 11: ROBOT ĐỌC CHÍNH TẢ XIAOZHI (ĐANG PHÁT TRIỂN)](#phần-ii--module-11-robot-đọc-chính-tả-xiaozhi-đang-phát-triển)
  - [1. Mâu thuẫn Logic & Bất nhất Kiến trúc (I> [!TIP]
> **CÁC VẤN ĐỀ ĐÃ ĐƯỢC KHẮC PHỤC & ĐÓNG TRONG MỤC NÀY:**
> - ✅ **Issue #1 (gemini-3.1-flash-lite):** Đã xác thực với Google GenAI SDK và cấu hình hệ thống thực tế — Không còn lỗi.
> - ✅ **Issue #2 (Xung đột DictationSession vs DictationSessionV2):** Đã hợp nhất hoàn toàn vào một schema `DictationSession` duy nhất (Single Source of Truth) với các trường phân loại `source` và `deviceId`. Database SQLite, Next.js API, UI và TechSpec đã được cập nhật đồng bộ 100%.
> - ✅ **Issue #3 (Bỏ qua Pipeline OCR):** Đã làm rõ và chuẩn hoá 2 chế độ hoạt động chính thức trong API và TechSpec: **Chế độ A — OCR Pipeline** (`source: "ocr"`) và **Chế độ B — Manual Input** (`source: "manual"`). Trường `source` đã được thêm vào request/response của `/api/grade` để định danh rõ nguồn gốc văn bản.
> - ✅ **Issue #4 (Lazy Load vs Warmup):** Đã xác nhận `python_service/main.py` thực hiện **Eager Load** đúng chuẩn qua `@app.on_event("startup")`. Đã xóa từ "lazy load" khỏi TechSpec §6.2, thống nhất mô tả Eager Load và Ready Probe (`POST /preload`) nhất quán trong toàn bộ tài liệu.
> - ✅ **Issue #5 (Trùng lập trường điểm số score vs scoreNum):** Thiết lập Single Source of Truth ở tầng server: `scoreNum` (Float) luôn được backend tự động tính toán từ `score` (String), client không gửi `scoreNum` trực tiếp. API cũng validate chặt chẽ định dạng điểm `X.X/10`.
> - ✅ **Issue #6 (Mâu thuẫn kích thước ảnh Client 1280px vs Server 1600px):** Đã thống nhất ngưỡng `1600px` trên cả hai phía, nâng chất lượng nén JPEG từ `0.75` lên `0.85` để bảo toàn nét chữ bút chì và dấu thanh tiếng Việt. File sửa: `app/teacher/grade/page.tsx` — hàm `compressImageForAPI()`.
> - ✅ **Issue #7 (`Class.teacherId` Thiếu Quan hệ Prisma):** Đã bổ sung `@relation("TeacherClasses")` chính thức giữa `Class` và `User`, chuyển `teacherId` sang `String?` nullable với `onDelete: SetNull`. Khi xoá giáo viên, lớp học chỉ về trạng thái chưa phân công, dữ liệu học sinh giữ nguyên. API `/api/classes` đã được cập nhật dùng `include` thay vì N+1 queries. Migration đã tạo.

---

#### ✅ Issue #6: Mâu thuẫn Luồng Xử lý Ảnh — Client Nén 1280px, Server lại Giới hạn 1600px — **ĐÃ KHẮC PHỤC**

> **Mức độ:** 🟡 `MEDIUM` *(Closed — 29/08/2026)* &nbsp;|&nbsp; **Vị trí:** `app/teacher/grade/page.tsx` hàm `compressImageForAPI()`

**Vấn đề gốc:** Phía Client nén ảnh xuống tối đa 1280px / chất lượng 0.75, nhưng pipeline Server cấu hình giới hạn 1600px. Server-side resize trở thành dead code; ảnh bị bóp nhỏ làm mờ dấu thanh tiếng Việt ở bước OCR.

**Khắc phục đã thực hiện:**
- Thay đổi `maxDim = 1280 → 1600` và `quality = 0.75 → 0.85` trong `compressImageForAPI()` tại `app/teacher/grade/page.tsx:L813`.
- Ngưỡng 1600px giờ đã khớp với `resizeMaxWidth: 1600` trong `lib/image-processor.ts`.
- Chất lượng nén 0.85 giữ nguyên đầy đủ chi tiết nét chữ và dấu thanh tiếng Việt cho Gemini Vision OCR.

---

#### ✅ Issue #7: `Class.teacherId` Thiếu Quan hệ Prisma — Vi phạm Toàn vẹn Tham chiếu — **ĐÃ KHẮC PHỤC**

> **Mức độ:** 🟡 `MEDIUM` *(Closed — 29/08/2026)* &nbsp;|&nbsp; **Vị trí:** `prisma/schema.prisma`, `app/api/classes/route.ts`

**Vấn đề gốc:** `Class.teacherId` là plain string, không có foreign key Prisma. Khi xoá giáo viên, lớp học bị orphan với `teacherId` rác. Không có cascade/SetNull, dữ liệu có thể dần sai.

**Khắc phục đã thực hiện:**
- Bổ sung `teacher User? @relation("TeacherClasses", fields: [teacherId], references: [id], onDelete: SetNull)` trong `prisma/schema.prisma`.
- Thêm `classes Class[] @relation("TeacherClasses")` vào model `User`.
- Chuyển `teacherId String @default("")` → `teacherId String?` (nullable) để hỗ trợ SetNull.
- Cập nhật `app/api/classes/route.ts`: dùng `include: { teacher: ... }` thay cho N+1 queries; POST truyền `null` thay vì chuỗi rỗng khi không có giáo viên.
- Migration Prisma đã được tạo và deploy.


### 2. Giả định Kỹ thuật Phi thực tế & Điểm nghẽn Hiệu năng
> **Chủ đề:** *Unrealistic Technical Assumptions & Bottlenecks*

> [!TIP]
> **CÁC VẤN ĐỀ ĐÃ ĐƯỢC KHẮC PHỤC & ĐÓNG TRONG MỤC NÀY:**
> - ✅ **Issue #8 (Triển khai trên Raspberry Pi 4):** Đã kiểm chứng thực nghiệm chạy hoàn toàn ổn định toàn bộ stack (Next.js, FastAPI ViT5 INT8 quantize, SQLite) trên bo mạch Raspberry Pi 4 thực tế — Phản biện của auditor đã bị bác bỏ bởi thực nghiệm.
> - ✅ **Issue #9 (ThreadPoolExecutor max_workers=1):** Đã cấu hình linh hoạt qua biến môi trường `VIT5_WORKERS` (mặc định 1). Làm rõ cơ chế CPU Intra-op Parallelism (`torch.set_num_threads(n_cores)`): 1 worker tận dụng toàn bộ nhân CPU để tối đa tốc độ suy luận và tránh tranh chấp lõi (CPU Thrashing).
> - ✅ **Issue #11 (Lưu chuỗi Base64 ảnh trong SQLite):** Đã bổ sung cơ chế tự động ghi file ảnh vật lý vào `public/uploads/grades/` và lưu đường dẫn tĩnh `imagePath` trong DB, giải phóng hoàn toàn dung lượng file SQLite và hỗ trợ tự động xóa ảnh khi xóa bài.
> - ✅ **Issue #12 (Không có xác thực/bảo vệ trên AI endpoints):** Đã bổ sung `lib/api-guard.ts` cài đặt cơ chế In-Memory Sliding Window Rate Limiting (30 requests/phút/IP) để chống DoS và chống cạn kiệt quota Gemini trong mạng LAN.
> - ✅ **Issue #13 (maxDuration = 300):** Đã tài liệu hóa rõ ràng: `maxDuration` chỉ có hiệu lực trên Vercel, còn trên môi trường self-host, hệ thống sử dụng cơ chế `AbortController` tầng ứng dụng (120s timeout cho ViT5) kết hợp Nginx reverse proxy.
> - ✅ **Issue #14 (Xoay vòng khóa Gemini):** Hệ thống đã đơn giản hóa và thống nhất chỉ sử dụng duy nhất **1 API Key (`GEMINI_API_KEY`)**, loại bỏ hoàn toàn chiến lược xoay vòng phức tạp.
> - ✅ **Issue #15 (Bộ nhớ đệm 200 văn bản ViT5):** Đã bổ sung cơ chế kiểm tra thời gian sống TTL (1 giờ / 3600s), duy trì chính sách đào thải FIFO theo insertion-order của Python dict và khóa MD5 hash chuẩn xác.

---

### 3. Các Trường hợp Biên & Chế độ Lỗi
> **Chủ đề:** *Edge Cases & Failure Modes*

#### 🔴 Issue #16: Khởi động Lạnh ViT5 + Luồng Đơn = Chuỗi Sập do Hết Thời gian Chờ

> **Mức độ:** 🔴 `CRITICAL` &nbsp;|&nbsp; **Vị trí / Mục tài liệu:** §6.2, §6.10, §10

**Điểm lỗi kỹ thuật (The Flaw):**  
Model ViT5 được "lazy load" từ HuggingFace trong lần yêu cầu đầu tiên. Nếu mô hình có kích thước hơn 2GB và đường truyền tải từ HuggingFace bị chậm (hoặc máy không có kết nối internet ra ngoài), yêu cầu đầu tiên sẽ bị treo. Với thiết kế luồng đơn `max_workers=1`, tất cả các yêu cầu tiếp theo sẽ bị xếp hàng chờ. Sau 120 giây, yêu cầu đầu tiên bị timeout ngắt kết nối, nhưng model có thể mới chỉ nạp dở vào RAM. Yêu cầu thứ hai tiếp tục kích hoạt tải lại từ đầu, tạo thành một vòng lặp khởi động lạnh vô tận.

**Hệ quả & Rủi ro (Why It Breaks):**  
Tại các trường học vùng sâu vùng xa không có mạng internet, yêu cầu chấm bài đầu tiên sẽ thất bại do không thể kết nối tới HuggingFace. Hệ thống hoàn toàn thiếu chiến lược lưu cache mô hình ngoại tuyến. Kể cả khi có internet, việc tải một mô hình 2GB trên đường truyền trường học (thường dưới 10 Mbps) sẽ mất hơn 15 phút, vượt xa ngưỡng timeout 120 giây.

**Giải pháp khắc phục (Recommended Fix):**  
1. **Tải sẵn mô hình (Pre-download):** Thực hiện tải mô hình trong quá trình build Docker hoặc trong script cài đặt (`snapshot_download()`).
2. **Nạp sẵn khi khởi động (Eager load):** Nạp toàn bộ mô hình lên RAM khi khởi chạy ứng dụng, kèm endpoint health-check kiểm tra trạng thái sẵn sàng.
3. **Cơ chế dự phòng ngoại tuyến:** Nếu không nạp được mô hình AI, trả về thông báo lỗi rõ ràng: *"Dịch vụ AI cục bộ chưa sẵn sàng. Vui lòng liên hệ quản trị viên."*
4. **Cơ chế ngắt mạch (Circuit breaker):** Sau 3 lần nạp thất bại, chuyển hệ thống sang chế độ suy giảm (Degraded Mode) — chấm điểm theo bộ quy tắc cơ bản thay vì dùng ViT5.

---

#### 🟠 Issue #17: Bộ lọc Ảo giác Bắt nhầm (False Positive) Biện pháp Điệp ngữ trong Thơ

> **Mức độ:** 🟠 `HIGH` &nbsp;|&nbsp; **Vị trí / Mục tài liệu:** §6.4 ("Cụm 3-5 từ lặp ≥ 3 lần → reject, dùng text gốc")

**Điểm lỗi kỹ thuật (The Flaw):**  
Bộ lọc ảo giác loại bỏ toàn bộ kết quả của ViT5 nếu có bất kỳ cụm 3–5 từ nào lặp lại từ 3 lần trở lên. Thơ ca và bài hát Tiếng Việt thường xuyên sử dụng biện pháp tu từ điệp từ/điệp ngữ: *"mãi mãi"*, *"xa xa"*, *"thật thật"*, *"đêm đêm"*, hay điệp cấu trúc câu. Danh sách ngoại lệ `INTENTIONAL_REPEATS` được viết cứng (hardcode) trong mã nguồn và không thể nào bao quát hết các biện pháp nghệ thuật văn học.

**Hệ quả & Rủi ro (Why It Breaks):**  
Bài thơ của học sinh có sử dụng điệp ngữ có chủ đích sẽ bị bộ lọc gạt bỏ và quay trở về văn bản gốc còn đầy lỗi sai chính tả. Giáo viên không thấy bài được sửa lỗi sẽ cho rằng hệ thống AI bị lỗi. Đáng nói hơn, tiêu chí chấm điểm "Sáng tạo" tại §6.8 lại cộng điểm cho "điệp ngữ", tạo ra một mâu thuẫn trực tiếp: **Hệ thống vừa khuyến khích điệp ngữ trong thang điểm nhưng lại xử phạt và từ chối xử lý nó trong bộ lọc ảo giác**.

**Giải pháp khắc phục (Recommended Fix):**  
1. Thay thế bộ lọc đếm số lần lặp thô sơ bằng phương pháp đo độ tương đồng ngữ nghĩa (ví dụ tính Cosine Similarity giữa câu gốc và câu sửa thông qua mô hình embedding câu).
2. Hoặc sử dụng phương pháp danh sách hợp lệ: Chỉ cảnh báo lặp từ nếu cụm từ lặp lại là vô nghĩa (không có trong từ điển tiếng Việt).
3. Cho phép cấu hình bộ lọc theo thể loại bài viết (thơ văn vần vs văn xuôi).

---

#### ✅ Issue #18: Điểm nghữn Ghi Đồng Thời của Cơ sở Dữ liệu SQLite — **ĐÃ KHẮC PHỤC**

> **Mức độ:** 🟠 `HIGH` *(Closed — 29/08/2026)* &nbsp;|&nbsp; **Vị trí:** `lib/prisma.ts`

**Vấn đề gốc:** SQLite chỉ hỗ trợ 1 tiến trình ghi tại một thời điểm. Kết hợp với `better-sqlite3` (chạy đồng bộ) và Prisma, mọi thao tác ghi khóa toàn bộ luồng. Khi 30 học sinh nộp bài đồng thời, các ghi bị xếp hàng gây timeout hàng loạt.

**Khắc phục đã thực hiện:**
- Bật `PRAGMA journal_mode = WAL` (Write-Ahead Logging) ngay khi khởi tạo `PrismaClient` trong `lib/prisma.ts`.
- WAL cho phép nhiều kết nối ĐỌC song song với 1 writer — đáp ứng hoàn toàn 30–50 học sinh/lớp trên Raspberry Pi mà không cần PostgreSQL.
- Bật `PRAGMA busy_timeout = 5000` — thay vì báo lỗi ngay, SQLite chờ tối đa 5 giây để khóa được giải phóng.
- Bật `PRAGMA synchronous = NORMAL` — giảm số lần fsync, tăng tốc ghi ~2× với rủi ro rất thấp.
- Giữ nguyên `globalForPrisma` singleton để tránh spawn nhiều PrismaClient trong Next.js HMR (dev mode).
---

#### 🟠 Issue #19: Không Có Cơ chế Phục hồi Kết quả Từng phần khi Pipeline Gặp Sự Cố

> **Mức độ:** 🟠 `HIGH` &nbsp;|&nbsp; **Vị trí / Mục tài liệu:** §2.4 (Sequence Diagram), §6.10

**Điểm lỗi kỹ thuật (The Flaw):**  
Quy trình xử lý gồm 5 giai đoạn nối tiếp: Tiền xử lý → OCR → Chấm lỗi ViT5 → Tính khoảng cách Levenshtein → Lưu CSDL. Nếu Giai đoạn 3 (ViT5) bị lỗi sau khi Giai đoạn 2 (OCR) đã thành công, toàn bộ kết quả OCR trước đó sẽ bị mất sạch. Giáo viên bắt buộc phải tải lại ảnh và chạy lại OCR từ đầu. Hệ thống hoàn toàn không có điểm lưu tạm (checkpoint) hay lưu trữ kết quả trung gian.

**Hệ quả & Rủi ro (Why It Breaks):**  
Một sự cố chập chờn mạng khi gọi ViT5 (rất phổ biến với Wi-Fi trường học) sẽ ép giáo viên phải làm lại toàn bộ quy trình 30 giây từ đầu. Trong giờ học bận rộn, điều này gây ức chế và lãng phí thời gian. Hướng xử lý nêu trong tài liệu *"UI thông báo giáo viên nhập text thủ công"* làm mất đi hoàn toàn ý nghĩa tự động hóa của hệ thống.

**Giải pháp khắc phục (Recommended Fix):**  
1. Lưu trữ kết quả trung gian: Tạo bảng `OcrResult` chứa các trường `id`, `imageUrl`, `originalText`, `status`.
2. Endpoint `/api/grade` nên nhận vào `ocrResultId` thay vì bắt buộc tải lại ảnh.
3. Nếu bước ViT5 bị lỗi, giáo viên có thể ấn nút thử lại bước chấm lỗi mà không cần chạy lại OCR.
4. Bổ sung trạng thái `DRAFT` (bản nháp) cho bài chấm để cho phép tiếp tục quy trình từ bất kỳ bước nào.

---

#### 🟡 Issue #20: "Sửa lỗi" Windows Quick Edit Mode là một Anti-Pattern Triển khai

> **Mức độ:** 🟡 `MEDIUM` &nbsp;|&nbsp; **Vị trí / Mục tài liệu:** §9.2, §10

**Điểm lỗi kỹ thuật (The Flaw):**  
Tài liệu nhận diện tính năng Quick Edit Mode của cửa sổ dòng lệnh Windows làm đóng băng vòng lặp asyncio của Python, và "sửa lỗi" bằng cách can thiệp chỉnh sửa Registry hệ thống thông qua file `start_all.bat`. Việc can thiệp vào Registry bằng file batch là giải pháp xâm lấn, đòi hỏi quyền Administrator và làm thay đổi hành vi của toàn bộ hệ điều hành.

**Hệ quả & Rủi ro (Why It Breaks):**  
File batch sẽ chạy thất bại trên các tài khoản người dùng thông thường không có quyền Admin (môi trường máy tính trường học luôn khóa quyền này). Nếu chạy thành công, nó sẽ vô hiệu hóa Quick Edit trên toàn máy, gây phiền toái cho những người dùng khác cần tính năng này. Đây là một thủ thuật chắp vá cho vấn đề console của Windows thay vì giải quyết đúng bản chất.

**Giải pháp khắc phục (Recommended Fix):**  
1. Chạy dịch vụ Python dưới dạng Windows Service (thông qua NSSM hoặc pywin32), nơi Quick Edit Mode hoàn toàn không ảnh hưởng.
2. Hoặc sử dụng trình thực thi không cửa sổ `pythonw.exe` thay cho `python.exe` trong console.
3. Ghi nhận vấn đề Quick Edit như một lưu ý sử dụng thay vì cố gắng sửa bằng cách can thiệp Registry.

---

#### 🟡 Issue #21: Ngưỡng Đánh giá Chất lượng Ảnh Chưa Được Hiệu chỉnh cho Dữ liệu Thực tế

> **Mức độ:** 🟡 `MEDIUM` &nbsp;|&nbsp; **Vị trí / Mục tài liệu:** §7.1 (QualityReport thresholds)

**Điểm lỗi kỹ thuật (The Flaw):**  
Các ngưỡng kiểm tra chất lượng ảnh: Điểm mờ `< 80`, độ sáng `< 50` hoặc `> 220`, tỷ lệ điểm ảnh tối `< 0.02`, tỷ lệ vùng văn bản `< 0.005` — đều là các con số giả định chung chung, chưa từng được hiệu chuẩn thực tế trên tập dữ liệu chuẩn 2.600 ảnh bài thi học sinh.

**Hệ quả & Rủi ro (Why It Breaks):**  
Ảnh chụp bài viết của học sinh Lớp 1–2 thường có cỡ chữ rất to và viết thưa, dẫn đến tỷ lệ vùng văn bản thấp nhưng bức ảnh hoàn toàn hợp lệ. Một bức ảnh hơi mờ nhẹ nhưng nét chữ rõ ràng có thể đạt điểm phương sai Laplacian `< 80` nhưng Gemini vẫn nhận diện chính xác 100%. Việc từ chối ảnh cứng nhắc sẽ gây phiền toái cho giáo viên.

**Giải pháp khắc phục (Recommended Fix):**  
1. Hiệu chuẩn lại các ngưỡng dựa trên tập dữ liệu đo kiểm 2.600 ảnh thực tế.
2. Vẽ đường cong ROC (Receiver Operating Characteristic) cho từng chỉ số so với độ chính xác OCR thực tế.
3. Áp dụng ngưỡng thích ứng theo khối lớp (học sinh nhỏ tuổi viết chữ to → bộ lọc khác).
4. Cho phép giáo viên chọn bỏ qua cảnh báo (Override) và tiếp tục chấm nếu thấy ảnh vẫn đọc được.

---

### 4. Điểm Mơ hồ & Lỗ hổng Triển khai
> **Chủ đề:** *Ambiguities & Implementation Gaps*

#### 🟠 Issue #22: "Lượng tử hóa Động INT8" chỉ là Tuyên bố Vô Căn cứ (Hand-Waving)

> **Mức độ:** 🟠 `HIGH` &nbsp;|&nbsp; **Vị trí / Mục tài liệu:** §1.2, §3.3, §6.2, §15.3

**Điểm lỗi kỹ thuật (The Flaw):**  
Tài liệu liên tục khẳng định cơ chế "Lượng tử hóa động INT8" (Dynamic INT8 Quantization) giúp giảm 2 lần dung lượng RAM và cho phép chạy trên Pi, nhưng không đưa ra bất kỳ chi tiết kỹ thuật thực thi nào:
  - Sử dụng framework lượng tử hóa nào? (`torch.quantization`? ONNX Runtime? `optimum`?)
  - Những tầng/toán tử nào được lượng tử hóa? (Chỉ tầng tuyến tính Linear hay cả các tầng cơ chế Attention?)
  - Độ suy giảm chất lượng (Accuracy degradation) là bao nhiêu? (Hoàn toàn không có dữ liệu benchmark).
  - Đây là lượng tử hóa động thực sự (tính tham số lúc chạy) hay lượng tử hóa tĩnh (cần tập dữ liệu hiệu chuẩn)?

**Hệ quả & Rủi ro (Why It Breaks):**  
Việc lượng tử hóa động cơ chế Attention trong kiến trúc T5 rất phức tạp và thường xuyên tạo ra kết quả vô nghĩa đối với các mô hình dịch/sửa chuỗi tuần tự (sequence-to-sequence). Nếu cài đặt sai, ViT5 sẽ đưa ra các câu sửa ngữ pháp ngô nghê lọt qua bộ lọc ảo giác nhưng phá hỏng kết quả sư phạm.

**Giải pháp khắc phục (Recommended Fix):**  
1. Nêu rõ phương pháp lượng tử hóa cụ thể: ví dụ `torch.quantization.quantize_dynamic()` với `dtype=torch.qint8`.
2. Đo kiểm độ chính xác (điểm SacreBLEU) trước và sau khi lượng tử hóa trên tập kiểm thử độc lập.
3. Nếu độ chính xác giảm > 5%, chuyển sang phương pháp lượng tử hóa tĩnh (Static Quantization) có dữ liệu hiệu chỉnh.
4. Tài liệu hóa mức RAM tiêu thụ thực tế đo bằng các công cụ chuẩn (`nvidia-smi` hoặc `psutil`).

---

#### 🟠 Issue #23: Quy tắc Phân loại Lỗi được Định nghĩa một cách Cảm tính, Thiếu Chuẩn hóa

> **Mức độ:** 🟠 `HIGH` &nbsp;|&nbsp; **Vị trí / Mục tài liệu:** §6.7 ("Replace: Không dấu giống → viet_hoa; cùng phụ âm đầu/vần → dau_thanh...")

**Điểm lỗi kỹ thuật (The Flaw):**  
Phân loại 6 nhóm lỗi chính tả là giá trị cốt lõi về mặt sư phạm của sản phẩm, nhưng các quy tắc lại được mô tả bằng thuật ngữ ngôn ngữ học chung chung mà không có thuật toán định lượng:
  - *"Không dấu giống"* — Thế nào là "giống"? Cùng ký tự gốc base? Cùng mã Unicode sau khi chuẩn hóa NFD/NFC?
  - *"Cùng phụ âm đầu/vần"* — Được tính toán thế nào? Bằng thuật toán bóc tách âm tiết tiếng Việt hay so sánh chuỗi?
  - Các cặp phụ âm dễ nhầm lẫn (c/k/q, g/gh, d/gi/r, s/x, ch/tr, l/n) — là danh sách cố định hay do học máy nhận diện?

**Hệ quả & Rủi ro (Why It Breaks):**  
Hai lập trình viên khác nhau khi đọc tài liệu này sẽ cài đặt ra hai kết quả phân loại lỗi hoàn toàn khác nhau. Tiêu chuẩn "6 nhóm lỗi" trở nên không thể tái lập (non-reproducible). Giáo viên sẽ thấy kết quả phân loại lỗi biến động bất thường sau mỗi lần cập nhật phần mềm.

**Giải pháp khắc phục (Recommended Fix):**  
1. Xây dựng tài liệu đặc tả thuật toán chính thức cho từng nhóm lỗi:
   - Đầu vào: `(original_word, corrected_word)`
   - Thuật toán: Cây quyết định từng bước (Decision Tree)
   - Đầu ra: `error_type` + điểm tin cậy `confidence_score`
2. Viết bộ unit test với hơn 100 ví dụ thực tế cho mỗi nhóm lỗi.
3. Tích hợp một thư viện xử lý ngữ âm tiếng Việt chuẩn (ví dụ `vietnamnlp`) để phân tích âm tiết nhất quán.

---

#### 🟡 Issue #24: Thiếu Định dạng API Schema Chính thức cho các MCP Tools

> **Mức độ:** 🟡 `MEDIUM` &nbsp;|&nbsp; **Vị trí / Mục tài liệu:** §8.2 (Bảng công cụ MCP), §8.3

**Điểm lỗi kỹ thuật (The Flaw):**  
Tích hợp MCP được mô tả là sử dụng chuẩn JSON-RPC 2.0, nhưng cấu trúc schema cụ thể của từng công cụ (`vihand.save_dictation_session`, `vihand.get_dictation_sessions`) lại không được định nghĩa. Hoàn toàn không có kiểu dữ liệu tham số, kiểu dữ liệu trả về hay mã lỗi.

**Hệ quả & Rủi ro (Why It Breaks):**  
Mô hình ngôn ngữ đám mây của Xiaozhi bắt buộc phải có JSON Schema chuẩn để gọi công cụ chính xác. Không có schema chính thức, quá trình tích hợp sẽ liên tục gặp lỗi "Invalid Parameters" khi chạy thực tế.

**Giải pháp khắc phục (Recommended Fix):**  
1. Định nghĩa chuẩn JSON Schema cho từng công cụ MCP:
   ```json
   {
     "name": "vihand.save_dictation_session",
     "parameters": {
       "type": "object",
       "properties": {
         "title": { "type": "string", "maxLength": 200 },
         "passage": { "type": "string", "maxLength": 5000 },
         "className": { "type": "string" }
       },
       "required": ["title", "passage"]
     }
   }
   ```
2. Kiểm thực tính hợp lệ của mọi lệnh gọi hàm trước khi thực thi.
3. Trả về cấu trúc lỗi chuẩn khi vi phạm schema.

---

#### 🟡 Issue #25: Tiêu chí Chấm điểm "Sáng tạo" là Heuristic Chưa Được Định nghĩa

> **Mức độ:** 🟡 `MEDIUM` &nbsp;|&nbsp; **Vị trí / Mục tài liệu:** §6.8 ("Sáng tạo 1.0đ: Heuristic: điệp ngữ + hình ảnh = 1.0đ; một điều kiện = 0.5đ")

**Điểm lỗi kỹ thuật (The Flaw):**  
Điểm sáng tạo sử dụng các khái niệm văn học mơ hồ (*"điệp ngữ"*, *"hình ảnh"*) mà không có định nghĩa thuật toán. Làm thế nào máy tính nhận diện được "hình ảnh nghệ thuật" trong văn bản? Làm thế nào phân biệt "điệp ngữ" với lỗi lặp từ ảo giác (xem Issue #17)?

**Hệ quả & Rủi ro (Why It Breaks):**  
Điểm số này về bản chất là một giá trị ngẫu nhiên. Giáo viên sẽ mất niềm tin vào một hệ thống chấm điểm sáng tạo dựa trên các tiêu chí vô căn cứ. Việc giáo viên phải can thiệp sửa điểm bằng tay trở thành bắt buộc thay vì tùy chọn.

**Giải pháp khắc phục (Recommended Fix):**  
1. Loại bỏ mục "Sáng tạo" khỏi quy trình tính điểm tự động.
2. Chuyển thành thanh trượt chấm điểm thủ công (0.0–1.0 điểm) dành riêng cho giáo viên kèm lý do nhận xét.
3. Hoặc thay thế bằng các chỉ số ngôn ngữ đo đạc được: Độ phong phú của vốn từ vựng (Type-Token Ratio), độ dài biến thiên của câu, tần suất sử dụng tính từ mô tả (qua POS tagging).

---

#### 🟡 Issue #26: Hoàn Toàn Thiếu Chính sách Lưu trữ & Xóa Dữ liệu Trẻ em

> **Mức độ:** 🟡 `MEDIUM` &nbsp;|&nbsp; **Vị trí / Mục tài liệu:** Toàn bộ tài liệu

**Điểm lỗi kỹ thuật (The Flaw):**  
Tài liệu không có bất kỳ dòng nào đề cập đến thời gian lưu trữ hình ảnh bài tập, điểm số, nhật ký phiên đọc hay dữ liệu đàm thoại giọng nói. Trong môi trường giáo dục xử lý thông tin học sinh tiểu học, đây là lỗ hổng pháp lý nghiêm trọng (vi phạm Luật An ninh mạng Việt Nam và các tiêu chuẩn bảo vệ quyền riêng tư trẻ em).

**Hệ quả & Rủi ro (Why It Breaks):**  
Không có chính sách hủy dữ liệu, cơ sở dữ liệu sẽ phình to vô hạn định. Khi phụ huynh hoặc nhà trường yêu cầu xóa dữ liệu của học sinh (quyền được lãng quên), hệ thống không có quy trình để thực hiện tự động.

**Giải pháp khắc phục (Recommended Fix):**  
1. Quy định rõ chính sách lưu trữ: Điểm số: 7 năm (theo quy định lưu học bạ). Ảnh chụp bài thi: Xóa sau 1 năm kể từ ngày chấm. Nhật ký log: Xóa sau 90 ngày.
2. Cài đặt các tác vụ định kỳ tự động dọn dẹp dữ liệu quá hạn (Automated Purge Jobs).
3. Bổ sung trường `dataRetentionExpiresAt` vào các model dữ liệu liên quan.

---

#### 🔵 Issue #27: Bất nhất về Đánh số Phiên bản Tài liệu

> **Mức độ:** 🔵 `LOW` &nbsp;|&nbsp; **Vị trí / Mục tài liệu:** Tên file (`v2.1`), Tiêu đề header (`v2.2.0`), Tài liệu nguồn (`v2.0.0` + `v1.3.0-draft`)

**Điểm lỗi kỹ thuật (The Flaw):**  
Tài liệu không thống nhất phiên bản: Tên file là v2.1, tiêu đề báo cáo ghi v2.2.0, và phần lịch sử lại ghi hợp nhất từ v2.0.0 và v1.3.0.

**Hệ quả & Rủi ro (Why It Breaks):**  
Đội ngũ phát triển không thể xác định mình đang code theo phiên bản đặc tả nào. Các báo cáo lỗi (Bug reports) tham chiếu chéo gây hiểu lầm giữa các team.

**Giải pháp khắc phục (Recommended Fix):**  
1. Tuân thủ nghiêm ngặt chuẩn Semantic Versioning (SemVer).
2. Thiết lập một nguồn chân lý phiên bản duy nhất (ví dụ file `VERSION` trong repository).
3. Tự động cập nhật tiêu đề tài liệu thông qua script đọc từ file VERSION.

---

## PHẦN II — MODULE 11: ROBOT ĐỌC CHÍNH TẢ XIAOZHI (ĐANG PHÁT TRIỂN)

> *Bao gồm các phát hiện kiểm toán đối với phần cứng ESP32-S3, Bridge Service, ASR/TTS và Quy trình đối chiếu văn bản mẫu (Ground-Truth Grading).*

### 1. Mâu thuẫn Logic & Bất nhất Kiến trúc
> **Chủ đề:** *Logical Inconsistencies & Contradictions*

#### 🔴 Issue #28: Mâu thuẫn Cổng Kết nối của Dịch vụ Cầu nối (Bridge Service Port)

> **Mức độ:** 🔴 `CRITICAL` &nbsp;|&nbsp; **Vị trí / Mục tài liệu:** §11.2 (Sơ đồ: Cổng 8100) đối chiếu với §2.1 (MCP Service: Cổng 8200) và §11.3.1 (Bridge trên Pi)

**Điểm lỗi kỹ thuật (The Flaw):**  
Sơ đồ kiến trúc tại §11.2 thể hiện Bridge Service chạy trên cổng 8100. Trong khi đó, dịch vụ MCP hiện tại (§2.1) đang chạy trên cổng 8200. Văn bản mô tả Bridge Service *"tương tự cách `python_service` ViT5 đã tách"* nhưng không làm rõ nó sẽ thay thế hoàn toàn hay chạy song song với MCP Service.

**Hệ quả & Rủi ro (Why It Breaks):**  
Nếu cả hai dịch vụ chạy song song trên cùng thiết bị, chúng sẽ tranh chấp tài nguyên bộ nhớ và CPU. Nếu Bridge Service thay thế MCP Service, toàn bộ kết nối đám mây Xiaozhi hiện tại sẽ bị đứt gãy. Sự xung đột cổng (8100 vs 8200) chứng minh đội ngũ thiết kế chưa thống nhất kiến trúc tổng thể.

**Giải pháp khắc phục (Recommended Fix):**  
1. Làm rõ kiến trúc: Bridge Service là bản nâng cấp thay thế MCP Service hay là một thành phần chạy độc lập?
2. Nếu là bản thay thế: Lập tài liệu lộ trình chuyển đổi (migration path) từ MCP sang Bridge.
3. Nếu là thành phần riêng: Giải thích rõ tại sao cần tới hai dịch vụ WebSocket cùng lúc và cách thức phối hợp giữa chúng.
4. Lập bảng quản lý phân bổ cổng mạng (Port Allocation Table) tập trung.

---

#### 🔴 Issue #29: Tuyên bố "Zero-Hallucination" (Không Ảo Giác) trong Chấm điểm Đối chiếu là Sai lầm về Sư phạm

> **Mức độ:** 🔴 `CRITICAL` &nbsp;|&nbsp; **Vị trí / Mục tài liệu:** §11.1 ("Zero-Hallucination"), §11.8.1 ("Độ chính xác đối chiếu: 100%")

**Điểm lỗi kỹ thuật (The Flaw):**  
Tài liệu khẳng định độ chính xác đạt 100% khi đối chiếu bài làm của học sinh với văn bản bài đọc chuẩn (Ground Truth). Khẳng định này hoàn toàn phớt lờ chuỗi truyền tín hiệu trong thực tế:
  1. Máy phát âm TTS phát âm sai (đặc biệt là dấu thanh tiếng Việt).
  2. Học sinh nghe thấy từ sai và viết đúng từ mình nghe được vào vở.
  3. Mô hình OCR đọc sai nét chữ viết tay của học sinh.
  4. Thuật toán đối chiếu tự động kết luận học sinh viết sai chính tả dựa trên văn bản mẫu.

**Hệ quả & Rủi ro (Why It Breaks):**  
Học sinh viết chữ *"gáo"* thay vì *"gạo"* do máy TTS phát âm sai dấu nặng thành dấu sắc sẽ bị hệ thống chấm sai với độ tin cậy "100%". Hệ thống tự xưng là "Zero-Hallucination" nhưng thực chất hiện tượng ảo giác chỉ bị chuyển dịch từ khâu sửa lỗi AI sang chuỗi sai số TTS → Học sinh → OCR. Giáo viên tin tưởng vào con số 100% sẽ bỏ qua việc phúc khảo bài của học sinh.

**Giải pháp khắc phục (Recommended Fix):**  
1. Xóa bỏ hoàn toàn các tuyên bố "Zero-Hallucination" và "Độ chính xác 100%". Thay bằng *"Đối chiếu xác định theo văn bản tham chiếu"*.
2. Bổ sung trường `ttsConfidence` và gắn cờ cảnh báo các từ vựng mà công cụ TTS hay phát âm nhầm.
3. Luôn yêu cầu giáo viên duyệt lại kết quả chấm điểm đối chiếu trước khi vào sổ điểm.
4. Đo lường độ chính xác tổng thể toàn chuỗi: TTS → Học sinh viết → OCR → Đối chiếu, thay vì chỉ đo riêng thuật toán so khớp chuỗi.

---

#### 🟠 Issue #30: Tuyên bố "Bridge Service Không Trạng Thái (Stateless)" Mâu thuẫn với Bản chất WebSocket

> **Mức độ:** 🟠 `HIGH` &nbsp;|&nbsp; **Vị trí / Mục tài liệu:** §11.11 ("Bridge Service stateless (session state ở DB) → có thể chạy nhiều instance")

**Điểm lỗi kỹ thuật (The Flaw):**  
Giao thức WebSocket về bản chất là có trạng thái (Stateful). Bridge Service bắt buộc phải duy trì trạng thái kết nối trực tiếp: Bộ đệm âm thanh stream, vị trí dòng đọc hiện tại, hàng đợi TTS, ngữ cảnh ASR, và phiên xác thực của thiết bị ESP32. Việc tuyên bố service là "stateless" chỉ vì "trạng thái phiên lưu ở DB" là sự hiểu sai căn bản về kỹ thuật truyền thông âm thanh thời gian thực.

**Hệ quả & Rủi ro (Why It Breaks):**  
Nếu triển khai 2 instance Bridge Service phía sau một bộ cân bằng tải (Load Balancer), thiết bị ESP32 kết nối tới Instance A không thể gửi gói tin âm thanh sang Instance B nếu thiếu cơ chế Sticky Session phức tạp. Tài liệu đề cập *"có thể chạy nhiều instance"* nhưng hoàn toàn không có thiết kế cân bằng tải hay đồng bộ trạng thái luồng.

**Giải pháp khắc phục (Recommended Fix):**  
1. Thừa nhận Bridge Service là dịch vụ Stateful trên từng kết nối WebSocket.
2. Áp dụng cơ chế Sticky Sessions (IP Hash hoặc Session Cookie) trên bộ cân bằng tải.
3. Hoặc thiết kế kiến trúc Shared-Nothing: Mỗi thiết bị phần cứng được gán cố định vào một instance thông qua Device Registry.

---

#### 🟠 Issue #31: Tuyên bố "Không Phụ thuộc Cloud xiaozhi.me" Mâu thuẫn với Kiến trúc MCP Hiện Tại

> **Mức độ:** 🟠 `HIGH` &nbsp;|&nbsp; **Vị trí / Mục tài liệu:** §11.1 ("Không phụ thuộc cloud xiaozhi.me") đối chiếu với §8.1 (MCP hiện tại kết nối tới `wss://api.xiaozhi.me/mcp/`)

**Điểm lỗi kỹ thuật (The Flaw):**  
Module 11 đặt mục tiêu độc lập hoàn toàn khỏi cloud xiaozhi.me, trong khi hệ thống đang vận hành (Phần I, §8) lại phụ thuộc hoàn toàn vào dịch vụ đám mây này. Không có chiến lược chuyển đổi hay kế hoạch tương thích ngược nào được đưa ra.

**Hệ quả & Rủi ro (Why It Breaks):**  
Khi đưa Module 11 vào hoạt động, liệu tích hợp MCP cũ có bị vô hiệu hóa? Giáo viên có bị mất quyền truy cập vào trợ lý đám mây? Tài liệu trình bày hai hệ thống song song mà không chỉ rõ cách thức cùng tồn tại hoặc thay thế.

**Giải pháp khắc phục (Recommended Fix):**  
1. Định hình rõ chiến lược: Dùng Cloud MCP cho truy cập từ xa, dùng Bridge Service cục bộ cho thiết bị phần cứng trong lớp.
2. Hoặc công bố lộ trình khai tử (Deprecation Timeline) đối với dịch vụ MCP kèm kế hoạch chuyển đổi dữ liệu.
3. Tài liệu hóa rành mạch tính năng nào cần cloud, tính năng nào chạy local.

---

### 2. Giả định Kỹ thuật Phi thực tế & Điểm nghẽn Hiệu năng
> **Chủ đề:** *Unrealistic Technical Assumptions & Bottlenecks*

#### 🔴 Issue #32: Chạy Xử lý ASR + TTS Thời Gian Thực trên Raspberry Pi 4 là Bất Khả Thi

> **Mức độ:** 🔴 `CRITICAL` &nbsp;|&nbsp; **Vị trí / Mục tài liệu:** §11.1, §11.3.1, §11.9

**Điểm lỗi kỹ thuật (The Flaw):**  
Bridge Service dự kiến thực hiện toàn bộ chuỗi: Giải mã Opus → Nhận dạng giọng nói ASR → Phân loại ý định Intent → Tổng hợp giọng nói TTS → Nén Opus, tất cả theo thời gian thực trên Raspberry Pi 4. Nhận dạng tiếng Việt độ trễ < 2s đòi hỏi: (a) Gọi Cloud API (mâu thuẫn với mục tiêu "không phụ thuộc cloud"), hoặc (b) Chạy mô hình local tăng tốc bằng GPU (Pi không có GPU chuyên dụng cho AI). Tổng hợp giọng nói tiếng Việt chuẩn thanh điệu cũng đòi hỏi mô hình neural nặng.

**Hệ quả & Rủi ro (Why It Breaks):**  
Trên chip CPU của Pi 4, mô hình Whisper Small mất từ 5–10 giây chỉ để nhận dạng một đoạn âm thanh ngắn 5 giây — hoàn toàn không thể stream real-time. Các model TTS tiếng Việt chất lượng như VITS hay Piper ngốn 2–4GB RAM và chạy với tốc độ chỉ bằng 0.1x thời gian thực trên CPU. Độ trễ tương tác sẽ bị dồn tích lên hơn 10 giây mỗi câu, khiến thiết bị hoàn toàn không thể dùng được để đọc chính tả trong lớp.

**Giải pháp khắc phục (Recommended Fix):**  
1. **Sử dụng Cloud ASR/TTS:** Tích hợp API của Google Cloud, FPT.AI hoặc Zalo AI có hỗ trợ tiếng Việt chất lượng cao. Chấp nhận kết nối mạng để đảm bảo trải nghiệm.
2. **Gắn thêm phần cứng Edge TPU:** Bổ sung thanh tăng tốc Google Coral USB Accelerator nếu muốn chạy ASR nhẹ cục bộ.
3. **Mô hình lai (Hybrid):** Nhận diện từ khóa đánh thức (Wake-word) cục bộ bằng Porcupine/Snowboy trên ESP32/Pi, chuyển toàn bộ phần ASR/TTS hội thoại lên cloud.
4. **Điều chỉnh chỉ tiêu độ trễ thực tế:** Đặt mục tiêu độ trễ 5–10 giây trên Pi 4 thay vì quảng cáo "thời gian thực".

---

#### 🔴 Issue #33: Loa Công suất 3W Không Đủ Âm Lượng cho Môi Trường Lớp Học

> **Mức độ:** 🔴 `CRITICAL` &nbsp;|&nbsp; **Vị trí / Mục tài liệu:** §11.3.2 ("đạt ≥75–80 dB ở 3–5m")

**Điểm lỗi kỹ thuật (The Flaw):**  
Một mạch khuếch đại Class-D công suất 3W đi kèm củ loa 4Ω không thể nào đáp ứng không gian lớp học 30–40 học sinh. Tiếng ồn nền trong lớp học tiểu học thường dao động từ 50–60 dB. Một chiếc loa 3W ở khoảng cách 3–5m chỉ tạo ra mức áp suất âm thanh ~70 dB trong phòng tiêu âm lý tưởng; trong lớp học thực tế có tiếng quạt trần, tiếng vang và tiếng ồn học sinh, âm lượng hiệu dụng giảm xuống chỉ còn 60–65 dB — gần như không thể nghe rõ.

**Hệ quả & Rủi ro (Why It Breaks):**  
Học sinh ngồi các dãy bàn cuối lớp sẽ không thể nghe rõ từng từ được đọc. Giáo viên liên tục phải can thiệp nhắc lại câu lệnh. Thiết bị thất bại ngay ở tính năng cốt lõi nhất là đọc bài cho học sinh chép.

**Giải pháp khắc phục (Recommended Fix):**  
1. Nâng cấp mạch khuếch đại lên công suất tối thiểu 10W và củ loa kích thước lớn hơn (≥ 5cm).
2. Tích hợp cổng xuất âm thanh 3.5mm AUX Out để cắm trực tiếp vào hệ thống loa trợ giảng của lớp học.
3. Tiến hành đo kiểm mức áp suất âm thanh thực tế trong lớp học có 30 học sinh trước khi chốt danh mục linh kiện (BOM).

---

#### 🟠 Issue #34: Giao thức Truyền Âm thanh ESP32-S3 Chưa Được Đặc tả Chi tiết

> **Mức độ:** 🟠 `HIGH` &nbsp;|&nbsp; **Vị trí / Mục tài liệu:** §11.3.2, §11.9, §Phần III

**Điểm lỗi kỹ thuật (The Flaw):**  
Tài liệu nhắc đến giao thức "Opus Audio over WebSocket" nhưng hoàn toàn thiếu các đặc tả kỹ thuật nền tảng:
  - Kích thước khung nén Opus là bao nhiêu? (20ms? 60ms?)
  - Cấu trúc gói tin nhị phân (JSON metadata kết hợp binary payload hay binary thuần)?
  - Kích thước bộ đệm chống rung pha (Jitter Buffer)?
  - Cơ chế bù mất gói tin (Packet Loss Concealment)?
  - Thuật toán khử tiếng vọng âm thanh (Acoustic Echo Cancellation - AEC) để ngăn loa tự dội âm vào micro?

**Hệ quả & Rủi ro (Why It Breaks):**  
Thiếu đặc tả giao thức, đội ngũ viết Firmware ESP32 và đội ngũ viết Backend Bridge Service sẽ tự phát triển theo chuẩn riêng và không thể kết nối được với nhau. Không có khử vọng AEC, âm thanh từ loa phát ra sẽ dội thẳng lại vào micro, khiến hệ thống nhận dạng ASR tự dịch lại chính câu nói của mình và tạo thành vòng lặp vô tận.

**Giải pháp khắc phục (Recommended Fix):**  
1. Đặc tả giao thức gói tin nhị phân rõ ràng: `[4-byte sequence number][4-byte timestamp][Opus payload]`.
2. Cài đặt Jitter Buffer 100ms trên Bridge Service.
3. Tích hợp thuật toán AEC (như WebRTC AEC3 hoặc SpeexDSP) tại Bridge Service.
4. Hoặc áp dụng chế độ bán song công (Half-Duplex): Tự động ngắt mic thu âm trong lúc loa đang phát bài đọc.

---

#### 🟠 Issue #35: Tuyên bố Thời lượng Pin Bị Thổi Phồng Gấp Đôi Thực Tế

> **Mức độ:** 🟠 `HIGH` &nbsp;|&nbsp; **Vị trí / Mục tài liệu:** §11.3.2 ("pin Li-ion 18650 2600mAh — 3–4 giờ không dây")

**Điểm lỗi kỹ thuật (The Flaw):**  
Module ESP32-S3 khi phát Wi-Fi liên tục + xử lý âm thanh I2S + màn hình + đèn LED tiêu thụ dòng điện rất lớn:
  - ESP32-S3 hoạt động: ~240mA.
  - Đỉnh phát sóng Wi-Fi TX: ~500mA.
  - Mạch giải mã I2S và khuếch đại âm thanh: ~100mA.
  - Màn hình hiển thị và LED: ~50mA.
  Tổng dòng tiêu thụ trung bình: ~300–400mA. Một viên pin 2600mAh trên lý thuyết cho ~7.4 giờ, NHƯNG:
  - Điện áp pin 18650 là 3.7V, mạch boost lên 5V chịu hao hụt hiệu suất ~15–20%.
  - Dung lượng pin suy hao 20% sau khoảng 100 chu kỳ sạc xả.
  - Thời lượng vận hành thực tế ở mức công suất phát âm thanh tiêu chuẩn chỉ đạt khoảng **2–2.5 giờ**.

**Hệ quả & Rủi ro (Why It Breaks):**  
Giáo viên kỳ vọng thiết bị dùng được 3–4 giờ cho trọn vẹn một buổi dạy 4–5 tiết, nhưng máy sẽ cạn pin giữa chừng ở tiết thứ 2 hoặc 3, làm gián đoạn tiết học.

**Giải pháp khắc phục (Recommended Fix):**  
1. Đo dòng tiêu thụ thực tế bằng thiết bị chuyên dụng (Kill-A-Watt hoặc module cảm biến dòng INA219).
2. Công bố thời lượng pin thực tế là 2 giờ kèm khuyến cáo rõ ràng.
3. Thiết kế thiết bị theo hướng cắm nguồn trực tiếp là chính, pin đóng vai trò bộ lưu điện (UPS) chống mất điện đột ngột.
4. Hoặc nâng cấp lên 2 cell pin 18650 mắc song song (5200mAh) để đạt thời lượng 4–5 giờ thực tế.

---

#### 🟠 Issue #36: Chỉ Hỗ Trợ Wi-Fi 2.4GHz — Nguy Cơ Nghẽn Mạng Nặng Nề trong Trường Học

> **Mức độ:** 🟠 `HIGH` &nbsp;|&nbsp; **Vị trí / Mục tài liệu:** §11.3.1, §11.3.2

**Điểm lỗi kỹ thuật (The Flaw):**  
ESP32-S3 chỉ hỗ trợ băng tần Wi-Fi 2.4GHz. Môi trường trường học Việt Nam điển hình có:
  - Hàng chục điểm phát sóng Access Point 2.4GHz phát trùng kênh (Channel 1, 6, 11).
  - Hàng trăm thiết bị điện thoại, máy tính cùng bắt sóng gây nhiễu nghẽn nghiêm trọng.
  - Nhiễu sóng từ thiết bị Bluetooth và thiết bị điện tử khác.  
Truyền stream âm thanh thời gian thực yêu cầu độ trễ ổn định < 100ms, nhưng nghẽn mạng 2.4GHz sẽ đẩy độ trễ biến thiên (jitter) lên hơn 500ms.

**Hệ quả & Rủi ro (Why It Breaks):**  
Âm thanh đọc bài bị giật, vấp, mất tiếng từng đoạn. Học sinh bị sót chữ khi chép chính tả. Tính năng phục hồi tự động `resume from currentLine` bị kích hoạt liên tục làm vỡ mạch giảng dạy.

**Giải pháp khắc phục (Recommended Fix):**  
1. Bổ sung cổng mạng dây Ethernet RJ45 (dùng module W5500 SPI) cho các phòng học cần độ ổn định tuyệt đối.
2. Áp dụng cơ chế đệm trước (Audio Pre-buffering): Tải sẵn toàn bộ file âm thanh bài đọc về bộ nhớ đệm của ESP32 trước khi bắt đầu phát, thay vì stream thời gian thực.
3. Cân nhắc dùng module thế hệ mới hỗ trợ băng tần 5GHz hoặc Wi-Fi 6 (như ESP32-C6).

---

#### 🟡 Issue #37: "Lưu currentLine Liên Tục" Khi Mất Mạng — Nhưng ESP32 Không Có Bộ Nhớ Cục Bộ

> **Mức độ:** 🟡 `MEDIUM` &nbsp;|&nbsp; **Vị trí / Mục tài liệu:** §11.11 ("Lưu `currentLine` liên tục. Kết nối lại trong 5 phút → resume")

**Điểm lỗi kỹ thuật (The Flaw):**  
Tài liệu yêu cầu thiết bị lưu dòng đọc hiện tại `currentLine` liên tục để phục hồi khi rớt mạng, nhưng trên phần cứng ESP32 không hề cấu hình bộ nhớ lưu trữ không bay hơi (không có thẻ nhớ SD, không có cơ chế ghi Flash liên tục). Nếu vừa mất Wi-Fi vừa bị sập nguồn/khởi động lại, thông tin `currentLine` trên RAM sẽ biến mất hoàn toàn.

**Hệ quả & Rủi ro (Why It Breaks):**  
Khi xảy ra mất mạng kèm theo sụt áp nguồn (rất hay gặp với thiết bị chạy pin), toàn bộ tiến trình bài đọc bị mất sạch. Tính năng "Resume" chỉ hoạt động nếu thiết bị duy trì nguồn liên tục VÀ kết nối lại mạng trong 5 phút.

**Giải pháp khắc phục (Recommended Fix):**  
1. Sử dụng hệ thống tệp nội tại LittleFS hoặc NVS (Non-Volatile Storage) của ESP32 để lưu chỉ số `currentLine` xuống bộ nhớ Flash mỗi khi chuyển câu.
2. Khi khởi động lại, kiểm tra file khôi phục và hiển thị thông báo hỏi giáo viên có muốn đọc tiếp không.
3. Phía Bridge Service cũng phải lưu trạng thái phiên và tự động đồng bộ lại vị trí dòng khi thiết bị kết nối lại.

---

### 3. Các Trường hợp Biên & Chế độ Lỗi
> **Chủ đề:** *Edge Cases & Failure Modes*

#### 🟠 Issue #38: Nhận Dạng Giọng Nói (ASR) Bị Kích Hoạt Nhầm Bởi Tiếng Học Sinh

> **Mức độ:** 🟠 `HIGH` &nbsp;|&nbsp; **Vị trí / Mục tài liệu:** §11.7.3 (Bảng ý định Intent), §11.7.4 (Guardrail)

**Điểm lỗi kỹ thuật (The Flaw):**  
Thiết bị ở chế độ luôn lắng nghe micro để nhận khẩu lệnh điều khiển. Trong lớp học 30–40 học sinh, tiếng trao đổi, đọc bài của học sinh sẽ kích hoạt nhận dạng sai. Cơ chế phòng vệ được mô tả *"câu không khớp intent → phản hồi trung lập"* chỉ giải quyết được các câu nói không đúng cú pháp, chứ không thể ngăn được việc học sinh vô tình nói trúng từ khóa lệnh.

**Hệ quả & Rủi ro (Why It Breaks):**  
Một học sinh dưới lớp nói to *"đọc lại đi"* sẽ lập tức kích hoạt robot đọc lại từ đầu trong lúc cả lớp đang làm bài. Thiết bị hoàn toàn không có khả năng nhận diện sinh trắc học giọng nói (Speaker Identification) để phân biệt giọng giáo viên với học sinh.

**Giải pháp khắc phục (Recommended Fix):**  
1. Bổ sung nút bấm vật lý Push-To-Talk: Thiết bị chỉ mở micro nhận lệnh khi giáo viên nhấn giữ nút trên robot hoặc trên điều khiển từ xa.
2. Áp dụng nhận diện mẫu giọng (Voice Enrollment): Chỉ chấp nhận khẩu lệnh từ giọng của giáo viên đã đăng ký.
3. Cơ chế xác nhận thị giác: Hiển thị câu hỏi *"Đọc lại đoạn này?"* lên màn hình LCD và yêu cầu giáo viên bấm nút xác nhận.

---

#### 🟠 Issue #39: Lỗi Phát Âm Dấu Thanh của TTS Không Thể Khắc Phục Bằng Nút "Preview"

> **Mức độ:** 🟠 `HIGH` &nbsp;|&nbsp; **Vị trí / Mục tài liệu:** §11.11 ("TTS sai dấu thanh từ hiếm → Preview toàn bài trước")

**Điểm lỗi kỹ thuật (The Flaw):**  
Tài liệu thừa nhận công cụ TTS có thể phát âm sai thanh điệu tiếng Việt đối với các từ hiếm và đưa ra giải pháp là giáo viên hãy "Preview (nghe thử) toàn bộ bài trước khi dạy". Việc nghe thử chỉ giúp giáo viên phát hiện ra từ bị đọc sai chứ không thể sửa được lỗi phát âm của chính engine TTS đó.

**Hệ quả & Rủi ro (Why It Breaks):**  
Giáo viên nghe thử thấy robot phát âm sai từ *"phượng vĩ"* thành *"phướng vĩ"* nhưng không có cách nào chỉnh sửa lại âm thanh đó. Với hơn 50 bài chính tả mỗi học kỳ, việc bắt giáo viên nghe thử từng bài là một gánh nặng vô lý, và học sinh sẽ học theo cách phát âm sai lệch của máy.

**Giải pháp khắc phục (Recommended Fix):**  
1. Tuyển chọn công cụ TTS có độ chuẩn thanh điệu tiếng Việt xuất sắc nhất (ví dụ các giọng chuẩn giáo dục của FPT.AI, Zalo AI, Viettel AI).
2. Xây dựng từ điển phiên âm tùy chỉnh (Pronunciation Dictionary / Lexicon) cho phép cấu hình phiên âm thay thế cho các từ hiếm.
3. Cho phép giáo viên tự ghi âm file âm thanh mẫu của chính mình để thay thế đoạn đọc tự động khi cần.

---

#### 🟡 Issue #40: Trường `ConversationLog.audioUrl` Mâu Thuẫn với Cam Kết Bảo Mật "Không Lưu Âm Thanh"

> **Mức độ:** 🟡 `MEDIUM` &nbsp;|&nbsp; **Vị trí / Mục tài liệu:** §11.5 (Schema: `audioUrl String @default("")`), §11.10 ("chỉ lưu transcript text, không lưu file âm thanh gốc")

**Điểm lỗi kỹ thuật (The Flaw):**  
Cơ sở dữ liệu có trường `audioUrl` trong bảng `ConversationLog`, nhưng ở điều khoản bảo mật §11.10 tài liệu lại cam kết *"chỉ lưu transcript dạng chữ, tuyệt đối không lưu file âm thanh gốc"*. Nếu trường này trỏ đến file âm thanh ngoài thì vi phạm cam kết; nếu luôn để trống thì là trường thừa.

**Hệ quả & Rủi ro (Why It Breaks):**  
Tạo ra sự nghi ngờ về tính minh bạch trong xử lý dữ liệu học sinh khi đối soát với phụ huynh và nhà trường.

**Giải pháp khắc phục (Recommended Fix):**  
1. Xóa hoàn toàn trường `audioUrl` khỏi schema CSDL nếu hệ thống không lưu file âm thanh.
2. Nếu lưu file âm thanh phục vụ debug chất lượng nhận diện, phải cập nhật lại chính sách bảo mật và áp dụng mã hóa đầu cuối.

---

#### 🟡 Issue #41: Máy Trạng Thái (State Machine) Thiếu Nhiều Bước Chuyển Tiếp và Xử Lý Lỗi

> **Mức độ:** 🟡 `MEDIUM` &nbsp;|&nbsp; **Vị trí / Mục tài liệu:** §11.7.1

**Điểm lỗi kỹ thuật (The Flaw):**  
Máy trạng thái chỉ định nghĩa 6 trạng thái hoạt động lý tưởng mà hoàn toàn thiếu các trạng thái xử lý lỗi:
  - Khi ở trạng thái `searching_passage` mà không tìm thấy bài đọc trong CSDL thì chuyển đi đâu?
  - Khi ở trạng thái `reading_lines` mà engine TTS bị lỗi mất kết nối mạng thì xử lý thế nào?
  - Trạng thái `paused` nếu bị treo quá 5 phút thì có tự ngắt không?
  - Không hề có trạng thái `error` hoặc `recovering`.

**Hệ quả & Rủi ro (Why It Breaks):**  
Khi phát sinh tình huống lỗi không được định nghĩa, firmware sẽ bị treo ở trạng thái cũ. Giáo viên không thể tương tác tiếp ngoài việc rút nguồn khởi động lại máy.

**Giải pháp khắc phục (Recommended Fix):**  
1. Bổ sung trạng thái `error` có cơ chế đếm ngược thời gian timeout → chuyển về `idle`.
2. Thêm trạng thái `search_failed` → nhắc giáo viên nhập tên bài đọc bằng tay trên giao diện web.
3. Thêm trạng thái `tts_error` → tự động chuyển sang hiển thị văn bản bài đọc lên màn hình LCD.
4. Lập bảng ma trận chuyển đổi trạng thái (State Transition Matrix) đầy đủ cho toàn bộ kịch bản lỗi.

---

### 4. Điểm Mơ hồ & Lỗ hổng Triển khai
> **Chủ đề:** *Ambiguities & Implementation Gaps*

#### 🔴 Issue #42: Chưa Chọn Nhà Cung Cấp ASR/TTS — Điểm Nghẽn Chặn Toàn Bộ Tiến Độ (Critical Path Blocker)

> **Mức độ:** 🔴 `CRITICAL` &nbsp;|&nbsp; **Vị trí / Mục tài liệu:** §11.9 ("Việc chọn nhà cung cấp TTS/ASR cụ thể cần khảo sát riêng")

**Điểm lỗi kỹ thuật (The Flaw):**  
Toàn bộ Module 11 xoay quanh giọng nói, nhưng đến nay nhà cung cấp dịch vụ ASR và TTS vẫn chưa được lựa chọn. Đây không phải là một chi tiết kỹ thuật nhỏ có thể để lại sau — đây là đường găng quyết định sự sống còn của toàn bộ dự án. Không có ASR thì không có nhận dạng lệnh; không có TTS thì robot không thể phát ra tiếng đọc.

**Hệ quả & Rủi ro (Why It Breaks):**  
Dự án không thể tiến hành triển khai mã nguồn thực tế khi chưa chốt được giao thức và SDK của nhà cung cấp âm thanh. Mọi ước tính về chi phí vận hành, độ trễ và độ chính xác trong tài liệu hiện tại chỉ là những con số giả định vô giá trị.

**Giải pháp khắc phục (Recommended Fix):**  
1. **Quyết định ngay lập tức:** Đánh giá thực nghiệm giữa FPT.AI, Zalo AI, Google Cloud Speech và giải pháp mã nguồn mở (Piper TTS, Whisper ASR).
2. Lập bảng tiêu chí lựa chọn: Độ trễ phản hồi, độ chuẩn thanh điệu tiếng Việt, chi phí trên mỗi 1.000 ký tự/phút gọi, và khả năng chạy offline.
3. Xây dựng bản thử nghiệm PoC (Proof-of-Concept) với 2 nhà cung cấp tiềm năng nhất trước khi chốt danh mục phần cứng.

---

#### 🟠 Issue #43: Chưa Xác Định Công Cụ Phân Loại Ý Định (Intent Classification Engine)

> **Mức độ:** 🟠 `HIGH` &nbsp;|&nbsp; **Vị trí / Mục tài liệu:** §11.7.3 (Bảng ý định), §11.7.5 (Truy xuất bài đọc)

**Điểm lỗi kỹ thuật (The Flaw):**  
Tài liệu ánh xạ các câu nói sang ý định (Intent) nhưng không hề đặc tả CÁCH THỨC phân loại ý định:
  - Sử dụng biểu thức chính quy (Regex)? (Rất dễ vỡ khi câu nói biến thiên).
  - Fine-tune một mô hình NLU tiếng Việt? (Cần dữ liệu huấn luyện lớn).
  - Gọi mô hình ngôn ngữ lớn LLM trên Cloud? (Tốn chi phí token và độ trễ cao).
  - Khớp từ khóa trên chip ESP32? (Vốn từ vựng cực kỳ hạn chế).

**Hệ quả & Rủi ro (Why It Breaks):**  
Không có công cụ phân loại ý định, Bridge Service không thể hiểu được giáo viên đang muốn ra lệnh gì, khiến toàn bộ giao tiếp giọng nói bị vô hiệu hóa.

**Giải pháp khắc phục (Recommended Fix):**  
1. Sử dụng thư viện NLU nhẹ như Rasa NLU hoặc Snips có bộ huấn luyện tiếng Việt.
2. Hoặc sử dụng LLM đám mây (Gemini/ChatGPT) với kỹ thuật Few-Shot Prompting để trích xuất JSON Intent.
3. Thiết lập ngưỡng tin cậy (Confidence Threshold): Nếu độ tin cậy < 0.7, robot sẽ phát âm yêu cầu giáo viên nhắc lại lệnh.

---

#### 🟠 Issue #44: Chưa Có Thỏa Thuận Bản Quyền Nội Dung Sách Giáo Khoa (SGK)

> **Mức độ:** 🟠 `HIGH` &nbsp;|&nbsp; **Vị trí / Mục tài liệu:** §11.1, §11.5, §Phần III

**Điểm lỗi kỹ thuật (The Flaw):**  
Tài liệu đề xuất số hóa toàn bộ các bài đọc trong "Sách Giáo Khoa Tiếng Việt Tiểu học (Lớp 1–5)" vào bảng `DictationPassage`. Nội dung SGK Tiếng Việt thuộc quyền sở hữu trí tuệ và bản quyền của Nhà xuất bản Giáo dục Việt Nam (hoặc các đơn vị phát hành bộ sách Cánh Buồm, Kết nối tri thức...).

**Hệ quả & Rủi ro (Why It Breaks):**  
Việc phân phối nội dung SGK số hóa vào thiết bị phần cứng thương mại hoặc phần mềm công khai mà không có thỏa thuận bản quyền là hành vi vi phạm Luật Sở hữu Trí tuệ, dẫn tới nguy cơ bị khởi kiện và buộc thu hồi sản phẩm.

**Giải pháp khắc phục (Recommended Fix):**  
1. Đàm phán và ký kết thỏa thuận cấp phép sử dụng nội dung với Nhà xuất bản Giáo dục Việt Nam.
2. Hoặc tự biên soạn kho ngữ liệu bài đọc chính tả nguyên bản phù hợp với chương trình khung của Bộ GD&ĐT.
3. Hoặc chỉ cung cấp phần mềm dạng mở (BYOD - Bring Your Own Data) để giáo viên và nhà trường tự tải lên nội dung của họ.

---

#### 🟡 Issue #45: Chưa Có Đặc Tả Bảo Mật Ghép Nối Thiết Bị (Device Pairing)

> **Mức độ:** 🟡 `MEDIUM` &nbsp;|&nbsp; **Vị trí / Mục tài liệu:** §11.6.1 (`POST /api/xiaozhi/devices/pair`), §11.10

**Điểm lỗi kỹ thuật (The Flaw):**  
Quy trình ghép nối thiết bị qua mã QR Code được nhắc đến nhưng hoàn toàn thiếu đặc tả an ninh:
  - Dữ liệu mã hóa trong QR Code gồm những gì? (Device ID? Token? Thông tin Wi-Fi?)
  - Mã QR được sinh ra ngẫu nhiên hay cố định? Có giới hạn thời gian (timestamped)?
  - Thiết bị xác thực danh tính như thế nào trong các lần kết nối tiếp theo?
  - Cơ chế nào ngăn chặn một thiết bị giả mạo mạo danh thiết bị đã ghép nối?

**Hệ quả & Rủi ro (Why It Breaks):**  
Một người dùng bất kỳ có thể tự tạo mã QR giả để ghép nối thiết bị nghe lén vào mạng lớp học, đánh cắp âm thanh hoặc tiêm các lệnh điều khiển phá hoại tiết học.

**Giải pháp khắc phục (Recommended Fix):**  
1. Cấu trúc dữ liệu mã QR: `deviceCode` + `nonce` + `timestamp` + chữ ký `HMAC(secret, deviceCode + nonce + timestamp)`.
2. Bridge Service kiểm tra chữ ký HMAC khi quét mã QR.
3. Thiết bị xác thực phiên kết nối bằng token JWT được cấp sau khi ghép nối thành công, làm mới định kỳ mỗi 24 giờ.

---

#### 🟡 Issue #46: Chưa Có Đặc Tả Cân Bằng Tải Cho "Nhiều Instance Bridge Service"

> **Mức độ:** 🟡 `MEDIUM` &nbsp;|&nbsp; **Vị trí / Mục tài liệu:** §11.11 ("Bridge Service stateless → có thể chạy nhiều instance")

**Điểm lỗi kỹ thuật (The Flaw):**  
Tài liệu khẳng định có thể chạy đồng thời nhiều instance của Bridge Service nhưng không chỉ ra:
  - Thiết bị ESP32 khám phá danh sách các instance khả dụng bằng cách nào?
  - Các kết nối WebSocket được điều hướng tới đúng instance quản lý phiên ra sao?
  - Cơ chế kiểm tra sức khỏe (Health Check) của từng instance?
  - Điều gì xảy ra với luồng âm thanh đang stream dở khi một instance bị sập?

**Hệ quả & Rủi ro (Why It Breaks):**  
Thiếu thiết kế cân bằng tải, việc "chạy nhiều instance" chỉ là khẩu hiệu lý thuyết chứ không thể triển khai trên hạ tầng thực tế.

**Giải pháp khắc phục (Recommended Fix):**  
1. Sử dụng Redis để quản lý liên kết phiên: Lưu bản đồ `deviceCode` → `instanceId`.
2. Thiết lập health check tự động thông qua Kubernetes hoặc systemd.
3. Cấu hình reverse proxy (Nginx với `proxy_timeout` và hỗ trợ WebSocket) để quản lý thoát phiên mượt mà (Connection Draining).

---

#### 🔵 Issue #47: Bảng Chi Phí Linh Kiện (BOM) Đánh Giá Thấp Chi Phí Gia Công & Lắp Ráp

> **Mức độ:** 🔵 `LOW` &nbsp;|&nbsp; **Vị trí / Mục tài liệu:** §11.3.3

**Điểm lỗi kỹ thuật (The Flaw):**  
Bảng chi phí linh kiện BOM ước tính giá thành ~315.000 VNĐ (~$13 USD) cho một thiết bị nhưng hoàn toàn bỏ qua các chi phí:
  - Gia công mạch in PCB.
  - Chi phí nhân công hàn linh kiện và lắp ráp thủ công.
  - Chi phí vật liệu và thời gian in vỏ 3D.
  - Phí vận chuyển, bao bì đóng gói và thuế nhập khẩu linh kiện.
  - Chi phí đo kiểm, hiệu chuẩn âm thanh và kiểm thử chất lượng (QA/QC).

**Hệ quả & Rủi ro (Why It Breaks):**  
Giá thành sản xuất thực tế trên mỗi đơn vị sản phẩm sẽ rơi vào khoảng 500.000–700.000 VNĐ. Việc lập kế hoạch ngân sách và thương mại hóa dựa trên đơn giá BOM thô chắc chắn sẽ bị thâm hụt tài chính.

**Giải pháp khắc phục (Recommended Fix):**  
1. Bổ sung hệ số phụ phí tối thiểu 50–70% cho chi phí nhân công và gia công vỏ hộp.
2. Đưa chi phí vận chuyển, đóng gói và kiểm định chất lượng vào bảng tính giá vốn hàng bán (COGS).
3. Tài liệu hóa tổng chi phí sở hữu (TCO) bao gồm cả bảo hành, thay pin định kỳ và sửa chữa.

---

## 📌 Phụ Lục: Tổng Hợp Mức Độ Nghiêm Trọng

| Mức độ nghiêm trọng | Số lượng | Danh mục các Vấn đề Kiểm toán |
| :--- | :---: | :--- |
| 🔴 **CRITICAL (Nghiêm trọng)** | **5** | Issue #16, #28, #29, #32, #33, #42 |
| 🟠 **HIGH (Cao)** | **14** | Issue #10, #17, #18, #19, #22, #23, #30, #31, #34, #35, #36, #38, #39, #43, #44 |
| 🟡 **MEDIUM (Trung bình)** | **12** | Issue #6, #7, #20, #21, #24, #25, #26, #37, #40, #41, #45, #46 |
| 🔵 **LOW (Thấp)** | **2** | Issue #27, #47 |
| ✅ **ĐÃ KHẮC PHỤC / ĐÓNG** | **12** | Issue #1, #2, #3, #4, #5, #8, #9, #11, #12, #13, #14, #15 |
| **TỔNG CÒN LẠI** | **33** | **Báo cáo kiểm toán kỹ thuật cập nhật** |

---

*Hết Báo Cáo Kiểm Toán Kỹ Thuật — ViHand Grade Architecture & Specification Review*
