"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Loader2,
  Eye,
  ArrowRight,
  Search,
  Filter,
  Trophy,
  Star,
  CheckCircle2,
  AlertCircle,
  FileText,
  Volume2,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react"
import Link from "next/link"
import { HelpGuideButton } from "@/components/help-guide"
import {
  StudentGradeDetailModal,
  StudentGradeRecord,
} from "@/components/student/student-grade-detail-modal"

function getScoreLevel(score: number) {
  if (score >= 9) return { label: "Xuất sắc", color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200", emoji: "🏆" }
  if (score >= 7) return { label: "Tốt", color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200", emoji: "🌟" }
  if (score >= 5) return { label: "Khá", color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200", emoji: "⭐" }
  return { label: "Cần cố gắng", color: "text-rose-700 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/30", border: "border-rose-200", emoji: "📝" }
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  } catch {
    return dateStr
  }
}

export default function StudentHistoryPage() {
  const [grades, setGrades] = useState<StudentGradeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedGrade, setSelectedGrade] = useState<StudentGradeRecord | null>(null)

  // Bộ lọc
  const [searchQuery, setSearchQuery] = useState("")
  const [modeFilter, setModeFilter] = useState<"all" | "dictation" | "essay">("all")
  const [scoreFilter, setScoreFilter] = useState<"all" | "excellent" | "good" | "fair" | "needs_work">("all")

  useEffect(() => {
    async function fetchData() {
      try {
        const userStr = localStorage.getItem("vihand_user")
        let myName = ""
        if (userStr) {
          const user = JSON.parse(userStr)
          myName = user.name || ""
        }

        const res = await fetch("/api/grades")
        if (!res.ok) throw new Error("Không thể tải dữ liệu bài chấm")
        const data = await res.json()
        const allGrades = data.grades || []

        // Lọc theo tên học sinh đã đăng nhập (hoặc toàn bộ nếu là tài khoản demo)
        const filtered = myName
          ? allGrades.filter((g: any) => g.studentName === myName)
          : allGrades
        setGrades(filtered)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Thống kê nhanh
  const stats = useMemo(() => {
    const total = grades.length
    const avg = total > 0 ? (grades.reduce((s, g) => s + g.scoreNum, 0) / total).toFixed(1) : "0"
    const excellent = grades.filter((g) => g.scoreNum >= 9).length
    const good = grades.filter((g) => g.scoreNum >= 7 && g.scoreNum < 9).length
    return { total, avg, excellent, good }
  }, [grades])

  // Lọc dữ liệu hiển thị
  const filteredGrades = useMemo(() => {
    return grades.filter((grade) => {
      // 1. Tìm kiếm
      const matchSearch =
        !searchQuery.trim() ||
        grade.assignmentTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (grade.feedback && grade.feedback.toLowerCase().includes(searchQuery.toLowerCase()))

      // 2. Thể loại
      const matchMode =
        modeFilter === "all" ||
        (modeFilter === "dictation" && (!grade.gradingMode || grade.gradingMode === "dictation")) ||
        (modeFilter === "essay" && grade.gradingMode === "essay")

      // 3. Mức điểm
      const score = grade.scoreNum
      let matchScore = true
      if (scoreFilter === "excellent") matchScore = score >= 9
      else if (scoreFilter === "good") matchScore = score >= 7 && score < 9
      else if (scoreFilter === "fair") matchScore = score >= 5 && score < 7
      else if (scoreFilter === "needs_work") matchScore = score < 5

      return matchSearch && matchMode && matchScore
    })
  }, [grades, searchQuery, modeFilter, scoreFilter])

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="flex items-center gap-4 border-b border-border bg-card px-4 py-4 md:px-6">
        <SidebarTrigger className="-ml-2" />
        <Separator orientation="vertical" className="h-6" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-card-foreground">Sổ Điểm & Lịch Sử Bài Chấm</h1>
          <p className="text-sm text-muted-foreground">Theo dõi kết quả học tập và lời nhận xét chi tiết của giáo viên</p>
        </div>
        <HelpGuideButton role="student" />
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 space-y-6 overflow-x-hidden min-w-0">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="font-medium">Đang tải sổ điểm của con...</span>
          </div>
        ) : error ? (
          <div className="text-center py-16 text-destructive text-sm font-medium">{error}</div>
        ) : (
          <>
            {/* 4 Thẻ Thống Kê Tổng Quan */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
              <Card className="border-border/60 shadow-xs">
                <CardContent className="pt-5 pb-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tổng số bài</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl sm:text-3xl font-bold">{stats.total}</span>
                    <span className="text-xs text-muted-foreground">bài đã chấm</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-emerald-200/60 bg-emerald-50/20 dark:bg-emerald-950/10 shadow-xs">
                <CardContent className="pt-5 pb-4">
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5" /> Xuất sắc (9-10đ)
                  </p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl sm:text-3xl font-bold text-emerald-700 dark:text-emerald-400">{stats.excellent}</span>
                    <span className="text-xs text-muted-foreground">bài đạt giải</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-blue-200/60 bg-blue-50/20 dark:bg-blue-950/10 shadow-xs">
                <CardContent className="pt-5 pb-4">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">
                    <Star className="w-3.5 h-3.5" /> Hoàn thành tốt (7-8đ)
                  </p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl sm:text-3xl font-bold text-blue-700 dark:text-blue-400">{stats.good}</span>
                    <span className="text-xs text-muted-foreground">bài tiến bộ</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-primary/5 shadow-xs">
                <CardContent className="pt-5 pb-4">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider">Điểm trung bình</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl sm:text-3xl font-bold text-primary">{stats.avg}</span>
                    <span className="text-xs text-muted-foreground">/ 10 điểm</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Thanh Tìm Kiếm & Bộ Lọc Nhanh */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-card p-3 sm:p-4 rounded-xl border border-border/60">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Tìm theo tên bài học..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                {/* Lọc thể loại */}
                <div className="flex rounded-lg border bg-muted/40 p-0.5 text-xs font-medium shrink-0">
                  <button
                    onClick={() => setModeFilter("all")}
                    className={`px-2.5 py-1 rounded-md transition-all ${modeFilter === "all" ? "bg-background text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Tất cả thể loại
                  </button>
                  <button
                    onClick={() => setModeFilter("dictation")}
                    className={`px-2.5 py-1 rounded-md transition-all ${modeFilter === "dictation" ? "bg-background text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Chính tả
                  </button>
                  <button
                    onClick={() => setModeFilter("essay")}
                    className={`px-2.5 py-1 rounded-md transition-all ${modeFilter === "essay" ? "bg-background text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Tập làm văn
                  </button>
                </div>

                {/* Lọc điểm số */}
                <select
                  value={scoreFilter}
                  onChange={(e: any) => setScoreFilter(e.target.value)}
                  className="h-8 text-xs rounded-md border border-input bg-background px-2.5 py-1 shrink-0 font-medium text-foreground cursor-pointer focus:outline-hidden"
                >
                  <option value="all">Tất cả mức điểm</option>
                  <option value="excellent">🏆 Xuất sắc (≥ 9.0)</option>
                  <option value="good">🌟 Tốt (7.0 - 8.9)</option>
                  <option value="fair">⭐ Khá (5.0 - 6.9)</option>
                  <option value="needs_work">📝 Cần cố gắng (&lt; 5.0)</option>
                </select>
              </div>
            </div>

            {/* Danh sách thẻ bài chấm (Grid Layout) */}
            {filteredGrades.length === 0 ? (
              <div className="text-center py-16 bg-muted/20 border border-dashed rounded-xl space-y-2">
                <FileText className="w-10 h-10 mx-auto text-muted-foreground/50" />
                <p className="font-semibold text-foreground">Không tìm thấy bài chấm nào phù hợp</p>
                <p className="text-xs text-muted-foreground">Thử đổi từ khóa tìm kiếm hoặc chọn bộ lọc &ldquo;Tất cả&rdquo; nhé!</p>
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {filteredGrades.map((grade) => {
                  const level = getScoreLevel(grade.scoreNum)
                  let correctionsCount = 0
                  try {
                    if (Array.isArray(grade.corrections)) correctionsCount = grade.corrections.length
                    else if (typeof grade.corrections === "string" && grade.corrections.trim()) {
                      correctionsCount = JSON.parse(grade.corrections).length
                    }
                  } catch {}

                  return (
                    <Card
                      key={grade.id}
                      className="border-border/60 hover:border-primary/50 transition-all duration-200 hover:shadow-md flex flex-col justify-between group overflow-hidden"
                    >
                      <div>
                        {/* Card Header với Điểm số & Badge */}
                        <div className="p-4 border-b border-border/40 bg-muted/20 flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                              <Badge variant="outline" className="text-[10px] font-semibold bg-background">
                                {grade.gradingMode === "essay" ? "Tập làm văn" : "Chính tả Nghe - Viết"}
                              </Badge>
                              <Badge className={`${level.bg} ${level.color} ${level.border} border text-[10px] font-bold`}>
                                {level.emoji} {level.label}
                              </Badge>
                            </div>
                            <h3 className="font-bold text-sm sm:text-base line-clamp-1 group-hover:text-primary transition-colors">
                              {grade.assignmentTitle}
                            </h3>
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                              <Calendar className="w-3 h-3" /> {formatDate(grade.createdAt)}
                              {grade.className && <span>• Lớp {grade.className}</span>}
                            </p>
                          </div>

                          {/* Điểm to nổi bật */}
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shrink-0 ${level.bg} ${level.color} border ${level.border}`}>
                            {grade.scoreNum}
                          </div>
                        </div>

                        {/* Card Body: Nhận xét sư phạm & Lỗi tóm tắt */}
                        <CardContent className="p-4 space-y-3">
                          <p className="text-xs text-foreground/80 leading-relaxed line-clamp-2 italic bg-background/50 p-2.5 rounded-lg border border-border/40">
                            &ldquo;{grade.pedagogicalComment || grade.feedback || "Con làm bài tốt."}&rdquo;
                          </p>

                          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                            <span className="flex items-center gap-1">
                              {correctionsCount === 0 ? (
                                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Đúng 100%
                                </span>
                              ) : (
                                <span className="text-rose-600 font-medium flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5" /> {correctionsCount} lỗi chính tả
                                </span>
                              )}
                            </span>

                            {grade.imageBase64 && (
                              <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-md font-medium">
                                Có ảnh chấm bài
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </div>

                      {/* Card Footer: Nút xem chi tiết & nghe đọc */}
                      <div className="p-3 bg-muted/30 border-t border-border/40 flex items-center justify-end">
                        <Button
                          size="sm"
                          className="w-full justify-center gap-1.5 text-xs font-semibold cursor-pointer"
                          onClick={() => setSelectedGrade(grade)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Xem chi tiết & Nghe đọc
                          <ArrowRight className="w-3 h-3" />
                        </Button>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Modal Chi Tiết Bài Chấm Chuyên Nghiệp ── */}
      <StudentGradeDetailModal
        grade={selectedGrade}
        open={!!selectedGrade}
        onOpenChange={(open) => !open && setSelectedGrade(null)}
      />
    </div>
  )
}
