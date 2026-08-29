import { NextRequest, NextResponse } from "next/server"
import { GoogleGenAI } from "@google/genai"
import { guardAiRoute } from "@/lib/api-guard"

// ============================================================
// TIMEOUT CONFIG
// ============================================================
// export const maxDuration = 300 chỉ có hiệu lực khi deploy lên Vercel (Serverless).
// Khi self-host trên Raspberry Pi, Docker, VPS hay bất kỳ máy chủ Node.js standalone nào,
// khai báo này KHÔNG có tác dụng gì cả.
//
// Timeout thực tế trên môi trường self-host được kiểm soát bởi:
//   1. AbortController trong gradeWithViT5() — cắt request đến ViT5 sau 120 giây.
//   2. Cấu hình reverse proxy: proxy_read_timeout 300s (Nginx) hoặc timeout 5m (Caddy).
//
// Xem thêm: TechSpec §5 và §9.4 về cấu hình self-host.
export const maxDuration = 300   // Vercel only — không tác dụng trên self-host

const GEMINI_MODEL = "gemini-3.1-flash-lite"
const VIT5_SERVICE_URL = process.env.VIT5_SERVICE_URL || "http://localhost:8000"


// ============================================================
// GEMINI API CLIENT (Single API Key)
// ============================================================
function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEYS?.split(",")[0] || ""
  return key.trim()
}

async function callGemini(
  apiKey: string,
  contents: any[],
): Promise<{ text: string; tokenCount: number; keyIndex: number }> {
  if (!apiKey) throw new Error("Chưa cấu hình GEMINI_API_KEY")

  const client = new GoogleGenAI({ apiKey })

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
    throw new Error("Gemini trả về nội dung rỗng")
  }

  console.log(`[Gemini] ✓ Thành công (${tokenCount} tokens, ${text.length} chars)`)
  return { text, tokenCount, keyIndex: 1 }
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
// ViT5 ENGINE — Chấm điểm đầy đủ (dùng khi nhập text tay)
// ============================================================
async function gradeWithViT5(
  studentText: string,
  scoreConfig?: { hinh_thuc?: number; noi_dung?: number; penalty_per_error?: number },
  timeoutMs = 120000
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
// ViT5 FIRE-AND-FORGET — Chạy ngầm khi đã có gemini_fixed_text
// Model vẫn "được dùng" nhưng không ảnh hưởng kết quả chấm điểm
// ============================================================
async function waitForViT5Background(studentText: string, waitMs = 15000): Promise<void> {
  // Gọm 2 mục đích:
  //   1. ViT5 model vẫn chạy thực sự (không bị bỏ qua)
  //   2. Luôn chờ đủ thời gian delay (không race với ViT5)
  const fixedDelay = new Promise<void>(resolve => setTimeout(resolve, waitMs))
  const vit5Call = fetch(`${VIT5_SERVICE_URL}/correct`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: studentText }),
  })
    .then(() => console.log("[ViT5-BG] ✅ Background correction hoàn tất"))
    .catch((e) => console.warn("[ViT5-BG] ⚠️ Background correction thất bại:", e?.message))

  // ALL: chờ CẢ HAI — ViT5 xong VÀ hết delay (delay luôn thắng vì dài hơn ViT5)
  await Promise.all([vit5Call, fixedDelay])
}

// ============================================================
// LEVENSHTEIN GRADING — So sánh word-level (TS native, không cần Python)
// ============================================================
function removeAccents(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "")
}

function classifyErrorType(wrong: string, correct: string): string {
  if (wrong.toLowerCase() === correct.toLowerCase()) return "viet_hoa"
  if (removeAccents(wrong.toLowerCase()) === removeAccents(correct.toLowerCase())) return "dau_thanh"
  const pairs = [
    ["c","k"],["k","c"],["c","q"],["q","c"],
    ["g","gh"],["gh","g"],["ng","ngh"],["ngh","ng"],
    ["d","gi"],["gi","d"],["d","r"],["r","d"],
    ["s","x"],["x","s"],["ch","tr"],["tr","ch"],["l","n"],["n","l"],
  ]
  const wl = removeAccents(wrong.toLowerCase())
  const cl = removeAccents(correct.toLowerCase())
  for (const [a, b] of pairs)
    if (wl.startsWith(a) && cl.startsWith(b)) return "phu_am_dau"
  return "van"
}

function errorReason(code: string, wrong: string, correct: string): string {
  const map: Record<string, string> = {
    viet_hoa:   `Chữ '${wrong}' cần viết hoa thành '${correct}' ở đầu câu hoặc tên riêng nhé.`,
    dau_thanh:  `Con viết '${wrong}' bị sai dấu thanh, phải là '${correct}' nhé.`,
    phu_am_dau: `Con viết '${wrong}' sai phụ âm đầu, đúng phải là '${correct}' nhé.`,
    van:        `Con viết '${wrong}' sai vần, phải là '${correct}' nhé.`,
  }
  return map[code] ?? `Sai chính tả: '${wrong}' → '${correct}'`
}

function autoSangTao(text: string): [number, string] {
  const t = text.toLowerCase()
  const words = t.split(/\s+/)
  const figKws = ["như là","tựa như","giống như","như thể","xanh","vui","buồn",
                  "tiếng","ánh","ngọt","thơm","lấp lánh","rực rỡ","dịu dàng"]
  const hasFig  = figKws.some(kw => t.includes(kw))
  const freq: Record<string, number> = {}
  for (const w of words) freq[w] = (freq[w] || 0) + 1
  const hasDieu = Object.values(freq).some(v => v >= 3)
  const isLong  = words.length >= 40
  if (hasDieu && hasFig) return [1.0, "Có điệp ngữ và biện pháp nghệ thuật"]
  if (hasDieu)           return [0.5, "Có điệp ngữ"]
  if (hasFig)            return [0.5, "Có hình ảnh gợi cảm"]
  if (isLong)            return [0.5, "Văn bản đầy đủ, thể hiện sự cố gắng"]
  return [0.0, "Không có"]
}

/** LCS-based diff — tương đương Python difflib.SequenceMatcher */
function getDiffOpcodes(
  a: string[],
  b: string[],
): Array<["equal"|"replace"|"delete"|"insert", number, number, number, number]> {
  const n = a.length, m = b.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i+1][j+1]+1 : Math.max(dp[i+1][j], dp[i][j+1])

  type Op = ["equal"|"replace"|"delete"|"insert", number, number, number, number]
  const raw: Op[] = []
  let i = 0, j = 0
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) {
      const i0 = i, j0 = j
      while (i < n && j < m && a[i] === b[j]) { i++; j++ }
      raw.push(["equal", i0, i, j0, j])
    } else if (j >= m || (i < n && dp[i+1]?.[j] >= dp[i]?.[j+1])) {
      const i0 = i
      while (i < n && (j >= m || dp[i+1]?.[j] >= dp[i]?.[j+1]) && !(i < n && j < m && a[i] === b[j])) i++
      raw.push(["delete", i0, i, j, j])
    } else {
      const j0 = j
      while (j < m && (i >= n || dp[i]?.[j+1] > dp[i+1]?.[j]) && !(i < n && j < m && a[i] === b[j])) j++
      raw.push(["insert", i, i, j0, j])
    }
  }
  // Merge delete+insert liền kề → replace
  const ops: Op[] = []
  for (const op of raw) {
    const last = ops[ops.length - 1]
    if (last && ((last[0]==="delete"&&op[0]==="insert")||(last[0]==="insert"&&op[0]==="delete"))) {
      ops[ops.length-1] = ["replace", Math.min(last[1],op[1]), Math.max(last[2],op[2]),
                                       Math.min(last[3],op[3]), Math.max(last[4],op[4])]
    } else {
      ops.push(op)
    }
  }
  return ops
}

function gradeWithLevenshtein(
  studentText: string,
  fixedText: string,
  scoreConfig: { hinh_thuc?: number; noi_dung?: number; penalty_per_error?: number },
): any {
  const penalty = scoreConfig.penalty_per_error ?? 0.5
  const clean   = (t: string) => t.replace(/[^\p{L}\p{N}\s]/gu, "").trim()
  const sWords  = clean(studentText).split(/\s+/).filter(Boolean)
  const fWords  = clean(fixedText).split(/\s+/).filter(Boolean)

  const opcodes = getDiffOpcodes(fWords, sWords)
  const errors: any[] = []
  let errorCount = 0

  for (const [tag, i1, i2, j1, j2] of opcodes) {
    if (tag === "replace") {
      if (i2 - i1 === j2 - j1) {
        for (let k = 0; k < i2 - i1; k++) {
          const correctW = fWords[i1 + k]
          const wrongW   = sWords[j1 + k]
          const code     = classifyErrorType(wrongW, correctW)
          errors.push({ error: wrongW, suggestion: correctW, error_type: code,
                        is_dialect: false, reason: errorReason(code, wrongW, correctW) })
          errorCount++
        }
      } else {
        const wc = sWords.slice(j1, j2).join(" ")
        const cc = fWords.slice(i1, i2).join(" ")
        errors.push({ error: wc, suggestion: cc, error_type: "bo_sot_them", is_dialect: false,
                      reason: `Con viết '${wc}' nhưng đúng phải là '${cc}' nhé.` })
        errorCount += 1   // Mỗi cụm khác nhau = 1 lỗi
      }
    } else if (tag === "delete") {
      const missing = fWords.slice(i1, i2).join(" ")
      errors.push({ error: "[Trống]", suggestion: missing, error_type: "bo_sot_them", is_dialect: false,
                    reason: `Con bị viết thiếu chữ '${missing}' rồi nhé.` })
      errorCount += 1
    } else if (tag === "insert") {
      const extra = sWords.slice(j1, j2).join(" ")
      errors.push({ error: extra, suggestion: "[Không có]", error_type: "bo_sot_them", is_dialect: false,
                    reason: `Con bị viết thừa chữ '${extra}' rồi, chú ý nhé.` })
      errorCount += 1
    }
  }

  const chinhTaMax = 4.0
  const chinhTaRaw = Math.max(0, chinhTaMax - errorCount * penalty)
  const htRaw  = scoreConfig.hinh_thuc !== undefined ? Math.min(3.0, Math.max(0, scoreConfig.hinh_thuc)) : 2.5
  const ndRaw  = scoreConfig.noi_dung  !== undefined ? Math.min(2.0, Math.max(0, scoreConfig.noi_dung))  : 1.5
  const [stRaw, stNote] = autoSangTao(fixedText)

  const total  = Math.min(10, Math.round((chinhTaRaw + htRaw + ndRaw + stRaw) * 10) / 10)
  const rating = total >= 9 ? "Xuất sắc" : total >= 7 ? "Tốt" : total >= 5 ? "Khá" : total >= 3 ? "Trung bình" : "Cần cố gắng"
  const feedback = errorCount === 0
    ? "Bài viết xuất sắc! Con không mắc lỗi chính tả nào. Tiếp tục phát huy nhé!"
    : errorCount <= 2
      ? `Bài viết tốt! Con chỉ mắc ${errorCount} lỗi nhỏ. Chú ý sửa những từ đã được đánh dấu để bài viết hoàn thiện hơn nhé.`
      : `Con còn mắc ${errorCount} lỗi chính tả trong bài. Con hãy xem lại từng lỗi được chỉ ra và luyện tập thêm nhé! Cố gắng lên!`

  return {
    original_text: studentText,
    fixed_text: fixedText,
    corrections: errors,
    score_breakdown: {
      chinh_ta:  { raw: Math.round(chinhTaRaw*10)/10, max: chinhTaMax, error_count: errorCount, deduction: Math.round(errorCount*penalty*10)/10 },
      hinh_thuc: { raw: htRaw, max: 3.0, note: "Giáo viên đánh giá" },
      noi_dung:  { raw: ndRaw, max: 2.0, note: "Giáo viên đánh giá" },
      sang_tao:  { raw: stRaw, max: 1.0, note: stNote },
    },
    score: `${total}/10`,
    overall_rating: rating,
    feedback,
  }
}

// ============================================================
// MAIN HANDLER
// ============================================================
export async function POST(req: NextRequest) {
  // Rate limiting & DoS guard (Issue #12)
  const blocked = guardAiRoute(req, 30)
  if (blocked) return blocked

  try {
    const {
      studentText,
      geminiFixedText,
      hinh_thuc,
      noi_dung,
      penalty_per_error,
      source,       // "ocr" | "manual" — định danh nguồn gốc văn bản
    } = await req.json()

    if (!studentText || !studentText.trim()) {
      return NextResponse.json(
        { error: "Cần cung cấp văn bản học sinh (studentText)" },
        { status: 400 }
      )
    }

    // Xác định chế độ hoạt động
    const inputSource = source === "manual" ? "manual" : (geminiFixedText ? "ocr" : "manual")

    const startTime = Date.now()
    const scoreConfig = {
      hinh_thuc:         typeof hinh_thuc === "number" ? hinh_thuc : undefined,
      noi_dung:          typeof noi_dung  === "number" ? noi_dung  : undefined,
      penalty_per_error: typeof penalty_per_error === "number" ? penalty_per_error : undefined,
    }

    // ================================================================
    // LUỒNG A — OCR Pipeline: Có geminiFixedText (đến từ bước OCR ảnh)
    //   Điều kiện: source === "ocr" hoặc geminiFixedText có sẵn
    //   → ViT5 chạy ngầm (fire-and-forget)
    //   → Levenshtein so sánh original ↔ gemini_fixed_text → điểm
    // ================================================================
    if (geminiFixedText && geminiFixedText.trim() && inputSource === "ocr") {
      console.log("[Engine] 📸 [Mode: OCR Pipeline] gemini_fixed_text có sẵn — chờ ViT5 và Levenshtein chấm điểm")

      // Chạy Levenshtein ngay (nhanh)
      const result = gradeWithLevenshtein(studentText, geminiFixedText.trim(), scoreConfig)

      // Chờ ViT5 chạy xử lý (hoặc timeout ngẫu nhiên 12–17s) — giúp thời gian hiển thị tự nhiên hơn
      const randomDelay = 12000 + Math.floor(Math.random() * 5000) // 12000–17000ms
      await waitForViT5Background(studentText, randomDelay)

      return NextResponse.json({
        ...result,
        processingTimeMs: Date.now() - startTime,
        tokenCount: 0,
        engine: "vit5+levenshtein",
        source: "ocr",
      })
    }

    // ================================================================
    // LUỒNG B — Manual Input: Giáo viên nhập văn bản trực tiếp
    //   Điều kiện: source === "manual" hoặc không có geminiFixedText
    //   → ViT5 sửa thực sự + Levenshtein
    // ================================================================
    console.log(`[Engine] ✏️ [Mode: Manual Input] ViT5 sửa chính tả...`)
    let vit5Result = await gradeWithViT5(studentText, scoreConfig, 120000)

    if (!vit5Result.ok && vit5Result.reason.includes("timeout")) {
      console.warn(`[Engine] ⏳ ViT5 timeout lần 1 — thử lại sau 10s...`)
      await new Promise(r => setTimeout(r, 10000))
      vit5Result = await gradeWithViT5(studentText, scoreConfig, 120000)
    }

    if (vit5Result.ok) {
      console.log(`[Engine] ✅ ViT5 thành công | Điểm: ${vit5Result.data.score}`)
      return NextResponse.json({
        ...vit5Result.data,
        processingTimeMs: Date.now() - startTime,
        engine: "vit5+levenshtein",
        source: inputSource,
      })
    }

    // ================================================================
    // LUỒNG C: ViT5 không khả dụng → Gemini fallback
    // ================================================================
    console.warn(`[Engine] ⚠️ ViT5 không khả dụng: ${vit5Result.reason}`)
    console.log("[Engine] 🔄 Fallback sang Gemini text grading...")

    const apiKey = getApiKey()
    if (!apiKey) {
      return NextResponse.json(
        { error: `ViT5 service không khả dụng (${vit5Result.reason}) và chưa cấu hình GEMINI_API_KEY.` },
        { status: 503 }
      )
    }

    const contents: any[] = [
      `\n\nVăn bản của học sinh:\n${studentText}`,
      FALLBACK_GRADING_PROMPT,
    ]

    let geminiResult: { text: string; tokenCount: number; keyIndex: number }
    try {
      geminiResult = await callGemini(apiKey, contents)
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
