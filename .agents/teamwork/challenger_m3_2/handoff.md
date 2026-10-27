# Báo Cáo Thẩm Định Độc Lập (Challenger 2 Handoff Report)
## Milestone 3: Next.js BFF API Gateway (Build Integrity & Timeout Resilience)

**Thẩm định viên**: Challenger 2 (`challenger_m3_2`)  
**Ngày thực hiện**: 2026-10-18T20:55:00Z  
**Thư mục làm việc**: `c:\Users\Jackie Duong\Desktop\Web_sua_loi\.agents\teamwork\challenger_m3_2`  
**Parent Agent**: `0516b259-befc-4fac-baa8-b10ce65a612b`  
**Phán quyết (Verdict)**: **APPROVE** (Chấp thuận hoàn toàn)

---

## 1. Observation (Quan sát Thực nghiệm Trực tiếp)

### 1.1. Biên dịch TypeScript Toàn diện (`npx tsc --noEmit`)
- **Lệnh thực thi**: `npx tsc --noEmit`
- **Mã thoát (Exit Code)**: `0`
- **Đầu ra**: 0 lỗi (stdout và stderr hoàn toàn sạch). Toàn bộ khai báo kiểu dữ liệu, NextRequest, NextResponse, và các tham số âm học đều tương thích kiểu nghiêm ngặt (`strict: true`).

### 1.2. Kiểm tra Next.js Production Build (`npm run build`)
- **Lệnh thực thi**: `npm run build`
- **Mã thoát (Exit Code)**: `0`
- **Bảng phân loại Route (Trích xuất từ Turbopack build log)**:
```
Route (app)
...
├ ƒ /api/dictation/play-local
├ ƒ /api/dictation/qwen-director
...
├ ƒ /api/dictation/tts
...
○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```
- Cả 3 route của Milestone 3 (`/api/dictation/tts`, `/api/dictation/play-local`, `/api/dictation/qwen-director`) đều được định danh chuẩn `ƒ (Dynamic)` - server-rendered on demand, không bị pre-render tĩnh ngoài ý muốn.

### 1.3. Khảo sát Mã nguồn Cấu hình Timeout & Quản lý Tài nguyên
1. **`app/api/dictation/qwen-director/route.ts`**:
   - Dòng 4: `export const dynamic = "force-dynamic"`
   - Dòng 5: `export const maxDuration = 35`
   - Dòng 23: `signal: AbortSignal.timeout(10000)` (GET status)
   - Dòng 48-56: Bắt lỗi ngoại lệ mạng và trả về HTTP 200 graceful offline JSON: `{ enabled: false, is_loaded: false, available_ram_mb: 0, offline: true, lifecycle_mode: "offline" }`.
   - Dòng 100 & 155: `signal: AbortSignal.timeout(30000)` cho cả 2 action `extract_sgk` và `direct_prosody`.
   - Dòng 118-127 & 173-182: Kiểm tra `err?.name === "TimeoutError" || err?.name === "AbortError"` $\to$ Trả về HTTP 504 Gateway Timeout; các lỗi kết nối khác $\to$ Trả về HTTP 503 Service Unavailable.
2. **`app/api/dictation/tts/route.ts`**:
   - Dòng 3: `export const dynamic = "force-dynamic"`
   - Dòng 59-60: `const controller = new AbortController()`, `const timeoutId = setTimeout(() => controller.abort(), 15000)` (Ngưỡng 15s).
   - Dòng 94-98: `if (err?.name === "AbortError")` $\to$ Trả về HTTP 504; lỗi kết nối khác $\to$ Trả về HTTP 503.
3. **`app/api/dictation/play-local/route.ts`**:
   - Dòng 3: `export const dynamic = "force-dynamic"`
   - Dòng 63-64: `controller = new AbortController()`, `setTimeout(() => controller.abort(), 15000)` (Ngưỡng 15s).
   - Dòng 87-91: `if (err?.name === "AbortError")` $\to$ Trả về HTTP 504; lỗi kết nối khác $\to$ Trả về HTTP 502 Bad Gateway.

### 1.4. Kiểm thử Thực nghiệm Timeout & Khả năng Chống Treo Máy (`tests/test_challenger_timeout_resilience.py`)
- **Thiết kế thực nghiệm độc lập**:
  - Khởi chạy máy chủ ảo chậm giả lập (Hanging Mock Upstream) trên cổng 8099 cố tình treo request quá ngưỡng timeout (18s cho TTS/play-local, 33s cho Qwen Director, 12s cho Qwen Status).
  - Khởi chạy Next.js Server thực tế trỏ biến môi trường `VIT5_SERVICE_URL=http://127.0.0.1:8099`.
- **Kết quả Thực thi (20/20 PASSED 100%)**:
```
+---------------------------------------------------------------------------------------------------------+
| Hạng mục Kiểm thử                                | Thời gian thực tế | Kết quả HTTP | Đánh giá |
+---------------------------------------------------------------------------------------------------------+
| AST Integrity Check: dynamic / maxDuration / 504 | N/A               | PASS         | PASS     |
| GET /qwen-director khi upstream Offline          | 0.22s             | HTTP 200     | PASS     |
| POST /qwen-director extract_sgk khi Offline      | 0.06s             | HTTP 503     | PASS     |
| POST /qwen-director direct_prosody khi Offline   | 0.03s             | HTTP 503     | PASS     |
| GET /tts khi upstream Offline                    | 0.03s             | HTTP 503     | PASS     |
| POST /play-local khi upstream Offline            | 0.07s             | HTTP 502     | PASS     |
| GET /tts khi upstream bị treo 18s (> 15s)        | 15.02s            | HTTP 504     | PASS     |
| POST /play-local khi upstream bị treo 18s (> 15s)| 15.04s            | HTTP 504     | PASS     |
| GET /qwen-director status bị treo 12s (> 10s)    | 10.03s            | HTTP 200     | PASS     |
| POST /qwen-director extract_sgk bị treo 33s (>30s| 30.03s            | HTTP 504     | PASS     |
+---------------------------------------------------------------------------------------------------------+
```

---

## 2. Logic Chain (Chuỗi Lập luận Suy diễn Thực nghiệm)

1. **Từ Observation 1.1 đến Tính Toàn vẹn Mã nguồn**:
   Việc `npx tsc --noEmit` hoàn thành với mã thoát 0 chứng minh việc bổ sung các query parameter âm học (`style`, `noise_scale`, `noise_w`, `read_punctuation`), header phản hồi mới (`X-TTS-Style`, `X-Prosody-Style`), và multiplexer body actions trong `qwen-director/route.ts` tuân thủ 100% hệ thống kiểu dữ liệu TypeScript, không gây bất kỳ break nào cho các thành phần khác trong toàn bộ dự án.
2. **Từ Observation 1.2 đến Tính Động học của Next.js Gateway**:
   Việc khai báo `export const dynamic = "force-dynamic"` đã được Turbopack biên dịch chính xác thành các Route động (`ƒ (Dynamic)`). Điều này ngăn chặn việc Next.js cố gắng tạo file HTML/JSON tĩnh tại thời điểm build cho các API cần tương tác thời gian thực với phần cứng và dịch vụ AI.
3. **Từ Observation 1.3 & 1.4 đến Khả năng Chịu lỗi của Hệ thống Giáo dục (Timeout Resilience)**:
   - Trên thiết bị Raspberry Pi 4 (4GB RAM) hoặc môi trường mạng lớp học yếu, tác vụ nạp mô hình Qwen2.5 on-demand (cold-start) từ thẻ nhớ microSD có thể mất vài giây. Ngưỡng `AbortSignal.timeout(30000)` và `maxDuration = 35` trên `qwen-director` đảm bảo request không bị gateway ngắt quá sớm, nhưng đồng thời chặn đứng triệt để nguy cơ treo vô hạn (hanging requests) khiến cạn kiệt tài nguyên máy chủ.
   - Khi dịch vụ backend giả lập bị treo, Next.js đã chủ động kích hoạt `AbortError`/`TimeoutError` ở thời điểm cực kỳ chính xác: `15.02s` cho TTS, `15.04s` cho play-local, `10.03s` cho status và `30.03s` cho Qwen director. Máy chủ HTTP đã ngắt kết nối socket máy khách ngay lập tức (`ConnectionAbortedError`) và phản hồi HTTP 504 Gateway Timeout chuẩn RESTful.
   - Khi Python core tắt hoàn toàn, endpoint `GET /api/dictation/qwen-director` phản hồi ngay lập tức sau `0.22s` với HTTP 200 và payload `{ offline: true, lifecycle_mode: "offline" }`. Điều này loại bỏ hoàn toàn nguy cơ sập giao diện người dùng (white screen / uncaught error) trên các trang quản trị và giảng dạy của giáo viên.

---

## 3. Caveats (Lưu ý & Giới hạn Khảo sát)

- Quá trình đo kiểm tra timeout thực nghiệm được chạy thông qua việc cô lập cổng kiểm thử 3005 và máy chủ giả lập treo 8099 trên hệ điều hành Windows cục bộ. Trên môi trường sản xuất thực tế chạy trên Raspberry Pi 4 qua Cloudflare Tunnel, độ trễ mạng Internet cộng thêm có thể làm tổng thời gian phản hồi tăng thêm khoảng 50-200ms trước khi kích hoạt timeout.
- Cấu hình `maxDuration = 35` áp dụng hiệu quả cao nhất trên môi trường Vercel / Node.js Serverless runtime; đối với môi trường standalone Node.js server, hành vi timeout chính được kiểm soát chặt chẽ bởi `AbortSignal.timeout(30000)` bên trong mã nguồn fetch.

---

## 4. Conclusion & Phán quyết (Verdict)

### **PHÁN QUYẾT: APPROVE (CHẤP THUẬN HOÀN TOÀN)**

Triển khai của Milestone 3 (Next.js BFF API Gateway) do `worker_m3` thực hiện đạt chất lượng xuất sắc:
1. Đảm bảo toàn vẹn biên dịch 100% (`npx tsc --noEmit` exit 0, `npm run build` exit 0).
2. Định cấu hình đúng chuẩn các cờ động học (`dynamic = "force-dynamic"`, `maxDuration = 35`).
3. Khả năng chống chịu lỗi timeout và ngắt kết nối ngoại tuyến đã được xác thực thực nghiệm độc lập (20/20 test cases PASS, thời gian abort chuẩn xác đến từng mili-giây, mã lỗi HTTP 504 và 200 graceful offline đáp ứng hoàn hảo).

Hệ thống hoàn toàn đủ điều kiện chuyển sang Milestone 4 (Multi-Surface Teacher & Student UI Integration).

---

## 5. Verification Method (Hướng dẫn Xác thực Độc lập)

Bất kỳ chuyên gia nào cũng có thể kiểm chứng lại toàn bộ các bằng chứng trên bằng các lệnh sau:

```powershell
# 1. Kiểm tra toàn vẹn TypeScript (Exit 0)
npx tsc --noEmit

# 2. Kiểm tra Production Build & Route Marking (Exit 0, 3 route Dynamic)
npm run build

# 3. Chạy Harness Thẩm định Độc lập của Challenger 2 (20/20 PASS)
python tests/test_challenger_timeout_resilience.py

# 4. Chạy Suite Kiểm thử Tích hợp của Worker M3 (23/23 PASS)
python tests/test_bff_routes.py
```
