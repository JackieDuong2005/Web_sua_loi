"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Trophy, TrendingUp, FileText, Star, ArrowRight, Loader2 } from "lucide-react"
import Link from "next/link"

interface Grade {
  id: string
  studentName: string
  assignmentTitle: string
  className: string
  scoreNum: number
  score: string
  feedback: string
  createdAt: string
}

function getScoreLevel(score: number) {
  if (score >= 9) return { label: "Xuất sắc", color: "text-success", bg: "bg-success/10", icon: Trophy, message: "Tuyệt vời! Con giỏi lắm!" }
  if (score >= 7) return { label: "Khá", color: "text-info", bg: "bg-info/10", icon: Star, message: "Tốt lắm! Tiếp tục cố gắng nhé!" }
  if (score >= 5) return { label: "Đạt", color: "text-warning-foreground", bg: "bg-warning/10", icon: TrendingUp, message: "Con đang tiến bộ!" }
  return { label: "Cần cố gắng", color: "text-destructive", bg: "bg-destructive/10", icon: FileText, message: "Hãy luyện tập thêm nhé!" }
}

function getScoreColor(score: number) {
  if (score >= 9) return "text-success bg-success/10"
  if (score >= 7) return "text-info bg-info/10"
  if (score >= 5) return "text-warning bg-warning/10"
  return "text-destructive bg-destructive/10"
}

export default function StudentDashboard() {
  const [grades, setGrades] = useState<Grade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [studentName, setStudentName] = useState("Học sinh")

  useEffect(() => {
    async function fetchData() {
      try {
        // Lấy thông tin user đã đăng nhập
        const userStr = localStorage.getItem("vihand_user")
        let myName = ""
        if (userStr) {
          const user = JSON.parse(userStr)
          myName = user.name || ""
          setStudentName(user.name || "Học sinh")
        }

        const res = await fetch("/api/grades")
        if (!res.ok) throw new Error("Không thể tải dữ liệu")
        const data = await res.json()
        const allGrades: Grade[] = data.grades || []

        // Lọc chỉ bài của học sinh này
        const myGrades = myName
          ? allGrades.filter((g) => g.studentName === myName)
          : allGrades
        setGrades(myGrades)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const latestScore = grades[0]?.scoreNum || 0
  const latestAssignment = grades[0]?.assignmentTitle || ""
  const averageScore =
    grades.length > 0
      ? Math.round((grades.reduce((sum, g) => sum + g.scoreNum, 0) / grades.length) * 10) / 10
      : 0
  const highestScore = grades.length > 0 ? Math.max(...grades.map((g) => g.scoreNum)) : 0
  const scoreLevel = getScoreLevel(latestScore)
  const ScoreIcon = scoreLevel.icon

  const recentGrades = grades.slice(0, 3)

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="flex items-center gap-4 border-b border-border bg-card px-4 py-4 md:px-6">
        <SidebarTrigger className="-ml-2" />
        <Separator orientation="vertical" className="h-6" />
        <div>
          <h1 className="text-lg font-semibold text-card-foreground">Xin chào, {studentName}!</h1>
          <p className="text-sm text-muted-foreground">Xem kết quả học tập của con</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 space-y-6 overflow-x-hidden min-w-0">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Đang tải dữ liệu...</span>
          </div>
        ) : error ? (
          <div className="text-center py-16 text-destructive text-sm">{error}</div>
        ) : grades.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="font-medium">Chưa có bài nào được chấm</p>
            <p className="text-sm mt-1">Hãy nhờ giáo viên chấm bài để xem điểm tại đây!</p>
          </div>
        ) : (
          <>
            {/* Latest Score Highlight */}
            <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4 md:gap-6">
                  <div className="flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-card shadow-lg">
                    <span className={`text-2xl md:text-3xl font-bold ${scoreLevel.color}`}>{latestScore}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <ScoreIcon className={`w-5 h-5 ${scoreLevel.color}`} />
                      <span className={`font-semibold ${scoreLevel.color}`}>{scoreLevel.label}</span>
                    </div>
                    <p className="text-base md:text-lg font-medium">{scoreLevel.message}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Bài viết gần nhất: {latestAssignment}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
              <Card className="border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Điểm trung bình</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">{averageScore.toFixed(1)}</span>
                    <span className="text-sm text-muted-foreground">/ 10</span>
                  </div>
                  <Progress value={averageScore * 10} className="mt-3 h-2" />
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Số bài đã nộp</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">{grades.length}</span>
                    <span className="text-sm text-muted-foreground">bài viết</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">Tất cả thời gian</p>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Điểm cao nhất</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-success">{highestScore}</span>
                    <span className="text-sm text-muted-foreground">/ 10</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">Giỏi lắm con!</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Grades & Quick Actions */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Recent Grades */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Điểm gần đây</CardTitle>
                  <CardDescription>3 bài viết đã được chấm gần nhất</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentGrades.map((grade) => (
                      <div
                        key={grade.id}
                        className="flex items-start gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${getScoreColor(grade.scoreNum)}`}>
                          <span className="text-lg font-bold">{grade.scoreNum}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium truncate">{grade.assignmentTitle}</p>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {grade.feedback || "Không có nhận xét"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Tiếp tục học tập</CardTitle>
                  <CardDescription>Con có thể làm gì tiếp theo</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link href="/student/history" className="block">
                    <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium">Xem tất cả điểm</p>
                        <p className="text-sm text-muted-foreground">Xem lịch sử các bài viết đã chấm</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </Link>

                  <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                    <div className="flex items-start gap-3">
                      <Star className="w-5 h-5 text-success mt-0.5" />
                      <div>
                        <p className="font-medium text-success">Lời khuyên của ngày</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Hãy luyện viết mỗi ngày 15 phút để cải thiện chữ viết nhé con!
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
