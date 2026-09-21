import { NextRequest, NextResponse } from "next/server"
import { guardAiRoute } from "@/lib/api-guard"
import { formatAiErrorMessage } from "@/lib/utils"

const VIT5_SERVICE_URL = process.env.VIT5_SERVICE_URL || "http://localhost:8000"

// Ngân hàng ngữ liệu dự phòng chuẩn GDPT 2018 (Fallback khi Python Service bận hoặc ngắt kết nối)
const FALLBACK_PEDAGOGICAL_PASSAGES: Record<number, Array<{
  title: string
  content: string
  difficultWords: string
  summary: string
}>> = {
  1: [
    {
      title: "Bé và Chú Cún Nhỏ",
      content: "Bé Na có một chú cún nhỏ rất xinh. Bộ lông của cún trắng tinh như bông. Mỗi khi bé đi học về, cún lại vẫy đuôi mừng rỡ đón bé vào nhà.",
      difficultWords: "chú cún, trắng tinh, vẫy đuôi, mừng rỡ",
      summary: "Đoạn văn ngắn gọn, dễ thương về tình cảm giữa bé và vật nuôi trong nhà.",
    },
    {
      title: "Mái Trường Thân Yêu",
      content: "Trường của em nằm dưới hàng cây xanh mát. Tiếng chim hót líu lo chào đón chúng em mỗi sớm mai. Chúng em cùng nhau học bài thật chăm ngoan.",
      difficultWords: "xanh mát, líu lo, sớm mai, chăm ngoan",
      summary: "Bài đọc ca ngợi vẻ đẹp thân thương của ngôi trường tiểu học.",
    },
  ],
  2: [
    {
      title: "Buổi Sáng Mùa Thu",
      content: "Gió mùa thu se lạnh thổi qua từng kẽ lá. Bầu trời xanh trong vắt, không một gợn mây đen. Những tia nắng vàng dịu dàng trải dài trên con đường làng thân quen.",
      difficultWords: "se lạnh, trong vắt, gợn mây, dịu dàng, thân quen",
      summary: "Đoạn văn miêu tả cảnh sắc buổi sáng mùa thu trong lành và yên bình.",
    },
    {
      title: "Đôi Bạn Thân",
      content: "Nam và Minh là đôi bạn cùng tiến của lớp em. Giờ ra chơi, hai bạn thường ngồi dưới gốc cây bàng râm mát để cùng nhau giải những bài toán khó.",
      difficultWords: "cùng tiến, ra chơi, cây bàng, râm mát",
      summary: "Ca ngợi tình bạn đẹp đẽ, cùng giúp đỡ nhau tiến bộ trong học tập.",
    },
  ],
  3: [
    {
      title: "Mùa Lúa Chín Quê Em",
      content: "Cánh đồng lúa quê em vào mùa thu hoạch trải rộng như một tấm thảm lúa vàng óng ả. Từng cơn gió nhẹ lướt qua mang theo hương thơm ngòn ngọt, mộc mạc của bông lúa non. Các bác nông dân rộn rã gặt lúa với nụ cười rạng rỡ trên môi.",
      difficultWords: "thu hoạch, vàng óng ả, ngòn ngọt, rộn rã, rạng rỡ",
      summary: "Đoạn văn gợi tả vẻ đẹp trù phú của đồng lúa chín và niềm vui lao động của người nông dân.",
    },
    {
      title: "Bảo Vệ Môi Trường Xanh",
      content: "Sáng chủ nhật, các bạn nhỏ trong xóm rủ nhau nhặt rác và quét dọn đường làng sạch sẽ. Những bồn hoa ven đường được chăm sóc cẩn thận, khoe sắc rực rỡ dưới ánh nắng ban mai. Giữ gìn môi trường xanh đẹp là niềm vui chung của mọi người.",
      difficultWords: "nhặt rác, sạch sẽ, chăm sóc, rực rỡ, ban mai",
      summary: "Giáo dục ý thức giữ gìn vệ sinh chung và tình yêu thiên nhiên của học sinh.",
    },
    {
      title: "Tình Bạn Tuổi Thơ",
      content: "Mỗi ngày đến lớp, chúng em cùng nhau đọc sách và chia sẻ những câu chuyện vui dưới tán cây phượng vĩ. Khi bạn gặp khó khăn, cả lớp luôn sẵn lòng động viên và giúp đỡ. Tình bạn học trò ấm áp như ánh nắng sớm mai soi sáng con đường đến trường.",
      difficultWords: "phượng vĩ, chia sẻ, động viên, sẵn lòng, sớm mai",
      summary: "Ca ngợi tình cảm bạn bè trong sáng, biết chia sẻ và gắn bó dưới mái trường.",
    },
  ],
  4: [
    {
      title: "Dòng Sông Tuổi Thơ",
      content: "Dòng sông quê hương hiền hòa uốn lượn quanh những bãi mía, nương dâu xanh mướt. Mặt nước trong veo in bóng những rặng tre rì rào trong gió sớm. Tiếng hò reo vang vọng của lũ trẻ tắm sông lúc hoàng hôn buông xuống làm xao xuyến lòng người.",
      difficultWords: "uốn lượn, xanh mướt, trong veo, rì rào, hoàng hôn, xao xuyến",
      summary: "Bài văn giàu chất thơ miêu tả dòng sông quê và ký ức êm đềm của tuổi thơ.",
    },
    {
      title: "Rừng Cọ Quê Tôi",
      content: "Chẳng đâu đẹp bằng những đồi cọ xanh ngắt của quê tôi. Từng tán cọ xòe tròn như những chiếc ô khổng lồ che mát cả một vùng đồi trung du. Dưới bóng cọ, đàn trâu thong dong gặm cỏ, tiếng suối róc rách hòa cùng tiếng chim ca ríu rít.",
      difficultWords: "đồi cọ, xanh ngắt, khổng lồ, thong dong, róc rách, ríu rít",
      summary: "Văn phong gợi cảm miêu tả vẻ đẹp đặc trưng của rừng cọ miền trung du Bắc Bộ.",
    },
  ],
  5: [
    {
      title: "Kỳ Quan Thiên Nhiên Đất Nước",
      content: "Vịnh Hạ Long sừng sững giữa biển trời mênh mông với hàng ngàn hòn đảo đá vôi nhấp nhô tuyệt đẹp. Nước biển bốn mùa trong xanh như ngọc bích, phản chiếu ánh bình minh rạng ngời. Vẻ đẹp kỳ vĩ và thơ mộng của non sông đất nước luôn là niềm tự hào to lớn của mỗi người dân Việt Nam.",
      difficultWords: "sừng sững, mênh mông, nhấp nhô, ngọc bích, bình minh, kỳ vĩ",
      summary: "Đoạn văn ngợi ca vẻ đẹp hùng vĩ của Vịnh Hạ Long và lòng tự hào dân tộc.",
    },
    {
      title: "Mùa Hoa Tây Bắc",
      content: "Khi làn gió xuân ấm áp tràn về, núi rừng Tây Bắc bừng sáng bởi sắc trắng tinh khôi của hoa ban và sắc thắm rực rỡ của hoa đào rừng. Tiếng khèn bè ngân vang réo rắt bên sườn non như lời mời gọi tha thiết của mùa lễ hội truyền thống.",
      difficultWords: "Tây Bắc, tinh khôi, hoa ban, rực rỡ, khèn bè, réo rắt, tha thiết",
      summary: "Đoạn văn miêu tả vẻ đẹp lộng lẫy, đậm đà bản sắc văn hóa của mùa xuân vùng cao Tây Bắc.",
    },
  ],
}

// POST /api/dictation/generate
// Sáng tác bài đọc chính tả bằng Qwen 2.5 Local (Port 8000)
// Tuyệt đối không dùng Gemini (giữ Gemini độc quyền cho OCR nhận diện chữ viết tay)
export async function POST(req: NextRequest) {
  // 1. Rate Limiting Guard
  const rateLimitResponse = guardAiRoute(req)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = await req.json()
    const {
      gradeLevel = 3,
      topic = "Tình bạn và trường lớp",
      sentenceCount = 4,
      bookSet = "KetNoi",
    } = body

    const grade = Math.max(1, Math.min(5, Number(gradeLevel) || 3))
    const count = Number(sentenceCount) || (grade <= 2 ? 3 : grade === 3 ? 4 : 5)

    // ── TẦNG 1: Gọi Qwen 2.5 SLM Local trên Python Service (Port 8000) ──
    try {
      const qwenUrl = `${VIT5_SERVICE_URL}/qwen/generate-passage`
      const qwenRes = await fetch(qwenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade,
          topic,
          sentence_count: count,
          book_set: bookSet,
        }),
        signal: AbortSignal.timeout(8000), // Timeout an toàn 8s
      })

      if (qwenRes.ok) {
        const data = await qwenRes.json()
        if (data && data.content && data.content.trim().length >= 20) {
          return NextResponse.json({
            success: true,
            passage: {
              title: data.title || `Chính tả: ${topic}`,
              content: data.content,
              difficultWords: data.difficultWords || "",
              summary: data.summary || `Bài đọc chính tả Lớp ${grade} chủ đề ${topic}`,
              gradeLevel: grade,
              topic,
              source: data.source || "qwen2.5_0.5b_local",
            },
          })
        }
      }
    } catch (qwenErr) {
      console.warn("[Qwen Passage] Service timeout hoặc chưa bật, fallback sang kho ngữ liệu SGK:", qwenErr)
    }

    // ── TẦNG 2: Fallback Ngân hàng bài đọc chuẩn GDPT 2018 ──
    const pool = FALLBACK_PEDAGOGICAL_PASSAGES[grade] || FALLBACK_PEDAGOGICAL_PASSAGES[3]
    const selected = pool[Math.floor(Math.random() * pool.length)]

    return NextResponse.json({
      success: true,
      passage: {
        title: selected.title,
        content: selected.content,
        difficultWords: selected.difficultWords,
        summary: selected.summary,
        gradeLevel: grade,
        topic,
        source: "curriculum_bank_fallback",
      },
    })
  } catch (error: any) {
    console.error("[POST /api/dictation/generate]", error)
    return NextResponse.json(
      { error: formatAiErrorMessage(error) },
      { status: 500 }
    )
  }
}
