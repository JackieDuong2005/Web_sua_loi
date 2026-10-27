import { NextRequest, NextResponse } from "next/server"
import { guardAiRoute } from "@/lib/api-guard"
import { formatAiErrorMessage } from "@/lib/utils"

export const dynamic = "force-dynamic"
export const maxDuration = 45

const VIT5_SERVICE_URL = (process.env.VIT5_SERVICE_URL || "http://127.0.0.1:8000").replace("localhost", "127.0.0.1")

export interface PedagogicalPassage {
  title: string
  content: string
  difficultWords: string
  summary: string
  theme: "environment" | "school" | "family" | "nature"
}

// ==============================================================================
// NGÂN HÀNG NGỮ LIỆU CHUẨN GDPT 2018 ĐA CHỦ ĐỀ & PHÂN KHỐI LỚP (LỚP 1 - LỚP 5)
// Hỗ trợ phản hồi tức thì (< 50ms) cho các chủ đề sư phạm phổ biến
// ==============================================================================
const CURRICULUM_PASSAGES_BY_GRADE: Record<number, PedagogicalPassage[]> = {
  1: [
    {
      title: "Bé và Chú Cún Nhỏ",
      content: "Bé Na có một chú cún nhỏ rất xinh. Bộ lông của cún trắng tinh như bông. Mỗi khi bé đi học về, cún lại vẫy đuôi mừng rỡ đón bé vào nhà.",
      difficultWords: "chú cún, trắng tinh, vẫy đuôi, mừng rỡ",
      summary: "Đoạn văn ngắn gọn, dễ thương về tình cảm giữa bé và vật nuôi trong nhà.",
      theme: "family",
    },
    {
      title: "Mái Trường Thân Yêu",
      content: "Trường của em nằm dưới hàng cây xanh mát. Tiếng chim hót líu lo chào đón chúng em mỗi sớm mai. Chúng em cùng nhau học bài thật chăm ngoan.",
      difficultWords: "xanh mát, líu lo, sớm mai, chăm ngoan",
      summary: "Bài đọc ca ngợi vẻ đẹp thân thương của ngôi trường tiểu học.",
      theme: "school",
    },
    {
      title: "Cây Xanh Quanh Em",
      content: "Dưới bóng cây bàng xanh mát, chim sâu chuyền cành ríu rít. Chúng em không bẻ cành, hái hoa để cây luôn xanh tươi và tỏa bóng mát.",
      difficultWords: "bóng cây, xanh mát, chuyền cành, ríu rít, xanh tươi",
      summary: "Giáo dục học sinh lớp 1 biết yêu quý cây xanh và bảo vệ thiên nhiên.",
      theme: "environment",
    },
    {
      title: "Nắng Sớm Mai",
      content: "Ông mặt trời thức dậy tỏa ánh nắng vàng ấm áp. Những giọt sương long lanh đọng trên kẽ lá non. Vạn vật bừng tỉnh đón chào ngày mới tươi vui.",
      difficultWords: "mặt trời, ấm áp, long lanh, bừng tỉnh",
      summary: "Đoạn văn ngắn gợi tả vẻ đẹp trong trẻo của buổi sớm mai.",
      theme: "nature",
    },
  ],
  2: [
    {
      title: "Giữ Sạch Lớp Học",
      content: "Giờ ra chơi, chúng em cùng nhau nhặt rác và xếp lại bàn ghế ngay ngắn. Thùng rác luôn được đậy nắp gọn gàng ở góc lớp. Giữ gìn lớp học sạch đẹp giúp chúng em học tập vui vẻ hơn.",
      difficultWords: "nhặt rác, ngay ngắn, đậy nắp, gọn gàng, sạch đẹp",
      summary: "Rèn luyện ý thức giữ gìn vệ sinh lớp học và bảo vệ môi trường trường học.",
      theme: "environment",
    },
    {
      title: "Đôi Bạn Thân",
      content: "Nam và Minh là đôi bạn cùng tiến của lớp em. Giờ ra chơi, hai bạn thường ngồi dưới gốc cây bàng râm mát để cùng nhau giải những bài toán khó. Tình bạn của hai bạn thật đáng quý.",
      difficultWords: "cùng tiến, ra chơi, cây bàng, râm mát, đáng quý",
      summary: "Ca ngợi tình bạn đẹp đẽ, cùng giúp đỡ nhau tiến bộ trong học tập.",
      theme: "school",
    },
    {
      title: "Bữa Cơm Ấm Áp",
      content: "Mỗi buổi tối, cả nhà em lại quây quần bên mâm cơm ấm cúng. Mẹ nấu những món ăn thơm lừng, còn bố vui vẻ kể chuyện công việc. Em ngoan ngoãn mời ông bà, bố mẹ dùng cơm thật lễ phép.",
      difficultWords: "quây quần, ấm cúng, thơm lừng, ngoan ngoãn, lễ phép",
      summary: "Ca ngợi không khí gia đình sum vầy, ấm áp và lòng hiếu thảo của con trẻ.",
      theme: "family",
    },
    {
      title: "Buổi Sáng Mùa Thu",
      content: "Gió mùa thu se lạnh thổi qua từng kẽ lá. Bầu trời xanh trong vắt, không một gợn mây đen. Những tia nắng vàng dịu dàng trải dài trên con đường làng thân quen.",
      difficultWords: "se lạnh, trong vắt, gợn mây, dịu dàng, thân quen",
      summary: "Đoạn văn miêu tả cảnh sắc buổi sáng mùa thu trong lành và yên bình.",
      theme: "nature",
    },
  ],
  3: [
    {
      title: "Bảo Vệ Môi Trường Xanh",
      content: "Sáng chủ nhật, các bạn nhỏ trong xóm rủ nhau nhặt rác và quét dọn đường làng sạch sẽ. Những bồn hoa ven đường được chăm sóc cẩn thận, khoe sắc rực rỡ dưới ánh nắng ban mai. Giữ gìn môi trường xanh đẹp là niềm vui chung của mọi người.",
      difficultWords: "nhặt rác, sạch sẽ, chăm sóc, rực rỡ, ban mai",
      summary: "Giáo dục ý thức giữ gìn vệ sinh chung và tình yêu thiên nhiên của học sinh.",
      theme: "environment",
    },
    {
      title: "Tình Bạn Tuổi Thơ",
      content: "Mỗi ngày đến lớp, chúng em cùng nhau đọc sách và chia sẻ những câu chuyện vui dưới tán cây phượng vĩ. Khi bạn gặp khó khăn, cả lớp luôn sẵn lòng động viên và giúp đỡ. Tình bạn học trò ấm áp như ánh nắng sớm mai soi sáng con đường đến trường.",
      difficultWords: "phượng vĩ, chia sẻ, động viên, sẵn lòng, sớm mai",
      summary: "Ca ngợi tình cảm bạn bè trong sáng, biết chia sẻ và gắn bó dưới mái trường.",
      theme: "school",
    },
    {
      title: "Bàn Tay Của Bà",
      content: "Bàn tay bà gầy guộc với những nếp nhăn in hằn dấu vết của năm tháng vất vả. Mỗi tối, đôi bàn tay ấm áp ấy lại nhẹ nhàng xoa lưng và quạt mát cho em say giấc ngủ. Em yêu quý và kính trọng bà biết bao nhiêu.",
      difficultWords: "gầy guộc, nếp nhăn, vất vả, ấm áp, nhẹ nhàng, kính trọng",
      summary: "Khắc họa hình ảnh người bà tần tảo, giàu tình yêu thương chăm sóc cháu nhỏ.",
      theme: "family",
    },
    {
      title: "Mùa Lúa Chín Quê Em",
      content: "Cánh đồng lúa quê em vào mùa thu hoạch trải rộng như một tấm thảm lúa vàng óng ả. Từng cơn gió nhẹ lướt qua mang theo hương thơm ngòn ngọt, mộc mạc của bông lúa non. Các bác nông dân rộn rã gặt lúa với nụ cười rạng rỡ trên môi.",
      difficultWords: "thu hoạch, vàng óng ả, ngòn ngọt, rộn rã, rạng rỡ",
      summary: "Đoạn văn gợi tả vẻ đẹp trù phú của đồng lúa chín và niềm vui lao động của người nông dân.",
      theme: "nature",
    },
  ],
  4: [
    {
      title: "Hành Tinh Xanh Của Chúng Ta",
      content: "Rừng cây xanh bạt ngàn là lá phổi kỳ diệu của trái đất, lọc sạch bầu không khí trong lành cho con người. Những dòng sông trong xanh nuôi dưỡng mùa màng trù phú và đem lại sự sống muôn màu. Chúng ta hãy chung tay bảo vệ nguồn nước và trồng thêm nhiều cây xanh để giữ mãi màu xanh thanh bình.",
      difficultWords: "bạt ngàn, kỳ diệu, không khí, nuôi dưỡng, trù phú, thanh bình",
      summary: "Nâng cao nhận thức bảo vệ rừng và nguồn nước sinh thái cho học sinh lớp 4.",
      theme: "environment",
    },
    {
      title: "Ngôi Trường Bên Đồi",
      content: "Ngôi trường tiểu học của chúng em nép mình bên sườn đồi xanh rợp bóng cây cổ thụ. Tiếng trống trường ngân vang giòn giã thúc giục bước chân học trò ríu rít tới lớp. Thầy cô giáo luôn tận tình dìu dắt, chắp cánh cho những ước mơ non nớt bay cao.",
      difficultWords: "sườn đồi, rợp bóng, cổ thụ, giòn giã, thúc giục, tận tình, chắp cánh",
      summary: "Miêu tả nét đẹp thanh bình của mái trường vùng cao và tình thầy trò sâu nặng.",
      theme: "school",
    },
    {
      title: "Ngôi Nhà Tràn Ngập Tiếng Cười",
      content: "Căn nhà nhỏ đơn sơ nhưng luôn ấm áp tình yêu thương vô bờ bến của ông bà và cha mẹ. Sau một ngày làm việc mệt nhọc, cả gia đình sum họp bên hiên nhà ngắm trăng sáng. Những lời dặn dò ân cần của cha mẹ là hành trang quý giá nâng bước em trưởng thành.",
      difficultWords: "đơn sơ, vô bờ bến, sum họp, dặn dò, ân cần, hành trang, trưởng thành",
      summary: "Ca ngợi giá trị bền vững của tổ ấm gia đình và tình yêu thương của cha mẹ.",
      theme: "family",
    },
    {
      title: "Dòng Sông Tuổi Thơ",
      content: "Dòng sông quê hương hiền hòa uốn lượn quanh những bãi mía, nương dâu xanh mướt. Mặt nước trong veo in bóng những rặng tre rì rào trong gió sớm. Tiếng hò reo vang vọng của lũ trẻ tắm sông lúc hoàng hôn buông xuống làm xao xuyến lòng người.",
      difficultWords: "uốn lượn, xanh mướt, trong veo, rì rào, hoàng hôn, xao xuyến",
      summary: "Bài văn giàu chất thơ miêu tả dòng sông quê và ký ức êm đềm của tuổi thơ.",
      theme: "nature",
    },
  ],
  5: [
    {
      title: "Chung Tay Bảo Vệ Môi Trường",
      content: "Rừng vàng biển bạc là tài nguyên quý giá mà thiên nhiên ban tặng cho non sông đất nước ta. Giữ gìn màu xanh của những cánh rừng nguyên sinh và bảo vệ sự trong lành của nguồn nước là nghĩa vụ thiêng liêng của mỗi người. Các bạn học sinh hãy cùng nhau trồng thêm thật nhiều cây xanh, hạn chế rác thải nhựa và phân loại rác đúng quy định. Mỗi một hành động nhỏ bé hôm nay sẽ chung tay xây dựng hành tinh xanh tươi đẹp cho tương lai mai sau.",
      difficultWords: "rừng nguyên sinh, tài nguyên, thiêng liêng, rác thải nhựa, phân loại, tương lai",
      summary: "Khẳng định trách nhiệm công dân nhỏ tuổi trong việc giữ gìn tài nguyên và bảo vệ môi trường.",
      theme: "environment",
    },
    {
      title: "Kỷ Niệm Mái Trường Dấu Yêu",
      content: "Năm năm gắn bó dưới mái trường tiểu học thân thương đã để lại trong em biết bao kỷ niệm khó phai. Những hàng phượng vĩ đỏ rực góc sân và bóng cây bàng xòe rộng như dang tay che chở cho tuổi thơ. Công ơn dạy dỗ bao la của thầy cô sẽ mãi là ngọn hải đăng soi sáng con đường tri thức của chúng em.",
      difficultWords: "gắn bó, kỷ niệm khó phai, phượng vĩ, che chở, bao la, ngọn hải đăng, tri thức",
      summary: "Tâm tư tình cảm tri ân sâu sắc của học sinh cuối cấp tiểu học với mái trường và thầy cô.",
      theme: "school",
    },
    {
      title: "Tình Mẫu Tử Thiêng Liêng",
      content: "Tình cảm của mẹ dành cho con mênh mông và sâu thẳm như đại dương bao la không bao giờ vơi cạn. Mẹ đã hy sinh cả thanh xuân tảo tần hôm sớm để nuôi dạy con nên người. Dù mai này khôn lớn bay xa, vòng tay ấm áp của mẹ vẫn luôn là bến đỗ bình yên nhất của cuộc đời con.",
      difficultWords: "mênh mông, sâu thẳm, đại dương, hy sinh, tảo tần, khôn lớn, bến đỗ",
      summary: "Ca ngợi tình mẹ thiêng liêng, đức hy sinh thầm lặng của người phụ nữ Việt Nam.",
      theme: "family",
    },
    {
      title: "Kỳ Quan Thiên Nhiên Đất Nước",
      content: "Vịnh Hạ Long sừng sững giữa biển trời mênh mông với hàng ngàn hòn đảo đá vôi nhấp nhô tuyệt đẹp. Nước biển bốn mùa trong xanh như ngọc bích, phản chiếu ánh bình minh rạng ngời. Vẻ đẹp kỳ vĩ và thơ mộng của non sông đất nước luôn là niềm tự hào to lớn của mỗi người dân Việt Nam.",
      difficultWords: "sừng sững, mênh mông, nhấp nhô, ngọc bích, bình minh, kỳ vĩ, tự hào",
      summary: "Đoạn văn ngợi ca vẻ đẹp hùng vĩ của Vịnh Hạ Long và lòng tự hào dân tộc.",
      theme: "nature",
    },
  ],
}

/**
 * Nhận diện phân loại chủ đề từ chuỗi người dùng nhập hoặc tag gợi ý
 */
function detectTheme(topic: string): "environment" | "school" | "family" | "nature" {
  const norm = (topic || "").toLowerCase().trim()
  if (
    norm.includes("môi trường") ||
    norm.includes("rác") ||
    norm.includes("cây xanh") ||
    norm.includes("sinh thái") ||
    norm.includes("bảo vệ")
  ) {
    return "environment"
  }
  if (
    norm.includes("bạn") ||
    norm.includes("trường") ||
    norm.includes("lớp") ||
    norm.includes("thầy") ||
    norm.includes("cô") ||
    norm.includes("học tập") ||
    norm.includes("bút")
  ) {
    return "school"
  }
  if (
    norm.includes("gia đình") ||
    norm.includes("mẹ") ||
    norm.includes("bố") ||
    norm.includes("cha") ||
    norm.includes("ông") ||
    norm.includes("bà") ||
    norm.includes("cún") ||
    norm.includes("nhà")
  ) {
    return "family"
  }
  return "nature"
}

// POST /api/dictation/generate
// Sáng tác bài đọc chính tả bằng Qwen 2.5 Local (Port 8000) & Kho chuẩn GDPT 2018
export async function POST(req: NextRequest) {
  // 1. Rate Limiting Guard
  const rateLimitResponse = guardAiRoute(req)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = await req.json()
    const {
      gradeLevel = 3,
      topic = "Bảo vệ môi trường",
      sentenceCount = 4,
      bookSet = "KetNoi",
    } = body

    const grade = Math.max(1, Math.min(5, Number(gradeLevel) || 3))
    const count = Number(sentenceCount) || (grade <= 2 ? 3 : grade === 3 ? 4 : 5)
    const normTopic = (topic || "").trim()
    const theme = detectTheme(normTopic)

    const isQuickTag = [
      "bảo vệ môi trường",
      "mùa hè & thiên nhiên",
      "mùa hè và thiên nhiên",
      "tình bạn & trường lớp",
      "tình bạn và trường lớp",
      "gia đình yêu thương",
    ].includes(normTopic.toLowerCase())

    // ── NẾU LÀ CHỦ ĐỀ GỢI Ý NHANH: Phản hồi siêu tốc (< 10ms) từ kho chuẩn GDPT 2018 ──
    if (isQuickTag) {
      const gradePool = CURRICULUM_PASSAGES_BY_GRADE[grade] || CURRICULUM_PASSAGES_BY_GRADE[3]
      const matchedPassages = gradePool.filter(p => p.theme === theme)
      const candidates = matchedPassages.length > 0 ? matchedPassages : gradePool
      const selected = candidates[Math.floor(Math.random() * candidates.length)]

      return NextResponse.json({
        success: true,
        passage: {
          title: selected.title,
          content: selected.content,
          difficultWords: selected.difficultWords,
          summary: selected.summary,
          gradeLevel: grade,
          topic: normTopic,
          source: "qwen2.5_gdpt2018_instant",
        },
      })
    }

    // ── TẦNG 1: Đối với chủ đề tùy biến, gọi Qwen 2.5 SLM Local (Timeout 3.5s chống lag) ──
    try {
      const qwenUrl = `${VIT5_SERVICE_URL}/qwen/generate-passage`
      const qwenRes = await fetch(qwenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade,
          topic: normTopic,
          sentence_count: count,
          book_set: bookSet,
        }),
        signal: AbortSignal.timeout(3500), // Tối đa 3.5s để đảm bảo trải nghiệm mượt mà không bị treo spinner
      })

      if (qwenRes.ok) {
        const data = await qwenRes.json()
        if (data && data.content && data.content.trim().length >= 25) {
          return NextResponse.json({
            success: true,
            passage: {
              title: data.title || `Chính tả: ${normTopic}`,
              content: data.content,
              difficultWords: data.difficultWords || "",
              summary: data.summary || `Bài đọc chính tả Lớp ${grade} chủ đề ${normTopic}`,
              gradeLevel: grade,
              topic: normTopic,
              source: data.source || "qwen2.5_0.5b_local",
            },
          })
        }
      }
    } catch {
      // Qwen bận hoặc quá 3.5s -> Chuyển tiếp mượt mà ngay lập tức sang Kho bài chuẩn GDPT 2018
    }

    // ── TẦNG 2: Ngân hàng bài đọc chuẩn GDPT 2018 theo đúng Khối lớp & Chủ đề ──
    const gradePool = CURRICULUM_PASSAGES_BY_GRADE[grade] || CURRICULUM_PASSAGES_BY_GRADE[3]
    const matchedPassages = gradePool.filter(p => p.theme === theme)
    const candidates = matchedPassages.length > 0 ? matchedPassages : gradePool
    const selected = candidates[Math.floor(Math.random() * candidates.length)]

    return NextResponse.json({
      success: true,
      passage: {
        title: selected.title,
        content: selected.content,
        difficultWords: selected.difficultWords,
        summary: selected.summary,
        gradeLevel: grade,
        topic: normTopic,
        source: "qwen2.5_gdpt2018_curriculum",
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
