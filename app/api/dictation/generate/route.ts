import { NextRequest, NextResponse } from "next/server"
import { GoogleGenAI } from "@google/genai"
import { guardAiRoute } from "@/lib/api-guard"

const GEMINI_MODEL = "gemini-3.1-flash-lite"

function getApiKeys(): string[] {
  const raw = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || ""
  return raw
    .split(",")
    .map(k => k.trim())
    .filter(Boolean)
}

// POST /api/dictation/generate
// AI Sáng tác bài đọc chính tả theo khối lớp và chủ đề (Generative Dictation)
export async function POST(req: NextRequest) {
  // 1. Rate Limiting Guard
  const rateLimitResponse = guardAiRoute(req)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = await req.json()
    const { gradeLevel = 3, topic = "Mùa hè và thiên nhiên", sentenceCount = 4, bookSet = "KetNoi" } = body

    const keys = getApiKeys()
    if (keys.length === 0) {
      return NextResponse.json({ error: "Chưa cấu hình GEMINI_API_KEY" }, { status: 500 })
    }

    const grade = Number(gradeLevel) || 3
    const count = Number(sentenceCount) || (grade <= 2 ? 3 : grade === 3 ? 4 : 5)

    const prompt = `Bạn là chuyên gia sư phạm tiểu học Việt Nam biên soạn sách giáo khoa Tiếng Việt (Chương trình GDPT 2018).
Nhiệm vụ của bạn là sáng tác một đoạn văn bài đọc chính tả (nghe - viết) ngắn gọn, trong sáng, giàu tính giáo dục và chuẩn mực ngữ pháp cho học sinh tiểu học.

=== YÊU CẦU ĐẦU VÀO ===
- Khối lớp: Lớp ${grade}
- Chủ đề: "${topic}"
- Số lượng câu: khoảng ${count} câu
- Bộ sách tham chiếu: ${bookSet === "KetNoi" ? "Kết Nối Tri Thức" : bookSet === "CanhDieu" ? "Cánh Diều" : "Chân Trời Sáng Tạo"}

=== TIÊU CHUẨN SƯ PHẠM THEO KHỐI LỚP ===
- Lớp 1–2: Câu ngắn (15–30 từ), từ ngữ gần gũi, không dùng từ trừu tượng.
- Lớp 3: Đoạn văn 40–60 từ, miêu tả sinh động, có câu ghép đơn giản.
- Lớp 4–5: Đoạn văn 60–90 từ, dùng từ ngữ gợi cảm, từ láy, hình ảnh so sánh hoặc nhân hóa nhẹ nhàng.

=== TRÍCH XUẤT TỪ KHÓ ===
Trích xuất 3–6 từ hoặc cụm từ khó viết trong bài mà học sinh Lớp ${grade} dễ nhầm lẫn (nhầm phụ âm đầu tr/ch, s/x, d/gi/r, l/n, c/k/q hoặc vần uôn/uông, iên/iêng, dấu hỏi/ngã).

=== ĐỊNH DẠNG OUTPUT (JSON duy nhất, không thêm markdown) ===
{
  "title": "Tiêu đề bài viết thật hay và ngắn gọn",
  "content": "Toàn văn đoạn văn chính tả hoàn chỉnh, chấm phẩy chuẩn xác",
  "difficultWords": "từ khó 1, từ khó 2, từ khó 3, từ khó 4",
  "summary": "Mô tả ngắn gọn nội dung và thông điệp sư phạm"
}`

    let lastError: any = null
    let resultText = ""

    for (const apiKey of keys) {
      try {
        const client = new GoogleGenAI({ apiKey })
        const response = await client.models.generateContent({
          model: GEMINI_MODEL,
          contents: [prompt],
          config: {
            responseMimeType: "application/json",
            temperature: 0.7,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        })

        if (response.text) {
          resultText = response.text
          break
        }
      } catch (err: any) {
        lastError = err
        console.warn(`[Gemini Generate] Key failed: ${err.message || err}, trying next...`)
      }
    }

    if (!resultText) {
      throw lastError || new Error("Gemini không phản hồi")
    }

    const cleanJson = resultText.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim()
    const result = JSON.parse(cleanJson)

    return NextResponse.json({
      success: true,
      passage: {
        title: result.title || `Chính tả: ${topic}`,
        content: result.content || "",
        difficultWords: result.difficultWords || "",
        summary: result.summary || `Bài đọc chính tả Lớp ${grade} chủ đề ${topic}`,
        gradeLevel: grade,
        topic,
      },
    })
  } catch (error: any) {
    console.error("[POST /api/dictation/generate]", error)
    return NextResponse.json(
      { error: error?.message || "Không thể tạo bài đọc chính tả bằng AI" },
      { status: 500 }
    )
  }
}
