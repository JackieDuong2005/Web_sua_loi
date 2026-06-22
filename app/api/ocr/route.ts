import { NextRequest, NextResponse } from "next/server"
import { GoogleGenAI } from "@google/genai"

const GEMINI_MODEL = "gemini-3.1-flash-lite"

function getApiKeys(): string[] {
  const multi = process.env.GEMINI_API_KEYS || ""
  return multi.split(",").map(k => k.trim()).filter(k => k.length > 10)
}

// Prompt OCR kết hợp: nhận diện chính xác VÀ trả về bản đã sửa dưới dạng JSON
// Pipeline sẽ chỉ dùng original_text để đưa vào ViT5; fixed_text là tham khảo từ Gemini
const OCR_PROMPT = `Bạn là giáo viên tiểu học Việt Nam chuyên sửa bài chính tả. Phân tích đoạn văn của học sinh được cung cấp trong ảnh, nhận diện chữ viết và sửa lại cho đúng chính tả. Trả về duy nhất định dạng JSON.

=== QUY TẮC NHẬN DIỆN (original_text) ===
1. Ghi lại CHÍNH XÁC từng chữ viết tay — KHÔNG tự sửa lỗi, KHÔNG bịa thêm nội dung.
2. Nếu có chữ bị gạch bỏ hoặc lem mực không đọc được, BỎ QUA phần đó, chỉ lấy chữ người viết đã sửa.
3. Giữ nguyên cấu trúc xuống dòng:
   - Văn xuôi: nối các dòng thành đoạn văn, chỉ xuống dòng khi người viết thụt lề bắt đầu đoạn mới.
   - Thơ: giữ nguyên từng câu thơ riêng dòng.
4. Nếu đầu trang có chữ luyện viết rời rạc (VD: "oac, ngoắc..."), BỎ QUA, chỉ bắt đầu từ tiêu đề bài viết.

=== QUY TẮC SỬA LỖI (fixed_text) ===
- Sửa đúng chính tả tiếng Việt: dấu thanh, phụ âm đầu (c/k/q, g/gh, d/gi/r, s/x, ch/tr, l/n), vần.
- Viết hoa đầu câu và tên riêng đúng quy tắc.
- Giữ nguyên cấu trúc dòng, ý nghĩa và nội dung của học sinh.

=== ĐỊNH DẠNG OUTPUT (JSON duy nhất, không kèm markdown) ===
{
  "original_text": "văn bản gốc nhận diện được từ ảnh (chưa sửa)",
  "fixed_text": "văn bản đã được sửa hết lỗi chính tả và viết hoa đúng quy tắc"
}`

// Kiểu trả về nội bộ
interface OcrResult {
  original_text: string
  gemini_fixed_text: string
  tokenCount: number
  keyIndex: number
}

async function callGeminiOCR(
  keys: string[],
  imageBase64: string,
  mimeType: string
): Promise<OcrResult> {
  const shuffled = [...keys].sort(() => Math.random() - 0.5)

  for (let i = 0; i < shuffled.length; i++) {
    const key = shuffled[i]
    const client = new GoogleGenAI({ apiKey: key })

    try {
      const response = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          { inlineData: { mimeType, data: imageBase64 } },
          OCR_PROMPT,
        ],
        config: {
          responseMimeType: "application/json",
          temperature: 0.05,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 4096,
        },
      })

      const rawText = response.text ?? ""
      const tokenCount = response.usageMetadata?.totalTokenCount || 0

      if (!rawText.trim()) {
        console.warn(`[OCR] Key #${i + 1} trả về rỗng → thử key tiếp`)
        continue
      }

      // Parse JSON từ Gemini
      let parsed: { original_text?: string; fixed_text?: string }
      try {
        const cleaned = rawText
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/```\s*$/i, "")
          .trim()
        parsed = JSON.parse(cleaned)
      } catch (parseErr) {
        console.warn(`[OCR] Key #${i + 1} JSON parse lỗi → thử key tiếp`, rawText.substring(0, 200))
        continue
      }

      const original_text = (parsed.original_text ?? "").trim()
      const gemini_fixed_text = (parsed.fixed_text ?? "").trim()

      if (!original_text) {
        console.warn(`[OCR] Key #${i + 1} original_text rỗng → thử key tiếp`)
        continue
      }

      console.log(
        `[OCR] ✓ Key #${i + 1} thành công (${tokenCount} tokens)` +
        ` | original: ${original_text.length} chars | fixed: ${gemini_fixed_text.length} chars`
      )
      return { original_text, gemini_fixed_text, tokenCount, keyIndex: i + 1 }

    } catch (err: any) {
      const status = err?.status || 0
      const msg = err?.message || ""

      if (status === 429 || msg.includes("RESOURCE_EXHAUSTED")) {
        console.warn(`[OCR] Key #${i + 1} hết quota → thử tiếp`)
        continue
      }
      console.warn(`[OCR] Key #${i + 1} lỗi:`, JSON.stringify({ code: status, message: msg }))
      continue
    }
  }

  throw new Error("Tất cả API key đều lỗi hoặc hết quota. Vui lòng thử lại sau.")
}

export async function POST(req: NextRequest) {
  const keys = getApiKeys()

  if (keys.length === 0) {
    return NextResponse.json(
      { error: "Chưa cấu hình GEMINI_API_KEYS trong .env.local" },
      { status: 500 }
    )
  }

  try {
    const { imageBase64, mimeType } = await req.json()

    if (!imageBase64) {
      return NextResponse.json(
        { error: "Cần cung cấp ảnh (imageBase64)" },
        { status: 400 }
      )
    }

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "")
    const startTime = Date.now()

    let result: OcrResult
    try {
      result = await callGeminiOCR(keys, base64Data, mimeType || "image/jpeg")
    } catch (err: any) {
      return NextResponse.json(
        { error: err?.message || "Gemini OCR thất bại, vui lòng thử lại." },
        { status: 503 }
      )
    }

    return NextResponse.json({
      // `text` = original_text (chưa sửa) — đây là đầu vào cho ViT5 ở bước tiếp theo
      text: result.original_text,
      // `gemini_fixed_text` — tham khảo, không đưa vào ViT5
      gemini_fixed_text: result.gemini_fixed_text,
      tokenCount: result.tokenCount,
      processingTimeMs: Date.now() - startTime,
    })
  } catch (err: any) {
    console.error("OCR API error:", err)
    return NextResponse.json(
      { error: err.message || "Lỗi không xác định" },
      { status: 500 }
    )
  }
}
