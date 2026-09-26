import { NextRequest, NextResponse } from "next/server"
import { GoogleGenAI } from "@google/genai"
import { guardAiRoute } from "@/lib/api-guard"
import { ensureVietnameseCapitalization } from "@/lib/utils"
import { prisma } from "@/lib/prisma"
import { POST as handleGradePost } from "@/app/api/grade/route"
import { promises as fs } from "fs"
import path from "path"

// ============================================================
// LƯU TRỮ ẢNH VẬT LÝ RA ĐĨA TRÊN SERVER
// ============================================================
async function saveImageToDisk(imageBase64: string): Promise<string> {
  if (!imageBase64 || typeof imageBase64 !== "string") return ""
  try {
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "")
    if (!base64Data || base64Data.length < 50) return ""

    const buffer = Buffer.from(base64Data, "base64")
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "grades")
    await fs.mkdir(uploadsDir, { recursive: true })

    const filename = `mobile-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.jpg`
    const filepath = path.join(uploadsDir, filename)
    await fs.writeFile(filepath, buffer)

    return `/uploads/grades/${filename}`
  } catch (err) {
    console.error("[Mobile BFF] Lỗi khi lưu ảnh ra đĩa:", err)
    return ""
  }
}

// ============================================================
// BFF API Gateway cho Android Native App
// ============================================================
// Endpoint chuyên dụng nhận ảnh từ thiết bị di động, tự động chạy
// trọn gói: Gemini OCR → YOLOv8 Bounding Box → ViT5/Levenshtein → Scoring
// Trả về JSON tương thích 100% với GradeApiResponse của Android Client.
//
// Tham khảo: TECHNICAL_SPECIFICATION.md §5.1

export const maxDuration = 300 // Vercel only

const GEMINI_MODEL = "gemini-3.1-flash-lite"
const VIT5_SERVICE_URL = process.env.VIT5_SERVICE_URL || "http://localhost:8000"

// ============================================================
// GEMINI API CLIENT & KEY ROTATION
// ============================================================
function getApiKeys(): string[] {
  const envVal = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || ""
  return envVal.split(",").map(k => k.trim()).filter(Boolean)
}

function getApiKey(): string {
  const keys = getApiKeys()
  if (!keys.length) return ""
  return keys[Math.floor(Math.random() * keys.length)]
}

// ============================================================
// OCR PROMPT — Tái sử dụng từ app/api/ocr/route.ts
// ============================================================
const OCR_PROMPT = `Bạn là chuyên gia OCR và giám khảo chấm chính tả Tiếng Việt Tiểu học (Bộ GD&ĐT).
Nhiệm vụ: Phân tích ảnh bài viết tay của học sinh, nhận diện chính xác từng chữ và chuẩn hóa chính tả tiếng Việt. Trả về DUY NHẤT định dạng JSON.

=== BƯỚC 1: XÁC ĐỊNH THỂ LOẠI (the_loai: "tho" | "van_xuoi") ===
- "tho": Bài thơ (4 chữ, 5 chữ, 7 chữ, lục bát...), các dòng ngắn có vần điệu.
- "van_xuoi": Đoạn văn/bài văn, câu dài viết liên tục tràn hết dòng kẻ vở.

=== BƯỚC 2: NHẬN DIỆN VĂN BẢN GỐC (original_text) ===
- Ghi lại CHÍNH XÁC 100% từng nét chữ học sinh viết tay — GIỮ NGUYÊN mọi lỗi sai.
- TUYỆT ĐỐI KHÔNG tự ý sửa lỗi trong "original_text".
- THƠ: Mỗi câu thơ trên một dòng riêng biệt.
- VĂN XUÔI: Giữ theo đoạn văn, chỉ xuống dòng khi sang đoạn mới.

=== BƯỚC 3: CHUẨN HÓA CHÍNH TẢ (fixed_text) ===
- Viết hoa đầu câu, đầu dòng thơ, tên riêng.
- Sửa lỗi phụ âm đầu (s/x, tr/ch, d/gi/r, l/n), vần, dấu thanh theo chuẩn từ điển.
- Giữ nguyên nội dung — chỉ sửa chính tả và viết hoa.

=== BƯỚC 4: RÀNG BUỘC ĐỐI SOÁT 1-1 ===
- original_text và fixed_text PHẢI CÓ CÙNG SỐ LƯỢNG TỪ.
- fixed_text chỉ THAY THẾ từ sai — KHÔNG thêm/xóa từ.
- CÙNG CẤU TRÚC XUỐNG DÒNG (số dòng bằng nhau 100%).

=== ĐỊNH DẠNG OUTPUT (JSON DUY NHẤT) ===
{
  "the_loai": "tho hoặc van_xuoi",
  "original_text": "văn bản gốc giữ nguyên lỗi",
  "fixed_text": "văn bản đã sửa 100% chính tả"
}`

// ============================================================
// STEP 1: GEMINI VISION OCR (VỚI KEY ROTATION & MODEL FALLBACK)
// ============================================================
async function runGeminiOCR(
  apiKey: string,
  imageBase64: string,
  mimeType: string
): Promise<{ original_text: string; fixed_text: string; the_loai: string; tokenCount: number }> {
  const keys = getApiKeys()
  const candidateKeys = keys.length > 0 ? keys : (apiKey ? [apiKey] : [])
  const candidateModels = [GEMINI_MODEL, "gemini-2.5-flash"]

  let lastError: any = null
  for (const model of candidateModels) {
    for (const key of candidateKeys) {
      try {
        const client = new GoogleGenAI({ apiKey: key })
        const response = await client.models.generateContent({
          model,
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
        let fixed_text = ""
        let the_loai = ""

        try {
          const cleaned = text
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/```\s*$/i, "")
            .trim()
          const parsed = JSON.parse(cleaned)
          original_text = (parsed.original_text || "").trim()
          fixed_text = (parsed.fixed_text || "").trim()
          the_loai = (parsed.the_loai || "").trim().toLowerCase()
        } catch {
          original_text = text.trim()
          fixed_text = text.trim()
        }

        if (original_text) {
          if (the_loai === "tho") {
            fixed_text = ensureVietnameseCapitalization(fixed_text)
          }
          console.log(`[Mobile OCR] ✓ Model ${model} (${the_loai || "auto"}): ${tokenCount} tokens | ${original_text.length} chars`)
          return { original_text, fixed_text, the_loai, tokenCount }
        }
      } catch (err: any) {
        lastError = err
        const keySuffix = key.length > 6 ? key.slice(-6) : key
        console.warn(`[Mobile OCR] Model ${model} key ...${keySuffix} thất bại (${err?.status || err?.message}), chuyển key/model kế tiếp...`)
      }
    }
  }

  throw lastError || new Error("Không nhận diện được nội dung chữ viết tay từ ảnh sau khi thử tất cả models và keys")
}

// ============================================================
// STEP 2: YOLO BOUNDING BOX DETECTION (song song với OCR)
// ============================================================
async function detectYoloBoxes(imageBase64?: string): Promise<any | null> {
  if (!imageBase64 || typeof imageBase64 !== "string" || imageBase64.trim().length === 0) {
    return null
  }
  try {
    const rawB64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64
    const serviceUrl = (process.env.VIT5_SERVICE_URL || "http://127.0.0.1:8000").replace("localhost", "127.0.0.1")
    console.log(`[Mobile YOLO] Calling ${serviceUrl}/detect-words...`)
    const res = await fetch(`${serviceUrl}/detect-words`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64: rawB64, conf_threshold: 0.50, iou_threshold: 0.45 }),
      signal: AbortSignal.timeout(30000),
    })
    if (!res.ok) {
      console.warn(`[Mobile YOLO] /detect-words returned status ${res.status}`)
      return null
    }
    const data = await res.json()
    console.log(`[Mobile YOLO] ✓ Phát hiện ${data.total_words} từ trên ${data.lines?.length || 0} dòng`)
    return data
  } catch (err: any) {
    console.error(`[Mobile YOLO] Không gọi được:`, err?.message || err)
    return null
  }
}

// ============================================================
// STEP 3: GRADING PIPELINE (gọi nội bộ /api/grade)
// ============================================================
async function callGradeEndpoint(
  req: NextRequest,
  studentText: string,
  geminiFixedText: string,
  the_loai: string,
  imageBase64: string,
  ocrTimeMs: number,
  gradingMode: string,
  scoreConfig: { hinh_thuc?: number; noi_dung?: number; penalty_per_error?: number },
  yoloData?: any,
): Promise<any> {
  const body = {
    studentText,
    geminiFixedText,
    the_loai,
    imageBase64,
    hinh_thuc: scoreConfig.hinh_thuc,
    noi_dung: scoreConfig.noi_dung,
    penalty_per_error: scoreConfig.penalty_per_error,
    gradingMode,
    source: "ocr",
    ocrTimeMs,
    yoloData,
  }

  // 1. Ưu tiên gọi TRỰC TIẾP handler POST in-process (hoàn toàn không qua mạng, không bao giờ bị 'fetch failed')
  try {
    const directReq = new NextRequest("http://127.0.0.1:3000/api/grade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const directRes = await handleGradePost(directReq)
    if (directRes.ok) {
      console.log(`[Mobile BFF] ✓ Chấm điểm in-process thành công`)
      return await directRes.json()
    }
  } catch (directErr: any) {
    console.warn(`[Mobile BFF] Gọi trực tiếp in-process thất bại (${directErr?.message}), fallback sang fetch...`)
  }

  // 2. Dự phòng: gọi fetch loopback qua 127.0.0.1
  const port = process.env.PORT || 3000
  const localUrl = `http://127.0.0.1:${port}/api/grade`

  let res: Response
  try {
    res = await fetch(localUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000),
    })
  } catch (localErr: any) {
    console.warn(`[Mobile BFF] Gọi nội bộ 127.0.0.1 thất bại (${localErr?.message}), thử fallback origin...`)
    const fallbackUrl = `${req.nextUrl.origin}/api/grade`
    res = await fetch(fallbackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000),
    })
  }

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Grade API lỗi ${res.status}: ${errText}`)
  }

  return res.json()
}

// ============================================================
// STEP 4: TRANSFORM RESPONSE CHO ANDROID
// ============================================================
function transformForAndroid(
  gradeResult: any,
  studentName: string,
  className: string,
  processingTimeMs: number,
): any {
  // Ánh xạ score_breakdown sang criteria format của Android
  const sb = gradeResult.score_breakdown || {}
  const chinhTa = sb.chinh_ta || {}
  const hinhThuc = sb.hinh_thuc || {}
  const noiDung = sb.noi_dung || {}
  const sangTao = sb.sang_tao || {}

  // Tính tổng điểm từ breakdown
  const spellingScore = chinhTa.raw ?? 0
  const formatScore = hinhThuc.raw ?? 0
  const contentScore = noiDung.raw ?? 0
  const creativityScore = sangTao.raw ?? 0
  const totalScore = parseFloat(gradeResult.score?.split("/")[0] || "0") ||
    Math.min(10, spellingScore + formatScore + contentScore + creativityScore)

  // Chuyển đổi corrections → errors format cho Android
  const errors = (gradeResult.corrections || []).map((c: any, idx: number) => {
    const bbox = c.bbox || {}
    return {
      id: `err_${idx}`,
      originalWord: c.error || "",
      correctedWord: c.suggestion || "",
      errorType: c.error_type || "bo_sot_them",
      explanation: c.reason || "",
      penalty: 0.5,
      lineNumber: 1,
      // Tọa độ tuyệt đối (pixels) — dùng cho canvas tương tác
      x1: bbox.x1 ?? c.x1 ?? 0,
      y1: bbox.y1 ?? c.y1 ?? 0,
      x2: bbox.x2 ?? c.x2 ?? 0,
      y2: bbox.y2 ?? c.y2 ?? 0,
      // Tọa độ tương đối (0.0–1.0) — dùng cho Bounding Box trên ảnh thật
      rel_x1: bbox.rel_x1 ?? c.rel_x1 ?? 0,
      rel_y1: bbox.rel_y1 ?? c.rel_y1 ?? 0,
      rel_w: bbox.rel_w ?? c.rel_w ?? 0,
      rel_h: bbox.rel_h ?? c.rel_h ?? 0,
    }
  })

  return {
    status: "success",
    essayTitle: gradeResult.essayTitle || `Bài chính tả — ${studentName}`,
    studentName,
    className,
    criteria: {
      spellingScore: Math.round(spellingScore * 10) / 10,
      formatScore: Math.round(formatScore * 10) / 10,
      contentScore: Math.round(contentScore * 10) / 10,
      creativityScore: Math.round(creativityScore * 10) / 10,
      totalScore: Math.round(totalScore * 10) / 10,
    },
    pedagogicalComment: gradeResult.pedagogical_comment || gradeResult.feedback || "",
    pedagogicalComments: gradeResult.pedagogical_comments || [
      gradeResult.pedagogical_comment || gradeResult.feedback || "",
    ],
    extractedText: gradeResult.original_text || "",
    correctedFullText: gradeResult.fixed_text || "",
    errors,
    processingTimeMs,
    serverSource: `ViHand Grade Server (Mobile BFF • ${gradeResult.engine || "hybrid"})`,
  }
}

// ============================================================
// MAIN HANDLER — POST /api/mobile/grade
// ============================================================
export async function POST(req: NextRequest) {
  // Rate limiting & DoS guard
  const blocked = guardAiRoute(req, 20)
  if (blocked) return blocked

  const startTime = Date.now()

  try {
    const body = await req.json()
    const {
      imageBase64,
      studentGrade = 3,
      gradingMode = "dictation",
      studentName = "Học sinh",
      className = `Lớp ${studentGrade}A`,
      the_loai: requestedTheLoai,
      hinh_thuc,
      noi_dung,
      penalty_per_error,
    } = body

    // Validate: bắt buộc có ảnh
    if (!imageBase64 || typeof imageBase64 !== "string" || imageBase64.trim().length === 0) {
      return NextResponse.json(
        { status: "error", error: "Cần cung cấp ảnh (imageBase64)" },
        { status: 400 }
      )
    }

    const apiKey = getApiKey()
    if (!apiKey) {
      return NextResponse.json(
        { status: "error", error: "Chưa cấu hình GEMINI_API_KEY trên máy chủ" },
        { status: 500 }
      )
    }

    // Tách base64 data (bỏ prefix data:image/...)
    const base64Data = imageBase64.includes(",")
      ? imageBase64.split(",")[1]
      : imageBase64

    const mimeType = imageBase64.startsWith("data:image/png") ? "image/png" : "image/jpeg"

    console.log(`[Mobile BFF] ====== BẮT ĐẦU CHẤM BÀI DI ĐỘNG ======`)
    console.log(`[Mobile BFF] Học sinh: ${studentName} | Lớp: ${className} | Mode: ${gradingMode}`)
    console.log(`[Mobile BFF] Ảnh: ${base64Data.length} chars base64`)

    // ================================================================
    // Bước 1+2: Chạy SONG SONG Gemini OCR + YOLOv8
    // ================================================================
    console.log(`[Mobile BFF] 1/4. Gemini OCR + YOLOv8 (đồng thời)...`)
    const [ocrResult, yoloData] = await Promise.all([
      runGeminiOCR(apiKey, base64Data, mimeType),
      detectYoloBoxes(base64Data),
    ])
    const ocrTimeMs = Date.now() - startTime

    console.log(`[Mobile BFF] 2/4. OCR hoàn tất trong ${ocrTimeMs}ms`)
    console.log(`[Mobile BFF]   original_text: "${ocrResult.original_text.substring(0, 80)}..."`)
    console.log(`[Mobile BFF]   the_loai: ${ocrResult.the_loai}`)
    console.log(`[Mobile BFF]   YOLO: ${yoloData ? `${yoloData.total_words} từ` : "không khả dụng"}`)

    // ================================================================
    // Bước 3: Chấm điểm (gọi trực tiếp in-process qua callGradeEndpoint)
    // ================================================================
    console.log(`[Mobile BFF] 3/4. Chấm điểm (in-process)...`)
    const the_loai = requestedTheLoai || ocrResult.the_loai
    const scoreConfig = {
      hinh_thuc: typeof hinh_thuc === "number" ? hinh_thuc : undefined,
      noi_dung: typeof noi_dung === "number" ? noi_dung : undefined,
      penalty_per_error: typeof penalty_per_error === "number" ? penalty_per_error : undefined,
    }

    const gradeResult = await callGradeEndpoint(
      req,
      ocrResult.original_text,
      ocrResult.fixed_text,
      the_loai,
      base64Data,
      ocrTimeMs,
      gradingMode,
      scoreConfig,
      yoloData,
    )

    // ================================================================
    // Bước 4: Chuyển đổi sang format Android
    // ================================================================
    const totalProcessingMs = Date.now() - startTime
    console.log(`[Mobile BFF] 4/4. Hoàn tất trong ${totalProcessingMs}ms`)

    const androidResponse = transformForAndroid(
      gradeResult,
      studentName,
      className,
      totalProcessingMs,
    )

    // ================================================================
    // Bước 5: Tự động lưu vào Server Database (Prisma vihand.db)
    // ================================================================
    let imagePath = ""
    try {
      imagePath = await saveImageToDisk(base64Data)
    } catch (saveErr) {
      console.warn("[Mobile BFF] Không thể lưu file ảnh vật lý:", saveErr)
    }

    let savedGradeId = ""
    let savedCreatedAt = new Date().toISOString()
    try {
      const scoreNum = androidResponse.criteria.totalScore
      const scoreStr = `${scoreNum}/10`
      const scoreBreakdownJson = JSON.stringify({
        spelling: androidResponse.criteria.spellingScore,
        format: androidResponse.criteria.formatScore,
        content: androidResponse.criteria.contentScore,
        creativity: androidResponse.criteria.creativityScore,
      })

      const newGrade = await prisma.grade.create({
        data: {
          gradingMode: gradingMode || "dictation",
          studentName: studentName || "Học sinh",
          assignmentTitle: androidResponse.essayTitle || "Bài chấm di động",
          className: className || "",
          originalText: androidResponse.extractedText,
          fixedText: androidResponse.correctedFullText,
          corrections: JSON.stringify(androidResponse.errors || []),
          score: scoreStr,
          scoreNum: scoreNum,
          scoreBreakdown: scoreBreakdownJson,
          feedback: androidResponse.pedagogicalComment,
          pedagogicalComment: androidResponse.pedagogicalComment,
          overallRating: gradeResult.overall_rating || (scoreNum >= 8 ? "Tốt" : scoreNum >= 6.5 ? "Khá" : "Cần cố gắng"),
          processingTimeMs: totalProcessingMs,
          tokenCount: gradeResult.token_count || 0,
          imageBase64: "", // Không lưu base64 nặng trong SQLite để tránh bloat
          imagePath: imagePath,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          isAnonymized: false,
        }
      })
      savedGradeId = newGrade.id
      savedCreatedAt = newGrade.createdAt.toISOString()
      console.log(`[Mobile BFF] ✅ ĐÃ TỰ ĐỘNG LƯU VÀO DATABASE SERVER: id=${savedGradeId}`)
    } catch (dbErr: any) {
      console.error("[Mobile BFF] ⚠️ Lỗi khi lưu vào prisma.grade:", dbErr?.message || dbErr)
    }

    const finalResponse = {
      ...androidResponse,
      serverGradeId: savedGradeId || `srv_${Date.now()}`,
      imagePath: imagePath,
      createdAt: savedCreatedAt,
    }

    console.log(`[Mobile BFF] ====== KẾT QUẢ: ${finalResponse.criteria.totalScore}/10 (${gradeResult.overall_rating}) ======`)

    return NextResponse.json(finalResponse)

  } catch (err: any) {
    const elapsed = Date.now() - startTime
    console.error(`[Mobile BFF] ❌ Lỗi sau ${elapsed}ms:`, err?.message || err)
    return NextResponse.json(
      {
        status: "error",
        error: err?.message || "Lỗi không xác định khi chấm bài di động",
        processingTimeMs: elapsed,
      },
      { status: err?.message?.includes("OCR") ? 503 : 500 }
    )
  }
}
