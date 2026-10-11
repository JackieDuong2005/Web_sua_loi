import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyPassword, hashPassword, signJwt } from "@/lib/auth"

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

    const isMatch = verifyPassword(password, user.password)
    if (!isMatch) {
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

    // Tự động nâng cấp mật khẩu từ thô lên hash Scrypt nếu chưa được băm
    if (!user.password.startsWith("scrypt:")) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { password: hashPassword(password) },
        })
      } catch (hashErr) {
        console.warn("[Auth] Không thể cập nhật hash mật khẩu:", hashErr)
      }
    }

    // Nếu là giáo viên, lấy các lớp đang quản lý
    let classes: string[] = []
    if (user.role === "teacher") {
      const teacherClasses = await prisma.class.findMany({
        where: { teacherId: user.id },
      })
      classes = teacherClasses.map((c) => c.name)
    }

    // Cấp phát JWT Bearer Token (thời hạn 7 ngày)
    const token = signJwt({
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      className: user.className,
      classes,
    })

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        className: user.className,
        classes, // Danh sách lớp GV quản lý
        token,
      },
      token,
    })
  } catch (error: any) {
    console.error("Login error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
