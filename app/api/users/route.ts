import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/users - lấy danh sách người dùng
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search") || ""
    const role = searchParams.get("role") || ""

    const users = await prisma.user.findMany({
      where: {
        AND: [
          search
            ? {
                OR: [
                  { name: { contains: search } },
                  { username: { contains: search } },
                ],
              }
            : {},
          role && role !== "all" ? { role } : {},
        ],
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ users })
  } catch (error: any) {
    console.error("GET /api/users error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/users - tạo người dùng mới
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, username, role, className, password } = body

    if (!name || !username) {
      return NextResponse.json(
        { error: "Thiếu thông tin bắt buộc: name, username" },
        { status: 400 }
      )
    }

    // Kiểm tra username trùng
    const existing = await prisma.user.findUnique({ where: { username } })
    if (existing) {
      return NextResponse.json(
        { error: "Tên đăng nhập đã tồn tại" },
        { status: 409 }
      )
    }

    const user = await prisma.user.create({
      data: {
        name,
        username,
        role: role || "student",
        className: className || "",
        password: password || "123456",
        active: true,
      },
    })

    return NextResponse.json({ user }, { status: 201 })
  } catch (error: any) {
    console.error("POST /api/users error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
