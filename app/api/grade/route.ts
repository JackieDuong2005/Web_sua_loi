import { NextRequest, NextResponse } from "next/server"

// Model đang dùng trong Colab (gemini-3-flash-preview)
const GEMINI_MODEL = "gemini-3-flash-preview"
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const GRADING_PROMPT = `Phân tích đoạn văn của học sinh tiểu học được cung cấp. Thực hiện sửa lỗi chính tả, chấm điểm theo barem cụ thể và trả về kết quả dưới định dạng JSON duy nhất.

Rules & Rubric (Quy tắc & Barem điểm):
Hãy chấm trên thang điểm 10 với các tiêu chí sau:

Chính tả & Ngữ pháp (Tối đa 4.0đ):

Trừ 0.5đ cho mỗi lỗi chính tả khác nhau (lỗi trùng lặp chỉ trừ 1 lần).

Các loại lỗi: Nhầm l/n, s/x, tr/ch, d/gi/r, vần (an/ang, iê/yê...), dấu thanh, không viết hoa đầu câu/tên riêng.

Hình thức (Tối đa 3.0đ): - Nếu văn bản có nhiều ký tự lạ hoặc lỗi dính chữ (thường do OCR), hãy nhắc nhở học sinh rèn chữ cẩn thận.

Nội dung & Ý tưởng (Tối đa 2.0đ): - Đánh giá xem câu văn có đủ ý, đúng chủ đề và mạch lạc không.

Sáng tạo (Tối đa 1.0đ): - Cộng điểm nếu dùng từ láy, phép so sánh hoặc nhân hóa (Ví dụ: "Mặt trời như hòn lửa").

Trả về duy nhất định dạng JSON sau (không thêm bất kỳ text hay markdown nào bên ngoài JSON):
{
  "fixed_text": "văn bản đã được sửa lỗi hoàn chỉnh và viết hoa đúng quy tắc",
  "original_text": "văn bản gốc chưa sửa",
  "corrections": [
    {
      "error": "từ viết sai",
      "suggestion": "từ đúng",
      "reason": "lý do sai (ví dụ: nhầm lẫn tr/ch, thiếu dấu thanh, quên viết hoa)"
    }
  ],
  "score": "X.X/10",
  "feedback": "lời nhận xét chi tiết, khen ngợi ưu điểm trước khi nhắc nhở khuyết điểm",
  "overall_rating": "Tốt / Khá / Trung bình / Cần cố gắng"
}`

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey || apiKey === "your_gemini_api_key_here") {
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
      // Image input via base64 - dùng ảnh gốc để chấm điểm (không qua tiền xử lý)
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

    const geminiRes = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature: 0.1,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 8192,
        },
      }),
    })

    const processingTimeMs = Date.now() - startTime

    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      console.error("Gemini API error:", errText)
      return NextResponse.json(
        { error: `Lỗi Gemini API: ${geminiRes.status} - ${errText}` },
        { status: geminiRes.status }
      )
    }

    const geminiData = await geminiRes.json()

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
