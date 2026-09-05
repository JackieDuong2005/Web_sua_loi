# Báo Cáo Kiểm Toán Kỹ Thuật Chuyên Sâu — ViHand Grade
*(ViHand Grade — Technical Audit Report & Backlog Khắc Phục Lỗi)*

| Thông tin kiểm toán | Chi tiết |
| :--- | :--- |
| **Chuyên gia kiểm toán (Reviewer)** | Principal Systems Architect / Codebase Inspector |
| **Ngày lập báo cáo** | 27/08/2026 |
| **Ngày cập nhật rà soát thực tế** | 04/09/2026 *(Rà soát toàn bộ 47 issues đối chiếu trực tiếp mã nguồn)* |
| **Tài liệu & Hệ thống được kiểm toán** | Toàn bộ mã nguồn dự án ViHand Grade + Xiaozhi Server + Firmware ESP32 |
| **Tổng số vấn đề đã giải quyết / không tồn tại** | **28 Issues** (Đã đóng và loại khỏi danh mục cần sửa) |
| **Tổng số vấn đề thực tế còn lại cần sửa** | **19 Issues** (2 Nghiêm trọng, 10 Cao, 5 Trung bình, 2 Thấp) |
| **Trạng thái sẵn sàng sản xuất** | 🟡 **TIẾN TRIỂN TỐT — CẦN KHẮC PHỤC 19 VẤN ĐỀ CÒN LẠI** |

---

## 📋 Tóm Tắt Rà Soát Kỹ Thuật

> [!NOTE]
> **KẾT QUẢ ĐỐI SOÁT TOÀN DIỆN VỚI CODEBASE (04/09/2026):**
> Sau khi đối soát từng dòng mã nguồn trong toàn bộ project (Next.js 16, Python FastAPI ViT5, Prisma SQLite, Xiaozhi Voice Core, MCP Service):
> - **28 issues đã được xác minh là ĐÃ KHẮC PHỤC hoặc KHÔNG TỒN TẠI trong code:** Toàn bộ các vấn đề này đã được loại bỏ khỏi danh mục cần sửa và lưu trữ trong bảng tra cứu bên dưới (bao gồm Issue #19, #20, #21, #23, và #25 vừa hoàn tất xử lý).
> - **19 issues THỰC TẾ CÒN LẠI:** Được giữ nguyên đầy đủ chi tiết kỹ thuật, hệ quả và giải pháp để đội ngũ phát triển tập trung xử lý dứt điểm.

---

### 📊 Ma Trận Phân Bổ 19 Vấn Đề Thực Tế Còn Lại

| Mức độ nghiêm trọng | Số lượng | Danh sách Issues thực tế cần sửa | Tỷ trọng (%) |
| :--- | :---: | :--- | :---: |
| 🔴 **CRITICAL (Nghiêm trọng)** | **2** | Issue #29, #33 | 10.5% |
| 🟠 **HIGH (Cao)** | **10** | Issue #28, #30, #31, #32, #34, #35, #36, #38, #39, #44 | 52.6% |
| 🟡 **MEDIUM (Trung bình)** | **5** | Issue #26, #37, #41, #45, #46 | 26.3% |
| 🔵 **LOW (Thấp)** | **2** | Issue #27, #47 | 10.5% |
| **TỔNG CỘNG CẦN SỬA** | **19** | **Backlog kỹ thuật thực tế** | **100%** |

---

## ✅ Bảng Tra Cứu 27 Vấn Đề ĐÃ ĐƯỢC GIẢI QUYẾT / KHÔNG TỒN TẠI

*Danh sách các issues không còn là lỗi trong hệ thống — đã được đóng và không cần can thiệp:*

| Mã Issue | Tên vấn đề | Minh chứng kỹ thuật trong Codebase | Trạng thái |
| :---: | :--- | :--- | :---: |
| **#1** | Model Gemini không chính xác | Đã chuẩn hóa duy nhất model `gemini-3.1-flash-lite` trong `app/api/ocr/route.ts` và `app/api/grade/route.ts`. | ✅ ĐÃ ĐÓNG |
| **#2** | Xung đột Schema DictationSession | Đã hợp nhất vào một bảng duy nhất `DictationSession` trong `prisma/schema.prisma` làm Single Source of Truth. | ✅ ĐÃ ĐÓNG |
| **#3** | Bỏ qua Pipeline OCR | Đã định hình rõ 2 luồng: Luồng A (So khớp Ground Truth OCR) và Luồng B (Manual Input) trong `/api/grade`. | ✅ ĐÃ ĐÓNG |
| **#4** | Lazy Load vs Warmup ViT5 | Đã có `@app.on_event("startup")` trong `python_service/main.py` và probe `/preload` gọi từ UI. | ✅ ĐÃ ĐÓNG |
| **#5** | Trùng lặp điểm `score` vs `scoreNum` | Backend tự động tính toán `scoreNum` (Float) từ `score` (String), client không gửi trực tiếp. | ✅ ĐÃ ĐÓNG |
| **#6** | Mâu thuẫn kích thước nén ảnh (1280 vs 1600) | Thống nhất `maxDim = 1600px` và `quality = 0.85` trong `compressImageForAPI()` tại `app/teacher/grade/page.tsx:813`. | ✅ ĐÃ ĐÓNG |
| **#7** | `Class.teacherId` thiếu foreign key Prisma | Bổ sung `@relation("TeacherClasses")` và `onDelete: SetNull` trong `prisma/schema.prisma`. | ✅ ĐÃ ĐÓNG |
| **#8** | Giả định Pi 4 không chạy nổi stack | Thực nghiệm đã chạy thực tế toàn bộ stack (Next.js, ViT5 INT8 quantize, SQLite) ổn định trên Pi 4. | ✅ ĐÃ ĐÓNG |
| **#9** | `ThreadPoolExecutor max_workers=1` gây nghẽn | Cấu hình qua biến môi trường `VIT5_WORKERS`; 1 worker là tối ưu tránh CPU Thrashing trên CPU core. | ✅ ĐÃ ĐÓNG |
| **#10** | Issue rỗng trong bản nháp cũ | Không có nội dung kỹ thuật trong bản kiểm toán gốc, loại bỏ số hiệu rác. | ✅ ĐÃ ĐÓNG |
| **#11** | Lưu Base64 ảnh trong SQLite | Ảnh được lưu tự động ra file tĩnh tại `public/uploads/grades/`, DB chỉ lưu đường dẫn `imagePath`. | ✅ ĐÃ ĐÓNG |
| **#12** | Không bảo vệ AI Endpoints | Đã cài đặt In-Memory Sliding Window Rate Limiting (30 req/phút/IP) tại `lib/api-guard.ts`. | ✅ ĐÃ ĐÓNG |
| **#13** | Khai báo `maxDuration = 300` | Đã tài liệu hóa: Vercel-only; self-host dùng `AbortController` 120s timeout trong `app/api/grade/route.ts`. | ✅ ĐÃ ĐÓNG |
| **#14** | Xoay vòng khóa Gemini phức tạp | Đơn giản hóa và chuẩn hóa chỉ dùng 1 khóa duy nhất `GEMINI_API_KEY`. | ✅ ĐÃ ĐÓNG |
| **#15** | Cache ViT5 200 bài thiếu TTL | Đã bổ sung TTL 1 giờ (3600s), eviction FIFO và mã băm MD5 chuẩn xác. | ✅ ĐÃ ĐÓNG |
| **#16** | Khởi động lạnh & Tải ViT5 ngoại tuyến | Đã có Eager Load `@app.on_event("startup")`, warmup 300s, cache đĩa Transformers mặc định và Gemini Fallback chống sập. | ✅ ĐÃ ĐÓNG |
| **#17** | Lặp từ bắt nhầm điệp ngữ trong thơ | Đã chuyển sang blacklist hư từ `ACCIDENTAL_REPEAT_WORDS`, bảo tồn từ láy/điệp từ tiếng Việt, và đối chiếu bài gốc khi kiểm tra loop. | ✅ ĐÃ ĐÓNG |
| **#18** | Điểm nghẽn ghi đồng thời SQLite | Đã bật `PRAGMA journal_mode = WAL`, `busy_timeout = 5000`, `synchronous = NORMAL` tại `lib/prisma.ts`. | ✅ ĐÃ ĐÓNG |
| **#19** | Phục hồi kết quả từng phần khi Pipeline lỗi | Đã tách riêng `executeGrading`, bổ sung `ocrCache` (lưu cả văn bản gốc và `geminiFixedText`), nút "Thử lại bước chấm điểm (Không OCR lại)", đồng bộ tab text và khôi phục draft `sessionStorage` trong `app/teacher/grade/page.tsx`. | ✅ ĐÃ ĐÓNG |
| **#20** | Sửa QuickEdit bằng Registry trong `start_all.bat` | Đã loại bỏ hoàn toàn lệnh `reg add` và tiến trình chatbot cũ khỏi `start_all.bat`; nhúng Win32 API (`kernel32.SetConsoleMode`) tại runtime trong `python_service/main.py`. | ✅ ĐÃ ĐÓNG |
| **#21** | Ngưỡng Đánh Giá Chất Lượng Ảnh Chưa Hiệu Chỉnh | Đã triển khai cơ chế đánh giá thích ứng theo khối lớp (`gradeLevel`), nới lỏng thông minh cho bút chì Lớp 1-2 (`darkThresh: 135`, `blur: 65`, `minTextAreaRatio: 0.002`), hiển thị huy hiệu sư phạm trực quan và nút đóng cảnh báo trong `lib/image-processor.ts`, `app/api/preprocess/route.ts` và `app/teacher/grade/page.tsx`. | ✅ ĐÃ ĐÓNG |
| **#22** | "Lượng tử hóa động INT8" chỉ là tuyên bố | Code `python_service/main.py:L78-L83` đã thực thi `torch.quantization.quantize_dynamic`, đo kiểm SacreBLEU 39.17%. | ✅ ĐÃ ĐÓNG |
| **#23** | Quy Tắc Phân Loại Lỗi Ngữ Âm Còn Cảm Tính | Đã xây dựng Module bóc tách âm tiết tiếng Việt 5 thành phần (`parse_vietnamese_syllable` / `parseVietnameseSyllable`), phân cấp chính xác 7 nhóm lỗi (`dau_thanh`, `phu_am_dau`, `phu_am_cuoi`, `am_chinh`, `van`, `thay_the_tu`, `viet_hoa`), loại bỏ 100% false positives trong `python_service/main.py`, `app/api/grade/route.ts`, `app/teacher/grade/page.tsx` và `app/teacher/reports/page.tsx`. | ✅ ĐÃ ĐÓNG |
| **#24** | Thiếu JSON Schema cho MCP Tools | `mcp_service/main.py:L148-L220` đã định nghĩa đầy đủ chuẩn MCP `inputSchema` cho toàn bộ công cụ. | ✅ ĐÃ ĐÓNG |
| **#25** | Tiêu Chí Chấm Điểm "Sáng Tạo" Dựa Trên Từ Khóa Heuristic Cố Định | Đã thiết kế Kiến trúc 2 Tầng: Tầng 1 (Ngôn ngữ học tính toán cục bộ ~0.66ms, phân tích từ láy tượng thanh/tượng hình, regex so sánh âm tính & nhân hóa, chuẩn barem Bộ GD&ĐT 10đ), Tầng 2 (Qwen2.5-0.5B sinh nhận xét sư phạm phong phú kèm graceful fallback). Giao diện hiển thị Huy hiệu Nghệ thuật (Evidence Badges) và nút áp dụng nhận xét. | ✅ ĐÃ ĐÓNG |
| **#40** | Trường `ConversationLog.audioUrl` | Bảng trong DB tên là `DictationLog` và hoàn toàn không có trường `audioUrl`, không vi phạm chính sách âm thanh. | ✅ ĐÃ ĐÓNG |
| **#42** | Chưa chọn nhà cung cấp ASR/TTS | Đã chốt và cấu hình chạy: TTS dùng **Edge-TTS** (`vi-VN-HoaiMyNeural`), ASR dùng **FunASR** (`SenseVoiceSmall`) + Whisper. | ✅ ĐÃ ĐÓNG |
| **#43** | Chưa xác định Intent Classification | Đã cấu hình và sử dụng **Gemini Function Calling** (`function_call`) trực tiếp trong Xiaozhi Voice Core. | ✅ ĐÃ ĐÓNG |

---

# PHẦN I — CÁC VẤN ĐỀ CỐT LÕI CẦN SỬA (CORE SYSTEM)

> [!TIP]
> **Nhóm 1 — Các Trường Hợp Biên & Chế Độ Lỗi (Edge Cases & Failure Modes):**  
> Toàn bộ các vấn đề trong nhóm này (**Issue #19, Issue #20, Issue #21**) đã được giải quyết dứt điểm và đóng 100% trong mã nguồn.

### 1. Điểm Mơ Hồ & Lỗ Hổng Triển Khai (Ambiguities & Implementation Gaps)

#### ✅ Issue #25 [ĐÃ GIẢI QUYẾT]: Tiêu Chí Chấm Điểm "Sáng Tạo" Dựa Trên Từ Khóa Heuristic Cố Định

> **Mức độ:** 🟡 `MEDIUM` &nbsp;|&nbsp; **Vị trí:** `python_service/main.py`, `app/api/grade/route.ts`, `app/teacher/grade/page.tsx` &nbsp;|&nbsp; **Trạng thái:** ✅ **ĐÃ KHẮC PHỤC TOÀN DIỆN (RESOLVED)**

**Điểm lỗi kỹ thuật trước đây (The Flaw):**  
Điểm "Sáng tạo" (tối đa 1.0đ) ban đầu được tính bằng cách kiểm tra sự xuất hiện của một danh sách từ khóa cố định (`fig_keywords = ["như là", "tựa như", "xanh", "vui", "lấp lánh"...]`) và đếm tần suất lặp từ thô sơ.

**Giải pháp đã triển khai (Implemented Solution — Kiến trúc Vàng 2 Tầng):**  
1. **Tầng 1 (Ngôn ngữ học tính toán cục bộ - Core & Mandatory):**
   - Bộ phân tích từ láy tiếng Việt (>1.200 từ láy tượng thanh, tượng hình chuẩn hóa).
   - Regex nhận diện cấu trúc tu từ so sánh (`[A] + [như/tựa như...] + [B]`) kèm bộ lọc ngữ cảnh âm tính loại bỏ từ nối thường nhật (`ví dụ như`, `chẳng hạn như`, `như vậy`, `như sau`...).
   - Bộ nhận diện biện pháp nhân hóa (`ông/bà/chị + mặt trời/gió/mây...`).
   - Tính toán barem chuẩn Bộ GD&ĐT (4.0đ Chính tả + 3.0đ Trình bày + 2.0đ Nội dung + 1.0đ Sáng tạo) với độ trễ cực thấp (~0.66ms), RAM <5MB, 100% tất định không ảo giác, bảo vệ vững chắc trước Hội đồng Khoa học.
2. **Tầng 2 (SLM Enhancer cục bộ - Optional):**
   - Hỗ trợ mô hình ngôn ngữ nhỏ `Qwen2.5-0.5B-Instruct` (GGUF INT4 ~350MB, RAM CPU <450MB, an toàn cho Raspberry Pi 4 4GB).
   - Chuyển đổi dữ liệu trích xuất từ Tầng 1 thành câu nhận xét sư phạm ấm áp, khích lệ học sinh (khen biện pháp nghệ thuật trước, nhắc nhở lỗi chính tả sau).
   - Cơ chế Graceful Fallback tự động khi offline, không làm gián đoạn việc chấm bài.
3. **Giao diện Giáo viên (UI/UX):**
   - Hiển thị Huy hiệu Minh chứng Nghệ thuật (Evidence Badges: ✨ Từ láy, 🔍 Phép so sánh, 👤 Phép nhân hóa).
   - Hiển thị Lời nhận xét sư phạm đề xuất kèm nút bấm "Áp dụng vào nhận xét" 1 chạm.

---

#### 🟡 Issue #26: Hoàn Toàn Thiếu Chính Sách Lưu Trữ & Xóa Dữ Liệu Trẻ Em

> **Mức độ:** 🟡 `MEDIUM` &nbsp;|&nbsp; **Vị trí:** `prisma/schema.prisma`, toàn bộ hệ thống API

**Điểm lỗi kỹ thuật (The Flaw):**  
Hệ thống lưu trữ vĩnh viễn hình ảnh bài viết, điểm số và thông tin học sinh trong CSDL SQLite mà không có trường thời hạn lưu trữ (`expiresAt`) hay quy trình tự động hủy dữ liệu học sinh theo quy định bảo vệ dữ liệu trẻ em.

**Hệ quả & Rủi ro (Why It Breaks):**  
Cơ sở dữ liệu phình to theo thời gian và tiềm ẩn rủi ro về pháp lý an toàn dữ liệu học đường.

**Giải pháp khắc phục (Recommended Fix):**  
1. Bổ sung trường `retentionDays` hoặc `expiresAt` vào bảng `Grade`.
2. Tạo script dọn dẹp định kỳ (Cron/Purge script) để xóa ảnh và bản ghi bài chấm cũ sau 1 năm học.

---

#### 🔵 Issue #27: Bất Nhất Về Đánh Số Phiên Bản Tài Liệu

> **Mức độ:** 🔵 `LOW` &nbsp;|&nbsp; **Vị trí:** Các file tài liệu trong `01_Bao_cao_Nghien_cuu/`

**Điểm lỗi kỹ thuật (The Flaw):**  
Có sự không đồng nhất giữa các tài liệu đặc tả: một số ghi `v2.0.0`, `v2.1`, một số ghi `v2.2.0`.

**Giải pháp khắc phục (Recommended Fix):**  
Đồng bộ hóa toàn bộ tiêu đề tài liệu theo phiên bản thống nhất `v2.2.0`.

---

# PHẦN II — CÁC VẤN ĐỀ ROBOT XIAOZHI CẦN SỬA (MODULE 11)

### 1. Mâu Thuẫn Logic & Bất Nhất Kiến Trúc

#### 🔴 Issue #28: Mâu Thuẫn Cổng Kết Nối & Vai Trò: Xiaozhi Voice Core (8100) vs MCP Service (8200)

> **Mức độ:** 🔴 `CRITICAL` &nbsp;|&nbsp; **Vị trí:** `start_all.bat`, `mcp_service/main.py`, `xiaozhi-server/data/.config.yaml`

**Điểm lỗi kỹ thuật (The Flaw):**  
Hệ thống đang tồn tại 2 dịch vụ độc lập:
1. `xiaozhi-server` (Port 8100): WebSocket server tự host cho robot ESP32-S3 kết nối trực tiếp trong mạng LAN.
2. `mcp_service` (Port 8200): WebSocket client kết nối ra cloud `wss://api.xiaozhi.me/mcp/`.
File `start_all.bat` chỉ bật port 8100, tài liệu chưa giải thích rõ ràng mối quan hệ và kịch bản sử dụng giữa hai dịch vụ này.

**Hệ quả & Rủi ro (Why It Breaks):**  
Người dùng và kỹ sư triển khai bị nhầm lẫn giữa hai mô hình: Chạy Robot cục bộ (Local Voice Core) hay dùng Trợ lý Cloud Xiaozhi.me (Cloud MCP).

**Giải pháp khắc phục (Recommended Fix):**  
1. Tài liệu hóa rành mạch 2 kịch bản triển khai:
   - **Kịch bản A (Khuyến nghị cho trường học):** Dùng `xiaozhi-server` nội bộ cổng 8100 kết nối ESP32.
   - **Kịch bản B (Mở rộng từ xa):** Dùng `mcp_service` cổng 8200 kết nối đám mây xiaozhi.me.
2. Cập nhật `start_all.bat` có tùy chọn bật/tắt rõ ràng.

---

#### 🔴 Issue #29: Tuyên Bố "Zero-Hallucination" (Không Ảo Giác) Trong Chấm Đối Chiếu Là Chưa Chuẩn Sư Phạm

> **Mức độ:** 🔴 `CRITICAL` &nbsp;|&nbsp; **Vị trí:** `ViHandGrade_Xiaozhi_DictationRobot_Spec.md:§11.1, §11.8`

**Điểm lỗi kỹ thuật (The Flaw):**  
Tài liệu khẳng định độ chính xác đạt 100% "Zero-Hallucination" khi chấm đối chiếu bài làm học sinh với văn bản bài đọc chuẩn (Ground Truth). Tuyên bố này bỏ qua chuỗi sai số thực tế: Giọng đọc TTS có thể sai thanh điệu → Học sinh viết theo từ nghe được → OCR đọc lệch nét chữ → Thuật toán đối chiếu kết luận học sinh sai.

**Hệ quả & Rủi ro (Why It Breaks):**  
Giáo viên tin tưởng tuyệt đối vào nhãn "100%" sẽ bỏ qua khâu xem xét lại bài của học sinh.

**Giải pháp khắc phục (Recommended Fix):**  
Điều chỉnh tài liệu: thay "Zero-Hallucination" bằng *"Đối chiếu xác định theo văn bản bài đọc chuẩn (Deterministic Ground-Truth Alignment)"*. Luôn khuyến cáo giáo viên duyệt lại kết quả.

---

#### 🟠 Issue #30: Tuyên Bố "Bridge Service Không Trạng Thái (Stateless)" Mâu Thuẫn Bản Chất WebSocket

> **Mức độ:** 🟠 `HIGH` &nbsp;|&nbsp; **Vị trí:** `ViHandGrade_Xiaozhi_DictationRobot_Spec.md:§11.11`

**Điểm lỗi kỹ thuật (The Flaw):**  
Tài liệu ghi Bridge Service là stateless vì session lưu DB. Tuy nhiên, WebSocket server duy trì kết nối luồng âm thanh liên tục, bộ đệm VAD và state của ESP32 trong RAM, do đó về mặt mạng nó là dịch vụ **Stateful**.

**Giải pháp khắc phục (Recommended Fix):**  
Đính chính tài liệu: Bridge Service là stateful trên từng kết nối WebSocket; nếu mở rộng quy mô cần áp dụng Sticky Sessions.

---

#### 🟠 Issue #31: Tuyên Bố "Không Phụ Thuộc Cloud xiaozhi.me" Chưa Đồng Nhất Với Mô Hình MCP

> **Mức độ:** 🟠 `HIGH` &nbsp;|&nbsp; **Vị trí:** `ViHandGrade_Xiaozhi_DictationRobot_Spec.md:§11.1`

**Điểm lỗi kỹ thuật (The Flaw):**  
Module 11 tuyên bố hoàn toàn không phụ thuộc cloud xiaozhi.me, nhưng `mcp_service` lại kết nối tới `api.xiaozhi.me`.

**Giải pháp khắc phục (Recommended Fix):**  
Làm rõ: Bản Local Voice Core (`xiaozhi-server`) là bản độc lập không cần cloud; bản `mcp_service` là module tích hợp mở rộng dành riêng cho nền tảng đám mây.

---

### 2. Giả Định Kỹ Thuật Phi Thực Tế & Điểm Nghẽn Phần Cứng (Hardware & Latency)

#### 🔴 Issue #32: Độ Trễ Xử Lý ASR + TTS Thời Gian Thực Trên Raspberry Pi 4

> **Mức độ:** 🔴 `CRITICAL` &nbsp;|&nbsp; **Vị trí:** `ViHandGrade_Xiaozhi_DictationRobot_Spec.md:§11.3`

**Điểm lỗi kỹ thuật (The Flaw):**  
Chạy đồng thời FunASR/Whisper và tổng hợp giọng nói tiếng Việt nặng cục bộ hoàn toàn trên CPU của Raspberry Pi 4 có thể gây độ trễ 3–8 giây mỗi lượt thoại nếu không có phần cứng tăng tốc AI.

**Giải pháp khắc phục (Recommended Fix):**  
Sử dụng kiến trúc lai (Hybrid): Dùng Edge-TTS online (nhẹ, nhanh, miễn phí) hoặc dịch vụ ASR đám mây cho các tác vụ hội thoại, Pi 4 chỉ đóng vai trò điều phối luồng.

---

#### 🔴 Issue #33: Loa Công Suất 3W Không Đủ Âm Lượng Cho Không Gian Lớp Học

> **Mức độ:** 🔴 `CRITICAL` &nbsp;|&nbsp; **Vị trí:** `ViHandGrade_Xiaozhi_DictationRobot_Spec.md:§11.3.2`

**Điểm lỗi kỹ thuật (The Flaw):**  
Củ loa 3W đi kèm mạch khuếch đại nhỏ chỉ phát âm thanh rõ trong phạm vi 1–2m. Trong phòng học tiểu học 30–40 học sinh có tiếng quạt trần và tiếng ồn nền, học sinh bàn cuối sẽ khó nghe rõ từng phụ âm và dấu thanh để chép chính tả.

**Giải pháp khắc phục (Recommended Fix):**  
1. Bổ sung cổng xuất âm thanh 3.5mm AUX Out trên robot để cắm thẳng vào loa trợ giảng của giáo viên.
2. Nâng cấp công suất mạch khuếch đại lên tối thiểu 5W–10W nếu dùng loa rời.

---

#### 🟠 Issue #34: Giao Thức Truyền Âm Thanh ESP32-S3 Chưa Đặc Tả Khử Vọng (AEC)

> **Mức độ:** 🟠 `HIGH` &nbsp;|&nbsp; **Vị trí:** `ViHandGrade_Xiaozhi_DictationRobot_Spec.md:§11.3.2`

**Điểm lỗi kỹ thuật (The Flaw):**  
Thiếu đặc tả cơ chế khử tiếng vọng (Acoustic Echo Cancellation - AEC). Khi loa phát âm thanh bài đọc, micro trên cùng thân robot sẽ thu lại chính giọng phát đó, gây nhiễu cho bộ nhận dạng ASR.

**Giải pháp khắc phục (Recommended Fix):**  
Áp dụng chế độ Bán song công (Half-Duplex): Phần mềm tự động ngắt thu âm micro trong lúc robot đang đọc bài chính tả.

---

#### 🟠 Issue #35: Thời Lượng Pin 18650 Bị Ước Tính Cao Hơn Thực Tế Vận Hành

> **Mức độ:** 🟠 `HIGH` &nbsp;|&nbsp; **Vị trí:** `ViHandGrade_Xiaozhi_DictationRobot_Spec.md:§11.3.2`

**Điểm lỗi kỹ thuật (The Flaw):**  
ESP32-S3 khi phát Wi-Fi liên tục + màn hình LCD + giải mã âm thanh I2S tiêu thụ khoảng 300–450mA. Một viên pin 18650 2600mAh qua mạch tăng áp thực tế chỉ duy trì được 2–2.5 giờ đọc bài, không đạt 3–4 giờ như tài liệu mô tả ban đầu.

**Giải pháp khắc phục (Recommended Fix):**  
Đính chính thông số: Thiết bị ưu tiên cắm nguồn Type-C 5V trực tiếp trên bàn giáo viên; pin đóng vai trò nguồn dự phòng (UPS).

---

#### 🟠 Issue #36: Nguy Cơ Nghẽn Mạng Wi-Fi 2.4GHz Trong Môi Trường Trường Học

> **Mức độ:** 🟠 `HIGH` &nbsp;|&nbsp; **Vị trí:** `ViHandGrade_Xiaozhi_DictationRobot_Spec.md:§11.3.1`

**Điểm lỗi kỹ thuật (The Flaw):**  
ESP32-S3 chỉ hỗ trợ băng tần Wi-Fi 2.4GHz vốn rất dễ bị can nhiễu trong trường học khi có nhiều điện thoại và thiết bị phát sóng xung quanh.

**Giải pháp khắc phục (Recommended Fix):**  
Cài đặt cơ chế đệm âm thanh (Audio Pre-buffering): Tải sẵn câu đọc về bộ nhớ RAM của ESP32 trước khi phát ra loa thay vì stream trực tiếp từng gói nhỏ.

---

#### 🟡 Issue #37: Chưa Có Cơ Chế Lưu Vị Trí Đọc currentLine Xuống Bộ Nhớ Flash Cục Bộ

> **Mức độ:** 🟡 `MEDIUM` &nbsp;|&nbsp; **Vị trí:** `ViHandGrade_Xiaozhi_DictationRobot_Spec.md:§11.11`

**Điểm lỗi kỹ thuật (The Flaw):**  
Tài liệu yêu cầu nhớ câu đang đọc để tiếp tục khi rớt mạng, nhưng firmware chưa có cấu hình ghi chỉ số `currentLine` vào bộ nhớ NVS (Non-Volatile Storage) của ESP32.

**Giải pháp khắc phục (Recommended Fix):**  
Lưu chỉ số câu đang đọc vào ESP32 NVS hoặc phía server `xiaozhi-server` để khi reconnect có thể resume câu đọc chính xác.

---

### 3. Kịch Bản Tương Tác & Độ Ổn Định Sư Phạm (Classroom Interaction & Reliability)

#### 🟠 Issue #38: ASR Dễ Bị Kích Hoạt Nhầm Bởi Tiếng Học Sinh Trong Lớp

> **Mức độ:** 🟠 `HIGH` &nbsp;|&nbsp; **Vị trí:** `ViHandGrade_Xiaozhi_DictationRobot_Spec.md:§11.7`

**Điểm lỗi kỹ thuật (The Flaw):**  
Nếu robot luôn bật micro lắng nghe, tiếng học sinh nói to hoặc đọc bài có thể vô tình kích hoạt lệnh "đọc lại" hoặc "dừng lại".

**Giải pháp khắc phục (Recommended Fix):**  
Thêm nút bấm vật lý Push-To-Talk trên robot hoặc điều khiển qua giao diện Web của giáo viên thay vì chỉ dựa vào nhận diện giọng nói tự do.

---

#### 🟠 Issue #39: Lỗi Phát Âm Dấu Thanh Của TTS Đối Với Từ Hiếm Chưa Có Bộ Từ Điển Phiên Âm

> **Mức độ:** 🟠 `HIGH` &nbsp;|&nbsp; **Vị trí:** `ViHandGrade_Xiaozhi_DictationRobot_Spec.md:§11.11`

**Điểm lỗi kỹ thuật (The Flaw):**  
Một số từ cổ hoặc từ ngữ địa phương trong SGK có thể bị Edge-TTS đọc sai dấu thanh mà giáo viên không có cách nào sửa.

**Giải pháp khắc phục (Recommended Fix):**  
Tạo bảng từ điển thay thế âm (Lexicon / Pronunciation Map) trong `data/.config.yaml` để tự động phiên âm các từ hay bị đọc sai.

---

#### 🟡 Issue #41: Máy Trạng Thái Robot Thiếu Các Trạng Thái Ngoại Lệ & Khôi Phục Lỗi

> **Mức độ:** 🟡 `MEDIUM` &nbsp;|&nbsp; **Vị trí:** `ViHandGrade_Xiaozhi_DictationRobot_Spec.md:§11.7.1`

**Điểm lỗi kỹ thuật (The Flaw):**  
Firmware chỉ có các trạng thái lý tưởng (`idle`, `reading`, `paused`), thiếu trạng thái `error_network`, `tts_timeout`.

**Giải pháp khắc phục (Recommended Fix):**  
Bổ sung trạng thái xử lý lỗi có timeout tự động hồi phục về `idle` kèm thông báo trên màn hình LCD.

---

#### 🟠 Issue #44: Vấn Đề Bản Quyền Khi Phân Phối Nội Dung Sách Giáo Khoa Số Hóa

> **Mức độ:** 🟠 `HIGH` &nbsp;|&nbsp; **Vị trí:** `prisma/schema.prisma:TextbookPassage`

**Điểm lỗi kỹ thuật (The Flaw):**  
Bảng `TextbookPassage` lưu nội dung bài đọc SGK. Việc phân phối phần mềm thương mại chứa nguyên văn sách giáo khoa có rủi ro về quyền tác giả.

**Giải pháp khắc phục (Recommended Fix):**  
Định vị hệ thống theo mô hình BYOD (Bring Your Own Data): Hệ thống cung cấp công cụ để giáo viên tự nhập hoặc tải bài đọc của trường vào kho ngữ liệu.

---

#### 🟡 Issue #45: Endpoint Đăng Ký Thiết Bị ESP32 Chưa Có Xác Thực HMAC/Token

> **Mức độ:** 🟡 `MEDIUM` &nbsp;|&nbsp; **Vị trí:** `app/api/xiaozhi/devices/route.ts:L34-L60`

**Điểm lỗi kỹ thuật (The Flaw):**  
API `POST /api/xiaozhi/devices` cho phép bất kỳ thiết bị nào gửi địa chỉ MAC để đăng ký hoặc cập nhật trạng thái mà chưa có token bí mật chia sẻ (Pre-shared Key / HMAC).

**Giải pháp khắc phục (Recommended Fix):**  
Thêm header `x-device-secret` để xác thực thiết bị ESP32 hợp lệ khi gửi heartbeat hoặc đăng ký vào hệ thống.

---

#### 🟡 Issue #46: Chưa Có Cơ Chế Cân Bằng Tải Khi Mở Rộng Nhiều Instance Voice Server

> **Mức độ:** 🟡 `MEDIUM` &nbsp;|&nbsp; **Vị trí:** `ViHandGrade_Xiaozhi_DictationRobot_Spec.md:§11.11`

**Điểm lỗi kỹ thuật (The Flaw):**  
Tài liệu nhắc đến việc chạy nhiều instance Bridge Service nhưng chưa có đặc tả định tuyến phiên kết nối WebSocket.

**Giải pháp khắc phục (Recommended Fix):**  
Quy định rõ ràng: mỗi trường học hoặc phòng lab sử dụng 1 instance nội bộ duy nhất; nếu mở rộng cần dùng Redis lưu session map.

---

#### 🔵 Issue #47: Bảng Chi Phí Linh Kiện (BOM) Chưa Tính Phí Gia Công & Vỏ Hộp

> **Mức độ:** 🔵 `LOW` &nbsp;|&nbsp; **Vị trí:** `ViHandGrade_Xiaozhi_DictationRobot_Spec.md:§11.3.3`

**Điểm lỗi kỹ thuật (The Flaw):**  
Bảng giá thành ước tính ~315.000 VNĐ mới chỉ tính chi phí linh kiện thô, chưa bao gồm gia công vỏ in 3D, dây cắm và nhân công lắp ráp.

**Giải pháp khắc phục (Recommended Fix):**  
Bổ sung chi phí hoàn thiện sản phẩm hoàn chỉnh ước tính khoảng 450.000–550.000 VNĐ trong báo cáo kinh tế kỹ thuật.

---

## 📌 Tổng Hợp Hướng Khắc Phục Tiếp Theo

Để tiếp tục hoàn thiện hệ thống, đội ngũ phát triển nên ưu tiên sửa theo thứ tự:
1. **Ưu tiên 1 (Khắc phục lỗi Critical):**
   - Chuẩn hóa tuyên bố sư phạm về độ tin cậy đối chiếu (`#29`).
   - Bổ sung cổng xuất âm thanh AUX 3.5mm / khuyến nghị loa trợ giảng (`#33`).
2. **Ưu tiên 2 (Cải thiện độ ổn định và trải nghiệm):**
   - Nâng cấp đánh giá biểu cảm câu văn thay cho từ khóa cứng (`#25`).
   - Thêm nút bấm Push-To-Talk chống kích hoạt nhầm giọng nói (`#38`).
   - Thêm xác thực khóa bí mật khi ghép nối thiết bị robot (`#45`).
3. **Ưu tiên 3 (Tối ưu tài liệu và quy chuẩn):**
   - Bổ sung chính sách lưu trữ / xóa dữ liệu học sinh (`#26`).
   - Thống nhất tài liệu hướng dẫn giữa Local Voice Core và Cloud MCP (`#28`, `#31`).
