import { NextRequest, NextResponse } from "next/server"

// Model cố định
const GEMINI_MODEL = "gemini-3-flash-preview"
const GEMINI_BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

// Đọc danh sách API keys từ env (GEMINI_API_KEYS = key1,key2,key3,...)
// Fallback về GEMINI_API_KEY nếu chỉ có 1 key
function getApiKeys(): string[] {
  const multi = process.env.GEMINI_API_KEYS || ""
  const single = process.env.GEMINI_API_KEY || ""
  const keys = multi
    .split(",")
    .map(k => k.trim())
    .filter(k => k.length > 10)
  if (single && !keys.includes(single)) keys.push(single)
  return keys
}

// Chọn ngẫu nhiên 1 key từ danh sách
function pickRandomKey(keys: string[]): string {
  return keys[Math.floor(Math.random() * keys.length)]
}

// Gọi Gemini với key rotation — mỗi lần 503/429 sẽ thử key khác
async function callGeminiWithKeyRotation(
  keys: string[],
  body: object
): Promise<{ data: any; keyIndex: number }> {
  if (keys.length === 0) throw new Error("Không có API key nào được cấu hình")

  // Shuffle keys để random thứ tự thử
  const shuffled = [...keys].sort(() => Math.random() - 0.5)

  for (let i = 0; i < shuffled.length; i++) {
    const key = shuffled[i]
    const url = `${GEMINI_BASE_URL}?key=${key}`

    // Mỗi key thử tối đa 2 lần trước khi sang key tiếp theo
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })

        if (res.status === 503 || res.status === 429) {
          console.warn(
            `[Gemini] Key #${i + 1} trả ${res.status} (lần ${attempt}/2)` +
            (i < shuffled.length - 1 ? ` → thử key tiếp theo` : "")
          )
          if (attempt === 1) {
            await new Promise(r => setTimeout(r, 1500))
            continue // thử lại cùng key lần 2
          }
          break // sang key tiếp theo
        }

        if (!res.ok) {
          const errText = await res.text()
          console.warn(`[Gemini] Key #${i + 1} lỗi ${res.status}: ${errText}`)
          break // sang key tiếp theo ngay
        }

        const data = await res.json()
        return { data, keyIndex: i + 1 }

      } catch (err) {
        console.warn(`[Gemini] Key #${i + 1} network error (lần ${attempt}):`, err)
        if (attempt === 1) await new Promise(r => setTimeout(r, 1000))
      }
    }
  }

  throw new Error(
    `Tất cả ${shuffled.length} API key đều bận. Vui lòng thử lại sau.`
  )
}


const GRADING_PROMPT = `Bạn là giáo viên tiểu học Việt Nam chuyên chấm bài chính tả. Phân tích đoạn văn của học sinh được cung cấp, sửa lỗi chính tả và chấm điểm theo barem chuẩn. Trả về duy nhất định dạng JSON.

=== THÔNG TIN ĐẦU VÀO ===
- Khối lớp: 3
- Vùng phương ngữ: nam

=== BAREM CHẤM ĐIỂM (thang 10) ===

[A] CHÍNH TẢ & NGỮ PHÁP — Tối đa 4.0đ
Điểm khởi đầu: 4.0đ, trừ dần theo lỗi. Điểm sàn: 0đ.

Mức trừ điểm theo khối lớp:
- Lớp 1–3: trừ 0.5đ / lỗi khác nhau
- Lớp 4–5: trừ 0.25đ / lỗi khác nhau (bài dài hơn, yêu cầu khắt khe hơn về số lỗi)

Nguyên tắc đếm lỗi:
- Lỗi lặp lại hoàn toàn (cùng từ, cùng kiểu sai) → chỉ trừ 1 lần
- Cùng kiểu lỗi nhưng ở từ khác nhau → vẫn tính là lỗi riêng
- Lỗi do phương ngữ vùng miền → ghi nhận nhưng trừ điểm bình thường (không miễn)

Phân loại lỗi (error_type):
- "phu_am_dau"   : nhầm c/k/q, g/gh, ng/ngh, d/gi/r, s/x, ch/tr, l/n
- "van"          : sai phần vần: an/ang, ân/âng, iê/yê, ao/au, ươi/ơi...
- "dau_thanh"    : sai/thiếu/đặt sai vị trí dấu thanh trên nguyên âm
- "viet_hoa"     : không viết hoa đầu câu, sau dấu chấm, tên riêng người/địa danh
- "bo_sot_them"  : viết thiếu hoặc thêm chữ/tiếng so với bản gốc
- "dau_cau"      : sai dấu phẩy, dấu chấm (áp dụng từ lớp 4 trở lên)

[B] HÌNH THỨC — Tối đa 3.0đ
Chấm theo mức, không trừ từng lỗi:
- 3.0đ : Chữ viết rõ ràng, đúng độ cao, khoảng cách đều, trình bày sạch sẽ
- 2.0đ : Chữ viết tương đối rõ, một vài chỗ sai khoảng cách hoặc độ cao
- 1.0đ : Chữ khó đọc, sai nhiều về độ cao/khoảng cách, hoặc có nhiều ký tự lạ/dính chữ (nghi do OCR kém)
- 0.0đ : Không thể đọc được

Lưu ý: Nếu phát hiện nhiều ký tự lạ hoặc dính chữ bất thường → ghi nhận trong feedback, nhắc học sinh rèn chữ cẩn thận.

[C] NỘI DUNG & Ý TƯỞNG — Tối đa 2.0đ
- 2.0đ : Đủ ý, đúng chủ đề, câu văn mạch lạc, liên kết chặt chẽ
- 1.5đ : Đủ ý nhưng một vài câu chưa liên kết tốt
- 1.0đ : Thiếu ý hoặc lạc chủ đề một phần
- 0.5đ : Rất thiếu ý, phần lớn lạc chủ đề
- 0.0đ : Không xác định được nội dung

[D] SÁNG TẠO — Tối đa 1.0đ
Cộng điểm nếu có sử dụng hiệu quả (không gượng ép):
- 0.5đ : Dùng từ láy gợi hình/gợi cảm (ví dụ: "lấp lánh", "ríu rít")
- 0.5đ : Dùng phép so sánh hoặc nhân hóa (ví dụ: "Mặt trời như hòn lửa", "Cây bàng vươn tay đón nắng")
Tối đa 1.0đ dù có nhiều biện pháp.

=== QUY TẮC XẾP LOẠI ===
- 9.0 – 10.0đ : "Xuất sắc"
- 7.0 – 8.5đ  : "Tốt"
- 5.0 – 6.5đ  : "Khá"
- 3.0 – 4.5đ  : "Trung bình"
- < 3.0đ      : "Cần cố gắng"

=== ĐỊNH DẠNG OUTPUT (JSON duy nhất, không kèm markdown) ===
{
  "original_text": "văn bản gốc chưa sửa",
  "fixed_text": "văn bản đã sửa hoàn chỉnh, viết hoa đúng quy tắc",

  "corrections": [
    {
      "error": "từ/cụm viết sai trong bản gốc",
      "suggestion": "từ/cụm đúng",
      "error_type": "phu_am_dau | van | dau_thanh | viet_hoa | bo_sot_them | dau_cau",
      "is_dialect": false,
      "reason": "giải thích ngắn gọn, thân thiện với học sinh tiểu học"
    }
  ],

  "score_breakdown": {
    "chinh_ta":  { "raw": 0.0, "max": 4.0, "error_count": 0, "deduction": 0.0 },
    "hinh_thuc": { "raw": 0.0, "max": 3.0, "note": "mô tả ngắn về chữ viết" },
    "noi_dung":  { "raw": 0.0, "max": 2.0, "note": "mô tả ngắn về nội dung" },
    "sang_tao":  { "raw": 0.0, "max": 1.0, "note": "liệt kê các biện pháp nghệ thuật tìm được, hoặc 'Không có'" }
  },

  "score": "X.X/10",
  "overall_rating": "Xuất sắc | Tốt | Khá | Trung bình | Cần cố gắng",

  "feedback": "Lời nhận xét 3–5 câu: khen ưu điểm cụ thể trước, sau đó chỉ ra 1–2 điểm cần cải thiện quan trọng nhất. Dùng ngôn ngữ động viên, phù hợp lứa tuổi tiểu học."
}`

export async function POST(req: NextRequest) {
  const apiKeys = getApiKeys()

  if (apiKeys.length === 0) {
    return NextResponse.json(
      { error: "Chưa cấu hình GEMINI_API_KEY trong file .env.local" },
      { status: 500 }
    )
  }

  try {
    const { imageBase64, mimeType, studentText } = await req.json()

    // Build the parts array: either image or text
    const parts: any[] = [{ text: GRADING_PROMPT }]

    if (imageBase64) {
      // Image input via base64 - dùng ảnh gốc để chấm điểm
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "")

      parts.push({
        inline_data: {
          mime_type: mimeType || "image/jpeg",
          data: base64Data,
        },
      })
    } else if (studentText) {
      // Plain text input (typed text)
      parts.push({ text: `\n\nVăn bản của học sinh:\n${studentText}` })
    } else {
      return NextResponse.json(
        { error: "Cần cung cấp ảnh (imageBase64) hoặc văn bản (studentText)" },
        { status: 400 }
      )
    }

    const startTime = Date.now()

    const geminiBody = {
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0.1,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      },
    }

    let geminiData: any
    let keyIndex: number
    try {
      const result = await callGeminiWithKeyRotation(apiKeys, geminiBody)
      geminiData = result.data
      keyIndex = result.keyIndex
    } catch (retryErr: any) {
      return NextResponse.json(
        { error: retryErr?.message || "AI đang bận, vui lòng thử lại sau." },
        { status: 503 }
      )
    }

    const processingTimeMs = Date.now() - startTime

    const candidate = geminiData.candidates?.[0]
    const tokenCount =
      geminiData.usageMetadata?.totalTokenCount ||
      geminiData.usageMetadata?.candidatesTokenCount ||
      0
    const rawText = candidate?.content?.parts?.[0]?.text || ""

    // Parse JSON from Gemini response
    let parsed: any
    try {
      // Strip possible markdown code fences
      const cleaned = rawText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim()
      parsed = JSON.parse(cleaned)
    } catch (e) {
      console.error("Failed to parse Gemini JSON:", rawText)
      return NextResponse.json(
        { error: "Gemini trả về dữ liệu không hợp lệ. Vui lòng thử lại.", rawResponse: rawText },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ...parsed,
      processingTimeMs,
      tokenCount,
    })
  } catch (err: any) {
    console.error("Grade API error:", err)
    return NextResponse.json(
      { error: err.message || "Lỗi không xác định" },
      { status: 500 }
    )
  }
}
