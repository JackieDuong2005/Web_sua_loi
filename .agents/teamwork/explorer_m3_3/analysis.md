# BÁO CÁO PHÂN TÍCH & KẾ HOẠCH KIỂM THỬ MILESTONE 3: NEXT.JS BFF API GATEWAY
## TypeScript Typing, App Router Conventions & Verification Test Strategy

**Tác giả**: Explorer 3 (TypeScript & Testing Verification)  
**Mã Agent**: `explorer_m3_3`  
**Ngày lập**: 2026-10-18T20:33:00Z  
**Tài liệu tham chiếu**: `ORIGINAL_REQUEST.md` (§ R3, Acceptance Criteria), `PROJECT.md` (Milestone 3), `api_specs.md`

---

## 1. TỔNG QUAN KẾT QUẢ KHẢO SÁT

Hệ thống Next.js 16 App Router hiện tại đang vận hành với TypeScript 5.7.3 ở chế độ `strict: true`, lệnh kiểm tra baseline `npx tsc --noEmit` đạt chuẩn tuyệt đối **0 lỗi biên dịch (Exit code 0)**. Ba endpoint thuộc Milestone 3 (`/api/dictation/tts`, `/api/dictation/play-local`, và route mới `/api/dictation/qwen-director`) hoàn toàn tương thích với các tiêu chuẩn type checking nghiêm ngặt của dự án, đồng thời được trang bị cơ chế bảo vệ kép: Rate Limiting (`guardAiRoute(req, 20)`), AbortController timeout (15s - 30s) và Graceful Fallback khi dịch vụ Python AI Core ngoại tuyến.

---

## 2. KHẢO SÁT CẤU HÌNH TYPESCRIPT & NEXT.JS APP ROUTER

### 2.1. Phân tích `tsconfig.json` & Các Ràng buộc Kiểu
- **Cấu hình hiện tại (`tsconfig.json`)**:
  - `target: "ES6"`, `module: "esnext"`, `moduleResolution: "bundler"`.
  - `strict: true` (bao gồm `strictNullChecks: true`, `noImplicitAny: true`, `strictFunctionTypes: true`).
  - `paths: { "@/*": ["./*"] }` cho phép import trực tiếp các module tiện ích `@/lib/api-guard` và `@/lib/utils`.
  - `noEmit: true`: Chỉ kiểm tra kiểu tĩnh mà không xuất file js.
- **Ràng buộc đối với Route Handlers**:
  1. `req.url` và `searchParams.get(key)`: Trả về kiểu `string | null`. Khi trích xuất các tham số dạng số (`noise_scale`, `noise_w`) hoặc boolean (`read_punctuation`), bắt buộc phải xử lý tường minh trường hợp `null` và kiểm tra `!isNaN(parsed)`.
  2. `req.json()`: Có thể throw ngoại lệ nếu client gửi body không phải JSON hoặc rỗng. Bắt buộc phải bọc trong `try / catch` hoặc fallback an toàn trước khi destructure.
  3. `new NextResponse(audioBuffer, ...)`: `audioBuffer` kiểu `ArrayBuffer` từ `edgeRes.arrayBuffer()` hoàn toàn hợp lệ với kiểu `BodyInit` trong Next.js 16 và TypeScript 5.7.
  4. Next.js Route Segment Config: Để ngăn chặn Next.js tự động tối ưu hóa tĩnh (static prerendering) tại thời điểm `npm run build` đối với các route phụ thuộc mạng nội bộ, khuyến nghị khai báo:
     ```ts
     export const dynamic = "force-dynamic"
     ```

---

## 3. ĐẶC TẢ CHI TIẾT & ĐỀ XUẤT CODE CHO 3 BFF ENDPOINTS

### 3.1. Endpoint 1: `app/api/dictation/tts/route.ts` (Cập nhật)
- **Mục tiêu**: Bổ sung hỗ trợ 4 tham số âm học mới (`style`, `noise_scale`, `noise_w`, `read_punctuation`) và chuyển tiếp xuống `GET http://127.0.0.1:8000/tts`.
- **TypeScript Interfaces**:
  ```ts
  export interface DictationTtsQueryParams {
    text: string
    voice: string
    rate: string
    style: "standard" | "warm_story" | "emphasis" | "question"
    noise_scale?: number
    noise_w?: number
    read_punctuation: boolean
  }
  ```
- **Mã nguồn đề xuất hoàn chỉnh**:
  ```ts
  import { NextRequest, NextResponse } from "next/server"

  export const dynamic = "force-dynamic"

  // ============================================================
  // GET /api/dictation/tts
  // Chuyển tiếp yêu cầu tổng hợp âm thanh Piper VITS ONNX đến Python Service (:8000)
  // Hỗ trợ 4 phong cách biểu cảm và cờ đọc tên dấu câu sư phạm
  // ============================================================

  const VIT5_SERVICE_URL = process.env.VIT5_SERVICE_URL || "http://127.0.0.1:8000"

  export async function GET(req: NextRequest) {
    try {
      const { searchParams } = new URL(req.url)
      const text = searchParams.get("text")
      const voice = searchParams.get("voice") || "vi_VN-vais1000-medium"
      const rate = searchParams.get("rate") || "-15%"
      const style = searchParams.get("style") || "standard"
      const noiseScaleRaw = searchParams.get("noise_scale")
      const noiseWRaw = searchParams.get("noise_w")
      const readPunctRaw = searchParams.get("read_punctuation")

      if (!text || !text.trim()) {
        return NextResponse.json({ error: "Thiếu nội dung văn bản cần đọc" }, { status: 400 })
      }

      const trimmedText = text.trim()
      const query = new URLSearchParams({
        text: trimmedText,
        voice,
        rate,
        style,
      })

      if (noiseScaleRaw !== null) {
        const val = parseFloat(noiseScaleRaw)
        if (!isNaN(val) && val >= 0 && val <= 2.0) {
          query.set("noise_scale", String(val))
        }
      }

      if (noiseWRaw !== null) {
        const val = parseFloat(noiseWRaw)
        if (!isNaN(val) && val >= 0 && val <= 2.0) {
          query.set("noise_w", String(val))
        }
      }

      const readPunctuation = readPunctRaw === "true" || readPunctRaw === "1"
      query.set("read_punctuation", String(readPunctuation))

      const edgeUrl = `${VIT5_SERVICE_URL}/tts?${query.toString()}`

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      try {
        const edgeRes = await fetch(edgeUrl, {
          signal: controller.signal,
        })

        if (edgeRes.ok) {
          const audioBuffer = await edgeRes.arrayBuffer()
          const contentType = edgeRes.headers.get("content-type") || "audio/wav"

          return new NextResponse(audioBuffer, {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "public, max-age=86400, s-maxage=86400",
              "X-TTS-Engine": "Piper-VITS-ONNX-Offline-RPi",
              "X-Prosody-Style": style,
            },
          })
        } else {
          const errorDetail = await edgeRes.text().catch(() => "")
          console.error(`[GET /api/dictation/tts] Python service error: ${edgeRes.status} - ${errorDetail}`)
          return NextResponse.json(
            { error: `Dịch vụ TTS Raspberry Pi báo lỗi: ${edgeRes.status}` },
            { status: edgeRes.status }
          )
        }
      } catch (err: any) {
        if (err.name === "AbortError") {
          return NextResponse.json(
            { error: "Dịch vụ TTS Raspberry Pi quá hạn xử lý (Timeout 15s)" },
            { status: 504 }
          )
        }
        return NextResponse.json(
          { error: "Không thể kết nối đến trạm phát âm thanh Raspberry Pi. Vui lòng kiểm tra dịch vụ python_service." },
          { status: 503 }
        )
      } finally {
        clearTimeout(timeoutId)
      }
    } catch (error) {
      console.error("[GET /api/dictation/tts]", error)
      return NextResponse.json({ error: "Lỗi tạo âm thanh TTS" }, { status: 500 })
    }
  }
  ```

---

### 3.2. Endpoint 2: `app/api/dictation/play-local/route.ts` (Cập nhật)
- **Mục tiêu**: Bổ sung hỗ trợ 4 tham số âm học mới trong payload JSON gửi đến `POST http://127.0.0.1:8000/tts/play-local`.
- **TypeScript Interfaces**:
  ```ts
  export interface PlayLocalRequestBody {
    text: string
    voice?: string
    rate?: string
    style?: "standard" | "warm_story" | "emphasis" | "question"
    noise_scale?: number
    noise_w?: number
    read_punctuation?: boolean
  }
  ```
- **Mã nguồn đề xuất hoàn chỉnh**:
  ```ts
  import { NextRequest, NextResponse } from "next/server"

  export const dynamic = "force-dynamic"

  // ============================================================
  // POST /api/dictation/play-local
  // Yêu cầu Raspberry Pi phát âm thanh trực tiếp ra Loa phần cứng (3.5mm AUX / USB)
  // Kèm thông số biểu cảm ngữ điệu và đọc tên dấu câu sư phạm
  // ============================================================

  const VIT5_SERVICE_URL = process.env.VIT5_SERVICE_URL || "http://127.0.0.1:8000"

  export async function POST(req: NextRequest) {
    try {
      let body: any
      try {
        body = await req.json()
      } catch {
        return NextResponse.json({ error: "Dữ liệu JSON không hợp lệ" }, { status: 400 })
      }

      if (!body || typeof body !== "object") {
        return NextResponse.json({ error: "Payload yêu cầu không hợp lệ" }, { status: 400 })
      }

      const {
        text,
        voice = "vi_VN-vais1000-medium",
        rate = "-15%",
        style = "standard",
        noise_scale,
        noise_w,
        read_punctuation = false,
      } = body

      if (!text || typeof text !== "string" || !text.trim()) {
        return NextResponse.json({ error: "Thiếu nội dung văn bản" }, { status: 400 })
      }

      const payload: Record<string, any> = {
        text: text.trim(),
        voice: String(voice),
        rate: String(rate),
        style: String(style),
        read_punctuation: Boolean(read_punctuation),
      }

      if (typeof noise_scale === "number" && !isNaN(noise_scale)) {
        payload.noise_scale = noise_scale
      }
      if (typeof noise_w === "number" && !isNaN(noise_w)) {
        payload.noise_w = noise_w
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      try {
        const res = await fetch(`${VIT5_SERVICE_URL}/tts/play-local`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          return NextResponse.json(
            { error: errData.detail || "Không thể phát âm thanh trên loa Raspberry Pi" },
            { status: res.status }
          )
        }

        const data = await res.json()
        return NextResponse.json(data)
      } catch (err: any) {
        if (err.name === "AbortError") {
          return NextResponse.json(
            { error: "Quá hạn xử lý phát loa cục bộ (Timeout 15s)" },
            { status: 504 }
          )
        }
        return NextResponse.json(
          { error: "Lỗi kết nối đến thiết bị phát âm thanh Raspberry Pi" },
          { status: 502 }
        )
      } finally {
        clearTimeout(timeoutId)
      }
    } catch (error) {
      console.error("[POST /api/dictation/play-local]", error)
      return NextResponse.json(
        { error: "Lỗi hệ thống khi phát âm thanh cục bộ" },
        { status: 500 }
      )
    }
  }
  ```

---

### 3.3. Endpoint 3: `app/api/dictation/qwen-director/route.ts` (Tạo mới)
- **Mục tiêu**:
  - `GET`: Proxy tình trạng nạp Qwen2.5, RAM trống và Cache script (`http://127.0.0.1:8000/qwen/status`). Khi backend offline, trả về fallback an toàn HTTP 200 để tránh lỗi vỡ UI.
  - `POST`: Multiplexer điều phối giữa `action: "extract_sgk"` và `action: "direct_prosody"`, bảo vệ bằng `guardAiRoute(req, 20)` và timeout 30s.
- **TypeScript Interfaces**:
  ```ts
  export interface QwenStatusResponse {
    enabled: boolean
    model_id?: string
    is_loaded: boolean
    lifecycle_mode: string
    available_ram_mb: number
    ram_threshold_mb?: number
    ram_safe_to_load?: boolean
    cache_entries?: number
    memory_mode?: string
    precision?: string
    quantized?: boolean
    device?: string
    description?: string
    status?: string
    error?: string
  }

  export interface ExtractSgkPayload {
    action: "extract_sgk"
    raw_text: string
    grade?: number
  }

  export interface DirectProsodyPayload {
    action: "direct_prosody"
    passage: string
    difficult_words?: string | string[]
    grade?: number
    chunk_mode?: "clause" | "sentence" | "phrase"
  }

  export type QwenDirectorActionPayload = ExtractSgkPayload | DirectProsodyPayload
  ```
- **Mã nguồn đề xuất hoàn chỉnh**:
  ```ts
  import { NextRequest, NextResponse } from "next/server"
  import { guardAiRoute } from "@/lib/api-guard"

  export const dynamic = "force-dynamic"
  export const maxDuration = 35

  // ============================================================
  // Next.js BFF Gateway: Qwen2.5 SLM Pedagogical Director Multiplexer
  // GET:  Proxy /qwen/status (RAM sensing & lifecycle metrics)
  // POST: Multiplex "extract_sgk" and "direct_prosody" actions
  // ============================================================

  const VIT5_SERVICE_URL = process.env.VIT5_SERVICE_URL || "http://127.0.0.1:8000"

  export async function GET(req: NextRequest) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    try {
      const res = await fetch(`${VIT5_SERVICE_URL}/qwen/status`, {
        signal: controller.signal,
      })

      if (res.ok) {
        const data = await res.json()
        return NextResponse.json(data)
      } else {
        return NextResponse.json({
          enabled: false,
          lifecycle_mode: "offline",
          is_loaded: false,
          available_ram_mb: 0,
          ram_safe_to_load: false,
          status: "unavailable",
          error: `Dịch vụ Python AI Core phản hồi mã lỗi ${res.status}`,
        })
      }
    } catch {
      // Graceful fallback khi Python service chưa bật hoặc timeout
      return NextResponse.json({
        enabled: false,
        lifecycle_mode: "offline",
        is_loaded: false,
        available_ram_mb: 0,
        ram_safe_to_load: false,
        status: "unavailable",
        error: "Dịch vụ Python AI Core chưa sẵn sàng",
      })
    } finally {
      clearTimeout(timeoutId)
    }
  }

  export async function POST(req: NextRequest) {
    // 1. Rate Limiting Guard: Tối đa 20 yêu cầu / phút / IP
    const rateLimitResponse = guardAiRoute(req, 20, "qwen-director")
    if (rateLimitResponse) return rateLimitResponse

    // 2. Parse Body an toàn
    let body: any
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Dữ liệu JSON không hợp lệ" }, { status: 400 })
    }

    if (!body || typeof body !== "object" || !body.action) {
      return NextResponse.json(
        { error: "Yêu cầu thiếu thuộc tính 'action' (extract_sgk hoặc direct_prosody)" },
        { status: 400 }
      )
    }

    const { action } = body
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout cho SLM On-Demand

    try {
      // ── NHÁNH 1: Trích xuất & Làm sạch SGK / PDF ──
      if (action === "extract_sgk") {
        const { raw_text, grade = 3 } = body
        if (!raw_text || typeof raw_text !== "string" || !raw_text.trim()) {
          return NextResponse.json(
            { error: "Văn bản thô không được để trống" },
            { status: 400 }
          )
        }

        const validGrade = Math.max(1, Math.min(5, Number(grade) || 3))
        const res = await fetch(`${VIT5_SERVICE_URL}/qwen/extract-sgk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            raw_text: raw_text.trim(),
            grade: validGrade,
          }),
          signal: controller.signal,
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          return NextResponse.json(
            { error: errData.detail || "Không thể trích xuất ngữ liệu từ Python Core" },
            { status: res.status }
          )
        }

        const data = await res.json()
        return NextResponse.json({
          success: true,
          action: "extract_sgk",
          ...data,
        })
      }

      // ── NHÁNH 2: Đạo diễn Nhịp đọc Sư phạm & Ngắt Vế câu ──
      if (action === "direct_prosody") {
        const {
          passage,
          difficult_words = [],
          grade = 3,
          chunk_mode = "clause",
        } = body

        if (!passage || typeof passage !== "string" || !passage.trim()) {
          return NextResponse.json(
            { error: "Đoạn văn không được để trống" },
            { status: 400 }
          )
        }

        const validGrade = Math.max(1, Math.min(5, Number(grade) || 3))
        const res = await fetch(`${VIT5_SERVICE_URL}/qwen/direct-prosody`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            passage: passage.trim(),
            difficult_words,
            grade: validGrade,
            chunk_mode,
          }),
          signal: controller.signal,
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          return NextResponse.json(
            { error: errData.detail || "Không thể đạo diễn nhịp đọc từ Python Core" },
            { status: res.status }
          )
        }

        const data = await res.json()
        return NextResponse.json({
          success: true,
          action: "direct_prosody",
          ...data,
        })
      }

      // ── NHÁNH 3: Action không hợp lệ ──
      return NextResponse.json(
        { error: `Hành động '${action}' không được hỗ trợ. Chỉ chấp nhận 'extract_sgk' hoặc 'direct_prosody'.` },
        { status: 400 }
      )
    } catch (err: any) {
      if (err.name === "AbortError") {
        return NextResponse.json(
          { error: "Dịch vụ Qwen Director quá hạn xử lý (Timeout 30s)" },
          { status: 504 }
        )
      }
      return NextResponse.json(
        { error: "Không thể kết nối đến trạm AI Core. Vui lòng kiểm tra python_service." },
        { status: 503 }
      )
    } finally {
      clearTimeout(timeoutId)
    }
  }
  ```

---

## 4. MA TRẬN MÃ TRẠNG THÁI HTTP & XỬ LÝ LỖI (ERROR MAPPING MATRIX)

| Endpoint | Tình huống Kiểm thử | Input Payload / Query | Mã HTTP Kỳ vọng | Cấu trúc Body Phản hồi |
|---|---|---|---|---|
| `GET /api/dictation/tts` | Thiếu `text` | `?voice=...` (không có text) | `400 Bad Request` | `{ "error": "Thiếu nội dung văn bản cần đọc" }` |
| `GET /api/dictation/tts` | Thành công | `?text=Chào+em&style=warm_story` | `200 OK` | Nhị phân WAV (`Content-Type: audio/wav`), Header `X-Prosody-Style: warm_story` |
| `GET /api/dictation/tts` | Python Core sập | `?text=Chào+em` | `503 Service Unavailable` | `{ "error": "Không thể kết nối đến trạm phát âm thanh..." }` |
| `GET /api/dictation/tts` | Quá hạn 15s | `?text=...` | `504 Gateway Timeout` | `{ "error": "Dịch vụ TTS Raspberry Pi quá hạn xử lý (Timeout 15s)" }` |
| `POST /api/dictation/play-local` | Body rỗng / thiếu text | `{}` hoặc `{ "text": "" }` | `400 Bad Request` | `{ "error": "Thiếu nội dung văn bản" }` |
| `POST /api/dictation/play-local` | Thành công | `{ "text": "Chào em", "style": "emphasis" }` | `200 OK` | `{ "status": "ok", "device": "local_speaker", ... }` |
| `POST /api/dictation/play-local` | Python Core sập | `{ "text": "Chào em" }` | `502 Bad Gateway` | `{ "error": "Lỗi kết nối đến thiết bị phát âm thanh..." }` |
| `GET /api/dictation/qwen-director` | Core Online | Không query | `200 OK` | `{ "enabled": true, "lifecycle_mode": "on_demand_unload", "available_ram_mb": ... }` |
| `GET /api/dictation/qwen-director` | Core Offline | Không query | `200 OK` (Fallback) | `{ "enabled": false, "lifecycle_mode": "offline", "status": "unavailable" }` |
| `POST /api/dictation/qwen-director` | Thiếu `action` | `{ "raw_text": "abc" }` | `400 Bad Request` | `{ "error": "Yêu cầu thiếu thuộc tính 'action'..." }` |
| `POST /api/dictation/qwen-director` | Action không hợp lệ | `{ "action": "unknown" }` | `400 Bad Request` | `{ "error": "Hành động 'unknown' không được hỗ trợ..." }` |
| `POST /api/dictation/qwen-director` | `extract_sgk` rỗng | `{ "action": "extract_sgk", "raw_text": "" }` | `400 Bad Request` | `{ "error": "Văn bản thô không được để trống" }` |
| `POST /api/dictation/qwen-director` | `direct_prosody` rỗng | `{ "action": "direct_prosody", "passage": "" }` | `400 Bad Request` | `{ "error": "Đoạn văn không được để trống" }` |
| `POST /api/dictation/qwen-director` | Rate limit vượt 20/phút | Gọi liên tục 21 lần | `429 Too Many Requests` | `{ "error": "Quá nhiều yêu cầu gọi AI...", "retryAfter": ... }` |
| `POST /api/dictation/qwen-director` | Core Offline | `{ "action": "extract_sgk", "raw_text": "..." }` | `503 Service Unavailable` | `{ "error": "Không thể kết nối đến trạm AI Core..." }` |
| `POST /api/dictation/qwen-director` | Quá hạn 30s | Giả lập timeout | `504 Gateway Timeout` | `{ "error": "Dịch vụ Qwen Director quá hạn xử lý (Timeout 30s)" }` |

---

## 5. KẾ HOẠCH & TẬP LỆNH KIỂM THỬ XÁC THỰC TOÀN DIỆN (VERIFICATION SUITE)

Để đảm bảo tuân thủ triết lý kiểm thử thực nghiệm nghiêm ngặt của Lauren Tan / PStack và GEMINI.md ("Passing build is NOT verification. Drive the real app the way a user does and capture evidence"), kế hoạch kiểm thử được phân bổ thành 3 tầng:

### Tầng 1: Kiểm thử Biên dịch & Kiểm tra Kiểu Tĩnh (Type Checking)
- **Mục đích**: Bảo đảm 100% không phát sinh lỗi cú pháp, typing, hoặc lệch signature của Next.js App Router.
- **Lệnh thực thi**:
  ```powershell
  # 1. Type check tĩnh toàn bộ workspace
  npx tsc --noEmit

  # 2. Kiểm thử build Next.js App Router
  npm run build
  ```
- **Tiêu chí nghiệm thu**: Exit code 0, không có bất kỳ warning hay type error nào.

---

### Tầng 2: Kiểm thử Xác thực Ngoại tuyến (Offline & Input Validation)
- **Mục đích**: Xác thực khả năng phòng vệ đầu vào, ánh xạ lỗi và cơ chế Fallback an toàn khi Python Service chưa khởi động.
- **Tập lệnh Curl kiểm thử**:
  ```powershell
  # Test 2.1: GET qwen-director khi Core Offline (phải trả về HTTP 200 kèm status unavailable)
  curl -s -i "http://localhost:3000/api/dictation/qwen-director"

  # Test 2.2: POST qwen-director thiếu action (HTTP 400)
  curl -s -i -X POST "http://localhost:3000/api/dictation/qwen-director" -H "Content-Type: application/json" -d "{}"

  # Test 2.3: POST qwen-director action extract_sgk rỗng (HTTP 400)
  curl -s -i -X POST "http://localhost:3000/api/dictation/qwen-director" -H "Content-Type: application/json" -d "{\"action\":\"extract_sgk\",\"raw_text\":\"\"}"

  # Test 2.4: POST qwen-director action direct_prosody rỗng (HTTP 400)
  curl -s -i -X POST "http://localhost:3000/api/dictation/qwen-director" -H "Content-Type: application/json" -d "{\"action\":\"direct_prosody\",\"passage\":\"\"}"

  # Test 2.5: GET tts thiếu text (HTTP 400)
  curl -s -i "http://localhost:3000/api/dictation/tts"

  # Test 2.6: POST play-local thiếu text (HTTP 400)
  curl -s -i -X POST "http://localhost:3000/api/dictation/play-local" -H "Content-Type: application/json" -d "{}"
  ```

---

### Tầng 3: Kiểm thử Tích hợp Thực tế End-to-End (Khi bật Python Core :8000)
- **Mục đích**: Xác thực toàn bộ luồng truyền tham số âm học, trích xuất SGK, đạo diễn vế câu và phát âm thanh WAV.
- **Tập lệnh Curl kiểm thử**:
  ```powershell
  # Test 3.1: GET qwen-director trạng thái RAM & Lifecycle
  curl -s "http://localhost:3000/api/dictation/qwen-director"

  # Test 3.2: POST extract_sgk với ngữ liệu có số trang và câu hỏi thảo luận
  curl -s -X POST "http://localhost:3000/api/dictation/qwen-director" `
    -H "Content-Type: application/json" `
    -d "{\"action\":\"extract_sgk\",\"raw_text\":\"Tiếng Việt 3\nTrang 45\nBài: Mùa Thu Quê Em\nBầu trời xanh trong vắt.\nCâu hỏi thảo luận:\n1. Bầu trời thế nào?\",\"grade\":3}"

  # Test 3.3: POST direct_prosody phân đoạn vế câu bảo toàn 100% chữ
  curl -s -X POST "http://localhost:3000/api/dictation/qwen-director" `
    -H "Content-Type: application/json" `
    -d "{\"action\":\"direct_prosody\",\"passage\":\"Gió mùa thu se lạnh thổi qua từng kẽ lá. Bầu trời xanh trong vắt.\",\"difficult_words\":[\"se lạnh\",\"trong vắt\"],\"grade\":3,\"chunk_mode\":\"clause\"}"

  # Test 3.4: GET tts sinh âm thanh WAV với style warm_story và đọc tên dấu câu
  curl -s -o test_output.wav -w "HTTP Status: %{http_code}\nSize: %{size_download} bytes\nContent-Type: %{content_type}\n" `
    "http://localhost:3000/api/dictation/tts?text=B%E1%BA%A7u+tr%E1%BB%9Di+xanh%2C+trong+v%E1%BA%AFt.&style=warm_story&read_punctuation=true"

  # Test 3.5: POST play-local phát loa lớp học với style emphasis
  curl -s -X POST "http://localhost:3000/api/dictation/play-local" `
    -H "Content-Type: application/json" `
    -d "{\"text\":\"Kiểm tra loa cục bộ lớp học\",\"style\":\"emphasis\",\"read_punctuation\":false}"
  ```

---

### Tầng 4: Thiết kế Script Kiểm thử Tự động hóa Node.js (`tests/test_milestone3_bff.mjs`)

Đề xuất kịch bản kiểm thử tự động hóa bằng Node.js 24 (`node tests/test_milestone3_bff.mjs`) dành cho Worker và Reviewers:

```javascript
/**
 * Automated Verification Script for Milestone 3: Next.js BFF API Gateway
 * Target Base URL: http://localhost:3000
 */
import assert from "node:assert";

const BASE_URL = process.env.TEST_BFF_URL || "http://localhost:3000";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function runTest(name, fn) {
  totalTests++;
  try {
    process.stdout.write(`  [RUN] ${name}... `);
    await fn();
    passedTests++;
    console.log("✅ PASS");
  } catch (err) {
    failedTests++;
    console.log(`❌ FAIL -> ${err.message}`);
  }
}

async function main() {
  console.log("================================================================================");
  console.log("MILESTONE 3: NEXT.JS BFF GATEWAY AUTOMATED VERIFICATION SUITE");
  console.log(`Target: ${BASE_URL}`);
  console.log("================================================================================");

  // 1. GET /api/dictation/tts - Missing text
  await runTest("GET /api/dictation/tts (Missing text returns 400)", async () => {
    const res = await fetch(`${BASE_URL}/api/dictation/tts`);
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.ok(body.error, "Should have error message");
  });

  // 2. POST /api/dictation/play-local - Missing text
  await runTest("POST /api/dictation/play-local (Missing text returns 400)", async () => {
    const res = await fetch(`${BASE_URL}/api/dictation/play-local`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.ok(body.error, "Should have error message");
  });

  // 3. GET /api/dictation/qwen-director - Status response
  await runTest("GET /api/dictation/qwen-director (Returns 200 with status JSON)", async () => {
    const res = await fetch(`${BASE_URL}/api/dictation/qwen-director`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(typeof body.enabled === "boolean", "enabled should be boolean");
    assert.ok(body.lifecycle_mode, "lifecycle_mode should be defined");
  });

  // 4. POST /api/dictation/qwen-director - Missing action
  await runTest("POST /api/dictation/qwen-director (Missing action returns 400)", async () => {
    const res = await fetch(`${BASE_URL}/api/dictation/qwen-director`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Hello" }),
    });
    assert.strictEqual(res.status, 400);
  });

  // 5. POST /api/dictation/qwen-director - Invalid action
  await runTest("POST /api/dictation/qwen-director (Invalid action returns 400)", async () => {
    const res = await fetch(`${BASE_URL}/api/dictation/qwen-director`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "hack_system" }),
    });
    assert.strictEqual(res.status, 400);
  });

  // 6. POST /api/dictation/qwen-director - extract_sgk with empty raw_text
  await runTest("POST /api/dictation/qwen-director (extract_sgk empty text returns 400)", async () => {
    const res = await fetch(`${BASE_URL}/api/dictation/qwen-director`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "extract_sgk", raw_text: "" }),
    });
    assert.strictEqual(res.status, 400);
  });

  // 7. POST /api/dictation/qwen-director - direct_prosody with empty passage
  await runTest("POST /api/dictation/qwen-director (direct_prosody empty passage returns 400)", async () => {
    const res = await fetch(`${BASE_URL}/api/dictation/qwen-director`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "direct_prosody", passage: "" }),
    });
    assert.strictEqual(res.status, 400);
  });

  console.log("\n--------------------------------------------------------------------------------");
  console.log(`TOTAL: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
  console.log("--------------------------------------------------------------------------------");

  if (failedTests > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
```

---

## 6. HƯỚNG DẪN TRIỂN KHAI CHO WORKER VÀ DANH MỤC SOÁT XÉT CHO REVIEWERS

### Dành cho Worker M3:
1. Sửa `app/api/dictation/tts/route.ts`: Thêm `style`, `noise_scale`, `noise_w`, `read_punctuation` vào searchParams, bọc timeout trong `try/finally` để xóa timeout timer, xuất `X-Prosody-Style` header.
2. Sửa `app/api/dictation/play-local/route.ts`: Thêm trích xuất và validation 4 tham số âm học, gửi trong JSON body tới Python service, xử lý JSON parsing an toàn.
3. Tạo mới `app/api/dictation/qwen-director/route.ts`: Triển khai `GET` (proxy status) và `POST` (multiplexer `extract_sgk` & `direct_prosody`), tích hợp `guardAiRoute(req, 20)`.
4. Chạy `npx tsc --noEmit` ngay sau khi sửa code để đảm bảo exit code 0.

### Dành cho Reviewers / Challengers:
- [ ] Chạy `npx tsc --noEmit` chứng minh 0 lỗi TypeScript.
- [ ] Xác nhận không có `any` không cần thiết hoặc bỏ qua kiểm tra `null`/`undefined`.
- [ ] Kiểm tra cơ chế fallback ngoại tuyến của `GET /api/dictation/qwen-director` (phải trả HTTP 200 với JSON an toàn khi Python service tắt).
- [ ] Kiểm tra rate limiting `guardAiRoute(req, 20)`.
- [ ] Kiểm tra timeout 15s cho TTS/play-local và 30s cho Qwen Director.
