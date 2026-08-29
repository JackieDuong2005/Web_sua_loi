import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/dictation/sessions — Danh sách phiên đọc chính tả
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const className = searchParams.get("className") || "";
    const source = searchParams.get("source") || ""; // Lọc theo nguồn: "robot" | "mcp" | "manual"
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: Record<string, unknown> = {};
    if (className) where.className = className;
    if (source)    where.source = source;

    const sessions = await prisma.dictationSession.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        logs: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Error fetching dictation sessions:", error);
    return NextResponse.json(
      { error: "Lỗi khi tải danh sách phiên đọc chính tả" },
      { status: 500 }
    );
  }
}

// POST /api/dictation/sessions — Tạo phiên đọc chính tả mới
// Dùng chung cho cả Robot ESP32 (source="robot") và MCP Cloud (source="mcp") và nhập tay (source="manual")
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, passage, className, teacherName, source, deviceId, status, summary, logs } = body;

    if (!title || !passage) {
      return NextResponse.json(
        { error: "Thiếu tiêu đề hoặc đoạn văn chính tả" },
        { status: 400 }
      );
    }

    // Tạo phiên + logs trong một transaction
    const session = await prisma.dictationSession.create({
      data: {
        title,
        passage,
        className:   className   || "",
        teacherName: teacherName || "",
        source:      source      || "manual",  // "robot" | "mcp" | "manual"
        deviceId:    deviceId    || "",         // MAC Address Robot (chỉ có khi source="robot")
        status:      status      || "completed",
        summary:     summary     || "",
        logs: {
          create: Array.isArray(logs)
            ? logs.map((log: { speaker: string; content: string }) => ({
                speaker: log.speaker || "robot",
                content: log.content || "",
              }))
            : [],
        },
      },
      include: {
        logs: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    console.error("Error creating dictation session:", error);
    return NextResponse.json(
      { error: "Lỗi khi tạo phiên đọc chính tả" },
      { status: 500 }
    );
  }
}
