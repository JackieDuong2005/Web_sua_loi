import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// DELETE /api/grades/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await prisma.grade.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET /api/grades/[id] - lấy chi tiết 1 bài
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const grade = await prisma.grade.findUnique({ where: { id } })
    if (!grade) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 })
    return NextResponse.json({ grade })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
