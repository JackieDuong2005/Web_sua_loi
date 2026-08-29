import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// ============================================================
// Bảng cấu hình mặc định (fallback nếu chưa có trong DB)
// ============================================================
const DEFAULT_CONFIG = {
  voiceName: "vi-VN-HoaiMyNeural",
  speedRate: "-15%",
  volume: 80,
  llmProvider: "gemini",
  llmModel: "gemini-3.1-flash-lite",
  asrProvider: "gemini",
  systemPrompt: `Bạn là Alexa, trợ lý AI đọc chính tả cho giáo viên tiểu học Việt Nam.
Quy trình 3 bước bắt buộc:
1. Hỏi giáo viên: bài đọc thuộc khối lớp mấy, chủ đề gì, gồm bao nhiêu câu?
2. Đọc chính tả từng câu rõ ràng, ngắt nghỉ 2-3 giây, nhắc nhở từ khó dễ viết sai.
3. Sau khi đọc xong toàn bộ: xác nhận và lưu bài vào hệ thống ViHand Grade.`,
  mcpEnabled: true,
  mcpEndpoint: "http://localhost:3000/api/dictation/sessions",
}

// ============================================================
// GET /api/xiaozhi/config
// Lấy cấu hình hiện tại của Xiaozhi Voice Server
// ============================================================
export async function GET() {
  try {
    // Đọc từ file config.yaml hoặc trả về default
    // (Trong production sẽ đọc từ DB hoặc file config thật)
    return NextResponse.json({ config: DEFAULT_CONFIG })
  } catch (error) {
    console.error("[GET /api/xiaozhi/config]", error)
    return NextResponse.json({ error: "Không thể lấy cấu hình" }, { status: 500 })
  }
}

// ============================================================
// PUT /api/xiaozhi/config
// Lưu cấu hình mới (giọng đọc, tốc độ, system prompt, ...)
// Body: Partial<typeof DEFAULT_CONFIG>
// ============================================================
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()

    // Validate các trường cho phép
    const ALLOWED_VOICES = [
      "vi-VN-HoaiMyNeural",
      "vi-VN-NamMinhNeural",
    ]
    if (body.voiceName && !ALLOWED_VOICES.includes(body.voiceName)) {
      return NextResponse.json({ error: "Giọng đọc không hợp lệ" }, { status: 400 })
    }

    if (body.volume !== undefined) {
      const vol = Number(body.volume)
      if (isNaN(vol) || vol < 0 || vol > 100) {
        return NextResponse.json({ error: "Âm lượng phải từ 0 đến 100" }, { status: 400 })
      }
    }

    // Ghép cấu hình mới với default
    const updatedConfig = { ...DEFAULT_CONFIG, ...body }

    // TODO: Lưu vào file config.yaml của xiaozhi-server hoặc DB key-value store
    // Hiện tại: trả về config đã merge để frontend cập nhật UI
    return NextResponse.json({ config: updatedConfig, message: "Cấu hình đã được cập nhật" })
  } catch (error) {
    console.error("[PUT /api/xiaozhi/config]", error)
    return NextResponse.json({ error: "Không thể lưu cấu hình" }, { status: 500 })
  }
}

// ============================================================
// POST /api/xiaozhi/config/heartbeat
// Xiaozhi Voice Server gửi heartbeat để xác nhận đang chạy
// Body: { serverVersion, port, uptime }
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Log heartbeat từ Voice Server (có thể lưu vào DB sau)
    console.log("[Xiaozhi Heartbeat]", {
      time: new Date().toISOString(),
      ...body,
    })

    return NextResponse.json({
      status: "ok",
      serverTime: new Date().toISOString(),
      config: DEFAULT_CONFIG,
    })
  } catch (error) {
    console.error("[POST /api/xiaozhi/config]", error)
    return NextResponse.json({ error: "Heartbeat thất bại" }, { status: 500 })
  }
}
