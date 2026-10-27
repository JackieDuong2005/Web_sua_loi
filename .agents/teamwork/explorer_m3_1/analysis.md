# Báo Cáo Phân Tích Kỹ Thuật: Next.js BFF API Gateway (TTS Routes)
**Milestone 3 — Feature F10**
**Author**: Explorer M3-1 (`explorer_m3_1`)
**Date**: 2026-10-18T20:30:00Z
**Target Files**:
- `app/api/dictation/tts/route.ts`
- `app/api/dictation/play-local/route.ts`

---

## 1. TỔNG QUAN VÀ MỤC TIÊU (EXECUTIVE SUMMARY)

Trong hệ sinh thái **ViHand Grade**, tầng Next.js BFF (Backend-For-Frontend) đóng vai trò là API Gateway bảo vệ và phân phối các yêu cầu từ Web App (Teacher Dictation Cockpit, Teacher Grade View, Student Portal) tới Python AI Core Microservice chạy trên Edge Server / Raspberry Pi 4 (cổng 8000).

Mục tiêu của cuộc điều tra này:
1. Đánh giá toàn diện hiện trạng mã nguồn của 2 route:
   - `app/api/dictation/tts/route.ts`
   - `app/api/dictation/play-local/route.ts`
2. Đối soát chặt chẽ với hợp đồng API của Python Service (`python_service/main.py` lines 2140-2248) và tài liệu đặc tả `api_specs.md`.
3. Cung cấp thiết kế kỹ thuật chi tiết, ma trận tham số và giải pháp mã nguồn hoàn chỉnh (Drop-in code replacement) để Worker triển khai chuẩn xác 100%, không hồi quy và đạt 0 lỗi TypeScript (`npx tsc --noEmit`).

---

## 2. SƠ ĐỒ LUỒNG DỮ LIỆU & ĐIỀU PHỐI (ASCII ARCHITECTURE)

```
+---------------------------------------------------------------------------------+
|                                CLIENT SURFACES                                  |
|   Teacher Dictation Cockpit  |  Teacher Grading  |  Student Portal / Modal      |
+---------------------------------------------------------------------------------+
          │                                                       ▲
          │ 1. GET /api/dictation/tts?...                         │ Audio/WAV
          │    (text, voice, rate, style, noise, punct)           │ Stream
          │ 2. POST /api/dictation/play-local                     │
          │    { text, voice, rate, style, noise, punct }         │ JSON
          ▼                                                       │
+---------------------------------------------------------------------------------+
|                         NEXT.JS BFF API GATEWAY (M3)                            |
|                                                                                 |
| [app/api/dictation/tts/route.ts]                                                |
| - Parse & trim query params                                                     |
| - Build URLSearchParams forwarding all 7 parameters                             |
| - AbortController timeout guard (15s-20s)                                       |
| - Stream binary WAV with headers: Content-Type, Cache-Control,                  |
|   X-TTS-Engine, X-TTS-Style                                                     |
|                                                                                 |
| [app/api/dictation/play-local/route.ts]                                         |
| - Parse & validate JSON body                                                    |
| - Forward 7 parameters to Python service /tts/play-local                        |
| - AbortController timeout guard (15s)                                           |
| - Return JSON { status, device, success, length_scale, noise_scale, ... }       |
+---------------------------------------------------------------------------------+
          │                                                       ▲
          │ HTTP Request                                          │ Binary WAV /
          │ (Forwarding all acoustic parameters)                  │ JSON Status
          ▼                                                       │
+---------------------------------------------------------------------------------+
|                    PYTHON AI MICROSERVICE (:8000)                               |
|                                                                                 |
| - GET  /tts               -> Piper VITS ONNX synthesize_wav -> binary WAV       |
| - POST /tts/play-local    -> Piper VITS ONNX play_on_local_speaker -> Hardware  |
+---------------------------------------------------------------------------------+
```

---

## 3. ĐỐI SOÁT HIỆN TRẠNG & KHOẢNG CÁCH (GAP ANALYSIS)

### 3.1. Route `app/api/dictation/tts/route.ts`

#### Hiện trạng:
- Dòng 13-16: Chỉ đọc 3 tham số: `text`, `voice`, `rate`.
- Dòng 23: Ghép URL tĩnh bằng template string:
  `${VIT5_SERVICE_URL}/tts?text=${encodeURIComponent(trimmedText)}&voice=${encodeURIComponent(voice)}&rate=${encodeURIComponent(rate)}`
- Dòng 38-44: Header phản hồi chỉ trả về `Content-Type`, `Cache-Control`, `X-TTS-Engine: "Piper-VITS-ONNX-Offline-RPi"`.
- Chưa bảo toàn header `X-TTS-Style` từ backend Python (`main.py:2190`).
- Chưa hỗ trợ các tham số âm học nâng cao của Milestone 1 & 2:
  * `style` (`warm_story`, `standard`, `emphasis`, `question`)
  * `noise_scale` (hệ số biến thiên âm vị)
  * `noise_w` (hệ số biến thiên trường độ)
  * `read_punctuation` (cờ đọc tên dấu câu sư phạm)

#### Yêu cầu khắc phục:
1. Trích xuất đầy đủ 7 query parameters:
   - `text` (bắt buộc, trim, 400 nếu rỗng).
   - `voice` (mặc định `"vi_VN-vais1000-medium"`).
   - `rate` (mặc định `"-15%"`, chấp nhận fallback từ `speed`).
   - `style` (tùy chọn, ví dụ `"standard"`, `"warm_story"`, `"emphasis"`, `"question"`).
   - `noise_scale` (tùy chọn float string, ví dụ `"0.78"`).
   - `noise_w` (tùy chọn float string, ví dụ `"0.90"`).
   - `read_punctuation` (tùy chọn boolean string: `"true"` / `"false"` / `"1"` / `"0"`).
2. Xây dựng URL động bằng `URLSearchParams` để mã hóa sạch, an toàn và tự động bỏ qua các tham số `null`/`undefined`.
3. Bảo toàn các header từ backend:
   - `Content-Type`: Giữ nguyên hoặc fallback `audio/wav`.
   - `Cache-Control`: `"public, max-age=86400, s-maxage=86400"`.
   - `X-TTS-Engine`: Giữ nguyên từ backend hoặc fallback `"Piper-VITS-ONNX-Offline-RPi"`.
   - `X-TTS-Style`: Giữ nguyên `edgeRes.headers.get("x-tts-style")` hoặc fallback `style || "standard"`.
   - Thêm `X-Prosody-Style` đồng bộ với `api_specs.md`.
4. Quản lý Timeout 15s-20s với `AbortController`:
   - Lỗi `AbortError` $\to$ HTTP 504 Gateway Timeout.
   - Lỗi kết nối / fetch fail $\to$ HTTP 503 Service Unavailable.
   - Trạng thái HTTP lỗi từ Python Service $\to$ chuyển tiếp status code và error detail.

---

### 3.2. Route `app/api/dictation/play-local/route.ts`

#### Hiện trạng:
- Dòng 12-13: Chỉ parse `{ text, voice = "vi_VN-vais1000-medium", rate = "-15%" }` từ `req.json()`.
- Dòng 25: Forward body chỉ gồm `{ text, voice, rate }`.
- Hoàn toàn bỏ sót 4 tham số: `style`, `noise_scale`, `noise_w`, `read_punctuation`.
- Dòng 40-46: Khối catch bắt chung trả về HTTP 502, chưa phân biệt lỗi Timeout 504 (`AbortError`) với lỗi kết nối 502/503.

#### Yêu cầu khắc phục:
1. Parse JSON body an toàn:
   ```typescript
   const body = await req.json().catch(() => ({}))
   const {
     text,
     voice = "vi_VN-vais1000-medium",
     rate = "-15%",
     speed,
     style = "standard",
     noise_scale,
     noise_w,
     read_punctuation = false,
   } = body
   ```
2. Kiểm tra `text` hợp lệ (bắt buộc string không rỗng, 400 nếu rỗng).
3. Đóng gói payload gửi tới `${VIT5_SERVICE_URL}/tts/play-local`:
   - `text`: `text.trim()`
   - `voice`: `voice`
   - `rate`: `rate || speed || "-15%"`
   - `style`: `style || "standard"`
   - `noise_scale`: truyền kiểu số `number` nếu có
   - `noise_w`: truyền kiểu số `number` nếu có
   - `read_punctuation`: truyền kiểu `boolean`
4. Trả về JSON chứa đầy đủ các trường mà backend Python tính toán:
   - `status`: `"ok"` | `"error"`
   - `device`: `"local_speaker"`
   - `success`: `boolean`
   - `message`: `string`
   - `length_scale`: `number`
   - `noise_scale`: `number`
   - `noise_w_scale`: `number`
5. Xử lý ngoại lệ rõ ràng:
   - Nếu `err.name === "AbortError"` $\to$ HTTP 504 `{ error: "Quá hạn xử lý phát loa cục bộ (Timeout 15s)" }`.
   - Các lỗi khác $\to$ HTTP 502 `{ error: "Lỗi kết nối đến thiết bị phát âm thanh Raspberry Pi" }`.

---

## 4. MA TRẬN ĐỐI SOÁT HỢP ĐỒNG API (API CONTRACT MATRIX)

### Bảng 1: Tham số `GET /api/dictation/tts`

| Tham số | Vị trí | Kiểu dữ liệu | Mặc định | Chuyển tiếp tới Python Core | Ghi chú Sư phạm |
|---|---|---|---|---|---|
| `text` | Query | `string` | Bắt buộc | `text` (trimmed) | Nội dung cần phát âm |
| `voice` | Query | `string` | `"vi_VN-vais1000-medium"` | `voice` | Giọng đọc Piper VITS |
| `rate` | Query | `string` | `"-15%"` | `rate` | Tốc độ sư phạm chậm 15% |
| `style` | Query | `string` | `"standard"` | `style` | `warm_story`, `standard`, `emphasis`, `question` |
| `noise_scale` | Query | `float string` | `None` (theo style) | `noise_scale` | Biến thiên âm vị (0.58 - 0.82) |
| `noise_w` | Query | `float string` | `None` (theo style) | `noise_w` | Biến thiên độ dài (0.72 - 0.92) |
| `read_punctuation` | Query | `string` / `bool` | `false` | `read_punctuation` | Đọc tên dấu: phẩy, chấm, v.v. |

### Bảng 2: Tham số `POST /api/dictation/play-local`

| Thuộc tính Body | Kiểu dữ liệu | Mặc định | Chuyển tiếp tới Python Core | Ghi chú |
|---|---|---|---|---|
| `text` | `string` | Bắt buộc | `text` | Nội dung phát ra loa lớp học |
| `voice` | `string` | `"vi_VN-vais1000-medium"` | `voice` | Giọng đọc giáo viên / Piper |
| `rate` | `string` | `"-15%"` | `rate` | Tốc độ đọc |
| `style` | `string` | `"standard"` | `style` | Phong cách biểu cảm |
| `noise_scale` | `number` | `undefined` | `noise_scale` | Tham số âm học Piper |
| `noise_w` | `number` | `undefined` | `noise_w` | Tham số âm học Piper |
| `read_punctuation` | `boolean` | `false` | `read_punctuation` | Cờ đọc tên dấu câu |

---

## 5. THIẾT KẾ TRIỂN KHAI CHO WORKER AGENT

### 5.1. File 1: `app/api/dictation/tts/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server"

// ============================================================
// GET /api/dictation/tts
// Động cơ phát âm tiếng Việt OFFLINE ĐƠN TẦNG trên Raspberry Pi (Piper VITS ONNX)
// Hỗ trợ 4 phong cách ngữ điệu sư phạm và cờ đọc tên dấu câu chính tả
// ============================================================

const VIT5_SERVICE_URL = process.env.VIT5_SERVICE_URL || "http://127.0.0.1:8000"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const text = searchParams.get("text")
    const voice = searchParams.get("voice") || "vi_VN-vais1000-medium"
    const rate = searchParams.get("rate") || searchParams.get("speed") || "-15%"
    const style = searchParams.get("style") || "standard"
    const noiseScale = searchParams.get("noise_scale")
    const noiseW = searchParams.get("noise_w")
    const readPunctuation = searchParams.get("read_punctuation")

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "Thiếu nội dung văn bản cần đọc" }, { status: 400 })
    }

    const trimmedText = text.trim()
    const params = new URLSearchParams()
    params.set("text", trimmedText)
    params.set("voice", voice)
    params.set("rate", rate)
    params.set("style", style)

    if (noiseScale !== null && noiseScale !== undefined && noiseScale.trim() !== "") {
      const parsed = parseFloat(noiseScale)
      if (!isNaN(parsed)) {
        params.set("noise_scale", parsed.toString())
      }
    }

    if (noiseW !== null && noiseW !== undefined && noiseW.trim() !== "") {
      const parsed = parseFloat(noiseW)
      if (!isNaN(parsed)) {
        params.set("noise_w", parsed.toString())
      }
    }

    if (readPunctuation !== null && readPunctuation !== undefined && readPunctuation.trim() !== "") {
      const isTruthy =
        readPunctuation.toLowerCase() === "true" ||
        readPunctuation === "1" ||
        readPunctuation.toLowerCase() === "yes"
      params.set("read_punctuation", isTruthy ? "true" : "false")
    }

    const edgeUrl = `${VIT5_SERVICE_URL}/tts?${params.toString()}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 20000)

    try {
      const edgeRes = await fetch(edgeUrl, {
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (edgeRes.ok) {
        const audioBuffer = await edgeRes.arrayBuffer()
        const contentType = edgeRes.headers.get("content-type") || "audio/wav"
        const ttsEngine = edgeRes.headers.get("x-tts-engine") || "Piper-VITS-ONNX-Offline-RPi"
        const ttsStyle = edgeRes.headers.get("x-tts-style") || style

        return new NextResponse(audioBuffer, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=86400, s-maxage=86400",
            "X-TTS-Engine": ttsEngine,
            "X-TTS-Style": ttsStyle,
            "X-Prosody-Style": ttsStyle,
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
      clearTimeout(timeoutId)
      if (err.name === "AbortError") {
        return NextResponse.json(
          { error: "Dịch vụ TTS Raspberry Pi quá hạn xử lý (Timeout 20s)" },
          { status: 504 }
        )
      }
      return NextResponse.json(
        { error: "Không thể kết nối đến trạm phát âm thanh Raspberry Pi. Vui lòng kiểm tra dịch vụ python_service." },
        { status: 503 }
      )
    }
  } catch (error) {
    console.error("[GET /api/dictation/tts]", error)
    return NextResponse.json({ error: "Lỗi tạo âm thanh TTS" }, { status: 500 })
  }
}
```

---

### 5.2. File 2: `app/api/dictation/play-local/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server"

// ============================================================
// POST /api/dictation/play-local
// Yêu cầu Raspberry Pi phát âm thanh trực tiếp ra Loa phần cứng (3.5mm AUX / USB)
// Hỗ trợ cấu hình âm học động (style, noise_scale, noise_w, read_punctuation)
// ============================================================

const VIT5_SERVICE_URL = process.env.VIT5_SERVICE_URL || "http://127.0.0.1:8000"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const {
      text,
      voice = "vi_VN-vais1000-medium",
      rate = "-15%",
      speed,
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
      voice,
      rate: rate || speed || "-15%",
      style: style || "standard",
      read_punctuation: Boolean(read_punctuation),
    }

    if (typeof noise_scale === "number") {
      payload.noise_scale = noise_scale
    } else if (typeof noise_scale === "string" && noise_scale.trim() !== "") {
      const parsed = parseFloat(noise_scale)
      if (!isNaN(parsed)) payload.noise_scale = parsed
    }

    if (typeof noise_w === "number") {
      payload.noise_w = noise_w
    } else if (typeof noise_w === "string" && noise_w.trim() !== "") {
      const parsed = parseFloat(noise_w)
      if (!isNaN(parsed)) payload.noise_w = parsed
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
      clearTimeout(timeoutId)

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
      clearTimeout(timeoutId)
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
    }
  } catch (error) {
    console.error("[POST /api/dictation/play-local]", error)
    return NextResponse.json(
      { error: "Lỗi xử lý yêu cầu phát âm thanh" },
      { status: 500 }
    )
  }
}
```

---

## 6. PHÂN TÍCH CÁC TRƯỜNG HỢP BIÊN & BẢO VỆ HỆ THỐNG (EDGE CASES)

| Tình huống biên | Đầu vào kiểm thử | Xử lý BFF dự kiến | Mã trạng thái |
|---|---|---|---|
| Văn bản rỗng hoặc toàn khoảng trắng | `text="   "` | Trả về JSON lỗi `{ error: "Thiếu nội dung văn bản cần đọc" }` trước khi gọi Python core. | 400 |
| Số thực không hợp lệ cho noise | `noise_scale="invalid_float"` | `isNaN(parsed)` bỏ qua tham số, không làm sập server; backend tự nạp preset chuẩn. | 200 |
| Cờ boolean dạng chuỗi | `read_punctuation="true"` / `"1"` | BFF chuẩn hóa thành boolean/string chuẩn `"true"`. | 200 |
| Python Service sập hoặc chưa bật | `:8000` không phản hồi | Bắt lỗi `fetch` trả về 503 kèm thông báo tiếng Việt rõ ràng, không văng 500 unhandled. | 503 |
| Thời gian tổng hợp âm thanh quá hạn | Văn bản quá dài hoặc CPU Pi bận (>20s) | `AbortController` ngắt kết nối, dọn timer, trả về HTTP 504 Timeout. | 504 |
| Parse JSON body hỏng | Body không phải JSON hợp lệ | `req.json().catch(() => ({}))` bắt an toàn, trả về 400 do thiếu `text`. | 400 |

---

## 7. KẾ HOẠCH XÁC THỰC (VERIFICATION PLAN)

Sau khi Worker hoàn thành triển khai:
1. **Kiểm tra kiểu dữ liệu TypeScript**:
   ```bash
   npx tsc --noEmit
   ```
   *Kỳ vọng*: Exit code 0, không có lỗi type error.
2. **Kiểm tra Build Next.js**:
   ```bash
   npm run build
   ```
   *Kỳ vọng*: Biên dịch thành công toàn bộ các routes.
3. **Kiểm tra API Endpoints bằng curl / Fetch**:
   - `curl -I "http://localhost:3000/api/dictation/tts?text=Xin+chao&style=warm_story&read_punctuation=true"`
     *Kỳ vọng*: HTTP 200, `Content-Type: audio/wav`, `X-TTS-Style: warm_story`.
   - `curl -X POST "http://localhost:3000/api/dictation/play-local" -H "Content-Type: application/json" -d "{\"text\":\"Xin chao\",\"style\":\"emphasis\"}"`
     *Kỳ vọng*: HTTP 200 hoặc 502/503 (nếu không có Loa/service offline) với cấu trúc JSON chuẩn.
