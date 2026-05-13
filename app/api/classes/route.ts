import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET /api/classes - lấy danh sách lớp
export async function GET() {
  try {
    const classes = await prisma.class.findMany({
      orderBy: { createdAt: "desc" },
    })

    // Enrich mỗi lớp với số học sinh, giáo viên, điểm TB
    const enriched = await Promise.all(
      classes.map(async (cls) => {
        const studentCount = await prisma.user.count({
          where: { className: cls.name, role: "student" },
        })

        // Lấy tên giáo viên từ teacherId
        let teacherName = ""
        if (cls.teacherId) {
          const teacher = await prisma.user.findUnique({
            where: { id: cls.teacherId },
          })
          teacherName = teacher?.name || ""
        }

        // Điểm TB từ bảng Grade theo className
        const gradeAgg = await prisma.grade.aggregate({
          where: { className: cls.name },
          _avg: { scoreNum: true },
          _count: true,
        })

        return {
          ...cls,
          studentCount,
          teacherName,
          avgScore: gradeAgg._avg.scoreNum
            ? Math.round(gradeAgg._avg.scoreNum * 10) / 10
            : 0,
          gradeCount: gradeAgg._count,
        }
      })
    )

    return NextResponse.json({ classes: enriched })
  } catch (error: any) {
    console.error("GET /api/classes error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/classes - tạo lớp mới
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, grade, teacherId } = body

    if (!name) {
      return NextResponse.json(
        { error: "Thiếu tên lớp" },
        { status: 400 }
      )
    }

    // Kiểm tra trùng tên
    const existing = await prisma.class.findUnique({ where: { name } })
    if (existing) {
      return NextResponse.json(
        { error: "Tên lớp đã tồn tại" },
        { status: 409 }
      )
    }

    const cls = await prisma.class.create({
      data: {
        name,
        grade: grade || 3,
        teacherId: teacherId || "",
      },
    })

    return NextResponse.json({ class: cls }, { status: 201 })
  } catch (error: any) {
    console.error("POST /api/classes error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
