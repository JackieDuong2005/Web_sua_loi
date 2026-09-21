"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  Trophy,
  TrendingUp,
  FileText,
  Star,
  ArrowRight,
  Loader2,
  Volume2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  BookOpen,
  HeartHandshake,
  ShieldCheck,
  RotateCcw,
  Calendar,
  Layers,
  ChevronRight,
} from "lucide-react"
import Link from "next/link"
import { HelpGuideButton } from "@/components/help-guide"
import {
  StudentGradeDetailModal,
  StudentGradeRecord,
  CorrectionItem,
} from "@/components/student/student-grade-detail-modal"

function getScoreLevel(score: number) {
  if (score >= 9) return { label: "Xuất sắc", color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200", icon: Trophy, message: "Tuyệt vời! Con học tập rất chăm chỉ và xuất sắc!" }
  if (score >= 7) return { label: "Hoàn thành tốt", color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200", icon: Star, message: "Tốt lắm! Nét chữ và chính tả của con đang tiến bộ từng ngày!" }
  if (score >= 5) return { label: "Hoàn thành", color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200", icon: TrendingUp, message: "Con đang tiến bộ. Hãy chú ý các lỗi chính tả cô đã gạch nhé!" }
  return { label: "Cần cố gắng", color: "text-rose-700 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/30", border: "border-rose-200", icon: AlertCircle, message: "Hãy cùng bố mẹ luyện đọc và viết lại các từ khó nhé!" }
}

const ERROR_LABELS: Record<string, string> = {
  phu_am_dau: "Phụ âm đầu (s/x, tr/ch, d/gi/r, l/n)",
  dau_thanh: "Dấu thanh (dấu hỏi / dấu ngã)",
  van: "Vần (an/ang, en/eng, iên/iêng...)",
  am_chinh: "Nguyên âm chính (o/ô, u/ư...)",
  phu_am_cuoi: "Âm cuối (t/c, n/ng...)",
  viet_hoa: "Quy tắc viết hoa đầu câu & tên riêng",
  bo_sot_them: "Bỏ sót hoặc thêm nét chữ",
  thay_the_tu: "Sai khác từ so với bài mẫu",
  dau_cau: "Dấu chấm, dấu phẩy",
}

export default function StudentDashboard() {
  const [grades, setGrades] = useState<StudentGradeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [studentName, setStudentName] = useState("Học sinh")
  const [selectedGrade, setSelectedGrade] = useState<StudentGradeRecord | null>(null)

  // Audio preview cho kho từ khó
  const [playingWord, setPlayingWord] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const playAudio = (text: string) => {
    if (!text) return
    if (audioRef.current) audioRef.current.pause()
    setPlayingWord(text)
    const audio = new Audio(`/api/dictation/tts?text=${encodeURIComponent(text)}&voice=vi-VN-HoaiMyNeural&rate=-15%`)
    audioRef.current = audio
    audio.onended = () => setPlayingWord(null)
    audio.onerror = () => setPlayingWord(null)
    audio.play().catch(() => setPlayingWord(null))
  }

  useEffect(() => {
    async function fetchData() {
      try {
        const userStr = localStorage.getItem("vihand_user")
        let myName = ""
        if (userStr) {
          const user = JSON.parse(userStr)
          myName = user.name || ""
          setStudentName(user.name || "Học sinh")
        }

        const res = await fetch("/api/grades")
        if (!res.ok) throw new Error("Không thể kết nối máy chủ điểm")
        const data = await res.json()
        const allGrades: StudentGradeRecord[] = data.grades || []

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

  // 1. Thống kê điểm số
  const latestGrade = grades[0] || null
  const latestScore = latestGrade?.scoreNum || 0
  const averageScore =
    grades.length > 0
      ? Math.round((grades.reduce((sum, g) => sum + g.scoreNum, 0) / grades.length) * 10) / 10
      : 0
  const highestScore = grades.length > 0 ? Math.max(...grades.map((g) => g.scoreNum)) : 0
  const scoreLevel = getScoreLevel(latestScore)
  const ScoreIcon = scoreLevel.icon

  // 2. Thống kê phân tích lỗi cho Phụ huynh
  const errorStats = useMemo(() => {
    const counts: Record<string, number> = {}
    const wordsToPractice: Array<{ error: string; suggestion: string; reason: string; assignment: string }> = []

    grades.forEach((g) => {
      let items: CorrectionItem[] = []
      try {
        if (Array.isArray(g.corrections)) items = g.corrections
        else if (typeof g.corrections === "string" && g.corrections.trim()) {
          items = JSON.parse(g.corrections)
        }
      } catch {}

      items.forEach((item) => {
        const type = item.error_type || "phu_am_dau"
        counts[type] = (counts[type] || 0) + 1

        if (wordsToPractice.length < 8 && !wordsToPractice.some((w) => w.suggestion === item.suggestion)) {
          wordsToPractice.push({
            error: item.error,
            suggestion: item.suggestion,
            reason: item.reason,
            assignment: g.assignmentTitle,
          })
        }
      })
    })

    const totalErrors = Object.values(counts).reduce((a, b) => a + b, 0)
    const sortedTypes = Object.entries(counts)
      .map(([type, count]) => ({
        type,
        label: ERROR_LABELS[type] || type,
        count,
        percent: totalErrors > 0 ? Math.round((count / totalErrors) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)

    return { totalErrors, sortedTypes, wordsToPractice }
  }, [grades])

  // 3. Tiến trình 5 bài gần nhất (Điểm số)
  const recentGrades = grades.slice(0, 5)

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="flex items-center gap-4 border-b border-border bg-card px-4 py-4 md:px-6">
        <SidebarTrigger className="-ml-2" />
        <Separator orientation="vertical" className="h-6" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-card-foreground">Góc Học Tập & Đồng Hành Cùng Con</h1>
          <p className="text-sm text-muted-foreground">Theo dõi hành trình luyện chữ và rèn luyện chính tả tiếng Việt</p>
        </div>
        <HelpGuideButton role="student" />
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 space-y-6 overflow-x-hidden min-w-0">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="font-medium">Đang tải kết quả học tập...</span>
          </div>
        ) : error ? (
          <div className="text-center py-16 text-destructive text-sm font-medium">{error}</div>
        ) : grades.length === 0 ? (
          <div className="text-center py-16 bg-muted/20 border border-dashed rounded-2xl space-y-3">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/60" />
            <h3 className="font-bold text-lg text-foreground">Chào mừng {studentName} đến với ViHand Grade!</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Chưa có bài viết nào được nộp. Hãy nhờ cô giáo chụp trang vở của con để chấm điểm và nhận lời khuyên hữu ích nhé!
            </p>
          </div>
        ) : (
          <>
            {/* ── HERO BANNER: KẾT QUẢ BÀI GẦN NHẤT ── */}
            <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-background p-5 sm:p-6 shadow-xs relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative z-10">
                <div className="flex items-center gap-4 sm:gap-5">
                  <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex flex-col items-center justify-center font-bold shadow-md ${scoreLevel.bg} ${scoreLevel.color} border ${scoreLevel.border} shrink-0`}>
                    <span className="text-2xl sm:text-3xl leading-none">{latestScore}</span>
                    <span className="text-[10px] uppercase font-semibold mt-1">Điểm</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={`${scoreLevel.bg} ${scoreLevel.color} ${scoreLevel.border} border text-xs font-bold gap-1`}>
                        <ScoreIcon className="w-3.5 h-3.5" />
                        {scoreLevel.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Bài gần nhất: {latestGrade?.assignmentTitle}
                      </span>
                    </div>
                    <p className="text-base sm:text-lg font-bold text-foreground">
                      {scoreLevel.message}
                    </p>
                    <p className="text-xs sm:text-sm text-muted-foreground italic line-clamp-1">
                      &ldquo;{latestGrade?.pedagogicalComment || latestGrade?.feedback || "Con làm bài rất tốt!"}&rdquo;
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-end">
                  <Button
                    size="sm"
                    className="gap-1.5 font-semibold text-xs shadow-xs"
                    onClick={() => setSelectedGrade(latestGrade)}
                  >
                    <FileText className="w-4 h-4" /> Xem chi tiết bài này
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* ── 3 THẺ CHỈ SỐ NHANH ── */}
            <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-3">
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Điểm trung bình
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-primary">{averageScore.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground font-medium">/ 10 điểm</span>
                  </div>
                  <Progress value={averageScore * 10} className="mt-2.5 h-2" />
                  <p className="text-xs text-muted-foreground mt-2">Dựa trên {grades.length} bài viết đã nộp</p>
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Số bài viết hoàn thành
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-foreground">{grades.length}</span>
                    <span className="text-xs text-muted-foreground font-medium">bài viết</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2.5 text-xs text-emerald-600 font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Con đang duy trì nếp rèn chữ tốt!</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Điểm số cao nhất
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-emerald-600">{highestScore.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground font-medium">/ 10 điểm</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Thành tích đáng tự hào của con</span>
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* ── GÓC PHỤ HUYNH: PHÂN TÍCH TIẾN ĐỘ & BẢN ĐỒ TẬT CHÍNH TẢ ── */}
            <div className="rounded-2xl border border-blue-200/80 bg-blue-50/20 dark:bg-blue-950/10 p-5 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-blue-100 dark:border-blue-900/40 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                    <HeartHandshake className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-base text-foreground flex items-center gap-2">
                      <span>Góc Phụ Huynh — Phân Tích Kỹ Năng Của Con</span>
                      <Badge variant="outline" className="text-[10px] text-blue-700 bg-blue-100/50 border-blue-200">
                        Chuyên sâu
                      </Badge>
                    </h2>
                    <p className="text-xs text-muted-foreground">Giúp ba mẹ nắm rõ điểm mạnh và phần con cần hỗ trợ thêm tại nhà</p>
                  </div>
                </div>

                <div className="text-xs text-blue-800 dark:text-blue-300 bg-blue-100/60 dark:bg-blue-900/30 px-3 py-1 rounded-full font-medium flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Dựa theo chuẩn GD Tiểu học (TT27)</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* 1. Thống kê tỷ lệ các nhóm lỗi hay mắc phải */}
                <div className="space-y-3 bg-card p-4 rounded-xl border border-border/60">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-xs sm:text-sm text-foreground uppercase tracking-wider">
                      📊 Các dạng lỗi chính tả con thường gặp
                    </h3>
                    <span className="text-xs text-muted-foreground">Tổng: {errorStats.totalErrors} lỗi</span>
                  </div>

                  {errorStats.sortedTypes.length === 0 ? (
                    <div className="py-6 text-center text-emerald-600 text-xs font-semibold">
                      🎉 Bé chưa từng mắc lỗi chính tả nào trong các bài kiểm tra!
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {errorStats.sortedTypes.slice(0, 4).map((item, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-foreground">{item.label}</span>
                            <span className="font-bold text-rose-600">{item.count} lần ({item.percent}%)</span>
                          </div>
                          <Progress value={item.percent} className="h-1.5 bg-muted" />
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-[11px] text-muted-foreground italic pt-1">
                    * Mẹo: Tập trung rèn luyện nhóm lỗi có tỷ lệ % cao nhất để bé tiến bộ nhanh nhất.
                  </p>
                </div>

                {/* 2. Lời khuyên Sư phạm cho Ba Mẹ */}
                <div className="space-y-3 bg-card p-4 rounded-xl border border-border/60 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm text-foreground uppercase tracking-wider flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
                      <Sparkles className="w-4 h-4" /> Lời khuyên của Giáo viên dành cho Ba Mẹ
                    </h3>

                    <div className="mt-2.5 space-y-2 text-xs leading-relaxed text-foreground/90">
                      <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/40">
                        <span className="font-bold text-blue-600">1.</span>
                        <span>
                          <strong>Khắc phục lỗi phát âm phương ngữ:</strong> Cho bé nghe phát âm chuẩn bằng nút loa 🔊 trên hệ thống mỗi tối 10 phút.
                        </span>
                      </div>
                      <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/40">
                        <span className="font-bold text-blue-600">2.</span>
                        <span>
                          <strong>Tư thế và khoảng cách chữ:</strong> Nhắc bé ngồi thẳng lưng, khoảng cách từ mắt đến vở là 25–30cm để nét chữ đều và đẹp.
                        </span>
                      </div>
                      <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/40">
                        <span className="font-bold text-blue-600">3.</span>
                        <span>
                          <strong>Khen ngợi nỗ lực:</strong> Thay vì chỉ nhìn vào điểm số, hãy khen ngợi khi bé sửa được từ từng viết sai trước đó.
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t text-right">
                    <Link href="/student/history">
                      <Button variant="ghost" size="sm" className="text-xs text-blue-600 hover:text-blue-700 p-0 h-auto font-semibold gap-1">
                        Xem toàn bộ lịch sử điểm của con <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* ── KHO TỪ CẦN ÔN LUYỆN (SPELLING PRACTICE BANK) ── */}
            {errorStats.wordsToPractice.length > 0 && (
              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <RotateCcw className="w-4 h-4 text-primary" />
                        <span>Kho từ con cần luyện lại (Tự sửa lỗi tại nhà)</span>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Bé bấm vào biểu tượng loa để nghe phát âm chuẩn và tự viết lại vào vở nhé
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {errorStats.wordsToPractice.map((w, i) => {
                      const isPlaying = playingWord === w.suggestion
                      return (
                        <div
                          key={i}
                          className="p-3 rounded-xl border bg-card hover:border-primary/50 transition-all flex flex-col justify-between gap-2 shadow-2xs"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="line-through text-rose-600 font-bold text-sm">
                                {w.error}
                              </span>
                              <ArrowRight className="w-3 h-3 text-muted-foreground" />
                              <span className="text-emerald-600 font-bold text-base">
                                {w.suggestion}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className={`h-7 w-7 p-0 rounded-full ${isPlaying ? "bg-primary text-white animate-pulse" : "text-primary hover:bg-primary/10"}`}
                                onClick={() => playAudio(w.suggestion)}
                                title="Nghe phát âm chuẩn"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                            {w.reason && (
                              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                                {w.reason}
                              </p>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground block truncate">
                            Từ bài: {w.assignment}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── BÀI VIẾT GẦN ĐÂY ── */}
            <Card className="border-border/60">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">Các bài viết gần nhất</CardTitle>
                  <CardDescription className="text-xs">5 bài chấm mới nhất được giáo viên cập nhật</CardDescription>
                </div>
                <Link href="/student/history">
                  <Button variant="outline" size="sm" className="text-xs font-semibold gap-1">
                    Xem tất cả bài <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="space-y-2.5">
                  {recentGrades.map((grade) => {
                    const level = getScoreLevel(grade.scoreNum)
                    return (
                      <div
                        key={grade.id}
                        onClick={() => setSelectedGrade(grade)}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base shrink-0 ${level.bg} ${level.color} border ${level.border}`}>
                            {grade.scoreNum}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="font-bold text-sm text-foreground truncate">{grade.assignmentTitle}</p>
                              <Badge className={`${level.bg} ${level.color} ${level.border} border text-[10px] py-0 px-1.5`}>
                                {level.label}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {grade.pedagogicalComment || grade.feedback || "Không có nhận xét"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-muted-foreground hidden sm:inline">
                            {new Date(grade.createdAt).toLocaleDateString("vi-VN")}
                          </span>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground">
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>

      {/* Modal xem chi tiết */}
      <StudentGradeDetailModal
        grade={selectedGrade}
        open={!!selectedGrade}
        onOpenChange={(open) => !open && setSelectedGrade(null)}
      />
    </div>
  )
}
