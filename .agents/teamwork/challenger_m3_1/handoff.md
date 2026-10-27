# Handoff Report — Milestone 3: Next.js BFF API Gateway (Edge Cases & Validation Fuzzing)

- **Agent**: Challenger 1 (`challenger_m3_1`)
- **Archetype**: empirical_challenger
- **Working Directory**: `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\challenger_m3_1`
- **Parent Conversation ID**: `0516b259-befc-4fac-baa8-b10ce65a612b`
- **Timestamp**: 2026-10-18T20:54:00Z
- **Verdict**: **APPROVE**

---

## 1. Observation (Quan sát Thực nghiệm)

1. **Kiểm tra Mã nguồn Triển khai**:
   - `app/api/dictation/tts/route.ts` (lines 24-56):
     * Kiểm tra `if (!text || !text.trim())` trả về HTTP 400 (`{ error: "Thiếu nội dung văn bản cần đọc" }`).
     * Parse an toàn `noiseScale` và `noiseW` bằng `parseFloat(...)`: nếu `isNaN(parsed)`, không set vào params, tránh làm hỏng upstream URL query.
     * Xử lý `readPunctuation`: chỉ parse chuỗi truthy (`"true"`, `"1"`, `"yes"`), ngược lại fallback về `"false"`.
   - `app/api/dictation/play-local/route.ts` (lines 15-62):
     * Bọc `await req.json()` trong try-catch, bắt lỗi cú pháp JSON và trả về HTTP 400 (`{ error: "Dữ liệu JSON không hợp lệ" }`).
     * Kiểm tra `if (!body || typeof body !== "object")` trả về HTTP 400 (`{ error: "Payload yêu cầu không hợp lệ" }`).
     * Kiểm tra `if (!text || typeof text !== "string" || !text.trim())` trả về HTTP 400 (`{ error: "Thiếu nội dung văn bản" }`).
     * Xử lý `noise_scale` và `noise_w` cả kiểu `number` và `string`, loại bỏ `NaN`.
   - `app/api/dictation/qwen-director/route.ts` (lines 64-190):
     * Bọc `await req.json()` trong try-catch, trả về HTTP 400 khi JSON sai định dạng.
     * Kiểm tra `if (!body || typeof body !== "object" || !body.action)` trả về HTTP 400 (`{ error: "Yêu cầu thiếu thuộc tính 'action' (extract_sgk hoặc direct_prosody)" }`).
     * `action === "extract_sgk"`: Kiểm tra `rawText = typeof body?.raw_text === "string" ? body.raw_text.trim() : ""`. Nếu rỗng trả về HTTP 400.
     * `action === "direct_prosody"`: Kiểm tra `passage = typeof body?.passage === "string" ? body.passage.trim() : ""`. Nếu rỗng trả về HTTP 400.
     * Nhánh action không xác định: Trả về HTTP 400 (`{ error: "Hành động (action) '...' không hợp lệ. Chỉ chấp nhận 'extract_sgk' hoặc 'direct_prosody'." }`).
     * `GET`: Proxy tới `${VIT5_SERVICE_URL}/qwen/status`. Nếu core offline hoặc fetch thất bại, trả về HTTP 200 graceful fallback: `{ enabled: false, is_loaded: false, available_ram_mb: 0, offline: true, lifecycle_mode: "offline" }`.

2. **Kết quả Thực thi Bộ Kiểm thử Fuzzing Độc lập (`tests/test_challenger_m3_fuzzing.py`)**:
   - Đã thực hiện 32 ca kiểm thử biên và dữ liệu độc hại (adversarial probes) chống lại cả 3 route BFF trên Next.js đang chạy tại `http://127.0.0.1:3000`:
     * FZ-1.1: Missing text parameter -> HTTP 400 (PASS)
     * FZ-1.2: Empty text `text=""` -> HTTP 400 (PASS)
     * FZ-1.3: Whitespace text `text="   "` -> HTTP 400 (PASS)
     * FZ-1.4: Tabs/newlines text `text="\t\n\r "` -> HTTP 400 (PASS)
     * FZ-1.5: `noise_scale="not_a_number"` -> Server bình an, HTTP 200 WAV 24,620 bytes (PASS)
     * FZ-1.6: `noise_w="abc"` -> Server bình an, HTTP 200 WAV 25,132 bytes (PASS)
     * FZ-1.7: `style="custom_style"` -> Xử lý mượt mà, HTTP 200 WAV 36,396 bytes (PASS)
     * FZ-1.8: `read_punctuation="invalid_bool"` -> Fallback an toàn false, HTTP 200 (PASS)
     * FZ-1.9: Truthy booleans (`"1"`, `"yes"`, `"true"`, `"TRUE"`) -> Chấp nhận, HTTP 200 (PASS)
     * FZ-2.1: Non-JSON raw string body -> HTTP 400 (PASS)
     * FZ-2.2: Empty JSON object `{}` -> HTTP 400 (PASS)
     * FZ-2.3: Missing text field -> HTTP 400 (PASS)
     * FZ-2.4: Empty text field `{"text": ""}` -> HTTP 400 (PASS)
     * FZ-2.5: Whitespace text field `{"text": "   "}` -> HTTP 400 (PASS)
     * FZ-2.6: Non-string text field `{"text": 12345}` -> HTTP 400 (PASS)
     * FZ-2.7: Array JSON payload `[1, 2, 3]` -> HTTP 400 (PASS)
     * FZ-2.8: Adversarial float strings trong play-local -> HTTP 200 `{status: "ok", device: "local_speaker"}` (PASS)
     * FZ-3.1: GET qwen-director status -> HTTP 200 `{available_ram_mb: 6497.06, lifecycle_mode: "on_demand_unload"}` (PASS)
     * FZ-3.2: POST Non-JSON body -> HTTP 400 (PASS)
     * FZ-3.3: POST Empty body `{}` -> HTTP 400 (PASS)
     * FZ-3.4: Unknown action `unknown_action_xyz` -> HTTP 400 (PASS)
     * FZ-3.5: extract_sgk missing raw_text -> HTTP 400 (PASS)
     * FZ-3.6: extract_sgk empty string raw_text -> HTTP 400 (PASS)
     * FZ-3.7: extract_sgk whitespace raw_text -> HTTP 400 (PASS)
     * FZ-3.8: extract_sgk non-string raw_text -> HTTP 400 (PASS)
     * FZ-3.9: direct_prosody missing passage -> HTTP 400 (PASS)
     * FZ-3.10: direct_prosody empty passage -> HTTP 400 (PASS)
     * FZ-3.11: direct_prosody whitespace passage -> HTTP 400 (PASS)
     * FZ-3.12: direct_prosody non-string passage -> HTTP 400 (PASS)
     * FZ-3.13: Array JSON payload `[1, 2, 3]` -> HTTP 400 (PASS)
     * FZ-4.1: Unicode & Emojis (`Đất nước gấm hoa, biển bạc rừng vàng ✨`) -> HTTP 200 (PASS)
     * FZ-4.2: Complex punctuation prosody (5 clauses) -> HTTP 200, bảo toàn 100% từ ngữ SGK (PASS)
   - **Tổng kết Fuzzing**: **32/32 PASSED (100%)**.

3. **Kết quả Thực thi Test Suite của Dự án (`tests/test_bff_routes.py`)**:
   - Chạy với Python core warm: **15/15 PASSED (100%)**, Exit code 0.
   - Chạy các kịch bản offline trước đó: Đạt chuẩn graceful fallback HTTP 200 cho Qwen status và HTTP 503 cho TTS offline.
   - Phát hiện kỹ thuật (Finding 1): Trong `test_bff_routes.py`, vòng lặp chờ khởi động Python core (`for _ in range(30): time.sleep(0.5)`) có timeout 15s. Khi nạp nguội trên Windows với `ENABLE_VIT5=1`, tiến trình nạp ViT5 mất ~48s, dẫn đến timeout tự khởi động nếu service chưa chạy sẵn. Khi service đã online hoặc cấu hình timeout đầy đủ, toàn bộ test suite pass tuyệt đối.

4. **Biên dịch TypeScript**:
   - Lệnh: `npx tsc --noEmit` -> Hoàn thành với Exit code 0, không có lỗi kiểu dữ liệu.

---

## 2. Logic Chain (Chuỗi Lập luận)

1. Từ Observation 1: Các route đã được trang bị cơ chế validate 3 lớp (JSON syntax validation, schema object typing check, field-level sanitization & trimming).
2. Từ Observation 2: 32 bài kiểm thử fuzzer với dữ liệu thô (non-JSON), chuỗi rỗng, khoảng trắng, số nguyên thay cho chuỗi, mảng JSON thay cho object, float sai định dạng (`"not_a_number"`), và các action giả định đều được xử lý chính xác:
   - Các dữ liệu không hợp lệ đều trả về HTTP 400 với thông điệp rõ ràng, không có trường hợp nào gây crash runtime (HTTP 500 unhandled) hay treo tiến trình.
   - Các tham số âm học tùy biến không hợp lệ được phớt lờ một cách an toàn và áp dụng giá trị mặc định chuẩn mực sư phạm.
3. Từ Observation 3 & 4: Cả hệ thống BFF Next.js và Python AI Core phối hợp nhịp nhàng, stream audio WAV hợp lệ, giữ nguyên 100% từ vựng SGK khi đạo diễn nhịp đọc, và đạt 0 lỗi biên dịch TypeScript.
4. Kết luận logic: Milestone 3 Next.js BFF API Gateway hoàn toàn vững chắc, đạt chuẩn phòng thủ trước các payload bất thường, đáp ứng toàn diện tiêu chí nghiệm thu.

---

## 3. Caveats (Lưu ý & Giới hạn)

- **Test Harness Auto-Spawn Timeout**: File `tests/test_bff_routes.py` nên được Worker M5/QA lưu ý tăng thời gian chờ từ 15s lên 60s để phòng trường hợp chạy trên các máy có tốc độ đọc ổ đĩa chậm khi khởi động nguội ViT5.
- **Standalone Mode của Next.js**: Dự án cấu hình `output: 'standalone'` trong `next.config.mjs`, do đó môi trường production nên khởi chạy bằng `node .next/standalone/server.js` thay vì `next start`.

---

## 4. Conclusion (Kết luận & Phán quyết)

- **Phán quyết**: **APPROVE**
- **Đánh giá**: Triển khai Next.js BFF Gateway (`tts`, `play-local`, `qwen-director`) có chất lượng cao, khả năng phòng vệ đầu vào xuất sắc, không có lỗ hổng crash unhandled exception, và vượt qua 100% các bài thử thách adversarial fuzzing.

---

## 5. Verification Method (Phương pháp Tự Xác thực Độc lập)

Người thẩm định có thể độc lập chạy lại toàn bộ bằng chứng thực nghiệm qua các lệnh sau:

```powershell
# 1. Chạy bộ kiểm thử Fuzzing Đối kháng của Challenger (32 probes)
python tests/test_challenger_m3_fuzzing.py

# 2. Chạy bộ kiểm thử BFF Gateway của dự án (khi server online)
python tests/test_bff_routes.py

# 3. Kiểm tra tính toàn vẹn TypeScript
npx tsc --noEmit
```

### Bảng Tổng Hợp Kiểm Thử Đối Kháng (ASCII Table)

```
+----------------------------------------------------------------------------------------------------+
| Ma trận Kiểm thử Đối kháng (Adversarial Fuzzing Matrix)                                             |
+------------------------------------+--------------------------+-------------------+----------------+
| Route                              | Dữ liệu Fuzz             | Mã HTTP Kỳ vọng   | Kết quả        |
+------------------------------------+--------------------------+-------------------+----------------+
| GET /api/dictation/tts             | Thiếu param text         | 400 Bad Request   | PASS (400)     |
| GET /api/dictation/tts             | text=""                  | 400 Bad Request   | PASS (400)     |
| GET /api/dictation/tts             | text="   "               | 400 Bad Request   | PASS (400)     |
| GET /api/dictation/tts             | noise_scale="bad_float"  | 200 OK (ignored)  | PASS (200 WAV) |
| GET /api/dictation/tts             | noise_w="abc"            | 200 OK (ignored)  | PASS (200 WAV) |
| GET /api/dictation/tts             | style="custom_style"     | 200 OK (fallback) | PASS (200 WAV) |
| GET /api/dictation/tts             | read_punct="invalid"     | 200 OK (as false) | PASS (200 WAV) |
| POST /api/dictation/play-local     | Non-JSON string          | 400 Bad Request   | PASS (400)     |
| POST /api/dictation/play-local     | Empty body {}            | 400 Bad Request   | PASS (400)     |
| POST /api/dictation/play-local     | text=12345 (number)      | 400 Bad Request   | PASS (400)     |
| POST /api/dictation/play-local     | Array payload [1,2,3]    | 400 Bad Request   | PASS (400)     |
| GET /api/dictation/qwen-director   | Core online status       | 200 OK            | PASS (200)     |
| POST /api/dictation/qwen-director  | Non-JSON stream          | 400 Bad Request   | PASS (400)     |
| POST /api/dictation/qwen-director  | Thiếu action             | 400 Bad Request   | PASS (400)     |
| POST /api/dictation/qwen-director  | action="unknown_action"  | 400 Bad Request   | PASS (400)     |
| POST /api/dictation/qwen-director  | extract_sgk raw_text=""  | 400 Bad Request   | PASS (400)     |
| POST /api/dictation/qwen-director  | direct_prosody passage=""| 400 Bad Request   | PASS (400)     |
| POST /api/dictation/qwen-director  | Emojis & dấu tiếng Việt  | 200 OK Clean      | PASS (200)     |
| POST /api/dictation/qwen-director  | Câu phức 5 vế            | 200 OK 100% Words | PASS (200)     |
+------------------------------------+--------------------------+-------------------+----------------+
| TỔNG CỘNG: 32/32 PROBES PASSED (100%) - ZERO CRASH / ZERO UNHANDLED 500                            |
+----------------------------------------------------------------------------------------------------+
```
