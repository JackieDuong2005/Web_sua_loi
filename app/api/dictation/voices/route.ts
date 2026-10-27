import { NextRequest, NextResponse } from "next/server"

// ============================================================
// GET /api/dictation/voices
// Lấy danh sách các giọng đọc TTS Offline từ Raspberry Pi / Python Service
// ============================================================

const VIT5_SERVICE_URL = process.env.VIT5_SERVICE_URL || "http://127.0.0.1:8000"

const DEFAULT_OFFLINE_VOICES = [
  {
    id: "vi_VN-vais1000-medium",
    name: "Cô Hoài My (VITS + Zero-Phase DSP)",
    gender: "f",
    region: "Bắc",
    desc: "Nữ · Chuẩn sư phạm, lọc sạch rè kim loại bằng 5 tầng DSP",
    isOffline: true,
    recommended: true,
  },
  {
    id: "vi_VN-25hours_single-low",
    name: "Cô Trúc Ly (Light + DSP)",
    gender: "f",
    region: "Bắc",
    desc: "Nữ · Siêu nhẹ, tối ưu tài nguyên Pi",
    isOffline: true,
  },
  {
    id: "custom_teacher",
    name: "Giọng Giáo Viên (Cloned)",
    gender: "f",
    region: "Tùy biến",
    desc: "Giọng mẫu của chính giáo viên nạp qua file .onnx",
    isOffline: true,
    isCustom: true,
  },
]

export async function GET(req: NextRequest) {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2000)

    try {
      const res = await fetch(`${VIT5_SERVICE_URL}/tts/voices`, {
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.voices) && data.voices.length > 0) {
          return NextResponse.json({
            voices: data.voices,
            source: "raspberry_pi_live",
          })
        }
      }
    } catch {
      // Service offline -> dùng danh sách default
    }

    return NextResponse.json({
      voices: DEFAULT_OFFLINE_VOICES,
      source: "default_manifest",
    })
  } catch (error) {
    console.error("[GET /api/dictation/voices]", error)
    return NextResponse.json({
      voices: DEFAULT_OFFLINE_VOICES,
      source: "fallback_manifest",
    })
  }
}
