# Báo Cáo Chuyển Giao Công Việc (Handoff Report) — Milestone 3
## Next.js BFF API Gateway (TTS, Play-Local, and Qwen Director Routes)

**Tác giả**: Worker Milestone 3 (`worker_m3`)  
**Ngày thực hiện**: 2026-10-18T20:45:00Z  
**Thư mục làm việc**: `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\worker_m3`  
**Parent Agent**: `0516b259-befc-4fac-baa8-b10ce65a612b`  

---

## 1. Observation (Quan sát Thực nghiệm)

1. **Hiện trạng Mã nguồn Trước Thay đổi**:
   - `app/api/dictation/tts/route.ts`: Chỉ nhận 3 tham số (`text`, `voice`, `rate`), nối chuỗi URL tĩnh không hỗ trợ `style`, `noise_scale`, `noise_w`, `read_punctuation`, không truyền header `X-TTS-Style`.
   - `app/api/dictation/play-local/route.ts`: Chỉ parse `{ text, voice, rate }`, bỏ sót toàn bộ 4 tham số âm học của Milestone 1 & 2.
   - `app/api/dictation/qwen-director/`: Chưa tồn tại trên codebase.
2. **Triển khai Mã nguồn Thực tế**:
   - `app/api/dictation/tts/route.ts`:
     * Khai báo `export const dynamic = "force-dynamic"`.
     * URL hóa và xử lý sạch 7 query parameters: `text`, `voice` (default `vi_VN-vais1000-medium`), `rate` (default `-15%`, fallback `speed`), `style` (default `standard`), `noise_scale`, `noise_w`, `read_punctuation` (`true`/`false`).
     * Truyền qua `URLSearchParams` tới `${VIT5_SERVICE_URL}/tts`.
     * Headers phản hồi bảo toàn: `Content-Type`, `Cache-Control: public, max-age=86400, s-maxage=86400`, `X-TTS-Engine: "Piper-VITS-ONNX-Offline-RPi"`, `X-TTS-Style: style`, `X-Prosody-Style: style`.
     * Quản lý timeout 15s qua `AbortController` (504 khi `err?.name === "AbortError"`, 503 khi service unreachable).
   - `app/api/dictation/play-local/route.ts`:
     * Khai báo `export const dynamic = "force-dynamic"`.
     * Parse an toàn JSON body, validate `text` không rỗng (400 nếu rỗng).
     * Forward đầy đủ 7 trường: `text`, `voice`, `rate`, `style`, `noise_scale`, `noise_w`, `read_punctuation`.
     * Trả về JSON chứa `status`, `device`, `length_scale`, `noise_scale`, `noise_w_scale`.
     * Quản lý timeout 15s (504) và lỗi mạng (502).
   - `app/api/dictation/qwen-director/route.ts`:
     * Khai báo `export const dynamic = "force-dynamic"` và `export const maxDuration = 35`.
     * Tích hợp rate limit: `guardAiRoute(req, 20, "qwen-director")`.
     * `GET`: Proxy `${VIT5_SERVICE_URL}/qwen/status` với timeout 10s (`AbortSignal.timeout(10000)`). Khi Python service offline hoặc lỗi kết nối, trả về graceful fallback HTTP 200:
       `{ enabled: false, is_loaded: false, available_ram_mb: 0, offline: true, lifecycle_mode: "offline" }`.
     * `POST`: Kiểm tra `body.action`:
       - `action === "extract_sgk"`: Validate `body.raw_text`, forward `{ raw_text, grade }` tới `${VIT5_SERVICE_URL}/qwen/extract-sgk` với 30s timeout guard (`AbortSignal.timeout(30000)`). Trả về `{ success: true, data: result, ...result }`.
       - `action === "direct_prosody"`: Validate `body.passage`, forward `{ passage, difficult_words, grade, chunk_mode }` tới `${VIT5_SERVICE_URL}/qwen/direct-prosody` với 30s timeout guard (`AbortSignal.timeout(30000)`). Trả về `{ success: true, data: result, ...result }`.
       - Invalid action: Trả về HTTP 400 Bad Request.
3. **Kết quả Lệnh Kiểm thử & Biên dịch**:
   - `npx tsc --noEmit`: Hoàn thành với Exit code 0 (0 lỗi TypeScript).
   - `npm run build`: Hoàn thành với Exit code 0, tất cả 3 route đều được biên dịch động (`ƒ (Dynamic)`).
   - `python tests/test_bff_routes.py`: Chạy toàn bộ 23 bài kiểm thử (10 test case FastAPI Core Microservice, 8 test case Next.js BFF Offline Validation & Error Guards, 5 test case Next.js BFF Live HTTP Integration Proxy) -> **23/23 PASSED (100%)**.

---

## 2. Logic Chain (Chuỗi Lập luận)

1. **Từ Observation 1 đến Thiết kế Route**:
   BFF Gateway Next.js chịu trách nhiệm chuyển tiếp yêu cầu từ Web App xuống trạm Python :8000. Do Python Core đã được nâng cấp tại Milestone 1 & 2 với các tham số âm học (`style`, `noise_scale`, `noise_w`, `read_punctuation`) và các endpoint SLM (`/qwen/status`, `/qwen/extract-sgk`, `/qwen/direct-prosody`), việc bổ sung tham số tương ứng tại BFF là bắt buộc để các màn hình giao diện (Teacher Dictation, Teacher Grade, Student Portal) có thể kích hoạt đầy đủ tính năng.
2. **Từ Yêu cầu Chống Crash UI đến Graceful Offline Fallback của GET /api/dictation/qwen-director**:
   Khi hệ thống giáo dục hoạt động tại các điểm trường chưa khởi động Python service, việc endpoint status trả về 500 hoặc 503 sẽ khiến React Query / fetch trên giao diện giáo viên văng lỗi uncaught exception. Do đó, thiết kế trả về HTTP 200 với payload `{ enabled: false, is_loaded: false, available_ram_mb: 0, offline: true, lifecycle_mode: "offline" }` cho phép giao diện tự động hiển thị trạng thái "Dịch vụ AI Core chưa sẵn sàng" một cách mượt mà và an toàn.
3. **Từ Rủi ro DNS IPv6 trên Windows đến Chuẩn hóa URL 127.0.0.1**:
   Trên Windows, Node.js 18+ tự động phân giải `localhost` thành IPv6 `::1`, trong khi Python uvicorn mặc định lắng nghe trên IPv4 `127.0.0.1`. Việc sử dụng `(process.env.VIT5_SERVICE_URL || "http://127.0.0.1:8000").replace("localhost", "127.0.0.1")` loại bỏ hoàn toàn nguy cơ kết nối bị treo do lệch socket family.
4. **Từ Khảo sát Tải On-Demand đến Timeout 30 giây**:
   Mô hình `Qwen2.5-0.5B` nạp on-demand từ thẻ nhớ MicroSD trên Raspberry Pi 4 có thể mất 1-3 giây khi khởi động nguội. Ngưỡng timeout 30 giây (`AbortSignal.timeout(30000)`) đảm bảo không bị ngắt kết nối giữa chừng, đồng thời bảo vệ server không bị treo vĩnh viễn nếu tiến trình AI gặp sự cố.

---

## 3. Caveats (Lưu ý & Giới hạn)

- Mặc dù test suite đã xác thực cả 2 trạng thái offline và live proxy trên môi trường Windows cục bộ, khi triển khai trên Raspberry Pi 4 thực tế qua Cloudflare Tunnel, cần đảm bảo biến môi trường `VIT5_SERVICE_URL` được cấu hình trỏ đúng địa chỉ IP nội bộ của Raspberry Pi nếu Next.js và Python service không chạy chung host.
- Tốc độ trích xuất SGK và phân đoạn nhịp đọc phụ thuộc vào tốc độ I/O của thiết bị lưu trữ khi nạp mô hình Qwen lần đầu (Cold Start); các lần gọi sau có cùng văn bản sẽ được LRU Prosody Cache phản hồi ngay trong < 1ms.

---

## 4. Conclusion (Kết luận)

Milestone 3: Next.js BFF API Gateway đã hoàn thành 100% các mục tiêu kỹ thuật, tuân thủ nghiêm ngặt hiến pháp dự án (`GEMINI.md`), quy chuẩn TypeScript `strict: true`, cơ chế bảo vệ kép Rate Limiting / Timeout, và vượt qua toàn bộ 23 bài kiểm thử tự động hóa với kết quả tuyệt đối. Codebase sẵn sàng cho Milestone 4 (Multi-Surface Teacher & Student UI Integration).

---

## 5. Verification Method (Phương pháp Tự Xác thực Độc lập)

Người thẩm định (Auditor / Reviewer) có thể độc lập xác thực toàn bộ kết quả bằng các lệnh sau trong thư mục gốc `c:\Users\Jackie Duong\Desktop\Web_sua_loi`:

```powershell
# 1. Xác thực kiểu dữ liệu TypeScript (Kỳ vọng: Exit code 0, 0 errors)
npx tsc --noEmit

# 2. Xác thực Next.js Production Build (Kỳ vọng: Exit code 0, all routes compiled)
npm run build

# 3. Chạy toàn bộ Test Suite Tự động hóa Milestone 3 (Kỳ vọng: 23/23 tests PASS)
python tests/test_bff_routes.py
```

### Bảng Kết quả Kiểm thử Chi tiết (ASCII Table)

```
+------------------------------------------------------------------------------------------------+
| Test Case Identifier      | Mục tiêu Kiểm thử                                | Kết quả Thực tế |
+------------------------------------------------------------------------------------------------+
| TC-01 FastApi GET /tts    | Tổng hợp WAV Piper VITS kèm style warm_story     | PASS (72,748 B) |
| TC-02 FastApi GET /tts    | Kiểm tra validation text rỗng (HTTP 400)         | PASS (400 Bad)  |
| TC-03 FastApi POST play   | Phát loa phần cứng kèm tham số âm học            | PASS (status=ok)|
| TC-04 FastApi POST play   | Kiểm tra validation text rỗng (HTTP 400)         | PASS (400 Bad)  |
| TC-05 FastApi GET status  | Trạng thái on_demand_unload & RAM sensing        | PASS (RAM>6GB)  |
| TC-06 FastApi POST sgk    | Lọc số trang 'Trang 45', trích xuất difficult    | PASS (Clean OK) |
| TC-07 FastApi POST sgk    | Kiểm tra validation raw_text rỗng (HTTP 400)     | PASS (400 Bad)  |
| TC-08 FastApi POST prosody| Phân đoạn vế câu bảo toàn 100% từ ngữ SGK        | PASS (100% OK)  |
| TC-09 FastApi POST cache  | Xác thực SHA-256 LRU Cache hit phản hồi < 1ms    | PASS (Hit=True) |
| TC-10 FastApi POST prosody| Kiểm tra validation passage rỗng (HTTP 400)      | PASS (400 Bad)  |
| TC-BFF-01 Offline Status  | GET qwen-director fallback HTTP 200 an toàn      | PASS (HTTP 200) |
| TC-BFF-02 BFF GET tts     | Validation thiếu text (HTTP 400)                 | PASS (HTTP 400) |
| TC-BFF-03 BFF POST play   | Validation thiếu text (HTTP 400)                 | PASS (HTTP 400) |
| TC-BFF-04 BFF POST qwen   | Validation thiếu action (HTTP 400)               | PASS (HTTP 400) |
| TC-BFF-05 BFF POST qwen   | Validation action không hợp lệ (HTTP 400)        | PASS (HTTP 400) |
| TC-BFF-06 BFF POST sgk    | Validation extract_sgk text rỗng (HTTP 400)      | PASS (HTTP 400) |
| TC-BFF-07 BFF POST prosody| Validation direct_prosody passage rỗng (HTTP 400)| PASS (HTTP 400) |
| TC-BFF-08 BFF Offline Err | Core offline trả về HTTP 503 rõ ràng             | PASS (HTTP 503) |
| TC-BFF-09 Live Status     | Proxy trạng thái RAM & Lifecycle trực tiếp       | PASS (HTTP 200) |
| TC-BFF-10 Live SGK        | Proxy trích xuất ngữ liệu sạch SGK từ BFF        | PASS (HTTP 200) |
| TC-BFF-11 Live Prosody    | Proxy đạo diễn nhịp đọc bảo toàn từ ngữ          | PASS (HTTP 200) |
| TC-BFF-12 Live TTS Stream | Stream âm thanh WAV chuẩn kèm headers phong cách | PASS (HTTP 200) |
| TC-BFF-13 Live Play Local | Phát loa phần cứng qua Next.js BFF                | PASS (HTTP 200) |
+------------------------------------------------------------------------------------------------+
| TỔNG KẾT: 23/23 BÀI KIỂM THỬ ĐẠT CHUẨN 100% (EXIT CODE 0)                                     |
+------------------------------------------------------------------------------------------------+
```
