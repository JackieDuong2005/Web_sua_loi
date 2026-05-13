import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  // Tạo tài khoản admin mặc định
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      name: "Quản trị viên",
      username: "admin",
      password: "admin",
      role: "admin",
      active: true,
    },
  })
  console.log("✅ Tài khoản admin:", admin.username, "/ mật khẩu: admin")

  console.log("\n📋 Hướng dẫn:")
  console.log("1. Đăng nhập bằng admin/admin")
  console.log("2. Vào Quản lý người dùng → Tạo giáo viên")
  console.log("3. Vào Quản lý lớp học → Tạo lớp + gán giáo viên")
  console.log("4. Tạo học sinh + gán vào lớp")
  console.log("5. Đăng nhập lại bằng tài khoản GV/HS vừa tạo")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
