# BÁO CÁO BÀN GIAO (HANDOFF REPORT) — MILESTONE 3: NEXT.JS BFF API GATEWAY
## TypeScript Type Checking, App Router Conventions & Verification Test Strategy

**Tác giả**: Explorer 3 (`explorer_m3_3`)  
**Ngày lập**: 2026-10-18T20:34:00Z  
**Bàn giao cho**: Orchestrator (`0516b259-befc-4fac-baa8-b10ce65a612b`), Worker M3, Reviewer M3  
**Tài liệu kèm theo**: `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\explorer_m3_3\analysis.md`

---

### 1. Observation (Dẫn chứng Quan sát Thực tế)

1. **Cấu hình TypeScript (`tsconfig.json:1-48`)**:
   - `strict: true` (bắt buộc kiểm soát kiểu chặt chẽ `strictNullChecks`, `noImplicitAny`).
   - `target: "ES6"`, `module: "esnext"`, `moduleResolution: "bundler"`, `noEmit: true`.
   - `paths: { "@/*": ["./*"] }` định danh đường dẫn alias gốc.
2. **Phiên bản Framework (`package.json:59, 81-82`)**:
   - `next: "16.2.4"` (App Router).
   - `typescript: "5.7.3"`.
   - `node: "v24.15.0"` (chạy trên Windows 11, hỗ trợ native `fetch`, `AbortSignal.timeout`, ES modules).
3. **Hiện trạng Kiểm tra Kiểu Tĩnh Baseline**:
   - Thực thi lệnh: `npx tsc --noEmit`
   - Kết quả: **Exit code 0, 0 lỗi biên dịch, không có warning**.
4. **Hiện trạng Endpoint TTS (`app/api/dictation/tts/route.ts:11-27`)**:
   - Chỉ mới trích xuất `text`, `voice`, `rate`.
   - Chưa trích xuất và chuyển tiếp 4 tham số âm học: `style`, `noise_scale`, `noise_w`, `read_punctuation`.
   - Header phản hồi chưa có `X-Prosody-Style`.
5. **Hiện trạng Endpoint Phát loa cục bộ (`app/api/dictation/play-local/route.ts:10-27`)**:
   - Chỉ mới destructure `{ text, voice, rate }` từ request body.
   - Chưa hỗ trợ 4 tham số âm học mới: `style`, `noise_scale`, `noise_w`, `read_punctuation`.
6. **Hiện trạng Endpoint Đạo diễn Qwen (`app/api/dictation/qwen-director/route.ts`)**:
   - File chưa tồn tại trong thư mục `app/api/dictation/`. Cần tạo mới để phục vụ F11.
7. **Đối ứng phía Python Microservice (`python_service/main.py:2151-2432`)**:
   - `GET /tts` chấp nhận `text, voice, rate, style, noise_scale, noise_w, read_punctuation`.
   - `POST /tts/play-local` nhận Pydantic model `LocalPlayRequest` với đầy đủ 4 tham số.
   - `GET /qwen/status` trả về metrics RAM, lifecycle `on_demand_unload` và số lượng cache.
   - `POST /qwen/extract-sgk` nhận `raw_text` và `grade`, làm sạch văn bản, giải phóng RAM.
   - `POST /qwen/direct-prosody` nhận `passage, difficult_words, grade, chunk_mode`, bảo toàn 100% từ ngữ SGK, giải phóng RAM.
8. **Hệ thống Rate Limiter Guard (`lib/api-guard.ts:90-113`)**:
   - Hàm `guardAiRoute(req: NextRequest, maxRequestsPerMinute = 30, extraKey = "")` đã sẵn sàng, tự động lấy client IP và trả về response 429 nếu vượt ngưỡng.

---

### 2. Logic Chain (Chuỗi Lập luận Kỹ thuật)

1. Từ **Observation 1 & 3**, do `tsconfig.json` bật `strict: true` và baseline hiện tại là 0 lỗi, mọi sửa đổi code trên `tts/route.ts`, `play-local/route.ts` và file mới `qwen-director/route.ts` phải tuyệt đối không sử dụng biến `any` không kiểm soát, phải kiểm tra `null` khi đọc `searchParams.get()`, và bọc `req.json()` trong khối bắt lỗi.
2. Từ **Observation 4 & 7**, để hoàn thành tính năng F10 cho `GET /api/dictation/tts`, cần đọc `style`, `noise_scale`, `noise_w`, `read_punctuation` từ URL query, chuyển đổi kiểu dữ liệu an toàn, và dùng `URLSearchParams` để chuyển tiếp xuống Python Core `:8000`. Cần bổ sung `X-Prosody-Style: style` vào response header.
3. Từ **Observation 5 & 7**, để hoàn thành tính năng F10 cho `POST /api/dictation/play-local`, cần trích xuất 4 trường âm học từ JSON body, validate `text` không rỗng và chuyển tiếp payload hoàn chỉnh tới `POST :8000/tts/play-local` với timeout 15s.
4. Từ **Observation 6, 7 & 8**, để hoàn thành tính năng F11, route `app/api/dictation/qwen-director/route.ts` cần triển khai:
   - `GET`: Proxy `http://127.0.0.1:8000/qwen/status`. Nếu Python core offline, trả về fallback an toàn HTTP 200 `{ enabled: false, lifecycle_mode: "offline", status: "unavailable" }` để tránh làm hỏng trạng thái hiển thị của Dictation Header Badge (`app/teacher/dictation/page.tsx`).
   - `POST`: Tích hợp `guardAiRoute(req, 20, "qwen-director")`, multiplex trên `body.action`:
     - Nếu `action === "extract_sgk"`: validate `raw_text`, gọi `:8000/qwen/extract-sgk` với timeout 30s.
     - Nếu `action === "direct_prosody"`: validate `passage`, gọi `:8000/qwen/direct-prosody` với timeout 30s.
     - Nếu `action` khác: trả HTTP 400 Bad Request.
5. Từ **Observation 1 & 2**, việc thêm `export const dynamic = "force-dynamic"` vào cả 3 route handler là biện pháp phòng ngừa bắt buộc để `npm run build` không cố gắng render tĩnh tại build-time khi chưa bật backend Python.

---

### 3. Caveats (Các Điểm Giới hạn & Lưu ý)

1. **Trạng thái Dịch vụ Python khi Test**:
   - Khi chạy test Tầng 2 (Offline & Input Validation), Python Core không cần chạy, route vẫn phải phản hồi đúng mã lỗi 400 hoặc 503/fallback an toàn.
   - Khi chạy test Tầng 3 (Live End-to-End), bắt buộc phải khởi động `python python_service/main.py` trên cổng 8000.
2. **Quy tắc Dự án GEMINI.md**:
   - Không được sửa trực tiếp mã nguồn trong vai trò Explorer (chỉ phân tích và đề xuất).
   - Tuyệt đối không sử dụng cú pháp sơ đồ Mermaid trong mọi báo cáo hoặc mã nguồn.
   - Thư mục `.agents/teamwork/` chỉ chứa metadata (.md), không được đặt code/test tại đây.

---

### 4. Conclusion (Kết luận & Đề xuất Hành động)

1. Thiết kế kỹ thuật cho Milestone 3 đã hoàn thiện đầy đủ, đồng bộ 100% với đặc tả `api_specs.md` và mã nguồn `python_service/main.py`.
2. Toàn bộ mã nguồn đề xuất cho 3 endpoint đã được soạn thảo chi tiết trong `analysis.md` (mục 3.1, 3.2, 3.3).
3. Đề xuất Worker M3 tiến hành hiện thực hóa code theo đúng mã nguồn trong `analysis.md` và Reviewer tiến hành kiểm thử xác thực theo kịch bản 3 tầng.

---

### 5. Verification Method (Phương pháp Kiểm thử Xác thực Độc lập)

#### Bước 1: Xác thực Biên dịch & TypeScript (Bắt buộc)
```powershell
# Chạy từ thư mục gốc c:\Users\Jackie Duong\Desktop\Web_sua_loi
npx tsc --noEmit
```
*Điều kiện đạt*: Exit code 0, không có bất kỳ lỗi TypeScript nào.

#### Bước 2: Xác thực Build Next.js
```powershell
npm run build
```
*Điều kiện đạt*: Exit code 0, route tree hiển thị đầy đủ các route `/api/dictation/*` dạng `(Dynamic)`.

#### Bước 3: Xác thực Đầu vào & Fallback Ngoại tuyến (Offline Test)
```powershell
# Test 1: Kiểm tra GET qwen-director fallback an toàn khi backend tắt
curl -s -i "http://localhost:3000/api/dictation/qwen-director"
# Kỳ vọng: HTTP 200, status "unavailable", lifecycle_mode "offline"

# Test 2: Kiểm tra validation thiếu action
curl -s -i -X POST "http://localhost:3000/api/dictation/qwen-director" -H "Content-Type: application/json" -d "{}"
# Kỳ vọng: HTTP 400 Bad Request

# Test 3: Kiểm tra validation thiếu text của TTS
curl -s -i "http://localhost:3000/api/dictation/tts"
# Kỳ vọng: HTTP 400 Bad Request
```

#### Bước 4: Xác thực Tích hợp Thực tế (Live Test khi bật Python :8000)
```powershell
# Test 4: Gọi thử trích xuất SGK
curl -s -X POST "http://localhost:3000/api/dictation/qwen-director" `
  -H "Content-Type: application/json" `
  -d "{\"action\":\"extract_sgk\",\"raw_text\":\"Tiếng Việt 3\nTrang 10\nMùa thu quê em đẹp lắm.\",\"grade\":3}"
# Kỳ vọng: HTTP 200, ram_unloaded: true

# Test 5: Gọi thử tổng hợp âm thanh WAV với style
curl -s -o test_output.wav -w "%{http_code}" "http://localhost:3000/api/dictation/tts?text=Chao+em&style=warm_story&read_punctuation=true"
# Kỳ vọng: HTTP 200, file test_output.wav > 10,000 bytes
```

*Điều kiện Hủy bỏ (Invalidation Condition)*: Nếu `npx tsc --noEmit` trả về exit code khác 0, hoặc `GET /api/dictation/qwen-director` throw unhandled error 500 khi Python Core offline, việc xác thực bị coi là thất bại.
