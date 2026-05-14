// prisma/seed-admin.js
// Seed admin account - runs with plain Node.js (no ts-node needed)
const { PrismaClient } = require("@prisma/client")

async function main() {
  const prisma = new PrismaClient()
  
  try {
    // Check if admin already exists
    const existing = await prisma.user.findUnique({
      where: { username: "admin" }
    })
    
    if (existing) {
      console.log("✅ Admin account already exists")
      return
    }
    
    // Create admin account
    await prisma.user.create({
      data: {
        name: "Quản trị viên",
        username: "admin",
        password: "admin",
        role: "admin",
        className: "",
        active: true,
      },
    })
    
    console.log("✅ Admin account created (admin/admin)")
  } catch (error) {
    console.error("⚠️  Seed error:", error.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
