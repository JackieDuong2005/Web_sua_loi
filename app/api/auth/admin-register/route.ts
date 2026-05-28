import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Mã bí mật để đăng ký admin - thay đổi giá trị này trong .env
const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || "vihand-admin-2026"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, username, password, confirmPassword, secretKey } = body

    // Validate secret key FIRST
    if (!secretKey || secretKey !== ADMIN_SECRET_KEY) {
      return NextResponse.json(
        { error: "Mã bí mật không đúng. Truy cập bị từ chối." },
        { status: 403 }
      )
    }

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

    // Check if username already exists
    const existing = await prisma.user.findUnique({ where: { username } })
    if (existing) {
      return NextResponse.json(
        { error: "Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác." },
        { status: 409 }
      )
    }

    // Create admin user
    const user = await prisma.user.create({
      data: {
        name,
        username,
        password,
        role: "admin",
        className: "",
        active: true,
      },
    })

    return NextResponse.json(
      {
        message: "Đăng ký tài khoản Admin thành công! Đang chuyển về trang đăng nhập...",
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
    console.error("Admin register error:", error)

    // Prisma unique constraint error
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác." },
        { status: 409 }
      )
    }

    // Prisma table not found (migration not run)
    if (error?.code === "P2021" || error?.message?.includes("table") || error?.message?.includes("does not exist")) {
      return NextResponse.json(
        { error: "Cơ sở dữ liệu chưa được khởi tạo. Vui lòng liên hệ quản trị viên." },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: error?.message || "Lỗi hệ thống. Vui lòng thử lại sau." },
      { status: 500 }
    )
  }
}
