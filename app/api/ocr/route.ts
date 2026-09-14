import { NextRequest, NextResponse } from "next/server"
import { GoogleGenAI } from "@google/genai"
import { guardAiRoute } from "@/lib/api-guard"
import { ensureVietnameseCapitalization } from "@/lib/utils"

const GEMINI_MODEL = "gemini-3.1-flash-lite"

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEYS?.split(",")[0] || ""
  return key.trim()
}

// Prompt OCR kết hợp: nhận diện chính xác VÀ sửa lỗi toàn diện theo chuẩn Tiếng Việt Tiểu học
const OCR_PROMPT = `Bạn là giáo viên tiểu học Việt Nam chuyên gia về chấm và sửa bài chính tả tiếng Việt. Phân tích đoạn văn hoặc bài thơ viết tay của học sinh trong ảnh, nhận diện chính xác từng chữ viết và sửa lại toàn diện theo chuẩn chính tả tiếng Việt của Bộ Giáo dục và Đào tạo. Trả về duy nhất định dạng JSON.

=== 1. QUY TẮC NHẬN DIỆN VĂN BẢN GỐC (original_text) ===
- Ghi lại CHÍNH XÁC 100% từng nét chữ học sinh viết tay — giữ nguyên mọi lỗi sai (sai âm đầu, vần, dấu thanh, viết thường/hoa, thiếu chữ, thừa chữ).
- TUYỆT ĐỐI KHÔNG tự ý sửa lỗi, KHÔNG thêm bớt từ trong "original_text".
- Bỏ qua các vết gạch xóa, chữ lem mực bị viết đè (chỉ lấy chữ học sinh sửa lại sau cùng).
- Bỏ qua các dòng luyện chữ rời rạc ở đầu trang (nếu có).
- Giữ đúng cấu trúc xuống dòng:
  + Thơ: Mỗi câu thơ trên một dòng riêng biệt.
  + Văn xuôi: Nối các dòng của cùng một câu/đoạn, chỉ xuống dòng khi thụt đầu dòng sang đoạn mới.

=== 2. QUY TẮC SỬA LỖI TOÀN DIỆN (fixed_text) ===
Bản "fixed_text" là bài chuẩn mực 100%, phải sửa triệt để tất cả các lỗi sau:

A. QUY TẮC VIẾT HOA ĐẦU CÂU & ĐẦU DÒNG THƠ (BẮT BUỘC):
- ĐẦU DÒNG THƠ: BẮT BUỘC viết hoa chữ cái đầu tiên của TẤT CẢ các dòng thơ (kể cả khi học sinh viết chữ thường hoặc dòng trước không có dấu chấm).
  Ví dụ:
  + Học sinh viết: "su bé ngủ xay" -> Sửa thành: "Ru bé ngủ say" (viết hoa chữ 'Ru')
  + Học sinh viết: "thay cho só xời" -> Sửa thành: "Thay cho gió trời" (viết hoa chữ 'Thay')
- ĐẦU CÂU VĂN XUÔI: BẮT BUỘC viết hoa chữ cái đầu đoạn văn và chữ cái đầu tiên ngay sau dấu chấm (.), dấu chấm hỏi (?), dấu chấm than (!), dấu chấm lửng (...).
- TÊN RIÊNG: BẮT BUỘC viết hoa chữ cái đầu của tất cả các tiếng tạo thành tên người, địa danh (VD: "Việt Nam", "Bác Hồ", "Hà Nội").
- TIÊU ĐỀ BÀI VIẾT: BẮT BUỘC viết hoa chữ cái đầu tiên của tiêu đề.

B. SỬA LỖI PHỤ ÂM ĐẦU:
- Phân biệt s/x (sắp xếp, xứ sở, say sưa / xôn xao, xinh xắn).
- Phân biệt tr/ch (trời, trưa, trong trẻo / chăm chỉ, chân thành).
- Phân biệt d/gi/r (gió, giáo viên / da thịt, dịu dàng / ra vào, ru ngủ).
- Phân biệt c/k/q (k đứng trước i/e/ê; q luôn đi với u; c đi với a/o/u/ô/ơ/ă/â).
- Phân biệt g/gh, ng/ngh (gh, ngh đứng trước i/e/ê).
- Phân biệt l/n (lúa non, năm tháng, lo lắng).

C. SỬA LỖI VẦN & ÂM CUỐI:
- Phân biệt an/ang, ăn/ăng, ân/âng, en/eng, in/ing.
- Phân biệt iên/iêng, iêu/yêu, ươn/ương, uôn/uông.
- Phân biệt âm cuối t/c (mắt/mắc, quạt/quạc, bột/bộc), n/ng, ch/t.
- Phân biệt ay/ai, ây/ơi, ươu/ưu.

D. SỬA LỖI DẤU THANH:
- Phân biệt dấu hỏi (?) và dấu ngã (~) (VD: bẻ/bẽ, vẽ/vẻ, nghĩ/nghỉ, ngã/ngả, oi ả).
- Phân biệt dấu sắc và dấu nặng, dấu huyền và không dấu.
- Đặt dấu thanh đúng nguyên âm chính theo quy tắc chính tả hiện hành.

E. GIỮ NGUYÊN NỘI DUNG VÀ Ý NGHĨA:
- Giữ nguyên cấu trúc dòng, câu chữ và ý thơ/văn của học sinh; chỉ chuẩn hóa lỗi chính tả và chữ viết hoa.

=== 3. ĐỊNH DẠNG OUTPUT (JSON duy nhất, không kèm markdown) ===
{
  "original_text": "văn bản gốc nhận diện được từ ảnh (chưa sửa)",
  "fixed_text": "văn bản đã được sửa hết toàn bộ lỗi chính tả và chuẩn hóa viết hoa đúng quy tắc 100%"
}
`

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

    // Đảm bảo chữ đầu dòng (thơ) và đầu câu luôn được viết hoa chuẩn mực
    gemini_fixed_text = ensureVietnameseCapitalization(gemini_fixed_text)

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
