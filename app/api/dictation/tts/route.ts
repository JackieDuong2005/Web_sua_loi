import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// ============================================================
// GET /api/dictation/tts
// Động cơ phát âm tiếng Việt OFFLINE ĐƠN TẦNG trên Raspberry Pi (Piper VITS ONNX)
// Hỗ trợ 4 phong cách ngữ điệu sư phạm và cờ đọc tên dấu câu chính tả
// ============================================================

const VIT5_SERVICE_URL = (process.env.VIT5_SERVICE_URL || "http://127.0.0.1:8000").replace("localhost", "127.0.0.1")

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
    const timeoutId = setTimeout(() => controller.abort(), 25000)

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
          status: 200,
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
      if (err?.name === "AbortError") {
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
