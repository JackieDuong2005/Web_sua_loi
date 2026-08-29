import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// ============================================================
// GET /api/xiaozhi/devices
// Lấy danh sách tất cả thiết bị ESP32 đã đăng ký
// ============================================================
export async function GET() {
  try {
    const devices = await prisma.robotDevice.findMany({
      orderBy: { lastSeen: "desc" },
    })

    // Tính lại isOnline: thiết bị được coi là Online nếu heartbeat trong vòng 30 giây
    const ONLINE_THRESHOLD_MS = 30_000
    const now = Date.now()
    const devicesWithStatus = devices.map((d) => ({
      ...d,
      isOnline: now - new Date(d.lastSeen).getTime() < ONLINE_THRESHOLD_MS,
    }))

    return NextResponse.json({ devices: devicesWithStatus })
  } catch (error) {
    console.error("[GET /api/xiaozhi/devices]", error)
    return NextResponse.json({ error: "Không thể lấy danh sách thiết bị" }, { status: 500 })
  }
}

// ============================================================
// POST /api/xiaozhi/devices
// Đăng ký thiết bị mới HOẶC cập nhật heartbeat từ ESP32
// Body: { macAddress, ipAddress, name?, className? }
// ============================================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { macAddress, ipAddress, name, className } = body

    if (!macAddress) {
      return NextResponse.json({ error: "macAddress là bắt buộc" }, { status: 400 })
    }

    // Upsert: nếu MAC chưa tồn tại thì tạo mới, ngược lại cập nhật heartbeat + IP
    const device = await prisma.robotDevice.upsert({
      where: { macAddress },
      create: {
        macAddress,
        ipAddress: ipAddress ?? "",
        name: name ?? "Robot Trợ Giảng",
        className: className ?? "",
        isOnline: true,
        lastSeen: new Date(),
      },
      update: {
        ipAddress: ipAddress ?? undefined,
        name: name ?? undefined,
        className: className ?? undefined,
        isOnline: true,
        lastSeen: new Date(),
      },
    })

    return NextResponse.json({ device })
  } catch (error) {
    console.error("[POST /api/xiaozhi/devices]", error)
    return NextResponse.json({ error: "Không thể đăng ký thiết bị" }, { status: 500 })
  }
}

// ============================================================
// PATCH /api/xiaozhi/devices
// Cập nhật cấu hình từ Web Console (âm lượng, giọng đọc, gắn lớp)
// Body: { id, volume?, voiceName?, speedRate?, name?, className? }
// ============================================================
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, volume, voiceName, speedRate, name, className } = body

    if (!id) {
      return NextResponse.json({ error: "id là bắt buộc" }, { status: 400 })
    }

    const device = await prisma.robotDevice.update({
      where: { id },
      data: {
        ...(volume !== undefined && { volume: Number(volume) }),
        ...(voiceName && { voiceName }),
        ...(speedRate && { speedRate }),
        ...(name && { name }),
        ...(className !== undefined && { className }),
      },
    })

    return NextResponse.json({ device })
  } catch (error) {
    console.error("[PATCH /api/xiaozhi/devices]", error)
    return NextResponse.json({ error: "Không thể cập nhật thiết bị" }, { status: 500 })
  }
}

// ============================================================
// DELETE /api/xiaozhi/devices?id=xxx
// Xoá mạch ESP32 khỏi hệ thống
// ============================================================
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "id là bắt buộc" }, { status: 400 })
    }

    await prisma.robotDevice.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[DELETE /api/xiaozhi/devices]", error)
    return NextResponse.json({ error: "Không thể xoá thiết bị" }, { status: 500 })
  }
}
