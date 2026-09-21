import { NextRequest, NextResponse } from "next/server"
import { GoogleGenAI } from "@google/genai"
import { guardAiRoute } from "@/lib/api-guard"
import { ensureVietnameseCapitalization, formatAiErrorMessage } from "@/lib/utils"

const GEMINI_MODEL = "gemini-3.1-flash-lite"

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEYS?.split(",")[0] || ""
  return key.trim()
}

// Prompt OCR: Tối ưu cho Gemini 3.1 Flash Lite — phân biệt Thơ/Văn xuôi, chuẩn hóa viết hoa và đối soát từ 1-1
const OCR_PROMPT = `Bạn là chuyên gia OCR và giám khảo chấm chính tả Tiếng Việt Tiểu học (Bộ GD&ĐT).
Nhiệm vụ: Phân tích ảnh bài viết tay của học sinh, nhận diện chính xác từng chữ và chuẩn hóa chính tả tiếng Việt. Trả về DUY NHẤT định dạng JSON.

=== BƯỚC 1: XÁC ĐỊNH THỂ LOẠI (the_loai: "tho" | "van_xuoi") ===
- "tho": Bài thơ (4 chữ, 5 chữ, 7 chữ, lục bát...), các dòng ngắn có vần điệu, căn lề thụt sâu vào trong hoặc giữa trang, mỗi câu thơ là 1 dòng riêng biệt.
- "van_xuoi": Đoạn văn/bài văn, câu dài viết liên tục tràn hết dòng kẻ vở mới xuống dòng, có dấu chấm câu (. ? !), các dòng vật lý nối tiếp ý của nhau.

=== BƯỚC 2: NHẬN DIỆN VĂN BẢN GỐC (original_text) ===
- Ghi lại CHÍNH XÁC 100% từng nét chữ học sinh viết tay — GIỮ NGUYÊN mọi lỗi sai (sai âm đầu, vần, dấu thanh, chữ thường/hoa, thiếu chữ, thừa chữ).
- TUYỆT ĐỐI KHÔNG tự ý sửa lỗi trong "original_text".
- Bỏ qua vết gạch xóa, lem mực (chỉ lấy chữ học sinh sửa đè sau cùng); bỏ qua dòng kẻ luyện chữ ở mép đầu trang nếu có.
- Cấu trúc xuống dòng:
  + THƠ: Mỗi câu thơ trên một dòng riêng biệt.
  + VĂN XUÔI: Giữ theo đoạn văn — nối các dòng của cùng một câu/đoạn thành dòng liên tục, chỉ xuống dòng khi thụt đầu dòng sang đoạn mới.

=== BƯỚC 3: CHUẨN HÓA CHÍNH TẢ (fixed_text) ===
A. QUY TẮC VIẾT HOA THEO THỂ LOẠI:
| Trường hợp                                    | THƠ ("tho") | VĂN XUÔI ("van_xuoi") |
|-----------------------------------------------|-------------|-----------------------|
| Chữ đầu tiên của toàn bài                     | Viết hoa    | Viết hoa              |
| Chữ đầu mỗi DÒNG thơ                          | Viết hoa    | Không áp dụng         |
| Chữ sau dấu chấm ngắt câu (. ? ! ...)         | Viết hoa    | Viết hoa              |
| Chữ đầu dòng vật lý (nối tiếp câu văn xuôi)   | —           | BẮT BUỘC viết thường  |
| Tên riêng (người, địa danh)                   | Viết hoa    | Viết hoa              |
| Tiêu đề bài                                   | Viết hoa    | Viết hoa              |

B. CHUẨN HÓA LỖI CHÍNH TẢ PHỔ BIẾN:
- Phụ âm đầu: s/x, tr/ch, d/gi/r, l/n; c/k/q (k trước i/e/ê; q đi với u; c đi với các nguyên âm còn lại); g/gh, ng/ngh (gh, ngh trước i/e/ê).
- Vần & âm cuối: an/ang, ăn/ăng, ân/âng, en/eng, iên/iêng, iêu/yêu, ươn/ương, uôn/uông, ay/ai, ây/ơi; âm cuối t/c, n/ng, ch/t.
- Dấu thanh: Đặt đúng nguyên âm chính; phân biệt chuẩn hỏi/ngã, sắc/nặng, huyền/không dấu theo từ điển.
- Giữ nguyên nội dung, ý nghĩa — chỉ sửa lỗi chính tả và chuẩn hóa chữ viết hoa.

=== BƯỚC 4: RÀNG BUỘC ĐỐI SOÁT 1-1 (BẮT BUỘC) ===
- original_text và fixed_text PHẢI CÓ CÙNG SỐ LƯỢNG TỪ khi tách theo khoảng trắng (split()).
- Từ thứ N của original_text tương ứng chính xác với từ thứ N của fixed_text ở cùng vị trí index.
- fixed_text chỉ THAY THẾ từ sai bằng từ đúng — TUYỆT ĐỐI KHÔNG thêm từ mới hoặc xóa bớt từ. Nếu học sinh viết thiếu chữ, giữ nguyên không tự ý chèn thêm.
- Dấu câu gắn liền với từ đứng trước (ví dụ: "bài,", "học."), KHÔNG tách dấu câu thành từ riêng.
- original_text và fixed_text PHẢI CÓ CÙNG CẤU TRÚC XUỐNG DÒNG (số dòng bằng nhau 100%).

=== BƯỚC 5: ĐỊNH DẠNG OUTPUT (JSON DUY NHẤT) ===
{
  "the_loai": "tho hoặc van_xuoi",
  "original_text": "văn bản gốc nhận diện được từ ảnh (chưa sửa, giữ nguyên mọi lỗi)",
  "fixed_text": "văn bản đã được sửa hết toàn bộ lỗi chính tả và chuẩn hóa viết hoa đúng quy tắc 100%"
}
`

// Kiểu trả về nội bộ
interface OcrResult {
  original_text: string
  gemini_fixed_text: string
  the_loai?: string
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
        maxOutputTokens: 8192,
      },
    })

    const text = response.text ?? ""
    const tokenCount = response.usageMetadata?.totalTokenCount || 0

    let original_text = ""
    let gemini_fixed_text = ""
    let the_loai = ""

    try {
      const cleaned = text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim()
      const parsed = JSON.parse(cleaned)
      original_text = (parsed.original_text || "").trim()
      gemini_fixed_text = (parsed.fixed_text || "").trim()
      the_loai = (parsed.the_loai || "").trim().toLowerCase()
    } catch {
      original_text = text.trim()
      gemini_fixed_text = text.trim()
    }

    if (!original_text) {
      throw new Error("Không nhận diện được nội dung từ ảnh")
    }

    // Đảm bảo chữ đầu dòng và đầu câu luôn được viết hoa chuẩn mực:
    // - Với THƠ: chữ đầu mỗi dòng luôn viết hoa
    // - Với VĂN XUÔI: không ép viết hoa đầu dòng vật lý để tránh sửa nhầm từ giữa câu
    if (the_loai === "tho") {
      gemini_fixed_text = ensureVietnameseCapitalization(gemini_fixed_text)
    }

    console.log(
      `[OCR] ✓ Gemini OCR (${the_loai || "tự động"}): ${tokenCount} tokens` +
      ` | original: ${original_text.length} chars | fixed: ${gemini_fixed_text.length} chars`
    )
    return { original_text, gemini_fixed_text, the_loai, tokenCount, keyIndex: 1 }

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
        { error: formatAiErrorMessage(err) },
        { status: 503 }
      )
    }

    return NextResponse.json({
      // `text` = original_text (chưa sửa) — đây là đầu vào cho ViT5 ở bước tiếp theo
      text: result.original_text,
      // `gemini_fixed_text` — tham khảo, không đưa vào ViT5
      gemini_fixed_text: result.gemini_fixed_text,
      the_loai: result.the_loai,
      tokenCount: result.tokenCount,
      processingTimeMs: Date.now() - startTime,
    })
  } catch (err: any) {
    console.error("OCR API error:", err)
    return NextResponse.json(
      { error: formatAiErrorMessage(err) },
      { status: 500 }
    )
  }
}
