import { NextRequest, NextResponse } from "next/server"
import { GoogleGenAI } from "@google/genai"

const GEMINI_MODEL = "gemini-3.1-flash-lite"

function getApiKeys(): string[] {
  const multi = process.env.GEMINI_API_KEYS || ""
  return multi.split(",").map(k => k.trim()).filter(k => k.length > 10)
}

// Prompt OCR thuần túy — chỉ trích xuất, KHÔNG sửa lỗi
const OCR_PROMPT = `Bạn là hệ thống OCR chuyên biệt cho bài chính tả viết tay của học sinh tiểu học Việt Nam.

NHIỆM VỤ DUY NHẤT: Đọc và chép lại CHÍNH XÁC phần văn bản chính (Bài chính tả) trong ảnh.

════════════════════════════════════════
BƯỚC 1 — PHÂN TÍCH TRANG TRƯỚC KHI TRÍCH XUẤT
════════════════════════════════════════
Trước khi viết bất kỳ ký tự nào, hãy xác định thầm:
(A) Vùng LUYỆN TỪ: các từ rời rạc không thành câu ở đầu trang (vd: "oac, oăc, khoác, ngoắc...") — sẽ BỎ QUA hoàn toàn.
(B) Vùng BÀI CHÍNH: bắt đầu từ tiêu đề được viết giữa dòng, kết thúc ở cuối trang — sẽ TRÍCH XUẤT.
(C) Thể loại bài: VĂN XUÔI hay THƠ CA (xem tiêu chí bên dưới).

════════════════════════════════════════
BƯỚC 2 — NHẬN DIỆN THỂ LOẠI BÀI
════════════════════════════════════════
► VĂN XUÔI nếu:
  - Các dòng có độ dài khác nhau, dòng thường kéo sát lề phải.
  - Có thụt đầu dòng ở đầu đoạn.
  - Không có vần điệu cố định.

► THƠ CA nếu:
  - Các dòng ngắn và tương đối đều nhau.
  - Có vần điệu hoặc nhịp rõ ràng.
  - Mỗi dòng thơ kết thúc sớm hơn lề phải.

════════════════════════════════════════
BƯỚC 3 — QUY TẮC XỬ LÝ CHỮ BỊ CHỈNH SỬA
════════════════════════════════════════
▸ CHỮ BỊ GẠCH BỎ (strikethrough):
  - Dấu hiệu: đường ngang cắt qua thân chữ, khoanh tròn gạch chéo.
  - Xử lý: BỎ HOÀN TOÀN — không đưa vào kết quả.
  - Chỉ lấy từ/cụm từ cuối cùng học sinh viết lại sau khi gạch bỏ.
  - Ví dụ: "con [~~chim~~] chích bông" → "con chích bông"

▸ CHỮ VIẾT ĐÈ LÊN (overwrite):
  - Dấu hiệu: nét mực mới đè lên nét cũ, thường thấy ở dấu thanh hoặc phụ âm cuối.
  - Xử lý: đọc nét MỚI NHẤT (đậm/rõ hơn) là ký tự hợp lệ.
  - Nếu không phân biệt được nét nào mới hơn: ưu tiên nét tạo ra ký tự hợp lệ trong tiếng Việt.
  - Ví dụ: dấu hỏi đè lên dấu ngã → đọc là dấu hỏi.

▸ CHỮ ĐƯỢC CHÈN THÊM (insertion):
  - Dấu hiệu: chữ nhỏ hoặc ký hiệu "^" chèn giữa dòng.
  - Xử lý: đưa chữ chèn vào đúng vị trí trong văn bản.

════════════════════════════════════════
BƯỚC 4 — QUY TẮC ĐỊNH DẠNG ĐẦU RA
════════════════════════════════════════
► VĂN XUÔI:
  - Nối các dòng liền kề thành câu/đoạn hoàn chỉnh.
  - Chỉ xuống dòng khi có thụt đầu dòng mới (đoạn mới).
  - KHÔNG xuống dòng giữa câu chỉ vì hết dòng kẻ vở.

► THƠ CA:
  - Giữ nguyên mỗi dòng thơ như học sinh viết.
  - Xuống dòng sau mỗi dòng thơ.
  - Giữ khoảng trống giữa các khổ thơ nếu có.

► TIÊU ĐỀ:
  - Luôn đặt tiêu đề trên một dòng riêng.
  - Xuống dòng 1 lần sau tiêu đề rồi mới vào nội dung.

════════════════════════════════════════
BƯỚC 5 — NGUYÊN TẮC TUYỆT ĐỐI
════════════════════════════════════════
✗ KHÔNG tự sửa bất kỳ lỗi chính tả, dấu câu, viết hoa/thường nào.
✗ KHÔNG thêm nhận xét, giải thích, ghi chú hay ký hiệu nào ngoài văn bản.
✓ Chép nguyên văn mọi lỗi học sinh mắc phải — đây là dữ liệu đầu vào cho model sửa lỗi ở bước sau.
✓ Chỉ trả về văn bản thuần túy (plain text).

════════════════════════════════════════
VÍ DỤ ĐẦU RA ĐÚNG
════════════════════════════════════════
Ví dụ VĂN XUÔI:
  [Bỏ qua vùng luyện từ: "oac, oăc, khoác..."]
  Kết quả:
  Quạ và Công
  Một hôm, quạ rủ cộng lấy màu về áo khoắc cho đẹp. Cộng không chiu, quạ lền tự vẽ cho mình.

Ví dụ THƠ CA:
  Hạt gạo làng ta
  Có vị phù sa
  Của sông Kinh Thầy
  Có hương sen thơm`

async function callGeminiOCR(
  keys: string[],
  imageBase64: string,
  mimeType: string
): Promise<{ text: string; tokenCount: number; keyIndex: number }> {
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
          temperature: 0.05,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 4096,
        },
      })

      const text = response.text ?? ""
      const tokenCount = response.usageMetadata?.totalTokenCount || 0

      if (!text.trim()) {
        console.warn(`[OCR] Key #${i + 1} trả về rỗng → thử key tiếp`)
        continue
      }

      console.log(`[OCR] ✓ Key #${i + 1} thành công (${tokenCount} tokens, ${text.length} chars)`)
      return { text: text.trim(), tokenCount, keyIndex: i + 1 }
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

    let result: { text: string; tokenCount: number; keyIndex: number }
    try {
      result = await callGeminiOCR(keys, base64Data, mimeType || "image/jpeg")
    } catch (err: any) {
      return NextResponse.json(
        { error: err?.message || "Gemini OCR thất bại, vui lòng thử lại." },
        { status: 503 }
      )
    }

    return NextResponse.json({
      text: result.text,
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
