import { NextRequest, NextResponse } from "next/server"

// ============================================================
// GET /api/dictation/tts?text=...&voice=vi-VN-HoaiMyNeural&rate=-15%
// Động cơ phát âm tiếng Việt chất lượng cao (Edge-TTS Neural Voice)
// Tự động fallback về Google Translate TTS khi Python microservice offline
// ============================================================

const VIT5_SERVICE_URL = process.env.VIT5_SERVICE_URL || "http://127.0.0.1:8000"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const text = searchParams.get("text")
    const voice = searchParams.get("voice") || "vi-VN-HoaiMyNeural"
    const rate = searchParams.get("rate") || "-15%"
    const lang = searchParams.get("lang") || "vi"

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "Thiếu nội dung văn bản" }, { status: 400 })
    }

    const trimmedText = text.trim()

    // 1. Nếu người dùng chọn đích danh Google TTS
    if (voice === "google_tts") {
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(lang)}&client=tw-ob&q=${encodeURIComponent(trimmedText)}`
      const googleRes = await fetch(ttsUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      })

      if (googleRes.ok) {
        const audioBuffer = await googleRes.arrayBuffer()
        return new NextResponse(audioBuffer, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "public, max-age=86400, s-maxage=86400",
            "X-TTS-Engine": "Google-Translate-Direct",
          },
        })
      }
    }

    // 2. Thử gọi Edge-TTS từ Python microservice (Giọng chuẩn Hoài My / Nam Minh truyền cảm)
    try {
      const edgeUrl = `${VIT5_SERVICE_URL}/tts?text=${encodeURIComponent(trimmedText)}&voice=${encodeURIComponent(voice)}&rate=${encodeURIComponent(rate)}`
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const edgeRes = await fetch(edgeUrl, {
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (edgeRes.ok) {
        const audioBuffer = await edgeRes.arrayBuffer()
        return new NextResponse(audioBuffer, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "public, max-age=86400, s-maxage=86400",
            "X-TTS-Engine": "Edge-TTS-Neural",
          },
        })
      }
    } catch {
      // Python microservice không khả dụng -> chuyển sang Fallback
    }

    // 3. Fallback: Google Translate TTS
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(lang)}&client=tw-ob&q=${encodeURIComponent(trimmedText)}`
    const fallbackRes = await fetch(ttsUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    })

    if (!fallbackRes.ok) {
      return NextResponse.json({ error: "Không thể tạo luồng âm thanh" }, { status: 502 })
    }

    const fallbackBuffer = await fallbackRes.arrayBuffer()
    return new NextResponse(fallbackBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
        "X-TTS-Engine": "Google-Translate-Fallback",
      },
    })
  } catch (error) {
    console.error("[GET /api/dictation/tts]", error)
    return NextResponse.json({ error: "Lỗi tạo âm thanh TTS" }, { status: 500 })
  }
}
