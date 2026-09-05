"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Download, Search, ArrowUpDown, Trash2, RefreshCw, Eye, X, Target, Pencil, BookOpen, Sparkles, CheckCircle2, AlertTriangle } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { HelpGuideButton } from "@/components/help-guide"

interface Grade {
  id: string
  gradingMode?: string // "dictation" | "essay"
  studentName: string
  assignmentTitle: string
  className: string
  originalText: string
  fixedText: string
  corrections: string // JSON
  score: string
  scoreNum: number
  scoreBreakdown?: string
  feedback: string
  pedagogicalComment?: string
  overallRating: string
  processingTimeMs: number
  tokenCount: number
  imageBase64: string
  dictationSessionId?: string
  createdAt: string
}

interface Correction {
  error: string
  suggestion: string
  error_type?: string
  reason: string
}

const ERROR_TYPE_LABELS: Record<string, { label: string; shortLabel: string; color: string }> = {
  phu_am_dau: { label: "Phụ âm đầu (tr/ch, s/x, r/d/gi, l/n...)", shortLabel: "Phụ âm đầu", color: "#ef4444" },
  phu_am_cuoi:{ label: "Âm cuối (n/ng, t/c, c/ch, p/t...)", shortLabel: "Âm cuối", color: "#f59e0b" },
  am_chinh:   { label: "Nguyên âm / Âm chính (ai/ay, ao/au, iê...)", shortLabel: "Nguyên âm", color: "#10b981" },
  van:        { label: "Vần tổng hợp", shortLabel: "Vần", color: "#f97316" },
  dau_thanh:  { label: "Dấu thanh (Hỏi/Ngã, Sắc/Nặng...)", shortLabel: "Dấu thanh", color: "#a855f7" },
  viet_hoa:   { label: "Viết hoa (Đầu câu, Tên riêng)", shortLabel: "Viết hoa", color: "#3b82f6" },
  thay_the_tu:{ label: "Sai khác từ / Thay thế từ", shortLabel: "Sai khác từ", color: "#6366f1" },
  bo_sot_them:{ label: "Bỏ sót / Thừa chữ", shortLabel: "Bỏ sót/Thêm", color: "#ec4899" },
  dau_cau:    { label: "Dấu câu (Chấm, Phẩy)", shortLabel: "Dấu câu", color: "#14b8a6" },
}

function getScoreBadge(score: number) {
  if (score >= 9) return { label: "Xuất sắc", className: "bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold" }
  if (score >= 7) return { label: "Hoàn thành tốt", className: "bg-green-50 text-green-700 border-green-200" }
  if (score >= 5) return { label: "Hoàn thành", className: "bg-blue-50 text-blue-700 border-blue-200" }
  if (score >= 3) return { label: "Cần cố gắng", className: "bg-amber-50 text-amber-700 border-amber-200" }
  return { label: "Chưa đạt", className: "bg-rose-50 text-rose-700 border-rose-200" }
}

function getRatingStyle(rating: string) {
  if (rating.includes("Xuất sắc")) return "bg-emerald-100 text-emerald-700 border-emerald-200"
  if (rating.includes("Tốt")) return "bg-green-100 text-green-700 border-green-200"
  if (rating.includes("Khá")) return "bg-blue-100 text-blue-700 border-blue-200"
  if (rating.includes("Trung bình")) return "bg-yellow-100 text-yellow-700 border-yellow-200"
  return "bg-red-100 text-red-700 border-red-200"
}

export default function ReportsPage() {
  const [grades, setGrades] = useState<Grade[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [modeFilter, setModeFilter] = useState<"all" | "dictation" | "essay">("all")
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
    if (!confirm("Bạn có chắc chắn muốn xóa bài chấm này khỏi database?")) return
    setDeletingId(id)
    try {
      await fetch(`/api/grades/${id}`, { method: "DELETE" })
      setGrades(prev => prev.filter(g => g.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  // Lọc theo Mode
  const filteredByMode = useMemo(() => {
    if (modeFilter === "all") return grades
    if (modeFilter === "essay") return grades.filter(g => g.gradingMode === "essay")
    return grades.filter(g => g.gradingMode !== "essay")
  }, [grades, modeFilter])

  // Sắp xếp
  const sorted = useMemo(() => {
    return [...filteredByMode].sort((a, b) => {
      let c = 0
      if (sortBy === "studentName") c = a.studentName.localeCompare(b.studentName)
      else if (sortBy === "scoreNum") c = a.scoreNum - b.scoreNum
      else c = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      return sortOrder === "asc" ? c : -c
    })
  }, [filteredByMode, sortBy, sortOrder])

  const handleSort = (col: "studentName" | "scoreNum" | "createdAt") => {
    if (sortBy === col) setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    else { setSortBy(col); setSortOrder("desc") }
  }

  // Thống kê điểm số
  const avg = filteredByMode.length > 0
    ? (filteredByMode.reduce((s, g) => s + g.scoreNum, 0) / filteredByMode.length).toFixed(1) : "0"

  const dist = {
    excellent: filteredByMode.filter(g => g.scoreNum >= 9).length,
    good: filteredByMode.filter(g => g.scoreNum >= 7 && g.scoreNum < 9).length,
    pass: filteredByMode.filter(g => g.scoreNum >= 5 && g.scoreNum < 7).length,
    fail: filteredByMode.filter(g => g.scoreNum < 5).length,
  }
  const chartData = [
    { name: "9-10", count: dist.excellent, color: "#10b981" },
    { name: "7-8", count: dist.good, color: "#3b82f6" },
    { name: "5-6", count: dist.pass, color: "#f59e0b" },
    { name: "0-4", count: dist.fail, color: "#ef4444" },
  ]

  // Thống kê 6 nhóm lỗi GDPT 2018
  const errorStats = useMemo(() => {
    const counts: Record<string, number> = {
      phu_am_dau: 0,
      van: 0,
      dau_thanh: 0,
      viet_hoa: 0,
      bo_sot_them: 0,
      dau_cau: 0,
    }
    let total = 0

    filteredByMode.forEach(g => {
      try {
        const list: Correction[] = JSON.parse(g.corrections || "[]")
        list.forEach(c => {
          const type = c.error_type || "phu_am_dau"
          if (counts[type] !== undefined) counts[type]++
          else counts["phu_am_dau"]++
          total++
        })
      } catch {}
    })

    const chart = Object.entries(ERROR_TYPE_LABELS).map(([key, info]) => ({
      name: info.shortLabel,
      fullName: info.label,
      count: counts[key] || 0,
      color: info.color,
    }))

    return { counts, total, chart }
  }, [filteredByMode])

  const exportToCsv = () => {
    const headers = ["STT", "Họ và tên", "Phân môn", "Lớp", "Bài viết", "Điểm", "Xếp loại", "Nhận xét sư phạm", "Ngày chấm"]
    const rows = sorted.map((g, i) => [
      i + 1,
      `"${g.studentName}"`,
      g.gradingMode === "essay" ? "Tập làm văn" : "Chính tả SGK",
      g.className || "",
      `"${g.assignmentTitle.replace(/"/g, "'")}"`,
      g.score,
      g.overallRating,
      `"${(g.pedagogicalComment || g.feedback || "").replace(/"/g, "'")}"`,
      new Date(g.createdAt).toLocaleDateString("vi-VN")
    ])
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `bao-cao-diem-${modeFilter}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  const dictationCount = grades.filter(g => g.gradingMode !== "essay").length
  const essayCount = grades.filter(g => g.gradingMode === "essay").length

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center gap-4 border-b border-border bg-card px-4 py-4 md:px-6">
        <SidebarTrigger className="-ml-2" />
        <Separator orientation="vertical" className="h-6" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-card-foreground">Báo Cáo &amp; Thống Kê Phân Môn</h1>
          <p className="text-xs text-muted-foreground">Phân tích kết quả học tập phân môn Chính tả &amp; Tập làm văn • {grades.length} bài đã chấm</p>
        </div>
        <div className="flex gap-2 items-center">
          <HelpGuideButton role="teacher" />
          <Button variant="outline" size="sm" onClick={fetchGrades} disabled={loading} title="Làm mới dữ liệu">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={exportToCsv} size="sm" disabled={filteredByMode.length === 0} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Download className="w-4 h-4 mr-1.5" /><span className="hidden md:inline">Xuất Báo Cáo CSV</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 space-y-6 overflow-x-hidden min-w-0">

        {/* 🎯 BỘ LỌC PHÂN MÔN & TÌM KIẾM */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Mode Filter Pills */}
          <div className="flex items-center p-1 bg-muted rounded-xl border border-border shrink-0">
            <button
              type="button"
              onClick={() => setModeFilter("all")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                modeFilter === "all"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              📊 Tất Cả Bài ({grades.length})
            </button>
            <button
              type="button"
              onClick={() => setModeFilter("dictation")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                modeFilter === "dictation"
                  ? "bg-card text-indigo-700 dark:text-indigo-300 shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Target className="w-3.5 h-3.5 text-indigo-600" />
              Chính Tả SGK ({dictationCount})
            </button>
            <button
              type="button"
              onClick={() => setModeFilter("essay")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                modeFilter === "essay"
                  ? "bg-card text-purple-700 dark:text-purple-300 shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Pencil className="w-3.5 h-3.5 text-purple-600" />
              Tập Làm Văn ({essayCount})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Tìm theo tên học sinh, lớp, bài viết..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>

        {/* 📊 STATS CARDS */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/60 shadow-xs">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Tổng số bài nộp</p>
              <p className="text-2xl font-extrabold text-foreground mt-1">{filteredByMode.length}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {modeFilter === "dictation" ? "Bài chính tả nghe-viết" : modeFilter === "essay" ? "Bài văn tự do" : "Toàn bộ phân môn"}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-xs">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Điểm trung bình</p>
              <p className="text-2xl font-extrabold text-indigo-600 mt-1">{avg}<span className="text-xs font-normal text-muted-foreground"> /10đ</span></p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Barem chuẩn GDPT 2018</p>
            </CardContent>
          </Card>

          <Card className="border-emerald-200/70 bg-emerald-50/20 dark:bg-emerald-950/10 shadow-xs">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-emerald-800 dark:text-emerald-300">Đạt loại Tốt &amp; Xuất sắc</p>
              <p className="text-2xl font-extrabold text-emerald-600 mt-1">
                {dist.excellent + dist.good}
                <span className="text-xs font-normal text-muted-foreground"> ({filteredByMode.length > 0 ? Math.round(((dist.excellent + dist.good) / filteredByMode.length) * 100) : 0}%)</span>
              </p>
              <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400 mt-0.5">Điểm số từ 7.0 đến 10.0</p>
            </CardContent>
          </Card>

          <Card className="border-rose-200/70 bg-rose-50/20 dark:bg-rose-950/10 shadow-xs">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-rose-800 dark:text-rose-300">Tổng lỗi chính tả phát hiện</p>
              <p className="text-2xl font-extrabold text-rose-600 mt-1">{errorStats.total}</p>
              <p className="text-[11px] text-rose-700/80 dark:text-rose-400 mt-0.5">Phân loại qua mô hình ViT5</p>
            </CardContent>
          </Card>
        </div>

        {/* 📈 BIỂU ĐỒ SONG HÀNH: PHÂN BỐ ĐIỂM & 6 NHÓM LỖI CHÍNH TẢ */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Biểu đồ 1: Phân bố điểm số */}
          <Card className="border-border/60 shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart className="w-4 h-4 text-indigo-600" />
                Phổ Điểm Học Sinh
              </CardTitle>
              <CardDescription className="text-xs">Tỷ lệ phân bố thang điểm 10 theo từng mức xếp loại</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis dataKey="name" className="text-xs" tickLine={false} />
                    <YAxis allowDecimals={false} className="text-xs" tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)", background: "var(--card)", fontSize: "12px" }} />
                    <Bar dataKey="count" name="Số bài" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Biểu đồ 2: Phân tích 6 nhóm lỗi chính tả GDPT 2018 */}
          <Card className="border-border/60 shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Thống Kê 6 Nhóm Lỗi Chính Tả (Chuẩn GDPT 2018)
              </CardTitle>
              <CardDescription className="text-xs">Giúp giáo viên nắm bắt âm vần học sinh hay nhầm lẫn nhất</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={errorStats.chart} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} className="text-xs" />
                    <YAxis dataKey="name" type="category" width={85} className="text-[11px]" tickLine={false} />
                    <Tooltip
                      formatter={(val: any, name: any, item: any) => [`${val} lỗi`, item.payload.fullName]}
                      contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)", background: "var(--card)", fontSize: "12px" }}
                    />
                    <Bar dataKey="count" name="Số lỗi" radius={[0, 4, 4, 0]}>
                      {errorStats.chart.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 📋 BẢNG DANH SÁCH BÀI CHẤM */}
        <Card className="border-border/60 shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">Danh Sách Bài Đã Chấm</CardTitle>
                <CardDescription className="text-xs">
                  {loading ? "Đang tải dữ liệu..." : `Hiển thị ${sorted.length} bài chấm (${modeFilter === "all" ? "Tất cả" : modeFilter === "dictation" ? "Chính tả" : "Tập làm văn"})`}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {loading ? (
              <div className="flex justify-center py-16"><Spinner className="w-8 h-8 text-indigo-600" /></div>
            ) : sorted.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <BookOpen className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-sm">Chưa có dữ liệu bài chấm phù hợp</p>
                <p className="text-xs mt-1">Chấm điểm ở trang Chấm bài để tự động lưu vào báo cáo này</p>
              </div>
            ) : (
              <Table className="min-w-[650px] text-xs">
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-12 text-center">STT</TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" className="p-0 h-auto font-semibold text-xs" onClick={() => handleSort("studentName")}>
                        Học sinh <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                    </TableHead>
                    <TableHead className="w-32">Phân môn</TableHead>
                    <TableHead className="hidden md:table-cell">Lớp</TableHead>
                    <TableHead className="hidden md:table-cell">Tên bài viết</TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" className="p-0 h-auto font-semibold text-xs" onClick={() => handleSort("scoreNum")}>
                        Điểm số <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                    </TableHead>
                    <TableHead className="hidden md:table-cell">Xếp loại</TableHead>
                    <TableHead className="hidden lg:table-cell">
                      <Button variant="ghost" size="sm" className="p-0 h-auto font-semibold text-xs" onClick={() => handleSort("createdAt")}>
                        Ngày chấm <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                    </TableHead>
                    <TableHead className="w-20 text-center">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((grade, i) => {
                    const badge = getScoreBadge(grade.scoreNum)
                    const isEssay = grade.gradingMode === "essay"
                    return (
                      <TableRow key={grade.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="text-center font-medium text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-semibold text-foreground">{grade.studentName}</TableCell>
                        <TableCell>
                          {isEssay ? (
                            <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200 gap-1 font-semibold dark:bg-purple-950/40 dark:text-purple-300">
                              <Pencil className="w-2.5 h-2.5" /> Tập làm văn
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200 gap-1 font-semibold dark:bg-indigo-950/40 dark:text-indigo-300">
                              <Target className="w-2.5 h-2.5" /> Chính tả SGK
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">{grade.className || "3A"}</TableCell>
                        <TableCell className="hidden md:table-cell font-medium max-w-[200px] truncate" title={grade.assignmentTitle}>
                          {grade.assignmentTitle}
                        </TableCell>
                        <TableCell>
                          <span className="font-extrabold text-sm text-foreground">{grade.score}</span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline" className={badge.className}>{badge.label}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden lg:table-cell text-xs">
                          {new Date(grade.createdAt).toLocaleDateString("vi-VN")}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50" onClick={() => setSelectedGrade(grade)} title="Xem chi tiết bài">
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                              onClick={() => handleDelete(grade.id)} disabled={deletingId === grade.id} title="Xóa bài">
                              {deletingId === grade.id ? <Spinner className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
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

      {/* ── DIALOG XEM CHI TIẾT BÀI CHẤM ── */}
      <Dialog open={!!selectedGrade} onOpenChange={(open) => !open && setSelectedGrade(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-base">
              <span>Bài Chấm: {selectedGrade?.studentName}</span>
              {selectedGrade?.gradingMode === "essay" ? (
                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">✍️ Tập Làm Văn</Badge>
              ) : (
                <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200">🎯 Chính Tả SGK</Badge>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Lớp {selectedGrade?.className || "3A"} • Bài: {selectedGrade?.assignmentTitle} • Ngày: {selectedGrade && new Date(selectedGrade.createdAt).toLocaleString("vi-VN")}
            </DialogDescription>
          </DialogHeader>

          {selectedGrade && (
            <div className="space-y-4 text-xs">
              {/* Điểm & Xếp loại */}
              <div className="p-3 rounded-xl border border-indigo-100 bg-indigo-50/50 dark:bg-indigo-950/30 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] text-muted-foreground">Điểm Barem Tổng Kết</span>
                  <div className="text-2xl font-extrabold text-indigo-600">{selectedGrade.score}</div>
                </div>
                <Badge className={`text-xs px-3 py-1 ${getRatingStyle(selectedGrade.overallRating)}`}>
                  {selectedGrade.overallRating}
                </Badge>
              </div>

              {/* Lời nhận xét sư phạm */}
              <div className="space-y-1.5 p-3 rounded-xl border border-border bg-card">
                <p className="font-bold flex items-center gap-1.5 text-foreground">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  Nhận Xét Của Giáo Viên:
                </p>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                  {selectedGrade.pedagogicalComment || selectedGrade.feedback}
                </p>
              </div>

              {/* Lỗi chính tả */}
              {(() => {
                let corrections: Correction[] = []
                try { corrections = JSON.parse(selectedGrade.corrections) } catch {}
                return corrections.length > 0 ? (
                  <div className="space-y-2">
                    <p className="font-bold text-foreground flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                      Chi Tiết Các Lỗi ({corrections.length} lỗi):
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {corrections.map((c, i) => {
                        const typeInfo = ERROR_TYPE_LABELS[c.error_type || "phu_am_dau"] || ERROR_TYPE_LABELS.phu_am_dau
                        return (
                          <div key={i} className="p-2.5 rounded-lg border border-border/80 bg-muted/20 space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <div>
                                <span className="text-destructive font-medium line-through">{c.error}</span>
                                <span className="mx-1 text-muted-foreground">→</span>
                                <span className="text-emerald-600 font-bold">{c.suggestion}</span>
                              </div>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-medium text-muted-foreground">{typeInfo.shortLabel}</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-tight">{c.reason}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Bài viết không có lỗi chính tả nào!
                  </div>
                )
              })()}

              {/* Văn bản đối chiếu */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="font-semibold text-muted-foreground">Chữ Học Sinh Viết (OCR):</p>
                  <div className="p-3 rounded-lg bg-muted/40 border text-xs leading-relaxed font-sans whitespace-pre-wrap max-h-36 overflow-y-auto">
                    {selectedGrade.originalText}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-emerald-700">Văn Bản Chuẩn / Đã Sửa:</p>
                  <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-200 text-xs leading-relaxed font-sans whitespace-pre-wrap max-h-36 overflow-y-auto text-emerald-900">
                    {selectedGrade.fixedText}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
