import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// ============================================================
// POST /api/xiaozhi/send-passage
// Giáo viên bấm "Gửi bài cho Robot đọc" từ Kho SGK
// Body: { passageId, deviceId?, className? }
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { passageId, deviceId, className } = body

    if (!passageId) {
      return NextResponse.json({ error: "passageId là bắt buộc" }, { status: 400 })
    }

    // Lấy bài đọc từ kho ngữ liệu
    const passage = await prisma.textbookPassage.findUnique({
      where: { id: passageId },
    })
    if (!passage) {
      return NextResponse.json({ error: "Không tìm thấy bài đọc" }, { status: 404 })
    }

    // Tạo sẵn DictationSession trước (sẽ có passage text để đối chiếu khi chấm)
    // source="robot" giúp phân biệt với phiên đọc từ MCP Cloud hoặc nhập tay
    const session = await prisma.dictationSession.create({
      data: {
        title: `Nghe viết: ${passage.title}`,
        passage: passage.content,
        className: className || "",
        teacherName: "",
        source: "robot",                                                        // Phiên đọc từ Robot ESP32
        deviceId: deviceId || "",                                               // MAC Address robot đã đọc
        status: "in_progress",
        summary: `Bài đọc Lớp ${passage.gradeLevel} — ${passage.bookSet} — ${passage.unit}`,
      },
    })

    // Lấy thiết bị ESP32 đang Online để gửi lệnh
    let targetDevice = null
    if (deviceId) {
      targetDevice = await prisma.robotDevice.findUnique({ where: { id: deviceId } })
    } else if (className) {
      // Tự tìm thiết bị gắn với lớp đó
      targetDevice = await prisma.robotDevice.findFirst({
        where: { className, isOnline: true },
      })
    }

    // Payload lệnh gửi cho Voice Server (Voice Server tự polling endpoint này hoặc qua WebSocket)
    const commandPayload = {
      action: "read_passage",
      sessionId: session.id,
      passage: passage.content,
      title: passage.title,
      difficultWords: passage.difficultWords,
      gradeLevel: passage.gradeLevel,
      deviceMac: targetDevice?.macAddress ?? null,
    }

    return NextResponse.json({
      success: true,
      session,
      command: commandPayload,
      message: `Đã gửi bài "${passage.title}" cho Robot đọc. Phiên chấm #${session.id} đã được tạo.`,
    })
  } catch (error) {
    console.error("[POST /api/xiaozhi/send-passage]", error)
    return NextResponse.json({ error: "Không thể gửi bài cho Robot" }, { status: 500 })
  }
}
