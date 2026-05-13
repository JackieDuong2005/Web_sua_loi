"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Download, Search, ArrowUpDown, Trash2, RefreshCw, Eye, X } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Grade {
  id: string
  studentName: string
  assignmentTitle: string
  className: string
  originalText: string
  fixedText: string
  corrections: string // JSON
  score: string
  scoreNum: number
  feedback: string
  overallRating: string
  processingTimeMs: number
  tokenCount: number
  imageBase64: string
  createdAt: string
}

interface Correction {
  error: string
  suggestion: string
  reason: string
}

function getScoreBadge(score: number) {
  if (score >= 9) return { label: "Hoàn thành tốt", className: "bg-success/10 text-success border-success/20" }
  if (score >= 7) return { label: "Hoàn thành", className: "bg-info/10 text-info border-info/20" }
  if (score >= 5) return { label: "Cần cố gắng", className: "bg-warning/10 text-warning-foreground border-warning/20" }
  return { label: "Chưa HT", className: "bg-destructive/10 text-destructive border-destructive/20" }
}

function getRatingStyle(rating: string) {
  if (rating.includes("Tốt")) return "bg-green-100 text-green-700 border-green-200"
  if (rating.includes("Khá")) return "bg-blue-100 text-blue-700 border-blue-200"
  if (rating.includes("Trung bình")) return "bg-yellow-100 text-yellow-700 border-yellow-200"
  return "bg-red-100 text-red-700 border-red-200"
}

export default function ReportsPage() {
  const [grades, setGrades] = useState<Grade[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"studentName" | "scoreNum" | "createdAt">("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [teacherClasses, setTeacherClasses] = useState<string[]>([])

  const fetchGrades = useCallback(async () => {
    setLoading(true)
    try {
      // Lấy thông tin lớp GV quản lý
      const userStr = localStorage.getItem("vihand_user")
      let myClasses: string[] = []
      if (userStr) {
        const user = JSON.parse(userStr)
        myClasses = user.classes || []
        setTeacherClasses(myClasses)
      }

      const params = new URLSearchParams()
      if (searchQuery) params.set("search", searchQuery)
      const res = await fetch(`/api/grades?${params}`)
      const data = await res.json()
      const allGrades: Grade[] = data.grades || []

      // Lọc chỉ bài trong lớp GV quản lý
      const filtered = myClasses.length > 0
        ? allGrades.filter((g) => myClasses.includes(g.className))
        : allGrades
      setGrades(filtered)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [searchQuery])

  useEffect(() => { fetchGrades() }, [fetchGrades])

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa bài này khỏi database?")) return
    setDeletingId(id)
    try {
      await fetch(`/api/grades/${id}`, { method: "DELETE" })
      setGrades(prev => prev.filter(g => g.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  const sorted = [...grades].sort((a, b) => {
    let c = 0
    if (sortBy === "studentName") c = a.studentName.localeCompare(b.studentName)
    else if (sortBy === "scoreNum") c = a.scoreNum - b.scoreNum
    else c = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    return sortOrder === "asc" ? c : -c
  })

  const handleSort = (col: "studentName" | "scoreNum" | "createdAt") => {
    if (sortBy === col) setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    else { setSortBy(col); setSortOrder("desc") }
  }

  const avg = grades.length > 0
    ? (grades.reduce((s, g) => s + g.scoreNum, 0) / grades.length).toFixed(1) : "0"

  const dist = {
    excellent: grades.filter(g => g.scoreNum >= 9).length,
    good: grades.filter(g => g.scoreNum >= 7 && g.scoreNum < 9).length,
    pass: grades.filter(g => g.scoreNum >= 5 && g.scoreNum < 7).length,
    fail: grades.filter(g => g.scoreNum < 5).length,
  }
  const chartData = [
    { name: "9-10", count: dist.excellent, color: "#22c55e" },
    { name: "7-8", count: dist.good, color: "#3b82f6" },
    { name: "5-6", count: dist.pass, color: "#f59e0b" },
    { name: "0-4", count: dist.fail, color: "#ef4444" },
  ]

  const exportToCsv = () => {
    const headers = ["STT", "Họ và tên", "Lớp", "Bài viết", "Điểm", "Xếp loại", "Nhận xét", "Ngày"]
    const rows = sorted.map((g, i) => [
      i + 1, g.studentName, g.className, g.assignmentTitle, g.score,
      g.overallRating, `"${g.feedback.replace(/"/g, "'")}"`,
      new Date(g.createdAt).toLocaleDateString("vi-VN")
    ])
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob)
    a.download = `bao-cao-diem-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center gap-4 border-b border-border bg-card px-4 py-4 md:px-6">
        <SidebarTrigger className="-ml-2" />
        <Separator orientation="vertical" className="h-6" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-card-foreground">Báo cáo lớp</h1>
          <p className="text-sm text-muted-foreground">Dữ liệu thực từ cơ sở dữ liệu • {grades.length} bài đã chấm</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchGrades} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={exportToCsv} size="sm" disabled={grades.length === 0}>
            <Download className="w-4 h-4 mr-2" /><span className="hidden md:inline">Xuất CSV</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 space-y-6 overflow-x-hidden min-w-0">
        {/* Filters */}
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm theo tên học sinh, bài viết..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Stats + Chart */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="grid gap-4 grid-cols-2 content-start">
            <Card className="border-border/50"><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Tổng số bài</p><p className="text-2xl font-bold">{grades.length}</p></CardContent></Card>
            <Card className="border-border/50"><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Điểm trung bình</p><p className="text-2xl font-bold text-primary">{avg}</p></CardContent></Card>
            <Card className="border-border/50 border-success/20"><CardContent className="pt-6"><p className="text-sm text-muted-foreground">HT tốt (9-10)</p><p className="text-2xl font-bold text-success">{dist.excellent}</p></CardContent></Card>
            <Card className="border-border/50 border-info/20"><CardContent className="pt-6"><p className="text-sm text-muted-foreground">HT (7-8)</p><p className="text-2xl font-bold text-info">{dist.good}</p></CardContent></Card>
          </div>
          <Card className="border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-base">Phân bố điểm</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis allowDecimals={false} className="text-xs" />
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)", background: "var(--card)" }} />
                    <Bar dataKey="count" name="Số bài" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Danh sách điểm</CardTitle>
            <CardDescription>
              {loading ? "Đang tải..." : `Hiển thị ${sorted.length} bài viết`}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {loading ? (
              <div className="flex justify-center py-12"><Spinner className="w-8 h-8" /></div>
            ) : sorted.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="font-medium">Chưa có dữ liệu</p>
                <p className="text-sm mt-1">Chấm điểm và lưu bài để xem báo cáo tại đây</p>
              </div>
            ) : (
              <Table className="min-w-[500px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">STT</TableHead>
                    <TableHead>
                      <Button variant="ghost" className="p-0 h-auto font-medium" onClick={() => handleSort("studentName")}>
                        Họ và tên<ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="hidden md:table-cell">Lớp</TableHead>
                    <TableHead className="hidden md:table-cell">Bài viết</TableHead>
                    <TableHead>
                      <Button variant="ghost" className="p-0 h-auto font-medium" onClick={() => handleSort("scoreNum")}>
                        Điểm<ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="hidden md:table-cell">Xếp loại</TableHead>
                    <TableHead className="hidden lg:table-cell">
                      <Button variant="ghost" className="p-0 h-auto font-medium" onClick={() => handleSort("createdAt")}>
                        Ngày<ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="w-20">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((grade, i) => {
                    const badge = getScoreBadge(grade.scoreNum)
                    return (
                      <TableRow key={grade.id}>
                        <TableCell className="font-medium">{i + 1}</TableCell>
                        <TableCell className="font-medium">{grade.studentName}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">{grade.className || "-"}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">{grade.assignmentTitle}</TableCell>
                        <TableCell><span className="font-semibold text-lg">{grade.score}</span></TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline" className={badge.className}>{badge.label}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden lg:table-cell text-sm">
                          {new Date(grade.createdAt).toLocaleDateString("vi-VN")}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedGrade(grade)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(grade.id)} disabled={deletingId === grade.id}>
                              {deletingId === grade.id ? <Spinner className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Detail Dialog */}
      <Dialog open={!!selectedGrade} onOpenChange={(open) => !open && setSelectedGrade(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Chi tiết bài: {selectedGrade?.studentName}</span>
            </DialogTitle>
          </DialogHeader>
          {selectedGrade && (
            <div className="space-y-4 text-sm">
              {/* Ảnh bài viết */}
              {selectedGrade.imageBase64 && (
                <div className="space-y-1">
                  <p className="font-medium text-muted-foreground">Ảnh bài viết:</p>
                  <img
                    src={selectedGrade.imageBase64}
                    alt="Ảnh bài viết"
                    className="w-full rounded-lg border border-border object-contain max-h-64"
                  />
                </div>
              )}
              <div className="flex gap-3 flex-wrap">
                <Badge variant="outline">{selectedGrade.className || "Không rõ lớp"}</Badge>
                <Badge variant="outline">{selectedGrade.assignmentTitle}</Badge>
                <Badge className={`border ${getRatingStyle(selectedGrade.overallRating)}`}>
                  {selectedGrade.overallRating}
                </Badge>
                <Badge variant="secondary" className="text-lg font-bold">{selectedGrade.score}</Badge>
              </div>

              <div className="space-y-1">
                <p className="font-medium text-muted-foreground">Nhận xét:</p>
                <p className="leading-relaxed">{selectedGrade.feedback}</p>
              </div>

              {(() => {
                let corrections: Correction[] = []
                try { corrections = JSON.parse(selectedGrade.corrections) } catch {}
                return corrections.length > 0 ? (
                  <div className="space-y-2">
                    <p className="font-medium text-muted-foreground">Lỗi chính tả ({corrections.length}):</p>
                    {corrections.map((c, i) => (
                      <div key={i} className="p-2 rounded border border-border/60 bg-muted/30">
                        <span className="text-destructive line-through">{c.error}</span>
                        <span className="mx-2 text-muted-foreground">→</span>
                        <span className="text-green-600 font-medium">{c.suggestion}</span>
                        <p className="text-xs text-muted-foreground mt-1">{c.reason}</p>
                      </div>
                    ))}
                  </div>
                ) : null
              })()}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="font-medium text-muted-foreground">Văn bản gốc:</p>
                  <div className="p-3 rounded bg-muted/40 border text-xs leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {selectedGrade.originalText}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-muted-foreground">Văn bản đã sửa:</p>
                  <div className="p-3 rounded bg-green-50 border border-green-100 text-xs leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {selectedGrade.fixedText}
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Chấm lúc: {new Date(selectedGrade.createdAt).toLocaleString("vi-VN")} •
                {(selectedGrade.processingTimeMs / 1000).toFixed(1)}s • {selectedGrade.tokenCount} tokens
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
