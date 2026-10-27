# Báo Cáo Thẩm Định Pháp Y Toàn Vẹn (Forensic Integrity Audit Report)
## Milestone 3: Next.js BFF API Gateway (TTS, Play-Local, and Qwen Director Routes)

**Đơn vị thực hiện**: Forensic Auditor (`auditor_m3`)  
**Ngày thẩm định**: 2026-10-18T20:56:00Z  
**Thư mục làm việc**: `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\auditor_m3`  
**Parent Agent**: `0516b259-befc-4fac-baa8-b10ce65a612b`  
**Chế độ Liêm chính (Integrity Mode)**: `development` (Theo `ORIGINAL_REQUEST.md`)

---

## 1. Observation (Quan sát Pháp y Thực nghiệm)

Thẩm định viên pháp y đã trực tiếp kiểm tra mã nguồn, rà soát văn bản tĩnh và độc lập thực thi toàn bộ chuỗi lệnh kiểm thử hành vi thực tế:

### 1.1. Khảo sát Mã nguồn Tuyến đường (Source Code Deep Inspection)

1. **`app/api/dictation/tts/route.ts`**:
   - Khai báo bắt buộc: `export const dynamic = "force-dynamic"` (Dòng 3).
   - Chuẩn hóa URL backend: `(process.env.VIT5_SERVICE_URL || "http://127.0.0.1:8000").replace("localhost", "127.0.0.1")` (Dòng 11), loại bỏ rủi ro lệch phân giải IPv6 (`::1`) trên Windows.
   - Tiếp nhận và xác thực 7 tham số âm học: `text`, `voice`, `rate`/`speed`, `style`, `noise_scale`, `noise_w`, `read_punctuation` (Dòng 15-55).
   - Cơ chế proxy thực thụ: Tạo `edgeUrl = `${VIT5_SERVICE_URL}/tts?${params.toString()}`` và gọi `fetch(edgeUrl, { signal: controller.signal })` (Dòng 57-65).
   - **Xác thực Byte âm thanh**: Lấy trực tiếp từ luồng mạng `const audioBuffer = await edgeRes.arrayBuffer()` (Dòng 69). **HOÀN TOÀN KHÔNG CÓ** mảng byte giả mạo, chuỗi base64 cứng hay header WAV tự tạo.
   - Headers phản hồi: Bảo toàn `Content-Type: audio/wav`, `Cache-Control: public, max-age=86400, s-maxage=86400`, `X-TTS-Engine`, `X-TTS-Style`, `X-Prosody-Style` (Dòng 76-83).
   - Xử lý timeout & lỗi: `AbortController` 15s (trả về 504 khi `err?.name === "AbortError"`, 503 khi service offline, dòng 92-104).

2. **`app/api/dictation/play-local/route.ts`**:
   - Khai báo bắt buộc: `export const dynamic = "force-dynamic"` (Dòng 3).
   - Kiểm tra định dạng JSON payload: Bắt lỗi cú pháp (Dòng 16-20), từ chối khi `text` rỗng với HTTP 400 (Dòng 37-39).
   - Chuyển tiếp tham số: Đóng gói đầy đủ `text`, `voice`, `rate`, `style`, `noise_scale`, `noise_w`, `read_punctuation` (Dòng 41-62).
   - Cơ chế proxy thực thụ: Gọi `POST ${VIT5_SERVICE_URL}/tts/play-local` qua `fetch` kèm `AbortController` 15s (Dòng 67-72).
   - **Xác thực Phản hồi**: Trả về trực tiếp JSON phân giải từ backend `const data = await res.json()` (Dòng 83). **HOÀN TOÀN KHÔNG CÓ** phản hồi `status: "ok"` giả lập cố định.

3. **`app/api/dictation/qwen-director/route.ts`**:
   - Khai báo bắt buộc: `export const dynamic = "force-dynamic"` và `export const maxDuration = 35` (Dòng 4-5).
   - **Bảo vệ Rate Limiting**: Triệu gọi `guardAiRoute(req, 20, "qwen-director")` ngay tại lối vào POST (Dòng 61-62). Giới hạn trượt 20 requests/phút/IP.
   - Nhánh `GET`: Gọi trực tiếp `${VIT5_SERVICE_URL}/qwen/status` với timeout 10s (Dòng 20-24). Khi backend online, phân giải động các trường `enabled`, `model_id`, `is_loaded`, `lifecycle_mode`, `available_ram_mb`, `cache_entries`, `memory_mode` (Dòng 36-47). Khi backend offline, trả về fallback nhẹ nhàng HTTP 200 `{ enabled: false, is_loaded: false, available_ram_mb: 0, offline: true, lifecycle_mode: "offline" }` để tránh gây crash giao diện giáo viên.
   - Nhánh `POST (action === "extract_sgk")`: Validate `raw_text`, chuyển tiếp `{ raw_text, grade }` tới `${VIT5_SERVICE_URL}/qwen/extract-sgk` với timeout 30s (`AbortSignal.timeout(30000)`). Trả về dữ liệu trích xuất thật từ backend (Dòng 81-117).
   - Nhánh `POST (action === "direct_prosody")`: Validate `passage`, chuyển tiếp `{ passage, difficult_words, grade, chunk_mode }` tới `${VIT5_SERVICE_URL}/qwen/direct-prosody` với timeout 30s. Trả về mảng `clauses` bảo toàn 100% từ ngữ thật (Dòng 132-172).
   - Hành động không hợp lệ: Từ chối với HTTP 400 (Dòng 187-190).

4. **Bộ Kiểm thử `tests/test_bff_routes.py`**:
   - Sử dụng `fastapi.testclient.TestClient` cho kiểm thử microservice FastAPI cục bộ và `urllib.request` trên live sockets (`:3000` và `:8000`).
   - Kiểm tra độ dài byte âm thanh thực tế (`assert len(content) > 5000`, đo đạc thực tế 71,724 - 78,892 bytes).
   - Kiểm tra tính bảo toàn từ ngữ SGK 100% (`assert orig_words == recon_words`).
   - Kiểm tra SHA-256 LRU Prosody Cache hit (< 1ms).
   - Kiểm tra vòng đời giải phóng RAM của Qwen (`ram_unloaded is True`, `is_loaded is False`).
   - Không chứa bất kỳ câu lệnh `pass` rỗng, assertion giả lập, hay cờ bỏ qua kiểm tra.

### 1.2. Rà soát Tạo vật Rác & Tệp Tiền Dàn Dựng (Pre-populated Artifact Audit)

- Rà soát các tệp `*.log`, `*result*`, `*output*` trong toàn bộ workspace: Kết quả 0 tệp khả nghi.
- Rà soát các chuỗi `dummy`, `mock`, `fake` trong thư mục `app/api/dictation`: Kết quả 0 kết quả phát hiện.

### 1.3. Kết quả Thực thi Lệnh Thực nghiệm Độc lập

| Lệnh Kiểm tra | Mục tiêu Thực nghiệm | Kết quả Thực tế | Đánh giá |
|---|---|---|---|
| `npx tsc --noEmit` | Kiểm tra hệ thống kiểu tĩnh TypeScript | Exit code 0 (0 lỗi) | **PASS** |
| `npm run build` | Biên dịch Next.js App Router Turbopack | Exit code 0 (3/3 route dynamic) | **PASS** |
| `python tests/test_bff_routes.py` | Kiểm thử toàn diện 23 test case BFF & Core | 23/23 PASSED (Exit code 0) | **PASS** |

---

## 2. Logic Chain (Chuỗi Lập luận Pháp y)

```
[Mã nguồn các Route] ──> Sử dụng `fetch` trực tiếp tới Python :8000
                               │
[Xử lý Dữ liệu]      ──> Chuyển tiếp 100% tham số âm học & payload thật
                               │
[Phản hồi Client]    ──> Nhận ArrayBuffer âm thanh & JSON từ service thật
                               │
[Biên dịch & Build]  ──> TypeScript 0 lỗi, Next.js build 100% dynamic
                               │
[Kiểm thử Độc lập]   ──> 23/23 Unit & Live Integration Tests PASS (Exit code 0)
                               │
                         ▼
           [KẾT LUẬN: TOÀN VẸN - CLEAN]
```

1. **Từ Observation 1.1 đến Tính Xác thực của Tuyến đường**:
   Mọi tuyến đường (`tts`, `play-local`, `qwen-director`) đều sử dụng cơ chế `fetch` chuẩn của Web API để kết nối trực tiếp đến `${VIT5_SERVICE_URL}`. Dữ liệu âm thanh là `ArrayBuffer` nhị phân thật (> 70KB) sinh ra bởi mô hình Piper VITS ONNX. Không có bất kỳ kỹ thuật tạo giả (mocking/facade) nào được phát hiện trong mã nguồn.
2. **Từ Observation 1.2 đến Tính Trong sạch của Môi trường**:
   Không tồn tại bất kỳ tệp log, kết quả định sẵn, hay assertion bypass nào trong codebase. Mọi khẳng định kiểm thử đều dựa trên phản hồi HTTP thực tế qua socket loopback `127.0.0.1`.
3. **Từ Observation 1.3 đến Khả năng Vận hành Thực tế**:
   Việc cả 3 lệnh kiểm định nghiêm ngặt nhất (`npx tsc --noEmit`, `npm run build`, và `test_bff_routes.py`) đều kết thúc với mã thoát 0 chứng minh hệ thống API Gateway Milestone 3 hoạt động ổn định, đúng hợp đồng giao diện và sẵn sàng kết nối trực tiếp với giao diện người dùng ở Milestone 4.

---

## 3. Caveats (Lưu ý & Giới hạn)

- **Cấu hình Mạng Đa Môi trường**: Trong mã nguồn, `VIT5_SERVICE_URL` đã được bổ sung cơ chế `.replace("localhost", "127.0.0.1")`. Khi triển khai trên môi trường nhúng Raspberry Pi 4 thực tế kết hợp Cloudflare Tunnel, cần đảm bảo biến môi trường `VIT5_SERVICE_URL` trong `.env` được trỏ chính xác vào IP cục bộ hoặc domain tunnel nếu chạy phân tán giữa các máy chủ.
- **Tương thích HuggingFace Hub trên Python**: Cảnh báo phụ trợ `huggingface-hub>=0.23.2` xuất hiện trong tiến trình Python Core kích hoạt cơ chế tự phục hồi (deterministic fallback) của bộ trích xuất SGK khi thiếu thư viện ngoài; cơ chế này đã được thiết kế sẵn và hoạt động chính xác 100% theo đặc tả Milestone 2.

---

## 4. Conclusion & Forensic Audit Report (Kết luận Pháp y)

```
================================================================================
                           FORENSIC AUDIT REPORT
================================================================================
Work Product : Milestone 3 (Next.js BFF API Gateway Routes & Test Suite)
Target Files : 
  - app/api/dictation/tts/route.ts
  - app/api/dictation/play-local/route.ts
  - app/api/dictation/qwen-director/route.ts
  - tests/test_bff_routes.py
Profile      : General Project (Development Mode)
Verdict      : CLEAN (TUYỆT ĐỐI KHÔNG CÓ VI PHẠM TOÀN VẸN)
================================================================================
```

### Bảng Kết quả Chi tiết Từng Tiêu chí (Forensic Matrix)

| # | Tiêu chí Kiểm tra Pháp y | Yêu cầu Kỹ thuật | Kết quả Thẩm định | Trạng thái |
|---|---|---|---|:---:|
| 1 | Hardcoded test results | Không chứa kết quả kiểm thử gắn cứng | Không phát hiện chuỗi kết quả cứng | **PASS** |
| 2 | Facade implementations | Không tạo hàm rỗng hoặc chỉ `return const` | 100% logic proxy & validation thật | **PASS** |
| 3 | Fabricated verification outputs | Không tạo sẵn file kết quả/log giả mạo | Toàn bộ log sinh động từ test run | **PASS** |
| 4 | Self-certifying tests | Không viết test tự chứng thực không có assert | Assert kiểm tra byte và từ ngữ thật | **PASS** |
| 5 | Audio buffer genuineness | Âm thanh TTS phải từ Piper VITS | Lấy trực tiếp từ `edgeRes.arrayBuffer()` | **PASS** |
| 6 | Acoustic parameter passthrough | Chuyển tiếp style, noise_scale, noise_w, punct | Forward đầy đủ qua URL & JSON body | **PASS** |
| 7 | Qwen status & multiplexer | Proxy status và multiplex SGK / Prosody | Timeout 10s/30s, fallback an toàn | **PASS** |
| 8 | Rate Limiting Guard | Áp dụng giới hạn tải AI Route | `guardAiRoute(req, 20, ...)` hoạt động | **PASS** |
| 9 | Static Type Safety | TypeScript biên dịch 0 lỗi | `npx tsc --noEmit` hoàn thành (Exit 0) | **PASS** |
| 10 | Production Build Readiness | Next.js build thành công toàn bộ | `npm run build` hoàn thành (Exit 0) | **PASS** |
| 11 | Integration Test Suite | Bộ test tự động hóa vượt qua 100% | 23/23 bài kiểm thử PASS (Exit 0) | **PASS** |

---

## 5. Verification Method (Phương pháp Tự Xác thực Độc lập)

Bất kỳ chuyên viên hoặc Agent nào đều có thể độc lập tái hiện và kiểm chứng kết luận trên tại thư mục gốc `c:\Users\Jackie Duong\Desktop\Web_sua_loi`:

```powershell
# 1. Kiểm tra toàn vẹn mã nguồn & kiểu dữ liệu TypeScript (Exit code 0)
npx tsc --noEmit

# 2. Kiểm tra biên dịch sản phẩm Next.js App Router (Exit code 0)
npm run build

# 3. Thực thi bộ kiểm thử tích hợp 23 bài của Milestone 3 (Exit code 0)
python tests/test_bff_routes.py
```

**Điều kiện Vô hiệu hóa Phán quyết (Invalidation Conditions)**:
- Xuất hiện chuỗi nhị phân âm thanh gắn cứng trong `app/api/dictation/tts/route.ts`.
- Bỏ qua hàm `guardAiRoute` trong `app/api/dictation/qwen-director/route.ts`.
- Bất kỳ bài kiểm thử nào trong số 23 bài của `tests/test_bff_routes.py` thất bại.
