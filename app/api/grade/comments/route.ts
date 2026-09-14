import { NextRequest, NextResponse } from "next/server"
import { GoogleGenAI } from "@google/genai"

const GEMINI_MODEL = "gemini-3.1-flash-lite"
const VIT5_SERVICE_URL = process.env.VIT5_SERVICE_URL || "http://localhost:8000"

function getApiKey(): string {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY.trim()
  const keys = (process.env.GEMINI_API_KEYS || "").split(",").map(k => k.trim()).filter(Boolean)
  if (keys.length === 0) return ""
  return keys[Math.floor(Math.random() * keys.length)]
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

const EXTENDED_PEDAGOGICAL_TEMPLATES = {
  high_creativity_clean: [
    "Cô rất khen ngợi con! Bài viết tràn đầy cảm xúc, biết vận dụng hình ảnh nghệ thuật rất sinh động và chữ viết sạch đẹp. Tiếp tục phát huy nhé!",
    "Bài văn của con thật giàu trí tưởng tượng và diễn đạt tự nhiên! Con viết đúng chính tả, câu từ trôi chảy, cô rất tự hào về con.",
    "Tuyệt vời lắm! Con có năng khiếu quan sát tinh tế và vốn từ phong phú. Toàn bài không mắc lỗi chính tả nào, cố gắng giữ vững phong độ nhé!",
    "Một bài viết xuất sắc! Cách con chọn lọc từ ngữ và dùng hình ảnh gợi cảm rất có duyên. Chúc mừng con đã hoàn thành bài viết thật ấn tượng!",
    "Văn phong của con rất trong sáng và cuốn hút. Con biết chọn chi tiết đắt giá và viết hoa đúng quy tắc. Hãy tiếp tục nuôi dưỡng tình yêu văn học nhé!",
    "Cô rất ấn tượng với lối hành văn sinh động của con! Bài làm hoàn hảo từ chính tả đến cảm xúc, xứng đáng là bài văn mẫu của lớp.",
    "Con có trí tưởng tượng rất phong phú và cách dùng từ giàu tính hội hoạ! Hãy giữ vững niềm đam mê viết văn này con nhé.",
    "Bài viết để lại ấn tượng sâu sắc trong lòng cô. Con diễn đạt tinh tế, câu văn trau chuốt và bố cục rất khoa học."
  ],
  high_creativity_has_errors: [
    "Cô khen con biết dùng hình ảnh so sánh và từ láy rất sinh động! Con chỉ cần chú ý viết đúng {errors} để bài văn đạt điểm tuyệt đối nhé.",
    "Bài viết của con rất giàu cảm xúc và sáng tạo! Con nhớ rèn luyện thêm về {errors} để câu văn của mình hoàn thiện và chỉn chu hơn nhé.",
    "Ý văn của con rất hay và độc đáo! Lần sau con chú ý kiểm tra lại {errors} trước khi nộp bài để đạt kết quả cao nhất nhé. Cố gắng lên con!",
    "Cô rất thích cách con diễn đạt, giàu hình ảnh và tự nhiên! Con lưu ý rèn thêm {errors} để nét chữ và câu văn đều thật đẹp nhé.",
    "Con có năng khiếu viết văn rất tốt, giàu trí tưởng tượng. Nhớ đọc lại bài cẩn thận hơn để phát hiện và sửa các lỗi {errors} nhé con.",
    "Từng câu văn của con đều gợi hình gợi cảm. Chỉ tiếc một chút ở lỗi {errors}, con chú ý luyện tập thêm để bài viết điểm 10 trọn vẹn nhé!",
    "Lối viết văn của con rất lôi cuốn và độc đáo. Con chỉ cần lưu tâm hơn về {errors} là bài viết sẽ hoàn hảo tuyệt đối!",
    "Cô nhìn thấy sự sáng tạo vượt trội trong bài làm của con. Hãy dành 2 phút soát lại {errors} trước khi nộp bài nhé con yêu."
  ],
  medium_creativity_clean: [
    "Bài viết tốt, con diễn đạt tự nhiên và câu văn có hình ảnh gợi cảm. Chữ viết rõ ràng, sạch sẽ, hãy tiếp tục phát huy nhé con!",
    "Cô khen con viết đúng chủ đề, câu từ mạch lạc và không mắc lỗi chính tả. Con hãy thử thêm một vài hình ảnh so sánh để bài hay hơn nữa nhé!",
    "Bài làm rất chỉn chu và cẩn thận! Con giữ vở sạch, viết đúng chính tả. Tiếp tục rèn luyện để bài văn ngày càng truyền cảm hơn nhé.",
    "Con nắm chắc cấu trúc bài văn, câu văn gãy gọn và rõ ràng. Con thử dùng thêm từ gợi tả âm thanh hoặc màu sắc để bài sinh động hơn nhé!",
    "Cô đánh giá cao sự nghiêm túc và nề nếp viết bài của con. Bài viết không lỗi chính tả, hãy tiếp tục phát huy phong độ này nhé!",
    "Con đã biết cách phát triển ý mạch lạc và có cảm xúc. Tiếp tục rèn luyện để câu văn thêm phần bay bổng hơn nữa nhé!"
  ],
  medium_creativity_has_errors: [
    "Bài viết của con khá tốt, ý tứ rõ ràng và chân thành. Con chú ý rèn thêm về {errors} để bài viết được điểm cao hơn nhé!",
    "Câu văn của con diễn đạt tự nhiên, dễ hiểu. Con nhớ để ý phân biệt {errors} khi viết bài để không bị trừ điểm đáng tiếc nhé con.",
    "Cô thấy con có nhiều tiến bộ trong cách dùng từ! Con chỉ cần cẩn thận hơn ở {errors} là bài viết sẽ rất tuyệt vời đấy.",
    "Con bám sát yêu cầu đề bài và có nhiều ý văn hay. Nhớ rèn thêm kỹ năng nhận diện {errors} khi viết chính tả nhé con.",
    "Cách hành văn của con khá trôi chảy. Con hãy dành thêm thời gian luyện viết những từ chứa {errors} để tự tin hơn trong các bài sau nhé!",
    "Ý tưởng của con rất trong sáng và đáng khen. Con chú ý khắc phục các lỗi {errors} để bài văn đạt điểm số cao hơn nhé."
  ],
  basic_clean: [
    "Bài viết của con đầy đủ ý, bám sát yêu cầu đề bài. Con viết đúng chính tả và nề nếp tốt, cô khen con nhé!",
    "Con đã hoàn thành bài viết rất cẩn thận, không mắc lỗi chính tả. Con hãy đọc thêm sách để vốn từ ngữ phong phú và sinh động hơn nhé!",
    "Bài làm sạch sẽ, đúng quy cách đoạn văn. Con tiếp tục rèn chữ và mở rộng ý văn để bài viết cuốn hút hơn nhé.",
    "Cô khen con viết bài nghiêm túc, đúng ngữ pháp và không sai chính tả. Hãy tự tin mở rộng thêm cảm xúc của bản thân vào bài nhé con!",
    "Nét chữ và cách trình bày của con rất đáng khen. Con tiếp tục đọc thêm các bài văn hay để học hỏi thêm cách mở đoạn sinh động nhé.",
    "Con có ý thức học tập rất chăm chỉ và cẩn thận. Hãy mạnh dạn đưa thêm cảm nghĩ của mình vào bài viết nhé con."
  ],
  basic_has_errors: [
    "Bài viết của con bám sát đề bài và đủ ý. Con chú ý rèn thêm lỗi {errors} để bài văn của mình chỉn chu và tiến bộ hơn nhé!",
    "Con đã cố gắng hoàn thành bài viết. Lần sau con nhớ đọc lại bài để phát hiện và sửa các lỗi {errors} trước khi nộp bài nhé con!",
    "Ý văn của con mộc mạc và chân thật. Con cần rèn luyện thêm cách viết đúng {errors} để bài viết đạt kết quả tốt hơn nhé. Cố lên con!",
    "Cô thấy con có nhiều cố gắng trong bài làm hôm nay. Con hãy luyện viết lại các từ có lỗi {errors} vào vở rèn chữ nhé.",
    "Con đã hiểu đề và viết tương đối trọn vẹn. Chỉ cần tập trung sửa thêm {errors} là bài viết sẽ tiến bộ rõ rệt đấy con!",
    "Cô khen ngợi nỗ lực hoàn thành bài của con. Lần sau con nhớ nắn nót hơn và chú ý sửa lỗi {errors} nhé con yêu."
  ],
  dictation_clean: [
    "Bài viết rất cẩn thận, không mắc lỗi chính tả nào. Con viết đúng chuẩn bài đọc mẫu, cô rất khen ngợi!",
    "Chữ viết sạch sẽ, đều nét và hoàn thành đúng 100% bài đọc. Con tiếp tục giữ vững phong độ nhé!",
    "Con lắng nghe và chép bài rất tập trung, bài làm chỉn chu không sai một từ nào. Cô rất tự hào về con!",
    "Rất xuất sắc! Nề nếp bài viết mẫu mực, chữ viết nắn nót và không có lỗi chính tả. Tiếp tục phát huy nhé con!",
    "Cô khen con nghe viết chuẩn xác, đặt dấu thanh và viết hoa đúng vị trí. Chúc mừng con đạt kết quả rất tốt!",
    "Vở sạch chữ đẹp, nghe viết chính xác tuyệt đối. Con xứng đáng là tấm gương chăm ngoan của lớp!"
  ],
  dictation_has_errors: [
    "Cô khen con đã cố gắng hoàn thành bài viết! Lần sau con chú ý viết cẩn thận hơn các lỗi {errors} nhé.",
    "Bài viết khá tốt nhưng con còn nhầm lẫn ở {errors}. Con hãy dành thêm thời gian luyện viết lại những từ này nhé con!",
    "Con có nề nếp viết bài cẩn thận. Nhớ đối chiếu lại từng câu chữ trước khi nộp bài để khắc phục lỗi {errors} nhé con.",
    "Con lắng nghe bài đọc tốt nhưng cần chú ý rèn thêm cách viết đúng {errors}. Cố gắng luyện tập thêm con nhé!",
    "Bài viết cơ bản hoàn thành tốt. Con chỉ cần cẩn thận hơn ở các từ có {errors} là sẽ đạt điểm tuyệt đối đấy!",
    "Nét chữ của con khá rõ ràng. Lần sau con chú ý lắng nghe cô phát âm để không nhầm lẫn lỗi {errors} nữa nhé."
  ]
}

async function generateWithGemini(
  apiKey: string,
  params: {
    gradingMode: string
    studentText?: string
    creativity_score?: number
    errors?: any[]
    current_comments?: string[]
  }
): Promise<string[] | null> {
  const client = new GoogleGenAI({ apiKey })
  const isDictation = params.gradingMode !== "essay"
  const errorsList = (params.errors || []).slice(0, 3)
  const errLabels = errorsList.map((e: any) => {
    const raw = e.error_type || "chinh_ta"
    return ERROR_TYPE_VI_LABELS[raw] || e.error_label || raw
  })
  const errorsDesc = errLabels.length > 0 ? errLabels.join(", ") : "Không có lỗi chính tả"
  const currentList = params.current_comments || []
  const currentAvoidText = currentList.length > 0
    ? `\nCÁC CÂU ĐÃ DÙNG TRƯỚC ĐÓ (TUYỆT ĐỐI KHÔNG VIẾT LẠI HOẶC TƯƠNG TỰ CÁC CÂU NÀY):\n${currentList.map((c, i) => `${i + 1}. "${c}"`).join("\n")}`
    : ""

  const prompt = `Bạn là một giáo viên tiểu học Việt Nam dịu dàng, ân cần, giàu tình yêu thương học trò.
Hãy viết đúng 3 phương án nhận xét sư phạm ngắn gọn (1-2 câu, dưới 40 từ mỗi câu) cho học sinh tiểu học:
- Gợi ý 1 (🌟 Động viên & Khen ngợi): Khen ngợi sự sáng tạo, ý văn giàu cảm xúc hoặc sự nỗ lực hoàn thành bài viết của con.
- Gợi ý 2 (✍️ Nhắc nhở lỗi chính tả): Nhắc nhở nhẹ nhàng, cụ thể về các lỗi (${errorsDesc}) để con lưu ý rèn luyện thêm.
- Gợi ý 3 (💡 Rèn luyện & Bứt phá): Định hướng con chăm đọc sách, rèn nét chữ đều đẹp hoặc mở rộng vốn từ để bài sau điểm cao hơn.

Thông tin bài làm của học sinh:
- Phân môn: ${isDictation ? "Chính tả (Nghe - Viết)" : "Tập làm văn"}
- Điểm sáng tạo: ${(params.creativity_score ?? 0).toFixed(1)}/1.0
- Lỗi sai phát hiện: ${errorsDesc}
${params.studentText ? `- Trích đoạn bài viết: "${params.studentText.slice(0, 200)}"` : ""}
${currentAvoidText}

Quy tắc bắt buộc:
1. Xưng "Cô" và gọi học sinh là "con" (hoặc "em").
2. Giọng điệu ấm áp, tích cực, đúng chuẩn mực sư phạm tiểu học Việt Nam.
3. Không viết tiêu đề, trả về duy nhất định dạng JSON chuẩn:
{
  "pedagogical_comments": [
    "Câu nhận xét gợi ý 1",
    "Câu nhận xét gợi ý 2",
    "Câu nhận xét gợi ý 3"
  ]
}`

  const response = await client.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      temperature: 0.9,
      topP: 0.95,
      maxOutputTokens: 1024,
    },
  })

  const text = response.text ?? ""
  const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim()
  const parsed = JSON.parse(cleaned)
  if (parsed.pedagogical_comments && Array.isArray(parsed.pedagogical_comments) && parsed.pedagogical_comments.length >= 3) {
    return parsed.pedagogical_comments.slice(0, 3)
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      gradingMode = "essay",
      studentText = "",
      fixedText = "",
      creativity_score = 0.0,
      evidence = [],
      errors = [],
      current_comments = [],
    } = body

    const isDictation = gradingMode !== "essay"
    const hasErrors = Boolean(errors && errors.length > 0)
    const currentNormalized = new Set(
      (current_comments || []).map((c: string) => c.trim().toLowerCase())
    )

    // ── TẦNG 1: Thử gọi Qwen SLM cục bộ (nếu khả dụng và sinh câu mới thực sự) ──
    try {
      const qwenUrl = `${VIT5_SERVICE_URL}/qwen/generate`
      const qwenRes = await fetch(qwenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creativity_score,
          evidence,
          errors,
          grading_mode: gradingMode,
          current_comments,
        }),
        signal: AbortSignal.timeout(3000),
      })
      if (qwenRes.ok) {
        const qwenData = await qwenRes.json()
        if (
          qwenData.source === "qwen2.5_0.5b" &&
          Array.isArray(qwenData.suggestions) &&
          qwenData.suggestions.length >= 3
        ) {
          const isReallyNew = qwenData.suggestions.some(
            (s: string) => !currentNormalized.has(s.trim().toLowerCase())
          )
          if (isReallyNew) {
            return NextResponse.json({
              success: true,
              pedagogical_comments: qwenData.suggestions.slice(0, 3),
              source: "qwen2.5_0.5b",
            })
          }
        }
      }
    } catch {
      // Qwen SLM không khả dụng hoặc timeout -> tiếp tục Tầng 2
    }

    // ── TẦNG 2: Gọi Gemini AI sinh nhận xét mới mẻ, cá nhân hóa theo bài học sinh ──
    const apiKey = getApiKey()
    if (apiKey) {
      try {
        const geminiComments = await generateWithGemini(apiKey, {
          gradingMode,
          studentText: studentText || fixedText,
          creativity_score,
          errors,
          current_comments,
        })
        if (geminiComments && geminiComments.length >= 3) {
          return NextResponse.json({
            success: true,
            pedagogical_comments: geminiComments,
            source: "gemini_ai",
          })
        }
      } catch (geminiErr) {
        console.warn("[Comments] Gemini generation error, falling back to template bank:", geminiErr)
      }
    }

    // ── TẦNG 3: Fallback Ngân hàng mẫu Bộ GD&ĐT mở rộng (Đảm bảo 100% không trùng) ──
    const errLabels: string[] = []
    for (const e of (errors || []).slice(0, 2)) {
      const rawType = e.error_type || "chinh_ta"
      const lbl = ERROR_TYPE_VI_LABELS[rawType] || e.error_label || rawType
      if (!errLabels.includes(lbl)) errLabels.push(lbl)
    }
    const errorsStr = errLabels.length > 0 ? errLabels.join(" và ") : "chính tả"

    let pool: string[] = []
    if (isDictation) {
      pool = hasErrors
        ? EXTENDED_PEDAGOGICAL_TEMPLATES.dictation_has_errors
        : EXTENDED_PEDAGOGICAL_TEMPLATES.dictation_clean
    } else {
      if (creativity_score >= 1.0) {
        pool = hasErrors
          ? EXTENDED_PEDAGOGICAL_TEMPLATES.high_creativity_has_errors
          : EXTENDED_PEDAGOGICAL_TEMPLATES.high_creativity_clean
      } else if (creativity_score >= 0.5) {
        pool = hasErrors
          ? EXTENDED_PEDAGOGICAL_TEMPLATES.medium_creativity_has_errors
          : EXTENDED_PEDAGOGICAL_TEMPLATES.medium_creativity_clean
      } else {
        pool = hasErrors
          ? EXTENDED_PEDAGOGICAL_TEMPLATES.basic_has_errors
          : EXTENDED_PEDAGOGICAL_TEMPLATES.basic_clean
      }
    }

    const formattedPool = pool.map(tpl => tpl.replace("{errors}", errorsStr))

    // Lọc ra các câu chưa hề xuất hiện trên màn hình
    let candidates = formattedPool.filter(c => !currentNormalized.has(c.trim().toLowerCase()))
    candidates = candidates.sort(() => Math.random() - 0.5)

    const finalComments: string[] = []
    for (const c of candidates) {
      if (finalComments.length < 3) finalComments.push(c)
    }

    // Nếu vẫn chưa đủ 3 câu do danh sách trước đó đã dùng hết:
    // Tạo biến thể linh hoạt bằng các cụm từ mở đầu sư phạm đa dạng
    if (finalComments.length < 3) {
      const variedOpeners = [
        "Cô rất mừng khi đọc bài làm của con! ",
        "Cô đánh giá cao sự cố gắng và tinh thần tự học của con. ",
        "Con đã có nhiều chuyển biến tích cực trong cách hành văn. ",
        "Bài làm hôm nay cho thấy sự tiến bộ rõ rệt của con. ",
        "Cô nhận thấy nét chữ và câu từ của con ngày càng tiến bộ. ",
        "Thật đáng khen ngợi tinh thần học tập nghiêm túc của con! ",
      ].sort(() => Math.random() - 0.5)

      for (const poolItem of formattedPool) {
        if (finalComments.length >= 3) break
        const opener = variedOpeners[finalComments.length % variedOpeners.length]
        const varied = `${opener}${poolItem}`
        if (!currentNormalized.has(varied.toLowerCase()) && !finalComments.includes(varied)) {
          finalComments.push(varied)
        }
      }
    }

    return NextResponse.json({
      success: true,
      pedagogical_comments: finalComments.slice(0, 3),
      source: "diverse_pedagogy_bank",
    })
  } catch (err: any) {
    console.error("Comments regeneration error:", err)
    return NextResponse.json(
      { error: err.message || "Không thể tạo nhận xét mới" },
      { status: 500 }
    )
  }
}

