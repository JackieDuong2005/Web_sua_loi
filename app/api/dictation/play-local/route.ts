import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// ============================================================
// POST /api/dictation/play-local
// Yêu cầu Raspberry Pi phát âm thanh trực tiếp ra Loa phần cứng (3.5mm AUX / USB)
// Hỗ trợ cấu hình âm học động (style, noise_scale, noise_w, read_punctuation)
// ============================================================

const VIT5_SERVICE_URL = (process.env.VIT5_SERVICE_URL || "http://127.0.0.1:8000").replace("localhost", "127.0.0.1")

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
      voice: String(voice),
      rate: String(rate || speed || "-15%"),
      style: String(style || "standard"),
      read_punctuation: Boolean(read_punctuation),
    }

    if (typeof noise_scale === "number" && !isNaN(noise_scale)) {
      payload.noise_scale = noise_scale
    } else if (typeof noise_scale === "string" && noise_scale.trim() !== "") {
      const parsed = parseFloat(noise_scale)
      if (!isNaN(parsed)) payload.noise_scale = parsed
    }

    if (typeof noise_w === "number" && !isNaN(noise_w)) {
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
      if (err?.name === "AbortError") {
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
