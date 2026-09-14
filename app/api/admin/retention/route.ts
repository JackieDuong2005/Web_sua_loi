import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import path from "path"
import fs from "fs"

// ============================================================
// API Quản trị Chính sách Lưu trữ & Quyền riêng tư Trẻ em (Issue #26)
// Hỗ trợ Soft Purge (Ẩn danh hóa & xóa ảnh nặng) và Hard Delete
// ============================================================

export async function GET(req: NextRequest) {
  try {
    const now = new Date()
    const totalGrades = await prisma.grade.count()
    const anonymizedGrades = await prisma.grade.count({ where: { isAnonymized: true } })

    // Bài chấm đã quá hạn (expiresAt < now hoặc quá 365 ngày mà chưa ẩn danh)
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
    const expiredCandidates = await prisma.grade.findMany({
      where: {
        isAnonymized: false,
        OR: [
          { expiresAt: { lt: now } },
          { expiresAt: null, createdAt: { lt: oneYearAgo } },
        ],
      },
      select: { id: true, imagePath: true, createdAt: true },
    })

    let estimatedBytes = 0
    for (const item of expiredCandidates) {
      if (item.imagePath) {
        const fullDiskPath = path.join(process.cwd(), "public", item.imagePath.replace(/^\//, ""))
        try {
          if (fs.existsSync(fullDiskPath)) {
            const stat = fs.statSync(fullDiskPath)
            estimatedBytes += stat.size
          }
        } catch {
          // Bỏ qua lỗi truy cập file đơn lẻ
        }
      }
    }

    return NextResponse.json({
      success: true,
      policy: {
        retentionDaysDefault: 365,
        description: "Chính sách lưu trữ 1 niên khóa (365 ngày), tự động ẩn danh hóa và dọn dẹp ảnh để bảo vệ quyền riêng tư trẻ em theo Nghị định 13/2023/NĐ-CP.",
      },
      stats: {
        totalGrades,
        activeGrades: totalGrades - anonymizedGrades,
        anonymizedGrades,
        expiredGradesCount: expiredCandidates.length,
        estimatedFreedDiskBytes: estimatedBytes,
        estimatedFreedDiskMB: +(estimatedBytes / (1024 * 1024)).toFixed(2),
      },
    })
  } catch (error: any) {
    console.error("GET /api/admin/retention error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const action = body.action || "anonymize" // "preview" | "anonymize" | "hard_delete"
    const retentionDays = typeof body.retentionDays === "number" ? body.retentionDays : (parseInt(body.retentionDays, 10) || 365)

    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)
    const now = new Date()

    // Tìm các bài thi thuộc diện xử lý
    const targetGrades = await prisma.grade.findMany({
      where: {
        OR: [
          { expiresAt: { lt: now } },
          { createdAt: { lt: cutoffDate } },
        ],
        ...(action === "anonymize" ? { isAnonymized: false } : {}),
      },
      select: {
        id: true,
        imagePath: true,
        studentName: true,
        className: true,
        createdAt: true,
        isAnonymized: true,
      },
    })

    let freedBytes = 0
    let filesDeletedCount = 0

    if (action === "preview") {
      for (const item of targetGrades) {
        if (item.imagePath) {
          const fullDiskPath = path.join(process.cwd(), "public", item.imagePath.replace(/^\//, ""))
          try {
            if (fs.existsSync(fullDiskPath)) {
              freedBytes += fs.statSync(fullDiskPath).size
              filesDeletedCount++
            }
          } catch {}
        }
      }
      return NextResponse.json({
        success: true,
        mode: "preview",
        retentionDays,
        targetCount: targetGrades.length,
        estimatedFreedFiles: filesDeletedCount,
        estimatedFreedBytes: freedBytes,
        estimatedFreedMB: +(freedBytes / (1024 * 1024)).toFixed(2),
      })
    }

    // Xóa file ảnh vật lý trên đĩa
    for (const item of targetGrades) {
      if (item.imagePath) {
        const fullDiskPath = path.join(process.cwd(), "public", item.imagePath.replace(/^\//, ""))
        try {
          if (fs.existsSync(fullDiskPath)) {
            const size = fs.statSync(fullDiskPath).size
            await fs.promises.unlink(fullDiskPath)
            freedBytes += size
            filesDeletedCount++
          }
        } catch (e) {
          console.warn(`[Retention] Không thể xóa file ${fullDiskPath}:`, e)
        }
      }
    }

    if (action === "anonymize") {
      // Ẩn danh hóa từng bản ghi: xóa nét chữ và họ tên, bảo lưu điểm & danh mục lỗi ngữ âm
      for (const item of targetGrades) {
        const year = item.createdAt ? item.createdAt.getFullYear() : new Date().getFullYear()
        await prisma.grade.update({
          where: { id: item.id },
          data: {
            studentName: `Học sinh ẩn danh [Niên khóa ${year}-${year + 1}]`,
            imageBase64: "",
            imagePath: "",
            isAnonymized: true,
            anonymizedAt: new Date(),
          },
        })
      }

      return NextResponse.json({
        success: true,
        action: "anonymize",
        processedCount: targetGrades.length,
        filesDeletedCount,
        freedBytes,
        freedMB: +(freedBytes / (1024 * 1024)).toFixed(2),
        message: `Đã ẩn danh hóa ${targetGrades.length} bài chấm cũ và xóa ${filesDeletedCount} ảnh đĩa thành công!`,
      })
    }

    if (action === "hard_delete") {
      // Xóa hoàn toàn khỏi CSDL
      const ids = targetGrades.map((g) => g.id)
      const deleteResult = await prisma.grade.deleteMany({
        where: { id: { in: ids } },
      })

      return NextResponse.json({
        success: true,
        action: "hard_delete",
        deletedCount: deleteResult.count,
        filesDeletedCount,
        freedBytes,
        freedMB: +(freedBytes / (1024 * 1024)).toFixed(2),
        message: `Đã xóa vĩnh viễn ${deleteResult.count} bản ghi và ${filesDeletedCount} file ảnh khỏi hệ thống!`,
      })
    }

    return NextResponse.json({ error: `Action '${action}' không hợp lệ. Hỗ trợ: 'preview', 'anonymize', 'hard_delete'` }, { status: 400 })
  } catch (error: any) {
    console.error("POST /api/admin/retention error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
