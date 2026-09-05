const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Hàm làm sạch chuỗi tiếng Việt chuẩn: xóa các dấu phẩy/nháy/backtick bị chèn tách giữa từ
function cleanVietnameseText(text) {
  if (!text) return ''
  return text
    .normalize('NFC')
    // Xóa ký tự backtick hoặc dấu nháy hoặc dấu thanh rời rạc bị chèn giữa các chữ cái
    .replace(/([a-zA-Zà-ỹÀ-ỸđĐ])[`'´ˊˋ~ˀʼ’ʽ]([a-zA-Zà-ỹÀ-ỸđĐ])/g, '$1$2')
    .replace(/([a-zA-Zà-ỹÀ-ỸđĐ])\s*[`'´ˊˋ~ˀʼ’ʽ]\s*([a-zA-Zà-ỹÀ-ỸđĐ])/g, '$1$2')
    // Chuẩn hóa khoảng trắng
    .replace(/\s+/g, ' ')
    .trim()
}

async function main() {
  const sessions = await prisma.dictationSession.findMany()
  console.log(`Found ${sessions.length} sessions`)

  for (const s of sessions) {
    console.log(`Original [${s.title}]:`, JSON.stringify(s.passage))
    const cleanedTitle = cleanVietnameseText(s.title)
    const cleanedPassage = cleanVietnameseText(s.passage)
    
    console.log(`Cleaned  [${cleanedTitle}]:`, JSON.stringify(cleanedPassage))

    await prisma.dictationSession.update({
      where: { id: s.id },
      data: {
        title: cleanedTitle,
        passage: cleanedPassage,
      },
    })
  }

  const passages = await prisma.textbookPassage.findMany()
  for (const p of passages) {
    await prisma.textbookPassage.update({
      where: { id: p.id },
      data: {
        title: cleanVietnameseText(p.title),
        content: cleanVietnameseText(p.content),
        difficultWords: cleanVietnameseText(p.difficultWords || ''),
      },
    })
  }

  console.log('Successfully cleaned all database passages!')
}

main().catch(console.error).finally(() => prisma.$disconnect())
