import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/dictation/sessions/[id]/logs — Thêm log chat vào phiên (gọi từ MCP)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { speaker, content } = body;

    if (!content) {
      return NextResponse.json(
        { error: "Thiếu nội dung chat log" },
        { status: 400 }
      );
    }

    // Kiểm tra session tồn tại
    const session = await prisma.dictationSession.findUnique({
      where: { id },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Không tìm thấy phiên đọc chính tả" },
        { status: 404 }
      );
    }

    const log = await prisma.dictationLog.create({
      data: {
        sessionId: id,
        speaker: speaker || "xiaozhi",
        content,
      },
    });

    return NextResponse.json({ log }, { status: 201 });
  } catch (error) {
    console.error("Error adding dictation log:", error);
    return NextResponse.json(
      { error: "Lỗi khi thêm log chat" },
      { status: 500 }
    );
  }
}

// GET /api/dictation/sessions/[id]/logs — Lấy toàn bộ logs của phiên
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const logs = await prisma.dictationLog.findMany({
      where: { sessionId: id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Error fetching dictation logs:", error);
    return NextResponse.json(
      { error: "Lỗi khi tải chat logs" },
      { status: 500 }
    );
  }
}
