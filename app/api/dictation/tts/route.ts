import { NextRequest, NextResponse } from "next/server"

// ============================================================
// GET /api/dictation/tts?text=...&voice=vi_VN-vais1000-medium&rate=-15%
// Động cơ phát âm tiếng Việt OFFLINE ĐƠN TẦNG trên Raspberry Pi (Piper VITS ONNX)
// Không dùng bên thứ ba, không Google fallback, vận hành 100% nội bộ
// ============================================================

const VIT5_SERVICE_URL = process.env.VIT5_SERVICE_URL || "http://127.0.0.1:8000"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const text = searchParams.get("text")
    const voice = searchParams.get("voice") || "vi_VN-vais1000-medium"
    const rate = searchParams.get("rate") || "-15%"

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "Thiếu nội dung văn bản cần đọc" }, { status: 400 })
    }

    const trimmedText = text.trim()
    const edgeUrl = `${VIT5_SERVICE_URL}/tts?text=${encodeURIComponent(trimmedText)}&voice=${encodeURIComponent(voice)}&rate=${encodeURIComponent(rate)}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    try {
      const edgeRes = await fetch(edgeUrl, {
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (edgeRes.ok) {
        const audioBuffer = await edgeRes.arrayBuffer()
        const contentType = edgeRes.headers.get("content-type") || "audio/wav"

        return new NextResponse(audioBuffer, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=86400, s-maxage=86400",
            "X-TTS-Engine": "Piper-VITS-ONNX-Offline-RPi",
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
    }
  } catch (error) {
    console.error("[GET /api/dictation/tts]", error)
    return NextResponse.json({ error: "Lỗi tạo âm thanh TTS" }, { status: 500 })
  }
}
