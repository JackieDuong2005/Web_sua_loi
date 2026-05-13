"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { FileText, Users, CheckCircle, Clock, Camera, ArrowRight, Loader2 } from "lucide-react"
import Link from "next/link"

interface Grade {
  id: string
  studentName: string
  assignmentTitle: string
  className: string
  scoreNum: number
  score: string
  createdAt: string
}

interface DashboardStats {
  totalGraded: number
  uniqueStudents: number
  avgScore: number
  uniqueAssignments: number
}

function getScoreColor(score: number) {
  if (score >= 9) return "text-success bg-success/10"
  if (score >= 7) return "text-info bg-info/10"
  if (score >= 5) return "text-warning bg-warning/10"
  return "text-destructive bg-destructive/10"
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Hôm nay"
  if (diffDays === 1) return "Hôm qua"
  if (diffDays < 7) return `${diffDays} ngày trước`
  return date.toLocaleDateString("vi-VN")
}

export default function TeacherDashboard() {
  const [grades, setGrades] = useState<Grade[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [teacherName, setTeacherName] = useState("Giáo viên")
  const [teacherClasses, setTeacherClasses] = useState<string[]>([])

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)

        // Lấy thông tin user đã đăng nhập
        const userStr = localStorage.getItem("vihand_user")
        let myClasses: string[] = []
        if (userStr) {
          const user = JSON.parse(userStr)
          setTeacherName(user.name || "Giáo viên")
          myClasses = user.classes || []
          setTeacherClasses(myClasses)
        }

        const res = await fetch("/api/grades")
        if (!res.ok) throw new Error("Không thể tải dữ liệu")
        const data = await res.json()
        const allGrades: Grade[] = data.grades || []

        // Lọc chỉ bài trong lớp GV quản lý
        const myGrades = myClasses.length > 0
          ? allGrades.filter((g) => myClasses.includes(g.className))
          : allGrades

        const totalGraded = myGrades.length
        const uniqueStudents = new Set(myGrades.map((g) => g.studentName)).size
        const avgScore =
          totalGraded > 0
            ? Math.round((myGrades.reduce((sum, g) => sum + g.scoreNum, 0) / totalGraded) * 10) / 10
            : 0
        const uniqueAssignments = new Set(myGrades.map((g) => g.assignmentTitle)).size

        setStats({ totalGraded, uniqueStudents, avgScore, uniqueAssignments })
        setGrades(myGrades.slice(0, 5))
      } catch (err: any) {
        setError(err.message || "Lỗi không xác định")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const statsCards = stats
    ? [
        {
          title: "Tổng bài đã chấm",
          value: stats.totalGraded.toString(),
          description: "Tất cả thời gian",
          icon: CheckCircle,
        },
        {
          title: "Học sinh",
          value: stats.uniqueStudents.toString(),
          description: "Học sinh đã chấm",
          icon: Users,
        },
        {
          title: "Điểm trung bình",
          value: stats.avgScore.toFixed(1),
          description: "Trung bình tất cả bài",
          icon: FileText,
        },
        {
          title: "Loại bài",
          value: stats.uniqueAssignments.toString(),
          description: "Loại bài tập khác nhau",
          icon: Clock,
        },
      ]
    : []

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="flex items-center gap-4 border-b border-border bg-card px-4 py-4 md:px-6">
        <SidebarTrigger className="-ml-2" />
        <Separator orientation="vertical" className="h-6" />
        <div>
          <h1 className="text-lg font-semibold text-card-foreground">Tổng quan</h1>
          <p className="text-sm text-muted-foreground">
            Xin chào, {teacherName}!{teacherClasses.length > 0 && ` — Quản lý: ${teacherClasses.join(", ")}`}
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 space-y-6 min-w-0 overflow-x-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Đang tải dữ liệu...</span>
          </div>
        ) : error ? (
          <div className="text-center py-16 text-destructive text-sm">{error}</div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              {statsCards.map((stat) => (
                <Card key={stat.title} className="border-border/50 min-w-0">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 pt-3 md:px-6 md:pt-6">
                    <CardTitle className="text-xs font-medium text-muted-foreground leading-tight">
                      {stat.title}
                    </CardTitle>
                    <stat.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  </CardHeader>
                  <CardContent className="px-3 pb-3 md:px-6 md:pb-6">
                    <span className="text-xl font-bold">{stat.value}</span>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{stat.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Quick Actions & Recent Grades */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Quick Actions */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Thao tác nhanh</CardTitle>
                  <CardDescription>Các chức năng thường dùng</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link href="/teacher/grade" className="block">
                    <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                        <Camera className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium">Chấm điểm bài mới</p>
                        <p className="text-sm text-muted-foreground">Chụp ảnh bài viết để chấm điểm</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </Link>
                  <Link href="/teacher/reports" className="block">
                    <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-info/10">
                        <FileText className="w-5 h-5 text-info" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium">Xem báo cáo lớp</p>
                        <p className="text-sm text-muted-foreground">Thống kê điểm của cả lớp</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Recent Grades */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Điểm gần đây</CardTitle>
                  <CardDescription>5 bài đã chấm gần nhất</CardDescription>
                </CardHeader>
                <CardContent>
                  {grades.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      Chưa có bài nào được chấm. Hãy bắt đầu chấm bài đầu tiên!
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {grades.map((grade) => (
                        <div
                          key={grade.id}
                          className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{grade.studentName}</p>
                            <p className="text-xs text-muted-foreground">{grade.assignmentTitle}</p>
                          </div>
                          <div className="flex items-center gap-2 md:gap-3">
                            <span className="text-xs text-muted-foreground hidden md:block">
                              {formatDate(grade.createdAt)}
                            </span>
                            <span
                              className={`px-2 py-1 rounded-md text-sm font-semibold ${getScoreColor(grade.scoreNum)}`}
                            >
                              {grade.scoreNum}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
