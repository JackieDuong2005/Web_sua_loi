import { NextRequest, NextResponse } from "next/server"
import { GoogleGenAI } from "@google/genai"
import { guardAiRoute } from "@/lib/api-guard"

const GEMINI_MODEL = "gemini-3.1-flash-lite"

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEYS?.split(",")[0] || ""
  return key.trim()
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
  apiKey: string,
  imageBase64: string,
  mimeType: string
): Promise<OcrResult> {
  if (!apiKey) throw new Error("Chưa cấu hình GEMINI_API_KEY")

  const client = new GoogleGenAI({ apiKey })

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

    const text = response.text ?? ""
    const tokenCount = response.usageMetadata?.totalTokenCount || 0

    let original_text = ""
    let gemini_fixed_text = ""

    try {
      const cleaned = text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim()
      const parsed = JSON.parse(cleaned)
      original_text = (parsed.original_text || "").trim()
      gemini_fixed_text = (parsed.fixed_text || "").trim()
    } catch {
      original_text = text.trim()
      gemini_fixed_text = text.trim()
    }

    if (!original_text) {
      throw new Error("Không nhận diện được nội dung từ ảnh")
    }

    console.log(
      `[OCR] ✓ Gemini OCR thành công (${tokenCount} tokens)` +
      ` | original: ${original_text.length} chars | fixed: ${gemini_fixed_text.length} chars`
    )
    return { original_text, gemini_fixed_text, tokenCount, keyIndex: 1 }

  } catch (err: any) {
    console.error("[OCR] Gemini error:", err?.message)
    throw err
  }
}

export async function POST(req: NextRequest) {
  // Rate limiting & DoS guard (Issue #12)
  const blocked = guardAiRoute(req, 30)
  if (blocked) return blocked

  const apiKey = getApiKey()

  if (!apiKey) {
    return NextResponse.json(
      { error: "Chưa cấu hình GEMINI_API_KEY trong file môi trường (.env / .env.local)" },
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
      result = await callGeminiOCR(apiKey, base64Data, mimeType || "image/jpeg")
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
