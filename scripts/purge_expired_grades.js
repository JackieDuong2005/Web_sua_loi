#!/usr/bin/env node
/**
 * ViHand Grade — CLI Script Quản trị Chính sách Lưu trữ & Xóa Dữ liệu Trẻ em
 * (Data Retention & Child Privacy Enforcement Script - Issue #26)
 *
 * Cách dùng:
 *   node scripts/purge_expired_grades.js --preview
 *   node scripts/purge_expired_grades.js --days=365 --mode=anonymize
 *   node scripts/purge_expired_grades.js --days=730 --mode=hard_delete
 */

const { PrismaClient } = require('@prisma/client')
const path = require('path')
const fs = require('fs')

const prisma = new PrismaClient()

async function main() {
  const args = process.argv.slice(2)
  const isPreview = args.includes('--preview')
  
  let days = 365
  const daysArg = args.find(a => a.startsWith('--days='))
  if (daysArg) {
    const parsed = parseInt(daysArg.split('=')[1], 10)
    if (!isNaN(parsed)) days = parsed
  }

  let mode = 'anonymize'
  const modeArg = args.find(a => a.startsWith('--mode='))
  if (modeArg) {
    mode = modeArg.split('=')[1]
  }

  console.log('===============================================================')
  console.log('🛡️  VIHAND GRADE — QUẢN TRỊ LƯU TRỮ DỮ LIỆU HỌC SINH (ISSUE #26)')
  console.log(`⏱️  Tiêu chí: Bài chấm cũ hơn ${days} ngày (hoặc đã quá expiresAt)`)
  console.log(`🔧 Chế độ xử lý: ${isPreview ? 'XEM TRƯỚC (PREVIEW)' : mode.toUpperCase()}`)
  console.log('===============================================================')

  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const now = new Date()

  const targetGrades = await prisma.grade.findMany({
    where: {
      OR: [
        { expiresAt: { lt: now } },
        { createdAt: { lt: cutoffDate } },
      ],
      ...(mode === 'anonymize' ? { isAnonymized: false } : {}),
    },
    select: {
      id: true,
      studentName: true,
      className: true,
      imagePath: true,
      createdAt: true,
      isAnonymized: true,
    }
  })

  console.log(`📊 Tìm thấy: ${targetGrades.length} bài chấm thuộc diện xử lý.`)

  if (targetGrades.length === 0) {
    console.log('✅ Hệ thống sạch sẽ! Không có dữ liệu nào cần dọn dẹp.')
    return
  }

  let freedBytes = 0
  let filesCount = 0

  for (const g of targetGrades) {
    if (g.imagePath) {
      const fullPath = path.join(process.cwd(), 'public', g.imagePath.replace(/^\//, ''))
      try {
        if (fs.existsSync(fullPath)) {
          const stat = fs.statSync(fullPath)
          freedBytes += stat.size
          filesCount++

          if (!isPreview) {
            fs.unlinkSync(fullPath)
          }
        }
      } catch (err) {
        console.warn(`⚠️ Không thể xử lý file: ${fullPath}`, err.message)
      }
    }

    if (!isPreview && mode === 'anonymize') {
      const year = g.createdAt ? g.createdAt.getFullYear() : new Date().getFullYear()
      await prisma.grade.update({
        where: { id: g.id },
        data: {
          studentName: `Học sinh ẩn danh [Niên khóa ${year}-${year + 1}]`,
          imageBase64: '',
          imagePath: '',
          isAnonymized: true,
          anonymizedAt: new Date(),
        }
      })
    }
  }

  if (!isPreview && mode === 'hard_delete') {
    const ids = targetGrades.map(g => g.id)
    const del = await prisma.grade.deleteMany({
      where: { id: { in: ids } }
    })
    console.log(`🗑️  Đã xóa triệt để ${del.count} bản ghi trong SQLite.`)
  }

  const freedMB = (freedBytes / (1024 * 1024)).toFixed(2)

  console.log('---------------------------------------------------------------')
  if (isPreview) {
    console.log(`🔍 [KẾT QUẢ XEM TRƯỚC]:`)
    console.log(`- Số bài thi sẽ xử lý: ${targetGrades.length}`)
    console.log(`- Số file ảnh vật lý sẽ dọn: ${filesCount}`)
    console.log(`- Dung lượng ổ đĩa ước tính giải phóng: ${freedMB} MB (${freedBytes} bytes)`)
    console.log(`👉 Chạy lệnh không có '--preview' để thực hiện thật.`)
  } else {
    console.log(`🎉 [HOÀN TẤT DỌN DẸP]:`)
    console.log(`- Số bản ghi đã xử lý: ${targetGrades.length}`)
    console.log(`- Số file ảnh đã xóa khỏi ổ đĩa: ${filesCount}`)
    console.log(`- Tổng dung lượng ổ đĩa đã giải phóng: ${freedMB} MB`)
    console.log(`- Quyền riêng tư của học sinh đã được bảo vệ theo Nghị định 13/2023/NĐ-CP.`)
  }
  console.log('===============================================================')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
