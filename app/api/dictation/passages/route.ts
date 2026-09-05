import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// ============================================================
// GET /api/dictation/passages?gradeLevel=3&bookSet=KetNoi&q=...
// Lấy danh sách bài đọc SGK trong kho ngữ liệu
// ============================================================
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const gradeLevel = searchParams.get("gradeLevel")
    const bookSet = searchParams.get("bookSet")
    const search = searchParams.get("q")

    const passages = await prisma.textbookPassage.findMany({
      where: {
        ...(gradeLevel && { gradeLevel: Number(gradeLevel) }),
        ...(bookSet && { bookSet }),
        ...(search && {
          OR: [
            { title: { contains: search } },
            { content: { contains: search } },
          ],
        }),
      },
      orderBy: [{ gradeLevel: "asc" }, { unit: "asc" }],
    })

    return NextResponse.json({ passages })
  } catch (error) {
    console.error("[GET /api/dictation/passages]", error)
    return NextResponse.json({ error: "Không thể lấy kho ngữ liệu" }, { status: 500 })
  }
}

// ============================================================
// POST /api/dictation/passages
// Thêm bài đọc mới vào kho ngữ liệu SGK
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { gradeLevel, bookSet, unit, title, content, difficultWords } = body

    if (!title || !content) {
      return NextResponse.json({ error: "Tiêu đề và nội dung bài đọc là bắt buộc" }, { status: 400 })
    }

    const passage = await prisma.textbookPassage.create({
      data: {
        gradeLevel: Number(gradeLevel) || 3,
        bookSet: bookSet || "KetNoi",
        unit: unit || "Tuần 1",
        title,
        content,
        difficultWords: difficultWords || "",
      },
    })

    return NextResponse.json({ passage }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/dictation/passages]", error)
    return NextResponse.json({ error: "Không thể thêm bài đọc" }, { status: 500 })
  }
}

// ============================================================
// PATCH /api/dictation/passages
// Cập nhật thông tin bài đọc
// ============================================================
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, title, content, difficultWords, unit, gradeLevel, bookSet } = body

    if (!id) {
      return NextResponse.json({ error: "id là bắt buộc" }, { status: 400 })
    }

    const passage = await prisma.textbookPassage.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(content && { content }),
        ...(difficultWords !== undefined && { difficultWords }),
        ...(unit && { unit }),
        ...(gradeLevel !== undefined && { gradeLevel: Number(gradeLevel) }),
        ...(bookSet && { bookSet }),
      },
    })

    return NextResponse.json({ passage })
  } catch (error) {
    console.error("[PATCH /api/dictation/passages]", error)
    return NextResponse.json({ error: "Không thể cập nhật bài đọc" }, { status: 500 })
  }
}

// ============================================================
// DELETE /api/dictation/passages?id=xxx
// Xóa bài đọc khỏi kho ngữ liệu
// ============================================================
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "id là bắt buộc" }, { status: 400 })
    }

    await prisma.textbookPassage.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[DELETE /api/dictation/passages]", error)
    return NextResponse.json({ error: "Không thể xoá bài đọc" }, { status: 500 })
  }
}
