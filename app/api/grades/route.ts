import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { promises as fs } from "fs"
import path from "path"

// ============================================================
// LƯU TRỮ ẢNH TRÊN ĐĨA (Issue #11 — SQLite Image Bloat Fix)
// Lưu ảnh vật lý vào public/uploads/grades/ và chỉ lưu đường dẫn tương đối trong DB
// ============================================================
async function saveImageToDisk(imageBase64: string): Promise<string> {
  if (!imageBase64 || typeof imageBase64 !== "string") return ""
  try {
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "")
    if (!base64Data || base64Data.length < 50) return ""

    const buffer = Buffer.from(base64Data, "base64")
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "grades")
    await fs.mkdir(uploadsDir, { recursive: true })

    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.jpg`
    const filepath = path.join(uploadsDir, filename)
    await fs.writeFile(filepath, buffer)

    return `/uploads/grades/${filename}`
  } catch (err) {
    console.error("[Grade] Lỗi khi lưu ảnh ra đĩa:", err)
    return ""
  }
}

// GET /api/grades - lấy danh sách điểm
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search") || ""
    const className = searchParams.get("class") || ""
    const assignmentTitle = searchParams.get("assignment") || ""

    const grades = await prisma.grade.findMany({
      where: {
        AND: [
          search ? {
            OR: [
              { studentName: { contains: search } },
              { assignmentTitle: { contains: search } },
            ],
          } : {},
          className ? { className: { contains: className } } : {},
          assignmentTitle && assignmentTitle !== "all"
            ? { assignmentTitle: { contains: assignmentTitle } }
            : {},
        ],
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ grades })
  } catch (error: any) {
    console.error("GET /api/grades error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/grades - lưu một bài chấm điểm
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      studentName,
      assignmentTitle,
      className,
      originalText,
      fixedText,
      corrections,
      score,
      scoreBreakdown,
      feedback,
      overallRating,
      processingTimeMs,
      tokenCount,
      imageBase64,
    } = body

    // Validate bắt buộc
    if (!studentName || !score || !originalText) {
      return NextResponse.json(
        { error: "Thiếu thông tin bắt buộc: studentName, score, originalText" },
        { status: 400 }
      )
    }

    // ============================================================
    // SINGLE SOURCE OF TRUTH — Issue #5
    // scoreNum luôn được server tự tính từ chuỗi score (VD: "7.5/10" → 7.5).
    // Client KHÔNG gửi scoreNum và server KHÔNG đọc scoreNum từ request body.
    // Điều này đảm bảo score (String) và scoreNum (Float) KHÔNG BAO GIỜ bị lệch nhau.
    // ============================================================
    const scoreNum = parseFloat(score.split("/")[0]) || 0

    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 10) {
      return NextResponse.json(
        { error: `Định dạng điểm không hợp lệ: '${score}'. Dự kiến dạng 'X.X/10'.` },
        { status: 400 }
      )
    }

    // ============================================================
    // LƯU ẢNH RA ĐĨA — Issue #11
    // ============================================================
    let imagePath = ""
    if (imageBase64 && typeof imageBase64 === "string" && imageBase64.length > 50) {
      imagePath = await saveImageToDisk(imageBase64)
    }

    const grade = await prisma.grade.create({
      data: {
        studentName: studentName || "Học sinh",
        assignmentTitle: assignmentTitle || "Bài viết",
        className: className || "",
        originalText,
        fixedText: fixedText || "",
        corrections: JSON.stringify(corrections || []),
        score,
        scoreNum,
        scoreBreakdown: scoreBreakdown ? JSON.stringify(scoreBreakdown) : "",
        feedback: feedback || "",
        overallRating: overallRating || "",
        processingTimeMs: processingTimeMs || 0,
        tokenCount: tokenCount || 0,
        imageBase64: imageBase64 || "",
        imagePath: imagePath || "",
      },
    })

    return NextResponse.json({ grade }, { status: 201 })
  } catch (error: any) {
    console.error("POST /api/grades error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

