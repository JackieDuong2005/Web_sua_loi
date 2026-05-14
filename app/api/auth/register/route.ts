import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, username, password, confirmPassword, role, className } = body

    // Validate required fields
    if (!name || !username || !password) {
      return NextResponse.json(
        { error: "Vui lòng điền đầy đủ thông tin bắt buộc" },
        { status: 400 }
      )
    }

    // Validate username length
    if (username.length < 3) {
      return NextResponse.json(
        { error: "Tên đăng nhập phải có ít nhất 3 ký tự" },
        { status: 400 }
      )
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Mật khẩu phải có ít nhất 6 ký tự" },
        { status: 400 }
      )
    }

    // Validate password match
    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Mật khẩu xác nhận không khớp" },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ["student", "teacher"]
    if (role && !validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Vai trò không hợp lệ" },
        { status: 400 }
      )
    }

    // Check if username already exists
    const existing = await prisma.user.findUnique({ where: { username } })
    if (existing) {
      return NextResponse.json(
        { error: "Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác." },
        { status: 409 }
      )
    }

    // If student, validate className
    if (role === "student" && !className) {
      return NextResponse.json(
        { error: "Học sinh phải chọn lớp" },
        { status: 400 }
      )
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        username,
        password,
        role: role || "student",
        className: className || "",
        active: true,
      },
    })

    return NextResponse.json(
      {
        message: "Đăng ký thành công! Bạn có thể đăng nhập ngay.",
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role,
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("Register error:", error)
    return NextResponse.json(
      { error: "Lỗi hệ thống. Vui lòng thử lại sau." },
      { status: 500 }
    )
  }
}
