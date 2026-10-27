# BÁO CÁO PHÂN TÍCH & THIẾT KẾ KỸ THUẬT: NEXT.JS BFF ROUTE QWEN DIRECTOR
## Milestone 3: Next.js BFF API Gateway (`app/api/dictation/qwen-director/route.ts`)
**Dự án**: ViHand Grade — Hệ sinh thái Chấm điểm & Luyện viết chính tả thông minh  
**Tác giả**: Explorer 2 (`explorer_m3_2`)  
**Tài liệu tham chiếu**: `ORIGINAL_REQUEST.md` (2026-10-18T18:59:10Z), `orchestrator_4/PROJECT.md`, `spec_miner_survey_1/api_specs.md`  
**Ngày thực hiện**: 2026-10-18  

---

## 1. TỔNG QUAN VÀ MỤC TIÊU THIẾT KẾ

Route `app/api/dictation/qwen-director/route.ts` đóng vai trò là **API Gateway BFF (Backend For Frontend)** trung gian giữa trình duyệt client (Teacher Dictation Cockpit, Teacher Grade, Student Portal) và vi dịch vụ AI Python Core (`python_service/main.py` trên cổng `:8000`).

BFF Route này giải quyết 4 bài toán mấu chốt:
1. **Multiplexing (Ghép kênh tác vụ)**: Tích hợp 2 nghiệp vụ phân tích ngôn ngữ sư phạm lớn (`extract_sgk` và `direct_prosody`) vào một điểm tiếp nhận duy nhất cho frontend, đơn giản hóa cấu trúc route phía client.
2. **Bảo vệ tài nguyên & Cold-Start Guard**: Thiết lập bộ đếm thời gian an toàn 30 giây (`AbortSignal.timeout(30000)`) cho các tác vụ nạp on-demand mô hình `Qwen2.5-0.5B` từ thẻ MicroSD/USB trên Raspberry Pi 4 (4GB RAM).
3. **Graceful Offline Fallback**: Cung cấp trạng thái sống (Liveness / Status) qua phương thức `GET` với timeout 10 giây. Khi dịch vụ Python chưa khởi động hoặc gặp sự cố, trả về cấu trúc fallback an toàn `{ enabled: false, is_loaded: false, available_ram_mb: 0, offline: true }` với mã HTTP 200, ngăn chặn tình trạng crash giao diện người dùng.
4. **Bảo mật và chuẩn hóa hợp đồng API**: Kiểm tra dữ liệu đầu vào (Input Validation), chuẩn hóa mã trạng thái HTTP (400, 503, 504), che giấu thông tin hạ tầng nội bộ và trả về cấu trúc phản hồi thống nhất `{ success: true, data: result }`.

---

## 2. KIẾN TRÚC DÒNG DỮ LIỆU & ĐIỀU PHỐI (ASCII ARCHITECTURE)

```
+------------------------------------------------------------------------------------+
|                         CLIENT LAYER (Next.js Frontend)                            |
|  - Teacher Dictation Cockpit: Header Status Badge, SGK Clean Dialog, Prosody Preview|
+------------------------------------------------------------------------------------+
           │                                          │
           │ GET /api/dictation/qwen-director         │ POST /api/dictation/qwen-director
           │ (Polling status / liveness)              │ { action: "extract_sgk" | "direct_prosody" }
           ▼                                          ▼
+------------------------------------------------------------------------------------+
|               NEXT.JS BFF GATEWAY LAYER: qwen-director/route.ts                    |
|                                                                                    |
|  [GET Handler]                                   [POST Handler]                    |
|  - AbortSignal.timeout(10000)                    - Parse JSON Body                 |
|  - Proxy to :8000/qwen/status                    - Action Switch:                  |
|  - Graceful Fallback if Offline:                   * action === "extract_sgk"      |
|    { enabled: false, is_loaded: false,               -> validate raw_text          |
|      available_ram_mb: 0, offline: true }            -> forward :8000/qwen/extract-sgk
|                                                    * action === "direct_prosody"   |
|                                                      -> validate passage           |
|                                                      -> forward :8000/qwen/direct-prosody
|                                                    * Invalid -> HTTP 400           |
|                                                  - AbortSignal.timeout(30000)      |
|                                                  - Error Mapping (400, 503, 504)   |
|                                                  - Return { success: true, data }  |
+------------------------------------------------------------------------------------+
           │                                          │
           │ HTTP GET :8000/qwen/status               │ HTTP POST :8000/qwen/...
           ▼                                          ▼
+------------------------------------------------------------------------------------+
|                       PYTHON AI MICROSERVICE LAYER (:8000)                         |
|                                                                                    |
|  - GET  /qwen/status       -> RAM, Lifecycle mode, Cache count, Model state        |
|  - POST /qwen/extract-sgk  -> Regex header cleaner + Qwen/Heuristic extractor      |
|  - POST /qwen/direct-prosody -> LRU Cache check (<1ms) + Zero-mutation prosody     |
|                                + Auto-unload Qwen in finally block                 |
+------------------------------------------------------------------------------------+
```

---

## 3. ĐỐI SOÁT HỢP ĐỒNG API UPSTREAM (PYTHON SERVICE:8000)

Dựa trên khảo sát thực tế mã nguồn tại `python_service/main.py`:

### 3.1. Upstream `GET /qwen/status` (`python_service/main.py:2250-2272`)
- **Đầu vào**: Không có tham số.
- **Dữ liệu Python trả về**:
  ```json
  {
    "enabled": true,
    "model_id": "Qwen/Qwen2.5-0.5B-Instruct",
    "is_loaded": false,
    "lifecycle_mode": "on_demand_unload",
    "available_ram_mb": 2185.5,
    "ram_threshold_mb": 650.0,
    "cache_entries": 0,
    "memory_mode": "zero_idle_ram",
    "precision": "bfloat16",
    "quantized": true,
    "device": "cpu",
    "description": "Tầng 2: SLM Pedagogical Paraphraser & Prosody Director (Qwen2.5-0.5B-Instruct)"
  }
  ```
- **Hợp đồng BFF GET**: Phải bảo đảm trả về đủ các trường:
  `{ enabled, model_id, is_loaded, lifecycle_mode, available_ram_mb, cache_entries, memory_mode }`.
- **Cơ chế Fallback khi Python Core tắt**:
  Khi fetch ném lỗi (`ECONNREFUSED`, `TimeoutError`, v.v.), BFF trả về HTTP 200:
  ```json
  {
    "enabled": false,
    "is_loaded": false,
    "available_ram_mb": 0,
    "offline": true
  }
  ```

### 3.2. Upstream `POST /qwen/extract-sgk` (`python_service/main.py:2280-2374`)
- **Yêu cầu đầu vào upstream**:
  ```python
  class ExtractSGKRequest(BaseModel):
      raw_text: str
      grade: Optional[int] = 3
  ```
- **Dữ liệu Python trả về**:
  ```json
  {
    "title": "Bài đọc chính tả",
    "clean_content": "Văn bản bài đọc đã làm sạch số trang và câu hỏi...",
    "difficultWords": ["từ 1", "từ 2", "từ 3"],
    "summary": "Tóm tắt ngắn gọn ý nghĩa bài đọc...",
    "source": "qwen2.5_0.5b",
    "ram_unloaded": true
  }
  ```

### 3.3. Upstream `POST /qwen/direct-prosody` (`python_service/main.py:2384-2432`)
- **Yêu cầu đầu vào upstream**:
  ```python
  class DirectProsodyRequest(BaseModel):
      passage: str
      difficult_words: Optional[Union[List[str], str]] = []
      grade: Optional[int] = 3
      chunk_mode: Optional[str] = "phrase"
  ```
- **Dữ liệu Python trả về**:
  ```json
  {
    "clauses": [
      {
        "index": 0,
        "text": "Vế câu số 1.",
        "word_count": 4,
        "style": "standard",
        "style_label": "Chuẩn mực",
        "rate": "-15%",
        "noise_scale": 0.667,
        "noise_w": 0.8,
        "pause_sec": 8.0,
        "matched_difficult_words": []
      }
    ],
    "total_words": 25,
    "estimated_duration_sec": 45.2,
    "cache_hit": false,
    "ram_unloaded": true
  }
  ```

---

## 4. CHI TIẾT THIẾT KẾ BFF ROUTE GATEWAY

### 4.1. Cấu hình Biến Môi trường & Địa chỉ Dịch vụ
Để tránh lỗi DNS resolution IPv6 trên Windows (Node.js 18+ tự động phân giải `localhost` thành `::1` trong khi Python uvicorn lắng nghe trên IPv4 `0.0.0.0` hoặc `127.0.0.1`), BFF Route sử dụng quy tắc chuẩn hóa:
```typescript
const VIT5_SERVICE_URL = (process.env.VIT5_SERVICE_URL || "http://127.0.0.1:8000").replace("localhost", "127.0.0.1")
```

### 4.2. Xử lý Phương thức GET
- Sử dụng `AbortSignal.timeout(10000)` (10 giây).
- Gửi yêu cầu `GET ${VIT5_SERVICE_URL}/qwen/status`.
- Nếu thành công (`res.ok`): bóc tách JSON và trả về live status object.
- Nếu không thành công hoặc lỗi mạng/timeout: trả về HTTP 200 graceful fallback object. Không ném uncaught exception.

### 4.3. Xử lý Phương thức POST
1. **Phân tích cú pháp JSON**: Dùng khối `try ... catch` quanh `await req.json()`. Nếu lỗi cú pháp, trả về HTTP 400 ngay lập tức: `{ success: false, error: "Dữ liệu JSON không hợp lệ" }`.
2. **Kiểm tra hành động (`body.action`)**:
   - Nếu `body.action === "extract_sgk"`:
     * Kiểm tra `body.raw_text`: bắt buộc phải là chuỗi không rỗng (`typeof raw_text === "string" && raw_text.trim().length > 0`). Nếu rỗng, trả về HTTP 400.
     * Chuẩn hóa `grade`: `Math.max(1, Math.min(5, Number(body.grade) || 3))`.
     * Gửi `POST ${VIT5_SERVICE_URL}/qwen/extract-sgk` kèm header `Content-Type: application/json` và tín hiệu `AbortSignal.timeout(30000)`.
     * Nhận `result` từ upstream, trả về `{ success: true, data: result, ...result }`.
   - Nếu `body.action === "direct_prosody"`:
     * Kiểm tra `body.passage`: bắt buộc phải là chuỗi không rỗng (`typeof passage === "string" && passage.trim().length > 0`). Nếu rỗng, trả về HTTP 400.
     * Chuẩn hóa `difficult_words`: nhận mảng `string[]` hoặc chuỗi phân cách dấu phẩy, mặc định `[]`.
     * Chuẩn hóa `grade`: `Math.max(1, Math.min(5, Number(body.grade) || 3))`.
     * Chuẩn hóa `chunk_mode`: `body.chunk_mode || "phrase"`.
     * Gửi `POST ${VIT5_SERVICE_URL}/qwen/direct-prosody` kèm `AbortSignal.timeout(30000)`.
     * Nhận `result` từ upstream, trả về `{ success: true, data: result, ...result }`.
   - Nếu `body.action` không thuộc 2 hành động trên:
     * Trả về HTTP 400 kèm thông báo rõ ràng: `{ success: false, error: "Hành động (action) không hợp lệ. Chỉ chấp nhận 'extract_sgk' hoặc 'direct_prosody'." }`.
3. **Bắt lỗi mạng và quá hạn (Error Handling Matrix)**:
   | Mã Lỗi / Exception | Nguyên nhân | HTTP Status | Response Payload |
   |---|---|---|---|
   | JSON SyntaxError | Request body không phải JSON | 400 Bad Request | `{ "success": false, "error": "Dữ liệu JSON không hợp lệ" }` |
   | Validation Error | Thiếu `raw_text` hoặc `passage` | 400 Bad Request | `{ "success": false, "error": "Trường '...' không được để trống" }` |
   | Action Error | Sai tên hành động | 400 Bad Request | `{ "success": false, "error": "Hành động (action) không hợp lệ..." }` |
   | Upstream Error | Python service trả về mã >= 400 | Giữ nguyên mã của upstream (e.g. 422, 500) | `{ "success": false, "error": "Python service báo lỗi (status): ..." }` |
   | `TimeoutError` / `AbortError` | Xử lý vượt quá 30 giây | 504 Gateway Timeout | `{ "success": false, "error": "Dịch vụ Qwen Director quá hạn xử lý (Timeout 30s)..." }` |
   | `TypeError` / `ECONNREFUSED` | Python service chưa bật | 503 Service Unavailable | `{ "success": false, "error": "Không thể kết nối đến trạm AI Python Core (Port 8000)..." }` |

---

## 5. MÃ NGUỒN ĐỀ XUẤT HOÀN CHỈNH CHO WORKER

Đường dẫn file mục tiêu: `app/api/dictation/qwen-director/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server"

// ============================================================
// Next.js BFF API Gateway: Qwen Director Route
// app/api/dictation/qwen-director/route.ts
//
// Proxies Qwen2.5-0.5B Pedagogical Director endpoints on Python AI Core (:8000)
// - GET: Health & RAM status (/qwen/status) with 10s timeout & graceful offline fallback
// - POST: Action multiplexer for SGK cleaner (/qwen/extract-sgk) & Prosody Director (/qwen/direct-prosody)
// ============================================================

const VIT5_SERVICE_URL = (process.env.VIT5_SERVICE_URL || "http://127.0.0.1:8000").replace("localhost", "127.0.0.1")

export async function GET() {
  try {
    const upstreamRes = await fetch(`${VIT5_SERVICE_URL}/qwen/status`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    })

    if (!upstreamRes.ok) {
      console.warn(`[GET /api/dictation/qwen-director] Upstream status ${upstreamRes.status}`)
      return NextResponse.json({
        enabled: false,
        is_loaded: false,
        available_ram_mb: 0,
        offline: true,
      })
    }

    const data = await upstreamRes.json()
    return NextResponse.json({
      enabled: data.enabled ?? false,
      model_id: data.model_id ?? "Qwen/Qwen2.5-0.5B-Instruct",
      is_loaded: data.is_loaded ?? false,
      lifecycle_mode: data.lifecycle_mode ?? "on_demand_unload",
      available_ram_mb: data.available_ram_mb ?? 0,
      cache_entries: data.cache_entries ?? 0,
      memory_mode: data.memory_mode ?? "zero_idle_ram",
      offline: false,
      ...data,
    })
  } catch (err: any) {
    console.warn("[GET /api/dictation/qwen-director] Python service offline or timeout:", err?.message || err)
    return NextResponse.json({
      enabled: false,
      is_loaded: false,
      available_ram_mb: 0,
      offline: true,
    })
  }
}

export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { success: false, error: "Dữ liệu JSON không hợp lệ" },
      { status: 400 }
    )
  }

  const action = body?.action

  // Branch 1: Trích xuất & làm sạch SGK/PDF
  if (action === "extract_sgk") {
    const rawText = typeof body?.raw_text === "string" ? body.raw_text.trim() : ""
    if (!rawText) {
      return NextResponse.json(
        { success: false, error: "Văn bản thô không được để trống (raw_text is required)" },
        { status: 400 }
      )
    }

    const grade = Math.max(1, Math.min(5, Number(body?.grade) || 3))

    try {
      const upstreamRes = await fetch(`${VIT5_SERVICE_URL}/qwen/extract-sgk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raw_text: rawText,
          grade,
        }),
        signal: AbortSignal.timeout(30000), // Cho phép cold-start Qwen on-demand trên RPi 4
      })

      if (!upstreamRes.ok) {
        const errDetail = await upstreamRes.text().catch(() => "")
        return NextResponse.json(
          {
            success: false,
            error: `Python service báo lỗi (${upstreamRes.status}): ${errDetail || "Không thể trích xuất SGK"}`,
          },
          { status: upstreamRes.status }
        )
      }

      const result = await upstreamRes.json()
      return NextResponse.json({
        success: true,
        data: result,
        ...result,
      })
    } catch (err: any) {
      if (err?.name === "TimeoutError" || err?.name === "AbortError") {
        return NextResponse.json(
          {
            success: false,
            error: "Dịch vụ Qwen Director quá hạn xử lý (Timeout 30s). Có thể mô hình đang khởi động nguội trên Raspberry Pi, vui lòng thử lại.",
          },
          { status: 504 }
        )
      }
      return NextResponse.json(
        {
          success: false,
          error: "Không thể kết nối đến trạm AI Python Core (Port 8000). Vui lòng kiểm tra dịch vụ python_service.",
        },
        { status: 503 }
      )
    }
  }

  // Branch 2: Đạo diễn nhịp đọc sư phạm
  if (action === "direct_prosody") {
    const passage = typeof body?.passage === "string" ? body.passage.trim() : ""
    if (!passage) {
      return NextResponse.json(
        { success: false, error: "Đoạn văn không được để trống (passage is required)" },
        { status: 400 }
      )
    }

    const grade = Math.max(1, Math.min(5, Number(body?.grade) || 3))
    const difficultWords = body?.difficult_words || []
    const chunkMode = body?.chunk_mode || "phrase"

    try {
      const upstreamRes = await fetch(`${VIT5_SERVICE_URL}/qwen/direct-prosody`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passage,
          difficult_words: difficultWords,
          grade,
          chunk_mode: chunkMode,
        }),
        signal: AbortSignal.timeout(30000), // 30s timeout cho cold start
      })

      if (!upstreamRes.ok) {
        const errDetail = await upstreamRes.text().catch(() => "")
        return NextResponse.json(
          {
            success: false,
            error: `Python service báo lỗi (${upstreamRes.status}): ${errDetail || "Không thể đạo diễn nhịp đọc"}`,
          },
          { status: upstreamRes.status }
        )
      }

      const result = await upstreamRes.json()
      return NextResponse.json({
        success: true,
        data: result,
        ...result,
      })
    } catch (err: any) {
      if (err?.name === "TimeoutError" || err?.name === "AbortError") {
        return NextResponse.json(
          {
            success: false,
            error: "Dịch vụ Qwen Director quá hạn xử lý (Timeout 30s). Có thể mô hình đang khởi động nguội trên Raspberry Pi, vui lòng thử lại.",
          },
          { status: 504 }
        )
      }
      return NextResponse.json(
        {
          success: false,
          error: "Không thể kết nối đến trạm AI Python Core (Port 8000). Vui lòng kiểm tra dịch vụ python_service.",
        },
        { status: 503 }
      )
    }
  }

  // Branch 3: Hành động không hợp lệ
  return NextResponse.json(
    {
      success: false,
      error: `Hành động '${action || "undefined"}' không hợp lệ. Chỉ chấp nhận 'extract_sgk' hoặc 'direct_prosody'.`,
    },
    { status: 400 }
  )
}
```

---

## 6. HƯỚNG DẪN TÍCH HỢP CHO MILESTONE 4 (FRONTEND INTEGRATION)

### 6.1. Trích xuất SGK trong Dialog (`app/teacher/dictation/page.tsx`)
```typescript
async function handleExtractSgk(rawText: string, grade: number = 3) {
  const res = await fetch("/api/dictation/qwen-director", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "extract_sgk",
      raw_text: rawText,
      grade,
    }),
  })
  const json = await res.json()
  if (json.success) {
    const data = json.data || json
    setTitle(data.title)
    setPassageText(data.clean_content)
    setDifficultWords(Array.isArray(data.difficultWords) ? data.difficultWords.join(", ") : data.difficultWords)
  }
}
```

### 6.2. Đạo diễn Nhịp đọc và Bảng Xem trước Kịch bản
```typescript
async function handleDirectProsody(passage: string, difficultWords: string[], grade: number = 3) {
  const res = await fetch("/api/dictation/qwen-director", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "direct_prosody",
      passage,
      difficult_words: difficultWords,
      grade,
      chunk_mode: "clause",
    }),
  })
  const json = await res.json()
  if (json.success) {
    const data = json.data || json
    setClauses(data.clauses)
  }
}
```

---

## 7. KẾ HOẠCH XÁC THỰC THỰC NGHIỆM CHO WORKER & REVIEWERS

1. **Kiểm tra cú pháp TypeScript**:
   ```powershell
   npx tsc --noEmit
   ```
   *Yêu cầu*: Hoàn thành với exit code 0, không có bất kỳ lỗi biên dịch nào.

2. **Kiểm tra Endpoint GET qua cURL / PowerShell**:
   ```powershell
   curl -i http://localhost:3000/api/dictation/qwen-director
   ```
   *Kỳ vọng khi Python offline*: Trả về HTTP 200 `{ "enabled": false, "is_loaded": false, "available_ram_mb": 0, "offline": true }`.
   *Kỳ vọng khi Python online*: Trả về HTTP 200 `{ "enabled": true, "model_id": "...", "is_loaded": false, "available_ram_mb": ... }`.

3. **Kiểm tra Endpoint POST validation**:
   - Gửi body rỗng `{}`: Trả về HTTP 400.
   - Gửi action lạ `{ "action": "test" }`: Trả về HTTP 400.
   - Gửi extract_sgk thiếu raw_text: Trả về HTTP 400.
   - Gửi direct_prosody thiếu passage: Trả về HTTP 400.

4. **Kiểm tra End-to-End với Python Service (Port 8000)**:
   - Gửi `extract_sgk` với văn bản chứa `Trang 45`: Nhận về nội dung đã lọc sạch và danh sách từ khó.
   - Gửi `direct_prosody`: Nhận về danh sách `clauses` bảo toàn 100% từ ngữ gốc.
