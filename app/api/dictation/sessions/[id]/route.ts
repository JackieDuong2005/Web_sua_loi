import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/dictation/sessions/[id] — Chi tiết một phiên kèm chat logs
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await prisma.dictationSession.findUnique({
      where: { id },
      include: {
        logs: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Không tìm thấy phiên đọc chính tả" },
        { status: 404 }
      );
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error("Error fetching dictation session:", error);
    return NextResponse.json(
      { error: "Lỗi khi tải phiên đọc chính tả" },
      { status: 500 }
    );
  }
}

// DELETE /api/dictation/sessions/[id] — Xoá phiên (cascade xoá logs)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.dictationSession.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting dictation session:", error);
    return NextResponse.json(
      { error: "Lỗi khi xoá phiên đọc chính tả" },
      { status: 500 }
    );
  }
}
