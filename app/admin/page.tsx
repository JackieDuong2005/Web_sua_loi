"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Users, School, FileText, TrendingUp, ArrowRight, Loader2 } from "lucide-react"
import Link from "next/link"

interface Grade {
  id: string
  studentName: string
  assignmentTitle: string
  className: string
  scoreNum: number
  score: string
  overallRating: string
  createdAt: string
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) return `${diffMins} phút trước`
  if (diffHours < 24) return `${diffHours} giờ trước`
  if (diffDays === 1) return "Hôm qua"
  return `${diffDays} ngày trước`
}

export default function AdminDashboard() {
  const [grades, setGrades] = useState<Grade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/grades")
        if (!res.ok) throw new Error("Không thể tải dữ liệu")
        const data = await res.json()
        setGrades(data.grades || [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Tính thống kê từ DB
  const totalGraded = grades.length
  const uniqueStudents = new Set(grades.map((g) => g.studentName)).size
  const avgScore =
    totalGraded > 0
      ? Math.round((grades.reduce((s, g) => s + g.scoreNum, 0) / totalGraded) * 10) / 10
      : 0

  // Nhóm theo lớp
  const classSummary = Object.values(
    grades.reduce<Record<string, { name: string; count: number; totalScore: number; students: Set<string> }>>(
      (acc, g) => {
        const cls = g.className || "Không rõ"
        if (!acc[cls]) acc[cls] = { name: cls, count: 0, totalScore: 0, students: new Set() }
        acc[cls].count++
        acc[cls].totalScore += g.scoreNum
        acc[cls].students.add(g.studentName)
        return acc
      },
      {}
    )
  )
    .map((c) => ({ ...c, avgScore: Math.round((c.totalScore / c.count) * 10) / 10, studentCount: c.students.size }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)

  // 5 hoạt động gần đây
  const recentActivity = grades.slice(0, 5)

  const statsCards = [
    {
      title: "Tổng bài đã chấm",
      value: totalGraded.toString(),
      description: "Trong toàn hệ thống",
      icon: FileText,
    },
    {
      title: "Học sinh đã chấm",
      value: uniqueStudents.toString(),
      description: "Học sinh khác nhau",
      icon: Users,
    },
    {
      title: "Điểm trung bình",
      value: avgScore.toFixed(1),
      description: "Trung bình toàn hệ thống",
      icon: TrendingUp,
    },
    {
      title: "Số lớp học",
      value: classSummary.length.toString(),
      description: "Lớp có bài đã chấm",
      icon: School,
    },
  ]

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="flex items-center gap-4 border-b border-border bg-card px-4 py-4 md:px-6">
        <SidebarTrigger className="-ml-2" />
        <Separator orientation="vertical" className="h-6" />
        <div>
          <h1 className="text-lg font-semibold text-card-foreground">Quản trị hệ thống</h1>
          <p className="text-sm text-muted-foreground">Tổng quan về hệ thống ViHand Grade</p>
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

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Quick Actions */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Thao tác nhanh</CardTitle>
                  <CardDescription>Các chức năng quản trị thường dùng</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link href="/admin/users" className="block">
                    <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium">Quản lý người dùng</p>
                        <p className="text-sm text-muted-foreground">Thêm, sửa, xóa tài khoản</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </Link>
                  <Link href="/admin/statistics" className="block">
                    <Button variant="outline" className="w-full justify-start gap-3 h-auto py-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-success/10">
                        <TrendingUp className="w-5 h-5 text-success" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium">Xem thống kê</p>
                        <p className="text-sm text-muted-foreground">Báo cáo toàn hệ thống</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Hoạt động gần đây</CardTitle>
                  <CardDescription>Các bài chấm điểm gần nhất</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentActivity.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Chưa có hoạt động nào</p>
                  ) : (
                    <div className="space-y-4">
                      {recentActivity.map((g) => (
                        <div key={g.id} className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">
                              <span className="font-medium">{g.studentName}</span> được chấm bài &ldquo;{g.assignmentTitle}&rdquo; — {g.score}
                            </p>
                            <p className="text-xs text-muted-foreground">{formatDate(g.createdAt)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Class Overview */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Tổng quan lớp học</CardTitle>
                <CardDescription>Thống kê theo lớp từ dữ liệu chấm điểm thực</CardDescription>
              </CardHeader>
              <CardContent>
                {classSummary.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Chưa có dữ liệu lớp học. Hãy chấm bài và ghi lớp học để xem thống kê.
                  </p>
                ) : (
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                    {classSummary.map((cls) => (
                      <div key={cls.name} className="p-4 rounded-lg border border-border/50 bg-muted/30">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-semibold">{cls.name}</span>
                          <span
                            className={`text-lg font-bold ${
                              cls.avgScore >= 8 ? "text-success" : cls.avgScore >= 7 ? "text-info" : "text-warning-foreground"
                            }`}
                          >
                            {cls.avgScore}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p>Số bài: {cls.count}</p>
                          <p>Sĩ số: {cls.studentCount} học sinh</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  )
}
