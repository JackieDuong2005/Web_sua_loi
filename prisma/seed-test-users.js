// prisma/seed-test-users.js
const { PrismaClient } = require("@prisma/client")

async function main() {
  const prisma = new PrismaClient()
  
  try {
    // 1. Tạo giáo viên demo
    let teacher = await prisma.user.findUnique({
      where: { username: "giao_vien_demo" }
    })
    
    if (!teacher) {
      teacher = await prisma.user.create({
        data: {
          name: "Giáo viên Demo",
          username: "giao_vien_demo",
          password: "123456",
          role: "teacher",
          className: "",
          active: true,
        }
      })
      console.log("✅ Created teacher (giao_vien_demo / 123456)")
    } else {
      console.log("✅ Teacher (giao_vien_demo) already exists")
    }

    // 2. Tạo học sinh demo
    const student = await prisma.user.findUnique({
      where: { username: "hoc_sinh_demo" }
    })
    
    if (!student) {
      await prisma.user.create({
        data: {
          name: "Học sinh Demo",
          username: "hoc_sinh_demo",
          password: "123456",
          role: "student",
          className: "3A1",
          active: true,
        }
      })
      console.log("✅ Created student (hoc_sinh_demo / 123456)")
    } else {
      console.log("✅ Student (hoc_sinh_demo) already exists")
    }

    // 3. Tạo lớp 3A1
    let cls = await prisma.class.findUnique({
      where: { name: "3A1" }
    })
    
    if (!cls) {
      await prisma.class.create({
        data: {
          name: "3A1",
          grade: 3,
          teacherId: teacher.id,
        }
      })
      console.log("✅ Created class 3A1 and assigned to teacher")
    } else {
      // Cập nhật teacherId nếu chưa gán
      if (cls.teacherId !== teacher.id) {
        await prisma.class.update({
          where: { name: "3A1" },
          data: { teacherId: teacher.id }
        })
        console.log("✅ Updated class 3A1 with teacher ID")
      } else {
        console.log("✅ Class 3A1 already assigned to teacher")
      }
    }
  } catch (error) {
    console.error("⚠️ Seed error:", error.message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
