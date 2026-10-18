import { NextRequest, NextResponse } from "next/server"

// ============================================================
// POST /api/dictation/play-local
// Yêu cầu Raspberry Pi phát âm thanh trực tiếp ra Loa phần cứng (3.5mm AUX / USB)
// ============================================================

const VIT5_SERVICE_URL = process.env.VIT5_SERVICE_URL || "http://127.0.0.1:8000"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { text, voice = "vi_VN-vais1000-medium", rate = "-15%" } = body

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "Thiếu nội dung văn bản" }, { status: 400 })
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    const res = await fetch(`${VIT5_SERVICE_URL}/tts/play-local`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice, rate }),
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
  } catch (error) {
    console.error("[POST /api/dictation/play-local]", error)
    return NextResponse.json(
      { error: "Lỗi kết nối đến thiết bị phát âm thanh Raspberry Pi" },
      { status: 502 }
    )
  }
}
