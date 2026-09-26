"use client"

import React, { useState, useRef, useMemo, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Volume2,
  Trophy,
  Star,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Printer,
  FileText,
  Image as ImageIcon,
  Check,
  BookOpen,
  ArrowRight,
  User,
  Calendar,
  Layers,
  Filter,
  PenTool,
  Lightbulb,
  CheckCheck,
} from "lucide-react"
import { StudentBoundingBoxCanvas } from "./student-bbox-canvas"

export interface CorrectionItem {
  error: string
  suggestion: string
  error_type?: string
  is_dialect?: boolean
  reason: string
  bbox?: {
    x1?: number
    y1?: number
    x2?: number
    y2?: number
    rel_x1?: number
    rel_y1?: number
    rel_w?: number
    rel_h?: number
  }
}

export interface StudentGradeRecord {
  id: string
  studentName: string
  assignmentTitle: string
  className?: string
  scoreNum: number
  score: string
  gradingMode?: string // "dictation" | "essay"
  scoreBreakdown?: string
  feedback?: string
  pedagogicalComment?: string
  overallRating?: string
  originalText?: string
  fixedText?: string
  corrections?: string | CorrectionItem[]
  imageBase64?: string
  imagePath?: string
  createdAt: string
}

interface StudentGradeDetailModalProps {
  grade: StudentGradeRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const ERROR_THEMES: Record<string, { label: string; badge: string; border: string; bg: string }> = {
  phu_am_dau: { label: "Phụ âm đầu", badge: "bg-rose-100 text-rose-700 border-rose-200", border: "border-rose-500", bg: "bg-rose-500/20" },
  dau_thanh: { label: "Dấu thanh", badge: "bg-purple-100 text-purple-700 border-purple-200", border: "border-purple-500", bg: "bg-purple-500/20" },
  van: { label: "Vần", badge: "bg-orange-100 text-orange-700 border-orange-200", border: "border-orange-500", bg: "bg-orange-500/20" },
  am_chinh: { label: "Nguyên âm", badge: "bg-emerald-100 text-emerald-700 border-emerald-200", border: "border-emerald-500", bg: "bg-emerald-500/20" },
  phu_am_cuoi: { label: "Âm cuối", badge: "bg-sky-100 text-sky-700 border-sky-200", border: "border-sky-500", bg: "bg-sky-500/20" },
  viet_hoa: { label: "Viết hoa", badge: "bg-blue-100 text-blue-700 border-blue-200", border: "border-blue-500", bg: "bg-blue-500/20" },
  bo_sot_them: { label: "Bỏ sót/Thêm", badge: "bg-pink-100 text-pink-700 border-pink-200", border: "border-pink-500", bg: "bg-pink-500/20" },
  thay_the_tu: { label: "Sai từ", badge: "bg-indigo-100 text-indigo-700 border-indigo-200", border: "border-indigo-500", bg: "bg-indigo-500/20" },
  dau_cau: { label: "Dấu câu", badge: "bg-teal-100 text-teal-700 border-teal-200", border: "border-teal-500", bg: "bg-teal-500/20" },
}

function getErrorTheme(type?: string) {
  if (!type) return { label: "Chính tả", badge: "bg-rose-100 text-rose-700 border-rose-200", border: "border-rose-500", bg: "bg-rose-500/20" }
  return ERROR_THEMES[type] || { label: type, badge: "bg-gray-100 text-gray-700 border-gray-200", border: "border-gray-500", bg: "bg-gray-500/20" }
}

function getRatingBadge(score: number, rating?: string) {
  if (rating) {
    if (rating.includes("Xuất sắc")) return { label: "Xuất sắc", color: "bg-emerald-500 text-white", icon: Trophy }
    if (rating.includes("Tốt")) return { label: "Hoàn thành tốt", color: "bg-blue-500 text-white", icon: Star }
    if (rating.includes("Hoàn thành")) return { label: "Hoàn thành", color: "bg-amber-500 text-white", icon: CheckCircle2 }
  }
  if (score >= 9) return { label: "Xuất sắc", color: "bg-emerald-500 text-white", icon: Trophy }
  if (score >= 7) return { label: "Hoàn thành tốt", color: "bg-blue-500 text-white", icon: Star }
  if (score >= 5) return { label: "Hoàn thành", color: "bg-amber-500 text-white", icon: CheckCircle2 }
  return { label: "Cần cố gắng", color: "bg-rose-500 text-white", icon: AlertCircle }
}

export function StudentGradeDetailModal({ grade, open, onOpenChange }: StudentGradeDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "comparison">("overview")
  const [hoveredErrorIdx, setHoveredErrorIdx] = useState<number | null>(null)
  const [filterType, setFilterType] = useState<string>("all")
  const [textMode, setTextMode] = useState<"sidebyside" | "inline">("sidebyside")
  const [playingText, setPlayingText] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // 1. Phân tích danh sách lỗi bằng useMemo (được gọi vô điều kiện ở cấp cao nhất)
  const correctionsList: CorrectionItem[] = useMemo(() => {
    if (!grade) return []
    if (Array.isArray(grade.corrections)) {
      return grade.corrections
    } else if (typeof grade.corrections === "string" && grade.corrections.trim()) {
      try {
        return JSON.parse(grade.corrections)
      } catch {
        return []
      }
    }
    return []
  }, [grade?.corrections])

  // 2. Đếm các nhóm lỗi để làm filter chips (Hooks vô điều kiện)
  const errorTypeCounts = useMemo(() => {
    const map: Record<string, number> = {}
    correctionsList.forEach(c => {
      const t = c.error_type || "phu_am_dau"
      map[t] = (map[t] || 0) + 1
    })
    return map
  }, [correctionsList])

  // Dọn dẹp audio khi unmount hoặc đổi bài
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [grade?.id])

  // KIỂM TRA ĐIỀU KIỆN SAU KHI ĐÃ GỌI ĐỦ TẤT CẢ HOOKS Ở ĐẦU FUNCTION
  if (!grade) return null

  // Lọc lỗi theo nhóm
  const filteredCorrections = filterType === "all"
    ? correctionsList
    : correctionsList.filter(c => c.error_type === filterType)

  // 3. Phân tích Chế độ chấm & Thang điểm Giáo viên (Chính tả vs Tập làm văn)
  const isEssay = grade.gradingMode === "essay"

  let chinhTaRaw = 0
  let chinhTaMax = isEssay ? 4.0 : 7.0
  let chinhTaErrorCount = correctionsList.length
  let chinhTaDeduction = 0

  let hinhThucRaw = isEssay ? 3.0 : 3.0
  let hinhThucMax = 3.0
  let hinhThucNote = ""

  let noiDungRaw = isEssay ? 2.0 : 0
  let noiDungMax = isEssay ? 2.0 : 0

  let sangTaoRaw = isEssay ? 1.0 : 0
  let sangTaoMax = isEssay ? 1.0 : 0
  let sangTaoNote = ""
  let sangTaoEvidence: string[] = []

  if (grade.scoreBreakdown) {
    try {
      const sb = JSON.parse(grade.scoreBreakdown)
      if (sb.chinh_ta) {
        chinhTaRaw = Number(sb.chinh_ta.raw ?? (isEssay ? 4.0 : 7.0))
        chinhTaMax = Number(sb.chinh_ta.max ?? (isEssay ? 4.0 : 7.0))
        chinhTaErrorCount = Number(sb.chinh_ta.error_count ?? correctionsList.length)
        chinhTaDeduction = Number(sb.chinh_ta.deduction ?? 0)

        hinhThucRaw = Number(sb.hinh_thuc?.raw ?? 3.0)
        hinhThucMax = Number(sb.hinh_thuc?.max ?? 3.0)
        hinhThucNote = sb.hinh_thuc?.note || ""

        if (isEssay || sb.noi_dung) {
          noiDungRaw = Number(sb.noi_dung?.raw ?? 2.0)
          noiDungMax = Number(sb.noi_dung?.max ?? 2.0)
        }

        if (isEssay || sb.sang_tao) {
          sangTaoRaw = Number(sb.sang_tao?.raw ?? 1.0)
          sangTaoMax = Number(sb.sang_tao?.max ?? 1.0)
          sangTaoNote = sb.sang_tao?.note || ""
          sangTaoEvidence = sb.sang_tao?.evidence || []
        }
      } else if (sb.spellingScore !== undefined) {
        // Format Mobile BFF
        chinhTaRaw = Number(sb.spellingScore ?? 5.0)
        chinhTaMax = 5.0
        hinhThucRaw = Number(sb.formatScore ?? 2.0)
        hinhThucMax = 2.0
        noiDungRaw = Number(sb.contentScore ?? 2.0)
        noiDungMax = 2.0
        sangTaoRaw = Number(sb.creativityScore ?? 1.0)
        sangTaoMax = 1.0
      }
    } catch {}
  } else {
    // Ước tính từ scoreNum nếu DB cũ chưa lưu JSON
    const s = grade.scoreNum || 0
    if (isEssay) {
      chinhTaRaw = Math.min(4.0, Math.max(0, Math.round((s * 0.4) * 10) / 10))
      hinhThucRaw = Math.min(3.0, Math.max(0, Math.round((s * 0.3) * 10) / 10))
      noiDungRaw = Math.min(2.0, Math.max(0, Math.round((s * 0.2) * 10) / 10))
      sangTaoRaw = Math.min(1.0, Math.max(0, Math.round((s * 0.1) * 10) / 10))
    } else {
      chinhTaRaw = Math.min(7.0, Math.max(0, Math.round((s * 0.7) * 10) / 10))
      hinhThucRaw = Math.min(3.0, Math.max(0, Math.round((s * 0.3) * 10) / 10))
    }
  }

  // 4. Phát âm chuẩn bằng Edge-TTS
  const playAudio = (text: string) => {
    if (!text) return
    if (audioRef.current) audioRef.current.pause()
    setPlayingText(text)
    const audio = new Audio(`/api/dictation/tts?text=${encodeURIComponent(text)}&voice=vi-VN-HoaiMyNeural&rate=-15%`)
    audioRef.current = audio
    audio.onended = () => setPlayingText(null)
    audio.onerror = () => setPlayingText(null)
    audio.play().catch(() => setPlayingText(null))
  }

  const ratingInfo = getRatingBadge(grade.scoreNum, grade.overallRating)
  const RatingIcon = ratingInfo.icon
  const imageSrc = grade.imageBase64 || grade.imagePath || ""

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[94vh] overflow-y-auto p-4 sm:p-6 gap-5 print:max-w-full print:m-0 print:p-2">
        <DialogHeader className="border-b pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex flex-col items-center justify-center text-primary font-bold shadow-xs shrink-0 border border-primary/20">
                <span className="text-2xl leading-none">{grade.scoreNum}</span>
                <span className="text-[10px] uppercase font-semibold mt-0.5">Điểm</span>
              </div>

              <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2 flex-wrap">
                  <span>{grade.assignmentTitle || "Bài kiểm tra viết"}</span>
                  <Badge variant="outline" className="text-xs bg-muted/40 font-semibold">
                    {isEssay ? "Tập làm văn" : "Chính tả Nghe - Viết"}
                  </Badge>
                  <Badge className={`${ratingInfo.color} gap-1 text-xs py-0.5 px-2`}>
                    <RatingIcon className="w-3.5 h-3.5" />
                    {ratingInfo.label}
                  </Badge>
                </DialogTitle>

                <DialogDescription className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2 mt-1 flex-wrap">
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <User className="w-3.5 h-3.5 text-primary" /> {grade.studentName}
                  </span>
                  {grade.className && <span>• Lớp {grade.className}</span>}
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> {new Date(grade.createdAt).toLocaleDateString("vi-VN")}
                  </span>
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5 text-xs hidden sm:flex">
                <Printer className="w-3.5 h-3.5" /> In phiếu nhận xét
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* ── THANH CHUYỂN TAB ── */}
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
          <TabsList className="grid grid-cols-2 w-full max-w-sm mx-auto mb-3">
            <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm">
              <FileText className="w-4 h-4" /> Bài làm & Nhận xét
            </TabsTrigger>
            <TabsTrigger value="comparison" className="gap-1.5 text-xs sm:text-sm">
              <Layers className="w-4 h-4" /> So sánh đối chiếu
            </TabsTrigger>
          </TabsList>

          {/* ══════════════════════════════════════════════════════════
              TAB 1: SPLIT-VIEW (ẢNH BÀI LÀM + BOUNDING BOX VÀ BẢNG ĐIỂM)
          ══════════════════════════════════════════════════════════ */}
          <TabsContent value="overview" className="pt-1">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              
              {/* ── CỘT TRÁI: ẢNH BÀI LÀM & BOUNDING BOX TƯƠNG TÁC (7/12 cột) ── */}
              <div className="lg:col-span-7 space-y-3.5">
                <StudentBoundingBoxCanvas
                  imageSrc={imageSrc}
                  originalText={grade.originalText}
                  studentName={grade.studentName}
                  corrections={correctionsList}
                  hoveredErrorIdx={hoveredErrorIdx}
                  onHoverError={setHoveredErrorIdx}
                  onSelectError={(idx) => {
                    setHoveredErrorIdx(idx)
                    const el = document.getElementById(`student-err-card-${idx}`)
                    if (el) {
                      el.scrollIntoView({ behavior: "smooth", block: "nearest" })
                    }
                  }}
                  onPlayAudio={playAudio}
                  playingText={playingText}
                  filterType={filterType}
                />

                {/* Hộp gợi ý cho Ba Mẹ */}
                <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 text-xs leading-relaxed text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
                  <Lightbulb className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Gợi ý cho Ba Mẹ: </span>
                    Bấm trực tiếp vào các hộp khoanh chữ đỏ trên bài vở để nghe cô giáo AI đọc chuẩn từng từ. Khuyến khích con dùng bút chì nắn nót viết lại các chữ này vào vở rèn chữ nhé!
                  </div>
                </div>
              </div>

              {/* ── CỘT PHẢI: BẢNG ĐIỂM, NHẬN XÉT SƯ PHẠM & DANH SÁCH LỖI (5/12 cột) ── */}
              <div className="lg:col-span-5 space-y-4 lg:max-h-[750px] lg:overflow-y-auto lg:pr-1">
                
                {/* 1. THANG ĐIỂM CHI TIẾT THEO PHÂN MÔN */}
                {isEssay ? (
                  /* Thang điểm 4 phần của TẬP LÀM VĂN */
                  <div className="grid grid-cols-2 gap-2.5">
                    <Card className="border-border/60 bg-gradient-to-br from-rose-500/5 to-rose-500/10">
                      <CardContent className="p-3 space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-rose-700 dark:text-rose-400">1. Chính tả & Ngữ pháp</span>
                          <span className="font-bold text-rose-700 dark:text-rose-400">{chinhTaRaw}/{chinhTaMax}đ</span>
                        </div>
                        <Progress value={(chinhTaRaw / chinhTaMax) * 100} className="h-1.5 bg-rose-200" />
                        <p className="text-[11px] text-muted-foreground">
                          {chinhTaErrorCount === 0 ? "Viết đúng 100%" : `${chinhTaErrorCount} lỗi (−${chinhTaDeduction || (chinhTaErrorCount * 0.5).toFixed(1)}đ)`}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-border/60 bg-gradient-to-br from-blue-500/5 to-blue-500/10">
                      <CardContent className="p-3 space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-blue-700 dark:text-blue-400">2. Trình bày</span>
                          <span className="font-bold text-blue-700 dark:text-blue-400">{hinhThucRaw}/{hinhThucMax}đ</span>
                        </div>
                        <Progress value={(hinhThucRaw / hinhThucMax) * 100} className="h-1.5 bg-blue-200" />
                        <p className="text-[11px] text-muted-foreground truncate">{hinhThucNote || "Chữ viết, căn lề"}</p>
                      </CardContent>
                    </Card>

                    <Card className="border-border/60 bg-gradient-to-br from-purple-500/5 to-purple-500/10">
                      <CardContent className="p-3 space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-purple-700 dark:text-purple-400">3. Nội dung & Ý</span>
                          <span className="font-bold text-purple-700 dark:text-purple-400">{noiDungRaw}/{noiDungMax}đ</span>
                        </div>
                        <Progress value={(noiDungRaw / noiDungMax) * 100} className="h-1.5 bg-purple-200" />
                        <p className="text-[11px] text-muted-foreground">Đủ ý, bám sát đề</p>
                      </CardContent>
                    </Card>

                    <Card className="border-border/60 bg-gradient-to-br from-amber-500/5 to-amber-500/10">
                      <CardContent className="p-3 space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-amber-700 dark:text-amber-400">4. Sáng tạo</span>
                          <span className="font-bold text-amber-700 dark:text-amber-400">{sangTaoRaw}/{sangTaoMax}đ</span>
                        </div>
                        <Progress value={(sangTaoRaw / sangTaoMax) * 100} className="h-1.5 bg-amber-200" />
                        <p className="text-[11px] text-muted-foreground">Biện pháp tu từ, từ hay</p>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  /* Thang điểm 2 phần chuẩn của CHÍNH TẢ SGK */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <Card className="border-border/60 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10">
                      <CardContent className="p-3 space-y-1.5">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-800 dark:text-emerald-300">
                            <PenTool className="w-3.5 h-3.5 text-emerald-600" />
                            <span>1. Điểm Chính tả</span>
                          </div>
                          <span className="font-bold text-sm text-emerald-700 dark:text-emerald-400">
                            {chinhTaRaw}/{chinhTaMax}đ
                          </span>
                        </div>
                        <Progress value={(chinhTaRaw / chinhTaMax) * 100} className="h-1.5 bg-emerald-200" />
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                          <span>Mắc {chinhTaErrorCount} lỗi</span>
                          {chinhTaDeduction > 0 && <span className="text-rose-600 font-semibold">Trừ {chinhTaDeduction}đ</span>}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-border/60 bg-gradient-to-br from-blue-500/5 to-blue-500/10">
                      <CardContent className="p-3 space-y-1.5">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5 font-bold text-xs text-blue-800 dark:text-blue-300">
                            <Star className="w-3.5 h-3.5 text-blue-600" />
                            <span>2. Trình bày & Chữ viết</span>
                          </div>
                          <span className="font-bold text-sm text-blue-700 dark:text-blue-400">
                            {hinhThucRaw}/{hinhThucMax}đ
                          </span>
                        </div>
                        <Progress value={(hinhThucRaw / hinhThucMax) * 100} className="h-1.5 bg-blue-200" />
                        <p className="text-[11px] text-muted-foreground truncate pt-0.5">
                          {hinhThucNote || "Sạch sẽ, giữ vở"}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* 2. Dẫn chứng sáng tạo cô giáo khen (nếu có trong Tập làm văn) */}
                {sangTaoEvidence.length > 0 && (
                  <div className="rounded-xl border border-amber-300/80 bg-amber-50/60 dark:bg-amber-950/20 p-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>Câu văn hay cô giáo khen ngợi</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {sangTaoEvidence.map((ev, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200 px-2.5 py-0.5 rounded-full border border-amber-300">
                          ✨ &ldquo;{ev}&rdquo;
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Lời nhận xét sư phạm toàn diện của Giáo viên */}
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <h3 className="font-bold text-xs sm:text-sm text-primary">
                      Nhận xét sư phạm của Giáo viên (Thông tư 27)
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed text-foreground font-normal whitespace-pre-wrap bg-background/80 p-3 rounded-lg border">
                    {grade.pedagogicalComment || grade.feedback || "Con làm bài rất tốt. Hãy tiếp tục phát huy nét chữ cẩn thận này nhé!"}
                  </p>
                </div>

                {/* 4. Danh sách lỗi chính tả cần sửa (Kèm nút Audio phát âm) */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-xs sm:text-sm flex items-center gap-1.5">
                      <span>Chi tiết từ cần rèn ({filteredCorrections.length}/{correctionsList.length})</span>
                    </h4>

                    {/* Bộ lọc nhóm lỗi */}
                    {correctionsList.length > 0 && (
                      <div className="flex items-center gap-1 overflow-x-auto pb-0.5 max-w-[220px]">
                        <button
                          onClick={() => setFilterType("all")}
                          className={`px-2 py-0.5 text-[10px] rounded-full border transition-all ${
                            filterType === "all" ? "bg-primary text-white font-bold border-primary" : "bg-background text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          Tất cả ({correctionsList.length})
                        </button>
                        {Object.entries(errorTypeCounts).map(([type, count]) => {
                          const theme = getErrorTheme(type)
                          return (
                            <button
                              key={type}
                              onClick={() => setFilterType(type)}
                              className={`px-2 py-0.5 text-[10px] rounded-full border transition-all whitespace-nowrap ${
                                filterType === type ? "bg-primary text-white font-bold border-primary" : `${theme.badge}`
                              }`}
                            >
                              {theme.label} ({count})
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {correctionsList.length === 0 ? (
                    <div className="text-center py-6 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300">
                      <CheckCircle2 className="w-7 h-7 mx-auto mb-1.5 text-emerald-600" />
                      <p className="font-semibold text-xs sm:text-sm">Tuyệt vời! Con không mắc lỗi chính tả nào.</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Bài viết chuẩn chỉnh và chuẩn xác từng từ.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredCorrections.map((item, idx) => {
                        const realIdx = correctionsList.indexOf(item)
                        const isHovered = hoveredErrorIdx === realIdx
                        const theme = getErrorTheme(item.error_type)
                        const isPlaying = playingText === item.suggestion

                        return (
                          <div
                            key={idx}
                            id={`student-err-card-${realIdx}`}
                            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                              isHovered ? "ring-2 ring-primary border-primary bg-primary/10 shadow-xs" : "bg-card border-border hover:border-primary/40"
                            }`}
                            onMouseEnter={() => setHoveredErrorIdx(realIdx)}
                            onMouseLeave={() => setHoveredErrorIdx(null)}
                            onClick={() => playAudio(item.suggestion)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="line-through text-rose-600 font-bold text-xs sm:text-sm">
                                  {item.error}
                                </span>
                                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                <span className="text-emerald-600 font-bold text-xs sm:text-sm">
                                  {item.suggestion}
                                </span>
                                <Badge className={`${theme.badge} text-[9px] py-0 px-1 border`}>
                                  {theme.label}
                                </Badge>
                                {item.is_dialect && (
                                  <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-300 bg-amber-50">
                                    Phương ngữ
                                  </Badge>
                                )}
                              </div>

                              {/* Nút Nghe phát âm chuẩn */}
                              <Button
                                size="sm"
                                variant="ghost"
                                className={`h-7 w-7 p-0 shrink-0 rounded-full ${isPlaying ? "bg-primary text-white animate-pulse" : "text-primary hover:bg-primary/10"}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  playAudio(item.suggestion)
                                }}
                                title="Nghe phát âm chuẩn từ đúng"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>

                            {item.reason && (
                              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed bg-muted/40 p-1.5 rounded">
                                💡 {item.reason}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </TabsContent>

          {/* ══════════════════════════════════════════════════════════
              TAB 3: SO SÁNH ĐỐI CHIẾU SONG SONG VS INLINE
          ══════════════════════════════════════════════════════════ */}
          <TabsContent value="comparison" className="space-y-4 pt-2">
            <div className="flex justify-end gap-2 text-xs">
              <div className="flex rounded-lg border bg-muted/40 p-0.5 text-xs font-medium">
                <button
                  onClick={() => setTextMode("sidebyside")}
                  className={`px-3 py-1 rounded-md transition-all ${textMode === "sidebyside" ? "bg-background text-foreground shadow-xs font-bold" : "text-muted-foreground"}`}
                >
                  Xem song song 2 cột
                </button>
                <button
                  onClick={() => setTextMode("inline")}
                  className={`px-3 py-1 rounded-md transition-all ${textMode === "inline" ? "bg-background text-foreground shadow-xs font-bold" : "text-muted-foreground"}`}
                >
                  Xem gộp trong dòng
                </button>
              </div>
            </div>

            {textMode === "sidebyside" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cột Trái: Chữ học sinh viết */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-4 h-4" /> Bài viết của con (Giữ nguyên nét chữ)
                    </span>
                    <Badge variant="outline" className="text-[11px] text-rose-600">
                      {correctionsList.length} lỗi
                    </Badge>
                  </div>
                  <div className="p-4 rounded-xl border bg-rose-50/20 text-sm leading-relaxed whitespace-pre-wrap font-sans min-h-[220px] max-h-[400px] overflow-y-auto">
                    {grade.originalText || "Không có dữ liệu văn bản."}
                  </div>
                </div>

                {/* Cột Phải: Bài viết chuẩn hóa */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Check className="w-4 h-4" /> Bài viết chuẩn hóa (100% Chính tả)
                    </span>
                    <Badge variant="outline" className="text-[11px] text-emerald-600 bg-emerald-50">
                      Bài mẫu để con luyện
                    </Badge>
                  </div>
                  <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 text-sm leading-relaxed whitespace-pre-wrap font-sans min-h-[220px] max-h-[400px] overflow-y-auto">
                    {grade.fixedText || "Không có dữ liệu văn bản."}
                  </div>
                </div>
              </div>
            ) : (
              /* Xem gộp inline (Chữ sai gạch đỏ kế bên chữ đúng xanh lá) */
              <div className="space-y-2">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Văn bản chấm lỗi trực tiếp trên bài viết
                </span>
                <div className="p-5 rounded-xl border bg-card text-sm leading-loose whitespace-pre-wrap font-sans min-h-[220px] max-h-[420px] overflow-y-auto">
                  {(() => {
                    const base = grade.originalText || ""
                    if (!correctionsList || correctionsList.length === 0) return base

                    return (
                      <div>
                        {correctionsList.map((c, idx) => (
                          <span key={idx} className="inline-flex items-baseline gap-1 mx-1.5 p-1 rounded bg-amber-50 dark:bg-amber-950/20 border border-amber-200">
                            <span className="line-through text-rose-600 font-bold">{c.error}</span>
                            <span className="text-emerald-600 font-bold underline">{c.suggestion}</span>
                          </span>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              </div>
            )}

            {/* Lời khuyên phụ huynh kèm con */}
            <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/40 dark:bg-blue-950/20 text-xs leading-relaxed text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
              <Lightbulb className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Gợi ý cho Ba Mẹ: </span>
                Hãy cho con đọc to bài viết chuẩn hóa bên phải. Bấm vào nút loa 🔊 ở mỗi từ sai để bé nghe cô giáo đọc chuẩn và tự viết lại vào vở rèn chữ nhé!
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
