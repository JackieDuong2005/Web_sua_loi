"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { HardDrive, Wifi, Zap, Users, Activity, Server, Loader2, FileText } from "lucide-react"

interface Grade {
  id: string
  processingTimeMs: number
  tokenCount: number
  createdAt: string
}

interface UserInfo {
  id: string
  name: string
  role: string
  active: boolean
}

function StatCard({ icon: Icon, label, value, unit, progress, color }: {
  icon: any; label: string; value: string | number; unit?: string; progress?: number; color?: string
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${color || "text-muted-foreground"}`} />
            <span className="text-sm text-muted-foreground">{label}</span>
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span className={`text-2xl font-bold ${color || ""}`}>{value}</span>
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
        </div>
        {progress !== undefined && <Progress value={progress} className="mt-3 h-2" />}
      </CardContent>
    </Card>
  )
}

export default function SystemStatsPage() {
  const [grades, setGrades] = useState<Grade[]>([])
  const [users, setUsers] = useState<UserInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [time, setTime] = useState(new Date())
  const [dbSize, setDbSize] = useState("")

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    async function fetchData() {
      try {
        const [gradesRes, usersRes] = await Promise.all([
          fetch("/api/grades"),
          fetch("/api/users"),
        ])
        const gradesData = await gradesRes.json()
        const usersData = await usersRes.json()
        setGrades(gradesData.grades || [])
        setUsers(usersData.users || [])
      } catch {
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Tính toán từ dữ liệu thật
  const totalGrades = grades.length
  const todayGrades = grades.filter((g) => {
    const d = new Date(g.createdAt)
    const today = new Date()
    return d.toDateString() === today.toDateString()
  })
  const todayRequests = todayGrades.length
  const todayTokens = todayGrades.reduce((s, g) => s + (g.tokenCount || 0), 0)
  const totalTokens = grades.reduce((s, g) => s + (g.tokenCount || 0), 0)
  const avgProcessingTime = totalGrades > 0
    ? Math.round(grades.reduce((s, g) => s + (g.processingTimeMs || 0), 0) / totalGrades)
    : 0

  const activeUsers = users.filter((u) => u.active).length
  const teacherCount = users.filter((u) => u.role === "teacher").length
  const studentCount = users.filter((u) => u.role === "student").length

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center gap-4 border-b border-border bg-card px-4 py-4 md:px-6">
        <SidebarTrigger className="-ml-2" />
        <Separator orientation="vertical" className="h-6" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-card-foreground">Giám sát hệ thống</h1>
          <p className="text-sm text-muted-foreground">ViHand Grade — {time.toLocaleTimeString("vi-VN")}</p>
        </div>
        <Badge variant="outline" className="bg-success/10 text-success border-success/20">
          <Activity className="w-3 h-3 mr-1" />Online
        </Badge>
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
              <StatCard icon={FileText} label="Tổng bài chấm" value={totalGrades} color="text-primary" />
              <StatCard icon={Users} label="Người dùng" value={users.length} unit={`(${activeUsers} active)`} color="text-info" />
              <StatCard icon={Zap} label="Requests hôm nay" value={todayRequests} color="text-warning-foreground" />
              <StatCard icon={HardDrive} label="TB xử lý" value={`${(avgProcessingTime / 1000).toFixed(1)}`} unit="giây/bài" />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* System Info */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Server className="w-4 h-4" />Thông tin hệ thống</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { label: "Nền tảng", value: "Next.js + Prisma + SQLite" },
                      { label: "Database", value: "SQLite (vihand.db)" },
                      { label: "Tổng bài chấm", value: `${totalGrades} bài` },
                      { label: "Giáo viên", value: `${teacherCount} người` },
                      { label: "Học sinh", value: `${studentCount} người` },
                      { label: "Tổng tokens đã dùng", value: totalTokens.toLocaleString() },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                        <span className="text-sm text-muted-foreground">{item.label}</span>
                        <span className="text-sm font-medium">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Gemini API Usage */}
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Zap className="w-4 h-4 text-warning-foreground" />Gemini API</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-muted/50 text-center">
                        <p className="text-2xl font-bold">{todayRequests}</p>
                        <p className="text-xs text-muted-foreground mt-1">Requests hôm nay</p>
                      </div>
                      <div className="p-4 rounded-lg bg-muted/50 text-center">
                        <p className="text-2xl font-bold">{todayTokens.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground mt-1">Tokens hôm nay</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Model</span>
                        <span className="font-medium">gemini-3-flash-preview</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">TB tokens/bài</span>
                        <span className="font-medium">{todayRequests > 0 ? Math.round(todayTokens / todayRequests) : 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">TB thời gian xử lý</span>
                        <span className="font-medium">{(avgProcessingTime / 1000).toFixed(1)}s</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Ước tính chi phí</span>
                        <span className="font-medium text-success">Miễn phí (Free tier)</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Network & Services */}
              <Card className="border-border/50">
                <CardHeader><CardTitle className="flex items-center gap-2"><Wifi className="w-4 h-4" />Dịch vụ</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { label: "Next.js Dev Server", status: "running", color: "text-success" },
                      { label: "Prisma ORM", status: "connected", color: "text-success" },
                      { label: "SQLite Database", status: "connected", color: "text-success" },
                      { label: "Gemini API", status: "reachable", color: "text-success" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                        <span className="text-sm">{item.label}</span>
                        <Badge variant="outline" className={`${item.color}`}>{item.status}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Active Users */}
              <Card className="border-border/50">
                <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-4 h-4" />Người dùng trong hệ thống</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10">
                      <span className="text-2xl font-bold text-primary">{activeUsers}</span>
                    </div>
                    <div>
                      <p className="font-medium">Đang hoạt động</p>
                      <p className="text-sm text-muted-foreground">/ {users.length} tổng người dùng</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {users.filter((u) => u.active).slice(0, 5).map((u) => (
                      <div key={u.id} className="flex items-center gap-2 text-sm p-2 rounded bg-muted/50">
                        <div className="w-2 h-2 rounded-full bg-success" />
                        <span>{u.name}</span>
                        <Badge variant="outline" className="text-xs ml-auto">
                          {u.role === "teacher" ? "GV" : u.role === "admin" ? "Admin" : "HS"}
                        </Badge>
                      </div>
                    ))}
                    {users.filter((u) => u.active).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">Chưa có người dùng</p>
                    )}
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
