import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: "Vui lòng nhập tên đăng nhập và mật khẩu" },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { username },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Tài khoản không tồn tại" },
        { status: 401 }
      )
    }

    if (user.password !== password) {
      return NextResponse.json(
        { error: "Mật khẩu không đúng" },
        { status: 401 }
      )
    }

    if (!user.active) {
      return NextResponse.json(
        { error: "Tài khoản đã bị vô hiệu hóa" },
        { status: 403 }
      )
    }

    // Nếu là giáo viên, lấy các lớp đang quản lý
    let classes: string[] = []
    if (user.role === "teacher") {
      const teacherClasses = await prisma.class.findMany({
        where: { teacherId: user.id },
      })
      classes = teacherClasses.map((c) => c.name)
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        className: user.className,
        classes, // Danh sách lớp GV quản lý
      },
    })
  } catch (error: any) {
    console.error("Login error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
