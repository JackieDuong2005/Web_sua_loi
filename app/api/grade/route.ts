import { NextRequest, NextResponse } from "next/server"
import { GoogleGenAI } from "@google/genai"

// ============================================================
// ENGINE CONFIG
// ============================================================
// Input: văn bản thuần túy (đã qua OCR hoặc nhập tay)
// Primary:  ViT5 Python microservice (local, free)
// Fallback: Gemini API text-only grading
const VIT5_SERVICE_URL = process.env.VIT5_SERVICE_URL || "http://localhost:8000"

// Tăng timeout Next.js lên 5 phút (mặc định 30s sẽ bị cắt đứt với bài dài)
export const maxDuration = 300
const GEMINI_MODEL = "gemini-3.1-flash-lite"

// ============================================================
// GEMINI KEY ROTATION
// ============================================================
function getApiKeys(): string[] {
  const multi = process.env.GEMINI_API_KEYS || ""
  return multi.split(",").map(k => k.trim()).filter(k => k.length > 10)
}

async function callGeminiWithKeyRotation(
  keys: string[],
  contents: any[],
): Promise<{ text: string; tokenCount: number; keyIndex: number }> {
  if (keys.length === 0) throw new Error("Không có API key nào được cấu hình")

  const shuffled = [...keys].sort(() => Math.random() - 0.5)

  for (let i = 0; i < shuffled.length; i++) {
    const key = shuffled[i]
    const client = new GoogleGenAI({ apiKey: key })

    try {
      const response = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: contents,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 8192,
        },
      })

      const text = response.text ?? ""
      const tokenCount = response.usageMetadata?.totalTokenCount || 0

      if (!text || text.trim().length === 0) {
        console.warn(`[Gemini] Key #${i + 1} trả về rỗng → thử key tiếp`)
        continue
      }

      console.log(`[Gemini] ✓ Key #${i + 1} thành công (${tokenCount} tokens, ${text.length} chars)`)
      return { text, tokenCount, keyIndex: i + 1 }
    } catch (err: any) {
      const status = err?.status || err?.httpStatusCode || 0
      const msg = err?.message || ""

      if (status === 429 || msg.includes("RESOURCE_EXHAUSTED")) {
        console.warn(`[Gemini] Key #${i + 1} hết quota → chuyển key tiếp`)
        continue
      }
      if (status === 503 || msg.includes("503")) {
        console.warn(`[Gemini] Key #${i + 1} server bận (503) → chuyển key tiếp`)
        await new Promise(r => setTimeout(r, 500))
        continue
      }
      console.warn(`[Gemini] Key #${i + 1} lỗi:`, msg)
      continue
    }
  }

  throw new Error(`Tất cả ${shuffled.length} API key đều bận/hết quota. Vui lòng thử lại sau.`)
}

// ============================================================
// GEMINI FALLBACK GRADING PROMPT (text-only)
// ============================================================
const FALLBACK_GRADING_PROMPT = `Bạn là giáo viên tiểu học Việt Nam chuyên chấm bài chính tả. Phân tích đoạn văn của học sinh được cung cấp, sửa lỗi chính tả và chấm điểm theo barem chuẩn. Trả về duy nhất định dạng JSON.

=== THÔNG TIN ĐẦU VÀO ===
- Khối lớp: 3
- Vùng phương ngữ: nam

=== BAREM CHẤM ĐIỂM (thang 10) ===

[A] CHÍNH TẢ & NGỮ PHÁP — Tối đa 4.0đ
Điểm khởi đầu: 4.0đ, trừ dần theo lỗi. Điểm sàn: 0đ.
- Lớp 1–3: trừ 0.5đ / lỗi khác nhau
Phân loại lỗi (error_type):
- "phu_am_dau"  : nhầm c/k/q, g/gh, d/gi/r, s/x, ch/tr, l/n
- "van"         : sai phần vần
- "dau_thanh"   : sai/thiếu/đặt sai vị trí dấu thanh
- "viet_hoa"    : không viết hoa đầu câu, tên riêng
- "bo_sot_them" : viết thiếu hoặc thêm chữ/tiếng
- "dau_cau"     : sai dấu phẩy, dấu chấm

[B] HÌNH THỨC — Tối đa 3.0đ
[C] NỘI DUNG — Tối đa 2.0đ
[D] SÁNG TẠO — Tối đa 1.0đ

=== QUY TẮC XẾP LOẠI ===
- 9.0–10.0đ: "Xuất sắc"
- 7.0–8.5đ : "Tốt"
- 5.0–6.5đ : "Khá"
- 3.0–4.5đ : "Trung bình"
- <3.0đ    : "Cần cố gắng"

=== ĐỊNH DẠNG OUTPUT (JSON duy nhất) ===
{
  "original_text": "văn bản gốc chưa sửa",
  "fixed_text": "văn bản đã sửa hoàn chỉnh",
  "corrections": [
    {
      "error": "từ viết sai",
      "suggestion": "từ đúng",
      "error_type": "phu_am_dau | van | dau_thanh | viet_hoa | bo_sot_them | dau_cau",
      "is_dialect": false,
      "reason": "giải thích ngắn gọn, thân thiện học sinh tiểu học"
    }
  ],
  "score_breakdown": {
    "chinh_ta":  { "raw": 0.0, "max": 4.0, "error_count": 0, "deduction": 0.0 },
    "hinh_thuc": { "raw": 0.0, "max": 3.0, "note": "mô tả ngắn" },
    "noi_dung":  { "raw": 0.0, "max": 2.0, "note": "mô tả ngắn" },
    "sang_tao":  { "raw": 0.0, "max": 1.0, "note": "liệt kê biện pháp nghệ thuật hoặc 'Không có'" }
  },
  "score": "X.X/10",
  "overall_rating": "Xuất sắc | Tốt | Khá | Trung bình | Cần cố gắng",
  "feedback": "Lời nhận xét 3–5 câu: khen ưu điểm, chỉ ra điểm cần cải thiện. Ngôn ngữ động viên, phù hợp tiểu học."
}`

// ============================================================
// ViT5 ENGINE
// ============================================================
async function gradeWithViT5(
  studentText: string,
  scoreConfig?: { hinh_thuc?: number; noi_dung?: number; penalty_per_error?: number },
  timeoutMs = 120000  // 120s — đủ để model load lần đầu (~30-60s) + inference
): Promise<{ data: any; ok: true } | { ok: false; reason: string }> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    const res = await fetch(`${VIT5_SERVICE_URL}/grade`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: studentText,
        penalty_per_error: scoreConfig?.penalty_per_error ?? 0.5,
        hinh_thuc:         scoreConfig?.hinh_thuc,
        noi_dung:          scoreConfig?.noi_dung,
      }),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) {
      const errBody = await res.text()
      return { ok: false, reason: `ViT5 service lỗi ${res.status}: ${errBody}` }
    }

    const data = await res.json()
    return { ok: true, data }
  } catch (err: any) {
    if (err?.name === "AbortError") {
      return { ok: false, reason: `ViT5 service timeout (>${timeoutMs / 1000}s)` }
    }
    return { ok: false, reason: `Không kết nối được ViT5 service: ${err?.message}` }
  }
}

// ============================================================
// MAIN HANDLER
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const { studentText, hinh_thuc, noi_dung, penalty_per_error } = await req.json()

    if (!studentText || !studentText.trim()) {
      return NextResponse.json(
        { error: "Cần cung cấp văn bản học sinh (studentText)" },
        { status: 400 }
      )
    }

    const startTime = Date.now()
    const scoreConfig = {
      hinh_thuc:         typeof hinh_thuc === "number" ? hinh_thuc : undefined,
      noi_dung:          typeof noi_dung  === "number" ? noi_dung  : undefined,
      penalty_per_error: typeof penalty_per_error === "number" ? penalty_per_error : undefined,
    }

    // === PRIMARY: ViT5 + Levenshtein (với retry 1 lần nếu model đang load) ===
    console.log("[Engine] Thử ViT5 Python service...")
    let vit5Result = await gradeWithViT5(studentText, scoreConfig, 120000)

    // Nếu lần đầu bị timeout (model đang load), đợi 10s rồi thử lại 1 lần
    if (!vit5Result.ok && vit5Result.reason.includes("timeout")) {
      console.warn(`[Engine] ⏳ ViT5 timeout lần 1 (có thể đang tải model) — thử lại sau 10s...`)
      await new Promise(r => setTimeout(r, 10000))
      vit5Result = await gradeWithViT5(studentText, scoreConfig, 120000)
    }

    if (vit5Result.ok) {
      console.log(`[Engine] ✅ ViT5 thành công | Điểm: ${vit5Result.data.score}`)
      return NextResponse.json({
        ...vit5Result.data,
        engine: "vit5+levenshtein",
      })
    }

    // === FALLBACK: Gemini text-only grading ===
    console.warn(`[Engine] ⚠️ ViT5 không khả dụng sau 2 lần thử: ${vit5Result.reason}`)
    console.log("[Engine] 🔄 Fallback sang Gemini text grading...")

    const apiKeys = getApiKeys()
    if (apiKeys.length === 0) {
      return NextResponse.json(
        { error: `ViT5 service không khả dụng (${vit5Result.reason}) và chưa cấu hình GEMINI_API_KEYS.` },
        { status: 503 }
      )
    }

    const contents: any[] = [
      `\n\nVăn bản của học sinh:\n${studentText}`,
      FALLBACK_GRADING_PROMPT,
    ]

    let geminiResult: { text: string; tokenCount: number; keyIndex: number }
    try {
      geminiResult = await callGeminiWithKeyRotation(apiKeys, contents)
    } catch (retryErr: any) {
      return NextResponse.json(
        { error: retryErr?.message || "AI đang bận, vui lòng thử lại sau." },
        { status: 503 }
      )
    }

    // Parse Gemini JSON
    let parsed: any
    try {
      const cleaned = geminiResult.text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim()
      parsed = JSON.parse(cleaned)
    } catch (e) {
      console.error("[Gemini] JSON parse thất bại:", geminiResult.text.substring(0, 300))
      return NextResponse.json(
        { error: "Gemini trả về dữ liệu không hợp lệ. Vui lòng thử lại." },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ...parsed,
      processingTimeMs: Date.now() - startTime,
      tokenCount: geminiResult.tokenCount,
      engine: "gemini-fallback",
    })
  } catch (err: any) {
    console.error("Grade API error:", err)
    return NextResponse.json(
      { error: err.message || "Lỗi không xác định" },
      { status: 500 }
    )
  }
}
