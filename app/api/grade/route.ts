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
// LEVENSHTEIN GRADING — Phân tích âm tiết Tiếng Việt (Issue #23 Fix)
// ============================================================
const TONE_COMBINING_MAP: Record<string, string> = {
  "\u0300": "huyen",
  "\u0301": "sac",
  "\u0303": "nga",
  "\u0309": "hoi",
  "\u0323": "nang",
}

const TONE_NAMES_VI: Record<string, string> = {
  ngang: "thanh ngang (không dấu)",
  huyen: "thanh huyền",
  sac: "thanh sắc",
  hoi: "thanh hỏi",
  nga: "thanh ngã",
  nang: "thanh nặng",
}

const VIETNAMESE_INITIALS = [
  "ngh", "ng", "nh", "ch", "th", "tr", "ph", "kh", "gh", "gi", "qu",
  "b", "c", "d", "đ", "g", "h", "k", "l", "m", "n", "p", "r", "s", "t", "v", "x", "z",
]

const VIETNAMESE_FINALS = ["ng", "nh", "ch", "c", "m", "n", "p", "t", "i", "y", "o", "u"]

interface SyllableParts {
  word: string
  base: string
  tone: string
  initial: string
  rhyme: string
  nucleus: string
  final: string
}

function removeAccents(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "")
}

function extractTone(s: string): { base: string; tone: string } {
  const nfd = s.toLowerCase().normalize("NFD")
  let tone = "ngang"
  let clean = ""
  for (const ch of nfd) {
    if (TONE_COMBINING_MAP[ch]) {
      tone = TONE_COMBINING_MAP[ch]
    } else {
      clean += ch
    }
  }
  return { base: clean.normalize("NFC"), tone }
}

function parseVietnameseSyllable(word: string): SyllableParts {
  const w = word.trim().toLowerCase()
  const { base, tone } = extractTone(w)

  let init = ""
  let rest = base

  if (base === "gi") {
    init = "gi"
    rest = "i"
  } else if (base.startsWith("gi") && base.length > 2 && "êeaơu".includes(base[2])) {
    init = "gi"
    rest = base.slice(2)
  } else if (base.startsWith("gi") && base.length > 2 && base[2] === "i") {
    init = "gi"
    rest = base.slice(2)
  } else {
    for (const p of VIETNAMESE_INITIALS) {
      if (base.startsWith(p)) {
        init = p
        rest = base.slice(p.length)
        break
      }
    }
  }

  let fin = ""
  let nucleus = rest
  for (const f of VIETNAMESE_FINALS) {
    if (rest.endsWith(f) && rest.length > f.length) {
      fin = f
      nucleus = rest.slice(0, -f.length)
      break
    }
  }

  return { word, base, tone, initial: init, rhyme: rest, nucleus, final: fin }
}

function classifyErrorType(wrong: string, correct: string): string {
  if (wrong.toLowerCase() === correct.toLowerCase()) return "viet_hoa"

  const pw = parseVietnameseSyllable(wrong)
  const pc = parseVietnameseSyllable(correct)

  // 1. Sai dấu thanh: base (âm đầu + vần) giống hệt nhau
  if (pw.base === pc.base && pw.tone !== pc.tone) return "dau_thanh"

  // 2. Sai phụ âm đầu: Vần giống hệt nhau, chỉ khác âm đầu
  if (pw.rhyme === pc.rhyme && pw.initial !== pc.initial) return "phu_am_dau"

  // 3. Sai phụ âm cuối: Âm đầu giống, âm chính giống, khác âm cuối
  if (pw.initial === pc.initial && pw.nucleus === pc.nucleus && pw.final !== pc.final) return "phu_am_cuoi"

  // 4. Sai âm chính / nguyên âm: Âm đầu giống, âm cuối giống, khác âm chính
  if (pw.initial === pc.initial && pw.final === pc.final && pw.nucleus !== pc.nucleus) return "am_chinh"

  // 5. Sai vần hỗn hợp: Âm đầu giống nhưng vần khác
  if (pw.initial === pc.initial && pw.rhyme !== pc.rhyme) return "van"

  // 6. Thay thế từ / Khác biệt từ vựng hoàn toàn
  return "thay_the_tu"
}

function errorReason(code: string, wrong: string, correct: string): string {
  const pw = parseVietnameseSyllable(wrong)
  const pc = parseVietnameseSyllable(correct)

  switch (code) {
    case "viet_hoa":
      return `Chữ '${wrong}' cần viết hoa thành '${correct}' ở đầu câu hoặc tên riêng nhé.`
    case "dau_thanh": {
      const tw = TONE_NAMES_VI[pw.tone] || pw.tone
      const tc = TONE_NAMES_VI[pc.tone] || pc.tone
      return `Con viết '${wrong}' bị sai dấu thanh (${tw} thành ${tc}), đúng phải là '${correct}' nhé.`
    }
    case "phu_am_dau": {
      const iw = pw.initial ? `'${pw.initial}'` : "không có âm đầu"
      const ic = pc.initial ? `'${pc.initial}'` : "không có âm đầu"
      return `Con viết '${wrong}' sai phụ âm đầu (${iw} thành ${ic}), đúng phải là '${correct}' nhé.`
    }
    case "phu_am_cuoi": {
      const fw = pw.final ? `'${pw.final}'` : "không có âm cuối"
      const fc = pc.final ? `'${pc.final}'` : "không có âm cuối"
      return `Con viết '${wrong}' sai âm cuối (${fw} thành ${fc}), đúng phải là '${correct}' nhé.`
    }
    case "am_chinh": {
      const nw = `'${pw.nucleus}'`
      const nc = `'${pc.nucleus}'`
      return `Con viết '${wrong}' sai nguyên âm (${nw} thành ${nc}), đúng phải là '${correct}' nhé.`
    }
    case "van":
      return `Con viết '${wrong}' sai vần '${pw['rhyme']}', đúng phải là vần '${pc['rhyme']}' trong '${correct}' nhé.`
    case "thay_the_tu":
      return `Con viết chữ '${wrong}' khác với từ mẫu '${correct}'.`
    default:
      return `Sai chính tả: '${wrong}' → '${correct}'`
  }
}

// ==============================================================================
// B. MODULE BIỂU CẢM & SÁNG TẠO (ISSUE #25 FIX)
// ==============================================================================

const REDUPLICATIONS_TUONG_THANH = new Set([
  "róc rách", "râm ran", "véo von", "tí tách", "thì thào", "thì thầm", "rì rào",
  "xôn xao", "ào ào", "leng keng", "líu lo", "vi vu", "lộp độp", "lao xao",
  "khúc khích", "rầm rĩ", "thao thiết", "lách cách", "lục cục", "văng vẳng",
  "ríu rít", "ngân nga", "oang oang", "loảng xoảng", "rập rình",
  "thập thình", "ình ịch", "lập bập", "thủ thỉ", "thầm thì", "rè rè"
])

const REDUPLICATIONS_TUONG_HINH = new Set([
  "long lanh", "lấp lánh", "lung linh", "rực rỡ", "thoang thoảng", "dịu dàng",
  "thướt tha", "mơn mởn", "chập chùng", "nhấp nhô", "quanh co", "ngút ngát",
  "mê mê", "mênh mông", "bát ngát", "bập bùng", "trắng xóa", "xanh ngắt",
  "đỏ rực", "vàng óng", "chói chang", "nhung nhúc", "chênh vênh", "lom khom",
  "thoắt ẩn", "lặc lè", "dập dềnh", "thênh thang", "hùng vĩ", "nghiêng nghiêng",
  "nhè nhẹ", "êm ả", "chập chờn", "ngào ngạt", "ngọt ngào",
  "bâng khuâng", "xao xuyến", "bồi hồi", "tha thiết", "triều mến", "tươi tắn"
])

const NEGATIVE_SIMILE_PHRASES = [
  "ví dụ như", "chẳng hạn như", "như vậy", "như thế", "như sau",
  "như đã nói", "cũng như", "như thế này", "như trên"
]

const SIMILE_REGEX = /([^.!?\n,]{2,25})\s+(như là|tựa như|giống như|hệt như|như thể|tựa hồ|chẳng khác nào|như in|như)\s+([^.!?\n,]{2,30})/gi

const PERSONIFICATION_TITLES = ["ông", "bà", "chú", "bác", "cô", "dì", "chị", "anh"]
const PERSONIFICATION_OBJECTS = [
  "mặt trời", "trăng", "gió", "mây", "bàng", "phượng", "chim", "sông",
  "suối", "núi", "cây", "hoa", "đồng hồ", "gà trống", "mưa", "nắng"
]
const PERSONIFICATION_ACTIONS = [
  "thức dậy", "mỉm cười", "thì thầm", "nhảy múa", "ca hát", "chăm chỉ",
  "giận dữ", "chạy trốn", "kể chuyện", "vẫy tay", "khoác áo", "đứng nhìn"
]

function detectReduplications(text: string): [string[], string[]] {
  const low = text.toLowerCase()
  const foundSound: string[] = []
  const foundVivid: string[] = []
  REDUPLICATIONS_TUONG_THANH.forEach(w => { if (low.includes(w)) foundSound.push(w) })
  REDUPLICATIONS_TUONG_HINH.forEach(w => { if (low.includes(w)) foundVivid.push(w) })
  return [foundSound, foundVivid]
}

function detectSimiles(text: string): string[] {
  let low = text.toLowerCase()
  for (const neg of NEGATIVE_SIMILE_PHRASES) {
    low = low.split(neg).join("---")
  }
  const matches: string[] = []
  const regex = new RegExp(SIMILE_REGEX.source, "gi")
  let m: RegExpExecArray | null
  while ((m = regex.exec(low)) !== null) {
    const subA = (m[1] || "").trim()
    const marker = (m[2] || "").trim()
    const subB = (m[3] || "").trim()
    if (subA.split(/\s+/).length >= 1 && subB.split(/\s+/).length >= 1) {
      matches.push(`${subA} ${marker} ${subB}`.trim())
    }
  }
  return matches.slice(0, 2)
}

function detectPersonifications(text: string): string[] {
  const low = text.toLowerCase()
  const found: string[] = []
  for (const title of PERSONIFICATION_TITLES) {
    for (const obj of PERSONIFICATION_OBJECTS) {
      const pattern = `${title} ${obj}`
      if (low.includes(pattern) && !found.includes(pattern)) {
        found.push(pattern)
      }
    }
  }
  for (const obj of PERSONIFICATION_OBJECTS) {
    for (const act of PERSONIFICATION_ACTIONS) {
      const pattern = `${obj} ${act}`
      if (low.includes(pattern) && !found.includes(pattern)) {
        found.push(pattern)
      }
    }
  }
  return found.slice(0, 2)
}

function analyzeCreativityTier1(text: string): {
  score: number
  devices: string[]
  evidence: string[]
  note: string
} {
  const [soundReds, vividReds] = detectReduplications(text)
  const similes = detectSimiles(text)
  const personifications = detectPersonifications(text)

  const devices: string[] = []
  const evidence: string[] = []

  const allReds = [...soundReds, ...vividReds]
  if (allReds.length > 0) {
    devices.push("tu_lay")
    evidence.push(`Từ láy: ${allReds.slice(0, 3).join(", ")}`)
  }
  if (similes.length > 0) {
    devices.push("so_sanh")
    evidence.push(`So sánh: '${similes[0]}'`)
  }
  if (personifications.length > 0) {
    devices.push("nhan_hoa")
    evidence.push(`Nhân hóa: '${personifications[0]}'`)
  }

  let score = 0.0
  let note = "Văn phong trần thuật đơn giản, chưa có biện pháp biểu cảm nổi bật."

  if (devices.length >= 2 || (similes.length >= 1 && allReds.length >= 2)) {
    score = 1.0
    note = "Bài viết giàu cảm xúc, sử dụng sáng tạo các biện pháp nghệ thuật."
  } else if (devices.length === 1) {
    score = 0.5
    note = `Có ý thức sáng tạo, sử dụng ${devices[0] === "tu_lay" ? "từ láy" : devices[0] === "so_sanh" ? "phép so sánh" : "phép nhân hóa"}.`
  }

  return { score, devices, evidence, note }
}

const ERROR_TYPE_VI_LABELS: Record<string, string> = {
  phu_am_dau: "phụ âm đầu",
  phu_am_cuoi: "âm cuối",
  am_chinh: "nguyên âm",
  van: "vần",
  dau_thanh: "dấu thanh",
  viet_hoa: "chữ viết hoa",
  thay_the_tu: "dùng sai từ",
  bo_sot_them: "bỏ sót hoặc viết thừa chữ",
  dau_cau: "dấu câu",
}

const DIVERSE_PEDAGOGICAL_TEMPLATES = {
  high_creativity_clean: [
    "Cô rất khen ngợi con! Bài viết tràn đầy cảm xúc, biết vận dụng hình ảnh nghệ thuật rất sinh động và chữ viết sạch đẹp. Tiếp tục phát huy nhé!",
    "Bài văn của con thật giàu trí tưởng tượng và diễn đạt tự nhiên! Con viết đúng chính tả, câu từ trôi chảy, cô rất tự hào về con.",
    "Tuyệt vời lắm! Con có năng khiếu quan sát tinh tế và vốn từ phong phú. Toàn bài không mắc lỗi chính tả nào, cố gắng giữ vững phong độ nhé!",
  ],
  high_creativity_has_errors: [
    "Cô khen con biết dùng hình ảnh so sánh và từ láy rất sinh động! Con chỉ cần chú ý viết đúng {errors} để bài văn đạt điểm tuyệt đối nhé.",
    "Bài viết của con rất giàu cảm xúc và sáng tạo! Con nhớ rèn luyện thêm về {errors} để câu văn của mình hoàn thiện và chỉn chu hơn nhé.",
    "Ý văn của con rất hay và độc đáo! Lần sau con chú ý kiểm tra lại {errors} trước khi nộp bài để đạt kết quả cao nhất nhé. Cố gắng lên con!",
  ],
  medium_creativity_clean: [
    "Bài viết tốt, con diễn đạt tự nhiên và câu văn có hình ảnh gợi cảm. Chữ viết rõ ràng, sạch sẽ, hãy tiếp tục phát huy nhé con!",
    "Cô khen con viết đúng chủ đề, câu từ mạch lạc và không mắc lỗi chính tả. Con hãy thử thêm một vài hình ảnh so sánh để bài hay hơn nữa nhé!",
  ],
  medium_creativity_has_errors: [
    "Bài viết của con khá tốt, ý tứ rõ ràng và chân thành. Con chú ý rèn thêm về {errors} để bài viết được điểm cao hơn nhé!",
    "Câu văn của con diễn đạt tự nhiên, dễ hiểu. Con nhớ để ý phân biệt {errors} khi viết bài để không bị trừ điểm đáng tiếc nhé con.",
  ],
  basic_clean: [
    "Bài viết của con đầy đủ ý, bám sát yêu cầu đề bài. Con viết đúng chính tả và nề nếp tốt, cô khen con nhé!",
    "Con đã hoàn thành bài viết rất cẩn thận, không mắc lỗi chính tả. Con hãy đọc thêm sách để vốn từ ngữ phong phú và sinh động hơn nhé!",
  ],
  basic_has_errors: [
    "Bài viết của con bám sát đề bài và đủ ý. Con chú ý rèn thêm lỗi {errors} để bài văn của mình chỉn chu và tiến bộ hơn nhé!",
    "Con đã cố gắng hoàn thành bài viết. Lần sau con nhớ đọc lại bài để phát hiện và sửa các lỗi {errors} trước khi nộp bài nhé con!",
    "Ý văn của con mộc mạc và chân thật. Con cần rèn luyện thêm cách viết đúng {errors} để bài viết đạt kết quả tốt hơn nhé. Cố lên con!",
  ],
}

function buildFallbackPedagogicalComment(creativityInfo: any, errors: any[]): string {
  const stRaw = creativityInfo?.score ?? 0.0
  const hasErrors = Boolean(errors && errors.length > 0)

  const errLabels: string[] = []
  for (const e of (errors || []).slice(0, 2)) {
    const rawType = e.error_type || "chinh_ta"
    const lbl = ERROR_TYPE_VI_LABELS[rawType] || rawType
    if (!errLabels.includes(lbl)) errLabels.push(lbl)
  }
  const errorsStr = errLabels.length > 0 ? errLabels.join(" và ") : "chính tả"

  let cat: keyof typeof DIVERSE_PEDAGOGICAL_TEMPLATES
  if (stRaw >= 1.0) {
    cat = hasErrors ? "high_creativity_has_errors" : "high_creativity_clean"
  } else if (stRaw >= 0.5) {
    cat = hasErrors ? "medium_creativity_has_errors" : "medium_creativity_clean"
  } else {
    cat = hasErrors ? "basic_has_errors" : "basic_clean"
  }

  const list = DIVERSE_PEDAGOGICAL_TEMPLATES[cat]
  const picked = list[Math.floor(Math.random() * list.length)]
  return picked.replace("{errors}", errorsStr)
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
  scoreConfig: { hinh_thuc?: number; noi_dung?: number; penalty_per_error?: number; gradingMode?: string },
): any {
  if (!studentText || !studentText.trim()) {
    const isDictation = scoreConfig.gradingMode !== "essay"
    return {
      original_text: studentText,
      fixed_text: fixedText,
      corrections: [],
      score_breakdown: {
        chinh_ta: { raw: 0.0, max: isDictation ? 7.0 : 4.0, error_count: 0, deduction: 0 },
        hinh_thuc: { raw: 0.0, max: 3.0, note: "Chưa có bài viết" },
        ...(isDictation ? {} : {
          noi_dung: { raw: 0.0, max: 2.0, note: "Chưa có bài viết" },
          sang_tao: { raw: 0.0, max: 1.0, note: "Chưa có bài viết", devices: [], evidence: [] },
        }),
      },
      score: "0.0/10",
      overall_rating: "Cần cố gắng",
      feedback: "Chưa nhận diện được nội dung bài viết của học sinh.",
      pedagogical_comment: "Học sinh chưa có bài viết để đánh giá.",
    }
  }

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

  const isDictation = scoreConfig.gradingMode !== "essay"
  const chinhTaMax = isDictation ? 7.0 : 4.0
  const deduction = Math.round(errorCount * penalty * 10) / 10
  const chinhTaRaw = Math.max(0, chinhTaMax - deduction)
  const htRaw  = scoreConfig.hinh_thuc !== undefined ? Math.min(3.0, Math.max(0, scoreConfig.hinh_thuc)) : (isDictation ? 3.0 : 2.5)

  let total: number
  let breakdown: any
  let feedback: string
  let pedagogicalComment = ""

  if (isDictation) {
    // Barem Chính tả chuẩn Bộ GD&ĐT (2 phần): 7đ Chính tả + 3đ Trình bày
    total = Math.min(10, Math.max(0, Math.round((chinhTaRaw + htRaw) * 10) / 10))
    breakdown = {
      chinh_ta:  { raw: Math.round(chinhTaRaw * 10) / 10, max: 7.0, error_count: errorCount, deduction },
      hinh_thuc: { raw: htRaw, max: 3.0, note: "Chữ viết & Trình bày sạch đẹp" },
    }
    feedback = errorCount === 0
      ? "Bài chính tả xuất sắc! Con viết đúng 100% bài đọc mẫu, chữ viết sạch đẹp. Tiếp tục phát huy nhé!"
      : errorCount <= 2
        ? `Bài chính tả tốt! Con chỉ mắc ${errorCount} lỗi nhỏ. Chú ý các từ đã được đánh dấu đỏ để lần sau viết đúng hơn nhé.`
        : `Con mắc ${errorCount} lỗi chính tả so với bài đọc chuẩn. Hãy đối chiếu lại từng từ được sửa màu đỏ để rèn luyện thêm nhé!`
    pedagogicalComment = errorCount === 0
      ? "Bài viết rất cẩn thận, không mắc lỗi chính tả nào. Em viết đúng chuẩn bài đọc mẫu."
      : `Học sinh mắc ${errorCount} lỗi chính tả. Cần chú ý rèn luyện thêm các âm vần/dấu thanh hay nhầm lẫn.`
  } else {
    // Barem Tập làm văn (4 phần): 4đ Chính tả + 3đ Hình thức + 2đ Nội dung + 1đ Sáng tạo = 10đ
    const ndRaw = scoreConfig.noi_dung !== undefined ? Math.min(2.0, Math.max(0, scoreConfig.noi_dung)) : 1.5
    const stInfo = analyzeCreativityTier1(fixedText)
    const stRaw = stInfo.score
    total = Math.min(10, Math.max(0, Math.round((chinhTaRaw + htRaw + ndRaw + stRaw) * 10) / 10))
    breakdown = {
      chinh_ta:  { raw: Math.round(chinhTaRaw * 10) / 10, max: 4.0, error_count: errorCount, deduction },
      hinh_thuc: { raw: htRaw, max: 3.0, note: "Giáo viên đánh giá" },
      noi_dung:  { raw: ndRaw, max: 2.0, note: "Giáo viên đánh giá" },
      sang_tao:  { raw: stRaw, max: 1.0, note: stInfo.note, devices: stInfo.devices, evidence: stInfo.evidence },
    }
    feedback = errorCount === 0
      ? "Bài viết xuất sắc! Con không mắc lỗi chính tả nào. Diễn đạt tự nhiên, sáng tạo. Tiếp tục phát huy nhé!"
      : errorCount <= 2
        ? `Bài viết tốt! Con chỉ mắc ${errorCount} lỗi nhỏ. Chú ý sửa những từ đã được đánh dấu để bài viết hoàn thiện hơn nhé.`
        : `Con còn mắc ${errorCount} lỗi chính tả trong bài. Con hãy xem lại từng lỗi được chỉ ra và luyện tập thêm nhé! Cố gắng lên!`
    pedagogicalComment = buildFallbackPedagogicalComment(stInfo, errors)
  }

  const rating = total >= 9 ? "Xuất sắc" : total >= 7 ? "Tốt" : total >= 5 ? "Khá" : total >= 3 ? "Trung bình" : "Cần cố gắng"

  return {
    original_text: studentText,
    fixed_text: fixedText,
    corrections: errors,
    score_breakdown: breakdown,
    score: `${total}/10`,
    overall_rating: rating,
    feedback,
    pedagogical_comment: pedagogicalComment,
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
      groundTruthText,
      geminiFixedText,
      hinh_thuc,
      noi_dung,
      penalty_per_error,
      gradingMode,  // "dictation" (Chính tả SGK) | "essay" (Tập làm văn tự do)
      source,       // "ocr" | "manual"
    } = await req.json()

    if (!studentText || !studentText.trim()) {
      return NextResponse.json(
        { error: "Cần cung cấp văn bản học sinh (studentText)" },
        { status: 400 }
      )
    }

    const inputSource = source === "manual" ? "manual" : (geminiFixedText ? "ocr" : "manual")
    const mode = gradingMode || (groundTruthText ? "dictation" : "essay")
    const startTime = Date.now()
    const scoreConfig = {
      hinh_thuc:         typeof hinh_thuc === "number" ? hinh_thuc : undefined,
      noi_dung:          typeof noi_dung  === "number" ? noi_dung  : undefined,
      penalty_per_error: typeof penalty_per_error === "number" ? penalty_per_error : undefined,
      gradingMode:       mode,
    }

    // ================================================================
    // LUỒNG A — Ground Truth / Fixed Text Alignment:
    //   Điều kiện: Có groundTruthText hoặc geminiFixedText
    //   → Chạy Sequence Alignment Levenshtein đối soát trực tiếp 100% không ảo giác
    // ================================================================
    const referenceText = (groundTruthText || geminiFixedText || "").trim()
    if (referenceText) {
      console.log(`[Engine] 🎯 [Mode: ${mode}] So khớp bài mẫu Ground Truth trực tiếp`)
      const result = gradeWithLevenshtein(studentText, referenceText, scoreConfig)

      // Nếu là chế độ Tập làm văn: Gọi Qwen SLM sinh lời nhận xét sư phạm phong phú
      if (mode === "essay") {
        try {
          const qwenUrl = `${process.env.VIT5_SERVICE_URL || "http://localhost:8000"}/qwen/generate`
          const qwenRes = await fetch(qwenUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              creativity_score: result.score_breakdown?.sang_tao?.raw ?? 0.0,
              evidence: result.score_breakdown?.sang_tao?.evidence ?? [],
              errors: result.corrections ?? [],
            }),
            signal: AbortSignal.timeout(4000),
          })
          if (qwenRes.ok) {
            const qwenData = await qwenRes.json()
            if (qwenData.text) {
              result.pedagogical_comment = qwenData.text
              result.pedagogical_comment_source = qwenData.source
            }
          }
        } catch (qErr) {
          console.warn("[Qwen] Không gọi được Qwen SLM qua REST, sử dụng nhận xét sư phạm đa dạng:", qErr)
        }
      }

      return NextResponse.json({
        ...result,
        processingTimeMs: Date.now() - startTime,
        tokenCount: 0,
        engine: "ground_truth_alignment",
        source: inputSource,
        gradingMode: mode,
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
