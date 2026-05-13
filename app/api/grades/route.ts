import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

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

    // Parse điểm số (ví dụ "7.5/10" → 7.5)
    const scoreNum = parseFloat(score.split("/")[0]) || 0

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
        feedback: feedback || "",
        overallRating: overallRating || "",
        processingTimeMs: processingTimeMs || 0,
        tokenCount: tokenCount || 0,
        imageBase64: imageBase64 || "",
      },
    })

    return NextResponse.json({ grade }, { status: 201 })
  } catch (error: any) {
    console.error("POST /api/grades error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
