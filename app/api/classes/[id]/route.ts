import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// DELETE /api/classes/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await prisma.class.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH /api/classes/[id] - cập nhật lớp
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await req.json()
    const cls = await prisma.class.update({
      where: { id },
      data: body,
    })
    return NextResponse.json({ class: cls })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
