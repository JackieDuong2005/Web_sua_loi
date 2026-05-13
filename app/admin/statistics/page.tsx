"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { FileText, Award, Users, School, Loader2 } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"

interface Grade {
  id: string
  studentName: string
  assignmentTitle: string
  className: string
  scoreNum: number
  corrections: string
  createdAt: string
}

export default function StatisticsPage() {
  const [grades, setGrades] = useState<Grade[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/grades")
        const data = await res.json()
        setGrades(data.grades || [])
      } catch {
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // --- Tính toán thống kê thật ---
  const totalGraded = grades.length
  const uniqueStudents = new Set(grades.map((g) => g.studentName)).size
  const avgScore =
    totalGraded > 0
      ? Math.round((grades.reduce((s, g) => s + g.scoreNum, 0) / totalGraded) * 10) / 10
      : 0
  const excellentCount = grades.filter((g) => g.scoreNum >= 9).length
  const excellentPct = totalGraded > 0 ? Math.round((excellentCount / totalGraded) * 100) : 0

  // Phân bố điểm
  const dist = {
    excellent: grades.filter((g) => g.scoreNum >= 9).length,
    good: grades.filter((g) => g.scoreNum >= 7 && g.scoreNum < 9).length,
    pass: grades.filter((g) => g.scoreNum >= 5 && g.scoreNum < 7).length,
    fail: grades.filter((g) => g.scoreNum < 5).length,
  }
  const pieData = [
    { name: "Xuất sắc (9-10)", value: dist.excellent, color: "#22c55e" },
    { name: "Khá (7-8.9)", value: dist.good, color: "#3b82f6" },
    { name: "Đạt (5-6.9)", value: dist.pass, color: "#f59e0b" },
    { name: "Chưa đạt (0-4.9)", value: dist.fail, color: "#ef4444" },
  ]

  // Phân bố theo lớp
  const classSummary = Object.values(
    grades.reduce<Record<string, { name: string; count: number; totalScore: number }>>(
      (acc, g) => {
        const cls = g.className || "Không rõ"
        if (!acc[cls]) acc[cls] = { name: cls, count: 0, totalScore: 0 }
        acc[cls].count++
        acc[cls].totalScore += g.scoreNum
        return acc
      },
      {}
    )
  )
    .map((c) => ({ ...c, avgScore: Math.round((c.totalScore / c.count) * 10) / 10 }))
    .sort((a, b) => b.avgScore - a.avgScore)

  // Phân bố theo tháng
  const monthlyMap: Record<string, number> = {}
  grades.forEach((g) => {
    const d = new Date(g.createdAt)
    const key = `T${d.getMonth() + 1}`
    monthlyMap[key] = (monthlyMap[key] || 0) + 1
  })
  const monthlyData = Object.entries(monthlyMap)
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => {
      const aNum = parseInt(a.month.replace("T", ""))
      const bNum = parseInt(b.month.replace("T", ""))
      return aNum - bNum
    })

  // Phân tích lỗi chính tả
  const errorMap: Record<string, number> = {}
  grades.forEach((g) => {
    try {
      const corrections = JSON.parse(g.corrections)
      if (Array.isArray(corrections)) {
        corrections.forEach((c: any) => {
          const reason = c.reason || "Khác"
          // Nhóm theo loại lỗi phổ biến
          let type = "Khác"
          const r = reason.toLowerCase()
          if (r.includes("thanh") || r.includes("dấu thanh") || r.includes("hỏi") || r.includes("ngã")) type = "Thanh điệu"
          else if (r.includes("âm đầu") || r.includes("l/n") || r.includes("tr/ch") || r.includes("s/x") || r.includes("d/gi") || r.includes("nhầm")) type = "Âm đầu"
          else if (r.includes("vần") || r.includes("an/ang") || r.includes("iê/yê")) type = "Vần"
          else if (r.includes("viết hoa") || r.includes("hoa")) type = "Viết hoa"
          else if (r.includes("dấu câu") || r.includes("chấm") || r.includes("phẩy")) type = "Dấu câu"
          errorMap[type] = (errorMap[type] || 0) + 1
        })
      }
    } catch {}
  })
  const ERROR_COLORS = ["#3b82f6", "#ef4444", "#f59e0b", "#8b5cf6", "#6b7280", "#22c55e"]
  const errorChartData = Object.entries(errorMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center gap-4 border-b border-border bg-card px-4 py-4 md:px-6">
        <SidebarTrigger className="-ml-2" />
        <Separator orientation="vertical" className="h-6" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-card-foreground">Thống kê hệ thống</h1>
          <p className="text-sm text-muted-foreground">Báo cáo tổng hợp từ dữ liệu thực</p>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 space-y-6 overflow-x-hidden min-w-0">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Đang tải dữ liệu...</span>
          </div>
        ) : (
          <>
            {/* Overview Stats */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              {[
                { title: "Tổng bài đã chấm", value: totalGraded.toString(), icon: FileText },
                { title: "Điểm TB toàn trường", value: avgScore.toFixed(1), icon: Award },
                { title: "Học sinh đã chấm", value: uniqueStudents.toString(), icon: Users },
                { title: "Tỷ lệ xuất sắc", value: `${excellentPct}%`, icon: School },
              ].map((s) => (
                <Card key={s.title} className="border-border/50">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">{s.title}</CardTitle>
                    <s.icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <span className="text-xl md:text-2xl font-bold">{s.value}</span>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Monthly Bar Chart */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Số bài chấm theo tháng</CardTitle>
                  <CardDescription>Dữ liệu thực từ database</CardDescription>
                </CardHeader>
                <CardContent>
                  {monthlyData.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Chưa có dữ liệu</p>
                  ) : (
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="month" className="text-xs" />
                          <YAxis allowDecimals={false} className="text-xs" />
                          <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)", background: "var(--card)" }} />
                          <Bar dataKey="count" fill="oklch(0.55 0.15 160)" radius={[4, 4, 0, 0]} name="Số bài" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pie Chart */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Phân bố điểm</CardTitle>
                  <CardDescription>Tỉ lệ xếp loại</CardDescription>
                </CardHeader>
                <CardContent>
                  {totalGraded === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Chưa có dữ liệu</p>
                  ) : (
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData.filter((d) => d.value > 0)}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {pieData
                              .filter((d) => d.value > 0)
                              .map((entry, i) => (
                                <Cell key={i} fill={entry.color} />
                              ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Error Bar Chart */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Lỗi phổ biến</CardTitle>
                  <CardDescription>Phân bố các loại lỗi chính tả từ bài chấm thật</CardDescription>
                </CardHeader>
                <CardContent>
                  {errorChartData.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Chưa có dữ liệu lỗi</p>
                  ) : (
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={errorChartData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis type="number" allowDecimals={false} className="text-xs" />
                          <YAxis dataKey="name" type="category" width={80} className="text-xs" />
                          <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)", background: "var(--card)" }} />
                          <Bar dataKey="value" name="Số lỗi" radius={[0, 4, 4, 0]}>
                            {errorChartData.map((_, i) => (
                              <Cell key={i} fill={ERROR_COLORS[i % ERROR_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Xếp hạng lớp */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Xếp hạng lớp học</CardTitle>
                  <CardDescription>Top lớp có điểm trung bình cao nhất</CardDescription>
                </CardHeader>
                <CardContent>
                  {classSummary.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Chưa có dữ liệu</p>
                  ) : (
                    <div className="space-y-3">
                      {classSummary.slice(0, 5).map((cls, i) => (
                        <div key={cls.name} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/30">
                          <div
                            className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold ${
                              i === 0
                                ? "bg-warning text-warning-foreground"
                                : i === 1
                                ? "bg-muted text-muted-foreground"
                                : i === 2
                                ? "bg-orange-200 text-orange-800"
                                : "bg-muted/50 text-muted-foreground"
                            }`}
                          >
                            {i + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{cls.name}</p>
                            <p className="text-xs text-muted-foreground">{cls.count} bài chấm</p>
                          </div>
                          <span className="text-lg font-bold">{cls.avgScore}</span>
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
